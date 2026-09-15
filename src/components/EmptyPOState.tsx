import React, { useRef, useState } from 'react';
import { Upload, FileText, Plus, Sparkles, ShieldCheck, Cloud, Cpu, ArrowRight } from 'lucide-react';

interface EmptyPOStateProps {
  onFileUpload: (file: File) => void;
  onCreateEmptyFile: () => void;
  onLoadSample: () => void;
}

export const EmptyPOState: React.FC<EmptyPOStateProps> = ({
  onFileUpload,
  onCreateEmptyFile,
  onLoadSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Upload Zone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 bg-white shadow-xs ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".po,.mo,.pot"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5 shadow-xs">
          <Upload className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          فایل ترجمه وردپرس (.po یا .mo) خود را بارگذاری کنید
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
          فایل را بکشید و در این قسمت رها کنید، یا از دکمه زیر برای انتخاب از کامپیوتر خود استفاده کنید.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all duration-150 flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>انتخاب فایل PO / MO از سیستم</span>
          </button>

          <button
            type="button"
            onClick={onCreateEmptyFile}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد پروژه ترجمه خالی</span>
          </button>
        </div>

        {/* Optional test sample link for debugging without cluttering */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={onLoadSample}
            className="text-xs text-slate-400 hover:text-indigo-600 underline transition-colors"
          >
            یا بارگذاری فایل نمونه پیش‌فرض وردپرس برای بررسی نحوه عملکرد
          </button>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-right">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm text-slate-800">واژه‌نامه مصوب و گوگل‌شیت</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            بروزرسانی لحظه‌ای کلمات مصوب از گوگل‌شیت قبل از هر ترجمه و جایگزینی دقیق معادل‌های رسمی وردپرس.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Cloud className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm text-slate-800">ترجمه ابری در پس‌زمینه</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            امکان سپردن فایل‌های حجیم به سرور؛ حتی با بستن پنجره مرورگر یا خاموش کردن سیستم، ترجمه ادامه می‌یابد.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm text-slate-800">سازگاری با هسته و افزونه‌ها</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            تولید همزمان فایل PO متنی و MO باینری کامپایل‌شده طبق استانداردهای رسمی گت‌تکست وردپرس فارسی.
          </p>
        </div>
      </div>
    </div>
  );
};
