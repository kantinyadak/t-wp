import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  BookOpen,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { GlossaryTerm, SyncStatus } from '../types';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  glossary: GlossaryTerm[];
  onAddTerm: (term: Omit<GlossaryTerm, 'id' | 'updatedAt'>) => void;
  onDeleteTerm: (id: string) => void;
  onSyncSheet: (sheetUrl: string) => Promise<void>;
  syncStatus: SyncStatus;
  autoSyncBeforeTranslate: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onImportCsv: (csvText: string) => void;
  onExportCsv: () => void;
  onResetToDefaults: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  isOpen,
  onClose,
  glossary,
  onAddTerm,
  onDeleteTerm,
  onSyncSheet,
  syncStatus,
  autoSyncBeforeTranslate,
  onToggleAutoSync,
  onImportCsv,
  onExportCsv,
  onResetToDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'database'>('sheet');
  const [sheetUrlInput, setSheetUrlInput] = useState(syncStatus.sheetUrl || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New term form state
  const [newEn, setNewEn] = useState('');
  const [newFa, setNewFa] = useState('');
  const [newPos, setNewPos] = useState('noun');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleSyncSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sheetUrlInput.trim()) {
      onSyncSheet(sheetUrlInput.trim());
    }
  };

  const handleAddNewTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEn.trim() || !newFa.trim()) return;

    onAddTerm({
      en: newEn.trim(),
      fa: newFa.trim(),
      primaryFa: newFa.split(/[،|/]/)[0].trim(),
      alternates: newFa.split(/[،|/]/).map((s) => s.trim()),
      pos: newPos.trim() || 'noun',
      description: newDesc.trim(),
      isOfficial: true,
      source: 'custom',
    });

    setNewEn('');
    setNewFa('');
    setNewPos('noun');
    setNewDesc('');
    setShowAddForm(false);
  };

  const filteredGlossary = glossary.filter((t) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      t.en.toLowerCase().includes(q) ||
      t.fa.toLowerCase().includes(q) ||
      (t.pos && t.pos.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-right">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                مدیریت واژه‌نامه مصوب و اتصال به گوگل شیت
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تنظیم منبع لغات معتبر و هماهنگ‌سازی جدول کلمات تایید شده
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white text-xs font-semibold gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'sheet'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>هماهنگ‌سازی با گوگل شیت (Google Sheets)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'database'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>
              دیتابیس لغات مصوب ({glossary.length.toLocaleString('fa-IR')} واژه)
            </span>
          </button>
        </div>

        {/* Tab 1: Google Sheet Sync */}
        {activeTab === 'sheet' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-indigo-950 text-sm">
                    اتصال به فایل زنده گوگل شیت
                  </h4>
                  <p className="text-indigo-800 leading-relaxed">
                    با ثبت پیوند گوگل شیت، سیستم قبل از هر ترجمه لغات را به روزرسانی می‌کند.
                    همچنین ستون‌های استاندارد شیت شامل <code className="font-mono bg-white px-1 py-0.5 rounded-sm border border-indigo-200">en</code> (کلمه انگلیسی)،{' '}
                    <code className="font-mono bg-white px-1 py-0.5 rounded-sm border border-indigo-200">fa</code> (ترجمه مصوب)،{' '}
                    <code className="font-mono bg-white px-1 py-0.5 rounded-sm border border-indigo-200">pos</code> (نقش دستوری)، و{' '}
                    <code className="font-mono bg-white px-1 py-0.5 rounded-sm border border-indigo-200">description</code> می‌باشند.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSyncSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  آدرس گوگل شیت یا لینک CSV خروجی:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sheetUrlInput}
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-hidden"
                    dir="ltr"
                  />
                  <button
                    type="submit"
                    disabled={syncStatus.status === 'syncing' || !sheetUrlInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`}
                    />
                    <span>بروزرسانی اکنون</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  نکته: دسترسی به شیت در گوگل درایو باید روی "Anyone with the link can view" باشد.
                </p>
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    بروزرسانی خودکار پیش از هر ترجمه
                  </span>
                  <span className="text-[11px] text-slate-500">
                    هنگام فشردن دکمه ترجمه، ابتدا شیت بررسی شده و جدیدترین لغات اعمال می‌شوند.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncBeforeTranslate}
                    onChange={(e) => onToggleAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Sync Status Banner */}
              {syncStatus.message && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2 text-xs ${
                    syncStatus.status === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : syncStatus.status === 'error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {syncStatus.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {syncStatus.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{syncStatus.message}</span>
                </div>
              )}
            </form>

            {/* Instructions box */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>نحوه اشتراک‌گذاری گوگل شیت برای استفاده در سیستم:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed pr-2">
                <li>یک فایل Google Sheets با ستون‌های <code className="font-mono">en</code> و <code className="font-mono">fa</code> ایجاد یا باز کنید.</li>
                <li>از گوشه بالا روی دکمه سبز <strong>Share</strong> کلیک کنید.</li>
                <li>گزینه General Access را روی <strong>Anyone with the link (Viewer)</strong> تنظیم کنید.</li>
                <li>پیوند آن را کپی کرده و در کادر بالا قرار دهید و دکمه <strong>بروزرسانی اکنون</strong> را بزنید.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 2: Glossary Database & Custom Terms */}
        {activeTab === 'database' && (
          <div className="p-6 overflow-y-auto space-y-4 flex-1 flex flex-col text-xs">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجو در لغات انگلیسی یا معادل فارسی..."
                  className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن واژه جدید</span>
                </button>

                <button
                  type="button"
                  onClick={onExportCsv}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>خروجی CSV</span>
                </button>

                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>ورود CSV</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          if (text) onImportCsv(text);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={onResetToDefaults}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium"
                >
                  <span>بازنشانی به پیش‌فرض</span>
                </button>
              </div>
            </div>

            {/* Add term form */}
            {showAddForm && (
              <form
                onSubmit={handleAddNewTerm}
                className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in"
              >
                <div className="font-semibold text-indigo-900 text-xs">
                  تعریف لغت و ترجمه مصوب جدید:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      واژه انگلیسی (en):
                    </label>
                    <input
                      type="text"
                      required
                      value={newEn}
                      onChange={(e) => setNewEn(e.target.value)}
                      placeholder="مثلا: admin"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      معادل فارسی مصوب (fa):
                    </label>
                    <input
                      type="text"
                      required
                      value={newFa}
                      onChange={(e) => setNewFa(e.target.value)}
                      placeholder="مثلا: مدیر"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      نقش دستوری (pos):
                    </label>
                    <select
                      value={newPos}
                      onChange={(e) => setNewPos(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                    >
                      <option value="noun">noun (اسم)</option>
                      <option value="verb">verb (فعل)</option>
                      <option value="adjective">adjective (صفت)</option>
                      <option value="adverb">adverb (قید)</option>
                      <option value="expression">expression (اصطلاح / عبارت)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      توضیحات / قانون ترجمه:
                    </label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="توضیح اختیاری..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                  >
                    ذخیره در دیتابیس
                  </button>
                </div>
              </form>
            )}

            {/* Glossary Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 max-h-[400px] overflow-y-auto">
              <table className="w-full text-right divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-600 sticky top-0 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-1/4">واژه انگلیسی (en)</th>
                    <th className="py-2.5 px-3 w-1/3">معادل فارسی مصوب (fa)</th>
                    <th className="py-2.5 px-3 w-20">نوع</th>
                    <th className="py-2.5 px-3">توضیحات و قوانین</th>
                    <th className="py-2.5 px-2 w-12 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredGlossary.map((term) => (
                    <tr key={term.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900" dir="ltr">
                        {term.en}
                      </td>
                      <td className="py-2 px-3 font-medium text-emerald-800">
                        {term.fa}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[10px]">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200">
                          {term.pos || 'term'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {term.description || '—'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteTerm(term.id)}
                          title="حذف واژه"
                          className="text-slate-400 hover:text-red-600 p-1 rounded-sm hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            مجموع لغات فعال: <strong className="text-slate-800 font-mono">{glossary.length.toLocaleString('fa-IR')}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
