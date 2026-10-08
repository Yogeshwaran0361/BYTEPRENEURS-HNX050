import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { medicationLogService, HistoryFilterRange } from '../../services/medicationLogService';
import { caregiverService } from '../../services/caregiverService';
import { MedicationLog, CaregiverConnection } from '../../types';
import { Clock, CheckCircle2, Calendar, User, Filter, Shield } from 'lucide-react';

export const CaretakerHistoryPage: React.FC = () => {
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [selectedAdultId, setSelectedAdultId] = useState<string>('all');
  const [filterRange, setFilterRange] = useState<HistoryFilterRange>('today');
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) return <LoadingState message="Loading medication confirmation logs..." />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-olive-800 bg-olive-100/80 px-2.5 py-0.5 rounded border border-olive-300">
              <Shield className="w-3.5 h-3.5 text-olive-700" />
              Caretaker History Log
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-nest-ink tracking-tight mt-1.5">
            Medication Activity History
          </h1>
          <p className="text-lg text-nest-ink-muted mt-1">
            Review confirmation records and routine timelines across your monitored older adults.
          </p>
        </div>
      </div>

      {/* Filter Toolbar: Adult Selection & Date Range */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between p-4 bg-white rounded-tactile border border-nest-border">
        {/* Person Filter */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-nest-ink-muted" />
          <span className="text-sm font-bold text-nest-ink">Older Adult:</span>
          <select
            value={selectedAdultId}
            onChange={e => setSelectedAdultId(e.target.value)}
            className="px-3 py-1.5 rounded-tactile border border-nest-border bg-nest-surface text-nest-ink text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-olive-500"
          >
            <option value="all">All Monitored Adults</option>
            {connections.map(c => (
              <option key={c.id} value={c.older_adult_id}>
                {c.older_adult?.preferred_name || 'Senior'}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5">
          {(['today', '7days', '30days'] as HistoryFilterRange[]).map(r => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={`px-3 py-1.5 rounded-tactile text-xs font-bold transition-colors ${
                filterRange === r
                  ? 'bg-olive-700 text-white'
                  : 'bg-nest-surface-subtle text-nest-ink hover:bg-nest-surface border border-nest-border'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7days' ? 'Past 7 Days' : 'Past 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <Card variant="subtle" className="p-8 text-center text-nest-ink-muted">
          No medication confirmation logs recorded for this timeframe.
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <Card key={log.id} variant="default" className="p-4 flex items-center justify-between border-2 border-nest-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <strong className="text-base text-nest-ink">{log.medicine?.name || 'Prescription'}</strong>
                  <StatusBadge status={log.status} />
                </div>
                <div className="text-xs text-nest-ink-muted">
                  Recorded: {new Date(log.confirmed_at || log.created_at).toLocaleString()} • Scheduled: {log.scheduled_for ? new Date(log.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
