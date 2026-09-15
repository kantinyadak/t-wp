import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment.');
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// In-memory translation cache to optimize speed and guarantee zero cost
const translationCache = new Map<string, string>();

/**
 * Free Google Translate helper without any API key or subscription
 */
async function translateFreeGoogle(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed)!;
  }

  let translated = '';

  // Method 1: clients5.google.com (Chrome Extension client - fast & 100% free)
  try {
    const url1 = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=fa&q=${encodeURIComponent(trimmed)}`;
    const r1 = await fetch(url1, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    });
    if (r1.ok) {
      const d1 = await r1.json();
      if (Array.isArray(d1) && typeof d1[0] === 'string') {
        translated = d1[0];
      } else if (typeof d1 === 'string') {
        translated = d1;
      }
    }
  } catch (e) {
    // Continue to fallback
  }

  // Method 2: translate.googleapis.com (GTX client - free public translator)
  if (!translated) {
    try {
      const url2 = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fa&dt=t&q=${encodeURIComponent(trimmed)}`;
      const r2 = await fetch(url2, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*',
        },
      });
      if (r2.ok) {
        const d2 = await r2.json();
        if (Array.isArray(d2) && Array.isArray(d2[0])) {
          for (const piece of d2[0]) {
            if (piece && typeof piece[0] === 'string') {
              translated += piece[0];
            }
          }
        }
      }
    } catch (e) {
      // Continue to fallback
    }
  }

  // Method 3: Google Web App endpoint
  if (!translated) {
    try {
      const url3 = `https://translate.google.com/translate_a/single?client=webapp&sl=en&tl=fa&dt=t&q=${encodeURIComponent(trimmed)}`;
      const r3 = await fetch(url3, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
      });
      if (r3.ok) {
        const d3 = await r3.json();
        if (Array.isArray(d3) && Array.isArray(d3[0])) {
          for (const piece of d3[0]) {
            if (piece && typeof piece[0] === 'string') {
              translated += piece[0];
            }
          }
        }
      }
    } catch (e) {
      // Fail gracefully
    }
  }

  if (translated) {
    translationCache.set(trimmed, translated);
    return translated;
  }

  return trimmed;
}

/**
 * Google Translate proxy endpoint (Uses free endpoints, no API key needed)
 */
