"use client";

import { Trash2, Eye, ChevronUp, ChevronDown } from "lucide-react";
import { Student, SortField, SortDirection } from "./types";

interface Props {
  students: Student[];
  selectedStudents: string[];
  sortField: SortField;
  sortDirection: SortDirection;
  isDeleting: string | null;
  onSort: (field: SortField) => void;
  onSelectAll: () => void;
  onSelectStudent: (id: string) => void;
  onViewDetail: (student: Student) => void;
  onViewAnswers?: (student: Student) => void;
  onDelete: (id: string, name: string) => void;
}

export function StudentTable({ students, selectedStudents, sortField, sortDirection, isDeleting, onSort, onSelectAll, onSelectStudent, onViewDetail, onDelete }: Props) {
  const sortIcon = (field: SortField) => sortField === field ? (sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null;
  return <div className="overflow-x-auto rounded-xl border border-orange-100 bg-white">
    <table className="min-w-full divide-y divide-slate-100">
      <thead className="bg-orange-50/70"><tr>
        <th className="px-4 py-3"><input type="checkbox" checked={students.length > 0 && students.every((s) => selectedStudents.includes(s.id))} onChange={onSelectAll} /></th>
        {[["name", "Student"], ["class", "Class"], ["category", "Category"], ["created_at", "Created At"]].map(([field, label]) => <th key={field} onClick={() => onSort(field as SortField)} className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-800"><span className="inline-flex items-center gap-1">{label}{sortIcon(field as SortField)}</span></th>)}
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-orange-800">Account Status</th>
        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-orange-800">Actions</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100">
        {students.map((student) => <tr key={student.id} className="hover:bg-orange-50/40">
          <td className="px-4 py-4"><input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => onSelectStudent(student.id)} /></td>
          <td className="px-4 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">{student.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><p className="font-semibold text-slate-900">{student.name}</p><p className="text-xs text-slate-500">{student.email || "No email"}</p></div></div></td>
          <td className="px-4 py-4 text-sm text-slate-600">{student.class}</td>
          <td className="px-4 py-4"><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">{student.category}</span></td>
          <td className="px-4 py-4 text-sm text-slate-500">{new Date(student.created_at).toLocaleDateString()}</td>
          <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.is_first_login ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{student.is_first_login ? "First Login" : "Active"}</span></td>
          <td className="px-4 py-4"><div className="flex justify-end gap-2"><button onClick={() => onViewDetail(student)} className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"><Eye className="h-3.5 w-3.5" /> Detail</button><button disabled={isDeleting === student.id} onClick={() => onDelete(student.id, student.name)} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50" title="Delete student"><Trash2 className="h-4 w-4" /></button></div></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
