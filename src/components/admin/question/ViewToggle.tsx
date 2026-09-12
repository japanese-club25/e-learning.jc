"use client";

import React from 'react';
import { Grid, List } from 'lucide-react';
import type { ViewMode } from './types';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm">
      <button
        onClick={() => onViewModeChange('cards')}
        className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          viewMode === 'cards'
            ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md transform scale-105'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <Grid className="h-4 w-4 mr-2" />
        Cards
      </button>
      <button
        onClick={() => onViewModeChange('table')}
        className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          viewMode === 'table'
            ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md transform scale-105'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <List className="h-4 w-4 mr-2" />
        Table
      </button>
    </div>
  );
}
