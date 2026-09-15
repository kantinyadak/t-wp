import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  RotateCcw,
  Tag,
  FileCode,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { GlossaryTerm, POEntry } from '../types';
import { findGlossaryMatches } from '../utils/glossaryEngine';

interface POEditorTableProps {
  entries: POEntry[];
  glossary: GlossaryTerm[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdateTranslation: (id: string, newMsgstr: string[], isApproved?: boolean) => void;
  onTranslateRow: (entry: POEntry) => Promise<void>;
  isTranslatingRowId: string | null;
}

export const POEditorTable: React.FC<POEditorTableProps> = ({
  entries,
  glossary,
  selectedIds,
  onToggleSelect,
  onUpdateTranslation,
  onTranslateRow,
  isTranslatingRowId,
}) => {
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileCode className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">هیچ رشته‌ای یافت نشد</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          با توجه به فیلتر یا عبارت جستجوی فعلی، موردی وجود ندارد یا فایلی باز نشده است.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="bg-slate-100/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
            <th className="w-10 py-3 px-3 text-center">
              <span className="sr-only">انتخاب</span>
            </th>
            <th className="py-3 px-3 w-16 text-center">وضعیت</th>
            <th className="py-3 px-4 w-5/12">متن اصلی (Source msgid) و اصطلاحات مصوب</th>
            <th className="py-3 px-4 w-5/12">ترجمه فارسی نهایی (msgstr)</th>
            <th className="w-24 py-3 px-3 text-center">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-xs">
          {entries.map((entry, index) => {
            const isSelected = selectedIds.has(entry.id);
            const isTranslating = isTranslatingRowId === entry.id;
            const matches = findGlossaryMatches(entry.msgid, glossary);
            const hasPlural = !!entry.msgid_plural;
            const isDiffExpanded = expandedDiffId === entry.id;

            return (
              <tr
                key={entry.id}
                className={`transition-colors ${
                  isSelected
                    ? 'bg-purple-50/50'
                    : index % 2 === 0
                    ? 'bg-white'
                    : 'bg-slate-50/40'
                } hover:bg-slate-50`}
              >
                {/* Checkbox */}
                <td className="py-3.5 px-3 text-center align-top">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(entry.id)}
                    className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
                  />
                </td>

                {/* Status Badge */}
                <td className="py-3.5 px-3 text-center align-top">
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    {entry.isTranslated ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ترجمه شده
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        بدون ترجمه
                      </span>
                    )}

                    {matches.length > 0 && (
                      <span
                        title={`${matches.length} واژه مصوب در این رشته یافت شد`}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-help"
                      >
                        مصوب ({matches.length.toLocaleString('fa-IR')})
                      </span>
                    )}

                    {hasPlural && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        جمع
                      </span>
                    )}
                  </div>
                </td>

                {/* English Source & Matched Terms */}
                <td className="py-3.5 px-4 align-top space-y-2">
                  {/* Context and References */}
                  {(entry.msgctxt || entry.references.length > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                      {entry.msgctxt && (
                        <span className="inline-flex items-center gap-1 bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded-sm font-mono text-[10px]">
                          <Tag className="w-3 h-3" />
                          <span>زمینه: {entry.msgctxt}</span>
                        </span>
                      )}
                      {entry.references.slice(0, 2).map((ref, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200/60"
                          dir="ltr"
                        >
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Main Singular Source */}
                  <div
                    className="p-2.5 rounded-lg bg-slate-100/90 border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed break-words selection:bg-indigo-200"
                    dir="ltr"
                  >
                    {entry.msgid === '' ? (
                      <span className="text-slate-400 italic font-sans">[رشته خالی / سربرگ]</span>
                    ) : (
                      entry.msgid
                    )}
                  </div>

                  {/* Plural Source if exists */}
                  {hasPlural && (
                    <div className="space-y-1">
                      <div className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>حالت جمع (msgid_plural):</span>
                      </div>
                      <div
                        className="p-2 rounded-md bg-purple-50/70 border border-purple-200 font-mono text-xs text-purple-900 leading-relaxed break-words"
                        dir="ltr"
                      >
                        {entry.msgid_plural}
                      </div>
                    </div>
                  )}

                  {/* Matched Approved Glossary Terms Chips */}
                  {matches.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[11px] text-slate-600 font-medium mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>واژگان مصوب شناسایی شده در این رشته:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matches.map((m, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-medium"
                          >
                            <span className="font-mono font-semibold" dir="ltr">
                              {m.term.en}
                            </span>
                            <span className="text-emerald-500">➔</span>
                            <span className="font-bold text-emerald-800">
                              {m.term.primaryFa}
                            </span>
                            {m.term.pos && (
                              <span className="text-[9px] px-1 py-0.2 rounded-xs bg-emerald-100/70 text-emerald-700">
                                {m.term.pos}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </td>

                {/* Translation Input (Singular + Plural) */}
                <td className="py-3.5 px-4 align-top space-y-2">
                  {/* Non-plural translation */}
                  {!hasPlural ? (
                    <div>
                      <textarea
                        value={entry.msgstr[0] || ''}
                        onChange={(e) =>
                          onUpdateTranslation(entry.id, [e.target.value], true)
                        }
                        placeholder="ترجمه فارسی..."
                        rows={2}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans leading-relaxed resize-y transition-all"
                      />
                    </div>
                  ) : (
                    // Plural forms (msgstr[0] & msgstr[1])
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-medium block mb-0.5">
                          ترجمه مفرد (msgstr[0]):
                        </span>
                        <input
                          type="text"
                          value={entry.msgstr[0] || ''}
                          onChange={(e) => {
                            const updated = [...entry.msgstr];
                            updated[0] = e.target.value;
                            onUpdateTranslation(entry.id, updated, true);
                          }}
                          placeholder="ترجمه برای حالت مفرد..."
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-sans"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-700 font-medium block mb-0.5">
                          ترجمه جمع (msgstr[1]):
                        </span>
                        <input
                          type="text"
                          value={entry.msgstr[1] || ''}
                          onChange={(e) => {
                            const updated = [...entry.msgstr];
                            while (updated.length < 2) updated.push('');
                            updated[1] = e.target.value;
                            onUpdateTranslation(entry.id, updated, true);
                          }}
                          placeholder="ترجمه برای حالت جمع..."
                          className="w-full p-1.5 bg-white border border-purple-300 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-purple-500 font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* Diff / Comparison view if raw Google translation differs */}
                  {entry.rawGoogleTranslate &&
                    entry.rawGoogleTranslate !== entry.msgstr[0] && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDiffId(isDiffExpanded ? null : entry.id)
                          }
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          <Info className="w-3 h-3" />
                          <span>مقایسه: ترجمه خام گوگل در مقابل نسخه مصوب نهایی</span>
                          {isDiffExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        {isDiffExpanded && (
                          <div className="mt-1.5 p-2 bg-amber-50/80 border border-amber-200 rounded-md text-[11px] space-y-1">
                            <div className="text-slate-600">
                              <span className="font-semibold text-amber-800">
                                ترجمه اولیه خام گوگل ترنسلیت:
                              </span>{' '}
                              <span className="line-through text-slate-500">
                                {entry.rawGoogleTranslate}
                              </span>
                            </div>
                            <div className="text-emerald-800 font-medium">
                              <span className="font-bold">
                                نسخه نهایی با اعمال واژه‌نامه مصوب:
                              </span>{' '}
                              <span>{entry.msgstr[0]}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </td>

                {/* Row Actions */}
                <td className="py-3.5 px-3 align-top text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onTranslateRow(entry)}
                      disabled={isTranslating}
                      title="ترجمه با موتور هوشمند و اعمال فوری واژه‌نامه"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <Sparkles
                        className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`}
                      />
                    </button>

                    {entry.isTranslated && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTranslation(entry.id, hasPlural ? ['', ''] : [''], false)
                        }
                        title="پاک کردن ترجمه این سطر"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
