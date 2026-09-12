import React from 'react';
import { Cherry } from 'lucide-react'; // Using cherry as an icon, substitute with available icon

interface JapaneseCardProps {
  title: {
    jp: string;
    en: string;
  };
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
}

export function JapaneseCard({ title, children, variant = 'default', className = '' }: JapaneseCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'from-indigo-50 to-blue-50 border-indigo-200/50';
      case 'success':
        return 'from-emerald-50 to-teal-50 border-emerald-200/50';
      case 'warning':
        return 'from-amber-50 to-orange-50 border-amber-200/50';
      default:
        return 'from-slate-50 to-slate-100 border-slate-200/50';
    }
  };

  return (
    <div className={`
      bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border 
      hover:shadow-2xl hover:transform hover:scale-[1.02] 
      transition-all duration-300 overflow-hidden
      ${getVariantClasses()} ${className}
    `}>
      {/* Header with Japanese aesthetic */}
      <div className={`bg-gradient-to-r ${getVariantClasses()} p-4 border-b border-slate-200/30`}>
        <div className="flex items-center space-x-3">
          <div className="w-2 h-8 bg-gradient-to-b from-indigo-400 to-purple-600 rounded-full shadow-sm"></div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg tracking-tight">{title.jp}</h3>
            <p className="text-slate-600 text-sm font-medium">{title.en}</p>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {children}
      </div>
      
      {/* Decorative bottom element */}
      <div className="h-1 bg-gradient-to-r from-transparent via-indigo-200 to-transparent"></div>
    </div>
  );
}

// Example usage component
export function JapaneseThemeShowcase() {
  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <JapaneseCard 
          title={{ jp: "Design System", en: "Design System" }}
          variant="primary"
        >
          <p className="text-slate-600 leading-relaxed mb-4">
            This admin dashboard embraces Japanese design principles with clean lines, 
            subtle gradients, and harmonious color palettes inspired by traditional Japanese aesthetics.
          </p>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 font-medium">
              Primary
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 font-medium">
              Success
            </button>
          </div>
        </JapaneseCard>
      </div>
    </div>
  );
}
