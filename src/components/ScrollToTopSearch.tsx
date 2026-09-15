import React, { useState, useEffect } from 'react';
import { ArrowUp, Search } from 'lucide-react';

interface ScrollToTopSearchProps {
  onFocusSearch?: () => void;
}

export const ScrollToTopSearch: React.FC<ScrollToTopSearchProps> = ({ onFocusSearch }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTopAndSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (onFocusSearch) {
      setTimeout(() => {
        onFocusSearch();
      }, 300);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <button
        type="button"
        onClick={scrollToTopAndSearch}
        className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-indigo-500/25 text-xs font-medium transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
        title="پرش به بالا و جستجو (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span>جستجو / بالا</span>
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
