import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Check, Clock, AlertTriangle, AlertCircle, ShieldAlert, Bell } from 'lucide-react';
import { MedicationStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export interface StatusBadgeProps {
  status: MedicationStatus | 'SUPPORT_REQUESTED';
  size?: 'default' | 'large';
  className?: string;
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'default',
  className,
  customLabel,
}) => {
  const { t } = useLanguage();

  const config = {
    UPCOMING: {
      label: t('status.UPCOMING', 'Upcoming'),
      icon: Clock,
      style: 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border',
    },
    DUE: {
      label: t('status.DUE', 'Due Now'),
      icon: Bell,
      style: 'bg-terracotta-50 text-terracotta-700 border-terracotta-200',
    },
    TAKEN: {
      label: t('status.TAKEN', 'Taken'),
      icon: Check,
      style: 'bg-olive-50 text-olive-700 border-olive-200 font-semibold',
    },
    DELAYED: {
      label: t('status.DELAYED', 'Delayed'),
      icon: AlertTriangle,
      style: 'bg-amberwarm-50 text-amberwarm-700 border-amberwarm-200 font-semibold',
    },
    MISSED: {
      label: t('status.MISSED', 'Missed'),
      icon: AlertCircle,
      style: 'bg-crimson-50 text-crimson-700 border-crimson-200 font-semibold',
    },
    ATTENTION_REQUIRED: {
      label: t('status.ATTENTION_REQUIRED', 'Needs Attention'),
      icon: ShieldAlert,
      style: 'bg-amberwarm-100 text-amberwarm-800 border-amberwarm-300 font-semibold',
    },
    SUPPORT_REQUESTED: {
      label: t('senior.supportSent', 'Support Requested'),
      icon: ShieldAlert,
      style: 'bg-amberwarm-200 text-amberwarm-900 border-amberwarm-400 font-bold',
    },
  }[status] || {
    label: status,
    icon: Clock,
    style: 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border',
  };

  const IconComponent = config.icon;
  const displayText = customLabel || config.label;

  const sizeClasses = {
    default: 'px-3 py-1 text-sm gap-1.5',
    large: 'px-4 py-2 text-base gap-2 font-semibold',
  }[size];

  return (
    <span
      role="status"
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-md border transition-colors select-none font-medium',
          config.style,
          sizeClasses,
          className
        )
      )}
    >
      <IconComponent className={size === 'large' ? 'w-4 h-4 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden="true" />
      <span>{displayText}</span>
    </span>
  );
};
