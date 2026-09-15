import React, { useState } from 'react';
import { Sparkles, ArrowLeft, CheckCircle2, Eye, RefreshCw, CornerDownLeft } from 'lucide-react';
import { GlossaryTerm, TranslationEngine } from '../types';
import { translateSingleString } from '../services/translator';

interface TranslationPlaygroundProps {
  glossary: GlossaryTerm[];
  engine: TranslationEngine;
  onBeforeTranslate?: () => Promise<GlossaryTerm[]>;
}

export const TranslationPlayground: React.FC<TranslationPlaygroundProps> = ({
  glossary,
  engine,
  onBeforeTranslate,
}) => {
  const [inputText, setInputText] = useState('admin for wordpress');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    rawTranslation: string;
    finalTranslation: string;
    appliedTerms: { en: string; originalFa: string; approvedFa: string }[];
  } | null>(null);

  const handleTestTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      let activeGlossary = glossary;
      if (onBeforeTranslate) {
        const fresh = await onBeforeTranslate();
        if (fresh && fresh.length > 0) {
          activeGlossary = fresh;
        }
      }
      const res = await translateSingleString(inputText.trim(), activeGlossary, engine);
      setResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePresets = [
    'admin for wordpress',
    'Dashboard settings for plugins and themes',
    'Add media to your post',
    '%d comments awaiting moderation',
    'Are you sure you want to move this to trash?',
  ];

  return (
    <div className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <details className="group border border-slate-200 rounded-xl bg-slate-50/50 p-4 open:bg-white transition-all shadow-xs">
          <summary className="font-bold text-xs text-slate-800 flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>تست و اعتبارسنجی زنده: اولویت مطلق واژه‌نامه نسبت به ترجمه گوگل (تست جمله مثال)</span>
              <span className="text-[11px] font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                مشاهده نحوه عملکرد
              </span>
            </div>
            <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>

          <div className="pt-4 space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              در این بخش می‌توانید هر عبارتی را بنویسید و مشاهده کنید که چگونه سیستم کلمات گوگل را با کلمات رسمی تایید شده در گوگل شیت و دیتابیس جایگزین می‌کند.
            </p>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">جملات نمونه:</span>
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputText(preset);
                    setResult(null);
                  }}
                  className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono transition-colors"
                  dir="ltr"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Input & Run */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="عبارت انگلیسی را اینجا بنویسید (مثلاً admin for wordpress)..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  dir="ltr"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTestTranslate();
                    }
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleTestTranslate}
                disabled={isLoading || !inputText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shrink-0 shadow-xs"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>آزمایش ترجمه با اولویت واژه‌نامه</span>
              </button>
            </div>

            {/* Test Result comparison */}
            {result && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 animate-in fade-in">
                {/* Step 1: Raw Google translate */}
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>۱. ترجمه خام اولیه گوگل:</span>
                  </div>
                  <div className="text-slate-800 font-medium text-xs leading-relaxed">
                    {result.rawTranslation}
                  </div>
                </div>

                {/* Step 2: Matched glossary rules */}
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <div className="text-[11px] font-semibold text-indigo-700 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>۲. واژگان مصوب شناسایی شده:</span>
                  </div>
                  {result.appliedTerms.length > 0 ? (
                    <div className="space-y-1">
                      {result.appliedTerms.map((t, idx) => (
                        <div key={idx} className="text-[11px] text-indigo-900 font-medium">
                          <code className="font-mono bg-white px-1 py-0.5 rounded-sm border border-indigo-200">{t.en}</code>
                          {' ➔ '}
                          <strong className="text-emerald-700 font-bold">{t.approvedFa}</strong>
                          {t.originalFa && t.originalFa !== t.approvedFa && (
                            <span className="text-[10px] text-slate-500 pr-1">
                              (جایگزین شد با "{t.originalFa}")
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">کلمه اختصاصی یافت نشد.</div>
                  )}
                </div>

                {/* Step 3: Final translation */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 shadow-xs">
                  <div className="text-[11px] font-bold text-emerald-800 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>۳. ترجمه نهایی سیستم (با اولویت مطلق):</span>
                  </div>
                  <div className="text-emerald-950 font-bold text-sm leading-relaxed">
                    {result.finalTranslation}
                  </div>
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};
