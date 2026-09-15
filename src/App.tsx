import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsBar, FilterType } from './components/StatsBar';
import { BatchToolbar } from './components/BatchToolbar';
import { POEditorTable } from './components/POEditorTable';
import { GlossaryModal } from './components/GlossaryModal';
import { POHeaderModal } from './components/POHeaderModal';
import { TranslationPlayground } from './components/TranslationPlayground';
import { EmptyPOState } from './components/EmptyPOState';
import { BackgroundJobBanner } from './components/BackgroundJobBanner';
import { ScrollToTopSearch } from './components/ScrollToTopSearch';
import {
  GlossaryTerm,
  POEntry,
  POFile,
  POHeader,
  SyncStatus,
  TranslationEngine,
  TranslationStats,
  BackgroundJobStatus,
} from './types';
import { INITIAL_GLOSSARY, parseGlossaryCsv } from './data/defaultGlossary';
import { SAMPLE_WP_PO_CONTENT } from './data/samplePo';
import { parsePO, generatePO } from './utils/poParser';
import { compileMO, parseMO } from './utils/moCompiler';
import {
  translateSingleString,
  batchTranslateEntries,
} from './services/translator';
import { applyApprovedGlossary, findGlossaryMatches } from './utils/glossaryEngine';

const STORAGE_KEY_GLOSSARY = 'pomo_translator_glossary_v1';
const STORAGE_KEY_SYNC = 'pomo_translator_sync_status_v1';
const STORAGE_KEY_AUTOSYNC = 'pomo_translator_autosync_v1';
const STORAGE_KEY_ENGINE = 'pomo_translator_engine_v1';
const STORAGE_KEY_PO = 'pomo_translator_active_po_v1';

const EMPTY_INITIAL_PO: POFile = {
  header: {
    projectIdVersion: '',
    potCreationDate: new Date().toISOString(),
    poRevisionDate: new Date().toISOString(),
    lastTranslator: '',
    language: 'fa_IR',
    mimeVersion: '1.0',
    contentType: 'text/plain; charset=UTF-8',
    contentTransferEncoding: '8bit',
    pluralForms: 'nplurals=2; plural=(n > 1);',
    xGenerator: 'WordPress Persian PO/MO Translator Studio',
    projectType: 'plugin',
    rawHeaders: {},
  },
  entries: [],
  fileName: '',
};

