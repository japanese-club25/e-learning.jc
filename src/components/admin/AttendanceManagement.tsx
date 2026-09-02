"use client";
import React, { useEffect, useState } from 'react';
import { QrCode, PlusCircle, Clock, Copy, Search, Calendar, Users, TrendingUp, X, CheckCircle2, AlertCircle, Info, Lightbulb, Power, FileText } from 'lucide-react';
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
      setError('Masukkan judul meeting');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      const payload: any = { 
        title: title.trim(),
        ...(meetingCoords ?? {})
      };
      if (startsAt) payload.starts_at = new Date(startsAt).toISOString();
      if (endsAt) payload.ends_at = new Date(endsAt).toISOString();
      
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        // qr_payload now contains full URL
        const payload = data.qr_payload || `${window.location.origin}/attendance/${data.meeting?.id}`;
        setQrPayload(payload);
        
        // Generate QR code immediately after creating meeting
        if (payload) {
          await generateQrCode(payload);
        }
        
        setShowQrModal(true);
        setTitle('');
        setStartsAt('');
        setEndsAt('');
        setMeetingCoords(null);
        setSuccess('Meeting berhasil dibuat!');
        setTimeout(() => setSuccess(null), 3000);
        await fetchMeetings();
      } else {
        setError(data?.message || 'Failed to create meeting');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Network error');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  function openQr(meeting: Meeting) {
    // Generate full URL if qr_payload doesn't exist or is just an ID
    const payload = meeting.qr_payload || `${window.location.origin}/attendance/${meeting.id}`;
    setQrPayload(payload);
    generateQrCode(payload);
    setShowQrModal(true);
  }

  async function generateQrCode(payload: string) {
    try {
      setLoadingQr(true);
      const res = await fetch('/api/admin/attendance/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });
      const data = await res.json();
      if (data.success) {
        setQrCodeImage(data.qrCodeImage);
      } else {
        setError('Failed to generate QR code');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Failed to generate QR code');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoadingQr(false);
    }
  }

  const filteredMeetings = meetings
    .filter((m) => m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === 'newest' ? +new Date(b.created_at) - +new Date(a.created_at) : +new Date(a.created_at) - +new Date(b.created_at)));

  const totalMeetings = meetings.length;
  const lastCreated = meetings.length ? new Date(meetings.reduce((prev, cur) => (new Date(prev.created_at) > new Date(cur.created_at) ? prev : cur)).created_at).toLocaleString('ja-JP') : null;

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Attendance Management</h3>
              <p className="text-white/80 text-sm">Kelola data kehadiran siswa</p>
            </div>
          </div>
          <a
            href="/dashboard/attendance/manage"
            className="px-6 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            📋 Kelola Attendance Records
          </a>
        </div>
      </div>

      {/* Stats Cards with Japanese aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-2xl p-6 shadow-lg border border-indigo-400/20 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-indigo-200 text-sm font-medium">今日</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">Total Meetings</p>
            <p className="text-white text-3xl font-bold">{totalMeetings}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-6 shadow-lg border border-emerald-400/20 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-emerald-200 text-sm font-medium">最新</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">Last Created</p>
            <p className="text-white text-sm font-semibold truncate">{lastCreated ?? '—'}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl p-6 shadow-lg border border-purple-400/20 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-purple-200 text-sm font-medium">活動</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">Active Sessions</p>
            <p className="text-white text-3xl font-bold">{meetings.length > 0 ? meetings.length : '0'}</p>
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
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-900">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600">
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value as any)} 
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all focus:ring-2 focus:ring-indigo-200 outline-none"
          >
            <option value="newest">🆕 Newest First</option>
            <option value="oldest">📅 Oldest First</option>
          </select>

          <button
            onClick={() => setShowPermissionModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-700 hover:to-blue-800 font-medium text-sm transition-all duration-300 transform hover:scale-[1.02]"
            title="Catat izin siswa"
          >
            <FileText className="w-5 h-5" />
            <span className="hidden sm:inline">Form Izin</span>
            <span className="sm:hidden">Izin</span>
          </button>

          <button
            onClick={() => createMeeting()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed font-medium text-sm transition-all duration-300 transform hover:scale-[1.02]"
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
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200/50 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl shadow-lg">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Meeting</h3>
                <p className="text-sm text-slate-500">新しいミーティング • Generate QR for attendance</p>
              </div>
            </div>

            <form onSubmit={createMeeting} className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <span>Meeting Title</span>
                  <span className="text-xs text-slate-500 font-normal">• 会議のタイトル</span>
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: Pertemuan Minggu ke-1, N5 Class Session..."
                  className="text-black mt-2 block w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none hover:border-slate-300"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span>Start Time</span>
                    <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                  </span>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="text-black mt-2 block w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none hover:border-slate-300"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span>End Time</span>
                    <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                  </span>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="text-black mt-2 block w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none hover:border-slate-300"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed font-semibold text-sm transition-all duration-300 transform hover:scale-[1.02]"
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
                  onClick={() => { setTitle(''); setStartsAt(''); setEndsAt(''); setError(null); setMeetingCoords(null); }}
                  className="px-6 py-3.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Reset
                </button>
              </div>

              {/* Lokasi absensi (geofence 150 m) */}
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 hover:border-slate-300 transition-colors">
                <LocationPicker value={meetingCoords} onChange={setMeetingCoords} />
              </div>
            </form>
          </div>

          {/* Meetings List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Meetings</h3>
                <p className="text-sm text-slate-500">最近の会議 • {filteredMeetings.length} results</p>
              </div>
            </div>

            {loading && meetings.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-block w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Loading meetings…</p>
              </div>
            ) : meetings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 border-2 border-dashed border-slate-300">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">No Meetings Yet</h4>
                  <p className="text-sm text-slate-500 mb-1">会議がまだありません</p>
                  <p className="text-sm text-slate-600">Create your first meeting to get started!</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredMeetings.map((m, index) => (
                  <li 
                    key={m.id} 
                    className="group p-5 bg-gradient-to-br from-white to-slate-50 rounded-xl border-2 border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all duration-300 animate-in slide-in-from-bottom"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2 rounded-lg shadow-lg flex-shrink-0">
                            <QrCode className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-base truncate group-hover:text-indigo-700 transition-colors">{m.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <p className="text-xs text-slate-500 font-medium">
                                Created: {new Date(m.created_at).toLocaleString('ja-JP')}
                              </p>
                            </div>
                            {m.starts_at && (
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <p className="text-xs text-slate-500 font-medium">
                                  Start: {new Date(m.starts_at).toLocaleString('ja-JP')}
                                  {m.ends_at && ` - End: ${new Date(m.ends_at).toLocaleString('ja-JP')}`}
                                </p>
                              </div>
                            )}
                            <div className="mt-1">
                              {m.latitude != null && m.longitude != null ? (
                                <span className="text-xs text-emerald-700 font-medium">
                                  📍 Geofence aktif ({m.latitude.toFixed(6)}, {m.longitude.toFixed(6)})
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">📍 Tanpa lokasi — geofence tidak aktif</span>
                              )}
                            </div>
                            <div className="mt-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                              <p className="text-xs text-slate-600 flex items-center gap-2">
                                <span className="font-semibold">QR URL:</span>
                                <span className="font-mono text-xs text-slate-800 truncate">
                                  {m.qr_payload || `${window.location.origin}/attendance/${m.id}`}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <button
                          onClick={() => setSelectedMeetingForDetail(m.id)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-emerald-700 text-sm font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                          <Users className="w-4 h-4" />
                          <span>Attendance</span>
                        </button>
                        <button
                          onClick={() => setSelectedMeetingForToggle(m.id)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:from-purple-600 hover:to-purple-700 text-sm font-semibold transition-all duration-300 transform hover:scale-105"
                          title="Toggle meeting status"
                        >
                          <Power className="w-4 h-4" />
                          <span>Toggle</span>
                        </button>
                        <button
                          onClick={() => openQr(m)}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-indigo-700 text-sm font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>QR</span>
                        </button>
                        <button
                          onClick={() => { 
                            const attendanceUrl = m.qr_payload || `${window.location.origin}/attendance/${m.id}`;
                            navigator.clipboard?.writeText(attendanceUrl);
                            setSuccess('Attendance link copied!');
                            setTimeout(() => setSuccess(null), 2000);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all transform hover:scale-105"
                          title="Copy attendance link"
                        >
                          <Copy className="w-4 h-4" />
                          <span className="hidden sm:inline">Link</span>
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
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl shadow-lg">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">How it Works</h4>
                <p className="text-xs text-slate-500">仕組み</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <div className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <p>Create a new meeting</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <p>Share QR code with students</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <p>Track attendance automatically</p>
              </div>
            </div>
          </div>

          {/* Quick Tip */}
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 rounded-2xl p-6 shadow-lg border border-orange-400/20 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                <Lightbulb className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Quick Tip</h4>
                <p className="text-xs text-white/80">ヒント</p>
              </div>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              Each meeting has a unique QR payload. Students scan it to mark their attendance instantly!
            </p>
          </div>

          {/* Stats Summary */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2.5 rounded-xl shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Quick Stats</h4>
                <p className="text-xs text-slate-500">統計</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Meetings</span>
                <span className="font-bold text-slate-900">{totalMeetings}</span>
              </div>
              <div className="h-px bg-slate-200"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Filtered Results</span>
                <span className="font-bold text-indigo-600">{filteredMeetings.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQrModal(false)} />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slate-200 animate-in zoom-in duration-300">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                    <QrCode className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">QR Code Payload</h3>
                    <p className="text-indigo-100 text-sm mt-1">QRコード情報</p>
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
                  <div className="inline-block w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 font-medium">Generating QR Code...</p>
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
                    <p className="text-xs text-slate-500 font-semibold mb-2">Attendance URL:</p>
                    <pre className="text-sm font-mono text-slate-800 whitespace-pre-wrap break-all leading-relaxed">{qrPayload}</pre>
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <p className="text-xs text-indigo-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Students can scan this QR code to access the attendance form directly
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">QR Code not available</p>
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                )}
                <button
                  onClick={() => { 
                    if (qrPayload) {
                      navigator.clipboard?.writeText(qrPayload);
                      setSuccess('Attendance URL copied to clipboard!');
                      setTimeout(() => setSuccess(null), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-700 hover:to-emerald-800 font-semibold text-sm transition-all duration-300 transform hover:scale-105"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMeetingForToggle(null)} />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slate-200 animate-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-600 to-pink-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                    <Power className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Meeting Status</h3>
                    <p className="text-purple-100 text-sm mt-1">会議ステータス</p>
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
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:from-purple-700 hover:to-purple-800 font-semibold text-sm transition-all duration-300"
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
    </div>
  );
}
