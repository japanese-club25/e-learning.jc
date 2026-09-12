'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Users, Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

interface PermissionFormModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PermissionFormModal({ onClose, onSuccess }: PermissionFormModalProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    class: '',
    meeting_id: '',
    reason: ''
  });

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/admin/attendance');
      const data = await res.json();
      if (data.success) {
        // Filter only active meetings or recent meetings (last 7 days)
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const recentMeetings = (data.meetings || []).filter((m: Meeting) => {
          if (!m.starts_at) return true; // Include meetings without start date
          const meetingDate = new Date(m.starts_at);
          return meetingDate >= sevenDaysAgo;
        });
        
        setMeetings(recentMeetings);
      }
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
      setError('Gagal memuat daftar meeting');
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi
    if (!formData.name.trim() || !formData.class.trim() || !formData.meeting_id) {
      setError('Nama, Kelas, dan Meeting harus diisi');
      return;
    }

    if (!formData.reason.trim()) {
      setError('Alasan izin harus diisi');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/attendance/permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          class: formData.class.trim(),
          meeting_id: formData.meeting_id,
          reason: formData.reason.trim()
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        // Reset form
        setFormData({
          name: '',
          class: '',
          meeting_id: '',
          reason: ''
        });
        
        // Close modal after 2 seconds
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Gagal mencatat izin');
      }
    } catch (err) {
      console.error('Permission submission error:', err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-md w-full p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-full mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Izin Berhasil Dicatat!</h3>
          <p className="text-slate-600">Data izin siswa telah tersimpan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-2 border-slate-200 animate-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-orange-600 p-6 sticky top-0 z-20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Form Izin Siswa</h2>
                <p className="text-blue-100 text-sm mt-1">Catat izin ketidakhadiran siswa</p>
              </div>
            </div>
            <button 
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/20 rounded-lg" 
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">Gagal Mencatat Izin</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900">Information</p>
              <p className="text-sm text-orange-700 mt-1">
                Form ini digunakan untuk mencatat izin siswa yang tidak dapat hadir. Pastikan semua data diisi dengan benar.
              </p>
            </div>
          </div>

          {/* Nama Field */}
          <div>
            <label htmlFor="name" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all outline-none text-slate-900 font-medium"
              placeholder="Masukkan nama lengkap siswa"
              disabled={submitting}
            />
          </div>

          {/* Kelas Field */}
          <div>
            <label htmlFor="class" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Kelas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="class"
              name="class"
              value={formData.class}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all outline-none text-slate-900 font-medium"
              placeholder="Contoh: 10A, XI RPL 1"
              disabled={submitting}
            />
          </div>

          {/* Meeting Selection */}
          <div>
            <label htmlFor="meeting_id" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Pilih Meeting <span className="text-red-500">*</span>
            </label>
            {loadingMeetings ? (
              <div className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Memuat meeting...</span>
              </div>
            ) : (
              <select
                id="meeting_id"
                name="meeting_id"
                value={formData.meeting_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all outline-none text-slate-900 font-medium cursor-pointer"
                disabled={submitting}
              >
                <option value="">-- Pilih Meeting --</option>
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title}
                    {meeting.starts_at && ` - ${new Date(meeting.starts_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}`}
                    {meeting.is_active && ' (Aktif)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Alasan Izin */}
          <div>
            <label htmlFor="reason" className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Alasan Izin <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all outline-none text-slate-900 font-medium resize-none"
              placeholder="Contoh: Sakit, Keperluan keluarga, dll."
              disabled={submitting}
            />
            <p className="mt-2 text-xs text-slate-500">
              Minimal 10 karakter, maksimal 500 karakter
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all border-2 border-slate-200"
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || loadingMeetings}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/30"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Simpan Izin
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
