export interface Student {
  id: string;
  name: string;
  email: string | null;
  class: string;
  is_first_login: boolean;
  started_at: string | null;
  violations: number;
  is_submitted: boolean;
  created_at: string;
  scores?: Array<{
    id: string;
    score: number;
    total_questions: number;
    percentage: number | string | any; // Can be Decimal from Prisma
    created_at: string;
    exam: {
      id: string;
      category: 'Gengo' | 'Bunka';
      created_at: string;
    };
  }>;
  answers?: Array<{
    id: string;
    answer: 'A' | 'B' | 'C' | 'D' | null;
    is_correct: boolean | null;
    created_at: string;
    question: {
      id: string;
      question_text: string;
      correct_option: 'A' | 'B' | 'C' | 'D';
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
    };
  }>;
}

export interface StudentStats {
  totalScore: number;
  totalExams: number;
  averageScore: number;
  bestScore: number;
  rank: number;
}

export type SortField = 'name' | 'class' | 'status' | 'performance' | 'violations' | 'created_at';
export type SortDirection = 'asc' | 'desc';
export type CategoryFilter = 'all' | 'Gengo' | 'Bunka';
export type StatusFilter = 'all' | 'submitted' | 'in-progress';
export type ViewMode = 'table' | 'card';
