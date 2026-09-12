import React from 'react';
import { BookOpen, Calendar, Users } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-orange-100">
      <div className="flex items-center mb-4 sm:mb-6">
        <div className="bg-orange-500 rounded-xl p-2.5">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div className="ml-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Quick Actions</h2>
          <p className="text-sm text-slate-600">Quick Actions</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <button className="group p-6 sm:p-8 border-2 border-dashed border-orange-200 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-colors">
          <div className="bg-orange-500 rounded-2xl p-4 mx-auto w-fit mb-4 group-hover:bg-orange-600 transition-colors">
            <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <p className="text-sm sm:text-base font-bold text-orange-700">Add New Question</p>
          <p className="text-xs text-slate-500 mt-1">Add New Question</p>
        </button>
        
        <button className="group p-6 sm:p-8 border-2 border-dashed border-orange-200 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-colors">
          <div className="bg-orange-500 rounded-2xl p-4 mx-auto w-fit mb-4 group-hover:bg-orange-600 transition-colors">
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <p className="text-sm sm:text-base font-bold text-orange-700">Create New Exam</p>
          <p className="text-xs text-slate-500 mt-1">Create New Exam</p>
        </button>
        
        <button className="group p-6 sm:p-8 border-2 border-dashed border-orange-200 rounded-2xl hover:border-orange-500 hover:bg-orange-50 transition-colors sm:col-span-2 xl:col-span-1">
          <div className="bg-orange-500 rounded-2xl p-4 mx-auto w-fit mb-4 group-hover:bg-orange-600 transition-colors">
            <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <p className="text-sm sm:text-base font-bold text-orange-700">View All Students</p>
          <p className="text-xs text-slate-500 mt-1">View All Students</p>
        </button>
      </div>
    </div>
  );
}
