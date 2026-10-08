import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { seniorService } from '../../services/seniorService';
import { medicineService } from '../../services/medicineService';
import { caregiverService } from '../../services/caregiverService';
import { medicationLogService, HistoryFilterRange } from '../../services/medicationLogService';
import { realtimeService } from '../../lib/realtime';
import { OlderAdult, Medicine, TodayMedicationItem, MedicationLog } from '../../types';
import {
  Phone,
  Clock,
  ShieldAlert,
  Check,
  Lock,
  Utensils,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const CaretakerAdultDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [adult, setAdult] = useState<OlderAdult | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [todayItems, setTodayItems] = useState<TodayMedicationItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<MedicationLog[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterRange>('today');
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'medicines'>('today');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const adultId = id || '';

  const loadData = async () => {
    if (!adultId) {
      navigate('/caretaker/adults');
      return;
    }
    setIsLoading(true);
    try {
      const authorized = await caregiverService.verifyAccessToAdult(undefined, adultId);
      setIsAuthorized(authorized);

      if (!authorized) {
        setIsLoading(false);
        return;
      }

      const [adultRes, medsRes, schedRes, logRes] = await Promise.all([
        seniorService.getProfile(adultId),
        medicineService.getMedicines(adultId),
        seniorService.getTodaySchedule(adultId),
        medicationLogService.getLogs(adultId, historyFilter),
      ]);

      setAdult(adultRes.data);
      setMedicines(medsRes.data || []);
      setTodayItems(schedRes.data || []);
      setHistoryLogs(logRes.data || []);
    } catch (e) {
      showToast('Error', 'Could not load older adult details.', 'attention');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = realtimeService.subscribeToAlerts(() => {
      loadData();
    });

    return () => {
      realtimeService.unsubscribe(channel);
    };
  }, [adultId, historyFilter]);

  if (isLoading) {
    return <LoadingState message="Loading older adult routine..." subMessage="Verifying caretaker authorization" />;
  }

  if (isAuthorized === false) {
    return (
      <div className="py-12">
        <EmptyState
          title="Access Restricted"
          description="You are not authorized to monitor this older adult. Enter their invite code in the Caretaker Portal to request access."
          actionLabel="View Monitored Adults"
          onAction={() => navigate('/caretaker/adults')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Caretaker Header Bar */}
      <div>
        <Button
          variant="tertiary"
          size="default"
          onClick={() => navigate('/caretaker/adults')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-2"
        >
          Back to Monitored Adults
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-olive-100 text-olive-900 font-black text-2xl flex items-center justify-center border-2 border-olive-300">
              {adult?.preferred_name ? adult.preferred_name[0] : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-olive-800 bg-olive-50 px-2 py-0.5 rounded border border-olive-200">
                  <Shield className="w-3 h-3 inline mr-1" />
                  Caretaker Monitored Adult
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-nest-ink tracking-tight mt-0.5">
                {adult?.preferred_name || adult?.profile?.full_name || 'Older Adult'}
              </h1>
              <p className="text-sm text-nest-ink-muted">
                {adult?.address || 'Boston, MA'} • {medicines.length} Active Prescriptions
              </p>
            </div>
          </div>

          {(adult?.phone || adult?.emergency_phone) && (
            <a
              href={`tel:${adult.phone || adult.emergency_phone}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-tactile bg-olive-700 text-white hover:bg-olive-800 font-bold text-sm shadow-tactile transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>Call {adult.preferred_name || 'Senior'}</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-nest-border gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-5 py-3 font-bold text-sm border-b-3 transition-colors ${
            activeTab === 'today'
              ? 'border-olive-600 text-olive-900 bg-olive-50/50'
              : 'border-transparent text-nest-ink-muted hover:text-nest-ink'
          }`}
        >
          Today's Routine ({todayItems.length})
        </button>
        <button
          onClick={() => setActiveTab('medicines')}
          className={`px-5 py-3 font-bold text-sm border-b-3 transition-colors ${
            activeTab === 'medicines'
              ? 'border-olive-600 text-olive-900 bg-olive-50/50'
              : 'border-transparent text-nest-ink-muted hover:text-nest-ink'
          }`}
        >
          Prescriptions ({medicines.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 font-bold text-sm border-b-3 transition-colors ${
            activeTab === 'history'
              ? 'border-olive-600 text-olive-900 bg-olive-50/50'
              : 'border-transparent text-nest-ink-muted hover:text-nest-ink'
          }`}
        >
          Adherence History
        </button>
      </div>

      {/* Tab Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'today' && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-nest-ink">Today's Scheduled Doses</h2>
              {todayItems.length === 0 ? (
                <Card variant="subtle" className="p-6 text-center text-nest-ink-muted">
                  No medications scheduled for today.
                </Card>
              ) : (
                todayItems.map(item => (
                  <Card key={item.id} variant="default" className="p-4 flex items-center justify-between border-2 border-nest-border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-lg text-nest-ink">{item.medicineName}</strong>
                        <span className="text-sm text-nest-ink-muted">({item.dosage})</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-nest-ink-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Scheduled: {item.scheduledTime}
                        </span>
                        {item.foodRelation && (
                          <span className="flex items-center gap-1">
                            <Utensils className="w-3.5 h-3.5" /> {item.foodRelation}
                          </span>
                        )}
                      </div>
                    </div>
                    <VoiceReminderButton
                      item={item}
                      seniorName={adult?.preferred_name || adult?.profile?.full_name || 'Senior'}
                      variant="compact"
                      size="small"
                    />
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'medicines' && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-nest-ink">Active Prescriptions</h2>
              {medicines.map(med => (
                <Card key={med.id} variant="default" className="p-4 space-y-2 border-2 border-nest-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-nest-ink">{med.name}</h3>
                      <p className="text-sm text-nest-ink-muted">
                        {med.dosage} • {med.frequency} • {med.amount_per_dose}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-olive-50 text-olive-800 text-xs font-bold border border-olive-200">
                      {med.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {med.instructions && (
                    <p className="text-xs text-nest-ink/80 bg-nest-surface-subtle p-2.5 rounded border border-nest-border">
                      {med.instructions}
                    </p>
                  )}
                  <div className="pt-2 border-t border-nest-border flex items-center justify-between gap-2">
                    <VoiceReminderButton
                      medicine={med}
                      seniorName={adult?.preferred_name || adult?.profile?.full_name || 'Senior'}
                      variant="default"
                      size="small"
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-nest-ink">Medication Logs</h2>
                <div className="flex gap-1.5">
                  {(['today', '7days', '30days'] as HistoryFilterRange[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setHistoryFilter(r)}
                      className={`px-3 py-1 rounded text-xs font-bold capitalize transition-colors ${
                        historyFilter === r
                          ? 'bg-olive-700 text-white'
                          : 'bg-nest-surface-subtle text-nest-ink-muted hover:text-nest-ink border border-nest-border'
                      }`}
                    >
                      {r === 'today' ? 'Today' : r === '7days' ? 'Past 7 Days' : 'Past 30 Days'}
                    </button>
                  ))}
                </div>
              </div>

              {historyLogs.length === 0 ? (
                <Card variant="subtle" className="p-6 text-center text-nest-ink-muted">
                  No medication confirmation records for this period.
                </Card>
              ) : (
                <div className="space-y-2">
                  {historyLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-tactile bg-white border border-nest-border flex items-center justify-between text-sm shadow-xs"
                    >
                      <div>
                        <strong className="text-nest-ink block">
                          {log.medicine?.name || 'Prescription'}
                        </strong>
                        <span className="text-xs text-nest-ink-muted">
                          Scheduled: {log.scheduled_for ? new Date(log.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'} • Recorded: {new Date(log.confirmed_at || log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <VoiceReminderButton
                          log={log}
                          seniorName={adult?.preferred_name || adult?.profile?.full_name || 'Senior'}
                          variant="compact"
                          size="small"
                        />
                        <StatusBadge status={log.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Info Card */}
        <div>
          <Card variant="default" className="p-5 space-y-4 border-2 border-nest-border">
            <h3 className="text-lg font-bold text-nest-ink pb-2 border-b border-nest-border">
              Contact & Profile Details
            </h3>

            <div>
              <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                Phone Contact
              </span>
              <strong className="text-lg text-nest-ink">{adult?.phone || adult?.emergency_phone || 'Not provided'}</strong>
            </div>

            {adult?.emergency_contact_name && (
              <div>
                <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                  Emergency Contact
                </span>
                <p className="text-sm font-bold text-nest-ink mt-0.5">
                  {adult.emergency_contact_name} ({adult.emergency_contact_relationship || 'Contact'})
                </p>
                {adult.emergency_contact_phone && (
                  <p className="text-sm text-nest-ink-muted">{adult.emergency_contact_phone}</p>
                )}
              </div>
            )}

            <div>
              <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                Timezone
              </span>
              <span className="text-sm text-nest-ink">{adult?.timezone || 'Local'}</span>
            </div>

            <div className="pt-3 border-t border-nest-border">
              {(adult?.phone || adult?.emergency_phone) ? (
                <a
                  href={`tel:${adult.phone || adult.emergency_phone}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-tactile bg-olive-700 text-white hover:bg-olive-800 font-bold text-sm shadow-tactile transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {adult.preferred_name || 'Senior'} Directly</span>
                </a>
              ) : (
                <span className="text-xs text-nest-ink-muted block text-center">No telephone number registered.</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
