import { GlossaryTerm } from '../types';

/**
 * Normalizes Persian characters (Arabic kaf/yeh to Persian, zero-width space normalization)
 */
export function normalizePersian(text: string): string {
  if (!text) return '';
  return text
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '\u200c') // normalize zero-width spaces
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Common alternative mistranslations or loan words for WordPress terms in Google Translate
 */
const COMMON_MISTRANSLATIONS: Record<string, string[]> = {
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

export interface MatchedTermInfo {
  term: GlossaryTerm;
  matchIndex: number;
  matchLength: number;
}

/**
 * Scans English text for matching glossary terms.
 * Multi-word terms are matched first (longest first).
 */
export function findGlossaryMatches(text: string, glossary: GlossaryTerm[]): MatchedTermInfo[] {
  if (!text || !glossary || glossary.length === 0) return [];

  // Sort glossary by english term length descending
  const sorted = [...glossary].sort((a, b) => b.en.length - a.en.length);
  const matches: MatchedTermInfo[] = [];
  const occupiedIndices = new Set<number>();

  for (const term of sorted) {
    const termEn = term.en.trim();
    if (!termEn) continue;

    // Create regex with word boundary
    // Escape special regex characters in term
    const escaped = termEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const len = match[0].length;

      // Check if overlapping with a longer match
      let isOverlap = false;
      for (let i = start; i < start + len; i++) {
        if (occupiedIndices.has(i)) {
          isOverlap = true;
          break;
        }
      }

      if (!isOverlap) {
        for (let i = start; i < start + len; i++) {
          occupiedIndices.add(i);
        }
        matches.push({
          term,
          matchIndex: start,
          matchLength: len,
        });
      }
    }
  }

  return matches.sort((a, b) => a.matchIndex - b.matchIndex);
}

/**
 * Placeholder & format specifier protector
 */
