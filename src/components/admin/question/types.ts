export interface Question {
  id: string;
  exam_questions?: Array<{
    exam: {
      id: string;
      name: string;
      exam_code: string;
    };
  }>;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionFormData {
  exam_ids: string[];
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  /** Newly picked file, uploaded on submit. */
  image?: File | null;
  /** Existing Cloudinary URL shown as preview when editing. */
  image_url?: string | null;
  /** Drop the existing image on submit. */
  remove_image?: boolean;
}

export interface Exam {
  id: string;
  name: string;
  exam_code: string;
}

export type SortField = 'question_text' | 'created_at' | 'correct_option';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'cards' | 'table';
