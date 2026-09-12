'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVisitorData } from '@fingerprintjs/fingerprintjs-pro-react';
import { useAuth } from '@/context/AuthContext';

interface AttendanceFormProps {
  meetingId: string;
}

export default function AttendanceForm({ meetingId }: AttendanceFormProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: isFingerprintLoading, error: fingerprintError, data: fingerprintData, getData } = useVisitorData(
    { extendedResult: true },
    { immediate: true }
  );

  const [deviceId, setDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

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
          setError(`Anda sudah mengisi absensi hari ini`);
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
    
    // Validasi device ID sudah tersedia
    if (!deviceId) {
      setError('Device ID belum tersedia. Silakan tunggu sebentar atau refresh halaman...');
      return;
    }

    // ===== VALIDASI GPS =====
    if (!coords) {
      setError(
        locationError || 'Lokasi tidak dapat diperoleh. Pastikan GPS aktif dan izinkan akses lokasi.'
      );
      return;
    }

    // ===== VALIDASI CLIENT-SIDE: Cek localStorage =====
    if (alreadySubmitted) {
      setError('Anda sudah mengisi absensi hari ini. Tidak dapat submit ulang.');
      return;
    }

    // Cek ulang localStorage sebelum submit (double check)
    const submissionKey = `attendance_submitted_${meetingId}_${deviceId}`;
    const existingSubmission = localStorage.getItem(submissionKey);
    
    if (existingSubmission) {
      try {
        setError(`Anda sudah mengisi absensi hari ini`);
        setAlreadySubmitted(true);
        return;
      } catch (e) {
        // Data corrupt, lanjutkan
      }
    }
    
    setLoading(true);
    setError(null);

    try {
      const endpoint = '/api/attendance/submit';

      const requestBody = {
          meeting_id: meetingId,
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
        // ===== SIMPAN KE LOCALSTORAGE: Mencegah submit ulang =====
        const submissionData = {
          timestamp: new Date().toISOString(),
          attendanceId: data.attendance.id
        };
        
        localStorage.setItem(submissionKey, JSON.stringify(submissionData));
        
        setSuccess(true);
        setAlreadySubmitted(true);
        
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
          setError(data.message || 'Gagal mencatat absensi');
        }
        
        // Jika error adalah duplicate, tandai sudah submit
        if (data.type === 'USER_DUPLICATE' || data.type === 'DEVICE_DUPLICATE' || data.type === 'COOKIE_DUPLICATE' || data.type === 'FINGERPRINT_DUPLICATE') {
          setAlreadySubmitted(true);
          
          // Simpan info ke localStorage
          const errorSubmissionData = {
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

  if (authLoading) return <div className="text-center py-4 text-gray-500">Loading user info...</div>;

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Absensi Berhasil!
        </h3>
        <p className="text-gray-600">
          Terima kasih sudah mengisi absensi
        </p>
        <div className="mt-4 text-sm text-gray-500">
          Mengalihkan...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between">
         <div>
            <p className="text-sm font-semibold">User Login</p>
            <p className="text-xs">{user?.email}</p>
         </div>
      </div>

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
        <div className="bg-slate-50 border border-slate-200 text-slate-500 px-4 py-2 rounded-lg text-xs">
          <p className="font-mono">
            🔒 Device ID: {deviceId.substring(0, 8)}...{deviceId.substring(deviceId.length - 4)}
            {fingerprintError && <span className="ml-2 text-amber-600">(Fallback Mode)</span>}
          </p>
        </div>
      )}

      {/* Loading fingerprint */}
      {isFingerprintLoading && !deviceId && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded-lg text-center">
          <p className="text-sm">🔍 Mendeteksi device fingerprint...</p>
          <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar...</p>
        </div>
      )}

      {/* ===== GPS STATUS ===== */}
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


      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || alreadySubmitted || isFingerprintLoading || !coords}
        className={`w-full text-white py-3 px-6 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-lg shadow-blue-500/30`}
      >
        {isFingerprintLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mendeteksi Device...
          </span>
        ) : alreadySubmitted ? (
          '✓ Sudah Mengisi Absensi Hari Ini'
        ) : locationStatus === 'loading' ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mengambil Lokasi...
          </span>
        ) : !coords ? (
          '📍 Lokasi Diperlukan'
        ) : loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mengirim...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">🚀</span>
            <span>Kirim Absensi</span>
          </span>
        )}
      </button>

    </form>
  );
}
