# Laporan Implementasi Fitur Geofencing GPS dan Sinkronisasi Google Sheets

**Sistem:** E-Learning / Attendance Management  
**Teknologi:** Next.js 15, TypeScript, Prisma, PostgreSQL, Google Apps Script, Google Sheets  
**Tanggal laporan:** 3 September 2026  
**Status:** Implementasi tersedia dan siap diverifikasi pada environment production

## 1. Ringkasan Eksekutif

Sistem absensi telah dilengkapi dua fitur pendukung operasional:

1. **GPS geofencing:** siswa hanya dapat melakukan absensi apabila jarak koordinat perangkat terhadap lokasi meeting yang tersimpan di PostgreSQL tidak melebihi radius yang ditetapkan. Aturan default adalah maksimal 150 meter.
2. **Sinkronisasi Google Sheets:** administrator dapat mengirim snapshot data satu meeting beserta daftar absensinya ke Google Sheets melalui Google Apps Script. PostgreSQL tetap menjadi sumber data utama.

Validasi geofence dilakukan sepenuhnya di server. Koordinat, radius, dan hasil jarak tidak dipercayakan kepada browser. Sinkronisasi dilakukan manual melalui tombol administrator, sehingga perubahan database tidak tertimpa otomatis oleh spreadsheet.

## 2. Ruang Lingkup Perubahan

Perubahan utama berada pada area berikut:

| Area | Implementasi |
|---|---|
| Database | Kolom lokasi meeting, radius, lokasi siswa, dan jarak absensi |
| Geofence | Fungsi Haversine dan validasi koordinat server-side |
| API absensi | Validasi request, status meeting, geofence, duplikasi, dan penyimpanan |
| UI siswa | Pengambilan lokasi browser, status GPS, retry, dan pesan radius |
| UI admin | Pemilih titik peta OpenStreetMap pada pembuatan meeting |
| Sinkronisasi | Endpoint manual, shared token, status proses, retry, dan snapshot Sheet |
| Google Apps Script | Receiver tervalidasi, batch write, formatting, dan status response |

## 3. Arsitektur dan Alur Data

### 3.1 Alur Geofence

```text
Browser siswa
  -> navigator.geolocation.getCurrentPosition()
  -> POST /api/attendance/submit { meeting_id, latitude, longitude, ... }
  -> server mengambil Meeting dari PostgreSQL
  -> server menghitung jarak Haversine
  -> server membandingkan distance <= meeting.radius
  -> accepted: Attendance tersimpan
  -> rejected: HTTP 403
```

Koordinat meeting tidak diambil dari client. Koordinat tersebut berasal dari record `Meeting` pada database. Client hanya mengirim koordinat perangkat pada saat absensi.

### 3.2 Alur Sinkronisasi

```text
Administrator
  -> klik Sync to Google Sheets
  -> POST /api/admin/meeting/{id}/sync
  -> server autentikasi cookie auth_token
  -> server mengunci status meeting menjadi SYNCING
  -> server membaca Meeting + Attendance + Student dari PostgreSQL
  -> server mengirim satu payload ke GAS Web App
  -> GAS memvalidasi token dan payload
  -> GAS membuat/membersihkan sheet Meeting-{id_awal}
  -> GAS menulis snapshot menggunakan satu setValues()
  -> server menyimpan status SYNCED atau FAILED
```

## 4. Detail Implementasi GPS Geofencing

### 4.1 Model Data

Model `Meeting` memiliki:

- `latitude Float?`: latitude lokasi absensi.
- `longitude Float?`: longitude lokasi absensi.
- `radius Int @default(150)`: radius geofence dalam meter.

Model `Attendance` memiliki:

- `latitude Float?`: latitude perangkat siswa saat absensi.
- `longitude Float?`: longitude perangkat siswa saat absensi.
- `distance Float?`: jarak mentah hasil perhitungan dalam meter.

Kolom nullable menjaga kompatibilitas dengan meeting lama yang belum memiliki lokasi.

### 4.2 Rumus Haversine

Fungsi `calculateDistance(lat1, lon1, lat2, lon2)` pada `src/utils/geofence.ts` menggunakan radius bumi `6371000` meter:

```text
a = sin²(dLat / 2)
    + cos(lat1) × cos(lat2) × sin²(dLon / 2)
c = 2 × atan2(sqrt(a), sqrt(1 - a))
distance = 6371000 × c
```

Hasil fungsi berupa jarak dalam meter. Tidak ada pembulatan sebelum validasi.

### 4.3 Aturan Validasi

Server menerapkan satu aturan:

```text
distance <= radius
```

Tidak digunakan:

