"use client";
import React, { useEffect, useState } from 'react';
import { QrCode, PlusCircle, Clock, Copy, Search, Calendar, Users, TrendingUp, X, CheckCircle2, AlertCircle, Info, Lightbulb, Power, FileText, Trash2 } from 'lucide-react';
import MeetingStatusToggle from './MeetingStatusToggle';
import AttendanceDetailModal from './AttendanceDetailModal';
import PermissionFormModal from './PermissionFormModal';
import LocationPicker from './LocationPicker';

type Meeting = {
  id: string;
  title: string;
  created_at: string;
  starts_at?: string;
  ends_at?: string;
  qr_payload?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function AttendanceManagement() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [loadingQr, setLoadingQr] = useState(false);
  const [selectedMeetingForToggle, setSelectedMeetingForToggle] = useState<string | null>(null);
  const [selectedMeetingForDetail, setSelectedMeetingForDetail] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [meetingCoords, setMeetingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteMeeting() {
    if (!meetingToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/meeting/${meetingToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to delete meeting');
        setDeleting(false);
        return;
      }
      // Close any open modals that reference the deleted meeting
      if (selectedMeetingForDetail === meetingToDelete.id) setSelectedMeetingForDetail(null);
      if (selectedMeetingForToggle === meetingToDelete.id) setSelectedMeetingForToggle(null);
      if (showQrModal) { setShowQrModal(false); setQrPayload(null); setQrCodeImage(null); }
      setMeetingToDelete(null);
      setSuccess('Meeting deleted successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await fetchMeetings();
    } catch {
      setError('Network error');
    } finally {
      setDeleting(false);
    }
  }

  async function fetchMeetings() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/attendance');
      const data = await res.json();
      if (data.success) setMeetings(data.meetings || []);
      else setError('Gagal memuat meeting');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMeetings(); }, []);

  async function createMeeting(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim()) {
      setError("Masukkan judul meeting");
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const payload: any = {
        title: title.trim(),
        ...(meetingCoords ?? {}),
      };
      if (startsAt) payload.starts_at = new Date(startsAt).toISOString();
      if (endsAt) payload.ends_at = new Date(endsAt).toISOString();

      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setQrPayload(null);
        setQrCodeImage(null);

        // Generate QR code immediately after creating meeting
        if (data.meeting?.id) {
          await generateQrCode(data.meeting.id);
        }

        setShowQrModal(true);
        setTitle("");
        setStartsAt("");
        setEndsAt("");
        setMeetingCoords(null);
        setSuccess("Meeting berhasil dibuat!");
        setTimeout(() => setSuccess(null), 3000);
        await fetchMeetings();
      } else {
        setError(data?.message || "Failed to create meeting");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError("Network error");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  function openQr(meeting: Meeting) {
    setQrPayload(null);
    setQrCodeImage(null);
    generateQrCode(meeting.id);
    setShowQrModal(true);
  }

  async function generateQrCode(payload: string) {
    try {
      setLoadingQr(true);
      const res = await fetch("/api/admin/attendance/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setQrCodeImage(data.qrCodeImage);
        setQrPayload(data.payload);
      } else {
        setError("Failed to generate QR code");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError("Failed to generate QR code");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoadingQr(false);
    }
  }

  const filteredMeetings = meetings
    .filter((m) => m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "newest"
        ? +new Date(b.created_at) - +new Date(a.created_at)
        : +new Date(a.created_at) - +new Date(b.created_at),
    );

  const totalMeetings = meetings.length;
  const lastCreated = meetings.length
    ? new Date(
        meetings.reduce((prev, cur) =>
          new Date(prev.created_at) > new Date(cur.created_at) ? prev : cur,
        ).created_at,
      ).toLocaleString("ja-JP")
    : null;

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="bg-orange-600 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">
                Attendance Management
              </h3>
              <p className="text-white/80 text-sm">
                Kelola data kehadiran siswa
              </p>
            </div>
          </div>
          <a
            href="/dashboard/attendance/manage"
            className="px-6 py-2.5 bg-white text-orange-700 rounded-lg hover:bg-orange-50 transition-colors font-semibold border border-orange-200 flex items-center gap-2"
          >
            📋 Kelola Attendance Records
          </a>
        </div>
      </div>

      {/* Stats Cards with Japanese aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-orange-600 rounded-xl p-6 shadow-sm border border-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-orange-100 text-sm font-medium">Today</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">
              Total Meetings
            </p>
            <p className="text-white text-3xl font-bold">{totalMeetings}</p>
          </div>
        </div>

        <div className="bg-orange-600 rounded-xl p-6 shadow-sm border border-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-orange-100 text-sm font-medium">Latest</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">
              Last Created
            </p>
            <p className="text-white text-sm font-semibold truncate">
              {lastCreated ?? "—"}
            </p>
          </div>
        </div>

        <div className="bg-orange-600 rounded-xl p-6 shadow-sm border border-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-orange-100 text-sm font-medium">Live</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">
              Active Sessions
            </p>
            <p className="text-white text-3xl font-bold">
              {meetings.length > 0 ? meetings.length : "0"}
            </p>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
          <p className="text-sm font-medium text-orange-900">{success}</p>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-orange-400 hover:text-orange-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Actions Bar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow border border-slate-200/50 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meetings by title..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-orange-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-orange-50 transition-colors focus:ring-2 focus:ring-orange-200 outline-none"
          >
            <option value="newest">🆕 Newest First</option>
            <option value="oldest">📅 Oldest First</option>
          </select>

          <button
            onClick={() => setShowPermissionModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 font-medium text-sm transition-colors"
            title="Catat izin siswa"
          >
            <FileText className="w-5 h-5" />
            <span className="hidden sm:inline">Form Izin</span>
            <span className="sm:hidden">Izin</span>
          </button>

          <button
            onClick={() => createMeeting()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed font-medium text-sm transition-colors"
            disabled={loading || !title.trim()}
            title="Quick create (uses current title)"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Quick Create</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Meeting Form */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-50 p-3 rounded-xl">
                <QrCode className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Create New Meeting
                </h3>
                <p className="text-sm text-slate-500">
                  Set jadwal dan generate QR absensi
                </p>
              </div>
            </div>

            <form onSubmit={createMeeting} className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>Meeting Title</span>
                  <span className="text-xs text-slate-500 font-normal">
                    • Meeting title
                  </span>
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Week 1 meeting..."
                  className="text-black mt-2 block w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none hover:border-slate-300"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span>Start time</span>
                    <span className="text-xs text-slate-500 font-normal">
                      (Optional)
                    </span>
                  </span>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="text-black mt-2 block w-full rounded-xl border-2 border-orange-100 bg-white p-3.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors outline-none hover:border-orange-300"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span>End time</span>
                    <span className="text-xs text-slate-500 font-normal">
                      (Optional)
                    </span>
                  </span>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="text-black mt-2 block w-full rounded-xl border-2 border-orange-100 bg-white p-3.5 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors outline-none hover:border-orange-300"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3.5 rounded-xl hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
                  disabled={loading || !title.trim()}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      Create &amp; Generate QR
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setStartsAt("");
                    setEndsAt("");
                    setError(null);
                    setMeetingCoords(null);
                  }}
                  className="px-6 py-3.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Reset
                </button>
              </div>

              {/* Lokasi absensi (geofence 150 m) */}
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 hover:border-slate-300 transition-colors">
                <LocationPicker
                  value={meetingCoords}
                  onChange={setMeetingCoords}
                />
              </div>
            </form>
          </div>

          {/* Meetings List */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-orange-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-orange-500 p-3 rounded-xl shadow-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Recent Meetings
                </h3>
                <p className="text-sm text-slate-500">
                  Recent Meetings • {filteredMeetings.length} results
                </p>
              </div>
            </div>

            {loading && meetings.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading meetings…</p>
              </div>
            ) : meetings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 border-2 border-dashed border-slate-300">
                  <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">
                    No Meetings Yet
                  </h4>
                  <p className="text-sm text-slate-500 mb-1">
                    No meetings yet
                  </p>
                  <p className="text-sm text-slate-600">
                    Create your first meeting to get started!
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredMeetings.map((m, index) => (
                  <li
                    key={m.id}
                    className="group p-5 bg-white rounded-xl border border-orange-100 hover:border-orange-300 shadow-sm hover:shadow-md transition-all duration-300 animate-in slide-in-from-bottom"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="bg-orange-500 p-2 rounded-lg shadow-sm flex-shrink-0">
                            <QrCode className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-base truncate group-hover:text-indigo-700 transition-colors">
                              {m.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <p className="text-xs text-slate-500 font-medium">
                                Created:{" "}
                                {new Date(m.created_at).toLocaleString("ja-JP")}
                              </p>
                            </div>
                            {m.starts_at && (
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <p className="text-xs text-slate-500 font-medium">
                                  Start:{" "}
                                  {new Date(m.starts_at).toLocaleString(
                                    "ja-JP",
                                  )}
                                  {m.ends_at &&
                                    ` - End: ${new Date(m.ends_at).toLocaleString("ja-JP")}`}
                                </p>
                              </div>
                            )}
                            <div className="mt-1">
                              {m.latitude != null && m.longitude != null ? (
                                <span className="text-xs text-emerald-700 font-medium">
                                  📍 Geofence aktif ({m.latitude.toFixed(6)},{" "}
                                  {m.longitude.toFixed(6)})
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  📍 Tanpa lokasi — geofence tidak aktif
                                </span>
                              )}
                            </div>
                            <div className="mt-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                              <p className="text-xs text-slate-600 flex items-center gap-2">
                                <span className="font-semibold">QR:</span>
                                <span className="font-mono text-xs text-slate-800 truncate">
                                  Active attendance token
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => setSelectedMeetingForDetail(m.id)}
                           className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-semibold transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          <span>Attendance</span>
                        </button>
                        <button
                          onClick={() => setSelectedMeetingForToggle(m.id)}
                           className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-semibold transition-colors"
                          title="Toggle meeting status"
                        >
                          <Power className="w-4 h-4" />
                          <span>Toggle</span>
                        </button>
                         <button
                           onClick={() => openQr(m)}
                           className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-semibold transition-colors"
                         >
                           <QrCode className="w-4 h-4" />
                           <span>QR</span>
                         </button>
                         <button
                           onClick={() => { openQr(m); setSuccess('QR regenerated!'); setTimeout(() => setSuccess(null), 2000); }}
                           className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors"
                           title="Regenerate attendance QR"
                         >
                           <Copy className="w-4 h-4" />
                           <span className="hidden sm:inline">Regenerate</span>
                         </button>
                         <button
                           onClick={() => setMeetingToDelete(m)}
                           className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-200 rounded-lg text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
                           title="Delete meeting and all attendance data"
                         >
                           <Trash2 className="w-4 h-4" />
                           <span className="hidden sm:inline">Delete</span>
                         </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right / Sidebar */}
        <aside className="space-y-6">
          {/* Info Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-500 p-2.5 rounded-xl shadow-sm">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">How it Works</h4>
                <p className="text-xs text-slate-500">How it works</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <div className="bg-orange-100 text-orange-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>Create a new meeting</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-orange-100 text-orange-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>Share QR code with students</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-orange-100 text-orange-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>Track attendance automatically</p>
              </div>
            </div>
          </div>

          {/* Quick Tip */}
          <div className="bg-orange-600 rounded-xl p-6 shadow-sm border border-orange-500 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Quick Tip</h4>
                <p className="text-xs text-white/80">Tip</p>
              </div>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              Each meeting has a unique QR payload. Students scan it to mark
              their attendance instantly!
            </p>
          </div>

          {/* Stats Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-500 p-2.5 rounded-xl shadow-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Quick Stats</h4>
                <p className="text-xs text-slate-500">Stats</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Meetings</span>
                <span className="font-bold text-slate-900">
                  {totalMeetings}
                </span>
              </div>
              <div className="h-px bg-slate-200"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Filtered Results</span>
                <span className="font-bold text-indigo-600">
                  {filteredMeetings.length}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowQrModal(false)}
          />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200 animate-in zoom-in duration-300">
            {/* Header with gradient */}
            <div className="bg-orange-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      QR Code Payload
                    </h3>
                    <p className="text-orange-100 text-sm mt-1">QR information</p>
                  </div>
                </div>
                <button
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
                  onClick={() => setShowQrModal(false)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loadingQr ? (
                <div className="py-16 text-center">
                  <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 font-medium">
                    Generating QR Code...
                  </p>
                </div>
              ) : qrCodeImage ? (
                <div className="space-y-4">
                  {/* QR Code Image */}
                  <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 flex items-center justify-center">
                    <img
                      src={qrCodeImage}
                      alt="QR Code"
                      className="w-full max-w-sm h-auto"
                    />
                  </div>

                  {/* URL Info */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-2xl border-2 border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold mb-2">
                      Attendance URL:
                    </p>
                    <pre className="text-sm font-mono text-slate-800 whitespace-pre-wrap break-all leading-relaxed">
                      {qrPayload}
                    </pre>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-xs text-orange-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Students can scan this QR code to access the attendance
                      form directly
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">
                    QR Code not available
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between gap-3 border-t border-slate-200">
              <button
                onClick={() => setShowQrModal(false)}
                className="px-5 py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-700 hover:bg-white hover:border-slate-300 transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {qrCodeImage && (
                  <a
                    href={qrCodeImage}
                    download={`qr-code-${qrPayload}.png`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-semibold text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </a>
                )}
                <button
                  onClick={() => {
                    if (qrPayload) {
                      navigator.clipboard?.writeText(qrPayload);
                      setSuccess("Attendance URL copied to clipboard!");
                      setTimeout(() => setSuccess(null), 2000);
                    }
                  }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Status Toggle Modal */}
      {selectedMeetingForToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedMeetingForToggle(null)}
          />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slate-200 animate-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-orange-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                    <Power className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Meeting Status
                    </h3>
                      <p className="text-orange-100 text-sm mt-1">
                      Meeting status
                    </p>
                  </div>
                </div>
                <button
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg"
                  onClick={() => setSelectedMeetingForToggle(null)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <MeetingStatusToggle meetingId={selectedMeetingForToggle} />
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedMeetingForToggle(null)}
                className="px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold text-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Detail Modal */}
      {selectedMeetingForDetail && (
        <AttendanceDetailModal
          meetingId={selectedMeetingForDetail}
          onClose={() => setSelectedMeetingForDetail(null)}
        />
      )}

      {/* Permission Form Modal */}
      {showPermissionModal && (
        <PermissionFormModal
          onClose={() => setShowPermissionModal(false)}
          onSuccess={() => {
            // Optionally refresh meetings or show success notification
            fetchMeetings();
          }}
        />
      )}

      {/* Delete Meeting Confirmation Modal */}
      {meetingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setMeetingToDelete(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-in zoom-in duration-200">
            <div className="bg-red-600 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Meeting?</h3>
                  <p className="text-red-100 text-sm mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 font-medium mb-1 truncate">
                &ldquo;{meetingToDelete.title}&rdquo;
              </p>
              <p className="text-slate-500 text-sm mb-5">
                Permanently deletes this meeting and all related data:
              </p>
              <ul className="space-y-2 mb-6 text-sm">
                {[
                  'All attendance records for this meeting',
                  'All QR tokens for this meeting',
                  'Meeting schedule and settings',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-600">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMeetingToDelete(null); setError(null); }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMeeting}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Meeting
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
