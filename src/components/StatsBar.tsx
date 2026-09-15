import React from 'react';
import { Search, CheckCircle2, Clock, BookOpen, Layers } from 'lucide-react';
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
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  pluralCount,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  selectedCount,
}) => {
  const percent = stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;

  return (
    <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Top row: Stat summary pills & progress */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Stats counters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>کل رشته‌ها:</span>
              <strong className="font-mono text-slate-900">{stats.total.toLocaleString('fa-IR')}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ترجمه شده:</span>
              <strong className="font-mono text-emerald-700">{stats.translated.toLocaleString('fa-IR')}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-100 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>نیاز به ترجمه:</span>
              <strong className="font-mono text-amber-700">{stats.untranslated.toLocaleString('fa-IR')}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-100 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>تطبیق واژه‌نامه:</span>
              <strong className="font-mono text-indigo-700">{stats.glossaryMatched.toLocaleString('fa-IR')}</strong>
            </div>

            {selectedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-medium animate-pulse">
                <span>انتخاب شده:</span>
                <strong className="font-mono text-purple-700">{selectedCount.toLocaleString('fa-IR')}</strong>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3 md:w-64">
            <div className="text-xs font-semibold text-slate-600 shrink-0">
              پیشرفت: <span className="font-mono text-indigo-600">{percent.toLocaleString('fa-IR')}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom row: Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              id="filter-all-btn"
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه ({stats.total.toLocaleString('fa-IR')})
            </button>

            <button
              id="filter-untranslated-btn"
              type="button"
              onClick={() => onFilterChange('untranslated')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'untranslated'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              نیاز به ترجمه ({stats.untranslated.toLocaleString('fa-IR')})
            </button>

            <button
              id="filter-translated-btn"
              type="button"
              onClick={() => onFilterChange('translated')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'translated'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ترجمه شده ({stats.translated.toLocaleString('fa-IR')})
            </button>

            <button
              id="filter-glossary-btn"
              type="button"
              onClick={() => onFilterChange('glossary')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === 'glossary'
                  ? 'bg-indigo-600 text-white'
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
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filter === 'plural'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                رشته‌های جمع ({pluralCount.toLocaleString('fa-IR')})
              </button>
            )}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-strings-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="جستجو در متن یا ترجمه..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
