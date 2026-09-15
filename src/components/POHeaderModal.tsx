import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Check,
  Layers,
  Palette,
  Cpu,
  FileCode,
  Sparkles,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { POHeader, WordPressProjectType } from '../types';

interface POHeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  header: POHeader;
  currentFileName: string;
  onSaveHeader: (newHeader: POHeader, newFileName?: string) => void;
}

export const POHeaderModal: React.FC<POHeaderModalProps> = ({
  isOpen,
  onClose,
  header,
  currentFileName,
  onSaveHeader,
}) => {
  const [projectType, setProjectType] = useState<WordPressProjectType>(() => {
    if (header.projectType) return header.projectType;
    const lowerName = currentFileName.toLowerCase();
    if (lowerName.includes('admin') || lowerName.includes('continents') || header.projectIdVersion?.toLowerCase().includes('wordpress')) {
      return 'core';
    }
    if (header.textDomain || lowerName.includes('-fa_ir') || lowerName.includes('-fa.')) {
      return 'plugin';
    }
    return 'plugin';
  });

  const [textDomain, setTextDomain] = useState(header.textDomain || '');
  const [pluginName, setPluginName] = useState(header.pluginName || '');
  const [themeName, setThemeName] = useState(header.themeName || '');
  const [coreComponent, setCoreComponent] = useState<'general' | 'admin' | 'network' | 'continents-cities'>(
    header.coreComponent || 'general'
  );
  const [version, setVersion] = useState(header.projectIdVersion || '');
  const [domainPath, setDomainPath] = useState(header.domainPath || '/languages');
  const [language, setLanguage] = useState(header.language || 'fa_IR');
  const [languageTeam, setLanguageTeam] = useState(
    header.languageTeam || 'WordPress Persian Localization Team'
  );
  const [lastTranslator, setLastTranslator] = useState(header.lastTranslator || '');
  const [reportBugsTo, setReportBugsTo] = useState(header.reportBugsTo || '');
  const [pluralForms, setPluralForms] = useState(
    header.pluralForms || 'nplurals=2; plural=(n > 1);'
  );
  const [targetFileName, setTargetFileName] = useState(currentFileName);

  useEffect(() => {
    setTargetFileName(currentFileName);
  }, [currentFileName]);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTextDomain(header.textDomain || '');
      setPluginName(header.pluginName || '');
      setThemeName(header.themeName || '');
      setVersion(header.projectIdVersion || '');
      setLanguage(header.language || 'fa_IR');
      setLanguageTeam(header.languageTeam || 'WordPress Persian Localization Team');
      setLastTranslator(header.lastTranslator || '');
      setReportBugsTo(header.reportBugsTo || '');
      setPluralForms(header.pluralForms || 'nplurals=2; plural=(n > 1);');
      setTargetFileName(currentFileName);
    }
  }, [isOpen, header, currentFileName]);

  if (!isOpen) return null;

  // Auto apply WordPress file naming standard
  const handleApplyWPFileName = (type: WordPressProjectType) => {
    const cleanDomain = textDomain.trim().toLowerCase() || 'plugin';
    if (type === 'plugin') {
      setTargetFileName(`${cleanDomain}-fa_IR.po`);
    } else if (type === 'theme') {
      setTargetFileName(`fa_IR.po`);
    } else if (type === 'core') {
      if (coreComponent === 'admin') {
        setTargetFileName('admin-fa_IR.po');
      } else if (coreComponent === 'network') {
        setTargetFileName('admin-network-fa_IR.po');
      } else if (coreComponent === 'continents-cities') {
        setTargetFileName('continents-cities-fa_IR.po');
      } else {
        setTargetFileName('fa_IR.po');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let computedVersion = version.trim();
    if (!computedVersion) {
      if (projectType === 'plugin' && pluginName) {
        computedVersion = pluginName;
      } else if (projectType === 'theme' && themeName) {
        computedVersion = themeName;
      } else if (projectType === 'core') {
        computedVersion = 'WordPress';
      }
    }

    const updatedHeader: POHeader = {
      ...header,
      projectType,
      pluginName: pluginName.trim() || undefined,
      themeName: themeName.trim() || undefined,
      coreComponent: projectType === 'core' ? coreComponent : undefined,
      textDomain: textDomain.trim() || undefined,
      domainPath: domainPath.trim() || undefined,
      xDomain: textDomain.trim() || undefined,
      projectIdVersion: computedVersion,
      language: language.trim() || 'fa_IR',
      languageTeam: languageTeam.trim() || 'WordPress Persian Localization Team',
      lastTranslator: lastTranslator.trim(),
      reportBugsTo: reportBugsTo.trim(),
      pluralForms: pluralForms.trim() || 'nplurals=2; plural=(n > 1);',
      rawHeaders: {
        ...header.rawHeaders,
        'Project-Id-Version': computedVersion,
        'Language': language.trim() || 'fa_IR',
        'Language-Team': languageTeam.trim() || 'WordPress Persian Localization Team',
        'Plural-Forms': pluralForms.trim() || 'nplurals=2; plural=(n > 1);',
        ...(textDomain.trim() ? { 'X-Domain': textDomain.trim() } : {}),
        ...(domainPath.trim() ? { 'X-Poedit-SearchPath-0': domainPath.trim() } : {}),
        ...(lastTranslator.trim() ? { 'Last-Translator': lastTranslator.trim() } : {}),
        ...(reportBugsTo.trim() ? { 'Report-Msgid-Bugs-To': reportBugsTo.trim() } : {}),
      },
    };

    onSaveHeader(updatedHeader, targetFileName.trim() !== currentFileName ? targetFileName.trim() : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                تنظیمات نوع پروژه و متادیتای وردپرس
              </h2>
              <p className="text-xs text-slate-500">
                انتخاب اختصاصی برای افزونه، پوسته یا هسته وردپرس مطابق استانداردهای Gettext
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto max-h-[80vh]">
          {/* Project Type Switcher */}
          <div>
            <label className="block font-bold text-slate-800 mb-2">
              نوع پروژه ترجمه وردپرس را انتخاب کنید:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setProjectType('plugin');
                  handleApplyWPFileName('plugin');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  projectType === 'plugin'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Layers className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-xs">افزونه وردپرس (Plugin)</span>
                <span className="text-[10px] text-slate-500">برای ووکامرس، المنتور و سایر پلاگین‌ها</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProjectType('theme');
                  handleApplyWPFileName('theme');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  projectType === 'theme'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Palette className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-xs">پوسته / قالب (Theme)</span>
                <span className="text-[10px] text-slate-500">قالب‌های وردپرس و زیرپوسته‌ها (Child Theme)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProjectType('core');
                  handleApplyWPFileName('core');
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  projectType === 'core'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Cpu className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-xs">هسته وردپرس (Core)</span>
                <span className="text-[10px] text-slate-500">بخش مدیریت، شبکه و پیام‌های اصلی هسته</span>
              </button>
            </div>
          </div>

          {/* Conditional Project-Specific Fields */}
          {projectType === 'plugin' && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>مشخصات افزونه وردپرس:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام یا نسخه افزونه:
                  </label>
                  <input
                    type="text"
                    value={pluginName}
                    onChange={(e) => setPluginName(e.target.value)}
                    placeholder="مثال: WooCommerce یا Contact Form 7"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    شناسه متنی (Text Domain):
                  </label>
                  <input
                    type="text"
                    value={textDomain}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTextDomain(val);
                      if (val.trim()) {
                        setTargetFileName(`${val.trim().toLowerCase()}-fa_IR.po`);
                      }
                    }}
                    placeholder="مثال: woocommerce یا contact-form-7"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    مسیر پوشه زبان (Domain Path):
                  </label>
                  <input
                    type="text"
                    value={domainPath}
                    onChange={(e) => setDomainPath(e.target.value)}
                    placeholder="/languages"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام فایل ذخیره‌سازی PO:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={targetFileName}
                      onChange={(e) => setTargetFileName(e.target.value)}
                      placeholder="plugin-fa_IR.po"
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-indigo-700 font-semibold"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyWPFileName('plugin')}
                      title="تنظیم استاندارد نام فایل بر اساس Text Domain"
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-medium shrink-0"
                    >
                      استانداردسازی
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-indigo-700">
                فرمت استاندارد وردپرس برای فایل زبان افزونه: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200">[textdomain]-fa_IR.po</code>
              </p>
            </div>
          )}

          {projectType === 'theme' && (
            <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-600" />
                <span>مشخصات پوسته / قالب وردپرس:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام قالب یا پوسته:
                  </label>
                  <input
                    type="text"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="مثال: Astra یا Hello Elementor"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    شناسه متنی قالب (Text Domain):
                  </label>
                  <input
                    type="text"
                    value={textDomain}
                    onChange={(e) => setTextDomain(e.target.value)}
                    placeholder="مثال: astra یا hello-elementor"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  نام فایل ذخیره‌سازی PO:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={targetFileName}
                    onChange={(e) => setTargetFileName(e.target.value)}
                    placeholder="fa_IR.po"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-purple-700 font-semibold"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyWPFileName('theme')}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-[11px] font-medium shrink-0"
                  >
                    استاندارد پوسته (fa_IR.po)
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-purple-700">
                در پوسته‌های وردپرس، فایل زبان مستقیماً با نام <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-purple-200">fa_IR.po</code> در پوشه <code className="font-mono">/languages</code> پوسته قرار می‌گیرد.
              </p>
            </div>
          )}

          {projectType === 'core' && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-amber-600" />
                <span>مشخصات هسته رسمی وردپرس:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    بخش هسته وردپرس:
                  </label>
                  <select
                    value={coreComponent}
                    onChange={(e) => {
                      const comp = e.target.value as any;
                      setCoreComponent(comp);
                      if (comp === 'admin') setTargetFileName('admin-fa_IR.po');
                      else if (comp === 'network') setTargetFileName('admin-network-fa_IR.po');
                      else if (comp === 'continents-cities') setTargetFileName('continents-cities-fa_IR.po');
                      else setTargetFileName('fa_IR.po');
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="general">هسته عمومی و پیام‌ها (fa_IR.po)</option>
                    <option value="admin">بخش مدیریت وردپرس (admin-fa_IR.po)</option>
                    <option value="network">شبکه چندسایته (admin-network-fa_IR.po)</option>
                    <option value="continents-cities">قاره‌ها و شهرها (continents-cities-fa_IR.po)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    نام فایل رسمی وردپرس:
                  </label>
                  <input
                    type="text"
                    value={targetFileName}
                    onChange={(e) => setTargetFileName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-amber-900 font-semibold"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* General Localization Settings */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-slate-600" />
              <span>تنظیمات زبان و ساختار گت‌تکست (Gettext):</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  کد زبان (Language):
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="fa_IR"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  تیم زبان (Language-Team):
                </label>
                <input
                  type="text"
                  value={languageTeam}
                  onChange={(e) => setLanguageTeam(e.target.value)}
                  placeholder="WordPress Persian Localization Team"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  فرمول حالت‌های جمع فارسی (Plural-Forms):
                </label>
                <button
                  type="button"
                  onClick={() => setPluralForms('nplurals=2; plural=(n > 1);')}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  بازنشانی به فرمول استاندارد وردپرس
                </button>
              </div>
              <input
                type="text"
                value={pluralForms}
                onChange={(e) => setPluralForms(e.target.value)}
                placeholder="nplurals=2; plural=(n > 1);"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                فرمول استاندارد فارسی در وردپرس: <code className="bg-slate-100 px-1 py-0.5 rounded">nplurals=2; plural=(n &gt; 1);</code>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  مشخصات مترجم اخیر (Last-Translator):
                </label>
                <input
                  type="text"
                  value={lastTranslator}
                  onChange={(e) => setLastTranslator(e.target.value)}
                  placeholder="نام یا ایمیل شما"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  آدرس گزارش باگ (Report-Msgid-Bugs-To):
                </label>
                <input
                  type="text"
                  value={reportBugsTo}
                  onChange={(e) => setReportBugsTo(e.target.value)}
                  placeholder="https://wordpress.org/support"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
              File: {targetFileName}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>ذخیره و اعمال تنظیمات</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
