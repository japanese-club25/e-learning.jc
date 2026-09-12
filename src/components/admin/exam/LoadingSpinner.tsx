"use client";

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = "Loading exams..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-48 sm:h-64">
      <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-orange-600 mb-4"></div>
      <p className="text-sm sm:text-base text-gray-500">{message}</p>
    </div>
  );
}
