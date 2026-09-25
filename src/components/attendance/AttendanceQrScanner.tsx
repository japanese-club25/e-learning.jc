"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import { X } from "lucide-react";

export default function AttendanceQrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const [scanning, setScanning] = useState(false);
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

  const submitToken = async (qrToken: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("QR valid, memeriksa lokasi...");
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
        setMessage(data.success ? `Absensi berhasil: ${data.meeting?.title || ""}` : data.message || "QR tidak valid");
        if (data.success) {
          readerRef.current?.reset();
          setScanning(false);
        }
      } catch {
        setMessage("Gagal mengirim absensi");
      } finally {
        setBusy(false);
      }
    };
    if (!navigator.geolocation) {
      void submit();
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => void submit(position), () => void submit(), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  };

  const start = async () => {
    try {
      setMessage(null);
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;
      setScanning(true);
      document.body.style.overflow = "hidden";
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await reader.decodeFromVideoDevice(null, videoRef.current!, (result) => {
        if (result && !busy) void submitToken(result.getText());
      });
    } catch {
      setScanning(false);
      document.body.style.overflow = "";
      setMessage("Kamera tidak dapat diakses");
    }
  };

  const stop = () => {
    readerRef.current?.reset();
    setScanning(false);
    document.body.style.overflow = "";
  };

  return (
    <div className="space-y-3">
      {message && <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">{message}</p>}
      <button type="button" onClick={scanning ? stop : start} disabled={busy} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50">
        Start QR Scanner
      </button>

      {scanning && (
        <div className="fixed inset-0 z-[100] bg-black">
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 text-center">
            <div className="relative h-[min(65vw,16rem)] w-[min(65vw,16rem)] max-h-[50vh] max-w-[82vw]">
              <div className="absolute inset-0 rounded-3xl border-2 border-white/30" />
              <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-orange-400" />
              <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-orange-400" />
              <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-orange-400" />
              <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-orange-400" />
              <div className="qr-scan-line absolute left-4 right-4 h-0.5 bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.9)]" />
            </div>
            <p className="mt-6 max-w-xs break-words text-base sm:mt-8 sm:text-lg font-semibold text-white">Place the QR code inside the frame</p>
            <p className="mt-2 max-w-xs break-words text-sm text-white/70">Keep the code steady until it is detected</p>
          </div>
          <button type="button" onClick={stop} aria-label="Close scanner" className="absolute right-3 top-3 rounded-full bg-black/50 p-3 text-white backdrop-blur hover:bg-orange-500 sm:right-5 sm:top-5">
            <X className="h-6 w-6" />
          </button>
          {busy && <div className="absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white sm:bottom-8">Checking...</div>}
        </div>
      )}
    </div>
  );
}
