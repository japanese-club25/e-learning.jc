"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";

export default function AttendanceQrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => readerRef.current?.reset(), []);

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
      await reader.decodeFromVideoDevice(null, videoRef.current!, (result) => {
        if (result && !busy) void submitToken(result.getText());
      });
    } catch {
      setScanning(false);
      setMessage("Kamera tidak dapat diakses");
    }
  };

  const stop = () => {
    readerRef.current?.reset();
    setScanning(false);
  };

  return (
    <div className="space-y-3">
      {scanning && <video ref={videoRef} className="w-full rounded-xl bg-black aspect-video" muted playsInline />}
      {message && <p className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">{message}</p>}
      <button type="button" onClick={scanning ? stop : start} disabled={busy} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
        {scanning ? "Stop Scanner" : "Start QR Scanner"}
      </button>
    </div>
  );
}
