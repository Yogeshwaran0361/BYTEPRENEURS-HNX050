import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { caregiverService, CaregiverAttentionItem } from '../../services/caregiverService';
import { medicationSchedulerService } from '../../services/engine/medicationSchedulerService';
import { medicationLogService } from '../../services/medicationLogService';
import { realtimeService } from '../../lib/realtime';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CaregiverConnection, TodayMedicationItem, MedicationLog } from '../../types';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  Phone,
  ArrowRight,
  Send,
  Bell,
  Heart,
  Check,
  BellRing,
  AlertTriangle,
} from 'lucide-react';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const CaregiverDashboardPage: React.FC = () => {
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [attentionItems, setAttentionItems] = useState<CaregiverAttentionItem[]>([]);
  const [adultSchedules, setAdultSchedules] = useState<Record<string, TodayMedicationItem[]>>({});
  const [adultLogs, setAdultLogs] = useState<Record<string, MedicationLog[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [connRes, attRes] = await Promise.all([
        caregiverService.getConnectedAdults(),
        caregiverService.getAttentionItems(),
      ]);

      if (connRes.error) throw new Error(connRes.error);
      if (attRes.error) throw new Error(attRes.error);

      const conns = connRes.data || [];
      setConnections(conns);
      setAttentionItems(attRes.data || []);

      const schedMap: Record<string, TodayMedicationItem[]> = {};
      const logsMap: Record<string, MedicationLog[]> = {};

      await Promise.all(
        conns.map(async conn => {
          const adultId = conn.older_adult_id;
          if (!adultId) return;
          const [sRes, lRes] = await Promise.all([
            medicationSchedulerService.getTodayEvents(adultId),
            medicationLogService.getLogs(adultId, 'today'),
          ]);
          schedMap[adultId] = sRes.data || [];
          logsMap[adultId] = lRes.data || [];
        })
      );

      setAdultSchedules(schedMap);
      setAdultLogs(logsMap);
    } catch (err: any) {
      setError(err?.message || 'Could not load caregiver dashboard');
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
  }, []);

  const handleMarkReviewed = async (itemId: string) => {
    await caregiverService.markItemReviewed(itemId);
    const reviewedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    showToast(
      'Alert reviewed',
      'You have reviewed and acknowledged this medication reminder.',
      'info'
    );
    setAttentionItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, isReviewed: true, reviewedAt: reviewedTime } : item))
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading care status..." subMessage="Checking connected adults and routine activity" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const caregiverName = profile?.full_name?.split(' ')[0] || 'Caregiver';
  const unreviewedAttention = attentionItems.filter(a => !a.isReviewed);
  const delayedAlertSignals = attentionItems.filter(a => a.status === 'DELAYED' && !a.isReviewed);

  return (
    <div className="space-y-8 pb-12">
      {/* Calm Header */}
      <div>
        <span className="text-sm font-bold uppercase tracking-wider text-olive-700">
          {t('portal.caregiverOverview', 'Caregiver Overview')}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-nest-ink tracking-tight mt-1">
          {caregiverName}
        </h1>
        <p className="text-lg text-nest-ink-muted mt-1">
          {unreviewedAttention.length > 0
            ? `${unreviewedAttention.length} ${unreviewedAttention.length > 1 ? t('caregiver.itemsRequireReview', 'items currently require review') : t('caregiver.itemRequiresReview', 'item currently requires review')}.`
            : t('caregiver.noAlerts', 'Here is the current routine activity across your connected older adults.')}
        </p>
      </div>

      {/* CRITICAL ALERT SIGNAL: SENIOR NOT RESPONDING TO MEDICATION REMINDER */}
      {delayedAlertSignals.length > 0 && (
        <section aria-label="Delayed medication reminder alert signal" className="animate-in fade-in duration-300">
          <div className="rounded-tactile-xl border-2 border-red-500 bg-red-50/95 p-5 sm:p-6 shadow-tactile relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-red-200">
              <div className="flex items-start sm:items-center gap-3">
                <div className="relative shrink-0 mt-1 sm:mt-0">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-md">
                    <BellRing className="w-6 h-6 animate-bounce" />
                  </span>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded border border-red-300">
                      🚨 {t('alerts.alertSignal', 'ALERT SIGNAL • IMMEDIATE ATTENTION')}
                    </span>
                    <span className="text-xs font-bold text-red-700">
                      {delayedAlertSignals.length} {delayedAlertSignals.length > 1 ? 'reminders unresponsive' : 'reminder unresponsive'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-red-950 mt-1">
                    {t('alerts.seniorUnresponsiveTitle', 'Senior Did Not Respond to Medication Reminder')}
                  </h2>
                  <p className="text-sm text-red-800 mt-0.5">
                    {t('alerts.seniorUnresponsiveDesc', 'The senior routine alert sounded without response or timed out. Please review the alert signal and contact the senior.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {delayedAlertSignals.map(signal => (
                <div
                  key={`signal-${signal.id}`}
                  className="p-4 rounded-tactile bg-white border-2 border-red-300 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-lg font-bold text-nest-ink">
                        {signal.olderAdultName}
                      </strong>
                      <span className="text-sm font-semibold text-red-700 bg-red-100 px-2.5 py-0.5 rounded">
                        {signal.medicineName} ({signal.dosage})
                      </span>
                      <span className="text-xs font-extrabold uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        DELAYED • UNRESPONSIVE
                      </span>
                    </div>
                    <p className="text-sm text-nest-ink-muted">
                      Scheduled dose was at <span className="font-semibold text-nest-ink">{signal.scheduledTime}</span>
                      {signal.pendingMinutes > 0 ? ` (Overdue by ${signal.pendingMinutes} mins)` : ''}
                    </p>
                    <p className="text-xs font-medium text-red-700">
                      ⚠️ Reason: {signal.reason || 'Senior did not respond to the medication alarm within the timeout window.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <VoiceReminderButton
                      id={`signal-${signal.id}`}
                      seniorName={signal.olderAdultName}
                      details={{
                        seniorName: signal.olderAdultName,
                        medicineName: signal.medicineName,
                        dosage: signal.dosage,
                        scheduledTime: signal.scheduledTime,
                        instructions: signal.reason,
                      }}
                      size="small"
                    />
                    {signal.olderAdultPhone && (
                      <a
                        href={`tel:${signal.olderAdultPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-tactile text-sm font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors"
                      >
                        <Phone className="w-4 h-4 text-amber-800" />
                        Call Senior
                      </a>
                    )}
                    <Button
                      variant="primary"
                      size="default"
                      className="bg-red-700 hover:bg-red-800 text-white border-red-800"
                      onClick={() => handleMarkReviewed(signal.id)}
                      leftIcon={<Check className="w-4 h-4" />}
                    >
                      {t('alerts.reviewAndAcknowledge', 'Review Alert')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="default"
                      onClick={() => navigate(`/caregiver/adults/${signal.olderAdultId}`)}
                    >
                      View Routine
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Primary Principle: "WHO NEEDS MY ATTENTION?" */}
      <section aria-labelledby="attention-title">
        {attentionItems.length > 0 ? (
          <Card
            variant="default"
            className="border-2 border-amberwarm-300 bg-amberwarm-50/50 p-6 sm:p-7 shadow-tactile"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-tactile bg-amberwarm-100 text-amberwarm-800 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="attention-title" className="text-2xl font-bold text-nest-ink">
                    {t('caregiver.attentionNeeded', 'Attention Needed')}
                  </h2>
                  <p className="text-sm text-nest-ink-muted">
                    {unreviewedAttention.length} {unreviewedAttention.length !== 1 ? t('caregiver.itemsRequireReview', 'items currently require review') : t('caregiver.itemRequiresReview', 'item currently requires review')}
                  </p>
                </div>
              </div>

              <StatusBadge status="ATTENTION_REQUIRED" />
            </div>

            <div className="space-y-3 mt-4">
              {attentionItems.map(item => (
                <div
                  key={item.id}
                  className={`p-4 rounded-tactile bg-white border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-tactile-sm ${
                    item.isReviewed ? 'border-nest-border opacity-75' : 'border-amberwarm-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-lg text-nest-ink block">
                        {item.olderAdultName} — {item.medicineName} ({item.dosage})
                      </strong>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-base text-nest-ink-muted mt-0.5">
                      Scheduled for {item.scheduledTime}
                      {item.pendingMinutes > 0 ? ` • Pending duration: ${item.pendingMinutes} mins` : ''}
                    </p>
                    {item.reason && (
                      <span className="text-xs text-amberwarm-900 font-semibold block mt-1">
                        {item.reason}
                      </span>
                    )}
                    {item.isReviewed && (
                      <span className="text-xs text-olive-700 font-bold block mt-0.5">
                        ✓ Reviewed by caregiver {item.reviewedAt ? `at ${item.reviewedAt}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <VoiceReminderButton
                      id={`attention-${item.id}`}
                      seniorName={item.olderAdultName}
                      details={{
                        seniorName: item.olderAdultName,
                        medicineName: item.medicineName,
                        dosage: item.dosage,
                        scheduledTime: item.scheduledTime,
                        instructions: item.reason,
                      }}
                      size="small"
                    />
                    <Button
                      variant="secondary"
                      size="default"
                      onClick={() => navigate(`/caregiver/adults/${item.olderAdultId}`)}
                    >
                      View Details
                    </Button>
                    {!item.isReviewed ? (
                      <Button
                        variant="tertiary"
                        size="default"
                        onClick={() => handleMarkReviewed(item.id)}
                        leftIcon={<Check className="w-4 h-4 text-olive-700" />}
                      >
                        Mark Reviewed
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card variant="subtle" className="p-6 border-olive-200 bg-olive-50/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-olive-100 text-olive-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 id="attention-title" className="text-xl font-bold text-nest-ink">
                  You're all caught up.
                </h2>
                <p className="text-base text-nest-ink-muted">
                  There are no medication activity items that currently need your attention.
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* Connected Older Adults Section */}
      <section aria-labelledby="connected-title" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="connected-title" className="text-2xl font-bold text-nest-ink">
            {t('caregiver.connectedAdults', 'Connected Older Adults')}
          </h2>
          <Link
            to="/caregiver/adults"
            className="text-base font-bold text-olive-700 hover:text-olive-800 hover:underline inline-flex items-center gap-1"
          >
            <span>{t('caregiver.manageConnections', 'Manage Connections')}</span>
          </Link>
        </div>

        {connections.length === 0 ? (
          <EmptyState
            title={t('caregiver.noAdultsConnected', "You haven't connected with an older adult yet.")}
            description={t('caregiver.noAdultsConnectedDesc', "Connect with a senior using their 8-character connection code to view routines and receive alerts.")}
            actionLabel={t('caregiver.connectOlderAdult', "Connect Older Adult")}
            onAction={() => navigate('/caregiver/adults')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map(conn => {
              const adult = conn.older_adult;
              const adultId = adult?.id || conn.older_adult_id;
              const adultName = adult?.preferred_name || adult?.profile?.full_name || 'Connected Senior';
              const hasAttention = attentionItems.some(a => a.olderAdultId === adultId && !a.isReviewed);
              const items = adultSchedules[adultId] || [];
              const logs = adultLogs[adultId] || [];

              // Latest Confirmation
              const takenLogs = logs.filter(l => l.status === 'TAKEN');
              const takenItems = items.filter(i => i.status === 'TAKEN' && (i.takenAt || i.confirmedAt));
              let latestConfirmationText = t('caregiver.noDosesTaken', 'No doses taken yet today');
              if (takenLogs.length > 0) {
                const l = takenLogs[0];
                const medName = l.medicine?.name || 'Medication';
                const dose = l.medicine?.dosage ? ` (${l.medicine.dosage})` : '';
                const timeStr = l.confirmed_at || l.taken_at || l.created_at;
                const timeFormatted = timeStr ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                latestConfirmationText = `${medName}${dose}${timeFormatted ? ` at ${timeFormatted}` : ''}`;
              } else if (takenItems.length > 0) {
                const tItem = takenItems[takenItems.length - 1];
                latestConfirmationText = `${tItem.medicineName}${tItem.dosage ? ` (${tItem.dosage})` : ''} at ${tItem.takenAt || tItem.scheduledTime}`;
              }

              // Next Scheduled
              const pendingOrUpcoming = items.find(i => i.status === 'DUE' || i.status === 'UPCOMING' || i.status === 'DELAYED');
              let nextScheduledText = t('caregiver.noScheduledDoses', 'No scheduled doses today');
              if (pendingOrUpcoming) {
                const dose = pendingOrUpcoming.dosage ? ` (${pendingOrUpcoming.dosage})` : '';
                nextScheduledText = `${pendingOrUpcoming.medicineName}${dose} at ${pendingOrUpcoming.scheduledTime}`;
              } else if (items.length > 0 && items.every(i => i.status === 'TAKEN')) {
                nextScheduledText = t('caregiver.allDosesCompleted', '✓ All doses completed for today');
              }

              // Overall status badge
              let badgeStatus: 'ATTENTION_REQUIRED' | 'DELAYED' | 'DUE' | 'TAKEN' | 'UPCOMING' = 'TAKEN';
              if (hasAttention) {
                badgeStatus = 'ATTENTION_REQUIRED';
              } else if (items.some(i => i.status === 'DELAYED')) {
                badgeStatus = 'DELAYED';
              } else if (items.some(i => i.status === 'DUE')) {
                badgeStatus = 'DUE';
              } else if (items.length > 0 && items.every(i => i.status === 'TAKEN')) {
                badgeStatus = 'TAKEN';
              } else if (items.some(i => i.status === 'UPCOMING')) {
                badgeStatus = 'UPCOMING';
              }

              return (
                <Card
                  key={conn.id}
                  variant="default"
                  isInteractive
                  className="p-6 flex flex-col justify-between"
                  onClick={() => navigate(`/caregiver/adults/${adultId}`)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-olive-50 text-olive-800 font-extrabold text-xl flex items-center justify-center border border-olive-200">
                          {adultName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-nest-ink">
                            {adultName}
                          </h3>
                          <span className="text-sm text-nest-ink-muted">
                            {t('common.relationship', 'Relationship')}: {conn.caregiver?.relationship_type || t('role.caregiverTitle', 'Caregiver')}
                          </span>
                        </div>
                      </div>

                      <StatusBadge status={badgeStatus} />
                    </div>

                    <div className="p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border text-sm space-y-1">
                      <div className="flex items-center justify-between text-nest-ink">
                        <span>{t('caregiver.latestConfirmation', 'Latest Confirmation:')}</span>
                        <strong className="text-olive-700">{latestConfirmationText}</strong>
                      </div>
                      <div className="flex items-center justify-between text-nest-ink-muted">
                        <span>{t('caregiver.nextScheduled', 'Next Scheduled:')}</span>
                        <span>{nextScheduledText}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-nest-border flex items-center justify-between text-base font-bold text-olive-700">
                    <span>{t('caregiver.viewRoutine', 'View Adult Routine')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Medication Activity */}
      <section aria-labelledby="activity-title" className="space-y-4">
        <h2 id="activity-title" className="text-2xl font-bold text-nest-ink">
          {t('caregiver.recentActivity', 'Recent Medication Activity')}
        </h2>
        <Card variant="default" className="p-5">
          {(() => {
            interface ActivityItem {
              id: string;
              type: 'TAKEN' | 'DUE' | 'DELAYED' | 'MISSED' | 'UPCOMING';
              adultName: string;
              medicineName: string;
              dosage?: string;
              time: string;
              note: string;
            }
            const activities: ActivityItem[] = [];

            connections.forEach(conn => {
              const adult = conn.older_adult;
              const adultId = adult?.id || conn.older_adult_id;
              const adultName = adult?.preferred_name || adult?.profile?.full_name || 'Senior';
              const logs = adultLogs[adultId] || [];
              const items = adultSchedules[adultId] || [];

              // Confirmed logs today
              logs.forEach(l => {
                if (l.status === 'TAKEN') {
                  const timeStr = l.confirmed_at || l.taken_at || l.created_at;
                  activities.push({
                    id: `log-${l.id}`,
                    type: 'TAKEN',
                    adultName,
                    medicineName: l.medicine?.name || 'Medication',
                    dosage: l.medicine?.dosage,
                    time: timeStr ? new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
                    note: l.notes || 'Recorded on time via Senior Portal',
                  });
                }
              });

              // Scheduled items today
              items.forEach(i => {
                if (i.status === 'TAKEN' && !activities.some(a => a.medicineName === i.medicineName && a.adultName === adultName)) {
                  activities.push({
                    id: `sched-taken-${i.id}`,
                    type: 'TAKEN',
                    adultName,
                    medicineName: i.medicineName,
                    dosage: i.dosage,
                    time: i.takenAt || i.scheduledTime,
                    note: t('status.takenOnTime', 'Confirmed on time'),
                  });
                } else if (i.status === 'DELAYED' || i.status === 'MISSED') {
                  activities.push({
                    id: `sched-delayed-${i.id}`,
                    type: i.status,
                    adultName,
                    medicineName: i.medicineName,
                    dosage: i.dosage,
                    time: i.scheduledTime,
                    note: i.needsAttentionReason || (i.status === 'DELAYED' ? t('senior.pendingConfirmation', 'Pending senior confirmation') : t('senior.unconfirmedDose', 'Unconfirmed dose')),
                  });
                } else if (i.status === 'DUE') {
                  activities.push({
                    id: `sched-due-${i.id}`,
                    type: 'DUE',
                    adultName,
                    medicineName: i.medicineName,
                    dosage: i.dosage,
                    time: i.scheduledTime,
                    note: t('senior.doseDueNow', 'Dose is currently due'),
                  });
                } else if (i.status === 'UPCOMING') {
                  activities.push({
                    id: `sched-upcoming-${i.id}`,
                    type: 'UPCOMING',
                    adultName,
                    medicineName: i.medicineName,
                    dosage: i.dosage,
                    time: i.scheduledTime,
                    note: `${i.timeOfDay ? t(`time.${i.timeOfDay}` as any, i.timeOfDay) + ' ' + t('senior.routine', 'routine') : t('senior.upcomingScheduledDose', 'Upcoming scheduled dose')}`,
                  });
                }
              });
            });

            if (activities.length === 0) {
              return (
                <div className="py-8 text-center text-nest-ink-muted">
                  <Clock className="w-9 h-9 mx-auto text-nest-border mb-2" />
                  <p className="font-semibold text-base text-nest-ink">{t('caregiver.noActivityToday', 'No medication activity recorded yet today')}</p>
                  <p className="text-sm mt-1">{t('caregiver.noActivityTodaySub', 'Confirmed doses and upcoming scheduled reminders for connected seniors will appear here in real-time.')}</p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-nest-border/70">
                {activities.map(act => {
                  const isTaken = act.type === 'TAKEN';
                  const isAlert = act.type === 'DELAYED' || act.type === 'MISSED';
                  const isDue = act.type === 'DUE';

                  return (
                    <div key={act.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                            isTaken
                              ? 'bg-olive-50 text-olive-700 border-olive-200'
                              : isAlert
                              ? 'bg-crimson-50 text-crimson-700 border-crimson-200'
                              : isDue
                              ? 'bg-amberwarm-50 text-amberwarm-700 border-amberwarm-200'
                              : 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border'
                          }`}
                        >
                          {isTaken ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isAlert ? (
                            <ShieldAlert className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <strong className="text-base text-nest-ink block">
                            {isTaken
                              ? `${act.adultName} ${t('caregiver.confirmed', 'confirmed')} ${act.medicineName}${act.dosage ? ` (${act.dosage})` : ''}`
                              : isAlert
                              ? `${act.medicineName}${act.dosage ? ` (${act.dosage})` : ''} ${t('caregiver.delayedFor', 'delayed for')} ${act.adultName}`
                              : isDue
                              ? `${act.medicineName}${act.dosage ? ` (${act.dosage})` : ''} ${t('caregiver.dueFor', 'is due for')} ${act.adultName}`
                              : `${act.medicineName}${act.dosage ? ` (${act.dosage})` : ''} ${t('caregiver.scheduledFor', 'scheduled for')} ${act.adultName}`}
                          </strong>
                          <span className="text-xs text-nest-ink-muted">{act.note}</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-nest-ink-muted shrink-0 ml-3">
                        {act.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>
      </section>
    </div>
  );
};