app.post('/api/translate-google', async (req, res) => {
  try {
    const { text, texts } = req.body;
    const inputTexts: string[] = Array.isArray(texts) ? texts : (typeof text === 'string' ? [text] : []);

    if (inputTexts.length === 0) {
      return res.status(400).json({ error: 'No text provided for translation.' });
    }

    const translations: string[] = [];

    // Process in small batches of 5 to avoid connection flooding
    const chunkSize = 5;
    for (let i = 0; i < inputTexts.length; i += chunkSize) {
      const chunk = inputTexts.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map((item) => translateFreeGoogle(item))
      );
      translations.push(...chunkResults);

      if (i + chunkSize < inputTexts.length) {
        // Micro-delay between batches
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    return res.json({ success: true, translations });
  } catch (error: any) {
    console.error('Google Translate Error:', error);
    return res.status(500).json({ error: error.message || 'Error occurred during translation' });
  }
});

/**
 * Gemini AI translation with contextual approved glossary injection
 */
app.post('/api/translate-gemini', async (req, res) => {
  try {
    const { texts, glossaryRules } = req.body;
    const inputTexts: string[] = Array.isArray(texts) ? texts : [];

    if (inputTexts.length === 0) {
      return res.status(400).json({ error: 'No texts provided for Gemini translation.' });
    }

    const ai = getGemini();

    // Prepare glossary instructions if provided
    let glossaryInstructions = '';
    if (Array.isArray(glossaryRules) && glossaryRules.length > 0) {
      glossaryInstructions = `
CRITICAL APPROVED GLOSSARY MANDATE:
You MUST use these exact official translations for the terms listed below whenever they appear. Never deviate or substitute with generic Persian words:
${glossaryRules.map((r: any) => `- "${r.en}" -> "${r.fa}"`).join('\n')}
`;
    }

    const prompt = `You are an expert software localizer translating English strings to Persian (Farsi) for WordPress and web applications.
Translate the following array of English strings to Persian.

RULES:
1. Preserve all placeholders exactly (e.g. %s, %d, %1$s, {name}, HTML tags like <a>, </b>, &hellip;).
2. Maintain natural, fluent, professional Persian while strictly respecting approved terms.
3. Keep the output as a valid JSON array of strings corresponding 1:1 to the input items.
${glossaryInstructions}

Input JSON array to translate:
${JSON.stringify(inputTexts)}

Output ONLY the JSON array of translated strings without code blocks:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '[]';
    let translations: string[] = [];
    try {
      translations = JSON.parse(responseText);
    } catch {
      // Clean possible backticks
      const clean = responseText.replace(/```json|```/g, '').trim();
      translations = JSON.parse(clean);
    }

    return res.json({ success: true, translations });
  } catch (error: any) {
    console.error('Gemini Translation Error:', error);
    return res.status(500).json({ error: error.message || 'Gemini translation failed' });
  }
});

/**
 * Fetch and sync Google Sheet CSV
 */
app.post('/api/sync-sheet', async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl || typeof sheetUrl !== 'string') {
      return res.status(400).json({ error: 'آدرس گوگل شیت معتبر نیست (Invalid Google Sheet URL).' });
    }

    let csvUrl = sheetUrl.trim();

    // Convert standard Google Sheet URL to CSV export URL if needed
    // e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
    const sheetIdMatch = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch && !csvUrl.includes('output=csv') && !csvUrl.includes('export?format=csv')) {
      const sheetId = sheetIdMatch[1];
      // Check for gid (specific tab)
      const gidMatch = csvUrl.match(/[#&]gid=([0-9]+)/);
      const gidPart = gidMatch ? `&gid=${gidMatch[1]}` : '';
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidPart}`;
    }

    const response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) {
      throw new Error(`دریافت اطلاعات گوگل‌شیت با خطا مواجه شد (${response.status}: ${response.statusText}). لطفاً مطمئن شوید دسترسی شیت روی "Anyone with the link can view" یا "Publish to web" تنظیم شده باشد.`);
    }

    const csvText = await response.text();
    return res.json({ success: true, csvText, resolvedUrl: csvUrl });
  } catch (error: any) {
    console.error('Google Sheet Sync Error:', error);
    return res.status(500).json({ error: error.message || 'Google Sheet fetch failed' });
  }
});

/**
 * ============================================================================
 * BACKGROUND TRANSLATION ENGINE (Server-Side Persistence)
 * Allows translation to continue seamlessly even if the browser tab is closed!
 * ============================================================================
 */

interface BackgroundJobEntry {
  id: string;
  msgid: string;
  msgid_plural?: string;
}

interface BackgroundJobTerm {
  en: string;
  fa: string;
  primaryFa: string;
  alternates?: string[];
}

interface BackgroundJob {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error';
  fileName: string;
  total: number;
  completed: number;
  currentText: string;
  speedPerMin: number;
  estimatedSecondsLeft: number;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  appliedTermsCount: number;
  error?: string;
  results: Record<
    string,
    {
      msgstr: string;
      msgstr_plural?: string[];
      appliedTerms: { en: string; originalFa: string; approvedFa: string }[];
    }
  >;
}

let currentBackgroundJob: BackgroundJob | null = null;
let backgroundJobCancelRequested = false;

