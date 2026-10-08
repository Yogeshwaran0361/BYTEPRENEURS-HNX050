import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { medicationLogService, HistoryFilterRange } from '../../services/medicationLogService';
import { MedicationLog } from '../../types';
import { Check, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const SeniorHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [filter, setFilter] = useState<HistoryFilterRange>('today');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  const loadHistory = async (range: HistoryFilterRange) => {
    setIsLoading(true);
    try {
      const res = await medicationLogService.getLogs(undefined, range);
      setLogs(res.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(filter);
  }, [filter]);

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader
        title={t('senior.historyTitle', 'Medication History')}
        subtitle={t('senior.historySubtitle', 'What happened with your medication routine. A clear, calm record.')}
        breadcrumbs={[
          { label: t('nav.home', 'Home'), href: '/senior/dashboard' },
          { label: t('nav.history', 'History') },
        ]}
      />

      {/* Date Filtering Bar (Today / 7 Days / 30 Days) */}
      <div className="flex items-center gap-2 p-1 bg-nest-surface-subtle rounded-tactile border border-nest-border w-fit">
        <button
          type="button"
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-md text-base font-bold transition-all ${
            filter === 'today'
              ? 'bg-nest-surface text-terracotta-700 shadow-tactile-sm border border-terracotta-200'
              : 'text-nest-ink-muted hover:text-nest-ink'
          }`}
          aria-pressed={filter === 'today'}
        >
          {t('common.today', 'Today')}
        </button>
        <button
          type="button"
          onClick={() => setFilter('7days')}
          className={`px-4 py-2 rounded-md text-base font-bold transition-all ${
            filter === '7days'
              ? 'bg-nest-surface text-terracotta-700 shadow-tactile-sm border border-terracotta-200'
              : 'text-nest-ink-muted hover:text-nest-ink'
          }`}
          aria-pressed={filter === '7days'}
        >
          {t('common.past7days', 'Past 7 Days')}
        </button>
        <button
          type="button"
          onClick={() => setFilter('30days')}
          className={`px-4 py-2 rounded-md text-base font-bold transition-all ${
            filter === '30days'
              ? 'bg-nest-surface text-terracotta-700 shadow-tactile-sm border border-terracotta-200'
              : 'text-nest-ink-muted hover:text-nest-ink'
          }`}
          aria-pressed={filter === '30days'}
        >
          {t('common.past30days', 'Past 30 Days')}
        </button>
      </div>

      {isLoading ? (
        <LoadingState message={t('common.loading', 'Loading...')} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-nest-ink-muted" />}
          title={t('senior.noHistory', 'No history recorded for this period')}
          description={t('senior.noHistoryDesc', 'When you confirm taking your medicines on the Home screen, a calm record will appear here.')}
        />
      ) : (
        <div className="space-y-3">
          {logs.map(log => {
            const isTaken = log.status === 'TAKEN';
            const logDate = new Date(log.created_at);

            return (
              <Card
                key={log.id}
                variant="default"
                className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                      isTaken
                        ? 'bg-olive-500 text-white border-olive-600 shadow-tactile-sm'
                        : 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border'
                    }`}
                  >
                    {isTaken ? (
                      <Check className="w-7 h-7 stroke-[3]" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xl font-black text-nest-ink">
                        {log.medicine?.name || 'Medication'}
                      </strong>
                      <span className="text-base text-nest-ink-muted font-semibold">
                        ({log.medicine?.dosage || 'Dose'})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-nest-ink-muted mt-1">
                      <span>{t('senior.scheduledFor', 'Scheduled for')} {new Date(log.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {log.confirmed_at || log.taken_at ? (
                        <span className="text-olive-700 font-bold">
                          • {t('senior.confirmed', 'Confirmed')} {new Date(log.confirmed_at || log.taken_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : null}
                    </div>

                    {log.notes && (
                      <div className="text-xs text-nest-ink-muted mt-0.5 italic">
                        {log.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-nest-border/70">
                  <VoiceReminderButton
                    log={log}
                    variant="default"
                    size="small"
                  />
                  <StatusBadge status={log.status} />

                  <div className="text-right text-xs text-nest-ink-muted font-semibold min-w-[70px]">
                    <div>
                      {new Date(log.scheduled_for).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
