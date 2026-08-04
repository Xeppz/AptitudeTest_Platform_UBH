"use client";

import { useEffect, useRef, useState } from "react";

/** Reactive RMS audio level (0-1), re-rendering on every animation frame — fine for a
 * small meter component, but don't use this inside a large component tree. */
export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const value of data) {
        const normalized = value / 128 - 1;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setLevel(Math.min(1, rms * 4));
      frameRef.current = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      source.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return level;
}
