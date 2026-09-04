import React from 'react';
import { Flag, CheckCircle } from 'lucide-react';

interface Question {
  id: string;
  questionNumber: number;
  question_text: string;
  image_url?: string | null;
  options: Array<{
    id: string;
    text: string;
  }>;
  categories: string[];
}

interface QuestionContentProps {
  question: Question;
  selectedAnswer: string;
  onAnswerSelect: (questionId: string, optionId: string) => void;
  isDark: boolean;
  questionNumber: number;
  totalQuestions: number;
  isFlagged: boolean;
  onFlag: () => void;
}

export default function QuestionContent({ 
  question, 
  selectedAnswer, 
  onAnswerSelect, 
  isDark, 
  questionNumber, 
  totalQuestions,
  isFlagged,
  onFlag 
}: QuestionContentProps) {
  return (
    <div className={`backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border ${
      isDark 
        ? 'bg-slate-800/30 border-purple-500/20' 
        : 'bg-white/80 border-blue-200/50'
    }`}>
      
      {/* Question Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className={`text-xs sm:text-sm font-medium ${
          isDark ? 'text-purple-300' : 'text-blue-600'
        }`}>
          Question {questionNumber} of {totalQuestions}
        </div>
        
        <button
          onClick={onFlag}
          className={`p-1.5 sm:p-2 rounded-full transition-all duration-300 ${
            isFlagged
              ? 'bg-yellow-500 text-white'
              : isDark
                ? 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Question Text */}
      <div className={`text-lg sm:text-xl font-semibold mb-6 sm:mb-8 leading-relaxed ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {question.question_text}
      </div>

      {/* Question Image */}
      {question.image_url && (
        <img
          src={question.image_url}
          alt={`Image for question ${questionNumber}`}
          className={`mb-6 sm:mb-8 max-h-80 w-auto rounded-xl border object-contain ${
            isDark ? 'border-purple-500/20' : 'border-blue-200/50'
          }`}
        />
      )}

      {/* Options */}
      <div className="space-y-3 sm:space-y-4">
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => onAnswerSelect(question.id, option.id)}
            className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
              selectedAnswer === option.id
                ? isDark
                  ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                  : 'border-blue-500 bg-blue-50 text-blue-900'
                : isDark
                  ? 'border-slate-600 bg-slate-700/30 text-gray-300 hover:border-purple-400 active:bg-slate-600/40'
                  : 'border-gray-200 bg-white/50 text-gray-700 hover:border-blue-300 active:bg-blue-50/70'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selectedAnswer === option.id
                  ? isDark
                    ? 'border-purple-400 bg-purple-500'
                    : 'border-blue-500 bg-blue-500'
                  : isDark
                    ? 'border-slate-500'
                    : 'border-gray-300'
              }`}>
                {selectedAnswer === option.id && (
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-sm sm:text-base">{option.id}.</span>
                <span className="ml-2 text-sm sm:text-base break-words">{option.text}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
