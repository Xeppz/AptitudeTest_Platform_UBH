"use client";

import { useEffect, useRef, type RefObject } from "react";

export function CameraPreview({
  stream,
  className,
  videoRef: externalRef,
}: {
  stream: MediaStream | null;
  className?: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? internalRef;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={className ?? "w-full rounded border border-neutral-700 bg-black"}
    />
  );
}
