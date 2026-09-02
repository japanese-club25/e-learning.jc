/**
 * Google Apps Script sync service.
 * Sends a single batch payload to the GAS Web App endpoint.
 * PostgreSQL remains the source of truth; GAS/Sheets is export-only.
 */

export interface GasMeetingPayload {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface GasAttendancePayload {
  student_id: string;
  name: string;
  class: string;
  status: string;
  recorded_at: string;
  device_id: string;
  reason: string | null;
}

export interface GasSyncPayload {
  token: string;
  action: "sync_meeting";
  meeting: GasMeetingPayload;
  attendance: GasAttendancePayload[];
}

export interface GasSyncSuccess {
  success: true;
  meetingId: string;
  sheetId: string;      // Numeric sheet ID as string
  sheetName: string;
  syncedRows: number;
  syncedAt: string;
}

export interface GasSyncFailure {
  success: false;
  meetingId: string;
  error: string;
}

export type GasSyncResult = GasSyncSuccess | GasSyncFailure;

/**
 * Send batch attendance data to Google Apps Script Web App.
 * One HTTP request per meeting sync. Never called automatically.
 */
export async function sendSyncToGas(payload: GasSyncPayload): Promise<GasSyncResult> {
  const gasUrl = process.env.GAS_WEB_APP_URL;

  if (!gasUrl) {
    return {
      success: false,
      meetingId: payload.meeting.id,
      error: "GAS_WEB_APP_URL not configured in environment",
    };
  }

  const controller = new AbortController();
  // GAS free tier has a 6-min execution limit; 90s HTTP timeout is safe
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // GAS always returns 200 even for logic errors; parse body for real status
    const text = await response.text();

    let result: GasSyncResult;
    try {
      result = JSON.parse(text);
    } catch {
      return {
        success: false,
        meetingId: payload.meeting.id,
        error: `GAS returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 200)}`,
      };
    }

    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === "AbortError") {
      return {
        success: false,
        meetingId: payload.meeting.id,
        error: "Request timed out after 90 seconds (GAS execution limit)",
      };
    }
    return {
      success: false,
      meetingId: payload.meeting.id,
      error: err?.message ?? "Unknown network error",
    };
  }
}
