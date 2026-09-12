"use client"

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LandingNavigationProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export default function LandingNavigation({ isDark, toggleTheme }: LandingNavigationProps) {
  const router = useRouter();

  return (
    <nav className={`fixed top-0 w-full z-50 backdrop-blur-lg border-b transition-all duration-500 ${
      isDark 
        ? 'bg-slate-900/90 border-purple-500/20' 
        : 'bg-white/90 border-red-200/50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className={`text-2xl font-bold transition-colors ${
            isDark ? 'text-purple-300' : 'text-red-600'
          }`}>
            <span className="text-3xl mr-2">学</span>
            LearnJP
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/kanji')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                isDark 
                  ? 'bg-slate-800 text-purple-300 hover:bg-slate-700 border border-purple-500/30' 
                  : 'bg-white text-red-600 hover:bg-red-50 border border-red-200'
              }`}
            >
              🇯🇵 Learn Kanji
            </button>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDark 
                  ? 'bg-purple-800 text-yellow-300 hover:bg-purple-700' 
                  : 'bg-red-100 text-orange-600 hover:bg-red-200'
              }`}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={() => router.push('/login')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                isDark 
                  ? 'bg-purple-600 text-white hover:bg-purple-500' 
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
