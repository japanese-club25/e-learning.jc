"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTabMonitor } from '@/hooks/useTabMonitor';
import {
  ExamHeader,
  QuestionContent,
  NavigationPanel,
  ViolationWarningModal,
  ExamResults,
  ExamReview
} from '@/components/exam';
import { Question, StudentData } from '@/components/exam/types';

export default function ExamTestPage() {
  const router = useRouter();
  const params = useParams();
  const category = params.exam_category as string;

  const [isDark, setIsDark] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set<number>());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [violations, setViolations] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [nextViolationCheck, setNextViolationCheck] = useState(10);

  const toggleTheme = () => setIsDark(!isDark);

  const { violationCount } = useTabMonitor(
    () => {
      handleSubmitExam();
    },
    3,
    async (count) => {
      setViolations(count);
      setShowViolationWarning(true);
      
      // Update violations in database immediately
      if (studentData) {
        try {
          await fetch('/api/student/update-violations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              studentId: studentData.student.id,
              violations: count
            }),
          });
        } catch (error) {
          console.error('Failed to update violations:', error);
        }
      }
      
      // Hide warning after 3 seconds
      setTimeout(() => setShowViolationWarning(false), 3000);
    }
  );

  // Load student data and questions on component mount
  useEffect(() => {
    const loadExamData = async () => {
      try {
        // Get student data from localStorage
        const storedData = localStorage.getItem('studentData');
        if (!storedData) {
          router.push(`/exam/${category}`);
          return;
        }

        const data: StudentData = JSON.parse(storedData);
        setStudentData(data);

        // Set timer based on exam duration
        setTimeLeft(data.exam.duration * 60); // Convert minutes to seconds
        
        // Fetch questions
        const response = await fetch(`/api/student/questions/${data.student.category}?examCode=${data.student.exam_code}`);
        const questionsData = await response.json();

        if (questionsData.success) {
          setQuestions(questionsData.questions);
          setExamStarted(true);
        } else {
          setError(questionsData.message);
        }
      } catch (error) {
        console.error('Error loading exam data:', error);
        setError('Failed to load exam data');
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [category, router]);

  // Timer countdown
  useEffect(() => {
    if (examStarted && timeLeft > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitExam(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [examStarted, timeLeft, showResults]);

  // Violation check countdown timer
  useEffect(() => {
    if (examStarted && !showResults) {
      const violationTimer = setInterval(() => {
        setNextViolationCheck(prev => {
          if (prev <= 1) {
            return 10; // Reset to 10 seconds
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(violationTimer);
    }
  }, [examStarted, showResults]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleFlagQuestion = () => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion)) {
        newSet.delete(currentQuestion);
      } else {
        newSet.add(currentQuestion);
      }
      return newSet;
    });
  };

  const handleReviewAnswers = async () => {
    if (!studentData) return;

    try {
      const response = await fetch(`/api/student/exam-review?studentId=${studentData.student.id}&examCode=${studentData.student.exam_code}`);
      const result = await response.json();

      if (result.success) {
        setReviewData(result.data);
        setShowReview(true);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Error loading review data:', error);
      setError('Failed to load review data');
    }
  };

  const handleBackFromReview = () => {
    setShowReview(false);
    setReviewData(null);
  };

  const handleSubmitExam = async () => {
    if (!studentData || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Prepare answers in the format expected by the API
      const formattedAnswers = questions.map(question => ({
        questionId: question.id,
        selectedOption: answers[question.id] || 'A' // Default to A if no answer selected
      }));

      const response = await fetch('/api/student/submit-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: studentData.student.id,
          examCode: studentData.student.exam_code,
          answers: formattedAnswers,
          violations: violations, // Include violation count in submission
          autoSubmitted: violations >= 3 // Flag if auto-submitted due to violations
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowResults(true);
        // Store results for display
        localStorage.setItem('examResults', JSON.stringify(result.result));
        // Clear student data
        localStorage.removeItem('studentData');
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Submit exam error:', error);
      setError('Failed to submit exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const getProgressPercentage = () => {
    return (getAnsweredCount() / questions.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/exam/${category}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (showReview && reviewData) {
    return (
      <ExamReview 
        reviewData={reviewData}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onBack={handleBackFromReview}
      />
    );
  }

  if (showResults) {
    const results = JSON.parse(localStorage.getItem('examResults') || '{}');
    return (
      <ExamResults 
        results={results} 
        studentData={studentData || undefined}
        isDark={isDark} 
        toggleTheme={toggleTheme}
        onReviewAnswers={handleReviewAnswers}
      />
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className={`min-h-screen transition-all duration-700 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
    }`}>
      
      {/* Violation Warning Modal */}
      <ViolationWarningModal 
        show={showViolationWarning}
        violations={violations}
        isDark={isDark}
      />

      {/* Header */}
      <ExamHeader 
        isDark={isDark}
        toggleTheme={toggleTheme}
        timeLeft={timeLeft}
        violations={violations}
        studentData={studentData}
        answeredCount={getAnsweredCount()}
        totalQuestions={questions.length}
        progressPercentage={getProgressPercentage()}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Question Panel */}
          <div className="lg:col-span-3 order-1">
            {currentQ && (
              <QuestionContent 
                question={currentQ}
                selectedAnswer={answers[currentQ.id]}
                onAnswerSelect={handleAnswerSelect}
                isDark={isDark}
                questionNumber={currentQuestion + 1}
                totalQuestions={questions.length}
                isFlagged={flaggedQuestions.has(currentQuestion)}
                onFlag={handleFlagQuestion}
              />
            )}
          </div>

          {/* Navigation Panel */}
          <div className="lg:col-span-1 order-2 lg:order-2">
            <NavigationPanel 
              questions={questions}
              answers={answers}
              currentQuestion={currentQuestion}
              onQuestionSelect={setCurrentQuestion}
              flaggedQuestions={flaggedQuestions}
              isDark={isDark}
              violations={violations}
              nextViolationCheck={nextViolationCheck}
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              currentQuestion === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDark
                  ? 'bg-purple-700 text-white hover:bg-purple-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Previous</span>
          </button>

          <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">Submit Exam</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isDark
                    ? 'bg-purple-700 text-white hover:bg-purple-600'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <span className="text-sm sm:text-base">Next</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
