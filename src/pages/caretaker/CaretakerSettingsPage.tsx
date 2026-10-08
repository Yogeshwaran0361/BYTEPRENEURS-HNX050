import React from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Bell, Clock, ShieldAlert, MessageSquare, Shield } from 'lucide-react';

export const CaretakerSettingsPage: React.FC = () => {
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
      </div>

      <Card variant="default" className="border-2 border-nest-border">
        <CardContent className="space-y-6 pt-6">
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-olive-700" />
              <div>
                <strong className="text-base text-nest-ink block">Delayed Dose Grace Period</strong>
                <span className="text-sm text-nest-ink-muted">Time allowed past schedule before alert is triggered</span>
              </div>
            </div>
            <span className="text-base font-bold text-nest-ink bg-white px-3 py-1 rounded border border-nest-border">
              30 mins
            </span>
          </div>

          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amberwarm-600" />
              <div>
                <strong className="text-base text-nest-ink block">Urgent Escalation Window</strong>
                <span className="text-sm text-nest-ink-muted">Trigger direct SMS alert after extended pending time</span>
              </div>
            </div>
            <span className="text-base font-bold text-nest-ink bg-white px-3 py-1 rounded border border-nest-border">
              60 mins
            </span>
          </div>

          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-olive-700" />
              <div>
                <strong className="text-base text-nest-ink block">SMS Text Notifications</strong>
                <span className="text-sm text-nest-ink-muted">Receive quiet SMS updates for delayed confirmations</span>
              </div>
            </div>
            <span className="text-sm font-bold text-olive-700 bg-olive-50 px-3 py-1 rounded border border-olive-200">
              Active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
