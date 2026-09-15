import { POEntry, POFile, POHeader } from '../types';

/**
 * Unescapes PO string literals
 */
export function unescapePOString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Escapes string for PO output
 */
export function escapePOString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Formats a string as PO quoted lines
 */
export function formatPOString(label: string, text: string): string {
  if (text.includes('\n')) {
    const lines = text.split('\n');
    let out = `${label} ""\n`;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasNewline = i < lines.length - 1;
      const content = escapePOString(line) + (hasNewline ? '\\n' : '');
      out += `"${content}"\n`;
    }
    return out;
  } else {
    return `${label} "${escapePOString(text)}"\n`;
  }
}

/**
 * Parses raw .po file content into POFile
 */
export function parsePO(content: string, fileName: string = 'messages.po'): POFile {
  const lines = content.split(/\r?\n/);
  const entries: POEntry[] = [];
  
  let currentComments: string[] = [];
  let currentExtracted: string[] = [];
  let currentRefs: string[] = [];
  let currentFlags: string[] = [];
  let currentPrevMsgctxt: string | undefined;
  let currentPrevMsgid: string | undefined;
  
  let currentContext: string | undefined;
  let currentMsgid: string | null = null;
  let currentMsgidPlural: string | undefined;
  let currentMsgstr: string[] = [];
  
  let state: 'NONE' | 'MSGCTXT' | 'MSGID' | 'MSGID_PLURAL' | 'MSGSTR' | 'MSGSTR_PLURAL' = 'NONE';
  let pluralIndex = 0;
  
  let headerString = '';
  let isHeaderParsed = false;
  let entryIndex = 0;

  function commitEntry() {
    if (currentMsgid !== null) {
      if (!isHeaderParsed && currentMsgid === '') {
        // Header entry
        headerString = currentMsgstr[0] || '';
        isHeaderParsed = true;
      } else {
        const isTranslated = currentMsgstr.some(s => s && s.trim().length > 0);
        const isFuzzy = currentFlags.some(f => f.toLowerCase().includes('fuzzy'));
        entries.push({
          id: `entry-${entryIndex++}`,
          comments: [...currentComments],
          extractedComments: [...currentExtracted],
          references: [...currentRefs],
          flags: [...currentFlags],
          previousMsgctxt: currentPrevMsgctxt,
          previousMsgid: currentPrevMsgid,
          msgctxt: currentContext,
          msgid: currentMsgid,
          msgid_plural: currentMsgidPlural,
          msgstr: currentMsgstr.length > 0 ? [...currentMsgstr] : [''],
          isTranslated,
          isFuzzy,
          isApproved: isTranslated && !isFuzzy,
        });
      }
    }

    currentComments = [];
    currentExtracted = [];
    currentRefs = [];
    currentFlags = [];
    currentPrevMsgctxt = undefined;
    currentPrevMsgid = undefined;
    currentContext = undefined;
    currentMsgid = null;
    currentMsgidPlural = undefined;
    currentMsgstr = [];
    state = 'NONE';
  }

  function extractString(line: string): string {
    const match = line.match(/^[^"]*"(.*)"\s*$/);
    if (match) {
      return unescapePOString(match[1]);
    }
    return '';
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      commitEntry();
      continue;
    }

    if (line.startsWith('#')) {
      if (line.startsWith('#.')) {
        currentExtracted.push(line.substring(2).trim());
      } else if (line.startsWith('#:')) {
        currentRefs.push(line.substring(2).trim());
      } else if (line.startsWith('#,')) {
        currentFlags.push(line.substring(2).trim());
      } else if (line.startsWith('#|')) {
        const prevContent = line.substring(2).trim();
        if (prevContent.startsWith('msgctxt')) {
          currentPrevMsgctxt = extractString(prevContent);
        } else if (prevContent.startsWith('msgid')) {
          currentPrevMsgid = extractString(prevContent);
        }
      } else {
        currentComments.push(line.substring(1).trim());
      }
      continue;
    }

    if (line.startsWith('msgctxt ')) {
      state = 'MSGCTXT';
      currentContext = extractString(line);
      continue;
    }

    if (line.startsWith('msgid ')) {
      state = 'MSGID';
      currentMsgid = extractString(line);
      continue;
    }

    if (line.startsWith('msgid_plural ')) {
      state = 'MSGID_PLURAL';
      currentMsgidPlural = extractString(line);
      continue;
    }

    if (line.startsWith('msgstr ')) {
      state = 'MSGSTR';
      currentMsgstr = [extractString(line)];
      continue;
    }

    const pluralMatch = line.match(/^msgstr\[(\d+)\]\s*(.*)$/);
    if (pluralMatch) {
      state = 'MSGSTR_PLURAL';
      pluralIndex = parseInt(pluralMatch[1], 10);
      while (currentMsgstr.length <= pluralIndex) {
        currentMsgstr.push('');
      }
      currentMsgstr[pluralIndex] = extractString(pluralMatch[2]);
      continue;
    }

    if (line.startsWith('"') && line.endsWith('"')) {
      const extra = extractString(line);
      if (state === 'MSGCTXT' && currentContext !== undefined) {
        currentContext += extra;
      } else if (state === 'MSGID' && currentMsgid !== null) {
        currentMsgid += extra;
      } else if (state === 'MSGID_PLURAL' && currentMsgidPlural !== undefined) {
        currentMsgidPlural += extra;
      } else if (state === 'MSGSTR' && currentMsgstr.length > 0) {
        currentMsgstr[0] += extra;
      } else if (state === 'MSGSTR_PLURAL' && currentMsgstr[pluralIndex] !== undefined) {
        currentMsgstr[pluralIndex] += extra;
      }
    }
  }

  // commit last entry
  commitEntry();

  // Parse header
  const header = parsePOHeader(headerString);

  return {
    fileName,
    header,
    entries,
    rawHeaderString: headerString,
  };
}

/**
 * Parses header block lines into POHeader
 */
export function parsePOHeader(raw: string): POHeader {
  const rawHeaders: Record<string, string> = {};
  const lines = raw.split('\n');
  
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      const val = line.substring(colonIdx + 1).trim();
      rawHeaders[key] = val;
    }
  }

  const textDomain = rawHeaders['X-Domain'] || rawHeaders['X-Poedit-KeywordsList'] || '';
  const domainPath = rawHeaders['X-Poedit-SearchPath-0'] || rawHeaders['Domain-Path'] || '';
  
  let projectType: 'plugin' | 'theme' | 'core' | 'custom' = 'custom';
  const projVersion = rawHeaders['Project-Id-Version'] || '';
  if (projVersion.toLowerCase().includes('core') || projVersion.toLowerCase().startsWith('wordpress')) {
    projectType = 'core';
  } else if (textDomain) {
    projectType = 'plugin';
  }

  return {
    projectType,
    textDomain: textDomain || undefined,
    domainPath: domainPath || undefined,
    xDomain: textDomain || undefined,
    projectIdVersion: rawHeaders['Project-Id-Version'] || '',
    reportBugsTo: rawHeaders['Report-Msgid-Bugs-To'] || '',
    potCreationDate: rawHeaders['POT-Creation-Date'] || new Date().toISOString(),
    poRevisionDate: rawHeaders['PO-Revision-Date'] || new Date().toISOString(),
    lastTranslator: rawHeaders['Last-Translator'] || '',
    languageTeam: rawHeaders['Language-Team'] || 'Persian',
    language: rawHeaders['Language'] || 'fa_IR',
    mimeVersion: rawHeaders['MIME-Version'] || '1.0',
    contentType: rawHeaders['Content-Type'] || 'text/plain; charset=UTF-8',
    contentTransferEncoding: rawHeaders['Content-Transfer-Encoding'] || '8bit',
    pluralForms: rawHeaders['Plural-Forms'] || 'nplurals=2; plural=(n > 1);',
    xGenerator: rawHeaders['X-Generator'] || 'PO/MO Smart Translator',
    rawHeaders,
  };
}

