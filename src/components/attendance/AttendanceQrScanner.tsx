"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import { Camera, Check, RefreshCw, ScanLine, X } from "lucide-react";

type ScanState = "idle" | "camera" | "captured" | "decoding" | "checking" | "success" | "error";

export default function AttendanceQrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => () => {
    stopStream();
    document.body.style.overflow = "";
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const getDeviceId = () => {
    const key = "attendance_device_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  };

  const closeScanner = () => {
    stopStream();
    setState("idle");
    setCapturedImage(null);
    setBusy(false);
    document.body.style.overflow = "";
    setMessage(null);
  };

  const submitToken = async (qrToken: string) => {
    if (busy) return;
    setBusy(true);
    setState("checking");
    setMessage("QR detected. Checking attendance...");

    const submit = async (position?: GeolocationPosition) => {
      try {
        const response = await fetch("/api/student/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qr_token: qrToken,
            device_id: getDeviceId(),
            latitude: position?.coords.latitude,
            longitude: position?.coords.longitude,
          }),
        });
        const data = await response.json();
        if (data.success) {
          setState("success");
          setMessage(`Attendance recorded: ${data.meeting?.title || "Meeting"}`);
          stopStream();
          document.body.style.overflow = "";
        } else {
          setState("error");
          setMessage(data.message || "QR code is invalid");
        }
      } catch {
        setState("error");
        setMessage("Failed to submit attendance. Please try again.");
      } finally {
        setBusy(false);
      }
    };

    if (!navigator.geolocation) return submit();
    navigator.geolocation.getCurrentPosition(
      (position) => void submit(position),
      () => void submit(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  const decodeCapturedImage = async () => {
    if (!capturedImage || busy) return;
    setBusy(true);
    setState("decoding");
    setMessage("Detecting QR code from captured image...");
    try {
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageUrl(capturedImage);
      const token = result.getText();
      if (!token) throw new Error("No QR token found");
      setBusy(false);
      await submitToken(token);
    } catch {
      setBusy(false);
      setState("error");
      setMessage("QR code not found. Retake the image — keep the code fully inside the frame and make sure it is well-lit.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setMessage("Camera element not ready");
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setMessage("Camera is still loading. Please wait a moment.");
      return;
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(dataUrl);
    stopStream();
    setState("captured");
    setMessage("Image captured. Tap Detect QR to analyse it.");
  };

  const retake = async () => {
    setCapturedImage(null);
    setMessage(null);
    setBusy(false);
    await start();
  };

  const start = async () => {
    try {
      setMessage(null);
      setCapturedImage(null);
      setCameraReady(false);
      setState("camera");
      document.body.style.overflow = "hidden";

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setState("error");
      document.body.style.overflow = "";
      setMessage("Camera could not be accessed. Please allow camera permission and try again.");
    }
  };

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={start}
        disabled={busy || state === "checking"}
        className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
      >
        <Camera className="mr-2 inline h-4 w-4" /> Open Camera to Scan QR
      </button>

      {(state !== "idle") && (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black">

          {/* Live camera feed */}
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover ${capturedImage ? "hidden" : ""}`}
            muted
            playsInline
            onLoadedMetadata={() => setCameraReady(true)}
          />

          {/* Captured image preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured frame"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}

          {/* Camera state — guide + capture button */}
          {state === "camera" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 text-center">
              <div className="relative h-[min(65vw,16rem)] w-[min(65vw,16rem)] max-h-[50vh] max-w-[82vw]">
                <div className="absolute inset-0 rounded-3xl border-2 border-white/30" />
                <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-orange-400" />
                <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-orange-400" />
                <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-orange-400" />
                <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-orange-400" />
                <div className="qr-scan-line absolute left-4 right-4 h-0.5 bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.9)]" />
              </div>
              <p className="mt-6 max-w-xs text-base font-semibold text-white">
                Place the QR code inside the frame
              </p>
              <p className="mt-2 max-w-xs text-sm text-white/70">
                Hold steady, then tap Capture QR
              </p>
              <button
                type="button"
                onClick={capture}
                disabled={!cameraReady}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-orange-600 disabled:opacity-40"
              >
                <Camera className="h-5 w-5" />
                {cameraReady ? "Capture QR" : "Loading camera..."}
              </button>
            </div>
          )}

          {/* Captured state — actions */}
          {state === "captured" && (
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3">
              <button
                type="button"
                onClick={decodeCapturedImage}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <ScanLine className="h-4 w-4" /> Detect QR
              </button>
              <button
                type="button"
                onClick={retake}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> Retake
              </button>
            </div>
          )}

          {/* Success */}
          {state === "success" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500">
                <Check className="h-10 w-10 text-white" />
              </div>
              <p className="max-w-xs text-lg font-bold text-white">{message}</p>
              <button
                type="button"
                onClick={closeScanner}
                className="mt-4 rounded-xl bg-white px-8 py-3 font-semibold text-orange-700 hover:bg-orange-50"
              >
                Done
              </button>
            </div>
          )}

          {/* Decoding / Checking spinner */}
          {(state === "decoding" || state === "checking") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full border-4 border-orange-400 border-t-transparent animate-spin" />
              <p className="font-semibold text-white">
                {state === "decoding" ? "Detecting QR code..." : "Checking attendance..."}
              </p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
              <p className="max-w-[80vw] rounded-xl bg-black/70 px-4 py-2 text-center text-sm text-white">
                {message}
              </p>
              <button
                type="button"
                onClick={retake}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
              >
                <RefreshCw className="h-4 w-4" /> Try Again
              </button>
            </div>
          )}

          {/* Close button always visible */}
          <button
            type="button"
            onClick={closeScanner}
            aria-label="Close scanner"
            className="absolute right-3 top-3 rounded-full bg-black/50 p-3 text-white backdrop-blur hover:bg-orange-500 sm:right-5 sm:top-5"
          >
            <X className="h-6 w-6" />
          </button>

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