export default function App() {
  // 1. Glossary state & local storage persistence
  const [glossary, setGlossary] = useState<GlossaryTerm[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GLOSSARY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading stored glossary:', e);
    }
    return INITIAL_GLOSSARY;
  });

  // Save glossary on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GLOSSARY, JSON.stringify(glossary));
    } catch (e) {
      console.error('Error saving glossary:', e);
    }
  }, [glossary]);

  // 2. Google Sheet Sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SYNC);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Purge any old placeholder sheet URLs
        if (parsed.sheetUrl && parsed.sheetUrl.includes('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')) {
          parsed.sheetUrl = '';
        }
        return parsed;
      }
    } catch {}
    return {
      lastSyncTime: null,
      sheetUrl: '',
      status: 'idle',
      message: '',
      totalTerms: INITIAL_GLOSSARY.length,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SYNC, JSON.stringify(syncStatus));
    } catch {}
  }, [syncStatus]);

  // 3. Auto-sync before translate toggle
  const [autoSyncBeforeTranslate, setAutoSyncBeforeTranslate] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTOSYNC);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTOSYNC, JSON.stringify(autoSyncBeforeTranslate));
  }, [autoSyncBeforeTranslate]);

  // 4. Translation Engine
  const [engine, setEngine] = useState<TranslationEngine>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ENGINE);
      return (saved as TranslationEngine) || 'google';
    } catch {
      return 'google';
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ENGINE, engine);
  }, [engine]);

  // 5. Active PO File (Zero default demo data - clean initial state or persisted active work)
  const [poFile, setPoFile] = useState<POFile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return EMPTY_INITIAL_PO;
  });

  // Persist current active PO file to local storage
  useEffect(() => {
    try {
      if (poFile.entries.length > 0) {
        localStorage.setItem(STORAGE_KEY_PO, JSON.stringify(poFile));
      } else {
        localStorage.removeItem(STORAGE_KEY_PO);
      }
    } catch (e) {
      console.error('Error saving PO file cache:', e);
    }
  }, [poFile]);

  // 6. Server Background Job State (runs independently of browser window/connection)
  const [bgJobStatus, setBgJobStatus] = useState<BackgroundJobStatus | null>(null);
  const [isApplyingBgResults, setIsApplyingBgResults] = useState(false);
  const lastMergedBgCountRef = useRef(0);

  // Poll server background job status and auto-merge new items in real-time
  const pollBackgroundStatus = async () => {
    try {
      const res = await fetch('/api/background-job/status');
      if (res.ok) {
        const data = await res.json();
        if (data && data.job) {
          setBgJobStatus(data.job);

          // If there are newly completed items on the server, auto-stream them into the table!
          const resultsCount = data.resultsCount || 0;
          if (resultsCount > lastMergedBgCountRef.current) {
            lastMergedBgCountRef.current = resultsCount;
            await handleApplyBackgroundResults(true);
          }
        } else {
          setBgJobStatus(null);
          lastMergedBgCountRef.current = 0;
        }
      }
    } catch (e) {
      // ignore network hiccups silently
    }
  };

  useEffect(() => {
    pollBackgroundStatus();
    const interval = setInterval(
      () => {
        pollBackgroundStatus();
      },
      bgJobStatus?.status === 'running' ? 2500 : 8000
    );
    return () => clearInterval(interval);
  }, [bgJobStatus?.status]);

  // 7. UI Filters, Search, Selection
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 8. Modals
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);

  // 9. Translation & Operation Progress
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [translatingRowId, setTranslatingRowId] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<{
    total: number;
    completed: number;
    currentText: string;
  } | undefined>();

  const cancelTranslationRef = useRef(false);

  // Sync Google Sheet function (checks and updates terms from Google Sheets)
  const handleSyncSheet = async (sheetUrlToSync?: string): Promise<GlossaryTerm[]> => {
    const targetUrl = (sheetUrlToSync || syncStatus.sheetUrl || '').trim();
    if (!targetUrl) {
      return glossary;
    }

    setIsSyncingSheet(true);
    setSyncStatus((prev) => ({
      ...prev,
      status: 'syncing',
      message: 'در حال بررسی و دریافت جدیدترین کلمات مصوب از گوگل شیت...',
    }));

    try {
      const res = await fetch('/api/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در دریافت اطلاعات گوگل شیت');
      }

      const parsedTerms = parseGlossaryCsv(data.csvText, 'sheet');
      if (parsedTerms.length === 0) {
        throw new Error('هیچ کلمه‌ای در شیت یافت نشد یا فرمت ستون‌ها صحیح نیست.');
      }

      // Merge new terms with existing, prioritizing sheet terms
      let mergedTerms: GlossaryTerm[] = [];
      setGlossary((prev) => {
        const map = new Map<string, GlossaryTerm>();
        // Add existing
        for (const t of prev) {
          map.set(t.en.toLowerCase().trim(), t);
        }
        // Overwrite / add from sheet
        for (const t of parsedTerms) {
          map.set(t.en.toLowerCase().trim(), t);
        }
        mergedTerms = Array.from(map.values());
        return mergedTerms;
      });

      setSyncStatus({
        lastSyncTime: Date.now(),
        sheetUrl: targetUrl,
        status: 'success',
        message: `با موفقیت ${parsedTerms.length.toLocaleString('fa-IR')} واژه از گوگل شیت هماهنگ شد.`,
        totalTerms: parsedTerms.length,
      });

      return mergedTerms.length > 0 ? mergedTerms : glossary;
    } catch (err: any) {
      console.error('Sheet sync error:', err);
      setSyncStatus((prev) => ({
        ...prev,
        status: 'error',
        message: err.message || 'خطا در هماهنگ‌سازی با گوگل شیت',
      }));
      return glossary;
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleQuickSyncSheet = async () => {
    if (!syncStatus.sheetUrl || !syncStatus.sheetUrl.trim()) {
      setIsGlossaryModalOpen(true);
      return;
    }
    await handleSyncSheet();
  };

  // Upload File Handler (.po / .mo)
  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'mo') {
        const buffer = await file.arrayBuffer();
        const parsed = parseMO(buffer, file.name);
        setPoFile(parsed);
        setSelectedIds(new Set());
      } else {
        const text = await file.text();
        const parsed = parsePO(text, file.name);
        setPoFile(parsed);
        setSelectedIds(new Set());
      }
    } catch (err: any) {
      alert(`خطا در باز کردن فایل: ${err.message}`);
    }
  };

  // Download PO
  const handleDownloadPO = () => {
    const content = generatePO(poFile);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = poFile.fileName.endsWith('.po') ? poFile.fileName : `${poFile.fileName}.po`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download compiled binary MO
  const handleDownloadMO = () => {
    const uint8Array = compileMO(poFile);
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const moName = poFile.fileName.replace(/\.po$/i, '') + '.mo';
    a.download = moName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load sample WordPress file (explicitly on user click, never default)
  const handleLoadSample = () => {
    setPoFile(parsePO(SAMPLE_WP_PO_CONTENT, 'wordpress-sample.po'));
    setSelectedIds(new Set());
    setSearchQuery('');
  };

  // Close active file / start fresh
  const handleCloseFile = () => {
    if (poFile.entries.length > 0) {
      const confirmed = window.confirm(
        'آیا از بستن فایل فعلی مطمئن هستید؟ (اگر فایل را دانلود نکرده باشید، ممکن است تغییرات شما پاک شود)'
      );
      if (!confirmed) return;
    }
    setPoFile(EMPTY_INITIAL_PO);
    setSelectedIds(new Set());
    setSearchQuery('');
    setFilter('all');
    localStorage.removeItem(STORAGE_KEY_PO);
  };

  // Create empty new PO project
  const handleCreateEmptyFile = () => {
    const emptyFile: POFile = {
      header: {
        projectIdVersion: 'پروژه جدید وردپرس',
        potCreationDate: new Date().toISOString(),
        poRevisionDate: new Date().toISOString(),
        lastTranslator: '',
        language: 'fa_IR',
        mimeVersion: '1.0',
        contentType: 'text/plain; charset=UTF-8',
        contentTransferEncoding: '8bit',
        pluralForms: 'nplurals=2; plural=(n > 1);',
        xGenerator: 'WordPress Persian PO/MO Translator Studio',
        projectType: 'plugin',
        rawHeaders: {},
      },
      entries: [
        {
          id: '1',
          msgid: 'Welcome to WordPress',
          msgstr: ['خوش آمدید به وردپرس'],
          references: ['wp-admin/index.php:12'],
          comments: ['پیام خوش‌آمدگویی پیش‌فرض'],
          extractedComments: [],
          flags: [],
          isFuzzy: false,
          isTranslated: true,
          isApproved: true,
        },
      ],
      fileName: 'new-project.po',
    };
    setPoFile(emptyFile);
    setSelectedIds(new Set());
    setSearchQuery('');
  };

  // Start background translation job in server (runs even if tab is closed or offline)
  const handleStartBackgroundJob = async () => {
    const untranslated = poFile.entries.filter((e) => !e.msgstr || e.msgstr.every((s) => !s || !s.trim()));
    if (untranslated.length === 0) {
      alert('تمام سطرها از قبل دارای ترجمه هستند.');
      return;
    }

    try {
      if (autoSyncBeforeTranslate && syncStatus.sheetUrl && syncStatus.sheetUrl.trim()) {
        await handleSyncSheet();
      }

      const res = await fetch('/api/background-job/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: poFile.fileName || 'wordpress.po',
          entries: untranslated.map((e) => ({
            id: e.id,
            msgid: e.msgid,
            msgid_plural: e.msgid_plural,
          })),
          glossary,
          engine,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در آغاز فرآیند سرور');
      }

      const data = await res.json();
      await pollBackgroundStatus();
      alert('🚀 ' + data.message);
    } catch (error: any) {
      console.error('Error starting server background job:', error);
      alert('خطا در شروع ترجمه پس‌زمینه: ' + error.message);
    }
  };

  // Apply completed background job results to current PO file
  const handleApplyBackgroundResults = async (isIntermediateSync = false) => {
    try {
      if (!isIntermediateSync) {
        setIsApplyingBgResults(true);
      }
      const res = await fetch('/api/background-job/results');
      if (!res.ok) throw new Error('نتایج از سرور دریافت نشد.');
      const data = await res.json();
      const resultsMap = data.results || {};

      let appliedCount = 0;
      setPoFile((prev) => {
        const updatedEntries = prev.entries.map((entry) => {
          // If in results and hasn't been manually edited by user
          if (resultsMap[entry.id] && !entry.isUserEdited) {
            appliedCount++;
            const item = resultsMap[entry.id];
            const isPlural = Boolean(entry.msgid_plural);
            const msgstr = isPlural
              ? item.msgstr_plural || [item.msgstr, item.msgstr]
              : [item.msgstr];

            return {
              ...entry,
              msgstr,
              isTranslated: true,
              isApproved: true,
              isFuzzy: false,
              matchedTerms: item.appliedTerms?.map((t: any) => ({ en: t.en, fa: t.approvedFa })) || [],
            };
          }
          return entry;
        });
        return {
          ...prev,
          entries: updatedEntries,
        };
      });

      if (!isIntermediateSync) {
        if (data.status === 'completed' || data.status === 'cancelled') {
          // Clear the finished job on server
          await fetch('/api/background-job/clear', { method: 'POST' });
          setBgJobStatus(null);
          lastMergedBgCountRef.current = 0;
        }
        alert(`✅ تعداد ${appliedCount.toLocaleString('fa-IR')} سطر ترجمه شده با موفقیت به جدول افزوده شد.`);
      }
    } catch (err: any) {
      if (!isIntermediateSync) {
        alert('خطا در ادغام ترجمه‌ها: ' + err.message);
      }
    } finally {
      if (!isIntermediateSync) {
        setIsApplyingBgResults(false);
      }
    }
  };

  const handleCancelBackgroundJob = async () => {
    try {
      await fetch('/api/background-job/cancel', { method: 'POST' });
      await pollBackgroundStatus();
    } catch {}
  };

  const handleClearBackgroundJob = async () => {
    try {
      await fetch('/api/background-job/clear', { method: 'POST' });
      setBgJobStatus(null);
      lastMergedBgCountRef.current = 0;
    } catch {}
  };

  // Update translation for an entry
  const handleUpdateTranslation = (id: string, newMsgstr: string[], isApproved = true) => {
    setPoFile((prev) => {
      const updated = prev.entries.map((entry) => {
        if (entry.id === id) {
          const isTranslated = newMsgstr.some((s) => s && s.trim().length > 0);
          return {
            ...entry,
            msgstr: newMsgstr,
            isTranslated,
            isFuzzy: false,
            isApproved: isTranslated ? isApproved : false,
            isUserEdited: true,
          };
        }
        return entry;
      });
      return { ...prev, entries: updated };
    });
  };

  // Translate a single row
  const handleTranslateRow = async (entry: POEntry) => {
    setTranslatingRowId(entry.id);

    let activeGlossary = glossary;
    // Always check and sync Google Sheet first before translation if URL exists
    if (autoSyncBeforeTranslate && syncStatus.sheetUrl && syncStatus.sheetUrl.trim()) {
      activeGlossary = await handleSyncSheet();
    }

    try {
      const res = await translateSingleString(entry.msgid, activeGlossary, engine);

      let pluralTrans = '';
      if (entry.msgid_plural) {
        const pRes = await translateSingleString(entry.msgid_plural, activeGlossary, engine);
        pluralTrans = pRes.finalTranslation;
      }

      const updatedMsgstr = entry.msgid_plural
        ? [res.finalTranslation, pluralTrans || res.finalTranslation]
        : [res.finalTranslation];

      setPoFile((prev) => {
        const updated = prev.entries.map((e) => {
          if (e.id === entry.id) {
            return {
              ...e,
              msgstr: updatedMsgstr,
              isTranslated: true,
              isFuzzy: false,
              isApproved: true,
              rawGoogleTranslate: res.rawTranslation,
              matchedTerms: res.appliedTerms.map((t) => ({ en: t.en, fa: t.approvedFa })),
            };
          }
          return e;
        });
        return { ...prev, entries: updated };
      });
    } catch (err: any) {
      alert(`خطا در ترجمه: ${err.message}`);
    } finally {
      setTranslatingRowId(null);
    }
  };

  // Translate all untranslated entries
  const handleTranslateAllUntranslated = async () => {
    const untranslated = poFile.entries.filter((e) => !e.isTranslated);
    if (untranslated.length === 0) return;

    cancelTranslationRef.current = false;
    setIsTranslating(true);

    let activeGlossary = glossary;
    // Rule: "هر وقتی که خواستیم ترجمه ای انجام بدیم اول کلمات رو از لیست گوگل شیت بروز کنه"
    if (autoSyncBeforeTranslate && syncStatus.sheetUrl && syncStatus.sheetUrl.trim()) {
      activeGlossary = await handleSyncSheet();
    }

    try {
      const results = await batchTranslateEntries(
        untranslated,
        activeGlossary,
        engine,
        (completed, total, currentText) => {
          setCurrentProgress({ completed, total, currentText });
        },
        () => cancelTranslationRef.current,
        (itemResult) => {
          // LIVE STREAMING: As each row finishes, inject it into poFile immediately!
          // This allows the user to review, read, and edit translated rows in real-time
          // without having to wait for the whole batch to complete.
          setPoFile((prev) => ({
            ...prev,
            entries: prev.entries.map((e) =>
              e.id === itemResult.entry.id && !e.isUserEdited ? itemResult.entry : e
            ),
          }));
        }
      );

      // Final merge to ensure any missed items are properly set
      const resultMap = new Map<string, POEntry>();
      for (const r of results) {
        resultMap.set(r.entry.id, r.entry);
      }

      setPoFile((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => {
          const fresh = resultMap.get(e.id);
          if (fresh && !e.isUserEdited) {
            return fresh;
          }
          return e;
        }),
      }));
    } catch (err: any) {
      console.error('Batch translation error:', err);
    } finally {
      setIsTranslating(false);
      setCurrentProgress(undefined);
    }
  };

  // Translate selected entries
  const handleTranslateSelected = async () => {
    const selected = poFile.entries.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;

    cancelTranslationRef.current = false;
    setIsTranslating(true);

    let activeGlossary = glossary;
    if (autoSyncBeforeTranslate && syncStatus.sheetUrl && syncStatus.sheetUrl.trim()) {
      activeGlossary = await handleSyncSheet();
    }

    try {
      const results = await batchTranslateEntries(
        selected,
        activeGlossary,
        engine,
        (completed, total, currentText) => {
          setCurrentProgress({ completed, total, currentText });
        },
        () => cancelTranslationRef.current,
        (itemResult) => {
          // LIVE STREAMING: Real-time update for selected rows
          setPoFile((prev) => ({
            ...prev,
            entries: prev.entries.map((e) =>
              e.id === itemResult.entry.id && !e.isUserEdited ? itemResult.entry : e
            ),
          }));
        }
      );

      const resultMap = new Map<string, POEntry>();
      for (const r of results) {
        resultMap.set(r.entry.id, r.entry);
      }

      setPoFile((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => {
          const fresh = resultMap.get(e.id);
          if (fresh && !e.isUserEdited) {
            return fresh;
          }
          return e;
        }),
      }));
    } catch (err: any) {
      console.error('Selected translation error:', err);
    } finally {
      setIsTranslating(false);
      setCurrentProgress(undefined);
    }
  };

  // Re-apply glossary to all translated entries
  const handleReapplyGlossaryToAll = async () => {
    let activeGlossary = glossary;
    if (syncStatus.sheetUrl && syncStatus.sheetUrl.trim()) {
      activeGlossary = await handleSyncSheet();
    }

    let modifiedCount = 0;
    setPoFile((prev) => {
      const updated = prev.entries.map((entry) => {
        if (!entry.isTranslated || !entry.msgstr[0]) return entry;

        const currentFa = entry.msgstr[0];
        const { finalTranslation, appliedTerms } = applyApprovedGlossary(
          entry.msgid,
          currentFa,
          activeGlossary
        );

        if (finalTranslation !== currentFa) {
          modifiedCount++;
          return {
            ...entry,
            msgstr: [finalTranslation, ...(entry.msgstr.slice(1))],
            matchedTerms: appliedTerms.map((t) => ({ en: t.en, fa: t.approvedFa })),
          };
        }
        return entry;
      });

      return { ...prev, entries: updated };
    });

    alert(`واژه‌نامه با موفقیت اعمال شد. ${modifiedCount.toLocaleString('fa-IR')} مورد بر اساس لغات مصوب بازبینی و اصلاح شد.`);
  };

  // Clear all translations
  const handleClearAllTranslations = () => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید تمام ترجمه‌های این فایل را پاک کنید؟')) {
      return;
    }
    setPoFile((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => ({
        ...e,
        msgstr: e.msgid_plural ? ['', ''] : [''],
        isTranslated: false,
        isFuzzy: false,
        isApproved: false,
        rawGoogleTranslate: undefined,
        matchedTerms: [],
      })),
    }));
  };

  // Glossary management
  const handleAddTerm = (newTerm: Omit<GlossaryTerm, 'id' | 'updatedAt'>) => {
    const term: GlossaryTerm = {
      ...newTerm,
      id: `custom-${Date.now()}`,
      updatedAt: Date.now(),
    };
    setGlossary((prev) => [term, ...prev]);
  };

  const handleDeleteTerm = (id: string) => {
    setGlossary((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetToDefaults = () => {
    if (confirm('آیا می‌خواهید دیتابیس واژه‌نامه را به لیست پیش‌فرض اولیه بازنشانی کنید؟')) {
      setGlossary(INITIAL_GLOSSARY);
    }
  };

  const handleExportCsv = () => {
    const lines = ['en,fa,pos,description'];
    for (const t of glossary) {
      const escapedEn = `"${t.en.replace(/"/g, '""')}"`;
      const escapedFa = `"${t.fa.replace(/"/g, '""')}"`;
      const pos = t.pos || '';
      const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
      lines.push(`${escapedEn},${escapedFa},${pos},${desc}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'approved_glossary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = (csvText: string) => {
    try {
      const imported = parseGlossaryCsv(csvText, 'custom');
      if (imported.length === 0) {
        alert('هیچ لغتی در فایل یافت نشد.');
        return;
      }
      setGlossary((prev) => {
        const map = new Map<string, GlossaryTerm>();
        for (const t of prev) map.set(t.en.toLowerCase().trim(), t);
        for (const t of imported) map.set(t.en.toLowerCase().trim(), t);
        return Array.from(map.values());
      });
      alert(`${imported.length.toLocaleString('fa-IR')} واژه جدید با موفقیت اضافه شد.`);
    } catch (err: any) {
      alert(`خطا در خواندن فایل: ${err.message}`);
    }
  };

  // Header and filename update
  const handleSaveHeader = (newHeader: POHeader, newFileName?: string) => {
    setPoFile((prev) => ({
      ...prev,
      header: newHeader,
      fileName: newFileName || prev.fileName,
    }));
  };

  // Stats computation
  const stats: TranslationStats = useMemo(() => {
    let translated = 0;
    let untranslated = 0;
    let glossaryMatched = 0;
    let fuzzy = 0;

    for (const e of poFile.entries) {
      if (e.isTranslated) translated++;
      else untranslated++;

      if (e.isFuzzy) fuzzy++;

      const matches = findGlossaryMatches(e.msgid, glossary);
      if (matches.length > 0) glossaryMatched++;
    }

    return {
      total: poFile.entries.length,
      translated,
      untranslated,
      glossaryMatched,
      fuzzy,
    };
  }, [poFile.entries, glossary]);

  const pluralCount = useMemo(() => {
    return poFile.entries.filter((e) => !!e.msgid_plural).length;
  }, [poFile.entries]);

  // Filtered entries
  const visibleEntries = useMemo(() => {
    return poFile.entries.filter((entry) => {
      // 1. Tab filter
      if (filter === 'untranslated' && entry.isTranslated) return false;
      if (filter === 'translated' && !entry.isTranslated) return false;
      if (filter === 'plural' && !entry.msgid_plural) return false;
      if (filter === 'glossary') {
        const matches = findGlossaryMatches(entry.msgid, glossary);
        if (matches.length === 0) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inId = entry.msgid.toLowerCase().includes(q);
        const inPlural = entry.msgid_plural ? entry.msgid_plural.toLowerCase().includes(q) : false;
        const inTrans = entry.msgstr.some((s) => s.toLowerCase().includes(q));
        const inCtxt = entry.msgctxt ? entry.msgctxt.toLowerCase().includes(q) : false;
        if (!inId && !inPlural && !inTrans && !inCtxt) return false;
      }

      return true;
    });
  }, [poFile.entries, filter, searchQuery, glossary]);

  // Select all visible
  const handleSelectAllVisible = () => {
    const newSet = new Set(selectedIds);
    for (const e of visibleEntries) {
      newSet.add(e.id);
    }
    setSelectedIds(newSet);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllVisibleSelected =
    visibleEntries.length > 0 &&
    visibleEntries.every((e) => selectedIds.has(e.id));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Background Server Job Banner (independent of browser window) */}
      <BackgroundJobBanner
        jobStatus={bgJobStatus}
        onApplyResults={handleApplyBackgroundResults}
        onCancelJob={handleCancelBackgroundJob}
        onClearJob={handleClearBackgroundJob}
        isApplyingResults={isApplyingBgResults}
      />

      {/* Top Navbar */}
      <Header
        fileName={poFile.fileName || 'پروژه خالی'}
        hasActiveFile={poFile.entries.length > 0}
        onFileUpload={handleFileUpload}
        onLoadSample={handleLoadSample}
        onCloseFile={handleCloseFile}
        onOpenGlossaryModal={() => setIsGlossaryModalOpen(true)}
        onOpenHeaderModal={() => setIsHeaderModalOpen(true)}
        onDownloadPO={handleDownloadPO}
        onDownloadMO={handleDownloadMO}
        engine={engine}
        onEngineChange={setEngine}
        totalTermsCount={glossary.length}
        isSyncingSheet={isSyncingSheet}
        onQuickSyncSheet={handleQuickSyncSheet}
      />

      {/* Main Content Area: Empty State vs Active PO Project */}
      {poFile.entries.length === 0 ? (
        <main className="flex-1 flex items-center justify-center py-6">
          <EmptyPOState
            onFileUpload={handleFileUpload}
            onCreateEmptyFile={handleCreateEmptyFile}
            onLoadSample={handleLoadSample}
          />
        </main>
      ) : (
        <>
          {/* Interactive Verification Sandbox (Proof of word matching) */}
          <TranslationPlayground
            glossary={glossary}
            engine={engine}
            onBeforeTranslate={syncStatus.sheetUrl && syncStatus.sheetUrl.trim() ? handleSyncSheet : undefined}
          />

          {/* Sticky Stats and Filter/Search Bar */}
          <StatsBar
            stats={stats}
            pluralCount={pluralCount}
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCount={selectedIds.size}
            matchedCount={visibleEntries.length}
          />

          {/* Batch Actions Toolbar */}
          <BatchToolbar
            untranslatedCount={stats.untranslated}
            selectedCount={selectedIds.size}
            isTranslating={isTranslating}
            isSyncingSheet={isSyncingSheet}
            engine={engine}
            onTranslateAllUntranslated={handleTranslateAllUntranslated}
            onTranslateSelected={handleTranslateSelected}
            onReapplyGlossaryToAll={handleReapplyGlossaryToAll}
            onClearAllTranslations={handleClearAllTranslations}
            onSelectAllVisible={handleSelectAllVisible}
            onDeselectAll={handleDeselectAll}
            isAllVisibleSelected={isAllVisibleSelected}
            hasSheetUrl={Boolean(syncStatus.sheetUrl && syncStatus.sheetUrl.trim())}
            onQuickSyncSheet={handleQuickSyncSheet}
            lastSyncTime={syncStatus.lastSyncTime}
            onStartBackgroundTranslation={handleStartBackgroundJob}
            isBackgroundRunning={bgJobStatus?.status === 'running'}
            currentProgress={currentProgress}
            onCancelTranslation={() => {
              cancelTranslationRef.current = true;
            }}
          />

          {/* Main PO Table */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <POEditorTable
                entries={visibleEntries}
                glossary={glossary}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onUpdateTranslation={handleUpdateTranslation}
                onTranslateRow={handleTranslateRow}
                isTranslatingRowId={translatingRowId}
              />
            </div>
          </main>
        </>
      )}

      {/* Floating jump to top & focus search button on long scroll */}
      {poFile.entries.length > 0 && (
        <ScrollToTopSearch
          onFocusSearch={() => {
            const el = document.getElementById('search-strings-input') as HTMLInputElement | null;
            el?.focus();
            el?.select();
          }}
        />
      )}

      {/* Modals */}
      <GlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
        glossary={glossary}
        onAddTerm={handleAddTerm}
        onDeleteTerm={handleDeleteTerm}
        onSyncSheet={handleSyncSheet}
        syncStatus={syncStatus}
        autoSyncBeforeTranslate={autoSyncBeforeTranslate}
        onToggleAutoSync={setAutoSyncBeforeTranslate}
        onImportCsv={handleImportCsv}
        onExportCsv={handleExportCsv}
        onResetToDefaults={handleResetToDefaults}
      />

      <POHeaderModal
        isOpen={isHeaderModalOpen}
        onClose={() => setIsHeaderModalOpen(false)}
        header={poFile.header}
        currentFileName={poFile.fileName}
        onSaveHeader={handleSaveHeader}
      />
    </div>
  );
}
