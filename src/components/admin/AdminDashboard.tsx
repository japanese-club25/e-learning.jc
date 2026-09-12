"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  GraduationCap,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
  FileText,
  Calendar,
  Clock
  ,ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { QuestionManagement } from './QuestionManagement';
import { ExamManagement } from './ExamManagement';
import { StudentManagement } from './StudentManagement';
import { MaterialManagement } from './MaterialManagement';
import { DashboardOverview } from './DashboardOverview';
import { AttendanceManagement } from './AttendanceManagement';
import { ExamResultsManagement } from './ExamResultsManagement';

type TabType = 'overview' | 'questions' | 'exams' | 'students' | 'results' | 'attendance';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: BarChart3 },
    { id: 'questions' as TabType, name: 'Questions', icon: BookOpen },
    { id: 'exams' as TabType, name: 'Exams', icon: Calendar },
    { id: 'students' as TabType, name: 'Students', icon: Users },
    { id: 'results' as TabType, name: 'Exam Results', icon: ClipboardList },
    { id: 'attendance' as TabType, name: 'Attendance', icon: Clock },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />;
      case 'questions':
        return <QuestionManagement />;
      case 'exams':
        return <ExamManagement />;
      case 'students':
        return <StudentManagement />;
      case 'results':
        return <ExamResultsManagement />;
      case 'attendance':
        return <AttendanceManagement />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="admin-dashboard min-h-screen bg-white flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 md:w-64 bg-orange-600 shadow-xl transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:translate-x-0 flex flex-col`}>
        {/* Header with Japanese-inspired design */}
         <div className="relative flex items-center justify-between h-20 px-4 sm:px-6 bg-orange-700 border-b border-orange-500 flex-shrink-0">
          {/* Subtle pattern overlay */}

          <div className="flex items-center min-w-0 relative z-10">
            <div className="relative">
               <GraduationCap className="h-8 w-8 sm:h-9 sm:w-9 text-white flex-shrink-0" />
              <div className="absolute -inset-1 bg-orange-300/20 rounded-full blur-md"></div>
            </div>
            <div className="ml-3">
               <span className="block text-white text-lg sm:text-xl font-bold tracking-wide">
                 Learning<span className="text-orange-200 ml-1">JP</span>
              </span>
               <span className="block text-orange-100 text-xs font-medium tracking-widest">ADMIN PANEL</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
             className="md:hidden text-white hover:text-orange-100 p-2 rounded-lg hover:bg-orange-500 transition-colors relative z-10"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Navigation with Japanese aesthetic - Scrollable */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500 admin-sidebar-nav">
          <div className="mt-8 px-3 sm:px-4 pb-4">
            <div className="space-y-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    group relative w-full flex items-center px-4 sm:px-5 py-4 text-left transition-all duration-300 rounded-xl mx-1
                    ${isActive
                      ? 'bg-white text-orange-700 border border-white'
                        : 'text-orange-50 hover:text-white hover:bg-orange-500 '
                    }
                  `}
                >
                  {/* Active indicator */}
                  {isActive && (
                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full"></div>
                  )}

                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-lg mr-4 transition-all duration-300
                    ${isActive
                       ? 'bg-orange-100 text-orange-700'
                       : 'bg-orange-500 group-hover:bg-orange-400 text-white'
                    }
                  `}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <span className="text-sm sm:text-base font-medium tracking-wide">{tab.name}</span>
                    {isActive && (
                       <div className="w-12 h-0.5 bg-orange-500 mt-1 rounded-full"></div>
                    )}
                  </div>

                  {/* Subtle glow effect for active item */}
                </button>
              );
            })}
            </div>
          </div>
        </nav>

        {/* User profile section with Japanese design */}
          <div className="p-4 sm:p-6 border-t border-orange-500 bg-orange-700 flex-shrink-0">
            <div className="flex items-center mb-6 p-4 bg-orange-500 rounded-xl border border-orange-400">
            <div className="relative">
               <div className="h-12 w-12 sm:h-14 sm:w-14 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                 <span className="text-white text-lg sm:text-xl font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
               <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-300 rounded-full border-2 border-white"></div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-white truncate tracking-wide">{user?.email}</p>
              <div className="flex items-center mt-1">
                 <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <p className="text-xs sm:text-sm text-orange-100 font-medium tracking-wider">ADMIN</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
             className="w-full group flex items-center justify-center px-4 py-3.5 sm:py-4 text-sm sm:text-base text-white hover:text-orange-700 bg-orange-500 hover:bg-white rounded-xl border border-orange-400 transition-colors"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
             <span className="font-medium tracking-wide">Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Top bar with Japanese aesthetic */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/50">
             <div className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6">
            <div className="flex items-center min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                 className="md:hidden text-slate-600 hover:text-orange-700 p-2.5 rounded-xl hover:bg-orange-50 transition-colors mr-3"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              <div className="flex items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 capitalize tracking-tight">
                  {activeTab}
                </h1>
                {/* Japanese subtitle */}
                <div className="ml-4 hidden sm:block">
                   <span className="px-3 py-1.5 bg-orange-50 text-orange-700 text-sm font-medium rounded-full border border-orange-200">
                    {activeTab === 'overview' && 'Overview'}
                    {activeTab === 'questions' && 'Questions'}
                    {activeTab === 'exams' && 'Exams'}
                   {activeTab === 'students' && 'Students'}
                   {activeTab === 'results' && 'Exam Results'}
                    {activeTab === 'attendance' && 'Attendance'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
              <div className="hidden sm:flex items-center space-x-3">
                <span className="text-sm text-slate-600 font-medium">
                  Hello,
                </span>
                <span className="text-sm text-slate-900 font-semibold max-w-32 truncate">
                  {user?.email}
                </span>
              </div>

               <div className="relative">
                 <div className="h-8 w-8 sm:h-10 sm:w-10 bg-orange-500 rounded-full flex items-center justify-center">
                   <span className="text-white text-sm sm:text-base font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                 <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-orange-300 rounded-full border-2 border-white"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-white">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
