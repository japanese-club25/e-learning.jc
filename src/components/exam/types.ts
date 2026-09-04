export interface Question {
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

export interface StudentData {
  student: {
    id: string;
    name: string;
    class: string;
    exam_code: string;
    category: string;
  };
  exam: {
    id: string;
    exam_code: string;
    category: string;
    duration: number;
    start_time: string | null;
    end_time: string | null;
  };
}

export interface ExamResults {
  passed: boolean;
  score: number;
  totalQuestions: number;
  percentage: number;
}
