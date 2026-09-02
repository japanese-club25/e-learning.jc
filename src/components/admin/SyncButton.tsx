"use client";

import { useState } from "react";
import { Sheet, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";

type SyncStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";

interface SyncInfo {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  googleSheetId: string | null;
  googleSheetName: string | null;
  syncError: string | null;
  attendanceCount: number;
}

interface SyncButtonProps {
  meetingId: string;
  initialSyncInfo: SyncInfo;
}

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING: {
    label: "Belum pernah disinkronkan",
    color: "text-slate-500",
    icon: <Clock className="w-4 h-4" />,
  },
  SYNCING: {
    label: "Sedang sinkronisasi...",
    color: "text-blue-600",
    icon: <RefreshCw className="w-4 h-4 animate-spin" />,
  },
  SYNCED: {
    label: "Tersinkronkan",
    color: "text-emerald-600",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  FAILED: {
    label: "Sinkronisasi gagal",
    color: "text-rose-600",
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

export default function SyncButton({ meetingId, initialSyncInfo }: SyncButtonProps) {
  const [syncInfo, setSyncInfo] = useState<SyncInfo>(initialSyncInfo);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    rows?: number;
    error?: string;
  } | null>(null);

  const handleSync = async () => {
    if (isSyncing || syncInfo.syncStatus === "SYNCING") return;

    setIsSyncing(true);
    setLastResult(null);
    setSyncInfo((prev) => ({ ...prev, syncStatus: "SYNCING" }));

    try {
      const res = await fetch(`/api/admin/meeting/${meetingId}/sync`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSyncInfo((prev) => ({
          ...prev,
          syncStatus: "SYNCED",
          lastSyncedAt: data.syncedAt,
          googleSheetId: data.sheetId,
          googleSheetName: data.sheetName,
          syncError: null,
        }));
        setLastResult({ rows: data.syncedRows });
      } else {
        const errMsg = data.error || "Sync failed";
        setSyncInfo((prev) => ({
          ...prev,
          syncStatus: "FAILED",
          syncError: errMsg,
        }));
        setLastResult({ error: errMsg });
      }
    } catch (err: any) {
      const errMsg = err?.message || "Network error";
      setSyncInfo((prev) => ({
        ...prev,
        syncStatus: "FAILED",
        syncError: errMsg,
      }));
      setLastResult({ error: errMsg });
    } finally {
      setIsSyncing(false);
    }
  };

  const statusConf = STATUS_CONFIG[syncInfo.syncStatus];
  const buttonDisabled = isSyncing || syncInfo.syncStatus === "SYNCING";

  return (
    <div className="flex flex-col gap-3">
      {/* Sync Status Badge */}
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1.5 text-sm font-medium ${statusConf.color}`}>
          {statusConf.icon}
          {statusConf.label}
        </span>
        {syncInfo.lastSyncedAt && (
          <span className="text-xs text-slate-400">
            —{" "}
            {new Date(syncInfo.lastSyncedAt).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Sheet link if available */}
      {syncInfo.googleSheetName && (
        <p className="text-xs text-slate-500">
          Sheet:{" "}
          <span className="font-mono font-semibold text-slate-700">
            {syncInfo.googleSheetName}
          </span>
        </p>
      )}

      {/* Last result */}
      {lastResult?.rows !== undefined && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>
            Sync berhasil — <strong>{lastResult.rows}</strong> baris tersinkronkan
          </span>
        </div>
      )}
      {lastResult?.error && (
        <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="break-words">{lastResult.error}</span>
        </div>
      )}

      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={buttonDisabled}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all duration-300 transform hover:scale-105 disabled:scale-100 whitespace-nowrap"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Syncing... ({syncInfo.attendanceCount} rows)
          </>
        ) : syncInfo.syncStatus === "FAILED" ? (
          <>
            <RefreshCw className="w-4 h-4" />
            Retry Sync
          </>
        ) : (
          <>
            <Sheet className="w-4 h-4" />
            Sync to Google Sheets
          </>
        )}
      </button>

      <p className="text-xs text-slate-400">
        Data PostgreSQL tidak berubah jika sync gagal.{" "}
        {syncInfo.attendanceCount} attendance records akan dikirim.
      </p>
    </div>
  );
}
