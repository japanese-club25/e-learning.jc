"use client";

import React from 'react';

type SortField = 'category' | 'start_time' | 'status' | 'participants';

interface ExamSortControlsProps {
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  examCount: number;
}

export function ExamSortControls({ 
  sortField, 
  sortDirection, 
  onSort, 
  examCount 
}: ExamSortControlsProps) {
  if (examCount === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span className="font-medium mr-2">Sort by:</span>
        <button
          onClick={() => onSort('category')}
          className={`px-3 py-1 rounded-md transition-colors ${
            sortField === 'category' 
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => onSort('start_time')}
          className={`px-3 py-1 rounded-md transition-colors ${
            sortField === 'start_time' 
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Schedule {sortField === 'start_time' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => onSort('status')}
          className={`px-3 py-1 rounded-md transition-colors ${
            sortField === 'status' 
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
        <button
          onClick={() => onSort('participants')}
          className={`px-3 py-1 rounded-md transition-colors ${
            sortField === 'participants' 
              ? 'bg-orange-100 text-orange-700 font-medium'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          Participants {sortField === 'participants' && (sortDirection === 'asc' ? '↑' : '↓')}
        </button>
      </div>
    </div>
  );
}
