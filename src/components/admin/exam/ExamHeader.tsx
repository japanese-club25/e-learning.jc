"use client";

import React from 'react';
import { Calendar, Plus } from 'lucide-react';

interface ExamHeaderProps {
  onCreateExam: () => void;
}

export function ExamHeader({ onCreateExam }: ExamHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center">
        <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 mr-2 flex-shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Exam Management</h1>
      </div>
      <button
        onClick={onCreateExam}
        className="flex items-center justify-center px-4 py-2.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 text-sm sm:text-base"
      >
        <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
        Create Exam
      </button>
    </div>
  );
}
