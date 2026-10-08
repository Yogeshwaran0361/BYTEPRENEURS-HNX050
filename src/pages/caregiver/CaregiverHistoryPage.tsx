import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { medicationLogService, HistoryFilterRange } from '../../services/medicationLogService';
import { caregiverService } from '../../services/caregiverService';
import { MedicationLog, CaregiverConnection } from '../../types';
import { Clock, CheckCircle2, Calendar, User, Filter } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const CaregiverHistoryPage: React.FC = () => {
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [selectedAdultId, setSelectedAdultId] = useState<string>('all');
  const [filterRange, setFilterRange] = useState<HistoryFilterRange>('today');
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const connsRes = await caregiverService.getConnectedAdults();
        setConnections(connsRes.data || []);

        const targetAdult = selectedAdultId;
        const res = await medicationLogService.getLogs(targetAdult, filterRange);
        setLogs(res.data || []);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedAdultId, filterRange]);

  if (isLoading) return <LoadingState message={t('common.loading', 'Loading...')} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t('caregiver.historyTitle', 'Medication Activity History')}
        subtitle={t('caregiver.historySubtitle', 'Review confirmation records and routine timelines across your connected older adults.')}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), href: '/caregiver/dashboard' },
          { label: t('nav.history', 'History') },
        ]}
      />

      {/* Filter Toolbar: Adult Selection & Date Range */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Person Filter */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-nest-ink-muted" />
          <span className="text-sm font-bold text-nest-ink">{t('nav.olderAdults', 'Older Adults')}:</span>
          <select
            value={selectedAdultId}
            onChange={e => setSelectedAdultId(e.target.value)}
            className="px-3 py-1.5 rounded-tactile border border-nest-border bg-nest-surface text-nest-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            <option value="all">{t('caregiver.allConnectedAdults', 'All Connected Adults')}</option>
            {connections.map(c => (
              <option key={c.id} value={c.older_adult_id}>
                {c.older_adult?.preferred_name || 'Senior'}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Tabs */}
        <div className="inline-flex p-1 bg-nest-surface-subtle border border-nest-border rounded-tactile gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterRange('today')}
            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
              filterRange === 'today' ? 'bg-white text-nest-ink shadow-sm' : 'text-nest-ink-muted'
            }`}
          >
            {t('common.today', 'Today')}
          </button>
          <button
            type="button"
            onClick={() => setFilterRange('7days')}
            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
              filterRange === '7days' ? 'bg-white text-nest-ink shadow-sm' : 'text-nest-ink-muted'
            }`}
          >
            {t('common.past7days', 'Past 7 Days')}
          </button>
          <button
            type="button"
            onClick={() => setFilterRange('30days')}
            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
              filterRange === '30days' ? 'bg-white text-nest-ink shadow-sm' : 'text-nest-ink-muted'
            }`}
          >
            {t('common.past30days', 'Past 30 Days')}
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState
          title="No history recorded for this period"
          description="Medication confirmation records will appear here as connected older adults complete their daily routines."
        />
      ) : (
        <div className="space-y-3">
          {logs.map(log => {
            const isTaken = log.status === 'TAKEN';
            const logDate = new Date(log.created_at);

            return (
              <Card key={log.id} variant="default" className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-tactile flex items-center justify-center shrink-0 border ${
                      isTaken
                        ? 'bg-olive-50 text-olive-700 border-olive-200'
                        : 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border'
                    }`}
                  >
                    {isTaken ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    {(() => {
                      const adult = connections.find(c => c.older_adult_id === log.older_adult_id)?.older_adult;
                      const adultName = adult?.preferred_name || adult?.profile?.full_name || 'Senior';
                      return (
                        <strong className="text-lg text-nest-ink block">
                          {adultName} confirmed {log.medicine?.name || 'Medication'} ({log.medicine?.dosage || 'Dose'})
                        </strong>
                      );
                    })()}
                    <div className="text-sm text-nest-ink-muted mt-0.5">
                      <span>Scheduled for {new Date(log.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {log.confirmed_at || log.taken_at ? (
                        <span className="text-olive-700 font-bold ml-1.5">
                          • Recorded at {new Date(log.confirmed_at || log.taken_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : null}
                    </div>
                    {log.notes && (
                      <span className="text-xs text-nest-ink-muted italic block mt-0.5">
                        {log.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2 sm:pt-0 border-nest-border/70">
                  <StatusBadge status={log.status} />
                  <div className="text-xs text-nest-ink-muted font-semibold">
                    {new Date(log.scheduled_for).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
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