const COMMON_SERVER_MISTRANSLATIONS: Record<string, string[]> = {
  import: [
    'واردات',
    'وارد کردن',
    'وارد نمایید',
    'وارد کنید',
    'وارد شدن',
    'وارد سازی',
    'واردسازی',
    'ایمپورت',
    'وارد',
  ],
  imports: [
    'واردات',
    'درون ریزی ها',
    'درون‌ریزی‌ها',
  ],
  imported: [
    'وارد شده',
    'وارد گردیده',
    'واردات شده',
    'وارد گشته',
  ],
  importing: [
    'در حال وارد کردن',
    'وارد کردن',
    'وارد سازی',
    'واردسازی',
  ],
  importer: [
    'وارد کننده',
    'واردکننده',
    'ایمپورتر',
  ],
  importers: [
    'وارد کنندگان',
    'واردکنندگان',
    'وارد کننده‌ها',
  ],
  export: [
    'صادرات',
    'صادر کردن',
    'صادر نمایید',
    'صادر کنید',
    'صادر شدن',
    'صادر سازی',
    'صادرسازی',
    'اکسپورت',
    'صادر',
  ],
  exports: [
    'صادرات',
    'برون ریزی ها',
    'برون‌بری‌ها',
    'برون بری ها',
  ],
  exported: [
    'صادر شده',
    'صادر گردیده',
    'صادرات شده',
  ],
  exporting: [
    'در حال صادر کردن',
    'صادر کردن',
    'صادر سازی',
    'صادرسازی',
  ],
  exporter: [
    'صادر کننده',
    'صادرکننده',
    'اکسپورتر',
  ],
  exporters: [
    'صادر کنندگان',
    'صادرکنندگان',
    'صادر کننده‌ها',
  ],
  admin: ['مدیریت', 'ادمین', 'مدیران', 'ادمین‌ها'],
  administration: ['ادمین', 'مدیر', 'مدیریت'],
  administrator: ['ادمین', 'مدیریت کل', 'مدیرسیستم', 'مدیر کل'],
  comment: ['نظر', 'کامنت', 'دیدگاه'],
  comments: ['نظرات', 'کامنت‌ها', 'دیدگاه‌ها'],
  plugin: ['پلاگین', 'پلاگین‌ها', 'افزونه'],
  plugins: ['پلاگین‌ها', 'پلاگین', 'افزونه‌ها'],
  theme: ['تم', 'قالب', 'پوسته'],
  themes: ['تم‌ها', 'قالب‌ها', 'پوسته‌ها'],
  post: ['پست', 'مطلب', 'ارسال', 'نوشته'],
  posts: ['پست‌ها', 'مطالب', 'ارسال‌ها', 'نوشته‌ها'],
  page: ['صفحه'],
  pages: ['صفحات', 'صفحه‌ها'],
  dashboard: ['داشبورد', 'پیشخوان', 'میزکار'],
  trash: ['سطل زباله', 'سطل آشغال', 'زباله‌دان', 'آشغال'],
  tag: ['تگ', 'برچسب'],
  tags: ['تگ‌ها', 'برچسب‌ها'],
  category: ['کتگوری', 'دسته‌بندی', 'دسته بندی', 'دسته'],
  categories: ['دسته‌بندی‌ها', 'دسته بندی ها', 'کتگوری‌ها', 'دسته‌ها'],
  customizer: ['شخصی‌ساز', 'شخصی ساز', 'کاستومایزر', 'سفارشی‌ساز', 'سفارشی ساز'],
  customize: ['شخصی‌سازی', 'شخصی سازی', 'کاستومایز', 'سفارشی‌سازی', 'سفارشی سازی'],
  permalink: ['لینک ثابت', 'پیوند دائمی', 'پیوند یکتا', 'پرملینک', 'پیوند ثابت'],
  media: ['چندرسانه‌ای', 'مدیا', 'رسانه'],
  widget: ['ویجت', 'ابزارک'],
  widgets: ['ویجت‌ها', 'ابزارک‌ها'],
  header: ['هدر', 'سربرگ'],
  footer: ['فوتر', 'پابرگ'],
  sidebar: ['سایدبار', 'نوار کناری'],
  feed: ['فید', 'خوراک'],
  excerpt: ['خلاصه', 'برگزیده', 'گزیده', 'چکیده'],
  slug: ['اسلاگ', 'حلزون', 'نامک'],
  database: ['دیتابیس', 'بانک اطلاعاتی', 'پایگاه‌داده'],
  upload: ['آپلود', 'ارسال', 'ارسال فایل', 'بارگذاری'],
  download: ['دانلود', 'دریافت'],
  settings: ['تنظیمات', 'پیکربندی'],
  preview: ['پیش نمایش', 'پیش‌نمایش'],
  spam: ['اسپم', 'جفنگ', 'هرزنامه'],
  draft: ['پیشنویس', 'چرکنویس', 'پیش‌نویس'],
  publish: ['پابلیش', 'منتشر کردن', 'انتشار'],
  published: ['پابلیش شده', 'منتشر شده', 'انتشار یافته'],
  user: ['یوزر', 'استفاده کننده', 'کاربر'],
  users: ['یوزرها', 'کاربران', 'کاربرها'],
  login: ['ورود به سیستم', 'لاگین', 'وارد شوید', 'ورود'],
  logout: ['خروج از سیستم', 'لاگ اوت', 'خارج شوید', 'خروج'],
};

