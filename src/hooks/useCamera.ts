// ============================================================================
// Shared camera lifecycle for QR verification and optical capture.
//
// This hook owns the MediaStream and deliberately waits for the <video> element
// to become playable before reporting `streaming`. It also guards against
// React StrictMode / navigation races where an older getUserMedia() promise
// resolves after a newer start/stop cycle.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'streaming' | 'unavailable' | 'denied' | 'error' | 'stopped';

export interface CameraApi {
  status: CameraStatus;
  errorMessage: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
  captureFrame: () => HTMLCanvasElement | null;
}

function describeCameraError(err: unknown): { status: CameraStatus; message: string } {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return { status: 'denied', message: 'Camera permission was denied. Allow camera access and try again.' };
  }
  if (name === 'NotFoundError') {
    return { status: 'unavailable', message: 'No camera was found on this device.' };
  }
  if (name === 'NotReadableError') {
    return { status: 'error', message: 'The camera is already in use or could not be read. Close other camera apps and retry.' };
  }
  if (name === 'OverconstrainedError') {
    return { status: 'error', message: 'The requested camera settings are not supported. Retrying with basic camera settings may help.' };
  }
  if (name === 'NotSupportedError') {
    return { status: 'error', message: 'This browser cannot play the camera stream.' };
  }
  if (name === 'AbortError') {
    return { status: 'error', message: 'Camera startup was interrupted. Please retry.' };
  }
  return { status: 'error', message: 'Camera could not be started. Please retry.' };
}

async function waitForVideoReady(video: HTMLVideoElement, stream: MediaStream, signal: AbortSignal): Promise<void> {
  // The stream MUST be attached before any readiness check. A successful
  // getUserMedia() call does not mean the <video> element has received media.
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;

  if (signal.aborted) throw new DOMException('Camera startup was cancelled.', 'AbortError');

  const isReady = () =>
    video.srcObject === stream &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0;

  if (isReady()) {
    await video.play();
    if (isReady()) return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('The camera did not become playable.'));
    }, 5000);

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('playing', onReady);
      video.removeEventListener('error', onError);
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException('Camera startup was cancelled.', 'AbortError'));
    };

    const onReady = () => {
      if (settled || video.srcObject !== stream) return;
      if (!isReady()) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('The camera video element failed to initialise.'));
    };

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onReady);
    video.addEventListener('error', onError);
    signal.addEventListener('abort', onAbort, { once: true });

    // Start playback after the stream has been attached. A muted inline video
    // normally allows this without another user gesture. If autoplay is
    // temporarily blocked, the readiness events above still get a chance to
    // settle the lifecycle; a later play() below confirms actual playback.
    void video.play().catch((err) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      onError();
    });
  });

  await video.play();
  if (!isReady()) throw new Error('The camera stream is attached but video dimensions are not available.');
}

export function useCamera(): CameraApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const operationRef = useRef(0);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    operationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.load();
    }
    if (mountedRef.current) {
      setErrorMessage(null);
      setStatus('stopped');
    }
  }, []);

  const start = useCallback(async () => {
    const operation = ++operationRef.current;
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    // Always tear down a previous stream before requesting another one. This
    // handles rapid navigation, retries, and React StrictMode effect replay.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (!video) {
      if (mountedRef.current && operation === operationRef.current) {
        setStatus('error');
        setErrorMessage('Camera view is not ready yet. Please retry.');
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      if (mountedRef.current && operation === operationRef.current) {
        setStatus('unavailable');
        setErrorMessage('Camera access is not supported by this browser. Use manual entry or upload instead.');
      }
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    const preferredConstraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 960, min: 480 },
      },
      audio: false,
    };

    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch (err) {
        // Some laptop/older mobile cameras reject ideal+minimum combinations.
        // Retry once with intentionally conservative constraints.
        const name = err instanceof DOMException ? err.name : '';
        if (name !== 'OverconstrainedError' && name !== 'NotFoundError') throw err;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (!mountedRef.current || operation !== operationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const currentVideo = videoRef.current;
      if (!currentVideo) throw new Error('Camera view disappeared during startup.');

      await waitForVideoReady(currentVideo, stream, abortController.signal);

      if (!mountedRef.current || operation !== operationRef.current || streamRef.current !== stream) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (abortRef.current === abortController) abortRef.current = null;
      setStatus('streaming');
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      if (!mountedRef.current || operation !== operationRef.current) return;
      abortRef.current = null;
      streamRef.current = null;
      const mapped = describeCameraError(err);
      setStatus(mapped.status);
      setErrorMessage(mapped.message);
    }
  }, []);

  const captureFrame = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (status !== 'streaming' || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, []);

  return { status, errorMessage, videoRef, start, stop, captureFrame };
}
