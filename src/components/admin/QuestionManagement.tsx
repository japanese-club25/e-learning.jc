"use client";

import React, { useState, useEffect } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { japaneseTheme, japaneseText, getCardClasses, getButtonClasses } from './theme';
import {
  QuestionFilters,
  ViewToggle,
  QuestionTable,
  QuestionCards,
  Pagination,
  QuestionForm,
  EmptyState
} from './question';
import type { Question, QuestionFormData, Exam, SortField, SortDirection, ViewMode } from './question/types';

export function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState<'all' | string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [formData, setFormData] = useState<QuestionFormData>({
    exam_ids: [],
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    explanation: '',
    image: null,
    image_url: null,
    remove_image: false
  });

  useEffect(() => {
    fetchQuestions();
    fetchExams();
  }, [currentPage, itemsPerPage, searchTerm, examFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      

      if (examFilter !== 'all') {
        params.append('exam_id', examFilter);
      }
      
      const response = await fetch(`/api/admin/questions?${params}`);

      // Session expired while the tab was open: an empty list would be a lie.
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setTotalItems(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 0);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await fetch('/api/admin/exams?limit=100');
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.exam_ids.length === 0) {
      alert('Please select at least one exam');
      return;
    }

    try {
      const url = editingQuestion 
        ? `/api/admin/questions/${editingQuestion.id}`
        : '/api/admin/questions';
      
      const method = editingQuestion ? 'PUT' : 'POST';

      // multipart so the image rides along with the fields in one request
      const payload = new FormData();
      formData.exam_ids.forEach(id => payload.append('exam_ids', id));
      payload.append('question_text', formData.question_text);
      payload.append('option_a', formData.option_a);
      payload.append('option_b', formData.option_b);
      payload.append('option_c', formData.option_c);
      payload.append('option_d', formData.option_d);
      payload.append('correct_option', formData.correct_option);
      payload.append('explanation', formData.explanation || '');
      if (formData.image) payload.append('image', formData.image);
      if (formData.remove_image) payload.append('remove_image', 'true');

      const response = await fetch(url, {
        method,
        body: payload,
      });

      if (response.ok) {
        await fetchQuestions();
        resetForm();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to save question');
      }
    } catch (error) {
      console.error('Error saving question:', error);
      alert('Failed to save question');
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      exam_ids: question.exam_questions ? question.exam_questions.map(eq => eq.exam.id) : [],
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_option: question.correct_option,
      explanation: question.explanation || '',
      image: null,
      image_url: question.image_url || null,
      remove_image: false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchQuestions();
      } else {
        alert('Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  const resetForm = () => {
    setFormData({
      exam_ids: [],
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
      explanation: '',
      image: null,
      image_url: null,
      remove_image: false
    });
    setEditingQuestion(null);
    setShowForm(false);
  };

  // Handle search with debounce effect
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };



  // Handle exam filter change
  const handleExamFilterChange = (examId: 'all' | string) => {
    setExamFilter(examId);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Sorting logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to questions
  const sortedQuestions = [...questions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'question_text':
        aValue = a.question_text.toLowerCase();
        bValue = b.question_text.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'correct_option':
        aValue = a.correct_option;
        bValue = b.correct_option;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
<>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">質問管理</h2>
            <p className="text-slate-600 text-sm sm:text-base font-medium">Question Management</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`${getButtonClasses('primary')} px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg`}
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium">{japaneseText.add.jp} • {japaneseText.add.en}</span>
        </button>
      </div>

      {/* Filters with Japanese design */}
      <QuestionFilters
        searchTerm={searchTerm}
        examFilter={examFilter}
        exams={exams}
        onSearchChange={handleSearchChange}
        onExamFilterChange={handleExamFilterChange}
      />

      {/* View Toggle */}
      <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* Questions Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          searchTerm={searchTerm}
          examFilter={examFilter}
          onCreateClick={() => setShowForm(true)}
        />
      ) : viewMode === 'table' ? (
        <QuestionTable
          questions={sortedQuestions}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <QuestionCards
          questions={sortedQuestions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Form Modal */}
      <QuestionForm
        showForm={showForm}
        editingQuestion={editingQuestion}
        formData={formData}
        exams={exams}
        onFormDataChange={setFormData}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />
</>
  );
}
