'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVisitorData } from '@fingerprintjs/fingerprintjs-pro-react';

interface AttendanceFormProps {
  meetingId: string;
}

export default function AttendanceForm({ meetingId }: AttendanceFormProps) {
  const router = useRouter();
  const { isLoading: isFingerprintLoading, error: fingerprintError, data: fingerprintData, getData } = useVisitorData(
    { extendedResult: true },
    { immediate: true }
  );
  
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    reason: ''
  });

  const [deviceId, setDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isPermissionMode, setIsPermissionMode] = useState(false);

  // ===== GPS LOCATION =====
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationError('Perangkat tidak mendukung GPS. Absensi tidak dapat dilakukan dari perangkat ini.');
      return;
    }

    setLocationStatus('loading');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationStatus('success');
      },
      (err) => {
        setLocationStatus('error');
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Permission lokasi ditolak. Aktifkan akses lokasi pada browser.'
            : 'Lokasi tidak dapat diperoleh. Pastikan GPS aktif dan izinkan akses lokasi.'
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // ===== DEVICE ID & SUBMISSION CHECK =====
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try to use FingerprintJS first
      if (fingerprintData?.visitorId) {
        const visitorId = fingerprintData.visitorId;
        setDeviceId(visitorId);
        checkSubmissionStatus(visitorId);
      }
      // Fallback: Generate UUID if fingerprint fails (for mobile devices)
      else if (fingerprintError || (!isFingerprintLoading && !fingerprintData)) {
        console.log('[Attendance] FingerprintJS failed, using fallback UUID');
        let fallbackId = localStorage.getItem('attendance_fallback_device_id');
        
        if (!fallbackId) {
          fallbackId = crypto.randomUUID();
          localStorage.setItem('attendance_fallback_device_id', fallbackId);
        }
        
        setDeviceId(fallbackId);
        checkSubmissionStatus(fallbackId);
      }
    }
    
    // Set timeout fallback after 5 seconds if still loading
    const fallbackTimeout = setTimeout(() => {
      if (!deviceId && isFingerprintLoading) {
        console.log('[Attendance] FingerprintJS timeout, using fallback UUID');
        let fallbackId = localStorage.getItem('attendance_fallback_device_id');
        
        if (!fallbackId) {
          fallbackId = crypto.randomUUID();
          localStorage.setItem('attendance_fallback_device_id', fallbackId);
        }
        
        setDeviceId(fallbackId);
        checkSubmissionStatus(fallbackId);
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(fallbackTimeout);
  }, [meetingId, fingerprintData, fingerprintError, isFingerprintLoading, deviceId]);

  // Helper function to check submission status
  const checkSubmissionStatus = (visitorId: string) => {
    const submissionKey = `attendance_submitted_${meetingId}_${visitorId}`;
    const submissionData = localStorage.getItem(submissionKey);
    
    if (submissionData) {
      try {
        const data = JSON.parse(submissionData);
        const submittedDate = new Date(data.timestamp);
        const today = new Date();
        
        // Cek apakah submission masih hari ini
        const isSameDay = 
          submittedDate.getDate() === today.getDate() &&
          submittedDate.getMonth() === today.getMonth() &&
          submittedDate.getFullYear() === today.getFullYear();
        
        if (isSameDay) {
          setAlreadySubmitted(true);
          setError(`Anda sudah mengisi absensi hari ini sebagai ${data.name} (${data.class})`);
        } else {
          // Hapus data lama jika beda hari
          localStorage.removeItem(submissionKey);
        }
      } catch (e) {
        // Jika data corrupt, hapus
        localStorage.removeItem(submissionKey);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ===== VALIDASI FORM: Cek apakah semua field sudah diisi =====
    if (!formData.name.trim() || !formData.class.trim()) {
      setError('⚠️ Mohon lengkapi semua field! Nama dan Kelas harus diisi.');
      return;
    }

    // Validasi khusus untuk mode izin
    if (isPermissionMode) {
      if (!formData.reason.trim()) {
        setError('⚠️ Alasan izin harus diisi!');
        return;
      }
      if (formData.reason.trim().length < 10) {
        setError('⚠️ Alasan izin minimal 10 karakter!');
        return;
      }
    }
    
    // Validasi device ID sudah tersedia (hanya untuk mode hadir)
    if (!isPermissionMode && !deviceId) {
      setError('Device ID belum tersedia. Silakan tunggu sebentar atau refresh halaman...');
      return;
    }

    // ===== VALIDASI GPS (hanya untuk mode hadir) =====
    if (!isPermissionMode && !coords) {
      setError(
        locationError || 'Lokasi tidak dapat diperoleh. Pastikan GPS aktif dan izinkan akses lokasi.'
      );
      return;
    }

    // ===== VALIDASI CLIENT-SIDE: Cek localStorage (hanya untuk mode hadir) =====
    if (!isPermissionMode && alreadySubmitted) {
      setError('Anda sudah mengisi absensi hari ini. Tidak dapat submit ulang.');
      return;
    }

    // Cek ulang localStorage sebelum submit (double check) - hanya untuk mode hadir
    if (!isPermissionMode) {
      const submissionKey = `attendance_submitted_${meetingId}_${deviceId}`;
      const existingSubmission = localStorage.getItem(submissionKey);
      
      if (existingSubmission) {
        try {
          const data = JSON.parse(existingSubmission);
          setError(`Anda sudah mengisi absensi hari ini sebagai ${data.name} (${data.class})`);
          setAlreadySubmitted(true);
          return;
        } catch (e) {
          // Data corrupt, lanjutkan
        }
      }
    }
    
    setLoading(true);
    setError(null);

    try {
      // Pilih endpoint berdasarkan mode
      const endpoint = isPermissionMode 
        ? '/api/attendance/submit-permission' 
        : '/api/attendance/submit';

      const requestBody = isPermissionMode
        ? {
            meeting_id: meetingId,
            name: formData.name.trim(),
            class: formData.class.trim(),
            reason: formData.reason.trim(),
          }
        : {
            meeting_id: meetingId,
            name: formData.name.trim(),
            class: formData.class.trim(),
            deviceId: deviceId,
            latitude: coords!.latitude,
            longitude: coords!.longitude,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        // ===== SIMPAN KE LOCALSTORAGE: Mencegah submit ulang (hanya untuk mode hadir) =====
        if (!isPermissionMode) {
          const submissionKey = `attendance_submitted_${meetingId}_${deviceId}`;
          const submissionData = {
            name: formData.name.trim(),
            class: formData.class.trim(),
            timestamp: new Date().toISOString(),
            attendanceId: data.attendance.id
          };
          
          localStorage.setItem(submissionKey, JSON.stringify(submissionData));
        }
        
        setSuccess(true);
        setAlreadySubmitted(true);
        
        // Reset form
        setFormData({ name: '', class: '', reason: '' });
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/attendance/success');
        }, 2000);
      } else {
        // Tampilkan error yang spesifik dari server
        if (data.type === 'OUT_OF_RADIUS') {
          setError(
            `Anda berada ${Math.round(data.distance)} meter dari lokasi absensi. Batas maksimal adalah ${data.radius} meter.`
          );
        } else {
          setError(data.message || 'Gagal mencatat ' + (isPermissionMode ? 'izin' : 'absensi'));
        }
        
        // Jika error adalah duplicate, tandai sudah submit (hanya untuk mode hadir)
        if (!isPermissionMode && (data.type === 'USER_DUPLICATE' || data.type === 'DEVICE_DUPLICATE' || data.type === 'COOKIE_DUPLICATE' || data.type === 'FINGERPRINT_DUPLICATE')) {
          setAlreadySubmitted(true);
          
          // Simpan info ke localStorage
          const submissionKey = `attendance_submitted_${meetingId}_${deviceId}`;
          const errorSubmissionData = {
            name: formData.name.trim(),
            class: formData.class.trim(),
            timestamp: new Date().toISOString(),
            error: true,
            duplicateType: data.type
          };
          localStorage.setItem(submissionKey, JSON.stringify(errorSubmissionData));
        }
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      console.error('Attendance submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          {isPermissionMode ? 'Izin Berhasil Dicatat!' : 'Absensi Berhasil!'}
        </h3>
        <p className="text-gray-600">
          {isPermissionMode 
            ? 'Terima kasih, izin Anda telah tercatat' 
            : 'Terima kasih sudah mengisi absensi'}
        </p>
        <div className="mt-4 text-sm text-gray-500">
          Mengalihkan...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm font-semibold mb-1">❌ Gagal Mengisi Absensi</p>
          <p className="text-sm">{error}</p>
          {alreadySubmitted && (
            <p className="text-xs mt-2 text-red-600 font-semibold">
              ⚠️ Sistem telah mendeteksi bahwa Anda sudah mengisi absensi hari ini.
            </p>
          )}
        </div>
      )}

      {/* Warning jika sudah submit */}
      {alreadySubmitted && !error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="text-sm font-semibold mb-1">⚠️ Sudah Mengisi Absensi</p>
          <p className="text-sm">Anda sudah mengisi absensi untuk meeting ini hari ini.</p>
        </div>
      )}

      {/* Device ID Info (for debugging, bisa dihapus di production) */}
      {deviceId && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-xs">
          <p className="font-mono">
            🔒 Device ID: {deviceId.substring(0, 8)}...{deviceId.substring(deviceId.length - 4)}
            {fingerprintError && <span className="ml-2 text-amber-600">(Fallback Mode)</span>}
          </p>
          <p className="mt-1 text-blue-600">Status: {alreadySubmitted ? '✅ Sudah Absen' : '⏳ Belum Absen'}</p>
          {fingerprintData?.confidence && (
            <p className="mt-1 text-blue-600">Confidence Score: {(fingerprintData.confidence.score * 100).toFixed(1)}%</p>
          )}
          {fingerprintError && (
            <p className="mt-1 text-amber-600 text-xs">
              ℹ️ Menggunakan fallback UUID untuk perangkat ini
            </p>
          )}
        </div>
      )}

      {/* Loading fingerprint */}
      {!isPermissionMode && isFingerprintLoading && !deviceId && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-center">
          <p className="text-sm">🔍 Mendeteksi device fingerprint...</p>
          <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar...</p>
        </div>
      )}

      {/* ===== GPS STATUS (mode hadir) ===== */}
      {!isPermissionMode && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-3 rounded-lg border text-sm ${
            locationStatus === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : locationStatus === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}
        >
          {locationStatus === 'loading' && <p>📍 Mengambil lokasi...</p>}
          {locationStatus === 'success' && <p>📍 Lokasi berhasil diperoleh.</p>}
          {locationStatus === 'error' && (
            <div>
              <p>📍 {locationError}</p>
              <button
                type="button"
                onClick={requestLocation}
                className="mt-2 px-4 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                Coba Ambil Lokasi Lagi
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toggle Mode Button */}
      <div className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => {
            setIsPermissionMode(false);
            setError(null);
            setFormData({ ...formData, reason: '' });
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            !isPermissionMode
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">✓</span>
            <span>Hadir</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsPermissionMode(true);
            setError(null);
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
            isPermissionMode
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">✉</span>
            <span>Izin</span>
          </span>
        </button>
      </div>

      {/* Mode Info */}
      {isPermissionMode && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 mb-1">Mode Izin</p>
              <p className="text-sm text-amber-700">
                Anda sedang mengisi form izin. Pastikan untuk memberikan alasan yang jelas mengapa tidak dapat hadir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nama Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Nama Lengkap <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Masukkan nama lengkap"
          disabled={loading}
        />
      </div>

      {/* Kelas Field */}
      <div>
        <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-2">
          Kelas <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="class"
          name="class"
          value={formData.class}
          onChange={handleChange}
          required
          className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="Contoh: 10A, XI RPL 1"
          disabled={loading}
        />
      </div>

      {/* Alasan Izin Field - hanya muncul di mode izin */}
      {isPermissionMode && (
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Alasan Izin <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required={isPermissionMode}
            rows={4}
            className="text-black w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
            placeholder="Contoh: Sakit, keperluan keluarga, dll. (Minimal 10 karakter)"
            disabled={loading}
          />
          <p className="mt-2 text-xs text-gray-500">
            {formData.reason.length}/500 karakter 
            {formData.reason.length > 0 && formData.reason.length < 10 && (
              <span className="text-amber-600 ml-2">• Minimal 10 karakter</span>
            )}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || (!isPermissionMode && alreadySubmitted) || (!isPermissionMode && isFingerprintLoading) || (!isPermissionMode && !coords)}
        className={`w-full text-white py-3 px-6 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
          isPermissionMode
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:ring-amber-500 shadow-lg shadow-amber-500/30'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/30'
        }`}
      >
        {!isPermissionMode && isFingerprintLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mendeteksi Device...
          </span>
        ) : alreadySubmitted && !isPermissionMode ? (
          '✓ Sudah Mengisi Absensi Hari Ini'
        ) : !isPermissionMode && locationStatus === 'loading' ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mengambil Lokasi...
          </span>
        ) : !isPermissionMode && !coords ? (
          '📍 Lokasi Diperlukan'
        ) : loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mengirim...
          </span>
        ) : isPermissionMode ? (
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">✉</span>
            <span>Kirim Form Izin</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">🚀</span>
            <span>Kirim Absensi</span>
          </span>
        )}
      </button>

      {/* Helper text untuk field yang wajib diisi */}
      {!alreadySubmitted && (!formData.name.trim() || !formData.class.trim()) && (
        <div className="text-center text-sm text-gray-600">
          <p className="flex items-center justify-center gap-1">
            <span className="text-amber-500">⚠️</span>
            Pastikan semua field sudah diisi sebelum submit
          </p>
        </div>
      )}


    </form>
  );
}
