import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { alertService } from '../../services/alertService';
import { realtimeService } from '../../lib/realtime';
import { Alert, AlertType, AlertWorkflowStatus } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  ShieldAlert,
  CheckCircle2,
  Phone,
  Check,
  Clock,
  User,
  Filter,
  CheckCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const CaregiverAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeStatus, setActiveStatus] = useState<AlertWorkflowStatus | 'ALL'>('OPEN');
  const [typeFilter, setTypeFilter] = useState<AlertType | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useLanguage();

  // Detail Modal & Resolve Dialog
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await alertService.getAlerts(undefined, 'ALL', 'ALL');
      setAlerts(res.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    const channel = realtimeService.subscribeToAlerts(() => {
      loadAlerts();
    });

    return () => {
      realtimeService.unsubscribe(channel);
    };
  }, []);

  const handleMarkReviewed = async (alert: Alert) => {
    setIsProcessing(true);
    try {
      const res = await alertService.acknowledgeAlert(alert.id);
      if (res.error) {
        showToast("Couldn't update alert", "We couldn't update this alert. Please try again.", 'attention');
        return;
      }
      showToast(
        'Marked as reviewed',
        `Alert reviewed by you at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        'info'
      );
      if (selectedAlert?.id === alert.id) {
        setSelectedAlert(res.data);
      }
      setAlerts(prev => prev.map(a => (a.id === alert.id ? res.data! : a)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveAlert = async () => {
    if (!resolvingAlert) return;
    setIsProcessing(true);
    try {
      const res = await alertService.resolveAlert(resolvingAlert.id);
      if (res.error) {
        showToast("Couldn't resolve alert", "We couldn't resolve this alert. Please try again.", 'attention');
        return;
      }
      showToast('Support item resolved', 'The alert has been moved to resolved status.', 'success');
      if (selectedAlert?.id === resolvingAlert.id) {
        setSelectedAlert(res.data);
      }
      setAlerts(prev => prev.map(a => (a.id === resolvingAlert.id ? res.data! : a)));
    } finally {
      setIsProcessing(false);
      setResolvingAlert(null);
    }
  };

  if (isLoading) return <LoadingState message="Checking attention items..." subMessage="Evaluating routine activity" />;

  const openCount = alerts.filter(a => a.status === 'OPEN').length;
  const reviewedCount = alerts.filter(a => a.status === 'REVIEWED').length;
  const resolvedCount = alerts.filter(a => a.status === 'RESOLVED').length;

  let filteredAlerts = alerts;
  if (activeStatus !== 'ALL') {
    filteredAlerts = filteredAlerts.filter(a => a.status === activeStatus);
  }
  if (typeFilter !== 'ALL') {
    filteredAlerts = filteredAlerts.filter(a => a.type === typeFilter);
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t('alerts.title', 'Caregiver Alerts')}
        subtitle={t('caregiver.attentionNeeded', 'Unconfirmed, delayed, or support-requested medications across your connected adults.')}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), href: '/caregiver/dashboard' },
          { label: t('nav.alerts', 'Alerts') },
        ]}
      />

      {/* Sections Tab Bar (Section 18 & 21) */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-nest-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveStatus('OPEN')}
            className={`px-4 py-2 font-bold text-base rounded-tactile transition-colors flex items-center gap-2 ${
              activeStatus === 'OPEN'
                ? 'bg-amberwarm-100 text-amberwarm-900 border border-amberwarm-300'
                : 'text-nest-ink-muted hover:text-nest-ink'
            }`}
          >
            <span>{t('caregiver.attentionNeeded', 'Needs Attention')}</span>
            {openCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amberwarm-600 text-white font-bold">
                {openCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('REVIEWED')}
            className={`px-4 py-2 font-bold text-base rounded-tactile transition-colors flex items-center gap-2 ${
              activeStatus === 'REVIEWED'
                ? 'bg-olive-50 text-olive-800 border border-olive-200'
                : 'text-nest-ink-muted hover:text-nest-ink'
            }`}
          >
            <span>Recently Reviewed</span>
            {reviewedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-olive-200 text-olive-800 font-bold">
                {reviewedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveStatus('RESOLVED')}
            className={`px-4 py-2 font-bold text-base rounded-tactile transition-colors flex items-center gap-2 ${
              activeStatus === 'RESOLVED'
                ? 'bg-nest-surface text-nest-ink border border-nest-border'
                : 'text-nest-ink-muted hover:text-nest-ink'
            }`}
          >
            <span>Resolved</span>
            {resolvedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-nest-surface-subtle text-nest-ink-muted font-bold">
                {resolvedCount}
              </span>
            )}
          </button>
        </div>

        {/* Optional Type Filter (Section 23) */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-nest-ink-muted" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-tactile border border-nest-border bg-nest-surface text-nest-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            <option value="ALL">All Alert Types</option>
            <option value="SUPPORT_REQUESTED">Support Requested</option>
            <option value="ATTENTION_REQUIRED">Attention Required</option>
            <option value="MISSED">Missed Routine</option>
            <option value="DELAYED">Delayed Confirmation</option>
          </select>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-8 h-8 text-olive-600" />}
          title={
            activeStatus === 'OPEN'
              ? "You're all caught up."
              : activeStatus === 'REVIEWED'
              ? 'No reviewed alerts in this view'
              : 'No resolved alerts'
          }
          description={
            activeStatus === 'OPEN'
              ? 'No medication activity currently needs your attention.'
              : 'Alerts processed by you will be listed here.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => {
            const isResolved = alert.status === 'RESOLVED';
            const isReviewed = alert.status === 'REVIEWED';

            return (
              <Card
                key={alert.id}
                variant="default"
                className={`p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-2 transition-all ${
                  alert.status === 'OPEN'
                    ? 'border-amberwarm-300 bg-amberwarm-50/40'
                    : isReviewed
                    ? 'border-nest-border bg-white'
                    : 'border-nest-border bg-nest-surface-subtle opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-tactile flex items-center justify-center shrink-0 ${
                      alert.type === 'SUPPORT_REQUESTED'
                        ? 'bg-amberwarm-200 text-amberwarm-900'
                        : alert.status === 'OPEN'
                        ? 'bg-amberwarm-100 text-amberwarm-800'
                        : 'bg-nest-surface-subtle text-nest-ink-muted'
                    }`}
                  >
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-xl font-bold text-nest-ink">
                        {alert.older_adult?.preferred_name || alert.older_adult?.profile?.full_name || 'Connected Senior'} —{' '}
                        {alert.medicine?.name || 'Medication'}
                      </strong>
                      <StatusBadge status={alert.type} />
                    </div>

                    <p className="text-base text-nest-ink-muted mt-1">{alert.message}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-nest-ink-muted mt-2">
                      {alert.scheduled_time && <span>Scheduled for {alert.scheduled_time}</span>}
                      {alert.pending_minutes ? (
                        <span className="font-semibold text-amberwarm-900">
                          • Pending for {alert.pending_minutes} minutes
                        </span>
                      ) : null}
                      {isReviewed && alert.reviewed_at && (
                        <span className="text-olive-700 font-bold">
                          • Reviewed by you at {new Date(alert.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {isResolved && alert.resolved_at && (
                        <span className="text-nest-ink font-semibold">
                          • Resolved at {new Date(alert.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-center shrink-0">
                  <VoiceReminderButton
                    alert={alert}
                    variant="compact"
                    size="default"
                  />
                  <Button
                    variant="secondary"
                    size="default"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    View Details
                  </Button>

                  {alert.status === 'OPEN' && (
                    <Button
                      variant="positive"
                      size="default"
                      onClick={() => handleMarkReviewed(alert)}
                      isLoading={isProcessing}
                      leftIcon={<Check className="w-4 h-4" />}
                    >
                      Mark Reviewed
                    </Button>
                  )}

                  {alert.status === 'REVIEWED' && (
                    <Button
                      variant="tertiary"
                      size="default"
                      onClick={() => setResolvingAlert(alert)}
                      leftIcon={<CheckCheck className="w-4 h-4 text-olive-700" />}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Section 13 & 14: ALERT DETAIL MODAL */}
      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-ink/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alert-detail-title"
        >
          <div className="w-full max-w-lg rounded-tactile-xl bg-nest-surface border border-nest-border p-6 sm:p-7 shadow-tactile-lg space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amberwarm-800">
                  Medication Activity Detail
                </span>
                <h2 id="alert-detail-title" className="text-2xl font-black text-nest-ink mt-0.5">
                  {selectedAlert.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-tactile text-nest-ink-muted hover:text-nest-ink"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border space-y-2.5 text-base">
              <div className="flex justify-between">
                <span className="text-nest-ink-muted">Older Adult:</span>
                <strong className="text-nest-ink">{selectedAlert.older_adult?.preferred_name || 'Senior'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-nest-ink-muted">Medicine:</span>
                <strong className="text-nest-ink">
                  {selectedAlert.medicine?.name || 'Medication'} ({selectedAlert.medicine?.dosage || 'Dose'})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-nest-ink-muted">Scheduled Time:</span>
                <span>{selectedAlert.scheduled_time || 'Daily scheduled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nest-ink-muted">Current Routine Status:</span>
                <StatusBadge status={selectedAlert.type} />
              </div>
              {selectedAlert.pending_minutes ? (
                <div className="flex justify-between">
                  <span className="text-nest-ink-muted">Pending Duration:</span>
                  <span className="font-bold text-amberwarm-900">{selectedAlert.pending_minutes} minutes</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-2 border-t border-nest-border">
                <span className="text-nest-ink-muted">Alert Status:</span>
                <span className="font-bold uppercase text-xs tracking-wider px-2 py-0.5 rounded bg-white border border-nest-border">
                  {selectedAlert.status}
                </span>
              </div>
            </div>

            {/* Voice Reminder Audio Preview in Modal */}
            <div className="p-3 bg-amberwarm-50 rounded-tactile border border-amberwarm-200 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-amberwarm-900">
                Hear this medication reminder:
              </span>
              <VoiceReminderButton alert={selectedAlert} size="small" />
            </div>

            {/* Medical safety notice */}
            <p className="text-xs text-nest-ink-muted leading-relaxed">
              NESTCARE provides coordinated family support. If medical advice, dosage modifications, or emergency attention is needed, please consult a healthcare professional.
            </p>

            {/* Modal Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-nest-border">
              <Button
                variant="tertiary"
                size="default"
                onClick={() => {
                  const aid = selectedAlert.older_adult_id;
                  setSelectedAlert(null);
                  navigate(`/caregiver/adults/${aid}`);
                }}
                leftIcon={<ExternalLink className="w-4 h-4" />}
              >
                Go to Older Adult Profile
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {(selectedAlert.older_adult?.phone || selectedAlert.older_adult?.emergency_phone) ? (
                  <a
                    href={`tel:${selectedAlert.older_adult.phone || selectedAlert.older_adult.emergency_phone}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tactile bg-nest-surface-subtle hover:bg-nest-surface border border-nest-border text-sm font-bold text-nest-ink"
                  >
                    <Phone className="w-4 h-4 text-terracotta-600" />
                    <span>Contact Senior</span>
                  </a>
                ) : null}

                {selectedAlert.status === 'OPEN' && (
                  <Button
                    variant="positive"
                    size="default"
                    onClick={() => handleMarkReviewed(selectedAlert)}
                    isLoading={isProcessing}
                    leftIcon={<Check className="w-4 h-4" />}
                  >
                    Mark Reviewed
                  </Button>
                )}

                {selectedAlert.status === 'REVIEWED' && (
                  <Button
                    variant="primary"
                    size="default"
                    onClick={() => {
                      setResolvingAlert(selectedAlert);
                    }}
                    leftIcon={<CheckCheck className="w-4 h-4" />}
                  >
                    Mark Resolved
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 17: RESOLVE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(resolvingAlert)}
        title="Mark this support item as resolved?"
        description={`Confirming resolution notes that this activity for ${resolvingAlert?.older_adult?.preferred_name || 'Senior'} has been reviewed and supported. The historical medication log remains preserved.`}
        confirmLabel="Mark Resolved"
        cancelLabel="Keep in Review"
        confirmVariant="positive"
        isLoading={isProcessing}
        onConfirm={handleResolveAlert}
        onCancel={() => setResolvingAlert(null)}
      />
    </div>
  );
};
