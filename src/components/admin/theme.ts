// Shared admin theme: orange and white.

export const japaneseTheme = {
  // Color schemes
  colors: {
    primary: {
      gradient: 'from-orange-600 to-orange-700',
      solid: 'bg-orange-600',
      light: 'bg-orange-50',
      text: 'text-orange-700'
    },
    secondary: {
      gradient: 'from-orange-500 to-orange-600',
      solid: 'bg-orange-500',
      light: 'bg-orange-50',
      text: 'text-orange-700'
    },
    accent: {
      gradient: 'from-orange-400 to-orange-500',
      solid: 'bg-orange-400',
      light: 'bg-orange-50',
      text: 'text-orange-700'
    },
    success: {
      gradient: 'from-orange-500 to-orange-600',
      solid: 'bg-orange-500',
      light: 'bg-orange-50',
      text: 'text-orange-700'
    },
    warning: {
      gradient: 'from-orange-500 to-orange-600',
      solid: 'bg-orange-500',
      light: 'bg-orange-50',
      text: 'text-orange-700'
    },
    danger: {
      gradient: 'from-red-500 to-red-600',
      solid: 'bg-red-500',
      light: 'bg-red-50',
      text: 'text-red-700'
    }
  },

  // Background styles
  backgrounds: {
    main: 'bg-orange-50/30',
    card: 'bg-white',
    cardHover: 'hover:shadow-lg',
    sidebar: 'bg-white'
  },

  // Border and shadow styles
  effects: {
    border: 'border border-orange-100',
    borderHover: 'hover:border-orange-300',
    shadow: 'shadow-sm',
    shadowHover: 'hover:shadow-lg',
    rounded: 'rounded-xl',
    transition: 'transition-colors duration-200'
  },

  // Button styles
  buttons: {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 transition-colors',
    secondary: 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors',
    success: 'bg-orange-500 text-white hover:bg-orange-600 transition-colors',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300',
    ghost: 'text-slate-600 hover:text-orange-700 hover:bg-orange-50 transition-colors'
  },

  // Typography
  typography: {
    heading: 'font-bold text-slate-900 tracking-tight',
    subheading: 'font-semibold text-slate-700 tracking-wide',
    body: 'text-slate-600',
    caption: 'text-slate-500 text-sm font-medium'
  },

  // Animation classes
  animations: {
    fadeIn: 'animate-in fade-in duration-300',
    slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
    scaleIn: 'animate-in zoom-in-95 duration-300'
  }
};

// Japanese text translations
export const japaneseText = {
  // Common actions
  add: { jp: '追加', en: 'Add' },
  edit: { jp: '編集', en: 'Edit' },
  delete: { jp: '削除', en: 'Delete' },
  save: { jp: '保存', en: 'Save' },
  cancel: { jp: 'キャンセル', en: 'Cancel' },
  search: { jp: '検索', en: 'Search' },
  filter: { jp: 'フィルター', en: 'Filter' },
  view: { jp: '表示', en: 'View' },
  
  // Navigation
  overview: { jp: '概要', en: 'Overview' },
  questions: { jp: '質問', en: 'Questions' },
  exams: { jp: '試験', en: 'Exams' },
  students: { jp: '学生', en: 'Students' },
  
  // Status
  active: { jp: 'アクティブ', en: 'Active' },
  inactive: { jp: '非アクティブ', en: 'Inactive' },
  loading: { jp: '読み込み中', en: 'Loading' },
  
  // Messages
  noData: { jp: 'データがありません', en: 'No data available' },
  success: { jp: '成功', en: 'Success' },
  error: { jp: 'エラー', en: 'Error' },
  
  // Admin specific
  administrator: { jp: '管理者', en: 'Administrator' },
  adminPanel: { jp: '管理パネル', en: 'Admin Panel' },
  quickActions: { jp: 'クイックアクション', en: 'Quick Actions' },
  recentActivity: { jp: '最近の活動', en: 'Recent Activity' },
  topStudents: { jp: '優秀な学生', en: 'Top Students' }
};

// Utility functions for consistent styling
export const getCardClasses = (variant: 'default' | 'primary' | 'secondary' = 'default') => {
  const base = `${japaneseTheme.backgrounds.card} ${japaneseTheme.effects.rounded} ${japaneseTheme.effects.shadow} ${japaneseTheme.effects.border} ${japaneseTheme.effects.transition} `;
  
  switch (variant) {
    case 'primary':
      return `${base} border-indigo-200/50`;
    case 'secondary':
      return `${base} border-slate-200/50`;
    default:
      return base;
  }
};

export const getButtonClasses = (variant: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' = 'primary') => {
  const base = `px-4 py-2 rounded-xl font-medium ${japaneseTheme.effects.transition}`;
  return `${base} ${japaneseTheme.buttons[variant]}`;
};

export const getIconButtonClasses = (variant: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' = 'ghost') => {
  const base = `p-2 rounded-lg ${japaneseTheme.effects.transition}`;
  return `${base} ${japaneseTheme.buttons[variant]}`;
};
