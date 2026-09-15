import React from 'react';
import {
  Play,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  StopCircle,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { TranslationEngine } from '../types';

interface BatchToolbarProps {
  untranslatedCount: number;
  selectedCount: number;
  isTranslating: boolean;
  isSyncingSheet: boolean;
  engine: TranslationEngine;
  onTranslateAllUntranslated: () => void;
  onTranslateSelected: () => void;
  onReapplyGlossaryToAll: () => void;
  onClearAllTranslations: () => void;
  onSelectAllVisible: () => void;
  onDeselectAll: () => void;
  isAllVisibleSelected: boolean;
  // Google Sheet Sync Props
  hasSheetUrl: boolean;
  onQuickSyncSheet: () => void;
  lastSyncTime?: number | null;
  // Progress
  currentProgress?: {
    total: number;
    completed: number;
    currentText: string;
  };
  onCancelTranslation?: () => void;
}

export const BatchToolbar: React.FC<BatchToolbarProps> = ({
  untranslatedCount,
  selectedCount,
  isTranslating,
  isSyncingSheet,
  engine,
  onTranslateAllUntranslated,
  onTranslateSelected,
  onReapplyGlossaryToAll,
  onClearAllTranslations,
  onSelectAllVisible,
  onDeselectAll,
  isAllVisibleSelected,
  hasSheetUrl,
  onQuickSyncSheet,
  lastSyncTime,
  currentProgress,
  onCancelTranslation,
}) => {
  const formatTime = (ts: number | null | undefined) => {
    if (!ts) return null;
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'چند لحظه پیش';
    if (diffMin < 60) return `${diffMin} دقیقه پیش`;
    return new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-slate-50 border-b border-slate-200 py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* Main action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Select all & Batch translation triggers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Select Visible */}
            <button
              id="batch-select-all-btn"
              type="button"
              onClick={isAllVisibleSelected ? onDeselectAll : onSelectAllVisible}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
            >
              {isAllVisibleSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  <span>لغو انتخاب همه</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>انتخاب ردیف‌ها</span>
                </>
              )}
            </button>

            {/* Translate Untranslated */}
            <button
              id="batch-translate-untranslated-btn"
              type="button"
              onClick={onTranslateAllUntranslated}
              disabled={isTranslating || isSyncingSheet || untranslatedCount === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {engine === 'gemini' ? (
                <Sparkles className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
              ) : (
                <Play className={`w-3.5 h-3.5 fill-current ${isTranslating ? 'animate-pulse' : ''}`} />
              )}
              <span>
                ترجمه خودکار همه ({untranslatedCount.toLocaleString('fa-IR')} مورد)
              </span>
            </button>

            {/* Translate Selected */}
            {selectedCount > 0 && (
              <button
                id="batch-translate-selected-btn"
                type="button"
                onClick={onTranslateSelected}
                disabled={isTranslating || isSyncingSheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all disabled:opacity-40 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ترجمه انتخاب شده‌ها ({selectedCount.toLocaleString('fa-IR')})</span>
              </button>
            )}

            {/* Prominent Google Sheet Update Button */}
            <button
              id="batch-sync-sheet-btn"
              type="button"
              onClick={onQuickSyncSheet}
              disabled={isSyncingSheet || isTranslating}
              title="بروزرسانی فوری کلمات از گوگل شیت"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                hasSheetUrl
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-current ${isSyncingSheet ? 'animate-spin' : ''}`}
              />
              <span>
                {isSyncingSheet
                  ? 'در حال بروزرسانی از گوگل شیت...'
                  : hasSheetUrl
                  ? 'بروزرسانی کلمات از گوگل شیت'
                  : 'تنظیم و اتصال گوگل شیت'}
              </span>
              {hasSheetUrl && lastSyncTime && (
                <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded text-emerald-700 font-mono">
                  {formatTime(lastSyncTime)}
                </span>
              )}
            </button>
          </div>

          {/* Right: Re-apply glossary and clear */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="batch-reapply-glossary-btn"
              type="button"
              onClick={onReapplyGlossaryToAll}
              disabled={isTranslating || isSyncingSheet}
              title="اعمال مجدد کلمات مصوب روی تمام متن‌های ترجمه شده فعلی"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>اعمال مجدد واژه‌نامه</span>
            </button>

            <button
              id="batch-clear-translations-btn"
              type="button"
              onClick={onClearAllTranslations}
              disabled={isTranslating}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاک‌سازی ترجمه‌ها</span>
            </button>
          </div>
        </div>

        {/* Live Translation Progress Banner */}
        {isTranslating && currentProgress && (
          <div className="bg-indigo-50/90 border border-indigo-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              <div>
                <span className="font-semibold text-indigo-950">
                  در حال ترجمه خودکار با اولویت واژه‌نامه ({currentProgress.completed.toLocaleString('fa-IR')} از {currentProgress.total.toLocaleString('fa-IR')})
                </span>
                <p className="text-indigo-800 truncate max-w-md mt-0.5 font-mono text-[11px]" dir="ltr">
                  {currentProgress.currentText}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 bg-indigo-200 h-2 rounded-full overflow-hidden shrink-0">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${currentProgress.total > 0 ? (currentProgress.completed / currentProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>

              {onCancelTranslation && (
                <button
                  type="button"
                  onClick={onCancelTranslation}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shrink-0"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>توقف ترجمه</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
