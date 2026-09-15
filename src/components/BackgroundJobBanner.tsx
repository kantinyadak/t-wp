import React from 'react';
import { Cloud, CheckCircle2, AlertCircle, Loader2, X, Download, Play, RefreshCw, Clock, Zap } from 'lucide-react';
import { BackgroundJobStatus } from '../types';

interface BackgroundJobBannerProps {
  jobStatus: BackgroundJobStatus | null;
  onApplyResults: () => void;
  onCancelJob: () => void;
  onClearJob: () => void;
  isApplyingResults?: boolean;
}

export const BackgroundJobBanner: React.FC<BackgroundJobBannerProps> = ({
  jobStatus,
  onApplyResults,
  onCancelJob,
  onClearJob,
  isApplyingResults = false,
}) => {
  if (!jobStatus || jobStatus.status === 'idle') return null;

  const percent = jobStatus.total > 0 ? Math.round((jobStatus.completed / jobStatus.total) * 100) : 0;

  // Format seconds to human readable
  const formatSeconds = (sec: number) => {
    if (sec <= 0) return 'چند لحظه دیگر';
    if (sec < 60) return `${sec} ثانیه`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} دقیقه و ${s} ثانیه`;
  };

  // 1. RUNNING STATE
  if (jobStatus.status === 'running') {
    return (
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-4 py-3 sm:px-6 shadow-md border-b border-indigo-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-700/60 shrink-0 relative">
              <Cloud className="w-5 h-5 text-indigo-200 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-indigo-900 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">ترجمه ابری در پس‌زمینه سرور فعال است</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  مستقل از مرورگر
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                می‌توانید با خیال راحت پنجره مرورگر را ببندید یا اینترنت را قطع کنید؛ سرور کار ترجمه را تا انتها انجام می‌دهد.
              </p>
            </div>
          </div>

          {/* Progress & stats */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-indigo-100">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>سرعت:</span>
              <strong className="font-mono text-white">{jobStatus.speedPerMin} سطر/دقیقه</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-300" />
              <span>زمان باقی‌مانده:</span>
              <strong className="font-mono text-white">{formatSeconds(jobStatus.estimatedSecondsLeft)}</strong>
            </div>

            <div className="flex items-center gap-2 min-w-36">
              <span className="font-mono font-bold text-emerald-300">{percent}%</span>
              <div className="w-24 bg-indigo-950/80 rounded-full h-2 overflow-hidden border border-indigo-700/50">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-indigo-200">
                ({jobStatus.completed.toLocaleString('fa-IR')} / {jobStatus.total.toLocaleString('fa-IR')})
              </span>
            </div>

            <button
              type="button"
              onClick={onCancelJob}
              className="px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs transition-colors"
            >
              توقف کار
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. COMPLETED STATE
  if (jobStatus.status === 'completed') {
    return (
      <div className="bg-emerald-900/95 text-white px-4 py-3 sm:px-6 shadow-md border-b border-emerald-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-800 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">ترجمه پس‌زمینه سرور با موفقیت به پایان رسید!</h4>
              <p className="text-xs text-emerald-200 mt-0.5">
                تعداد <strong>{jobStatus.completed.toLocaleString('fa-IR')}</strong> سطر ترجمه شد و{' '}
                <strong>{jobStatus.appliedTermsCount.toLocaleString('fa-IR')}</strong> واژه مصوب از واژه‌نامه اعمال گردید.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onApplyResults}
              disabled={isApplyingResults}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {isApplyingResults ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال ادغام با فایل...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>اعمال ترجمه‌ها به جدول فایل</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClearJob}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors"
              title="بستن این پیام"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. CANCELLED OR ERROR
  if (jobStatus.status === 'cancelled' || jobStatus.status === 'error') {
    return (
      <div className="bg-slate-800 text-white px-4 py-2.5 sm:px-6 border-b border-slate-700 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>
            {jobStatus.status === 'cancelled'
              ? `ترجمه پس‌زمینه لغو شد (${jobStatus.completed} سطر ترجمه شده است).`
              : `خطا در فرآیند پس‌زمینه: ${jobStatus.error || 'خطای سرور'}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {jobStatus.completed > 0 && (
            <button
              type="button"
              onClick={onApplyResults}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              اعمال ترجمه‌های تا این لحظه ({jobStatus.completed.toLocaleString('fa-IR')})
            </button>
          )}
          <button
            type="button"
            onClick={onClearJob}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