export function protectPlaceholders(text: string): {
  maskedText: string;
  placeholders: string[];
} {
  const placeholders: string[] = [];
  
  // Protect standard printf specs (%s, %d, %1$s, %2$d, etc.), HTML tags, {var} templates
  const patterns = [
    /%(\d+\$)?[+-]?\d*(\.\d+)?[sScCdDoxXfFeEgG]/g, // printf specifiers
    /%[a-zA-Z%]/g,
    /<[^>]+>/g, // HTML tags
    /\{[a-zA-Z0-9_-]+\}/g, // template vars {name}
    /&[a-zA-Z0-9#]+;/g, // HTML entities
  ];

  let masked = text;
  let counter = 0;

  for (const regex of patterns) {
    masked = masked.replace(regex, (match) => {
      const token = `__PH_${counter++}__`;
      placeholders.push(match);
      return token;
    });
  }

  return { maskedText: masked, placeholders };
}

/**
 * Restores protected placeholders in translated text
 */
export function restorePlaceholders(text: string, placeholders: string[]): string {
  let result = text;
  for (let i = 0; i < placeholders.length; i++) {
    const token = `__PH_${i}__`;
    // Replace even if Google translate put spaces or lowercase
    const regex = new RegExp(`__\\s*PH_${i}\\s*__`, 'gi');
    result = result.replace(regex, placeholders[i]);
  }
  return result;
}

/**
 * Post-processes Persian translation by strictly replacing words with approved terms.
 * For example: if English was "admin for wordpress", and raw translation was "مدیریت برای وردپرس",
 * this function recognizes that "admin" was in the source, and replaces "مدیریت" (or "ادمین") with "مدیر"!
 */
export function applyApprovedGlossary(
  sourceEn: string,
  rawTranslatedFa: string,
  glossary: GlossaryTerm[]
): {
  finalTranslation: string;
  appliedTerms: { en: string; originalFa: string; approvedFa: string }[];
} {
  const matches = findGlossaryMatches(sourceEn, glossary);
  if (matches.length === 0) {
    return { finalTranslation: rawTranslatedFa, appliedTerms: [] };
  }

  let finalTranslation = rawTranslatedFa;
  const appliedTerms: { en: string; originalFa: string; approvedFa: string }[] = [];

  for (const { term } of matches) {
    const enKey = term.en.toLowerCase().trim();
    const approvedFa = term.primaryFa.trim();

    // 1. Check if the approved term is already present (allowing either ZWNJ or normal space)
    const normalizedApproved = approvedFa.replace(/[\u200c\s]+/g, '[\\u200c\\s]?');
    const approvedRegex = new RegExp(`(^|[\\s،.؛:؟!])(${normalizedApproved})([\\s،.؛:؟!]|$)`, 'u');
    if (approvedRegex.test(finalTranslation)) {
      appliedTerms.push({
        en: term.en,
        originalFa: approvedFa,
        approvedFa,
      });
      continue;
    }

    // 2. Check for known mistranslations of this term, sorted by length descending so longer phrases match first
    let replaced = false;
    const knownMistranslations = COMMON_MISTRANSLATIONS[enKey] || [];
    
    // Also include other alternates from the glossary entry
    const allCandidates = Array.from(new Set([
      ...knownMistranslations,
      ...term.alternates.map(a => a.trim()).filter(a => a !== approvedFa),
    ])).sort((a, b) => b.length - a.length);

    for (const mistranslation of allCandidates) {
      if (!mistranslation || mistranslation === approvedFa) continue;
      const misRegex = new RegExp(`(^|[\\s،.؛:؟!])(${mistranslation})([\\s،.؛:؟!]|$)`, 'u');
      if (misRegex.test(finalTranslation)) {
        finalTranslation = finalTranslation.replace(misRegex, `$1${approvedFa}$3`);
        appliedTerms.push({
          en: term.en,
          originalFa: mistranslation,
          approvedFa,
        });
        replaced = true;
        break;
      }
    }

    // 3. Special handling for critical terms like import, export, admin, etc.
    if (!replaced) {
      if (enKey === 'import') {
        if (/وارد\s*کردن/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/وارد\s*کردن/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'وارد کردن', approvedFa });
          replaced = true;
        } else if (/وارد\s*نمایید/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/وارد\s*نمایید/gu, `${approvedFa} نمایید`);
          appliedTerms.push({ en: term.en, originalFa: 'وارد نمایید', approvedFa });
          replaced = true;
        } else if (/وارد\s*کنید/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/وارد\s*کنید/gu, `${approvedFa} کنید`);
          appliedTerms.push({ en: term.en, originalFa: 'وارد کنید', approvedFa });
          replaced = true;
        } else if (/واردات/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/واردات/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'واردات', approvedFa });
          replaced = true;
        } else if (/وارد\s*سازی/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/وارد\s*سازی/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'واردسازی', approvedFa });
          replaced = true;
        } else if (/ایمپورت/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/ایمپورت/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'ایمپورت', approvedFa });
          replaced = true;
        } else if (/(^|[\s،.؛:؟!])وارد([\s،.؛:؟!]|$)/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/(^|[\s،.؛:؟!])وارد([\s،.؛:؟!]|$)/u, `$1${approvedFa}$2`);
          appliedTerms.push({ en: term.en, originalFa: 'وارد', approvedFa });
          replaced = true;
        }
      } else if (enKey === 'export') {
        if (/صادر\s*کردن/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/صادر\s*کردن/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'صادر کردن', approvedFa });
          replaced = true;
        } else if (/صادر\s*نمایید/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/صادر\s*نمایید/gu, `${approvedFa} نمایید`);
          appliedTerms.push({ en: term.en, originalFa: 'صادر نمایید', approvedFa });
          replaced = true;
        } else if (/صادر\s*کنید/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/صادر\s*کنید/gu, `${approvedFa} کنید`);
          appliedTerms.push({ en: term.en, originalFa: 'صادر کنید', approvedFa });
          replaced = true;
        } else if (/صادرات/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/صادرات/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'صادرات', approvedFa });
          replaced = true;
        } else if (/صادر\s*سازی/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/صادر\s*سازی/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'صادرسازی', approvedFa });
          replaced = true;
        } else if (/اکسپورت/u.test(finalTranslation)) {
          finalTranslation = finalTranslation.replace(/اکسپورت/gu, approvedFa);
          appliedTerms.push({ en: term.en, originalFa: 'اکسپورت', approvedFa });
          replaced = true;
        }
      } else if (enKey === 'importer' && (finalTranslation.includes('وارد کننده') || finalTranslation.includes('واردکننده'))) {
        finalTranslation = finalTranslation.replace(/وارد\s*کننده/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'واردکننده', approvedFa });
        replaced = true;
      } else if (enKey === 'exporter' && (finalTranslation.includes('صادر کننده') || finalTranslation.includes('صادرکننده'))) {
        finalTranslation = finalTranslation.replace(/صادر\s*کننده/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'صادرکننده', approvedFa });
        replaced = true;
      } else if (enKey === 'admin' && (finalTranslation.includes('مدیریت') || finalTranslation.includes('ادمین'))) {
        finalTranslation = finalTranslation.replace(/مدیریت|ادمین/gu, approvedFa);
        if (/\bfor\b/i.test(sourceEn) && !finalTranslation.includes('برای')) {
          finalTranslation = finalTranslation.replace(new RegExp(`(${approvedFa})\\s+`, 'u'), `$1 برای `);
        }
        appliedTerms.push({ en: term.en, originalFa: 'مدیریت/ادمین', approvedFa });
        replaced = true;
      } else if (enKey === 'wordpress' && finalTranslation.includes('ورد پرس')) {
        finalTranslation = finalTranslation.replace(/ورد\s*پرس/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'ورد پرس', approvedFa });
        replaced = true;
      } else if (enKey === 'theme' && (finalTranslation.includes('تم') || finalTranslation.includes('قالب'))) {
        finalTranslation = finalTranslation.replace(/تم|قالب/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'تم/قالب', approvedFa });
        replaced = true;
      } else if (enKey === 'plugin' && finalTranslation.includes('پلاگین')) {
        finalTranslation = finalTranslation.replace(/پلاگین/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'پلاگین', approvedFa });
        replaced = true;
      } else if (enKey === 'post' && finalTranslation.includes('پست')) {
        finalTranslation = finalTranslation.replace(/پست/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'پست', approvedFa });
        replaced = true;
      } else if (enKey === 'comment' && (finalTranslation.includes('کامنت') || finalTranslation.includes('نظر'))) {
        finalTranslation = finalTranslation.replace(/کامنت|نظر/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'کامنت/نظر', approvedFa });
        replaced = true;
      } else if (enKey === 'dashboard' && finalTranslation.includes('داشبورد')) {
        finalTranslation = finalTranslation.replace(/داشبورد/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'داشبورد', approvedFa });
        replaced = true;
      } else if (enKey === 'trash' && (finalTranslation.includes('سطل زباله') || finalTranslation.includes('سطل آشغال'))) {
        finalTranslation = finalTranslation.replace(/سطل\s*(زباله|آشغال)/gu, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'سطل زباله', approvedFa });
        replaced = true;
      }
    }

    // 4. If single-term text (e.g. source was just "Import" or "Import:" or "Import..."), force exact approved term!
    const strippedSource = sourceEn.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
    if (strippedSource === enKey) {
      const trailingPunc = rawTranslatedFa.match(/[:؛؟!.]+$/)?.[0] || (sourceEn.endsWith(':') ? ':' : '');
      finalTranslation = approvedFa + trailingPunc;
      appliedTerms.push({ en: term.en, originalFa: rawTranslatedFa, approvedFa });
    }
  }

  return {
    finalTranslation: finalTranslation.trim(),
    appliedTerms,
  };
}
