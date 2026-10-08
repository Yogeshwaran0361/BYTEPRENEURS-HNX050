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
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const CaregiverAdultDetailPage: React.FC = () => {
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
  if (!adultId) {
    navigate('/caregiver/adults');
  }

  useEffect(() => {
    async function load() {
      if (!adultId) return;
      setIsLoading(true);
      try {
        // Authorization verification: Caregiver must be connected to this older adult
        const hasAccess = await caregiverService.verifyAccessToAdult(undefined, adultId);
        if (!hasAccess) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }
        setIsAuthorized(true);

        const [profileRes, medRes, scheduleRes, historyRes] = await Promise.all([
          seniorService.getProfile(adultId),
          medicineService.getMedicines(adultId),
          seniorService.getTodaySchedule(adultId),
          medicationLogService.getLogs(adultId, historyFilter),
        ]);

        setAdult(profileRes.data);
        setMedicines(medRes.data || []);
        setTodayItems(scheduleRes.data || []);
        setHistoryLogs(historyRes.data || []);
      } finally {
        setIsLoading(false);
      }
    }
    load();

    const channelLogs = realtimeService.subscribeToMedicationLogs(adultId, () => {
      load();
    });
    const channelAlerts = realtimeService.subscribeToAlerts(() => {
      load();
    });

    return () => {
      realtimeService.unsubscribe(channelLogs);
      realtimeService.unsubscribe(channelAlerts);
    };
  }, [adultId, historyFilter]);

  if (isLoading) return <LoadingState message="Loading individual care details..." />;

  if (isAuthorized === false) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-crimson-100 text-crimson-700 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-nest-ink">Access Restricted</h1>
        <p className="text-base text-nest-ink-muted">
          You are not currently authorized to view care details for this older adult. A valid connection code is required.
        </p>
        <Button variant="secondary" size="large" onClick={() => navigate('/caregiver/adults')}>
          Return to Connected Adults
        </Button>
      </div>
    );
  }

  // Attention item detection
  const attentionEvent = todayItems.find(
    i => i.status === 'ATTENTION_REQUIRED' || i.status === 'DELAYED' || i.status === 'MISSED'
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={adult?.preferred_name || adult?.profile?.full_name || 'Senior Details'}
        subtitle="Individual care overview, routine timeline, and prescribed medications."
        breadcrumbs={[
          { label: 'Dashboard', href: '/caregiver/dashboard' },
          { label: 'Older Adults', href: '/caregiver/adults' },
          { label: adult?.preferred_name || 'Adult Details' },
        ]}
        actions={
          <a
            href={`tel:${adult?.emergency_phone || '5559876543'}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-tactile bg-terracotta-50 text-terracotta-700 hover:bg-terracotta-100 font-bold border border-terracotta-200 transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>Call Directly</span>
          </a>
        }
      />

      {/* Section 16: CURRENT ATTENTION ITEM HIGHLIGHT */}
      {attentionEvent && (
        <Card
          variant="highlight"
          className="border-2 border-amberwarm-400 bg-amberwarm-50/70 p-6 shadow-tactile-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-tactile bg-amberwarm-100 text-amberwarm-800 flex items-center justify-center font-bold">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amberwarm-900 block">
                  ATTENTION NEEDED
                </span>
                <h2 className="text-2xl font-black text-nest-ink">
                  {attentionEvent.medicineName} ({attentionEvent.dosage})
                </h2>
              </div>
            </div>

            <StatusBadge status={attentionEvent.status} size="large" />
          </div>

          <div className="mt-3 text-base text-nest-ink">
            <p>
              Scheduled for <strong>{attentionEvent.scheduledTime}</strong>. Still unconfirmed by senior.
            </p>
            {attentionEvent.delayMinutes ? (
              <p className="text-sm font-semibold text-amberwarm-900 mt-1">
                Pending for {attentionEvent.delayMinutes} minutes.
              </p>
            ) : null}
          </div>

          <div className="mt-4 pt-3 border-t border-amberwarm-200 flex items-center gap-3">
            {(adult?.phone || adult?.emergency_phone) ? (
              <a
                href={`tel:${adult.phone || adult.emergency_phone}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-tactile bg-white border border-amberwarm-300 text-sm font-bold text-nest-ink hover:bg-amberwarm-50"
              >
                <Phone className="w-4 h-4 text-terracotta-600" />
                <span>Contact {adult?.preferred_name || 'Senior'}</span>
              </a>
            ) : null}
            <Button
              variant="tertiary"
              size="default"
              onClick={() => {
                showToast('Review noted', 'Caregiver noted this item.', 'info');
              }}
            >
              Mark Reviewed
            </Button>
          </div>
        </Card>
      )}

      {/* Detail Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-nest-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 font-bold text-base rounded-tactile transition-colors ${
            activeTab === 'today'
              ? 'bg-olive-50 text-olive-800 border border-olive-200'
              : 'text-nest-ink-muted hover:text-nest-ink'
          }`}
        >
          Today's Routine
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('medicines')}
          className={`px-4 py-2 font-bold text-base rounded-tactile transition-colors ${
            activeTab === 'medicines'
              ? 'bg-olive-50 text-olive-800 border border-olive-200'
              : 'text-nest-ink-muted hover:text-nest-ink'
          }`}
        >
          Medications ({medicines.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-bold text-base rounded-tactile transition-colors ${
            activeTab === 'history'
              ? 'bg-olive-50 text-olive-800 border border-olive-200'
              : 'text-nest-ink-muted hover:text-nest-ink'
          }`}
        >
          Activity History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area based on Tab */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'today' && (
            <div>
              <h2 className="text-xl font-bold text-nest-ink mb-3">Today's Chronological Schedule</h2>
              {todayItems.length === 0 ? (
                <EmptyState
                  title="No routines scheduled for today"
                  description="When medicines are scheduled, their daily routine occurrences will show here."
                />
              ) : (
                <div className="space-y-3">
                  {todayItems.map(item => (
                    <Card
                      key={item.id}
                      variant="default"
                      className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-tactile flex items-center justify-center shrink-0 border ${
                            item.status === 'TAKEN'
                              ? 'bg-olive-50 border-olive-200 text-olive-700'
                              : 'bg-nest-surface-subtle border-nest-border text-nest-ink-muted'
                          }`}
                        >
                          {item.status === 'TAKEN' ? <Check className="w-6 h-6 stroke-[3]" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <strong className="text-lg text-nest-ink block">
                            {item.medicineName} ({item.dosage})
                          </strong>
                          <span className="text-sm text-nest-ink-muted">
                            {item.scheduledTime}
                            {item.instructions ? ` • ${item.instructions}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <VoiceReminderButton
                          item={item}
                          seniorName={adult?.preferred_name || adult?.profile?.full_name || 'Senior'}
                          variant="compact"
                          size="small"
                        />
                        <div className="text-right">
                          <StatusBadge status={item.status} />
                          {item.takenAt && (
                            <div className="text-xs text-olive-700 font-bold mt-1">Confirmed at {item.takenAt}</div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'medicines' && (
            <div>
              <h2 className="text-xl font-bold text-nest-ink mb-3">Prescribed Medications Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {medicines.map(med => (
                  <Card key={med.id} variant="default" className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <strong className="text-xl text-nest-ink block">{med.name}</strong>
                        {med.generic_name && (
                          <span className="text-xs text-nest-ink-muted">({med.generic_name})</span>
                        )}
                      </div>
                      <span className="text-sm font-black text-terracotta-700">{med.dosage}</span>
                    </div>

                    <div className="text-sm text-nest-ink space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-nest-ink-muted" />
                        <span>{med.frequency} • {med.scheduled_times?.join(', ')}</span>
                      </div>
                      {med.food_relation && med.food_relation !== 'Not specified' && (
                        <div className="flex items-center gap-2 text-nest-ink-muted">
                          <Utensils className="w-4 h-4 text-nest-ink-muted" />
                          <span>{med.food_relation}</span>
                        </div>
                      )}
                    </div>

                    {med.additional_instructions && (
                      <p className="text-xs text-nest-ink-muted italic border-t border-nest-border pt-2">
                        "{med.additional_instructions}"
                      </p>
                    )}

                    <div className="text-xs text-nest-ink-faint pt-2 border-t border-nest-border flex items-center justify-between gap-2">
                      <VoiceReminderButton
                        medicine={med}
                        seniorName={adult?.preferred_name || adult?.profile?.full_name || 'Senior'}
                        variant="default"
                        size="small"
                      />
                      <span>{med.prescribed_by || 'Primary Care'}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-nest-ink">Historical Confirmations</h2>
                {/* History Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 bg-nest-surface-subtle border border-nest-border rounded-tactile">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('today')}
                    className={`px-3 py-1 text-xs font-bold rounded ${
                      historyFilter === 'today' ? 'bg-white text-nest-ink shadow-sm' : 'text-nest-ink-muted'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('7days')}
                    className={`px-3 py-1 text-xs font-bold rounded ${
                      historyFilter === '7days' ? 'bg-white text-nest-ink shadow-sm' : 'text-nest-ink-muted'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('30days')}
                    className={`px-3 py-1 text-xs font-bold rounded ${
                      historyFilter === '30days' ? 'bg-white text-nest-ink shadow-sm' : 'text-nest-ink-muted'
                    }`}
                  >
                    30 Days
                  </button>
                </div>
              </div>

              {historyLogs.length === 0 ? (
                <EmptyState
                  title="No confirmation records found"
                  description="Confirmation records logged by the senior will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {historyLogs.map(log => (
                    <Card
                      key={log.id}
                      variant="default"
                      className="p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <strong className="text-base text-nest-ink block">
                          {log.medicine?.name || 'Medication'} ({log.medicine?.dosage || 'Dose'})
                        </strong>
                        <span className="text-xs text-nest-ink-muted">
                          Scheduled: {new Date(log.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {log.confirmed_at || log.taken_at ? (
                            <strong className="text-olive-700 ml-1">
                              • Confirmed {new Date(log.confirmed_at || log.taken_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </strong>
                          ) : null}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <VoiceReminderButton
                          log={log}
                          seniorName={adult?.preferred_name || adult?.profile?.full_name || 'Senior'}
                          variant="compact"
                          size="small"
                        />
                        <StatusBadge status={log.status} />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Contact & Metadata */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-nest-ink">Care Contact Info</h2>
          <Card variant="warm" className="p-5 space-y-4">
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

            {adult?.notes && (
              <div>
                <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                  Care Notes
                </span>
                <p className="text-sm text-nest-ink-muted mt-0.5 leading-relaxed">
                  {adult.notes}
                </p>
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
