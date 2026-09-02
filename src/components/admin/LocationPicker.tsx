"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const DEFAULT_CENTER = { lat: -6.2, lon: 106.816666 }; // Jakarta

type LatLon = { latitude: number; longitude: number };

// ---- Web Mercator -> pixel coords at a given zoom -------------------------
const lonToX = (lon: number, z: number) => ((lon + 180) / 360) * TILE * 2 ** z;

const latToY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

const xToLon = (x: number, z: number) => (x / (TILE * 2 ** z)) * 360 - 180;

const yToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / (TILE * 2 ** z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const metersPerPixel = (lat: number, z: number) =>
  (156543.03392804097 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;

const clampLat = (lat: number) => Math.min(85, Math.max(-85, lat));
const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

interface LocationPickerProps {
  value: LatLon | null;
  onChange: (value: LatLon | null) => void;
  /** Preview circle radius in meters. */
  radius?: number;
}

export default function LocationPicker({
  value,
  onChange,
  radius = 150,
}: LocationPickerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(16);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [status, setStatus] = useState<string | null>(null);

  const drag = useRef<{
    id: number;
    px: number;
    py: number;
    moved: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Center on the picked point when it is set from outside (e.g. "lokasi saya").
  useEffect(() => {
    if (value) setCenter({ lat: value.latitude, lon: value.longitude });
  }, [value?.latitude, value?.longitude]);

  const world = { x: lonToX(center.lon, zoom), y: latToY(center.lat, zoom) };
  const originX = world.x - size.w / 2;
  const originY = world.y - size.h / 2;

  const pointToLatLon = useCallback(
    (px: number, py: number) => ({
      latitude: yToLat(originY + py, zoom),
      longitude: wrapLon(xToLon(originX + px, zoom)),
    }),
    [originX, originY, zoom],
  );

  // Non-passive wheel listener so the page does not scroll while zooming.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + dir));
      if (next === zoom) return;

      // Keep the coordinate under the cursor anchored across the zoom change.
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const anchor = pointToLatLon(px, py);

      const ax = lonToX(anchor.longitude, next);
      const ay = latToY(anchor.latitude, next);
      setZoom(next);
      setCenter({
        lat: clampLat(yToLat(ay + (size.h / 2 - py), next)),
        lon: wrapLon(xToLon(ax + (size.w / 2 - px), next)),
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, size.w, size.h, pointToLatLon]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY, moved: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;

    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.px = e.clientX;
    d.py = e.clientY;

    setCenter((c) => ({
      lat: clampLat(yToLat(latToY(c.lat, zoom) - dy, zoom)),
      lon: wrapLon(xToLon(lonToX(c.lon, zoom) - dx, zoom)),
    }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;

    // Treat as a tap only when the pointer barely moved.
    if (d.moved > 6) return;
    const rect = boxRef.current!.getBoundingClientRect();
    onChange(pointToLatLon(e.clientX - rect.left, e.clientY - rect.top));
    setStatus(null);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setStatus("Perangkat tidak mendukung GPS.");
      return;
    }
    setStatus("Mengambil lokasi...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setZoom(17);
        setStatus(null);
      },
      (err) =>
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? "Permission lokasi ditolak. Aktifkan akses lokasi pada browser."
            : "Lokasi tidak dapat diperoleh. Pastikan GPS aktif dan izinkan akses lokasi.",
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  // ---- tiles ---------------------------------------------------------------
  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  if (size.w > 0 && size.h > 0) {
    const n = 2 ** zoom;
    for (
      let tx = Math.floor(originX / TILE);
      tx <= Math.floor((originX + size.w) / TILE);
      tx++
    ) {
      for (
        let ty = Math.floor(originY / TILE);
        ty <= Math.floor((originY + size.h) / TILE);
        ty++
      ) {
        if (ty < 0 || ty >= n) continue;
        tiles.push({
          key: `${zoom}/${tx}/${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${((tx % n) + n) % n}/${ty}.png`,
          left: tx * TILE - originX,
          top: ty * TILE - originY,
        });
      }
    }
  }

  const marker = value
    ? {
        left: lonToX(value.longitude, zoom) - originX,
        top: latToY(value.latitude, zoom) - originY,
      }
    : null;
  const circlePx = value
    ? (radius / metersPerPixel(value.latitude, zoom)) * 2
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Lokasi Absensi (opsional)
          </p>
          <p className="text-xs text-slate-500">
            Klik pada peta untuk menentukan titik. Radius {radius} m. Tanpa
            titik, geofence tidak aktif.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            className="px-3 py-2 rounded-md border border-indigo-200 bg-white text-sm text-indigo-700 hover:bg-indigo-50"
          >
            Gunakan Lokasi Saya
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setStatus(null);
            }}
            disabled={!value}
            className="px-3 py-2 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hapus Titik
          </button>
        </div>
      </div>

      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
        }}
        className="relative h-72 w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-100 cursor-crosshair select-none"
        style={{ touchAction: "none" }}
        role="application"
        aria-label="Peta pemilih lokasi absensi. Gunakan kolom latitude dan longitude di bawah untuk input tanpa peta."
      >
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            aria-hidden="true"
            draggable={false}
            width={TILE}
            height={TILE}
            className="absolute pointer-events-none"
            style={{ left: t.left, top: t.top }}
          />
        ))}

        {marker && (
          <>
            <div
              className="absolute rounded-full border-2 border-indigo-500 bg-indigo-500/20 pointer-events-none"
              style={{
                width: circlePx,
                height: circlePx,
                left: marker.left - circlePx / 2,
                top: marker.top - circlePx / 2,
              }}
            />
            <div
              className="absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-red-600 shadow pointer-events-none"
              style={{ left: marker.left - 7, top: marker.top - 7 }}
            />
          </>
        )}

        {/* Zoom controls */}
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-md border border-slate-300 bg-white shadow">
          <button
            type="button"
            aria-label="Perbesar peta"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
            className="h-8 w-8 text-lg leading-none text-slate-700 hover:bg-slate-100"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Perkecil peta"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
            className="h-8 w-8 border-t border-slate-300 text-lg leading-none text-slate-700 hover:bg-slate-100"
          >
            −
          </button>
        </div>

        <div className="absolute bottom-0 right-0 bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600">
          © OpenStreetMap
        </div>
      </div>

      {/* Keyboard/screen-reader accessible input, and manual fine tuning. */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Latitude</span>
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={value?.latitude ?? ""}
            onChange={(e) => {
              const lat = e.target.valueAsNumber;
              if (Number.isNaN(lat)) return onChange(null);
              onChange({ latitude: lat, longitude: value?.longitude ?? 0 });
            }}
            placeholder="-6.123456"
            className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-sm text-slate-600"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Longitude</span>
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={value?.longitude ?? ""}
            onChange={(e) => {
              const lon = e.target.valueAsNumber;
              if (Number.isNaN(lon)) return onChange(null);
              onChange({ latitude: value?.latitude ?? 0, longitude: lon });
            }}
            placeholder="106.123456"
            className="mt-1 w-full rounded-md border border-slate-300 p-2 font-mono text-sm text-slate-600"
          />
        </label>
      </div>

      <p aria-live="polite" className="text-xs text-slate-600">
        {status ??
          (value
            ? "Titik lokasi absensi sudah dipilih."
            : "Belum ada titik dipilih.")}
      </p>
    </div>
  );
}
