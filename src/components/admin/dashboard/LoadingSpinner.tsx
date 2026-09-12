import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-48 sm:h-64">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-orange-100 border-t-orange-600 shadow-sm"></div>
      </div>
        <p className="text-sm sm:text-base text-slate-600 mt-6 font-medium tracking-wide">Loading dashboard</p>
    </div>
  );
}
