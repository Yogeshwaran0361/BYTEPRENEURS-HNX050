import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { smsService } from '../../services/smsService';
import { Bell, Clock, ShieldAlert, MessageSquare, Shield, Send, Check, AlertCircle } from 'lucide-react';

export const CaretakerSettingsPage: React.FC = () => {
  const { caregiver, profile } = useAuth();
  const { showToast } = useToast();
  const cgId = caregiver?.id || 'dev-caregiver-1';

  const [gracePeriod, setGracePeriod] = useState<number>(30);
  const [missedThreshold, setMissedThreshold] = useState<number>(60);
  const [smsEnabled, setSmsEnabled] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const res = await smsService.getCaregiverSettings(cgId);
      if (res.data) {
        setGracePeriod(res.data.due_grace_period_minutes);
        setMissedThreshold(res.data.missed_threshold_minutes);
        setSmsEnabled(res.data.sms_enabled);
      }
    }
    load();
  }, [cgId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await smsService.updateCaregiverSettings({
        caregiver_id: cgId,
        due_grace_period_minutes: gracePeriod,
        missed_threshold_minutes: missedThreshold,
        sms_enabled: smsEnabled,
      });

      if (res.data) {
        showToast('Settings Saved', 'Escalation thresholds and SMS preferences updated.', 'success');
      } else {
        showToast('Save Failed', res.error || 'Could not update settings.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSms = async () => {
    setIsTesting(true);
    try {
      const phone = caregiver?.phone || profile?.phone;
      const res = await smsService.triggerSms({
        olderAdultId: 'dev-adult-1',
        caregiverId: cgId,
        eventType: 'DELAYED',
        occurrenceKey: `test-sms-${Date.now()}:DELAYED`,
        seniorName: 'Senior',
        scheduledTime: '09:00 AM',
        recipientPhone: phone,
      });

      if (res.data?.status === 'SENT') {
        showToast('SMS Dispatched', 'Real SMS successfully queued via Twilio provider.', 'success');
      } else {
        showToast(
          'SMS Configuration Notice',
          res.error || 'Twilio provider credentials are not yet configured on Supabase Edge Secrets. Follow the setup guide to activate real carrier delivery.',
          'attention'
        );
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-2xl pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-olive-800 bg-olive-100/80 px-2.5 py-0.5 rounded border border-olive-300">
              <Shield className="w-3.5 h-3.5 text-olive-700" />
              Caretaker Rules
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-nest-ink tracking-tight mt-1.5">
            Caretaker Notification Settings
          </h1>
          <p className="text-lg text-nest-ink-muted mt-1">
            Configure grace periods and alert thresholds for medication routines.
          </p>
        </div>

        <Button
          variant="primary"
          size="default"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Check className="w-4 h-4" />}
        >
          Save Settings
        </Button>
      </div>

      <Card variant="default" className="border-2 border-nest-border">
        <CardContent className="space-y-6 pt-6">
          {/* Grace Period */}
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-olive-700 shrink-0" />
              <div>
                <strong className="text-base text-nest-ink block">Delayed Dose Grace Period</strong>
                <span className="text-sm text-nest-ink-muted">Time allowed past schedule before alert is triggered</span>
              </div>
            </div>
            <select
              value={gracePeriod}
              onChange={e => setGracePeriod(Number(e.target.value))}
              className="bg-white border border-nest-border rounded px-3 py-1.5 font-bold text-nest-ink text-sm focus:outline-none focus:ring-2 focus:ring-olive-600"
            >
              <option value={15}>15 mins</option>
              <option value={30}>30 mins (Default)</option>
              <option value={45}>45 mins</option>
              <option value={60}>60 mins</option>
            </select>
          </div>

          {/* Missed Threshold */}
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amberwarm-600 shrink-0" />
              <div>
                <strong className="text-base text-nest-ink block">Urgent Escalation Window (Missed)</strong>
                <span className="text-sm text-nest-ink-muted">Escalate dose to missed and dispatch priority alert</span>
              </div>
            </div>
            <select
              value={missedThreshold}
              onChange={e => setMissedThreshold(Number(e.target.value))}
              className="bg-white border border-nest-border rounded px-3 py-1.5 font-bold text-nest-ink text-sm focus:outline-none focus:ring-2 focus:ring-olive-600"
            >
              <option value={45}>45 mins</option>
              <option value={60}>60 mins (Default)</option>
              <option value={90}>90 mins</option>
              <option value={120}>120 mins</option>
            </select>
          </div>

          {/* SMS Toggle */}
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-olive-700 shrink-0" />
              <div>
                <strong className="text-base text-nest-ink block">SMS Text Notifications</strong>
                <span className="text-sm text-nest-ink-muted">Receive quiet SMS updates for delayed confirmations</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSmsEnabled(!smsEnabled)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-colors ${
                smsEnabled
                  ? 'bg-olive-600 text-white border-olive-700'
                  : 'bg-nest-surface text-nest-ink-muted border-nest-border'
              }`}
            >
              {smsEnabled ? 'Active' : 'Muted'}
            </button>
          </div>

          {/* Test SMS Notification Section */}
          <div className="p-4 rounded-tactile bg-amberwarm-50 border border-amberwarm-200 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amberwarm-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-sm font-bold text-amberwarm-900 block">
                  SMS Carrier Verification
                </strong>
                <p className="text-xs text-amberwarm-800 mt-0.5">
                  Send a live test alert to verify carrier delivery to your registered alert phone number ({caregiver?.phone || profile?.phone || 'Not provided'}).
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="default"
              onClick={handleTestSms}
              isLoading={isTesting}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send Test SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
