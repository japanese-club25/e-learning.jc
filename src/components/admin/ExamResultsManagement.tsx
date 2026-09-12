"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Search, Download } from "lucide-react";

type Result = {
  id: string;
  student: { name: string; email: string | null; class: string; violations: number };
  exam: { name: string; exam_code: string; category: string };
  score: number;
  total_questions: number;
  percentage: number;
  violations: number;
  status: string;
  submitted_at: string;
};

export function ExamResultsManagement() {
  const [results, setResults] = useState<Result[]>([]);
  const [exams, setExams] = useState<{ id: string; name: string; exam_code: string }[]>([]);
  const [search, setSearch] = useState("");
  const [examId, setExamId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100", ...(search ? { search } : {}), ...(examId ? { exam_id: examId } : {}) });
    const response = await fetch(`/api/admin/exam-results?${params}`);
    const data = await response.json();
    if (data.success) { setResults(data.results); setExams(data.exams); }
    setLoading(false);
  };

  useEffect(() => { void fetchResults(); }, [examId]);

  const exportCsv = () => {
    const rows = results.map((result) => [result.student.name, result.student.class, result.exam.exam_code, result.exam.category, result.status, `${result.percentage.toFixed(2)}%`, result.score, result.total_questions, result.violations, new Date(result.submitted_at).toLocaleDateString()]);
    const csv = [["Name", "Class", "Exam Code", "Category", "Status", "Average Score", "Score", "Total Questions", "Violations", "Submitted At"], ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `exam-results-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wider text-orange-600">Assessment</p><h2 className="text-2xl font-bold text-slate-900">Exam Results</h2><p className="mt-1 text-sm text-slate-500">Review scores separately from student account management.</p></div>
      <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"><Download className="h-4 w-4" /> Export CSV</button>
    </div>
    <div className="grid gap-3 rounded-xl border border-orange-100 bg-white p-4 md:grid-cols-[1fr_240px]">
      <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void fetchResults()} placeholder="Search student, email, or class" className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
      <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="">All exams</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name || exam.exam_code}</option>)}</select>
    </div>
    <div className="overflow-hidden rounded-xl border border-orange-100 bg-white">
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading results...</div> : results.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No exam results found.</div> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-orange-100 bg-orange-50/60 text-xs uppercase tracking-wider text-orange-800"><tr>{["Student", "Class", "Exam", "Status", "Score", "Percentage", "Violations", "Submitted"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{results.map((result) => <tr key={result.id} className="hover:bg-orange-50/40"><td className="px-4 py-3 font-medium text-slate-900">{result.student.name}<span className="block text-xs font-normal text-slate-500">{result.student.email}</span></td><td className="px-4 py-3 text-slate-600">{result.student.class}</td><td className="px-4 py-3 text-slate-600">{result.exam.name || result.exam.exam_code}</td><td className="px-4 py-3"><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">{result.status}</span></td><td className="px-4 py-3 text-slate-700">{result.score}/{result.total_questions}</td><td className="px-4 py-3 font-semibold text-orange-700">{result.percentage.toFixed(2)}%</td><td className="px-4 py-3 text-slate-600">{result.violations}</td><td className="px-4 py-3 text-slate-500">{new Date(result.submitted_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}
