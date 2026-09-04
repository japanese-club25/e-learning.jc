"use client";

import React from 'react';
import type { Question, QuestionFormData, Exam } from './types';

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface QuestionFormProps {
  showForm: boolean;
  editingQuestion: Question | null;
  formData: QuestionFormData;
  exams: Exam[];
  onFormDataChange: (data: QuestionFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function QuestionForm({
  showForm,
  editingQuestion,
  formData,
  exams,
  onFormDataChange,
  onSubmit,
  onCancel
}: QuestionFormProps) {
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);

  // Revoke the blob URL so repeated picks don't leak object URLs.
  React.useEffect(() => {
    if (!formData.image) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(formData.image);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.image]);

  if (!showForm) return null;

  const handleExamToggle = (examId: string, checked: boolean) => {
    if (checked) {
      onFormDataChange({ 
        ...formData, 
        exam_ids: [...formData.exam_ids, examId] 
      });
    } else {
      onFormDataChange({ 
        ...formData, 
        exam_ids: formData.exam_ids.filter(id => id !== examId) 
      });
    }
  };

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageError(null);
      onFormDataChange({ ...formData, image: null });
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Image must be JPEG, PNG or WebP');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image must not exceed 4MB');
      return;
    }

    setImageError(null);
    onFormDataChange({ ...formData, image: file, remove_image: false });
  };

  const handleRemoveImage = () => {
    setImageError(null);
    onFormDataChange({
      ...formData,
      image: null,
      // Only tell the server to drop the stored asset when one exists.
      remove_image: Boolean(formData.image_url)
    });
  };

  const previewUrl = localPreview ?? (formData.remove_image ? null : formData.image_url ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onCancel}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit} className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {editingQuestion ? 'Edit Question' : 'Create New Question'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exams *
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {exams.map((exam) => (
                  <label key={exam.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.exam_ids.includes(exam.id)}
                      onChange={(e) => handleExamToggle(exam.id, e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-900">
                      {exam.name} ({exam.exam_code})
                    </span>
                  </label>
                ))}
                {exams.length === 0 && (
                  <p className="text-sm text-gray-500">No exams available</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text *
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) => onFormDataChange({ ...formData, question_text: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-sm sm:text-base"
                rows={3}
                placeholder="Enter the question text"
                required
              />
            </div>

            <div>
              <label
                htmlFor="question-image"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Question Image (Optional)
              </label>
              <input
                id="question-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                aria-describedby="question-image-help"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm sm:text-base file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p id="question-image-help" className="mt-1 text-xs text-gray-500">
                JPEG, PNG or WebP. Max 4MB.
              </p>
              {imageError && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {imageError}
                </p>
              )}
              {previewUrl && (
                <div className="mt-3 flex items-start gap-3">
                  <img
                    src={previewUrl}
                    alt="Question image preview"
                    className="max-h-40 rounded-lg border border-gray-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option A *
                </label>
                <input
                  type="text"
                  value={formData.option_a}
                  onChange={(e) => onFormDataChange({ ...formData, option_a: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-sm sm:text-base"
                  placeholder="Enter option A"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option B *
                </label>
                <input
                  type="text"
                  value={formData.option_b}
                  onChange={(e) => onFormDataChange({ ...formData, option_b: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-sm sm:text-base"
                  placeholder="Enter option B"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option C *
                </label>
                <input
                  type="text"
                  value={formData.option_c}
                  onChange={(e) => onFormDataChange({ ...formData, option_c: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-sm sm:text-base"
                  placeholder="Enter option C"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option D *
                </label>
                <input
                  type="text"
                  value={formData.option_d}
                  onChange={(e) => onFormDataChange({ ...formData, option_d: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-sm sm:text-base"
                  placeholder="Enter option D"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer *
              </label>
              <select
                value={formData.correct_option}
                onChange={(e) => onFormDataChange({ ...formData, correct_option: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-sm sm:text-base"
                required
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation (Optional)
              </label>
              <textarea
                value={formData.explanation || ''}
                onChange={(e) => onFormDataChange({ ...formData, explanation: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white text-sm sm:text-base"
                rows={3}
                placeholder="Enter explanation for the correct answer (will be shown in review)"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm sm:text-base"
            >
              {editingQuestion ? 'Update' : 'Create'} Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
