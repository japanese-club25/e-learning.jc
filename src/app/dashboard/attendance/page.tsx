"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { QrCode, PlusCircle, Clock, Copy, Search, Users, UserCheck, Download, Trash2, Edit2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';
import { useDebounce } from '@/hooks/useDebounce';
import LocationPicker from '@/components/admin/LocationPicker';

type Meeting = {
  id: string;
  title: string;
  created_at: string;
  qr_payload?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Student = {
  name: string;
  class: string;
};

type AttendanceMeeting = {
  title: string;
  starts_at: string | null;
  ends_at: string | null;
};

type Attendance = {
  id: string;
  status: string;
  recorded_at: string;
  student: Student;
  meeting: AttendanceMeeting;
  meeting_id: string;
  student_id: string;
};

type PaginationData = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function AttendanceDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [meetingCoords, setMeetingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Attendance list state
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });

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

  const handleAttendanceSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchAttendances();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(attendances.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const handleEdit = (attendance: Attendance) => {
    setEditingAttendance(attendance);
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setShowDeleteConfirm(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal 1 attendance untuk dihapus');
      return;
    }
    setDeleteTarget(selectedIds);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      if (Array.isArray(deleteTarget)) {
        const response = await fetch('/api/admin/attendance/records', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: deleteTarget })
        });
        
        const data = await response.json();
        if (data.success) {
          alert(data.message);
          setSelectedIds([]);
          fetchAttendances();
        }
      } else if (deleteTarget) {
        const response = await fetch(`/api/admin/attendance/records/${deleteTarget}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
          alert('Attendance berhasil dihapus');
          fetchAttendances();
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Gagal menghapus attendance');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const handleUpdateAttendance = async (updatedData: any) => {
    try {
      const response = await fetch(`/api/admin/attendance/records/${editingAttendance?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      const data = await response.json();
      if (data.success) {
        alert('Attendance berhasil diupdate');
        setShowEditModal(false);
        setEditingAttendance(null);
        fetchAttendances();
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Gagal mengupdate attendance');
    }
  };

  const exportToCSV = () => {
    const records = selectedIds.length > 0 
      ? attendances.filter(a => selectedIds.includes(a.id))
      : attendances;

    const csv = [
      ['Nama', 'Kelas', 'Status', 'Waktu Absen', 'Meeting'],
      ...records.map(a => [
        a.student.name,
        a.student.class,
        a.status,
        new Date(a.recorded_at).toLocaleString('id-ID'),
        a.meeting.title
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      HADIR: 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200',
      TERLAMBAT: 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200',
      IZIN: 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200',
      TIDAK_HADIR: 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Debounce search for better performance
  const debouncedSearch = useDebounce(attendanceSearch, 500);

  const fetchAttendances = useCallback(async () => {
    try {
      setAttendanceLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch })
      });

      const response = await fetch(`/api/admin/attendance/records?${params}`);
      const data = await response.json();

      if (data.success) {
        setAttendances(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch attendances:', error);
    } finally {
      setAttendanceLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, debouncedSearch]);

  useEffect(() => { fetchMeetings(); }, []);
  
  useEffect(() => {
    fetchAttendances();
  }, [fetchAttendances]);

  async function createMeeting(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim()) return setError('Masukkan judul meeting');
    try {
      setLoading(true);
      const res = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          ...(meetingCoords ?? {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQrPayload(data.qr_payload || null);
        setShowQrModal(true);
        setTitle('');
        setMeetingCoords(null);
        await fetchMeetings();
      } else {
        setError(data?.message || 'Failed to create meeting');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function openQr(meeting: Meeting) {
    setQrPayload(meeting.qr_payload || null);
    setShowQrModal(true);
  }

  const filteredMeetings = meetings
    .filter((m) => m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === 'newest' ? +new Date(b.created_at) - +new Date(a.created_at) : +new Date(a.created_at) - +new Date(b.created_at)));

  const totalMeetings = meetings.length;
  const lastCreated = meetings.length ? new Date(meetings.reduce((prev, cur) => (new Date(prev.created_at) > new Date(cur.created_at) ? prev : cur)).created_at).toLocaleString('ja-JP') : null;
  
  const attendanceStats = useMemo(() => ({
    total: pagination.total,
    hadir: attendances.filter(a => a.status === 'HADIR').length,
    terlambat: attendances.filter(a => a.status === 'TERLAMBAT').length,
    izin: attendances.filter(a => a.status === 'IZIN').length,
    tidakHadir: attendances.filter(a => a.status === 'TIDAK_HADIR').length,
  }), [attendances, pagination.total]);

  return (
    <main className="space-y-8" role="main" aria-label="Attendance Dashboard">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            出席管理 — Attendance Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">Buat meeting, bagikan QR, dan kelola daftar kehadiran siswa</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white/60 rounded-lg border px-2 py-1">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search meetings..." className="bg-transparent outline-none text-sm" />
          </div>

          <div className="flex items-center space-x-2">
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="rounded-md border px-3 py-2 text-sm">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>

            <button
              onClick={() => createMeeting()}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 disabled:opacity-60"
              disabled={loading}
              title="Quick create (uses current title)"
            >
              <PlusCircle className="w-5 h-5" />
              Quick Create
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow p-6 border border-slate-200/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-500">Total meetings</p>
              <p className="text-2xl font-bold text-slate-900">{totalMeetings}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Last created</p>
              <p className="text-sm text-slate-700">{lastCreated ?? '—'}</p>
            </div>
          </div>

          <form onSubmit={createMeeting} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Judul Meeting</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pertemuan Minggu ke-1"
                className="mt-2 block w-full rounded-lg border border-slate-200 p-3 focus:ring-2 focus:ring-indigo-200"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:bg-emerald-700 disabled:opacity-60"
                disabled={loading}
              >
                <QrCode className="w-5 h-5" />
                Create &amp; Generate QR
              </button>
              <button
                type="button"
                onClick={() => { setTitle(''); setError(null); setMeetingCoords(null); }}
                className="px-3 py-2 rounded-md border text-sm text-slate-700"
              >
                Reset
              </button>
              {error && <p className="text-sm text-red-600 ml-3">{error}</p>}
            </div>

            {/* Lokasi absensi (geofence 150 m). Kosongkan untuk menonaktifkan geofence. */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <LocationPicker value={meetingCoords} onChange={setMeetingCoords} />
            </div>
          </form>

          <hr className="my-6" />

          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Recent Meetings
          </h2>
          {loading && meetings.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Loading meetings…</div>
          ) : meetings.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <svg width="120" height="80" viewBox="0 0 120 80" className="mx-auto mb-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="12" width="96" height="56" rx="6" fill="#f1f5f9" stroke="#e2e8f0" />
                <rect x="18" y="24" width="60" height="8" rx="2" fill="#e6eef8" />
                <rect x="18" y="36" width="40" height="6" rx="2" fill="#e6eef8" />
                <circle cx="96" cy="40" r="16" fill="#eef2ff" stroke="#e0e7ff" />
                <path d="M88 36h16v8H88z" fill="#c7d2fe" />
              </svg>
              <div>Belum ada meeting. Buat meeting pertama Anda.</div>
            </div>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMeetings.map((m) => (
                <li key={m.id} className="p-4 bg-gradient-to-br from-white to-slate-50 rounded-lg border shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{m.title}</p>
                    <p className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString('ja-JP')}</p>
                    <p className="mt-1 text-xs">
                      {m.latitude != null && m.longitude != null ? (
                        <span className="text-emerald-700">
                          📍 Geofence aktif — <span className="font-mono">{m.latitude.toFixed(6)}, {m.longitude.toFixed(6)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">📍 Tanpa lokasi — geofence tidak aktif</span>
                      )}
                    </p>
                    {m.qr_payload && (
                      <p className="mt-2 text-xs text-slate-500 truncate max-w-md">Payload: <span className="font-mono text-xs text-slate-700">{m.qr_payload}</span></p>
                    )}
                  </div>
                  <div className="mt-3 sm:mt-0 flex items-center gap-2">
                    <button
                      onClick={() => openQr(m)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-md text-indigo-700 text-sm hover:from-indigo-100 hover:to-purple-100 transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      View QR
                    </button>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(m.qr_payload || m.id); }}
                      className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-slate-50 transition-colors"
                      title="Copy payload or id"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={() => navigator.clipboard?.writeText(m.id)}
                      className="px-3 py-2 text-sm border rounded-md hover:bg-slate-50 transition-colors"
                      title="Copy meeting id"
                    >
                      ID
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right / Sidebar widgets */}
        <aside className="space-y-6">
          <QuickActions />

          <RecentActivity recentActivity={[]} />
        </aside>
      </div>

      {/* Attendance List Section */}
      <section 
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200/50"
        aria-labelledby="attendance-list-heading"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 
              id="attendance-list-heading"
              className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2"
            >
              <Users className="w-7 h-7 text-emerald-600" aria-hidden="true" />
              Daftar Kehadiran Siswa
            </h2>
            <p className="text-sm text-slate-600 mt-1">Kelola dan pantau kehadiran siswa secara real-time</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-slate-600 mb-1">Total Records</div>
            <div className="text-2xl font-bold text-slate-900">{attendanceStats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 border border-green-200 hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-green-700 mb-1">Hadir</div>
            <div className="text-2xl font-bold text-green-700">{attendanceStats.hadir}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-4 border border-yellow-200 hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-yellow-700 mb-1">Terlambat</div>
            <div className="text-2xl font-bold text-yellow-700">{attendanceStats.terlambat}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-xl p-4 border border-blue-200 hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-blue-700 mb-1">Izin</div>
            <div className="text-2xl font-bold text-blue-700">{attendanceStats.izin}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-4 border border-red-200 hover:shadow-md transition-shadow">
            <div className="text-xs font-medium text-red-700 mb-1">Tidak Hadir</div>
            <div className="text-2xl font-bold text-red-700">{attendanceStats.tidakHadir}</div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Search className="w-4 h-4" />
                Cari Siswa
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAttendanceSearch()}
                  placeholder="Nama atau kelas..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow"
                />
                <button
                  onClick={handleAttendanceSearch}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium text-sm shadow-sm hover:shadow-md"
                >
                  Cari
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Filter className="w-4 h-4" />
                Filter Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow"
              >
                <option value="">Semua Status</option>
                <option value="HADIR">Hadir</option>
                <option value="TERLAMBAT">Terlambat</option>
                <option value="IZIN">Izin</option>
                <option value="TIDAK_HADIR">Tidak Hadir</option>
              </select>
            </div>

            {/* Per Page */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Per Halaman
              </label>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-shadow"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all font-medium text-sm shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              Export CSV {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all font-medium text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Hapus ({selectedIds.length})
            </button>
            <button
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Table */}
        {attendanceLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Memuat data kehadiran...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === attendances.length && attendances.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded border-white/30"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Nama</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Kelas</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm hidden md:table-cell">Meeting</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-sm hidden lg:table-cell">Waktu</th>
                    <th className="px-4 py-3 text-center font-semibold text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        <UserCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-medium">Tidak ada data attendance</p>
                        <p className="text-sm mt-2">Coba ubah filter atau search</p>
                      </td>
                    </tr>
                  ) : (
                    attendances.map((attendance, index) => (
                      <tr
                        key={attendance.id}
                        className={`hover:bg-indigo-50/50 transition-colors ${
                          selectedIds.includes(attendance.id) ? 'bg-indigo-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(attendance.id)}
                            onChange={(e) => handleSelectOne(attendance.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-sm">
                          {attendance.student.name}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-sm">
                          {attendance.student.class}
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-sm hidden md:table-cell">
                          <div className="max-w-xs truncate" title={attendance.meeting.title}>
                            {attendance.meeting.title}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(attendance.status)}`}>
                            {attendance.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs hidden lg:table-cell">
                          {new Date(attendance.recorded_at).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEdit(attendance)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 transition-all text-xs font-medium shadow-sm hover:shadow-md"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(attendance.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-md hover:from-red-700 hover:to-rose-700 transition-all text-xs font-medium shadow-sm hover:shadow-md"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-600">
                  Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} records
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="inline-flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination({ ...pagination, page: pageNum })}
                          className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                            pagination.page === pageNum
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                              : 'border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowQrModal(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">QR Payload</h3>
                </div>
                <button className="text-white hover:text-slate-200 transition-colors" onClick={() => setShowQrModal(false)}>✕</button>
              </div>
            </div>

            <div className="p-6">
              {qrPayload ? (
                <pre className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg overflow-auto text-sm border border-slate-200">{qrPayload}</pre>
              ) : (
                <p className="text-sm text-slate-500">Tidak ada payload QR untuk ditampilkan.</p>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { qrPayload && navigator.clipboard?.writeText(qrPayload); }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all font-medium shadow-sm hover:shadow-md"
              >
                Salin Payload
              </button>
              <button 
                onClick={() => setShowQrModal(false)} 
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingAttendance && (
        <EditAttendanceModal
          attendance={editingAttendance}
          onClose={() => {
            setShowEditModal(false);
            setEditingAttendance(null);
          }}
          onSave={handleUpdateAttendance}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={Array.isArray(deleteTarget) ? deleteTarget.length : 1}
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
        />
      )}
    </main>
  );
}

// Edit Modal Component
function EditAttendanceModal({ 
  attendance, 
  onClose, 
  onSave 
}: { 
  attendance: Attendance; 
  onClose: () => void; 
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: attendance.student.name,
    class: attendance.student.class,
    status: attendance.status
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Edit Attendance
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Kelas
            </label>
            <input
              type="text"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Status Kehadiran
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-shadow"
            >
              <option value="HADIR">Hadir</option>
              <option value="TERLAMBAT">Terlambat</option>
              <option value="IZIN">Izin</option>
              <option value="TIDAK_HADIR">Tidak Hadir</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-sm hover:shadow-md"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ 
  count, 
  onConfirm, 
  onCancel 
}: { 
  count: number; 
  onConfirm: () => void; 
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Konfirmasi Hapus
          </h3>
        </div>
        
        <div className="p-6">
          <p className="text-slate-700 mb-6">
            Apakah Anda yakin ingin menghapus <strong>{count}</strong> attendance record{count > 1 ? 's' : ''}?
            <br />
            <span className="text-sm text-red-600 mt-2 block font-medium">
              ⚠️ Tindakan ini tidak dapat dibatalkan!
            </span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all font-medium shadow-sm hover:shadow-md"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
