import React from 'react';
import { Search, Trash2, Grid, List } from 'lucide-react';
import { CategoryFilter, StatusFilter, ViewMode } from './types';

interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (value: CategoryFilter) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  setCurrentPage: (value: number) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  selectedStudents: string[];
  setSelectedStudents: (value: string[]) => void;
  onExportData: () => void;
  onBulkDelete: () => void;
}

export function StudentFilters({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  viewMode,
  setViewMode,
  selectedStudents,
  setSelectedStudents,
  onExportData,
  onBulkDelete
}: StudentFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
            />
          </div>
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
          >
            <option value="all">All Categories</option>
            <option value="Gengo">Gengo (Language)</option>
            <option value="Bunka">Bunka (Culture)</option>
          </select>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="submitted">Active Accounts</option>
            <option value="in-progress">First Login</option>
          </select>
        </div>
        <div>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
        <div>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors duration-200 ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Table View (Better for desktop)"
              disabled={typeof window !== 'undefined' && window.innerWidth < 768}
            >
              <List className="h-4 w-4 mx-auto" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors duration-200 ${
                viewMode === 'card'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title="Card View (Better for mobile)"
            >
              <Grid className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>
        <div>
          <button
            onClick={onExportData}
            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
          >
            Export Data
          </button>
        </div>
      </div>
      
      {/* Bulk Actions */}
      {selectedStudents.length > 0 && (
        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-900">
              {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={onBulkDelete}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors duration-200"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedStudents([])}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors duration-200"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
