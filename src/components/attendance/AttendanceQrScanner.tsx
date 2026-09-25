"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import { Camera, Check, RefreshCw, ScanLine, X } from "lucide-react";

type ScanState = "idle" | "camera" | "captured" | "decoding" | "checking" | "success" | "error";

export default function AttendanceQrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    readerRef.current?.reset();
    document.body.style.overflow = "";
  }, []);

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
    readerRef.current?.reset();
    setState("idle");
    setCapturedImage(null);
    setBusy(false);
    document.body.style.overflow = "";
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
          readerRef.current?.reset();
        } else {
          setState("error");
          setMessage(data.message || "QR code is invalid");
        }
      } catch {
        setState("error");
        setMessage("Failed to submit attendance");
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
      const image = new Image();
      image.src = capturedImage;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Image could not be loaded"));
      });
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;
      const result = await reader.decodeFromImageElement(image);
      const token = result.getText();
      if (!token) throw new Error("QR token not found");
      setBusy(false);
      await submitToken(token);
    } catch {
      setBusy(false);
      setState("error");
      setMessage("QR code not found. Retake the image and keep the code inside the frame.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setState("error");
      setMessage("Camera is not ready yet");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
    readerRef.current?.reset();
    setState("captured");
    setMessage("Image captured. Review it, then detect the QR code.");
  };

  const start = async () => {
    try {
      setMessage(null);
      setCapturedImage(null);
      setState("camera");
      document.body.style.overflow = "hidden";
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;
      await reader.decodeFromVideoDevice(null, videoRef.current!, () => undefined);
    } catch {
      setState("error");
      document.body.style.overflow = "";
      setMessage("Camera could not be accessed");
    }
  };

  return (
    <div className="space-y-3">
      {message && <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">{message}</p>}
      <button type="button" onClick={start} disabled={busy || state === "checking"} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50">
        <Camera className="mr-2 inline h-4 w-4" /> Capture QR Image
      </button>

      {(state === "camera" || state === "captured" || state === "decoding" || state === "checking" || state === "success" || state === "error") && (
        <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
          {capturedImage ? <img src={capturedImage} alt="Captured QR preview" className="absolute inset-0 h-full w-full object-contain" /> : <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />}
          {state === "camera" && <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 text-center"><div className="relative h-[min(65vw,16rem)] w-[min(65vw,16rem)] max-h-[50vh] max-w-[82vw]"><div className="absolute inset-0 rounded-3xl border-2 border-white/30" /><span className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-orange-400" /><span className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-orange-400" /><span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-orange-400" /><span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-orange-400" /><div className="qr-scan-line absolute left-4 right-4 h-0.5 bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.9)]" /></div><p className="mt-6 max-w-xs text-base font-semibold text-white">Place the QR code inside the frame</p><p className="mt-2 max-w-xs text-sm text-white/70">Capture the image when the QR is clear</p></div>}
          {state === "captured" && <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-3"><button type="button" onClick={decodeCapturedImage} className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"><ScanLine className="mr-2 inline h-4 w-4" /> Detect QR</button><button type="button" onClick={start} className="rounded-xl bg-white px-5 py-3 font-semibold text-orange-700 hover:bg-orange-50"><RefreshCw className="mr-2 inline h-4 w-4" /> Retake</button></div>}
          {state === "success" && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 font-semibold text-white"><Check className="mr-2 inline h-4 w-4" /> Attendance recorded</div>}
          {(state === "decoding" || state === "checking") && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white">{state === "decoding" ? "Detecting QR..." : "Checking attendance..."}</div>}
          {state === "error" && <button type="button" onClick={start} className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"><RefreshCw className="mr-2 inline h-4 w-4" /> Retake</button>}
          <button type="button" onClick={closeScanner} aria-label="Close scanner" className="absolute right-3 top-3 rounded-full bg-black/50 p-3 text-white backdrop-blur hover:bg-orange-500 sm:right-5 sm:top-5"><X className="h-6 w-6" /></button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
