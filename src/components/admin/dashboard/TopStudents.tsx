import React from 'react';
import { Award } from 'lucide-react';

interface TopStudent {
  id: string;
  name: string;
  class: string;
  averageScore: number;
  totalExams: number;
}

interface TopStudentsProps {
  topStudents: TopStudent[];
}

export function TopStudents({ topStudents }: TopStudentsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-orange-100">
      <div className="flex items-center mb-4 sm:mb-6">
        <div className="bg-orange-500 rounded-xl p-2.5">
          <Award className="h-5 w-5 text-white" />
        </div>
        <div className="ml-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Top Students</h2>
          <p className="text-sm text-slate-600">Top Students</p>
        </div>
      </div>
      
      {topStudents.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {topStudents.map((student, index) => (
            <div key={student.id} className="group flex items-center justify-between p-4 sm:p-5 bg-white rounded-xl hover:bg-orange-50 transition-colors border border-orange-100 hover:border-orange-200">
              <div className="flex items-center min-w-0 flex-1">
                <div className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-bold flex-shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110
                  bg-orange-500
                `}>
                  {index + 1}
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm sm:text-base truncate group-hover:text-indigo-700 transition-colors">{student.name}</p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{student.class}</p>
                </div>
              </div>
              <div className="text-right ml-2 flex-shrink-0">
                <p className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-indigo-700 transition-colors">{student.averageScore.toFixed(1)}%</p>
                <p className="text-xs sm:text-sm text-slate-500">{student.totalExams} exams</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 mx-auto w-fit">
            <Award className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-4" />
          </div>
          <p className="text-slate-500 text-sm sm:text-base mt-4">No student data available</p>
          <p className="text-slate-400 text-xs sm:text-sm">No student data available</p>
        </div>
      )}
    </div>
  );
}