function maskPlaceholdersServer(text: string): { masked: string; placeholders: string[] } {
  const placeholders: string[] = [];
  let counter = 0;
  const patterns = [
    /<[^>]+>/g,
    /&[a-zA-Z0-9#]+;/g,
    /%(?:\d+\$)?[+-]?(?:[ 0]|'.)?-?\d*(?:\.\d+)?[bcdeEufFgGosxX]/g,
    /\{[a-zA-Z0-9_.-]+\}/g,
    /\[[a-zA-Z0-9_.-]+\]/g,
    /https?:\/\/[^\s"'<>]+/g,
  ];
  let masked = text;
  for (const regex of patterns) {
    masked = masked.replace(regex, (match) => {
      const token = `__PH_${counter}__`;
      placeholders.push(match);
      counter++;
      return token;
    });
  }
  return { masked, placeholders };
}

function unmaskPlaceholdersServer(text: string, placeholders: string[]): string {
  let result = text;
  for (let i = 0; i < placeholders.length; i++) {
    const regex = new RegExp(`__\\s*PH_${i}\\s*__`, 'gi');
    result = result.replace(regex, placeholders[i]);
  }
  return result;
}

function applyServerGlossary(
  sourceEn: string,
  rawFa: string,
  glossary: BackgroundJobTerm[]
): { finalFa: string; applied: { en: string; originalFa: string; approvedFa: string }[] } {
  if (!glossary || glossary.length === 0) {
    return { finalFa: rawFa, applied: [] };
  }

  let finalFa = rawFa;
  const applied: { en: string; originalFa: string; approvedFa: string }[] = [];
  const lowerSource = sourceEn.toLowerCase();

  for (const term of glossary) {
    if (!term.en || !term.primaryFa) continue;
    const termEnLower = term.en.toLowerCase().trim();
    const wordBoundaryRegex = new RegExp(`\\b${termEnLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (!wordBoundaryRegex.test(lowerSource)) {
      continue;
    }

    const approvedFa = term.primaryFa.trim();
    const normalizedApproved = approvedFa.replace(/[\u200c\s]+/g, '[\\u200c\\s]?');
    const approvedRegex = new RegExp(`(^|[\\s،.؛:؟!])(${normalizedApproved})([\\s،.؛:؟!]|$)`, 'u');
    if (approvedRegex.test(finalFa)) {
      applied.push({ en: term.en, originalFa: approvedFa, approvedFa });
      continue;
    }

    let replaced = false;
    const candidates = [
      ...(term.alternates || []),
      ...(COMMON_SERVER_MISTRANSLATIONS[termEnLower] || []),
    ].sort((a, b) => b.length - a.length);

    for (const cand of candidates) {
      if (!cand || cand === approvedFa) continue;
      const candRegex = new RegExp(`(^|[\\s،.؛:؟!])(${cand.trim()})([\\s،.؛:؟!]|$)`, 'u');
      if (candRegex.test(finalFa)) {
        finalFa = finalFa.replace(candRegex, `$1${approvedFa}$3`);
        applied.push({ en: term.en, originalFa: cand, approvedFa });
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      if (termEnLower === 'import') {
        if (/وارد\s*کردن/u.test(finalFa)) {
          finalFa = finalFa.replace(/وارد\s*کردن/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'وارد کردن', approvedFa });
          replaced = true;
        } else if (/وارد\s*نمایید/u.test(finalFa)) {
          finalFa = finalFa.replace(/وارد\s*نمایید/gu, `${approvedFa} نمایید`);
          applied.push({ en: term.en, originalFa: 'وارد نمایید', approvedFa });
          replaced = true;
        } else if (/وارد\s*کنید/u.test(finalFa)) {
          finalFa = finalFa.replace(/وارد\s*کنید/gu, `${approvedFa} کنید`);
          applied.push({ en: term.en, originalFa: 'وارد کنید', approvedFa });
          replaced = true;
        } else if (/واردات/u.test(finalFa)) {
          finalFa = finalFa.replace(/واردات/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'واردات', approvedFa });
          replaced = true;
        } else if (/وارد\s*سازی/u.test(finalFa)) {
          finalFa = finalFa.replace(/وارد\s*سازی/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'واردسازی', approvedFa });
          replaced = true;
        } else if (/ایمپورت/u.test(finalFa)) {
          finalFa = finalFa.replace(/ایمپورت/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'ایمپورت', approvedFa });
          replaced = true;
        } else if (/(^|[\s،.؛:؟!])وارد([\s،.؛:؟!]|$)/u.test(finalFa)) {
          finalFa = finalFa.replace(/(^|[\s،.؛:؟!])وارد([\s،.؛:؟!]|$)/u, `$1${approvedFa}$2`);
          applied.push({ en: term.en, originalFa: 'وارد', approvedFa });
          replaced = true;
        }
      } else if (termEnLower === 'export') {
        if (/صادر\s*کردن/u.test(finalFa)) {
          finalFa = finalFa.replace(/صادر\s*کردن/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'صادر کردن', approvedFa });
          replaced = true;
        } else if (/صادر\s*نمایید/u.test(finalFa)) {
          finalFa = finalFa.replace(/صادر\s*نمایید/gu, `${approvedFa} نمایید`);
          applied.push({ en: term.en, originalFa: 'صادر نمایید', approvedFa });
          replaced = true;
        } else if (/صادر\s*کنید/u.test(finalFa)) {
          finalFa = finalFa.replace(/صادر\s*کنید/gu, `${approvedFa} کنید`);
          applied.push({ en: term.en, originalFa: 'صادر کنید', approvedFa });
          replaced = true;
        } else if (/صادرات/u.test(finalFa)) {
          finalFa = finalFa.replace(/صادرات/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'صادرات', approvedFa });
          replaced = true;
        } else if (/صادر\s*سازی/u.test(finalFa)) {
          finalFa = finalFa.replace(/صادر\s*سازی/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'صادرسازی', approvedFa });
          replaced = true;
        } else if (/اکسپورت/u.test(finalFa)) {
          finalFa = finalFa.replace(/اکسپورت/gu, approvedFa);
          applied.push({ en: term.en, originalFa: 'اکسپورت', approvedFa });
          replaced = true;
        }
      } else if (termEnLower === 'importer' && (finalFa.includes('وارد کننده') || finalFa.includes('واردکننده'))) {
        finalFa = finalFa.replace(/وارد\s*کننده/gu, approvedFa);
        applied.push({ en: term.en, originalFa: 'واردکننده', approvedFa });
        replaced = true;
      } else if (termEnLower === 'exporter' && (finalFa.includes('صادر کننده') || finalFa.includes('صادرکننده'))) {
        finalFa = finalFa.replace(/صادر\s*کننده/gu, approvedFa);
        applied.push({ en: term.en, originalFa: 'صادرکننده', approvedFa });
        replaced = true;
      } else if (termEnLower === 'admin' && (finalFa.includes('مدیریت') || finalFa.includes('ادمین'))) {
        finalFa = finalFa.replace(/مدیریت|ادمین/gu, approvedFa);
        if (/\bfor\b/i.test(sourceEn) && !finalFa.includes('برای')) {
          finalFa = finalFa.replace(new RegExp(`(${approvedFa})\\s+`, 'u'), `$1 برای `);
        }
        applied.push({ en: term.en, originalFa: 'مدیریت/ادمین', approvedFa });
        replaced = true;
      }
    }

    const strippedSource = sourceEn.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
    if (strippedSource === termEnLower) {
      const trailingPunc = rawFa.match(/[:؛؟!.]+$/)?.[0] || (sourceEn.endsWith(':') ? ':' : '');
      finalFa = approvedFa + trailingPunc;
      applied.push({ en: term.en, originalFa: rawFa, approvedFa });
    }
  }

  return { finalFa, applied };
}

async function runServerBackgroundTranslation(
  job: BackgroundJob,
  entries: BackgroundJobEntry[],
  glossary: BackgroundJobTerm[],
  engine: 'google' | 'gemini'
) {
  const startTime = Date.now();
  let totalAppliedTerms = 0;

  for (let i = 0; i < entries.length; i++) {
    if (backgroundJobCancelRequested) {
      job.status = 'cancelled';
      job.updatedAt = Date.now();
      break;
    }

    const entry = entries[i];
    job.currentText = entry.msgid.slice(0, 80);
    job.updatedAt = Date.now();

    try {
      // 1. Singular translation
      const { masked, placeholders } = maskPlaceholdersServer(entry.msgid);
      const rawTrans = await translateFreeGoogle(masked);
      const unmasked = unmaskPlaceholdersServer(rawTrans, placeholders);
      const { finalFa, applied } = applyServerGlossary(entry.msgid, unmasked, glossary);

      totalAppliedTerms += applied.length;

      // 2. Plural translation (if exists)
      let pluralTrans = '';
      let pluralApplied: any[] = [];
      if (entry.msgid_plural) {
        const pMask = maskPlaceholdersServer(entry.msgid_plural);
        const pRaw = await translateFreeGoogle(pMask.masked);
        const pUnmasked = unmaskPlaceholdersServer(pRaw, pMask.placeholders);
        const pProcessed = applyServerGlossary(entry.msgid_plural, pUnmasked, glossary);
        pluralTrans = pProcessed.finalFa;
        pluralApplied = pProcessed.applied;
        totalAppliedTerms += pluralApplied.length;
      }

      job.results[entry.id] = {
        msgstr: finalFa,
        msgstr_plural: entry.msgid_plural ? [finalFa, pluralTrans] : undefined,
        appliedTerms: [...applied, ...pluralApplied],
      };

      job.completed = i + 1;
      job.appliedTermsCount = totalAppliedTerms;

      // Speed & ETA calculation
      const elapsedMs = Math.max(Date.now() - startTime, 1000);
      const speedPerMin = Math.round((job.completed / (elapsedMs / 1000)) * 60);
      const remainingCount = entries.length - job.completed;
      const estimatedSecondsLeft = speedPerMin > 0 ? Math.round((remainingCount / speedPerMin) * 60) : 0;

      job.speedPerMin = speedPerMin;
      job.estimatedSecondsLeft = estimatedSecondsLeft;

      // Friendly non-blocking delay every 5 translations
      if (i % 5 === 0 && i > 0) {
        await new Promise((r) => setTimeout(r, 90));
      }
    } catch (err: any) {
      console.error(`Error translating entry ${entry.id} in background:`, err);
    }
  }

  if (job.status !== 'cancelled') {
    job.status = 'completed';
    job.finishedAt = Date.now();
    job.estimatedSecondsLeft = 0;
    job.updatedAt = Date.now();
  }
}

/**
 * Start a server-side background translation job
 */
app.post('/api/background-job/start', async (req, res) => {
  try {
    const { fileName, entries, glossary, engine = 'google' } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'هیچ سطری برای ترجمه در پس‌زمینه ارسال نشده است.' });
    }

    // Cancel any currently running job
    backgroundJobCancelRequested = true;
    await new Promise((r) => setTimeout(r, 100));

    backgroundJobCancelRequested = false;
    const jobId = 'bg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    currentBackgroundJob = {
      id: jobId,
      status: 'running',
      fileName: fileName || 'wordpress.po',
      total: entries.length,
      completed: 0,
      currentText: '',
      speedPerMin: 0,
      estimatedSecondsLeft: 0,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      appliedTermsCount: 0,
      results: {},
    };

    // Kick off asynchronous task in the background without waiting for it to finish!
    runServerBackgroundTranslation(
      currentBackgroundJob,
      entries,
      Array.isArray(glossary) ? glossary : [],
      engine
    ).catch((err) => {
      console.error('Background translation worker error:', err);
      if (currentBackgroundJob) {
        currentBackgroundJob.status = 'error';
        currentBackgroundJob.error = err.message || 'خطای ناشناخته در پس‌زمینه';
      }
    });

    return res.json({
      success: true,
      jobId,
      message: 'عملیات ترجمه در پس‌زمینه سرور با موفقیت آغاز شد. می‌توانید پنجره مرورگر را ببندید یا اینترنت خود را قطع کنید؛ سرور پردازش را تا انتها ادامه خواهد داد.',
    });
  } catch (error: any) {
    console.error('Start background job error:', error);
    return res.status(500).json({ error: error.message || 'Failed to start background translation' });
  }
});

/**
 * Check the status of current background job
 */
app.get('/api/background-job/status', (req, res) => {
  if (!currentBackgroundJob) {
    return res.json({ status: 'idle' });
  }

  // Return lightweight status without dumping all results
  const { results, ...statusLight } = currentBackgroundJob;
  return res.json({
    status: statusLight.status,
    job: statusLight,
    resultsCount: Object.keys(results).length,
  });
});

/**
 * Retrieve completed results to merge into PO file
 */
app.get('/api/background-job/results', (req, res) => {
  if (!currentBackgroundJob) {
    return res.status(404).json({ error: 'هیچ کاری در سرور یافت نشد.' });
  }

  return res.json({
    success: true,
    jobId: currentBackgroundJob.id,
    status: currentBackgroundJob.status,
    total: currentBackgroundJob.total,
    completed: currentBackgroundJob.completed,
    appliedTermsCount: currentBackgroundJob.appliedTermsCount,
    results: currentBackgroundJob.results,
  });
});

/**
 * Cancel the active background job
 */
app.post('/api/background-job/cancel', (req, res) => {
  if (currentBackgroundJob && currentBackgroundJob.status === 'running') {
    backgroundJobCancelRequested = true;
    currentBackgroundJob.status = 'cancelled';
    currentBackgroundJob.updatedAt = Date.now();
  }
  return res.json({ success: true, message: 'دستور لغو فرآیند پس‌زمینه ارسال شد.' });
});

/**
 * Dismiss / clear current job
 */
app.post('/api/background-job/clear', (req, res) => {
  currentBackgroundJob = null;
  backgroundJobCancelRequested = false;
  return res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PO/MO Translator server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
