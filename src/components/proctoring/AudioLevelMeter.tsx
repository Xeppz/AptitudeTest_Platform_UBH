"use client";

import { useAudioLevel } from "./useAudioLevel";

export function AudioLevelMeter({ stream }: { stream: MediaStream | null }) {
  const level = useAudioLevel(stream);

  return (
    <div className="h-2 w-full overflow-hidden rounded bg-neutral-800">
      <div
        className="h-full bg-emerald-500 transition-[width] duration-75"
        style={{ width: `${Math.round(level * 100)}%` }}
      />
    </div>
  );
}
