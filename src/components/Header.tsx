import React, { useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  BookOpen,
  Sparkles,
  Settings,
  FileCode,
  RefreshCw,
} from 'lucide-react';
import { TranslationEngine } from '../types';

interface HeaderProps {
  fileName: string;
  hasActiveFile: boolean;
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  onCloseFile: () => void;
  onOpenGlossaryModal: () => void;
  onOpenHeaderModal: () => void;
  onDownloadPO: () => void;
  onDownloadMO: () => void;
  engine: TranslationEngine;
  onEngineChange: (engine: TranslationEngine) => void;
  totalTermsCount: number;
  isSyncingSheet: boolean;
  onQuickSyncSheet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  hasActiveFile,
  onFileUpload,
  onLoadSample,
  onCloseFile,
  onOpenGlossaryModal,
  onOpenHeaderModal,
  onDownloadPO,
  onDownloadMO,
  engine,
  onEngineChange,
  totalTermsCount,
  isSyncingSheet,
  onQuickSyncSheet,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  سیستم ترجمه فایل‌های PO و MO
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  اولویت واژه‌نامه مصوب
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>فایل فعال: <strong className="text-slate-700 font-mono">{fileName}</strong></span>
                <span>•</span>
                <span>{totalTermsCount.toLocaleString('fa-IR')} واژه مصوب فعال</span>
              </p>
            </div>
          </div>

          {/* Engine Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Engine Toggle with clear FREE badge */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                id="engine-google-btn"
                type="button"
                onClick={() => onEngineChange('google')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                  engine === 'google'
                    ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-400/50'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="اتصال مستقیم و ۱۰۰٪ رایگان به گوگل ترنسلیت - بدون نیاز به پرداخت یا کلید API"
              >
                <span>گوگل ترنسلیت</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
                  رایگان
                </span>
              </button>
              <button
                id="engine-gemini-btn"
                type="button"
                onClick={() => onEngineChange('gemini')}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                  engine === 'gemini'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>هوش مصنوعی</span>
              </button>
            </div>

            {/* Quick Sheet Sync */}
            <button
              id="header-quick-sync-btn"
              type="button"
              onClick={onQuickSyncSheet}
              disabled={isSyncingSheet}
              title="بروزرسانی مستقیم لغات از گوگل شیت"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              <span>بروزرسانی شیت</span>
            </button>

            {/* Glossary / Terms DB */}
            <button
              id="header-glossary-btn"
              type="button"
              onClick={onOpenGlossaryModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>واژه‌نامه مصوب</span>
            </button>

            {/* Header / Meta settings */}
            <button
              id="header-meta-settings-btn"
              type="button"
              onClick={onOpenHeaderModal}
              title="تنظیمات افزونه، پوسته، یا هسته وردپرس"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">تنظیمات پروژه</span>
            </button>

            {/* Upload File */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".po,.mo,.pot"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              id="header-upload-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>آپلود PO / MO</span>
            </button>

            {/* Close file / New empty project */}
            {hasActiveFile && (
              <button
                id="header-close-file-btn"
                type="button"
                onClick={onCloseFile}
                title="بستن فایل فعلی و شروع پروژه جدید"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 text-xs font-medium transition-colors"
              >
                <span>بستن فایل</span>
              </button>
            )}

            {/* Downloads */}
            <div className="flex items-center gap-1">
              <button
                id="header-download-po-btn"
                type="button"
                onClick={onDownloadPO}
                disabled={!hasActiveFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود PO</span>
              </button>

              <button
                id="header-download-mo-btn"
                type="button"
                onClick={onDownloadMO}
                disabled={!hasActiveFile}
                title="دانلود فایل باینری کامپایل شده .MO مخصوص وردپرس"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود MO (باینری)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
