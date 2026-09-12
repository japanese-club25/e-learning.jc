"use client";

import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { Exam } from './types';

interface QuestionFiltersProps {
  searchTerm: string;
  examFilter: 'all' | string;
  exams: Exam[];
  onSearchChange: (value: string) => void;
  onExamFilterChange: (examId: 'all' | string) => void;
}

export function QuestionFilters({
  searchTerm,
  examFilter,
  exams,
  onSearchChange,
  onExamFilterChange
}: QuestionFiltersProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-500 text-sm transition-colors"
          />
        </div>
      </div>
      <div className="flex items-center">
        <select
          value={examFilter}
          onChange={(e) => onExamFilterChange(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white text-sm min-w-[180px]"
        >
            <option value="all">All Exams</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} ({exam.exam_code})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
