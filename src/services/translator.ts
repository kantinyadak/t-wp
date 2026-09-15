import { GlossaryTerm, POEntry } from '../types';
import {
  applyApprovedGlossary,
  findGlossaryMatches,
  protectPlaceholders,
  restorePlaceholders,
} from '../utils/glossaryEngine';

export interface TranslateItemResult {
  entry: POEntry;
  rawGoogleTranslate: string;
  finalTranslation: string;
  appliedTerms: { en: string; originalFa: string; approvedFa: string }[];
}

/**
 * Translates a single text string with strict approved glossary enforcement
 */
export async function translateSingleString(
  text: string,
  glossary: GlossaryTerm[],
  engine: 'google' | 'gemini' = 'google'
): Promise<{
  rawTranslation: string;
  finalTranslation: string;
  appliedTerms: { en: string; originalFa: string; approvedFa: string }[];
}> {
  if (!text || !text.trim()) {
    return { rawTranslation: '', finalTranslation: '', appliedTerms: [] };
  }

  // 1. Protect placeholders (%s, %d, tags, etc.)
  const { maskedText, placeholders } = protectPlaceholders(text);

  // 2. Find matching approved glossary terms
  const matchedTerms = findGlossaryMatches(text, glossary);
  const relevantRules = matchedTerms.map(m => ({
    en: m.term.en,
    fa: m.term.primaryFa,
  }));

  // 3. Call translation engine
  let rawTranslatedMasked = '';

  if (engine === 'gemini') {
    try {
      const response = await fetch('/api/translate-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [maskedText],
          glossaryRules: relevantRules,
        }),
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.translations) && data.translations[0]) {
        rawTranslatedMasked = data.translations[0];
      } else {
        throw new Error(data.error || 'Gemini error');
      }
    } catch {
      // Fallback to Google Translate if Gemini fails
      rawTranslatedMasked = await callGoogleTranslate(maskedText);
    }
  } else {
    rawTranslatedMasked = await callGoogleTranslate(maskedText);
  }

  if (!rawTranslatedMasked || !rawTranslatedMasked.trim()) {
    throw new Error('پاسخ معتبری از موتور ترجمه دریافت نشد.');
  }

  // 4. Restore placeholders
  const rawTranslation = restorePlaceholders(rawTranslatedMasked, placeholders);

  // 5. CRITICAL: Strictly apply approved glossary replacement
  // "حتی اگر گوگل ترجمه کرد و چیز دیگری بود اول باید از کلمات و لغات تایید شده استفاده بشه و بعد از ترجمه گوگل"
  // "مثلا admin for wordpress بود ترجمه گوگل میشد مدیریت برای وردپرس ولی کلمه admin در گوگل شیت بود مدیر جمله نهایی باید بشه مدیر برای وردپرس"
  const { finalTranslation, appliedTerms } = applyApprovedGlossary(text, rawTranslation, glossary);

  return {
    rawTranslation,
    finalTranslation,
    appliedTerms,
  };
}

/**
 * Direct Google Translate call via backend proxy
 */
async function callGoogleTranslate(text: string): Promise<string> {
  const response = await fetch('/api/translate-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `خطا در فراخوانی گوگل ترنسلیت: ${response.status}`);
  }

  const data = await response.json();
  if (data.translations && data.translations[0]) {
    const candidate = data.translations[0];
    if (candidate && candidate.trim()) {
      return candidate;
    }
  }
  throw new Error('عدم دریافت ترجمه از سرور گوگل ترنسلیت');
}

/**
 * Batch translates a list of PO entries with progress reporting and high-speed concurrent execution.
 * Uses a worker pool to translate multiple entries in parallel (3-5x faster) while still
 * streaming every completed row to the UI immediately for real-time review.
 */
export async function batchTranslateEntries(
  entries: POEntry[],
  glossary: GlossaryTerm[],
  engine: 'google' | 'gemini',
  onProgress: (completed: number, total: number, currentMsgid: string) => void,
  shouldCancel?: () => boolean,
  onEntryTranslated?: (result: TranslateItemResult) => void
): Promise<TranslateItemResult[]> {
  const results: TranslateItemResult[] = [];
  const total = entries.length;
  if (total === 0) return results;

  let completedCount = 0;
  let nextIndex = 0;
  const concurrency = engine === 'gemini' ? 3 : 5;

  async function worker() {
    while (nextIndex < total) {
      if (shouldCancel && shouldCancel()) {
        break;
      }
      const currentIndex = nextIndex++;
      const entry = entries[currentIndex];
      if (!entry) break;

      onProgress(completedCount, total, entry.msgid);

      try {
        // Translate singular msgid
        const res = await translateSingleString(entry.msgid, glossary, engine);

        // If plural exists, also translate plural
        let pluralTranslation = '';
        if (entry.msgid_plural) {
          const pluralRes = await translateSingleString(entry.msgid_plural, glossary, engine);
          pluralTranslation = pluralRes.finalTranslation;
        }

        const updatedMsgstr = entry.msgid_plural
          ? [res.finalTranslation, pluralTranslation || res.finalTranslation]
          : [res.finalTranslation];

        const updatedEntry: POEntry = {
          ...entry,
          msgstr: updatedMsgstr,
          isTranslated: true,
          isFuzzy: false,
          isApproved: true,
          rawGoogleTranslate: res.rawTranslation,
          matchedTerms: res.appliedTerms.map(t => ({ en: t.en, fa: t.approvedFa })),
        };

        const itemResult: TranslateItemResult = {
          entry: updatedEntry,
          rawGoogleTranslate: res.rawTranslation,
          finalTranslation: res.finalTranslation,
          appliedTerms: res.appliedTerms,
        };

        results.push(itemResult);

        // Immediately notify listener so the row appears translated in the UI in real-time
        if (onEntryTranslated) {
          onEntryTranslated(itemResult);
        }
      } catch (err) {
        console.error(`Error translating entry "${entry.msgid}":`, err);
        results.push({
          entry,
          rawGoogleTranslate: '',
          finalTranslation: entry.msgstr[0] || '',
          appliedTerms: [],
        });
      } finally {
        completedCount++;
        onProgress(completedCount, total, entry.msgid);
      }
    }
  }

  // Launch parallel workers
  const workerPromises = Array.from(
    { length: Math.min(concurrency, total) },
    () => worker()
  );
  await Promise.all(workerPromises);

  onProgress(total, total, 'تکمیل شد');
  return results;
}
