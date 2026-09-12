"use client";

import React from 'react';
import { Edit, Trash2, Play, Pause, Users, Calendar, ChevronUp, ChevronDown } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  exam_code: string;
  category: 'Gengo' | 'Bunka';
  duration: number;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    scores: number;
  };
}

type SortField = 'category' | 'start_time' | 'status' | 'participants';

interface ExamTableViewProps {
  exams: Exam[];
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onEdit: (exam: Exam) => void;
  onDelete: (id: string) => void;
  onToggleActive: (exam: Exam) => void;
  getExamStatus: (exam: Exam) => string;
  getStatusColor: (status: string) => string;
}

export function ExamTableView({
  exams,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  onToggleActive,
  getExamStatus,
  getStatusColor
}: ExamTableViewProps) {
  // Format datetime for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleTimeString('en-US', options);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {exams.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">No exams found</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="font-medium">
                Total: {exams.length} exam{exams.length !== 1 ? 's' : ''}
              </span>
              <span>
                Active: {exams.filter(exam => getExamStatus(exam) === 'Active').length}
              </span>
              <span>
                Scheduled: {exams.filter(exam => getExamStatus(exam) === 'Scheduled').length}
              </span>
              <span>
                Completed: {exams.filter(exam => getExamStatus(exam) === 'Completed').length}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onSort('category')}
                  >
                    <div className="flex items-center">
                      Exam Details
                      {sortField === 'category' && (
                        sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onSort('start_time')}
                  >
                    <div className="flex items-center">
                      Schedule
                      {sortField === 'start_time' && (
                        sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => onSort('participants')}
                  >
                    <div className="flex items-center">
                      Participants
                      {sortField === 'participants' && (
                        sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exams.map((exam) => {
                  const status = getExamStatus(exam);
                  return (
                    <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm sm:text-base font-medium text-gray-900">
                            {exam.name}
                          </div>
                          <div className="text-xs sm:text-sm font-medium text-orange-600">
                            {exam.exam_code}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {exam.category} • Duration: {exam.duration} minutes
                          </div>
                          {/* Mobile: Show additional info */}
                          <div className="mt-1 sm:hidden space-y-1">
                            {exam.start_time && exam.end_time && (
                              <div className="text-xs text-gray-500">
                                {formatDate(exam.start_time)} - {formatDate(exam.end_time)}
                              </div>
                            )}
                            {exam._count && (
                              <div className="text-xs text-orange-600 flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {exam._count.scores} participants
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        {exam.start_time && exam.end_time ? (
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">
                              {formatDate(exam.start_time)}
                            </div>
                            <div className="text-gray-500">
                              {formatTime(exam.start_time)} - {formatTime(exam.end_time)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {exam._count ? (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-orange-600" />
                            {exam._count.scores}
                          </div>
                        ) : (
                          <span>0</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onEdit(exam)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50 transition-colors"
                            title="Edit exam"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete(exam.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete exam"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {(status === 'Scheduled' || status === 'Active') && (
                            <button
                              onClick={() => onToggleActive(exam)}
                              className={`p-1 rounded transition-colors ${
                                exam.is_active
                                  ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                                  : 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
                              }`}
                              title={exam.is_active ? 'Deactivate exam' : 'Activate exam'}
                            >
                              {exam.is_active ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