- `accuracy` GPS sebagai tambahan radius.
- `radius + accuracy`.
- toleransi tambahan.
- pembulatan jarak sebelum perbandingan.

Dengan radius default 150 meter:

| Jarak | Hasil |
|---:|---|
| 100 m | Diterima |
| 149.99 m | Diterima |
| 150 m | Diterima |
| 150.01 m | Ditolak |
| 200 m | Ditolak |

### 4.4 Validasi Request dan Response

Validasi koordinat memastikan nilai berupa `number`, finite, dan berada pada rentang WGS84:

- latitude: -90 sampai 90.
- longitude: -180 sampai 180.

Response penting:

| Kondisi | HTTP | Tipe |
|---|---:|---|
| Koordinat wajib tidak dikirim | 400 | `LOCATION_REQUIRED` |
| Koordinat tidak valid | 400 | `INVALID_COORDINATES` |
| Di luar radius | 403 | `OUT_OF_RADIUS` |
| Absensi duplikat | 409 | tipe duplikasi existing |
| Berhasil | 201 | `success: true` |

Untuk penolakan di luar radius, API mengirim `distance` dan `radius`. Nilai yang ditampilkan boleh dibulatkan untuk keterbacaan response, tetapi keputusan server menggunakan nilai jarak asli.

### 4.5 Meeting Lama Tanpa Koordinat

Meeting existing dengan `latitude` atau `longitude` bernilai `null` tetap dapat digunakan. Geofence dilewati agar tidak memutus operasional lama. Saat membuat meeting baru, administrator dapat memilih titik lokasi melalui peta atau membiarkannya kosong.

### 4.6 UI Pemilihan Lokasi Admin

Komponen `LocationPicker` menyediakan:

- peta berbasis tile OpenStreetMap.
- klik atau tap untuk memilih titik.
- drag untuk menggeser peta.
- zoom melalui scroll dan tombol `+` / `-`.
- marker titik lokasi.
- preview lingkaran radius 150 meter.
- tombol `Gunakan Lokasi Saya`.
- input latitude dan longitude manual sebagai fallback aksesibilitas.
- tombol `Hapus Titik` untuk menonaktifkan geofence pada meeting baru.

Koordinat yang dipilih dikirim ke endpoint pembuatan meeting `/api/admin/attendance` dan disimpan ke PostgreSQL.

## 5. Detail Implementasi Sinkronisasi Google Sheets

### 5.1 Prinsip Data

PostgreSQL adalah **source of truth**. Google Sheets berfungsi sebagai export/snapshot untuk kebutuhan monitoring dan pelaporan. Kegagalan sinkronisasi tidak mengubah atau menghapus data absensi pada PostgreSQL.

### 5.2 Endpoint dan Otorisasi

Endpoint `POST /api/admin/meeting/{id}/sync`:

1. Memvalidasi `auth_token` melalui `TokenService`.
2. Memastikan `GAS_WEB_APP_URL` dan `GAS_SYNC_TOKEN` tersedia.
3. Menolak meeting yang tidak ditemukan.
4. Menolak klik simultan ketika status sudah `SYNCING`.
5. Mengirim payload dengan shared secret `GAS_SYNC_TOKEN`.
6. Menyimpan metadata hasil sinkronisasi ke model `Meeting`.

### 5.3 Status Sinkronisasi

Enum `SyncStatus` memiliki status:

- `PENDING`: belum pernah sinkronisasi.
- `SYNCING`: proses sedang berlangsung; request paralel ditolak.
- `SYNCED`: sinkronisasi terakhir berhasil.
- `FAILED`: proses terakhir gagal dan dapat dicoba kembali.

Metadata yang disimpan:

- `google_sheet_id`.
- `google_sheet_name`.
- `last_synced_at`.
- `sync_error`.

### 5.4 Format Sheet

Setiap meeting menggunakan sheet bernama `Meeting-{8 karakter awal ID}`. Sheet berisi:

1. Blok informasi meeting: ID, judul, waktu mulai, waktu selesai, waktu dibuat, dan waktu sinkronisasi terakhir.
2. Tabel absensi: nomor, student ID, nama, kelas, status, waktu absen, device, dan keterangan.
3. Formatting header, warna status, freeze header, auto-resize kolom, serta border tabel.

GAS menggunakan satu operasi `setValues()` untuk menulis snapshot. Sheet existing dibersihkan terlebih dahulu sehingga hasil sinkronisasi merepresentasikan kondisi PostgreSQL terbaru untuk meeting tersebut.

### 5.5 Penanganan Error

Service `sendSyncToGas` menangani:

