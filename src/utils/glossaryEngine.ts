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
  'admin': ['مدیریت', 'ادمین', 'مدیران', 'ادمین‌ها'],
  'administration': ['ادمین', 'مدیر'],
  'administrator': ['ادمین', 'مدیریت کل', 'مدیرسیستم'],
  'comment': ['نظر', 'کامنت', 'دیدگاه'],
  'comments': ['نظرات', 'کامنت‌ها', 'دیدگاه‌ها'],
  'plugin': ['پلاگین', 'پلاگین‌ها', 'افزونه'],
  'plugins': ['پلاگین‌ها', 'پلاگین', 'افزونه‌ها'],
  'theme': ['تم', 'قالب', 'پوسته'],
  'themes': ['تم‌ها', 'قالب‌ها', 'پوسته‌ها'],
  'post': ['پست', 'مطلب', 'ارسال', 'نوشته'],
  'posts': ['پست‌ها', 'مطالب', 'ارسال‌ها', 'نوشته‌ها'],
  'dashboard': ['داشبورد', 'پیشخوان'],
  'trash': ['سطل زباله', 'سطل آشغال', 'زباله‌دان'],
  'tag': ['تگ', 'برچسب'],
  'tags': ['تگ‌ها', 'برچسب‌ها'],
  'category': ['کتگوری', 'دسته‌بندی', 'دسته'],
  'categories': ['دسته‌بندی‌ها', 'کتگوری‌ها', 'دسته‌ها'],
  'customizer': ['شخصی‌ساز', 'کاستومایزر', 'سفارشی‌ساز'],
  'permalink': ['لینک ثابت', 'پیوند دائمی', 'پیوند یکتا'],
  'media': ['چندرسانه‌ای', 'مدیا', 'رسانه'],
  'widget': ['ویجت', 'ابزارک'],
  'widgets': ['ویجت‌ها', 'ابزارک‌ها'],
  'header': ['هدر', 'سربرگ'],
  'footer': ['فوتر', 'پابرگ'],
  'sidebar': ['سایدبار', 'نوار کناری'],
  'feed': ['فید', 'خوراک'],
  'excerpt': ['خلاصه', 'چکیده'],
  'slug': ['اسلاگ', 'نامک'],
  'database': ['دیتابیس', 'پایگاه‌داده'],
  'upload': ['آپلود', 'ارسال', 'ارسال فایل'],
  'download': ['دانلود', 'دریافت'],
  'settings': ['تنظیمات', 'پیکربندی'],
  'preview': ['پیش نمایش', 'پیش‌نمایش'],
  'spam': ['اسپم', 'جفنگ', 'هرزنامه'],
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

    // 1. Check if the approved term is already present as a whole word
    const approvedRegex = new RegExp(`(^|[\\s،.؛:؟!])(${approvedFa})([\\s،.؛:؟!]|$)`, 'u');
    if (approvedRegex.test(finalTranslation)) {
      appliedTerms.push({
        en: term.en,
        originalFa: approvedFa,
        approvedFa,
      });
      continue;
    }

    // 2. Check for known mistranslations of this term
    let replaced = false;
    const knownMistranslations = COMMON_MISTRANSLATIONS[enKey] || [];
    
    // Also include other alternates from the glossary entry
    const allCandidates = Array.from(new Set([
      ...knownMistranslations,
      ...term.alternates.map(a => a.trim()).filter(a => a !== approvedFa),
    ]));

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

    // 3. Special handling for singular/simple terms where Google Translate used a different noun
    // e.g. "admin" in "admin for wordpress" -> Google gives "مدیریت برای وردپرس" or "ادمین وردپرس"
    if (!replaced) {
      if (enKey === 'admin' && (finalTranslation.includes('مدیریت') || finalTranslation.includes('ادمین'))) {
        finalTranslation = finalTranslation.replace(/مدیریت|ادمین/g, approvedFa);
        // If source had "for" and translated text was e.g. "مدیر وردپرس", refine to "مدیر برای وردپرس"
        if (/\bfor\b/i.test(sourceEn) && !finalTranslation.includes('برای')) {
          finalTranslation = finalTranslation.replace(new RegExp(`(${approvedFa})\\s+`, 'u'), `$1 برای `);
        }
        appliedTerms.push({ en: term.en, originalFa: 'مدیریت/ادمین', approvedFa });
        replaced = true;
      } else if (enKey === 'wordpress' && finalTranslation.includes('ورد پرس')) {
        finalTranslation = finalTranslation.replace(/ورد\s*پرس/g, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'ورد پرس', approvedFa });
        replaced = true;
      } else if (enKey === 'theme' && (finalTranslation.includes('تم') || finalTranslation.includes('قالب'))) {
        finalTranslation = finalTranslation.replace(/تم|قالب/g, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'تم/قالب', approvedFa });
        replaced = true;
      } else if (enKey === 'plugin' && finalTranslation.includes('پلاگین')) {
        finalTranslation = finalTranslation.replace(/پلاگین/g, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'پلاگین', approvedFa });
        replaced = true;
      } else if (enKey === 'post' && finalTranslation.includes('پست')) {
        finalTranslation = finalTranslation.replace(/پست/g, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'پست', approvedFa });
        replaced = true;
      } else if (enKey === 'comment' && (finalTranslation.includes('کامنت') || finalTranslation.includes('نظر'))) {
        finalTranslation = finalTranslation.replace(/کامنت|نظر/g, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'کامنت/نظر', approvedFa });
        replaced = true;
      } else if (enKey === 'dashboard' && finalTranslation.includes('داشبورد')) {
        finalTranslation = finalTranslation.replace(/داشبورد/g, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'داشبورد', approvedFa });
        replaced = true;
      } else if (enKey === 'trash' && finalTranslation.includes('سطل زباله')) {
        finalTranslation = finalTranslation.replace(/سطل زباله/g, approvedFa);
        appliedTerms.push({ en: term.en, originalFa: 'سطل زباله', approvedFa });
        replaced = true;
      }
    }

    // If still not present and single-term text (e.g. source was just "Admin"), force exact approved term!
    if (sourceEn.trim().toLowerCase() === enKey) {
      finalTranslation = approvedFa;
      appliedTerms.push({ en: term.en, originalFa: rawTranslatedFa, approvedFa });
    }
  }

  return {
    finalTranslation: finalTranslation.trim(),
    appliedTerms,
  };
}
