import React from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Trophy, AlertCircle, BookOpen } from 'lucide-react';

interface ExamResultsProps {
  results: {
    passed: boolean;
    score: number;
    totalQuestions: number;
    percentage: number;
  };
  studentData?: {
    student: {
      id: string;
      name: string;
      class: string;
      exam_code: string;
      category: string;
    };
  };
  isDark: boolean;
  toggleTheme: () => void;
  onReviewAnswers?: () => void;
}

export default function ExamResults({ 
  results, 
  studentData,
  isDark, 
  toggleTheme,
  onReviewAnswers
}: ExamResultsProps) {
  const router = useRouter();

  return (
    <div className={`min-h-screen transition-all duration-700 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-green-50 via-white to-blue-50'
    }`}>
      
      {/* Header */}
      <div className={`backdrop-blur-lg border-b ${
        isDark 
          ? 'bg-slate-900/90 border-purple-500/20' 
          : 'bg-white/90 border-green-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className={`text-xl font-bold ${
              isDark ? 'text-purple-300' : 'text-green-600'
            }`}>
              <span className="text-2xl mr-2">学</span>
              LearnJP
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDark 
                  ? 'bg-purple-800 text-yellow-300 hover:bg-purple-700' 
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          
          {/* Success Icon */}
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-8 ${
            results.passed
              ? 'bg-green-500'
              : 'bg-red-500'
          }`}>
            {results.passed ? (
              <Trophy className="w-12 h-12 text-white" />
            ) : (
              <AlertCircle className="w-12 h-12 text-white" />
            )}
          </div>

          {/* Results */}
          <h1 className={`text-4xl font-bold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Exam {results.passed ? 'Completed!' : 'Submitted'}
          </h1>

          <p className={`text-xl mb-8 ${
            results.passed
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {results.passed ? 'Congratulations! You passed the exam.' : 'Unfortunately, you did not pass this time.'}
          </p>

          {/* Score Display */}
          <div className={`backdrop-blur-xl rounded-3xl p-8 shadow-2xl border mb-8 ${
            isDark 
              ? 'bg-slate-800/30 border-purple-500/20' 
              : 'bg-white/80 border-green-200/50'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  isDark ? 'text-purple-300' : 'text-blue-600'
                }`}>
                  {results.score}
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Correct Answers
                </div>
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  isDark ? 'text-purple-300' : 'text-blue-600'
                }`}>
                  {results.totalQuestions}
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Total Questions
                </div>
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  results.passed ? 'text-green-500' : 'text-red-500'
                }`}>
                  {results.percentage}%
                </div>
                <div className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Final Score
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {onReviewAnswers && (
              <button
                onClick={onReviewAnswers}
                className={`px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } flex items-center justify-center`}
              >
                <BookOpen size={20} className="mr-2" />
                Review Answers
              </button>
            )}
            
            <button
              onClick={() => router.push('/student/dashboard')}
              className={`px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 ${
                results.passed
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
