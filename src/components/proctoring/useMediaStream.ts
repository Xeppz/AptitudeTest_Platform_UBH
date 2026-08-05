"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * getUserMedia() is intentionally NOT called automatically on mount. iOS
 * Safari (and some Android browsers) silently withhold the permission
 * prompt — no error, no prompt, nothing — for camera/mic requests that
 * aren't triggered synchronously inside a user gesture (a click/tap
 * handler). requestAccess() must be called directly from an onClick.
 */
export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const requestAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser doesn't support camera access here. Open this page directly in Chrome or Safari — not an in-app browser like Instagram, WhatsApp, or LinkedIn.",
      );
      return;
    }

    setRequesting(true);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      setStream(s);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Camera and microphone access is required to take this test.",
      );
    } finally {
      setRequesting(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return { stream, error, requesting, requestAccess };
}
