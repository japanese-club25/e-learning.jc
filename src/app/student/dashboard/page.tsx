"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { Lock, LogOut, FileText, QrCode, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import AttendanceQrScanner from "@/components/attendance/AttendanceQrScanner";

export default function StudentDashboard() {
  const { user, logout, refreshUser, changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [examCode, setExamCode] = useState("");
  const [startExamLoading, setStartExamLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    refreshUser();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword("", newPassword);
      if (res.success) {
        await refreshUser();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examCode.trim()) return;

    setStartExamLoading(true);
    setError("");

    try {
      const res = await fetch("/api/student/exams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_code: examCode.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem(
          "studentData",
          JSON.stringify({
            student: data.student,
            exam: data.exam,
          }),
        );
        router.push(`/exam/${data.exam.category.toLowerCase()}/test`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to start exam");
    } finally {
      setStartExamLoading(false);
    }
  };

  if (!user) return null;

  if (user.isFirstLogin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl p-5 sm:p-8 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-xl">
          <div className="flex justify-center mb-4">
            <div className="bg-orange-50 p-3 rounded-full">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-900 mb-2">
            Change Password
          </h2>
          <p className="text-center text-slate-500 mb-6 text-sm">
            This is your first login. Please set a new password to continue.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen overflow-x-hidden bg-slate-50">
        <header className="bg-white border-b border-orange-100 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2 shadow-sm">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <h1 className="truncate text-base sm:text-xl font-bold text-slate-900">
              <span className="hidden min-[400px]:inline">Student </span>Dashboard
            </h1>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium hidden sm:block">Logout</span>
          </button>
        </header>

        <main className="px-3 py-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-orange-100 p-4 sm:p-8">
            <h2 className="break-words text-xl sm:text-2xl font-bold leading-tight text-slate-900 mb-3">
              Welcome back, {user.name || user.email}!
            </h2>
            {(user.class || user.category) && (
              <div className="flex max-w-full flex-wrap gap-2 mb-4">
                {user.class && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                    <span className="break-words">Class {user.class}</span>
                  </span>
                )}
                {user.category && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                    {user.category}
                  </span>
                )}
              </div>
            )}
              <p className="text-slate-500 text-sm break-words">
              Choose an exam or scan attendance to continue.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Exam Card */}
            <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-orange-100 p-4 sm:p-6 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="bg-orange-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-orange-100">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Take an Exam
              </h3>
              <p className="text-slate-500 mb-6 flex-grow text-sm">
                Enter the exam code provided by your teacher to start your
                examination.
              </p>

              <form onSubmit={handleStartExam} className="flex min-w-0 flex-col gap-2 min-[400px]:flex-row">
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  placeholder="Enter Exam Code"
                  className="min-w-0 w-full flex-grow px-3 sm:px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-slate-900"
                  required
                />
                <button
                  type="submit"
                  disabled={startExamLoading}
                  className="w-full min-[400px]:w-auto bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {startExamLoading ? (
                    "Starting..."
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Start
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Attendance Card */}
            <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-orange-100 p-4 sm:p-6 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="bg-orange-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-orange-100">
                <QrCode className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Scan Attendance
              </h3>
              <p className="text-slate-500 mb-6 flex-grow text-sm">
                Use the scanner to mark your presence. Please ensure you allow camera access.
              </p>

              <AttendanceQrScanner />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
