"use client";

import React from 'react';
import { Edit, Trash2, Play, Pause, Users, Calendar } from 'lucide-react';

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

interface ExamCardViewProps {
  exams: Exam[];
  onEdit: (exam: Exam) => void;
  onDelete: (id: string) => void;
  onToggleActive: (exam: Exam) => void;
  onCreateExam: () => void;
  getExamStatus: (exam: Exam) => string;
  getStatusColor: (status: string) => string;
  searchTerm: string;
}

export function ExamCardView({
  exams,
  onEdit,
  onDelete,
  onToggleActive,
  onCreateExam,
  getExamStatus,
  getStatusColor,
  searchTerm
}: ExamCardViewProps) {
  // Format datetime for display
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
      {exams.length === 0 ? (
        <div className="col-span-full text-center py-12 sm:py-16">
          <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">
            {searchTerm ? `No exams found matching "${searchTerm}"` : 'No exams found'}
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateExam}
              className="mt-4 text-orange-600 hover:text-orange-700 text-sm sm:text-base font-medium"
            >
              Create your first exam
            </button>
          )}
        </div>
      ) : (
        exams.map((exam) => {
          const status = getExamStatus(exam);
          return (
            <div key={exam.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    {exam.name}
                  </h3>
                  <p className="text-sm font-medium text-orange-600 mt-1">
                    {exam.exam_code}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {exam.category} • Duration: {exam.duration} minutes
                  </p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ml-2 ${getStatusColor(status)}`}>
                  {status}
                </span>
              </div>

              {exam.start_time && exam.end_time && (
                <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Start:</p>
                      <p>{formatDateTime(exam.start_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-start text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">End:</p>
                      <p>{formatDateTime(exam.end_time)}</p>
                    </div>
                  </div>
                </div>
              )}

              {exam._count && (
                <div className="flex items-center text-sm text-gray-600 mb-4 p-2 bg-orange-50 rounded-lg">
                  <Users className="h-4 w-4 mr-2 text-orange-600 flex-shrink-0" />
                  <span className="text-orange-700">
                    {exam._count.scores} student{exam._count.scores !== 1 ? 's' : ''} participated
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(exam)}
                    className="flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                    title="Edit exam"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(exam.id)}
                    className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    title="Delete exam"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {(status === 'Scheduled' || status === 'Active') && (
                  <button
                    onClick={() => onToggleActive(exam)}
                    className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 min-w-0 ${
                      exam.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    {exam.is_active ? (
                      <>
                        <Pause className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">Deactivate</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">Activate</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
