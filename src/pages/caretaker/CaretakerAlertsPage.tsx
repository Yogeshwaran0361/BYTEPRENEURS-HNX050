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
  Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const CaretakerAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeStatus, setActiveStatus] = useState<AlertWorkflowStatus | 'ALL'>('OPEN');
  const [typeFilter, setTypeFilter] = useState<AlertType | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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
      if (res.data) {
        showToast(
          'Alert reviewed',
          `You acknowledged this notification for ${alert.older_adult?.preferred_name || 'Senior'}.`,
          'info'
        );
        setAlerts(prev => prev.map(a => (a.id === alert.id ? res.data! : a)));
        if (selectedAlert?.id === alert.id) {
          setSelectedAlert(res.data);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveAlert = async () => {
    if (!resolvingAlert) return;
    setIsProcessing(true);
    try {
      const res = await alertService.resolveAlert(
        resolvingAlert.id,
        'Resolved and supported by caretaker.'
      );
      if (res.data) {
        showToast(
          'Support item resolved',
          `Marked as resolved. Historical log preserved.`,
          'success'
        );
        setAlerts(prev => prev.map(a => (a.id === resolvingAlert.id ? res.data! : a)));
        if (selectedAlert?.id === resolvingAlert.id) {
          setSelectedAlert(res.data);
        }
      }
    } finally {
      setIsProcessing(false);
      setResolvingAlert(null);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesStatus = activeStatus === 'ALL' || a.status === activeStatus;
    const matchesType = typeFilter === 'ALL' || a.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const openCount = alerts.filter(a => a.status === 'OPEN').length;
  const reviewedCount = alerts.filter(a => a.status === 'REVIEWED').length;

  if (isLoading) {
    return <LoadingState message="Loading caretaker alert center..." subMessage="Syncing recent notifications" />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-olive-800 bg-olive-100/80 px-2.5 py-0.5 rounded border border-olive-300">
              <Shield className="w-3.5 h-3.5 text-olive-700" />
              Caretaker Incident & Support Queue
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-nest-ink tracking-tight mt-1.5">
            Active Alerts & Requests
          </h1>
          <p className="text-lg text-nest-ink-muted mt-1">
            Review delays, missed schedules, and assistance requests from older adults.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-nest-border pb-3">
        <button
          onClick={() => setActiveStatus('OPEN')}
          className={`px-4 py-2 rounded-tactile text-sm font-bold transition-colors ${
            activeStatus === 'OPEN'
              ? 'bg-amberwarm-100 text-amberwarm-900 border-2 border-amberwarm-400'
              : 'bg-nest-surface-subtle text-nest-ink-muted hover:text-nest-ink border border-nest-border'
          }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setActiveStatus('REVIEWED')}
          className={`px-4 py-2 rounded-tactile text-sm font-bold transition-colors ${
            activeStatus === 'REVIEWED'
              ? 'bg-olive-100 text-olive-900 border-2 border-olive-400'
              : 'bg-nest-surface-subtle text-nest-ink-muted hover:text-nest-ink border border-nest-border'
          }`}
        >
          In Review ({reviewedCount})
        </button>
        <button
          onClick={() => setActiveStatus('ALL')}
          className={`px-4 py-2 rounded-tactile text-sm font-bold transition-colors ${
            activeStatus === 'ALL'
              ? 'bg-olive-700 text-white'
              : 'bg-nest-surface-subtle text-nest-ink-muted hover:text-nest-ink border border-nest-border'
          }`}
        >
          All Activity ({alerts.length})
        </button>
      </div>

      {/* Alerts list */}
      {filteredAlerts.length === 0 ? (
        <Card variant="subtle" className="p-8 text-center text-nest-ink-muted">
          No alerts found matching this filter criteria.
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => (
            <Card
              key={alert.id}
              variant="default"
              className="p-5 border-2 border-nest-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <strong className="text-lg text-nest-ink">
                    {alert.older_adult?.preferred_name || 'Senior'} — {alert.title}
                  </strong>
                  <StatusBadge status={alert.status === 'RESOLVED' ? 'TAKEN' : 'ATTENTION_REQUIRED'} />
                </div>
                <p className="text-sm text-nest-ink-muted">{alert.message}</p>
                <div className="text-xs text-nest-ink-muted flex items-center gap-2 pt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(alert.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                  >
                    Review
                  </Button>
                )}
                {alert.status === 'REVIEWED' && (
                  <Button
                    variant="primary"
                    size="default"
                    onClick={() => setResolvingAlert(alert)}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-ink/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-tactile-xl bg-nest-surface border border-nest-border p-6 shadow-tactile-lg space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-nest-ink">{selectedAlert.title}</h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1 rounded-tactile text-nest-ink-muted hover:text-nest-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-base text-nest-ink">{selectedAlert.message}</p>

            {/* Voice Reminder Audio Preview in Modal */}
            <div className="p-3 bg-amberwarm-50 rounded-tactile border border-amberwarm-200 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-amberwarm-900">
                Hear this medication reminder:
              </span>
              <VoiceReminderButton alert={selectedAlert} size="small" />
            </div>

            <div className="pt-4 border-t border-nest-border flex items-center justify-between">
              <Button
                variant="tertiary"
                size="default"
                onClick={() => {
                  const aid = selectedAlert.older_adult_id;
                  setSelectedAlert(null);
                  navigate(`/caretaker/adults/${aid}`);
                }}
              >
                Go to Older Adult Profile
              </Button>
              <Button
                variant="secondary"
                size="default"
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(resolvingAlert)}
        title="Mark this support item as resolved?"
        description={`Confirming resolution notes that this activity for ${resolvingAlert?.older_adult?.preferred_name || 'Senior'} has been reviewed and supported.`}
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
