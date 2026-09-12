import React from 'react';
import { Users, Trophy, TrendingUp, Award } from 'lucide-react';
import { Student } from './types';

interface StudentStatsCardsProps {
  students: Student[];
}

export function StudentStatsCards({ students }: StudentStatsCardsProps) {
  const submittedCount = students.filter(s => !s.is_first_login).length;
  const violationsCount = students.filter(s => s.violations > 0).length;
  
  const studentsWithScores = students.filter(s => (s.scores?.length ?? 0) > 0);
  const averagePerformance = studentsWithScores.length > 0 
    ? students
        .filter(s => (s.scores?.length ?? 0) > 0)
        .reduce((sum, s) => {
          const totalScore = (s.scores ?? []).reduce((scoreSum, score) => {
            // Handle percentage as Decimal (from Prisma) - convert to number
            if (score.percentage !== null && score.percentage !== undefined) {
              const percentageValue = typeof score.percentage === 'number' ? score.percentage : parseFloat(score.percentage.toString());
              return scoreSum + (!isNaN(percentageValue) ? percentageValue : (score.total_questions > 0 ? (score.score / score.total_questions) * 100 : 0));
            }
            return scoreSum + (score.total_questions > 0 ? (score.score / score.total_questions) * 100 : 0);
          }, 0);
          return sum + (totalScore / (s.scores?.length ?? 1));
        }, 0) / studentsWithScores.length
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <Trophy className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Submitted Exams</p>
            <p className="text-2xl font-bold text-gray-900">{submittedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Average Performance</p>
            <p className="text-2xl font-bold text-gray-900">
              {averagePerformance.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-2 bg-red-100 rounded-lg">
            <Award className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">With Violations</p>
            <p className="text-2xl font-bold text-gray-900">{violationsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
