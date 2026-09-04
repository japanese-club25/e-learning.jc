from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/laporan-geofence-dan-sinkronisasi-google-sheets.pdf"

NAVY = colors.HexColor("#16324F")
BLUE = colors.HexColor("#2563EB")
LIGHT_BLUE = colors.HexColor("#EAF2FF")
SLATE = colors.HexColor("#475569")
LIGHT = colors.HexColor("#F8FAFC")
GREEN = colors.HexColor("#166534")
RED = colors.HexColor("#991B1B")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=31, alignment=TA_CENTER, textColor=NAVY, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=18, alignment=TA_CENTER, textColor=SLATE))
styles.add(ParagraphStyle(name="H1Custom", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=21, textColor=NAVY, spaceBefore=8, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle(name="H2Custom", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=BLUE, spaceBefore=8, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="BodyCustom", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=14, textColor=colors.HexColor("#1F2937"), spaceAfter=5))
styles.add(ParagraphStyle(name="SmallCustom", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=SLATE))
styles.add(ParagraphStyle(name="CodeCustom", parent=styles["BodyText"], fontName="Courier", fontSize=8, leading=11, textColor=colors.HexColor("#0F172A"), backColor=LIGHT, borderPadding=7, spaceBefore=3, spaceAfter=7))
styles.add(ParagraphStyle(name="BulletCustom", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=14, leftIndent=13, firstLineIndent=-8, textColor=colors.HexColor("#1F2937"), spaceAfter=3))

def P(text, style="BodyCustom"):
    return Paragraph(text, styles[style])

def bullet(text):
    return P("&#8226; " + text, "BulletCustom")

def table(data, widths, header=True):
    converted = []
    for r, row in enumerate(data):
        converted.append([P(str(x), "SmallCustom" if r else "SmallCustom") for x in row])
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands += [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    for r in range(1 if header else 0, len(data)):
        if r % 2:
            commands.append(("BACKGROUND", (0, r), (-1, r), LIGHT))
    t.setStyle(TableStyle(commands))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(SLATE)
    canvas.drawString(18 * mm, 9 * mm, "Laporan Fitur Attendance | E-Learning")
    canvas.drawRightString(192 * mm, 9 * mm, f"Halaman {doc.page}")
    canvas.restoreState()

story = []
story += [Spacer(1, 35 * mm), P("LAPORAN IMPLEMENTASI", "SmallCustom"), Spacer(1, 5 * mm), P("Fitur Geofencing GPS dan<br/>Sinkronisasi Google Sheets", "CoverTitle"), P("Sistem E-Learning / Attendance Management", "CoverSub"), Spacer(1, 20 * mm), HRFlowable(width="70%", thickness=1.2, color=BLUE, hAlign="CENTER"), Spacer(1, 12 * mm), P("Teknologi: Next.js 15 | TypeScript | Prisma | PostgreSQL | Google Apps Script", "CoverSub"), Spacer(1, 8 * mm), P("Tanggal laporan: 3 September 2026<br/>Status: Implementasi tersedia dan siap diverifikasi pada environment production", "CoverSub"), PageBreak()]

story += [P("Daftar Isi", "H1Custom")]
for item in ["1. Ringkasan Eksekutif", "2. Ruang Lingkup Perubahan", "3. Arsitektur dan Alur Data", "4. Detail Implementasi GPS Geofencing", "5. Detail Implementasi Sinkronisasi Google Sheets", "6. Konfigurasi Production", "7. Verifikasi dan Pengujian", "8. Catatan Operasional dan Batasan", "9. Kesimpulan"]:
    story.append(bullet(item))
story.append(PageBreak())

def section(title):
    story.append(P(title, "H1Custom"))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#BFDBFE"), spaceAfter=7))

section("1. Ringkasan Eksekutif")
story += [P("Sistem absensi telah dilengkapi dua fitur pendukung operasional: <b>GPS geofencing</b> dan <b>sinkronisasi Google Sheets</b>. Geofencing membatasi absensi berdasarkan jarak perangkat siswa terhadap lokasi meeting, sedangkan sinkronisasi mengirim snapshot data satu meeting ke Google Sheets melalui Google Apps Script."), P("Validasi geofence dilakukan sepenuhnya di server. PostgreSQL tetap menjadi sumber data utama; Google Sheets berfungsi sebagai export/snapshot. Sinkronisasi dilakukan manual oleh administrator dan memiliki status proses, pencegahan request paralel, serta penanganan error.")]

section("2. Ruang Lingkup Perubahan")
story.append(table([["Area", "Implementasi"], ["Database", "Lokasi meeting, radius, lokasi siswa, dan jarak absensi"], ["Geofence", "Fungsi Haversine dan validasi koordinat server-side"], ["API absensi", "Validasi request, status meeting, geofence, duplikasi, dan penyimpanan"], ["UI siswa", "Pengambilan GPS, status lokasi, retry, dan pesan radius"], ["UI admin", "Pemilih titik peta OpenStreetMap pada pembuatan meeting"], ["Sinkronisasi", "Endpoint manual, shared token, status proses, dan retry"], ["Google Apps Script", "Receiver tervalidasi, batch write, formatting, dan response"]], [38*mm, 132*mm]))

section("3. Arsitektur dan Alur Data")
story += [P("<b>Alur geofence</b>", "H2Custom"), P("Browser siswa → navigator.geolocation.getCurrentPosition() → POST /api/attendance/submit → server mengambil Meeting dari PostgreSQL → Haversine → distance &lt;= meeting.radius → Attendance tersimpan atau HTTP 403.", "CodeCustom"), P("Koordinat meeting tidak diambil dari client. Koordinat tersebut berasal dari record Meeting pada database; client hanya mengirim koordinat perangkat pada saat absensi."), P("<b>Alur sinkronisasi</b>", "H2Custom"), P("Administrator → POST /api/admin/meeting/{id}/sync → autentikasi cookie → lock SYNCING → baca PostgreSQL → kirim payload GAS → GAS validasi token → batch write Sheet → status SYNCED atau FAILED.", "CodeCustom")]

section("4. Detail Implementasi GPS Geofencing")
story += [P("<b>Model data</b>", "H2Custom"), P("Meeting memiliki latitude Float?, longitude Float?, dan radius Int @default(150). Attendance memiliki latitude Float?, longitude Float?, dan distance Float?. Kolom nullable menjaga kompatibilitas dengan meeting lama tanpa lokasi."), P("<b>Rumus Haversine</b>", "H2Custom"), P("Fungsi calculateDistance(lat1, lon1, lat2, lon2) pada src/utils/geofence.ts menggunakan radius bumi 6371000 meter. Hasilnya berupa jarak dalam meter tanpa pembulatan sebelum validasi.", "CodeCustom"), P("<b>Aturan validasi</b>", "H2Custom"), P("Satu-satunya aturan: distance &lt;= radius. Tidak digunakan accuracy GPS, radius + accuracy, toleransi tambahan, atau pembulatan sebelum perbandingan."), table([["Jarak", "Hasil"], ["100 m", "Diterima"], ["149.99 m", "Diterima"], ["150 m", "Diterima"], ["150.01 m", "Ditolak"], ["200 m", "Ditolak"]], [45*mm, 125*mm]), P("<b>Validasi dan UI</b>", "H2Custom"), P("Server memvalidasi tipe number, finite, latitude -90..90, dan longitude -180..180. API mengembalikan 400 untuk request/koordinat invalid, 403 untuk OUT_OF_RADIUS, 409 untuk duplikasi, dan 201 saat berhasil. UI admin menyediakan peta OpenStreetMap, klik/tap titik, drag, zoom, preview lingkaran 150 meter, GPS admin, input manual, dan Hapus Titik."), P("Meeting lama tanpa koordinat tetap dapat digunakan; geofence dilewati. Meeting baru dapat dibuat tanpa titik atau dengan titik pilihan admin.")]

section("5. Detail Implementasi Sinkronisasi Google Sheets")
story += [P("<b>Prinsip data</b>", "H2Custom"), P("PostgreSQL adalah source of truth. Google Sheets adalah export/snapshot. Kegagalan sinkronisasi tidak mengubah atau menghapus data absensi pada PostgreSQL."), P("<b>Endpoint dan otorisasi</b>", "H2Custom"), P("POST /api/admin/meeting/{id}/sync memvalidasi auth_token, konfigurasi GAS, keberadaan meeting, dan status SYNCING. Shared secret GAS_SYNC_TOKEN dikirim server-side dan tidak dipercayakan kepada browser."), P("<b>Status dan metadata</b>", "H2Custom"), table([["Status", "Makna"], ["PENDING", "Belum pernah sinkronisasi"], ["SYNCING", "Sedang berlangsung; request paralel ditolak"], ["SYNCED", "Sinkronisasi terakhir berhasil"], ["FAILED", "Gagal; dapat dicoba kembali"]], [38*mm, 132*mm]), P("Metadata yang disimpan: google_sheet_id, google_sheet_name, last_synced_at, dan sync_error."), P("<b>Format Sheet</b>", "H2Custom"), P("Sheet bernama Meeting-{8 karakter awal ID}. Isinya blok informasi meeting dan tabel absensi berisi nomor, student ID, nama, kelas, status, waktu absen, device, dan keterangan. GAS menggunakan satu setValues() untuk snapshot, lalu menerapkan header, warna status, freeze header, auto-resize, dan border."), P("<b>Penanganan error</b>", "H2Custom"), P("Service menangani URL kosong, response non-JSON, error jaringan, timeout 90 detik, dan error logika GAS walaupun HTTP GAS 200. API menggunakan status 502 untuk kegagalan GAS dan menyimpan status FAILED serta pesan error pada Meeting.")]

section("6. Konfigurasi Production")
story += [P("Environment variable Next.js:", "H2Custom"), P("GAS_WEB_APP_URL=https://script.google.com/macros/s/{deployment-id}/exec<br/>GAS_SYNC_TOKEN={shared-secret-yang-kuat}", "CodeCustom"), P("Token harus sama dengan Script Property SYNC_TOKEN pada Google Apps Script. Jangan commit token ke repository atau menampilkannya di browser."), P("Deployment GAS: buat script dari Google Sheets, set Script Property, deploy sebagai Web app, jalankan sebagai pemilik script, atur akses sesuai kebijakan, lalu isi URL deployment pada environment production."), P("Migration relevan: 20260902063615_add_gps_geofencing dan 20260901000000_add_google_sheets_sync_to_meeting. Migration geofence menggunakan kolom nullable dan default radius 150 meter.")]

section("7. Verifikasi dan Pengujian")
story += [P("Verifikasi tersedia: npx tsc --noEmit berhasil, npm run build berhasil pada verifikasi terakhir, dan npx jest src/utils/__tests__/geofence.test.ts menghasilkan 21 test berhasil."), P("Test mencakup koordinat identik, akurasi Haversine, sifat simetris, kasus 100/149.99/150/150.01/200 meter, serta validasi batas koordinat dan nilai non-finite."), P("<b>Smoke test production</b>", "H2Custom")]
for x in ["Buat meeting tanpa titik; pastikan meeting lama tetap berjalan.", "Buat meeting dengan titik peta; pastikan geofence aktif.", "Absensi dari dalam radius; pastikan koordinat dan distance tersimpan.", "Absensi dari luar radius; pastikan 403 dan tidak ada record baru.", "Kirim absensi duplikat; pastikan 409.", "Klik sinkronisasi; pastikan status SYNCING lalu SYNCED.", "Periksa sheet dan jumlah baris.", "Uji token salah atau URL GAS tidak tersedia; pastikan FAILED dan PostgreSQL tetap utuh."]:
    story.append(bullet(x))

section("8. Catatan Operasional dan Batasan")
for x in ["GPS browser membutuhkan izin lokasi dan secure context (HTTPS) pada production.", "Geofence tidak menghilangkan risiko spoofing GPS pada perangkat yang dimodifikasi.", "Tile OpenStreetMap membutuhkan koneksi dan harus digunakan sesuai kebijakan provider.", "Sinkronisasi Google Sheets bersifat manual, bukan real-time otomatis.", "Payload sync saat ini belum membawa latitude, longitude, dan distance ke kolom Sheet karena kontrak GAS belum memperluas tabel tersebut.", "Jika audit lokasi siswa pada spreadsheet diperlukan, kontrak TypeScript, endpoint sync, dan kolom GAS perlu diperluas secara terkoordinasi."]:
    story.append(bullet(x))

section("9. Kesimpulan")
story += [P("Fitur geofence menerapkan validasi server-side berbasis Haversine dengan batas tegas distance &lt;= radius, default 150 meter, tanpa toleransi GPS atau accuracy tambahan. Meeting lama tanpa koordinat tetap kompatibel melalui bypass geofence."), P("Fitur sinkronisasi menyediakan ekspor snapshot per meeting ke Google Sheets dengan autentikasi token, pencegahan sinkronisasi paralel, status proses, retry, batch write, dan pencatatan error. PostgreSQL tetap menjadi sumber kebenaran sehingga integrasi eksternal tidak mengganggu integritas data absensi.")]

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=17*mm, bottomMargin=19*mm, title="Laporan Geofencing GPS dan Sinkronisasi Google Sheets", author="E-Learning Attendance Management")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
