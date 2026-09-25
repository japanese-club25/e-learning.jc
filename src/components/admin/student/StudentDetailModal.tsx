"use client";

import { useEffect, useState } from "react";
import { Edit3, KeyRound, Save, X } from "lucide-react";
import { Student } from "./types";

export function StudentDetailModal({ student, isOpen, onClose, onUpdated }: { student: Student; isOpen: boolean; onClose: () => void; onUpdated: (student: Student) => void }) {
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: student.name, email: student.email || "", class: student.class });
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({ name: student.name, email: student.email || "", class: student.class });
      setEditing(false); setResetting(false); setMessage(null); setError(null); setPassword("");
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/admin/students/${student.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to update student");
      onUpdated(data.student); setEditing(false); setMessage("Student updated successfully");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update student"); }
    finally { setSaving(false); }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm("Reset this student's password? Existing sessions will be revoked.")) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/admin/students/${student.id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to reset password");
      setPassword(""); setResetting(false); setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to reset password"); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"><div className="mb-6 flex items-start justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-orange-600">Student Account</p><h2 className="mt-1 text-xl font-bold text-slate-900">{student.name}</h2></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-orange-50 hover:text-orange-600" aria-label="Close"><X className="h-5 w-5" /></button></div>{message && <p className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">{message}</p>}{error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{editing ? <form onSubmit={save} className="space-y-4"><label className="block text-sm font-medium text-slate-700">Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" /></label><label className="block text-sm font-medium text-slate-700">Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" /></label><label className="block text-sm font-medium text-slate-700">Class<input required value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" /></label><div className="flex gap-2"><button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700">Cancel</button><button disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save Changes"}</button></div></form> : resetting ? <form onSubmit={resetPassword} className="space-y-4"><p className="text-sm text-slate-600">Student will be required to change this password on next login.</p><label className="block text-sm font-medium text-slate-700">New Password<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-orange-200 px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" /></label><div className="flex gap-2"><button type="button" onClick={() => setResetting(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700">Cancel</button><button disabled={saving} className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{saving ? "Resetting..." : "Reset Password"}</button></div></form> : <><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium">{student.email || "-"}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Class</dt><dd className="font-medium">{student.class}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Account Status</dt><dd className="font-medium text-orange-700">{student.is_first_login ? "First Login" : "Active"}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Created At</dt><dd className="font-medium">{new Date(student.created_at).toLocaleDateString()}</dd></div></dl><div className="mt-6 grid gap-2 sm:grid-cols-2"><button onClick={() => setEditing(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white hover:bg-orange-700"><Edit3 className="h-4 w-4" /> Edit Student</button><button onClick={() => setResetting(true)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 px-4 py-2.5 font-semibold text-orange-700 hover:bg-orange-50"><KeyRound className="h-4 w-4" /> Reset Password</button></div></>}</div></div>;
}
