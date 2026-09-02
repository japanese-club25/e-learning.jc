'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserCheck, 
  Clock, 
  FileText, 
  Download, 
  Search,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import SyncButton from './SyncButton';

interface Attendance {
  id: string;
  status: string;
  recorded_at: string;
  reason?: string | null;
  student: {
    name: string;
    class: string;
  };
}

interface Meeting {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sync_status?: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  last_synced_at?: string | null;
  google_sheet_id?: string | null;
  google_sheet_name?: string | null;
  sync_error?: string | null;
}

interface AttendanceDetailModalProps {
  meetingId: string;
  onClose: () => void;
}

export default function AttendanceDetailModal({ meetingId, onClose }: AttendanceDetailModalProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'class'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (meetingId) {
      fetchData();
    }
  }, [meetingId]);

  const fetchData = async () => {
    try {
      const [meetingRes, attendanceRes] = await Promise.all([
        fetch(`/api/admin/meeting/${meetingId}`),
        fetch(`/api/attendance/list/${meetingId}`)
      ]);

      const meetingData = await meetingRes.json();
      const attendanceData = await attendanceRes.json();

      if (meetingData.success) setMeeting(meetingData.meeting);
      if (attendanceData.success) setAttendances(attendanceData.attendances);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendances = attendances
    .filter(att => {
      const matchesSearch = 
        att.student.name.toLowerCase().includes(filter.toLowerCase()) ||
        att.student.class.toLowerCase().includes(filter.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || att.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.student.name.localeCompare(b.student.name);
      } else if (sortBy === 'time') {
        comparison = new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
      } else if (sortBy === 'class') {
        comparison = a.student.class.localeCompare(b.student.class);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const stats = {
    total: attendances.length,
    hadir: attendances.filter(a => a.status === 'HADIR').length,
    terlambat: attendances.filter(a => a.status === 'TERLAMBAT').length,
    izin: attendances.filter(a => a.status === 'IZIN').length,
    tidakHadir: attendances.filter(a => a.status === 'TIDAK_HADIR').length
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      HADIR: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      TERLAMBAT: 'bg-amber-100 text-amber-700 border-amber-300',
      IZIN: 'bg-blue-100 text-blue-700 border-blue-300',
      TIDAK_HADIR: 'bg-rose-100 text-rose-700 border-rose-300'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      HADIR: '✓',
      TERLAMBAT: '⏰',
      IZIN: '✉',
      TIDAK_HADIR: '✗'
    };
    return icons[status as keyof typeof icons] || '?';
  };

  const exportToCSV = () => {
    const csv = [
      ['No', 'Nama', 'Kelas', 'Status', 'Waktu Absen'],
      ...filteredAttendances.map((att, i) => [
        i + 1,
        att.student.name,
        att.student.class,
        att.status,
        new Date(att.recorded_at).toLocaleString('id-ID')
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absensi-${meeting?.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-6xl w-full p-12 text-center">
          <div className="inline-block w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  const attendanceRate = stats.total > 0 ? ((stats.hadir / stats.total) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border-2 border-slate-200 animate-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 sticky top-0 z-20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg flex-shrink-0">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-white mb-1 truncate">
                  {meeting?.title || 'Attendance Detail'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {meeting?.starts_at && (
                    <div className="flex items-center gap-1.5 text-indigo-100">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(meeting.starts_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                  )}
                  {meeting?.starts_at && (
                    <div className="flex items-center gap-1.5 text-indigo-100">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(meeting.starts_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    meeting?.is_active 
                      ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/30' 
                      : 'bg-rose-500/20 text-rose-100 border border-rose-300/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${meeting?.is_active ? 'bg-emerald-300' : 'bg-rose-300'}`} />
                    {meeting?.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>
            <button 
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg flex-shrink-0" 
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 shadow-lg border border-indigo-400/20 group hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-indigo-100 text-xs font-semibold uppercase tracking-wide">Total</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.total}</p>
              <p className="text-indigo-200 text-xs mt-1">students</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-lg border border-emerald-400/20 group hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wide">Hadir</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.hadir}</p>
              <p className="text-emerald-200 text-xs mt-1">{attendanceRate}% rate</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 shadow-lg border border-amber-400/20 group hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="text-amber-100 text-xs font-semibold uppercase tracking-wide">Terlambat</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.terlambat}</p>
              <p className="text-amber-200 text-xs mt-1">late entries</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 shadow-lg border border-blue-400/20 group hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-blue-100 text-xs font-semibold uppercase tracking-wide">Izin</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.izin}</p>
              <p className="text-blue-200 text-xs mt-1">excused</p>
            </div>

            <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-4 shadow-lg border border-rose-400/20 group hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-rose-100 text-xs font-semibold uppercase tracking-wide">Tidak Hadir</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.tidakHadir}</p>
              <p className="text-rose-200 text-xs mt-1">absent</p>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="p-6 bg-white border-b border-slate-200 sticky top-[120px] z-10">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau kelas..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all outline-none hover:border-slate-300"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto pl-10 pr-8 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="HADIR">✓ Hadir</option>
                <option value="TERLAMBAT">⏰ Terlambat</option>
                <option value="IZIN">✉ Izin</option>
                <option value="TIDAK_HADIR">✗ Tidak Hadir</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 md:flex-initial px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none cursor-pointer"
              >
                <option value="time">⏰ Waktu</option>
                <option value="name">👤 Nama</option>
                <option value="class">🎓 Kelas</option>
              </select>
              
              <button
                onClick={toggleSort}
                className="px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all"
                title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
              >
                <ArrowUpDown className={`w-5 h-5 text-slate-600 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-700 hover:to-emerald-800 font-semibold text-sm transition-all duration-300 transform hover:scale-105 whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>

          {/* Filter Summary */}
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <TrendingUp className="w-4 h-4" />
            <span>Menampilkan <strong className="text-indigo-600 font-bold">{filteredAttendances.length}</strong> dari <strong>{stats.total}</strong> data</span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-auto max-h-[calc(95vh-480px)]">
          {filteredAttendances.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
                <Users className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {filter || statusFilter !== 'ALL' ? 'Tidak Ada Hasil' : 'Belum Ada Data Absensi'}
              </h3>
              <p className="text-slate-500 text-sm">
                {filter || statusFilter !== 'ALL' 
                  ? 'Coba ubah filter atau kata kunci pencarian' 
                  : 'Belum ada siswa yang melakukan absensi untuk meeting ini'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                      No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                      Nama Siswa
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                      Kelas
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                      Keterangan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider border-b-2 border-slate-200">
                      Waktu Absen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredAttendances.map((attendance, index) => (
                    <tr 
                      key={attendance.id} 
                      className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500 group-hover:text-indigo-600">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            {attendance.student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                            {attendance.student.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                          🎓 {attendance.student.class}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border-2 ${getStatusBadge(attendance.status)} shadow-sm`}>
                          <span className="text-base">{getStatusIcon(attendance.status)}</span>
                          {attendance.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        {attendance.status === 'IZIN' && attendance.reason ? (
                          <div className="text-sm text-slate-700">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2" title={attendance.reason}>
                                {attendance.reason}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-medium">
                              {new Date(attendance.recorded_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(attendance.recorded_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t-2 border-slate-200 sticky bottom-0">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Meeting ID: <strong className="font-mono text-slate-900">{meetingId}</strong></span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            {/* Google Sheets Sync */}
            {meeting && (
              <SyncButton
                meetingId={meetingId}
                initialSyncInfo={{
                  syncStatus: meeting.sync_status ?? 'PENDING',
                  lastSyncedAt: meeting.last_synced_at ?? null,
                  googleSheetId: meeting.google_sheet_id ?? null,
                  googleSheetName: meeting.google_sheet_name ?? null,
                  syncError: meeting.sync_error ?? null,
                  attendanceCount: attendances.length,
                }}
              />
            )}

            <button 
              onClick={onClose} 
              className="px-6 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-slate-700 hover:to-slate-800 font-semibold text-sm transition-all duration-300 transform hover:scale-105 whitespace-nowrap"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
