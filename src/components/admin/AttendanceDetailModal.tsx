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
import ManualAttendanceModal from './ManualAttendanceModal';

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
  const [showManualModal, setShowManualModal] = useState(false);

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
      HADIR: 'bg-orange-100 text-orange-700 border-orange-300',
      TERLAMBAT: 'bg-orange-50 text-orange-700 border-orange-200',
      IZIN: 'bg-orange-50 text-orange-700 border-orange-200',
      TIDAK_HADIR: 'bg-red-50 text-red-700 border-red-200'
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
          <div className="inline-block w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
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
          <div className="bg-orange-600 p-6 sticky top-0 z-20">
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
                    <div className="flex items-center gap-1.5 text-orange-100">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(meeting.starts_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}</span>
                    </div>
                  )}
                  {meeting?.starts_at && (
                    <div className="flex items-center gap-1.5 text-orange-100">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(meeting.starts_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    meeting?.is_active 
                       ? 'bg-orange-500/20 text-orange-100 border border-orange-300/30' 
                       : 'bg-red-500/20 text-red-100 border border-red-300/30'
                  }`}>
                     <div className={`w-2 h-2 rounded-full ${meeting?.is_active ? 'bg-orange-300' : 'bg-red-300'}`} />
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
              <div className="bg-orange-600 rounded-2xl p-4 shadow-sm border border-orange-500 group hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-orange-100 text-xs font-semibold uppercase tracking-wide">Total</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.total}</p>
                <p className="text-orange-200 text-xs mt-1">students</p>
            </div>

              <div className="bg-orange-600 rounded-2xl p-4 shadow-sm border border-orange-500 group hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <span className="text-orange-100 text-xs font-semibold uppercase tracking-wide">Present</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.hadir}</p>
                <p className="text-orange-200 text-xs mt-1">{attendanceRate}% rate</p>
            </div>

              <div className="bg-orange-600 rounded-2xl p-4 shadow-sm border border-orange-500 group hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="text-orange-100 text-xs font-semibold uppercase tracking-wide">Late</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.terlambat}</p>
                <p className="text-orange-200 text-xs mt-1">late entries</p>
            </div>

              <div className="bg-orange-600 rounded-2xl p-4 shadow-sm border border-orange-500 group hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-orange-100 text-xs font-semibold uppercase tracking-wide">Excused</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.izin}</p>
                <p className="text-orange-200 text-xs mt-1">excused</p>
            </div>

              <div className="bg-orange-600 rounded-2xl p-4 shadow-sm border border-orange-500 group hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-red-100 text-xs font-semibold uppercase tracking-wide">Absent</span>
              </div>
              <p className="text-white text-3xl font-bold">{stats.tidakHadir}</p>
                <p className="text-red-200 text-xs mt-1">absent</p>
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
                 className="w-full pl-10 pr-4 py-3 bg-white border-2 border-orange-100 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors outline-none hover:border-orange-300"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                 className="w-full md:w-auto pl-10 pr-8 py-3 bg-white border-2 border-orange-100 rounded-xl text-sm font-medium text-slate-700 hover:bg-orange-50 hover:border-orange-300 transition-colors focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none appearance-none cursor-pointer"
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
                 className="flex-1 md:flex-initial px-4 py-3 bg-white border-2 border-orange-100 rounded-xl text-sm font-medium text-slate-700 hover:bg-orange-50 hover:border-orange-300 transition-colors focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none cursor-pointer"
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
              <button type="button" onClick={() => setShowManualModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50">
                <UserCheck className="h-4 w-4" /> Add Attendance
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold text-sm transition-colors whitespace-nowrap"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>

          {/* Filter Summary */}
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <TrendingUp className="w-4 h-4" />
            <span>Showing <strong className="text-orange-600 font-bold">{filteredAttendances.length}</strong> of <strong>{stats.total}</strong> records</span>
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
                      className="hover:bg-orange-50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500 group-hover:text-orange-600">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {attendance.student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-orange-700">
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
                              <FileText className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
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
            <CheckCircle2 className="w-4 h-4 text-orange-600" />
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

      {showManualModal && (
        <ManualAttendanceModal
          meetingId={meetingId}
          onClose={() => setShowManualModal(false)}
          onSuccess={() => { setShowManualModal(false); setLoading(true); fetchData(); }}
        />
      )}
    </div>
  );
}
