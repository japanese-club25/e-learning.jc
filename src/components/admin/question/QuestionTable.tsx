"use client";

import React from 'react';
import { ChevronUp, ChevronDown, Edit, Trash2 } from 'lucide-react';
import type { Question, SortField, SortDirection } from './types';

interface QuestionTableProps {
  questions: Question[];
  currentPage: number;
  itemsPerPage: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
}

export function QuestionTable({
  questions,
  currentPage,
  itemsPerPage,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete
}: QuestionTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('question_text')}
              >
                <div className="flex items-center">
                  <span className="mr-1">Question</span>
                  {sortField === 'question_text' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-indigo-600" /> : <ChevronDown className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                Exam
              </th>
              <th 
                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell"
                onClick={() => onSort('correct_option')}
              >
                <div className="flex items-center">
                  <span className="mr-1">Answer</span>
                  {sortField === 'correct_option' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-indigo-600" /> : <ChevronDown className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
              </th>
              <th 
                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors hidden lg:table-cell"
                onClick={() => onSort('created_at')}
              >
                <div className="flex items-center">
                  <span className="mr-1">Created</span>
                  {sortField === 'created_at' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 text-indigo-600" /> : <ChevronDown className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
              </th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question, index) => (
              <tr key={question.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 sm:px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {index + 1 + (currentPage - 1) * itemsPerPage}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                        {question.question_text}
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {[
                          { letter: 'A', text: question.option_a, isCorrect: question.correct_option === 'A' },
                          { letter: 'B', text: question.option_b, isCorrect: question.correct_option === 'B' },
                          { letter: 'C', text: question.option_c, isCorrect: question.correct_option === 'C' },
                          { letter: 'D', text: question.option_d, isCorrect: question.correct_option === 'D' }
                        ].map((option) => (
                          <div key={option.letter} className="flex items-center space-x-1">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                              option.isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {option.letter}
                            </span>
                            <span className={`truncate ${
                              option.isCorrect ? 'text-green-700 font-medium' : 'text-gray-600'
                            }`}>
                              {option.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Mobile info */}
                      <div className="mt-2 sm:hidden">
                        {question.exam_questions && question.exam_questions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {question.exam_questions.slice(0, 2).map((eq) => (
                              <span key={eq.exam.id} className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">
                                {eq.exam.name}
                              </span>
                            ))}
                            {question.exam_questions.length > 2 && (
                              <span className="text-xs text-gray-500">+{question.exam_questions.length - 2} more</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Created: {new Date(question.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                  {question.exam_questions && question.exam_questions.length > 0 ? (
                    <div className="space-y-1">
                      {question.exam_questions.slice(0, 2).map((eq) => (
                        <div key={eq.exam.id} className="bg-indigo-50 rounded-md p-2">
                          <div className="text-sm font-medium text-indigo-900">{eq.exam.name}</div>
                          <div className="text-xs text-indigo-600">{eq.exam.exam_code}</div>
                        </div>
                      ))}
                      {question.exam_questions.length > 2 && (
                        <div className="text-xs text-gray-500">+{question.exam_questions.length - 2} more exams</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">No exams</span>
                  )}
                </td>
                <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      question.correct_option === 'A' ? 'bg-green-100 text-green-800' :
                      question.correct_option === 'B' ? 'bg-blue-100 text-blue-800' :
                      question.correct_option === 'C' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {question.correct_option}
                    </span>
                    <span className="ml-2 text-sm text-gray-700">Option {question.correct_option}</span>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(question.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs">
                      {new Date(question.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-4 text-right text-sm font-medium">
                  <div className="flex justify-end space-x-1">
                    <button
                      onClick={() => onEdit(question)}
                      className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Edit question"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(question.id)}
                      className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
