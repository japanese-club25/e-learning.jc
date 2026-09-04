import React from 'react';
import { Check, X, BookOpen, Sun, Moon, ArrowLeft } from 'lucide-react';

interface ReviewQuestion {
  id: string;
  questionNumber: number;
  question_text: string;
  image_url?: string | null;
  options: Array<{
    id: string;
    text: string;
  }>;
  correct_option: string;
  student_answer: string | null;
  is_correct: boolean;
  explanation?: string | null;
}

interface ExamReviewData {
  exam: {
    id: string;
    name: string;
    exam_code: string;
    category: string;
    duration: number;
  };
  student: {
    id: string;
    name: string;
    class: string;
    category: string;
  };
  score: {
    score: number;
    total_questions: number;
    percentage: number;
    passed: boolean;
  } | null;
  questions: ReviewQuestion[];
  summary: {
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    violations: number;
  };
}

interface ExamReviewProps {
  reviewData: ExamReviewData;
  isDark: boolean;
  toggleTheme: () => void;
  onBack: () => void;
}

export default function ExamReview({ 
  reviewData, 
  isDark, 
  toggleTheme, 
  onBack 
}: ExamReviewProps) {
  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);
  
  const getOptionStyle = (option: any, question: ReviewQuestion) => {
    const isCorrect = option.id === question.correct_option;
    const isStudentAnswer = option.id === question.student_answer;
    
    if (isCorrect && isStudentAnswer) {
      // Correct answer and student selected it
      return 'bg-green-100 border-green-500 text-green-800';
    } else if (isCorrect) {
      // Correct answer but student didn't select it
      return 'bg-green-50 border-green-300 text-green-700';
    } else if (isStudentAnswer) {
      // Wrong answer but student selected it
      return 'bg-red-100 border-red-500 text-red-800';
    } else {
      // Normal option
      return isDark 
        ? 'bg-slate-700 border-slate-600 text-slate-300' 
        : 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-700 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      
      {/* Header */}
      <div className={`backdrop-blur-lg border-b ${
        isDark 
          ? 'bg-slate-900/90 border-purple-500/20' 
          : 'bg-white/90 border-blue-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className={`mr-4 p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                  isDark 
                    ? 'bg-purple-800 text-purple-300 hover:bg-purple-700' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                <ArrowLeft size={20} />
              </button>
              <div className={`text-xl font-bold ${
                isDark ? 'text-purple-300' : 'text-blue-600'
              }`}>
                <span className="text-2xl mr-2">学</span>
                Exam Review
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDark 
                  ? 'bg-purple-800 text-yellow-300 hover:bg-purple-700' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Summary Card */}
        <div className={`backdrop-blur-xl rounded-3xl p-6 shadow-2xl border mb-8 ${
          isDark 
            ? 'bg-slate-800/30 border-purple-500/20' 
            : 'bg-white/80 border-blue-200/50'
        }`}>
          <h2 className={`text-2xl font-bold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {reviewData.exam.name} - Review
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                isDark ? 'text-purple-300' : 'text-blue-600'
              }`}>
                {reviewData.summary.total_questions}
              </div>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Questions
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {reviewData.summary.correct_answers}
              </div>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Correct
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {reviewData.summary.wrong_answers}
              </div>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Wrong
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                reviewData.score?.passed ? 'text-green-500' : 'text-red-500'
              }`}>
                {reviewData.score?.percentage}%
              </div>
              <div className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Final Score
              </div>
            </div>
          </div>

          <div className={`text-center p-3 rounded-lg ${
            reviewData.score?.passed 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <strong>
              {reviewData.score?.passed ? '✅ Passed' : '❌ Not Passed'}
            </strong>
          </div>
        </div>

        {/* Legend */}
        <div className={`backdrop-blur-xl rounded-2xl p-4 shadow-xl border mb-6 ${
          isDark 
            ? 'bg-slate-800/30 border-purple-500/20' 
            : 'bg-white/80 border-blue-200/50'
        }`}>
          <h3 className={`font-semibold mb-3 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Legend:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-500 rounded mr-2"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                Correct Answer (Your Choice)
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-50 border border-green-300 rounded mr-2"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                Correct Answer
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border border-red-500 rounded mr-2"></div>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                Your Wrong Choice
              </span>
            </div>
          </div>
        </div>

        {/* Questions Review */}
        <div className="space-y-6">
          {reviewData.questions.map((question) => (
            <div key={question.id} className={`backdrop-blur-xl rounded-2xl p-6 shadow-xl border ${
              isDark 
                ? 'bg-slate-800/30 border-purple-500/20' 
                : 'bg-white/80 border-blue-200/50'
            }`}>
              
              {/* Question Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                    isDark ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {question.questionNumber}
                  </div>
                  <div className={`text-lg font-semibold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Question {question.questionNumber}
                  </div>
                </div>
                
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  question.is_correct 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {question.is_correct ? (
                    <>
                      <Check size={16} className="mr-1" />
                      Correct
                    </>
                  ) : (
                    <>
                      <X size={16} className="mr-1" />
                      Wrong
                    </>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className={`text-lg mb-6 leading-relaxed ${
                isDark ? 'text-gray-200' : 'text-gray-800'
              }`}>
                {question.question_text}
              </div>

              {question.image_url && (
                <img
                  src={question.image_url}
                  alt={`Image for question ${question.questionNumber}`}
                  className="mb-6 max-h-80 w-auto rounded-lg border border-gray-200 object-contain"
                />
              )}

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      getOptionStyle(option, question)
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="font-semibold mr-3">
                        {option.id}.
                      </span>
                      <span className="flex-1">
                        {option.text}
                      </span>
                      {option.id === question.correct_option && (
                        <Check size={20} className="text-green-600 ml-2" />
                      )}
                      {option.id === question.student_answer && option.id !== question.correct_option && (
                        <X size={20} className="text-red-600 ml-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Student Answer Info */}
              <div className="mt-4 p-3 rounded-lg bg-gray-50 border">
                <div className="text-sm">
                  <span className="font-semibold">Your answer: </span>
                  <span className={question.is_correct ? 'text-green-600' : 'text-red-600'}>
                    {question.student_answer || 'No answer'}
                  </span>
                  <span className="ml-4 font-semibold">Correct answer: </span>
                  <span className="text-green-600">{question.correct_option}</span>
                </div>
              </div>

              {/* Explanation if available */}
              {question.explanation && (
                <div className={`mt-4 p-4 rounded-lg ${
                  isDark ? 'bg-blue-900/30' : 'bg-blue-50'
                } border ${
                  isDark ? 'border-blue-700' : 'border-blue-200'
                }`}>
                  <div className={`flex items-center mb-2 ${
                    isDark ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    <BookOpen size={16} className="mr-2" />
                    <span className="font-semibold">Explanation:</span>
                  </div>
                  <div className={`text-sm ${
                    isDark ? 'text-blue-200' : 'text-blue-800'
                  }`}>
                    {question.explanation}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back to Home Button */}
        <div className="text-center mt-8">
          <button
            onClick={onBack}
            className={`px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 ${
              isDark
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Back to Results
          </button>
        </div>
      </div>
    </div>
  );
}