- konfigurasi URL yang kosong.
- response non-JSON.
- error jaringan.
- timeout 90 detik.
- response logika gagal dari GAS meskipun HTTP GAS bernilai 200.

API mengembalikan status 502 untuk kegagalan dari GAS dan 500 untuk error internal lainnya. Status `FAILED` dan pesan error disimpan pada meeting untuk ditampilkan pada UI admin.

## 6. Konfigurasi Production


```env
GAS_WEB_APP_URL=https://script.google.com/macros/s/{deployment-id}/exec
GAS_SYNC_TOKEN={shared-secret-yang-kuat}
```

Nilai token harus sama dengan property `SYNC_TOKEN` pada Google Apps Script. Jangan commit token ke repository dan jangan menampilkannya di browser.

### 6.2 Deployment Google Apps Script

1. Buka Google Sheets target.
2. Pilih **Extensions > Apps Script**.
3. Set Script Property `SYNC_TOKEN` dengan secret yang sama.
4. Deploy sebagai **Web app**.
5. Jalankan sebagai pemilik script.
6. Atur akses sesuai kebijakan organisasi; endpoint tetap memvalidasi shared token.
7. Isi URL deployment ke `GAS_WEB_APP_URL` pada environment production.

### 6.3 Database Migration

Migration yang relevan:

- `20260902063615_add_gps_geofencing`: menambah kolom GPS dan radius.
- `20260901000000_add_google_sheets_sync_to_meeting`: menambah metadata sinkronisasi dan enum status.

Migration geofence menggunakan kolom nullable untuk data lama serta default radius 150 meter.

## 7. Verifikasi dan Pengujian

Verifikasi yang telah tersedia:

- `npx tsc --noEmit`: berhasil tanpa error TypeScript.
- `npm run build`: berhasil pada verifikasi terakhir.
- `npx jest src/utils/__tests__/geofence.test.ts`: 21 test berhasil.

Test geofence mencakup:

- koordinat identik menghasilkan 0 meter.
- akurasi Haversine pada rentang geofence.
- sifat simetris perhitungan.
- 100 m diterima.
- 149.99 m diterima.
- 150 m diterima.
- 150.01 m ditolak.
- 200 m ditolak.
- validasi batas koordinat dan nilai non-finite.

Checklist smoke test production:

1. Buat meeting tanpa titik; pastikan absensi meeting lama tetap berjalan.
2. Buat meeting dengan titik peta; pastikan badge geofence aktif muncul.
3. Absensi dari dalam radius; pastikan record menyimpan koordinat siswa dan distance.
4. Absensi dari luar radius; pastikan response 403 dan tidak ada record baru.
5. Kirim absensi kedua untuk siswa dan meeting yang sama; pastikan response 409.
6. Klik sinkronisasi; pastikan status berubah `SYNCING` lalu `SYNCED`.
7. Periksa sheet `Meeting-{id_awal}` dan jumlah baris.
8. Uji token salah atau URL GAS tidak tersedia; pastikan status `FAILED` tampil dan data PostgreSQL tetap utuh.

## 8. Catatan Operasional dan Batasan

- GPS browser membutuhkan izin lokasi dan biasanya secure context (HTTPS) pada production.
- Geofence meningkatkan kontrol lokasi, tetapi tidak menghilangkan risiko spoofing GPS pada perangkat yang telah dimodifikasi.
- Tile OpenStreetMap membutuhkan koneksi jaringan dan harus digunakan sesuai kebijakan penggunaan tile provider.
- Sinkronisasi Google Sheets bersifat manual, bukan real-time otomatis.
- Payload sinkronisasi saat ini membawa data identitas, status, waktu, device, dan keterangan absensi. Data latitude, longitude, serta distance belum termasuk dalam kolom Sheet karena kontrak payload GAS saat ini belum memperluas kolom tabel tersebut.
- Jika audit lokasi siswa juga diperlukan pada spreadsheet, kontrak TypeScript, endpoint sync, dan kolom GAS perlu diperluas secara terkoordinasi.

## 9. Kesimpulan

Fitur geofence telah menerapkan validasi server-side berbasis Haversine dengan batas tegas `distance <= radius`, default radius 150 meter, tanpa toleransi GPS atau accuracy tambahan. Meeting lama tanpa koordinat tetap kompatibel melalui bypass geofence.

Fitur sinkronisasi menyediakan ekspor snapshot per meeting ke Google Sheets dengan autentikasi token, pencegahan sinkronisasi paralel, status proses, retry, batch write, dan pencatatan error. PostgreSQL tetap menjadi sumber kebenaran sehingga integrasi eksternal tidak mengganggu integritas data absensi.
