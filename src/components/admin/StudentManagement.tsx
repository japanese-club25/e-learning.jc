"use client";

import React, { useState, useEffect } from 'react';
import { Users, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Student,
  SortField,
  SortDirection,
  CategoryFilter,
  StatusFilter,
  ViewMode,
  StudentFilters,
  StudentTable,
  StudentCardView,
  Pagination,
  StudentDetailModal,
} from "./student";

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);

  // New state for table improvements
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    class: "",
    password: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    // Enhanced auto-switch to card view with device detection
    const handleResize = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        );

      // Force card view on mobile devices
      if (width < 640) {
        setViewMode("card");
      } else if (width < 1024 && isMobileDevice) {
        // Prefer card view on tablets with touch interfaces
        setViewMode("card");
      }
    };

    // Check on initial load
    handleResize();

    // Add event listeners
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", () => {
      // Add a small delay for orientation changes
      setTimeout(handleResize, 100);
    });

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/students");
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, studentName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${studentName}? This will remove all their exam data.`,
      )
    )
      return;

    try {
      setIsDeleting(id);
      const response = await fetch(`/api/admin/students/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchStudents();
        setSelectedStudents((prev) =>
          prev.filter((studentId) => studentId !== id),
        );
      } else {
        alert("Failed to delete student");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedStudents.length} student(s)? This will remove all their exam data.`,
      )
    )
      return;

    try {
      setLoading(true);
      const deletePromises = selectedStudents.map((id) =>
        fetch(`/api/admin/students/${id}`, { method: "DELETE" }),
      );

      await Promise.all(deletePromises);
      await fetchStudents();
      setSelectedStudents([]);
    } catch (error) {
      console.error("Error deleting students:", error);
      alert("Failed to delete students");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    const allCurrentPageIds = paginatedStudents.map((student) => student.id);
    if (
      selectedStudents.length === allCurrentPageIds.length &&
      allCurrentPageIds.every((id) => selectedStudents.includes(id))
    ) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(allCurrentPageIds);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleExportData = () => {
    const dataToExport =
      selectedStudents.length > 0
        ? students.filter((s) => selectedStudents.includes(s.id))
        : sortedStudents;

    const csv = ["Name,Email,Class,Account Status,Created At", ...dataToExport.map((student) => [student.name, student.email || "", student.class, student.is_first_login ? "First Login" : "Active", new Date(student.created_at).toLocaleDateString()].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Import failed");
      setImportResult(
        `Imported ${data.created} student(s); ${data.failed} row(s) failed.`,
      );
      await fetchStudents();
    } catch (error) {
      setImportResult(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const downloadXlsxTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        name: "Example Student",
        email: "student@example.com",
        class: "Class A",
        password: "",
        exam_code: "",
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, "students-template.xlsx");
  };

  const handleCreateStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setImportResult(null);
    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Failed to create student");
    setImportResult("Student created.");
      setCreateForm({
        name: "",
        email: "",
        class: "",
        password: "",
      });
      setShowCreateForm(false);
      await fetchStudents();
    } catch (error) {
      setImportResult(
        error instanceof Error ? error.message : "Failed to create student",
      );
    } finally {
      setCreating(false);
    }
  };

  // Filter and sort students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "submitted" && !student.is_first_login) ||
      (statusFilter === "in-progress" && student.is_first_login);

    return matchesSearch && matchesStatus;
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    switch (sortField) {
      case "name":
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case "class":
        valueA = a.class.toLowerCase();
        valueB = b.class.toLowerCase();
        break;
      case "status":
        valueA = a.is_first_login ? 0 : 1;
        valueB = b.is_first_login ? 0 : 1;
        break;
      case "created_at":
        valueA = new Date(a.created_at).getTime();
        valueB = new Date(b.created_at).getTime();
        break;
      default:
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
    }

    if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = sortedStudents.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex items-center">
          <Users className="h-6 w-6 text-indigo-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">
            Student Management
          </h1>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white cursor-pointer hover:bg-orange-700 shadow-sm">
            <Upload className="h-4 w-4" />
            {importing ? "Importing..." : "Import CSV/XLSX"}
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              disabled={importing}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
          >
            + Add Student
          </button>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent("name,email,class,category,password,exam_code\nExample Student,student@example.com,Class A,Gengo,,")}`}
            download="students-template.csv"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> CSV Template
          </a>
          <button
            type="button"
            onClick={downloadXlsxTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> XLSX Template
          </button>
          <div className="text-gray-500">
            Total Students:{" "}
            <span className="font-medium text-gray-900">{students.length}</span>
          </div>
          {sortedStudents.length !== students.length && (
            <div className="text-indigo-600">
              Filtered:{" "}
              <span className="font-medium">{sortedStudents.length}</span>
            </div>
          )}
          {selectedStudents.length > 0 && (
            <div className="text-green-600">
              Selected:{" "}
              <span className="font-medium">{selectedStudents.length}</span>
            </div>
          )}
        </div>
      </div>

      {importResult && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {importResult}
        </div>
      )}

      {showCreateForm && (
        <form
          onSubmit={handleCreateStudent}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm grid gap-4 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-lg font-semibold text-gray-900">
            Add Student Account
          </h2>
          {(["name", "email", "class", "password"] as const).map((field) => {
            const label =
              field === "class"
                ? "Class"
                : field[0].toUpperCase() + field.slice(1);
            return (
              <div key={field}>
                <label
                  htmlFor={`create-student-${field}`}
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {label}
                </label>
                <input
                  id={`create-student-${field}`}
                  required
                  type={
                    field === "password"
                      ? "password"
                      : field === "email"
                        ? "email"
                        : "text"
                  }
                  minLength={field === "password" ? 6 : undefined}
                  placeholder={label}
                  value={createForm[field]}
                  onChange={(event) =>
                    setCreateForm({
                      ...createForm,
                      [field]: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            );
          })}
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {/* Filters and Bulk Actions */}
      <StudentFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedStudents={selectedStudents}
        setSelectedStudents={setSelectedStudents}
        onExportData={handleExportData}
        onBulkDelete={handleBulkDelete}
      />

      {/* Students List - Enhanced container */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        {paginatedStudents.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {sortedStudents.length === 0
                ? "No students found"
                : "No students on this page"}
            </p>
            {sortedStudents.length > 0 && (
              <button
                onClick={() => setCurrentPage(1)}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Go to first page
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "table" ? (
              <StudentTable
                students={paginatedStudents}
                selectedStudents={selectedStudents}
                sortField={sortField}
                sortDirection={sortDirection}
                isDeleting={isDeleting}
                onSort={handleSort}
                onSelectAll={handleSelectAll}
                onSelectStudent={handleSelectStudent}
                onViewDetail={(student) => {
                  setSelectedStudent(student);
                  setShowStudentDetail(true);
                }}
                onDelete={handleDelete}
              />
            ) : (
              <StudentCardView
                students={paginatedStudents}
                selectedStudents={selectedStudents}
                isDeleting={isDeleting}
                onSelectAll={handleSelectAll}
                onSelectStudent={handleSelectStudent}
                onViewDetail={(student) => {
                  setSelectedStudent(student);
                  setShowStudentDetail(true);
                }}
                onDelete={handleDelete}
              />
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedStudents.length}
              startIndex={startIndex}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          isOpen={showStudentDetail}
          onClose={() => setShowStudentDetail(false)}
        />
      )}
    </div>
  );
}
