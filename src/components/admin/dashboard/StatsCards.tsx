import React from 'react';
import { BookOpen, Users, Calendar, Clock, LucideIcon } from 'lucide-react';

interface StatCard {
  title: string;
  titleJp: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  bgGradient: string;
  textColor: string;
  shadowColor: string;
}

interface StatsCardsProps {
  totalQuestions: number;
  totalExams: number;
  totalStudents: number;
  activeExams: number;
}

export function StatsCards({ totalQuestions, totalExams, totalStudents, activeExams }: StatsCardsProps) {
  const statCards: StatCard[] = [
    {
      title: 'Total Questions',
      titleJp: 'Total Questions',
      value: totalQuestions,
      icon: BookOpen,
      gradient: 'from-orange-500 to-orange-700',
      bgGradient: 'from-white to-orange-50',
      textColor: 'text-orange-700',
      shadowColor: 'shadow-orange-200'
    },
    {
      title: 'Total Exams',
      titleJp: 'Total Exams',
      value: totalExams,
      icon: Calendar,
      gradient: 'from-orange-500 to-orange-700',
      bgGradient: 'from-white to-orange-50',
      textColor: 'text-orange-700',
      shadowColor: 'shadow-orange-200'
    },
    {
      title: 'Total Students',
      titleJp: 'Total Students',
      value: totalStudents,
      icon: Users,
      gradient: 'from-orange-500 to-orange-700',
      bgGradient: 'from-white to-orange-50',
      textColor: 'text-orange-700',
      shadowColor: 'shadow-orange-200'
    },
    {
      title: 'Active Exams',
      titleJp: 'Active Exams',
      value: activeExams,
      icon: Clock,
      gradient: 'from-orange-500 to-orange-700',
      bgGradient: 'from-white to-orange-50',
      textColor: 'text-orange-700',
      shadowColor: 'shadow-orange-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow border border-orange-100`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-col space-y-1 mb-4">
                   <p className="text-xs sm:text-sm font-medium text-slate-500 tracking-wider uppercase">{card.title}</p>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${card.textColor} leading-none tracking-tight`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <div className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-3 sm:p-4 shadow-lg ${card.shadowColor}/50`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            {/* Subtle decorative element */}
            <div className="mt-4 h-1 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"></div>
          </div>
        );
      })}
    </div>
  );
}
