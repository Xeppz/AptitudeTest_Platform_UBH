"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMediaStream } from "@/components/proctoring/useMediaStream";
import { CameraPreview } from "@/components/proctoring/CameraPreview";
import { logViolation, saveAnswer, submitTest } from "../actions";
import type { Answer, OptionLetter, QuestionForStudent, Test, TestSession, ViolationType } from "@/types/database";
import type * as FaceApi from "@vladmandic/face-api";

const FACE_CHECK_INTERVAL_MS = 3000;
const NO_FACE_STREAK_TO_FLAG = 3; // ~9s of no face before flagging
const MULTI_FACE_STREAK_TO_FLAG = 2; // ~6s of multiple faces before flagging

const AUDIO_CHECK_INTERVAL_MS = 500;
const LOUD_AUDIO_LEVEL_THRESHOLD = 0.35; // 0-1 RMS scale, same scale as AudioLevelMeter
const LOUD_AUDIO_STREAK_TO_FLAG = 6; // ~3s of sustained loud audio before flagging

const OPTION_LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

interface AnswerState {
  selected: OptionLetter | null;
  marked: boolean;
}

function formatTime(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function TestRunner({
  test,
  session,
  questions,
  initialAnswers,
}: {
  test: Test;
  session: TestSession;
  questions: QuestionForStudent[];
  initialAnswers: Answer[];
}) {
  const { stream } = useMediaStream();
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceApiRef = useRef<typeof FaceApi | null>(null);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);

  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const map: Record<string, AnswerState> = {};
    for (const q of questions) {
      const existing = initialAnswers.find((a) => a.question_id === q.id);
      map[q.id] = { selected: existing?.selected_option ?? null, marked: existing?.marked_for_review ?? false };
    }
    return map;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [violationCount, setViolationCount] = useState(session.violation_count);
  const [warning, setWarning] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [autoSubmittedReason, setAutoSubmittedReason] = useState<string | null>(null);

  const submittedRef = useRef(false);
  const lastFlagRef = useRef(0);

  // session.started_at is always set once a session reaches "in_progress" (see startSession),
  // which is the only status this component renders for.
  const endsAtMs = useMemo(
    () => new Date(session.started_at as string).getTime() + test.duration_minutes * 60_000,
    [session.started_at, test.duration_minutes],
  );
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.round((endsAtMs - Date.now()) / 1000)),
  );

  const finishTest = useCallback(async (reason: "manual" | "time" | "violations", message?: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    if (reason !== "violations") {
      try {
        await submitTest(session.id);
      } catch {
        // best-effort — the timer/UI still reflects submission locally
      }
    }

    setSubmitted(true);
    setAutoSubmittedReason(
      reason === "time" ? "Time expired." : reason === "violations" ? (message ?? "Maximum violations reached.") : null,
    );
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [session.id]);

  const reportViolation = useCallback(
    async (type: ViolationType) => {
      if (submittedRef.current) return;
      const now = Date.now();
      if (now - lastFlagRef.current < 800) return;
      lastFlagRef.current = now;

      try {
        const result = await logViolation(session.id, type);
        setViolationCount(result.violationCount);
        if (result.autoSubmitted) {
          await finishTest("violations", "Maximum violations reached.");
          return;
        }
        setWarning(
          `Violation logged: ${type.replace(/_/g, " ")}. ${result.violationCount}/${result.maxViolations} warnings used.`,
        );
        setTimeout(() => setWarning(null), 5000);
      } catch {
        // best-effort; a network hiccup shouldn't crash the test UI
      }
    },
    [session.id, finishTest],
  );

  // Countdown timer.
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((endsAtMs - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        finishTest("time");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAtMs, submitted, finishTest]);

  // Tab switch / window defocus / fullscreen exit.
  useEffect(() => {
    if (submitted) return;

    function onVisibilityChange() {
      if (document.hidden) reportViolation("tab_switch");
    }
    function onBlur() {
      reportViolation("window_blur");
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement) reportViolation("fullscreen_exit");
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [submitted, reportViolation]);

  // Camera/mic disabled mid-test.
  useEffect(() => {
    if (!stream || submitted) return;

    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    const onCameraDown = () => reportViolation("camera_off");
    const onMicDown = () => reportViolation("mic_off");

    videoTrack?.addEventListener("ended", onCameraDown);
    videoTrack?.addEventListener("mute", onCameraDown);
    audioTrack?.addEventListener("ended", onMicDown);
    audioTrack?.addEventListener("mute", onMicDown);

    return () => {
      videoTrack?.removeEventListener("ended", onCameraDown);
      videoTrack?.removeEventListener("mute", onCameraDown);
      audioTrack?.removeEventListener("ended", onMicDown);
      audioTrack?.removeEventListener("mute", onMicDown);
    };
  }, [stream, submitted, reportViolation]);

  // Load the face detection model once, in the background. Detection stays
  // disabled (other proctoring signals still work) if this fails — e.g. no
  // WebGL support in the browser.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const faceapi = await import("@vladmandic/face-api");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        if (!cancelled) {
          faceApiRef.current = faceapi;
          setFaceModelsLoaded(true);
        }
      } catch {
        // face detection unavailable — tab/fullscreen/camera-off checks still run
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Face absence / multiple-faces detection, sampling the live camera feed.
  useEffect(() => {
    if (!faceModelsLoaded || !stream || submitted) return;
    const faceapi = faceApiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video) return;

    let noFaceStreak = 0;
    let multiFaceStreak = 0;
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      if (video!.readyState >= 2) {
        try {
          const detections = await faceapi!.detectAllFaces(video!, new faceapi!.TinyFaceDetectorOptions());
          if (detections.length === 0) {
            noFaceStreak += 1;
            multiFaceStreak = 0;
            if (noFaceStreak >= NO_FACE_STREAK_TO_FLAG) {
              noFaceStreak = 0;
              reportViolation("face_not_detected");
            }
          } else if (detections.length > 1) {
            multiFaceStreak += 1;
            noFaceStreak = 0;
            if (multiFaceStreak >= MULTI_FACE_STREAK_TO_FLAG) {
              multiFaceStreak = 0;
              reportViolation("multiple_faces");
            }
          } else {
            noFaceStreak = 0;
            multiFaceStreak = 0;
          }
        } catch {
          // ignore a single failed detection tick
        }
      }
      if (!cancelled) timeoutId = setTimeout(tick, FACE_CHECK_INTERVAL_MS);
    }

    let timeoutId = setTimeout(tick, FACE_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [faceModelsLoaded, stream, submitted, reportViolation]);

  // Sustained loud audio detection. Uses its own interval-driven analyser
  // (not the reactive useAudioLevel hook) so this component isn't
  // re-rendering on every animation frame.
  useEffect(() => {
    if (!stream || submitted || stream.getAudioTracks().length === 0) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let loudStreak = 0;
    const interval = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const value of data) {
        const normalized = value / 128 - 1;
        sumSquares += normalized * normalized;
      }
      const level = Math.min(1, Math.sqrt(sumSquares / data.length) * 4);

      if (level >= LOUD_AUDIO_LEVEL_THRESHOLD) {
        loudStreak += 1;
        if (loudStreak >= LOUD_AUDIO_STREAK_TO_FLAG) {
          loudStreak = 0;
          reportViolation("loud_audio");
        }
      } else {
        loudStreak = 0;
      }
    }, AUDIO_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      source.disconnect();
      audioContext.close();
    };
  }, [stream, submitted, reportViolation]);

  function selectOption(questionId: string, letter: OptionLetter) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: { ...prev[questionId], selected: letter } };
      saveAnswer(session.id, questionId, letter, next[questionId].marked).catch(() => {});
      return next;
    });
  }

  function toggleMark(questionId: string) {
    setAnswers((prev) => {
      const marked = !prev[questionId].marked;
      const next = { ...prev, [questionId]: { ...prev[questionId], marked } };
      saveAnswer(session.id, questionId, next[questionId].selected, marked).catch(() => {});
      return next;
    });
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            {autoSubmittedReason ? "Test auto-submitted" : "Test submitted"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {autoSubmittedReason ?? "Your answers have been recorded."}
          </p>
          <a
            href="/student"
            className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const answered = questions.filter((q) => answers[q.id]?.selected).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {warning && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-md">
          {warning}
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">{test.title}</h1>
          <p className="text-xs text-slate-500">
            {answered}/{questions.length} answered · {violationCount}/{test.max_violations} violations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CameraPreview
            stream={stream}
            videoRef={videoRef}
            className="h-14 w-20 rounded-md border border-slate-200 bg-slate-900 object-cover"
          />
          <span className="font-mono text-lg tabular-nums text-slate-900">{formatTime(remainingSeconds)}</span>
          <button
            onClick={() => {
              if (window.confirm("Submit the test now? You cannot change answers after submitting.")) {
                finishTest("manual");
              }
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Submit test
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-wrap gap-2">
          {questions.map((q, index) => {
            const state = answers[q.id];
            const isCurrent = index === currentIndex;
            const color = state?.marked
              ? "bg-purple-600 text-white"
              : state?.selected
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200";
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(index)}
                className={`h-8 w-8 rounded-md text-xs font-medium ${color} ${
                  isCurrent ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {question && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {question.category}
              </span>
            </div>

            <p className="mt-3 text-base text-slate-900">{question.question_text}</p>

            <div className="mt-4 flex flex-col gap-2">
              {OPTION_LETTERS.map((letter) => {
                const key = `option_${letter.toLowerCase()}` as keyof QuestionForStudent;
                const isSelected = answers[question.id]?.selected === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => selectOption(question.id, letter)}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="text-slate-400">{letter}</span>
                    <span className="text-slate-900">{question[key] as string}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={answers[question.id]?.marked ?? false}
                  onChange={() => toggleMark(question.id)}
                />
                Mark for review
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={currentIndex === questions.length - 1}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
