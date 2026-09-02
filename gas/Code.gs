/**
 * Google Apps Script – Attendance Sync Receiver
 *
 * Deployment:
 *   Extensions > Apps Script > Deploy > New deployment
 *   Type: Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Security: requests are validated via a shared secret token.
 * All Google Sheets writes use a single setValues() batch call.
 */

// ---------------------------------------------------------------------------
// CONFIG – set this in Project Settings > Script Properties
// PropertiesService.getScriptProperties().setProperty('SYNC_TOKEN', 'your-token')
// ---------------------------------------------------------------------------
var SYNC_TOKEN = PropertiesService.getScriptProperties().getProperty("SYNC_TOKEN");

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // 1. Auth validation
    if (!SYNC_TOKEN || payload.token !== SYNC_TOKEN) {
      return jsonResponse({ success: false, meetingId: null, error: "Unauthorized" });
    }

    // 2. Action validation
    if (payload.action !== "sync_meeting") {
      return jsonResponse({ success: false, meetingId: payload.meeting && payload.meeting.id, error: "Unknown action: " + payload.action });
    }

    // 3. Payload structure validation
    var validationError = validatePayload(payload);
    if (validationError) {
      return jsonResponse({ success: false, meetingId: payload.meeting && payload.meeting.id, error: validationError });
    }

    // 4. Write to Sheets
    var result = syncMeetingToSheet(payload.meeting, payload.attendance);
    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ success: false, meetingId: null, error: err.toString() });
  }
}

// ---------------------------------------------------------------------------
// Core: find-or-create sheet, clear, batch write
// ---------------------------------------------------------------------------
function syncMeetingToSheet(meeting, attendanceRows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "Meeting-" + meeting.id.slice(0, 8); // Truncate UUID for readability

  // Find existing sheet by name (idempotent)
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear(); // Snapshot sync: wipe old data before writing fresh snapshot
  }

  // ---------------------------------------------------------------------------
  // Build 2D array (single batch write = 1 API call)
  // ---------------------------------------------------------------------------
  var syncedAt = new Date().toISOString();
  var data = [];

  // --- Meeting Info Block (rows 1–7) ---
  data.push(["INFORMASI MEETING"]);
  data.push(["Meeting ID",    meeting.id]);
  data.push(["Judul",         meeting.title]);
  data.push(["Mulai",         meeting.starts_at ? formatDate(meeting.starts_at) : "-"]);
  data.push(["Selesai",       meeting.ends_at   ? formatDate(meeting.ends_at)   : "-"]);
  data.push(["Dibuat",        formatDate(meeting.created_at)]);
  data.push(["Last Sync",     syncedAt]);
  data.push([]); // Spacer row

  // --- Attendance Header (row 9) ---
  var headerRow = ["No", "Student ID", "Nama", "Kelas", "Status", "Waktu Absen", "Device", "Keterangan"];
  data.push(headerRow);

  // --- Attendance Data ---
  var attendanceStartRow = data.length; // 0-indexed, used for range formatting
  attendanceRows.forEach(function (att, i) {
    data.push([
      i + 1,
      att.student_id,
      att.name,
      att.class,
      att.status,
      att.recorded_at ? formatDate(att.recorded_at) : "-",
      att.device_id || "-",
      att.reason || "-"
    ]);
  });

  // --- Batch write (ONE setValues call) ---
  if (data.length > 0) {
    var numCols = headerRow.length;
    // Pad shorter rows to same column count
    data = data.map(function (row) {
      while (row.length < numCols) row.push("");
      return row.slice(0, numCols);
    });
    sheet.getRange(1, 1, data.length, numCols).setValues(data);
  }

  // ---------------------------------------------------------------------------
  // Formatting (batch where possible – avoid per-cell calls in loops)
  // ---------------------------------------------------------------------------
  applyFormatting(sheet, attendanceStartRow, attendanceRows.length, data.length);

  return {
    success:    true,
    meetingId:  meeting.id,
    sheetId:    sheet.getSheetId().toString(),
    sheetName:  sheetName,
    syncedRows: attendanceRows.length,
    syncedAt:   syncedAt
  };
}

