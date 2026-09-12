import React from 'react';
import { TrendingUp } from 'lucide-react';

interface RecentActivityItem {
  id: string;
  type: 'exam' | 'student' | 'question';
  message: string;
  timestamp: string;
}

interface RecentActivityProps {
  recentActivity: RecentActivityItem[];
}

export function RecentActivity({ recentActivity }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-orange-100">
      <div className="flex items-center mb-4 sm:mb-6">
        <div className="bg-orange-500 rounded-xl p-2.5">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div className="ml-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Recent Activity</h2>
          <p className="text-sm text-slate-600">Recent Activity</p>
        </div>
      </div>
      
      {recentActivity.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="group flex items-start space-x-4 p-4 hover:bg-orange-50 rounded-xl transition-colors border border-transparent hover:border-orange-100">
              <div className={`
                w-3 h-3 rounded-full mt-2 flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-125
                bg-orange-500
              `} />
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-slate-900 leading-relaxed group-hover:text-indigo-800 transition-colors">{activity.message}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  {new Date(activity.timestamp).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-12">
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 mx-auto w-fit">
            <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-4" />
          </div>
          <p className="text-slate-500 text-sm sm:text-base mt-4">No recent activity</p>
          <p className="text-slate-400 text-xs sm:text-sm">No recent activity</p>
        </div>
      )}
    </div>
  );
}
