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
