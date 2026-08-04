"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMediaStream } from "@/components/proctoring/useMediaStream";
import { CameraPreview } from "@/components/proctoring/CameraPreview";
import { AudioLevelMeter } from "@/components/proctoring/AudioLevelMeter";
import { startSession } from "../actions";

export function VerifyClient({
  testId,
  title,
  durationMinutes,
}: {
  testId: string;
  title: string;
  durationMinutes: number;
}) {
  const router = useRouter();
  const { stream, error: mediaError } = useMediaStream();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const ready = !!stream && !mediaError;

  async function handleStart() {
    setStartError(null);
    setStarting(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setStartError("Fullscreen is required to start the test. Please allow fullscreen and try again.");
      setStarting(false);
      return;
    }

    try {
      const { sessionId } = await startSession(testId);
      router.push(`/student/tests/${testId}/take?session=${sessionId}`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start the test.");
      setStarting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {durationMinutes} minutes · camera and microphone verification required
        </p>

        <div className="mt-6">
          <CameraPreview stream={stream} className="aspect-video w-full rounded-lg border border-slate-200 bg-slate-900" />
        </div>

        <div className="mt-3">
          <p className="text-xs text-slate-500">Microphone level</p>
          <div className="mt-1">
            <AudioLevelMeter stream={stream} />
          </div>
        </div>

        {mediaError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {mediaError} Check your browser&apos;s camera/microphone permissions and reload this page.
          </p>
        )}
        {startError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {startError}
          </p>
        )}

        <ul className="mt-4 space-y-1 text-xs text-slate-500">
          <li>The test runs in fullscreen. Exiting fullscreen is logged as a violation.</li>
          <li>Switching tabs or windows is logged as a violation.</li>
          <li>Turning off your camera or microphone mid-test is logged as a violation.</li>
          <li>Stepping out of frame or having no face visible is logged as a violation.</li>
          <li>Someone else appearing in frame is logged as a violation.</li>
          <li>Sustained loud talking or noise is logged as a violation.</li>
          <li>Too many violations will auto-submit your test.</li>
        </ul>

        <button
          onClick={handleStart}
          disabled={!ready || starting}
          className="mt-6 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {starting ? "Starting…" : ready ? "Start test" : "Waiting for camera/microphone…"}
        </button>
      </div>
    </div>
  );
}
