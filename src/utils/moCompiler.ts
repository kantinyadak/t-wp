import { POEntry, POFile } from '../types';
import { parsePOHeader } from './poParser';

const MO_MAGIC = 0x950412de; // little endian
const MO_MAGIC_REVERSED = 0xde120495; // big endian

interface MOStringItem {
  orig: Uint8Array;
  trans: Uint8Array;
  origStr: string;
  transStr: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

/**
 * Compiles a POFile into standard GNU Gettext Binary .mo format
 */
export function compileMO(poFile: POFile): Uint8Array {
  const items: MOStringItem[] = [];

  // Item 0: Header
  const headerLines: string[] = [];
  const rawHeaders: Record<string, string> = {
    'Project-Id-Version': poFile.header.projectIdVersion || 'WordPress',
    'Report-Msgid-Bugs-To': poFile.header.reportBugsTo || '',
    'POT-Creation-Date': poFile.header.potCreationDate || new Date().toISOString(),
    'PO-Revision-Date': new Date().toISOString(),
    'Last-Translator': poFile.header.lastTranslator || 'Translator',
    'Language-Team': poFile.header.languageTeam || 'Persian',
    'Language': poFile.header.language || 'fa_IR',
    'MIME-Version': poFile.header.mimeVersion || '1.0',
    'Content-Type': poFile.header.contentType || 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding': poFile.header.contentTransferEncoding || '8bit',
    'Plural-Forms': poFile.header.pluralForms || 'nplurals=2; plural=(n > 1);',
    'X-Generator': 'PO/MO Smart Translator',
    ...poFile.header.rawHeaders,
  };

  for (const [k, v] of Object.entries(rawHeaders)) {
    if (v) {
      headerLines.push(`${k}: ${v}`);
    }
  }
  const headerStr = headerLines.join('\n') + '\n';
  const headerBytes = encoder.encode(headerStr);

  items.push({
    orig: new Uint8Array(0),
    trans: headerBytes,
    origStr: '',
    transStr: headerStr,
  });

  // Entries
  for (const entry of poFile.entries) {
    if (!entry.msgid && entry.msgid !== '') continue;

    // Construct original string
    let origText = entry.msgid;
    if (entry.msgctxt) {
      origText = `${entry.msgctxt}\x04${origText}`;
    }
    if (entry.msgid_plural) {
      origText = `${origText}\x00${entry.msgid_plural}`;
    }

    // Construct translation string
    let transText = '';
    if (entry.msgid_plural) {
      const parts = entry.msgstr && entry.msgstr.length > 0 ? entry.msgstr : ['', ''];
      transText = parts.join('\x00');
    } else {
      transText = (entry.msgstr && entry.msgstr[0]) || '';
    }

    const origBytes = encoder.encode(origText);
    const transBytes = encoder.encode(transText);

    items.push({
      orig: origBytes,
      trans: transBytes,
      origStr: origText,
      transStr: transText,
    });
  }

  // Sort items 1..N by original string bytes lexicographically (item 0 header stays first)
  const headerItem = items[0];
  const restItems = items.slice(1);
  restItems.sort((a, b) => {
    const minLen = Math.min(a.orig.length, b.orig.length);
    for (let i = 0; i < minLen; i++) {
      if (a.orig[i] !== b.orig[i]) {
        return a.orig[i] - b.orig[i];
      }
    }
    return a.orig.length - b.orig.length;
  });

  const sortedItems = [headerItem, ...restItems];
  const numStrings = sortedItems.length;

  // Header size: 7 * 4 = 28 bytes
  const headerSize = 28;
  const tableOOffset = headerSize;
  const tableTOffset = tableOOffset + numStrings * 8;
  let currentStringOffset = tableTOffset + numStrings * 8;

  // Calculate total size needed
  let totalStringsSize = 0;
  for (const item of sortedItems) {
    totalStringsSize += item.orig.length + 1; // +1 null byte
    totalStringsSize += item.trans.length + 1; // +1 null byte
  }

  const totalFileSize = currentStringOffset + totalStringsSize;
  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  // Write MO Header
  view.setUint32(0, MO_MAGIC, true); // magic
  view.setUint32(4, 0, true); // revision
  view.setUint32(8, numStrings, true); // number of strings
  view.setUint32(12, tableOOffset, true); // orig table offset
  view.setUint32(16, tableTOffset, true); // trans table offset
  view.setUint32(20, 0, true); // hash table size
  view.setUint32(24, 0, true); // hash table offset

  // Write original strings & fill Table O
  for (let i = 0; i < numStrings; i++) {
    const item = sortedItems[i];
    const len = item.orig.length;
    const offset = currentStringOffset;

    // Table O entry
    view.setUint32(tableOOffset + i * 8, len, true);
    view.setUint32(tableOOffset + i * 8 + 4, offset, true);

    // Copy original bytes
    uint8View.set(item.orig, offset);
    uint8View[offset + len] = 0; // null terminator
    currentStringOffset += len + 1;
  }

  // Write translated strings & fill Table T
  for (let i = 0; i < numStrings; i++) {
    const item = sortedItems[i];
    const len = item.trans.length;
    const offset = currentStringOffset;

    // Table T entry
    view.setUint32(tableTOffset + i * 8, len, true);
    view.setUint32(tableTOffset + i * 8 + 4, offset, true);

    // Copy translated bytes
    uint8View.set(item.trans, offset);
    uint8View[offset + len] = 0; // null terminator
    currentStringOffset += len + 1;
  }

  return uint8View;
}

/**
 * Parses an existing .mo binary file into POFile
 */
export function parseMO(data: ArrayBuffer, fileName: string = 'messages.mo'): POFile {
  const view = new DataView(data);
  const magic = view.getUint32(0, true);

  let isLittleEndian = true;
  if (magic === MO_MAGIC) {
    isLittleEndian = true;
  } else if (magic === MO_MAGIC_REVERSED) {
    isLittleEndian = false;
  } else {
    throw new Error('فایل انتخاب شده فرمت معتبر MO ندارد (Invalid MO file magic number).');
  }

  const numStrings = view.getUint32(8, isLittleEndian);
  const tableOOffset = view.getUint32(12, isLittleEndian);
  const tableTOffset = view.getUint32(16, isLittleEndian);

  const uint8View = new Uint8Array(data);

  function readStringAt(tableOffset: number, index: number): string {
    const len = view.getUint32(tableOffset + index * 8, isLittleEndian);
    const offset = view.getUint32(tableOffset + index * 8 + 4, isLittleEndian);
    const slice = uint8View.slice(offset, offset + len);
    return decoder.decode(slice);
  }

  let headerRaw = '';
  const entries: POEntry[] = [];

  for (let i = 0; i < numStrings; i++) {
    const orig = readStringAt(tableOOffset, i);
    const trans = readStringAt(tableTOffset, i);

    if (orig === '') {
      headerRaw = trans;
      continue;
    }

    let msgctxt: string | undefined;
    let msgid = orig;
    let msgid_plural: string | undefined;

    // Check for context separator \x04
    const ctxtIdx = orig.indexOf('\x04');
    if (ctxtIdx !== -1) {
      msgctxt = orig.substring(0, ctxtIdx);
      msgid = orig.substring(ctxtIdx + 1);
    }

    // Check for plural separator \x00
    const pluralIdx = msgid.indexOf('\x00');
    if (pluralIdx !== -1) {
      msgid_plural = msgid.substring(pluralIdx + 1);
      msgid = msgid.substring(0, pluralIdx);
    }

    // Translations: plural is separated by \x00
    const msgstr = trans.split('\x00');
    const isTranslated = msgstr.some(s => s && s.trim().length > 0);

    entries.push({
      id: `mo-entry-${i}`,
      comments: [],
      extractedComments: [],
      references: [],
      flags: [],
      msgctxt,
      msgid,
      msgid_plural,
      msgstr,
      isTranslated,
      isFuzzy: false,
      isApproved: isTranslated,
    });
  }

  const header = parsePOHeader(headerRaw);

  return {
    fileName: fileName.replace(/\.mo$/i, '.po'),
    header,
    entries,
    rawHeaderString: headerRaw,
  };
}
