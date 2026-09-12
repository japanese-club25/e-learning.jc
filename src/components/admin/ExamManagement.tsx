"use client";

import React, { useState, useEffect } from 'react';
import { 
  ExamHeader,
  ExamSearchFilters,
  ExamForm,
  ExamSortControls,
  ExamTableView,
  ExamCardView,
  LoadingSpinner,
  Exam,
  ExamFormData,
  SortField,
  ViewMode,
  SortDirection
} from './exam';

export function ExamManagement() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('start_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [formData, setFormData] = useState<ExamFormData>({
    name: '',
    exam_code: '',
    category: 'Gengo',
    duration: 60,
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/exams');
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingExam 
        ? `/api/admin/exams/${editingExam.id}`
        : '/api/admin/exams';
      
      const method = editingExam ? 'PUT' : 'POST';
      
      // Prepare form data with proper date formatting
      const submitData = {
        ...formData,
        // Convert datetime-local format to ISO string if provided
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        await fetchExams();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save exam');
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      alert('Failed to save exam');
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    
    // Format datetime for datetime-local input
    const formatDateTimeLocal = (dateString: string | null) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      name: exam.name,
      exam_code: exam.exam_code,
      category: exam.category,
      duration: exam.duration,
      start_time: formatDateTimeLocal(exam.start_time),
      end_time: formatDateTimeLocal(exam.end_time)
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam? This will also delete all associated scores.')) return;

    try {
      const response = await fetch(`/api/admin/exams/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchExams();
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete exam');
    }
  };

  const handleToggleActive = async (exam: Exam) => {
    try {
      const response = await fetch(`/api/admin/exams/${exam.id}/toggle-active`, {
        method: 'PATCH',
      });

      if (response.ok) {
        await fetchExams();
      } else {
        alert('Failed to toggle exam status');
      }
    } catch (error) {
      console.error('Error toggling exam status:', error);
      alert('Failed to toggle exam status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      exam_code: '',
      category: 'Gengo',
      duration: 60,
      start_time: '',
      end_time: ''
    });
    setEditingExam(null);
    setShowForm(false);
  };

  const getExamStatus = (exam: Exam) => {
    if (!exam.start_time || !exam.end_time) return 'Draft';
    
    const now = new Date();
    const startTime = new Date(exam.start_time);
    const endTime = new Date(exam.end_time);
    
    if (now < startTime) return 'Scheduled';
    if (now >= startTime && now <= endTime && exam.is_active) return 'Active';
    if (now > endTime) return 'Completed';
    return 'Inactive';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-orange-100 text-orange-800';
      case 'Scheduled': return 'bg-orange-50 text-orange-700';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Inactive': return 'bg-orange-50 text-orange-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExams = exams.filter(exam => {
    return exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           exam.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
           exam.exam_code.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedExams = [...filteredExams].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'start_time':
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        comparison = aTime - bTime;
        break;
      case 'status':
        const aStatus = getExamStatus(a);
        const bStatus = getExamStatus(b);
        comparison = aStatus.localeCompare(bStatus);
        break;
      case 'participants':
        const aCount = a._count?.scores || 0;
        const bCount = b._count?.scores || 0;
        comparison = aCount - bCount;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (loading) {
    return <LoadingSpinner message="Loading exams..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <ExamHeader onCreateExam={() => setShowForm(true)} />

      {/* Search and View Toggle */}
      <ExamSearchFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Exam Form Modal */}
      <ExamForm
        showForm={showForm}
        editingExam={editingExam}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />

      {/* Exams Content */}
      {viewMode === 'table' ? (
        <ExamTableView
          exams={sortedExams}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          getExamStatus={getExamStatus}
          getStatusColor={getStatusColor}
        />
      ) : (
        <>
          <ExamSortControls
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            examCount={sortedExams.length}
          />
          
          <ExamCardView
            exams={sortedExams}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onCreateExam={() => setShowForm(true)}
            getExamStatus={getExamStatus}
            getStatusColor={getStatusColor}
            searchTerm={searchTerm}
          />
        </>
      )}
    </div>
  );
}
