"use client";

import { useEffect, useState } from "react";
import { Search, UserCheck, X } from "lucide-react";

type StudentOption = { id: string; name: string; class: string; email: string | null };

export default function ManualAttendanceModal({ meetingId, onClose, onSuccess }: { meetingId: string; onClose: () => void; onSuccess: () => void }) {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [status, setStatus] = useState("HADIR");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/students/attendance-options?search=${encodeURIComponent(search)}`);
        const data = await response.json();
        if (data.success) setStudents(data.students);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent) return setError("Select a student first");
    if (status === "IZIN" && reason.trim().length < 3) return setError("Reason is required for excused attendance");
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/admin/attendance/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meeting_id: meetingId, student_id: selectedStudent.id, status, reason }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to save attendance");
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to save attendance"); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={onClose} /><form onSubmit={submit} className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-orange-100 p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Manual attendance</p><h3 className="text-xl font-bold text-slate-900">Add Attendance</h3></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-orange-50 hover:text-orange-600"><X className="h-5 w-5" /></button></header><div className="space-y-4 p-5"><label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student name or class" className="w-full rounded-xl border border-orange-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label><div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">{loading ? <p className="p-4 text-center text-sm text-slate-500">Loading students...</p> : students.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">No students found.</p> : students.map((student) => <button type="button" key={student.id} onClick={() => setSelectedStudent(student)} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${selectedStudent?.id === student.id ? "border border-orange-300 bg-orange-50" : "hover:bg-orange-50/60"}`}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">{student.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span><span><span className="block text-sm font-semibold text-slate-900">{student.name}</span><span className="block text-xs text-slate-500">{student.class}{student.email ? ` • ${student.email}` : ""}</span></span></button>)}</div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900"><option value="HADIR">Present</option><option value="TERLAMBAT">Late</option><option value="IZIN">Excused</option><option value="TIDAK_HADIR">Absent</option></select></label><label className="block text-sm font-medium text-slate-700">Reason{status === "IZIN" && <span className="text-red-500"> *</span>}<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500" /></label></div>{error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div><footer className="flex gap-3 border-t border-slate-100 p-5"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving || !selectedStudent} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{saving ? "Saving..." : <><UserCheck className="h-4 w-4" /> Save Attendance</>}</button></footer></form></div>;
}
