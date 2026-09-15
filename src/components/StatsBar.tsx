import React, { useEffect, useRef } from 'react';
import { Search, CheckCircle2, Clock, BookOpen, Layers, X } from 'lucide-react';
import { TranslationStats } from '../types';

export type FilterType = 'all' | 'untranslated' | 'translated' | 'glossary' | 'plural';

interface StatsBarProps {
  stats: TranslationStats;
  pluralCount: number;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCount: number;
  matchedCount?: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  pluralCount,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  selectedCount,
  matchedCount,
}) => {
  const percent = stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut (Ctrl+K or /) to instantly jump & focus search box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an active text input or textarea, don't hijack unless Ctrl+K
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        onSearchChange('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-shadow duration-200 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-2.5">
        {/* Top row: Stat summary pills & progress */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Stats counters */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>کل رشته‌ها:</span>
              <strong className="font-mono text-slate-900">{stats.total.toLocaleString('fa-IR')}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ترجمه شده:</span>
              <strong className="font-mono text-emerald-700">{stats.translated.toLocaleString('fa-IR')}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-100 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>نیاز به ترجمه:</span>
              <strong className="font-mono text-amber-700">{stats.untranslated.toLocaleString('fa-IR')}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-100 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>تطبیق واژه‌نامه:</span>
              <strong className="font-mono text-indigo-700">{stats.glossaryMatched.toLocaleString('fa-IR')}</strong>
            </div>

            {selectedCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-medium animate-pulse">
                <span>انتخاب شده:</span>
                <strong className="font-mono text-purple-700">{selectedCount.toLocaleString('fa-IR')}</strong>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 md:w-56">
            <div className="text-xs font-semibold text-slate-600 shrink-0">
              پیشرفت: <span className="font-mono text-indigo-600">{percent.toLocaleString('fa-IR')}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom row: Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1.5 border-t border-slate-100">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs scrollbar-none">
            <button
              id="filter-all-btn"
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه ({stats.total.toLocaleString('fa-IR')})
            </button>

            <button
              id="filter-untranslated-btn"
              type="button"
              onClick={() => onFilterChange('untranslated')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'untranslated'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              نیاز به ترجمه ({stats.untranslated.toLocaleString('fa-IR')})
            </button>

            <button
              id="filter-translated-btn"
              type="button"
              onClick={() => onFilterChange('translated')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'translated'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ترجمه شده ({stats.translated.toLocaleString('fa-IR')})
            </button>

            <button
              id="filter-glossary-btn"
              type="button"
              onClick={() => onFilterChange('glossary')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'glossary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              دارای کلمه مصوب ({stats.glossaryMatched.toLocaleString('fa-IR')})
            </button>

            {pluralCount > 0 && (
              <button
                id="filter-plural-btn"
                type="button"
                onClick={() => onFilterChange('plural')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filter === 'plural'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                رشته‌های جمع ({pluralCount.toLocaleString('fa-IR')})
              </button>
            )}
          </div>

          {/* Sticky Search box */}
          <div className="relative w-full sm:w-80 flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="search-strings-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="جستجو در متن یا ترجمه..."
              className="w-full pl-16 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />

            {/* Clear search or shortcut hint */}
            <div className="absolute left-2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  title="پاک کردن جستجو (Esc)"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-200/80 rounded border border-slate-300">
                  Ctrl+K
                </kbd>
              )}
              {matchedCount !== undefined && searchQuery && (
                <span className="text-[10px] text-indigo-600 font-medium whitespace-nowrap bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                  {matchedCount.toLocaleString('fa-IR')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