// ---------------------------------------------------------------------------
// Formatting – uses batch range operations, no loops
// ---------------------------------------------------------------------------
function applyFormatting(sheet, headerRowIndex, dataRowCount, totalRows) {
  var numCols = 8;

  // Meeting info block: col A bold
  sheet.getRange(1, 1, 1, 1).setFontWeight("bold").setFontSize(12);
  sheet.getRange(2, 1, 6, 1).setFontWeight("bold");

  // Attendance header row (1-indexed = headerRowIndex + 1 because data[] is 0-indexed)
  var headerSheetRow = headerRowIndex; // already 1-indexed since we count data rows
  sheet.getRange(headerSheetRow, 1, 1, numCols)
    .setFontWeight("bold")
    .setBackground("#4F46E5")
    .setFontColor("#FFFFFF");

  // Freeze header
  sheet.setFrozenRows(headerSheetRow);

  // Status column (col 5) – color coding
  if (dataRowCount > 0) {
    var statusRange = sheet.getRange(headerSheetRow + 1, 5, dataRowCount, 1);
    var statusValues = statusRange.getValues();
    var bgColors = statusValues.map(function (row) {
      var status = row[0];
      if (status === "HADIR")       return ["#D1FAE5"]; // green-100
      if (status === "TERLAMBAT")   return ["#FEF3C7"]; // amber-100
      if (status === "IZIN")        return ["#DBEAFE"]; // blue-100
      if (status === "TIDAK_HADIR") return ["#FEE2E2"]; // red-100
      return ["#F8FAFC"];
    });
    statusRange.setBackgrounds(bgColors);
  }

  // Auto-resize all columns
  sheet.autoResizeColumns(1, numCols);

  // Optional: thin borders on attendance table
  if (dataRowCount > 0) {
    sheet.getRange(headerSheetRow, 1, dataRowCount + 1, numCols)
      .setBorder(true, true, true, true, true, true,
        "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function validatePayload(payload) {
  if (!payload.meeting)               return "Missing field: meeting";
  if (!payload.meeting.id)            return "Missing field: meeting.id";
  if (!payload.meeting.title)         return "Missing field: meeting.title";
  if (!Array.isArray(payload.attendance)) return "Missing field: attendance (must be array)";
  return null; // valid
}

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  } catch (_) {
    return isoString;
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// TEST FUNCTION – run manually in GAS editor to verify setup
// ---------------------------------------------------------------------------
function testSync() {
  var mockPayload = {
    token: SYNC_TOKEN,
    action: "sync_meeting",
    meeting: {
      id:         "abc123-test",
      title:      "Test Meeting",
      starts_at:  new Date().toISOString(),
      ends_at:    null,
      created_at: new Date().toISOString()
    },
    attendance: [
      { student_id: "s1", name: "Ahmad",  class: "XII RPL 1", status: "HADIR",       recorded_at: new Date().toISOString(), device_id: "dev1", reason: null },
      { student_id: "s2", name: "Budi",   class: "XII RPL 1", status: "IZIN",        recorded_at: new Date().toISOString(), device_id: "dev2", reason: "Sakit" },
      { student_id: "s3", name: "Citra",  class: "XII RPL 2", status: "TERLAMBAT",   recorded_at: new Date().toISOString(), device_id: "dev3", reason: null },
      { student_id: "s4", name: "Diana",  class: "XII RPL 2", status: "TIDAK_HADIR", recorded_at: new Date().toISOString(), device_id: "dev4", reason: null }
    ]
  };

  var result = syncMeetingToSheet(mockPayload.meeting, mockPayload.attendance);
  Logger.log(JSON.stringify(result, null, 2));
}
