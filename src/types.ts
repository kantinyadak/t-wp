export interface GlossaryTerm {
  id: string;
  en: string;
  fa: string;
  primaryFa: string;
  alternates: string[];
  pos?: string;
  description?: string;
  isOfficial?: boolean;
  source?: 'default' | 'sheet' | 'custom';
  updatedAt?: number;
}

export type WordPressProjectType = 'plugin' | 'theme' | 'core' | 'custom';

export interface POHeader {
  projectType?: WordPressProjectType;
  pluginName?: string;
  themeName?: string;
  coreComponent?: 'general' | 'admin' | 'network' | 'continents-cities';
  textDomain?: string;
  domainPath?: string;
  projectIdVersion?: string;
  reportBugsTo?: string;
  potCreationDate?: string;
  poRevisionDate?: string;
  lastTranslator?: string;
  languageTeam?: string;
  language?: string;
  mimeVersion?: string;
  contentType?: string;
  contentTransferEncoding?: string;
  pluralForms?: string;
  xGenerator?: string;
  xDomain?: string;
  rawHeaders: Record<string, string>;
}

export interface POEntry {
  id: string;
  comments: string[];
  extractedComments: string[];
  references: string[];
  flags: string[];
  previousMsgctxt?: string;
  previousMsgid?: string;
  msgctxt?: string;
  msgid: string;
  msgid_plural?: string;
  msgstr: string[];
  matchedTerms?: { en: string; fa: string }[];
  rawGoogleTranslate?: string;
  isTranslated: boolean;
  isFuzzy: boolean;
  isApproved: boolean;
  isUserEdited?: boolean;
}

export interface POFile {
  fileName: string;
  header: POHeader;
  entries: POEntry[];
  rawHeaderString?: string;
}

export type TranslationEngine = 'google' | 'gemini';

export interface TranslationStats {
  total: number;
  translated: number;
  untranslated: number;
  glossaryMatched: number;
  fuzzy: number;
}

export interface SyncStatus {
  lastSyncTime: number | null;
  sheetUrl: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
  totalTerms: number;
}

export interface BackgroundJobStatus {
  id: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
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
}