/**
 * Generates a valid standard .po file string from POFile
 */
export function generatePO(poFile: POFile): string {
  let out = '';

  // Header entry
  out += 'msgid ""\n';
  out += 'msgstr ""\n';

  const headers: Record<string, string> = {
    'Project-Id-Version': poFile.header.projectIdVersion || 'WordPress',
    'Report-Msgid-Bugs-To': poFile.header.reportBugsTo || '',
    'POT-Creation-Date': poFile.header.potCreationDate || new Date().toISOString().replace('T', ' ').substring(0, 19) + '+0000',
    'PO-Revision-Date': new Date().toISOString().replace('T', ' ').substring(0, 19) + '+0000',
    'Last-Translator': poFile.header.lastTranslator || '',
    'Language-Team': poFile.header.languageTeam || 'Persian',
    'Language': poFile.header.language || 'fa_IR',
    'MIME-Version': poFile.header.mimeVersion || '1.0',
    'Content-Type': poFile.header.contentType || 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding': poFile.header.contentTransferEncoding || '8bit',
    'Plural-Forms': poFile.header.pluralForms || 'nplurals=2; plural=(n > 1);',
    'X-Generator': 'PO/MO Smart Translator with Approved Glossary',
    ...(poFile.header.textDomain ? { 'X-Domain': poFile.header.textDomain } : {}),
    ...(poFile.header.domainPath ? { 'X-Poedit-SearchPath-0': poFile.header.domainPath } : {}),
    ...poFile.header.rawHeaders,
  };

  for (const [k, v] of Object.entries(headers)) {
    if (v) {
      out += `"${k}: ${escapePOString(v)}\\n"\n`;
    }
  }
  out += '\n';

  // Entries
  for (const entry of poFile.entries) {
    // Comments
    for (const c of entry.comments) {
      out += `# ${c}\n`;
    }
    for (const ec of entry.extractedComments) {
      out += `#. ${ec}\n`;
    }
    for (const r of entry.references) {
      out += `#: ${r}\n`;
    }
    if (entry.flags.length > 0) {
      out += `#, ${entry.flags.join(', ')}\n`;
    }
    if (entry.previousMsgctxt) {
      out += `#| msgctxt "${escapePOString(entry.previousMsgctxt)}"\n`;
    }
    if (entry.previousMsgid) {
      out += `#| msgid "${escapePOString(entry.previousMsgid)}"\n`;
    }

    if (entry.msgctxt) {
      out += formatPOString('msgctxt', entry.msgctxt);
    }

    out += formatPOString('msgid', entry.msgid);

    if (entry.msgid_plural) {
      out += formatPOString('msgid_plural', entry.msgid_plural);
      const strList = entry.msgstr.length > 0 ? entry.msgstr : ['', ''];
      for (let idx = 0; idx < strList.length; idx++) {
        out += formatPOString(`msgstr[${idx}]`, strList[idx] || '');
      }
    } else {
      out += formatPOString('msgstr', entry.msgstr[0] || '');
    }

    out += '\n';
  }

  return out;
}
