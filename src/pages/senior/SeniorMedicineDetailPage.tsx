import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../context/ToastContext';
import { medicineService } from '../../services/medicineService';
import { Medicine } from '../../types';
import {
  Pill,
  Clock,
  User,
  Building,
  ArrowLeft,
  PauseCircle,
  PlayCircle,
  Calendar,
  Utensils,
  Edit3,
  Trash2,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { MedicalSafetyNotice } from '../../components/shared/MedicalSafetyNotice';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceReminderButton } from '../../components/shared/VoiceReminderButton';

export const SeniorMedicineDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modals
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await medicineService.getMedicineById(id || 'med-1');
      setMedicine(res.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePause = async () => {
    if (!medicine) return;
    setIsUpdating(true);
    try {
      const res = await medicineService.pauseMedicine(medicine.id);
      if (res.data) {
        setMedicine(res.data);
        showToast(
          'Medicine routine paused',
          `${res.data.name} is now paused. You can resume it anytime.`,
          'info'
        );
      }
    } finally {
      setIsUpdating(false);
      setShowPauseConfirm(false);
    }
  };

  const handleResume = async () => {
    if (!medicine) return;
    setIsUpdating(true);
    try {
      const res = await medicineService.resumeMedicine(medicine.id);
      if (res.data) {
        setMedicine(res.data);
        showToast(
          'Medicine routine resumed',
          `${res.data.name} is now active in your daily routine.`,
          'success'
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchive = async () => {
    if (!medicine) return;
    setIsUpdating(true);
    try {
      const res = await medicineService.archiveMedicine(medicine.id);
      if (res.data) {
        showToast('Medicine removed', `${medicine.name} was removed from your active list.`, 'info');
        navigate('/senior/medicines');
      }
    } finally {
      setIsUpdating(false);
      setShowArchiveConfirm(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading medicine details..." />;
  if (!medicine) return <ErrorState message="Medicine not found" onRetry={() => navigate('/senior/medicines')} />;

  const displayType = medicine.custom_type || medicine.type || medicine.form || 'Tablet';

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-6">
      <PageHeader
        title={medicine.name}
        subtitle={medicine.generic_name ? `Generic name: ${medicine.generic_name}` : 'Medication details'}
        breadcrumbs={[
          { label: 'Home', href: '/senior/dashboard' },
          { label: 'My Medicines', href: '/senior/medicines' },
          { label: medicine.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link to={`/senior/medicines/${medicine.id}/edit`}>
              <Button variant="secondary" size="default" leftIcon={<Edit3 className="w-4 h-4" />}>
                Edit Medicine
              </Button>
            </Link>
          </div>
        }
      />

      <Card variant={medicine.is_active ? 'default' : 'subtle'} className="border-2 border-nest-border p-6 sm:p-8 space-y-6">
        {/* Status header banner */}
        <div className="flex items-center justify-between pb-4 border-b border-nest-border">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                medicine.is_active ? 'bg-olive-500' : 'bg-nest-ink-faint'
              }`}
              aria-hidden="true"
            />
            <span className="font-extrabold text-lg text-nest-ink">
              Status: {medicine.is_active ? 'Active Routine' : 'Paused Routine'}
            </span>
          </div>

          <div>
            {medicine.is_active ? (
              <Button
                variant="secondary"
                size="default"
                onClick={() => setShowPauseConfirm(true)}
                isLoading={isUpdating}
                leftIcon={<PauseCircle className="w-4 h-4 text-amberwarm-600" />}
              >
                Pause Medicine
              </Button>
            ) : (
              <Button
                variant="positive"
                size="default"
                onClick={handleResume}
                isLoading={isUpdating}
                leftIcon={<PlayCircle className="w-4 h-4" />}
              >
                Resume Medicine
              </Button>
            )}
          </div>
        </div>

        {/* Prominent Voice Reminder Hero Bar */}
        <div className="p-4 sm:p-5 rounded-tactile-xl bg-amberwarm-50/90 border-2 border-amberwarm-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-amberwarm-200 text-amberwarm-900 flex items-center justify-center shrink-0">
              <Volume2 className="w-6 h-6 text-amberwarm-800" />
            </div>
            <div>
              <h3 className="text-lg font-black text-nest-ink">
                {t('senior.speakReminder', 'Hear Medication Reminder')}
              </h3>
              <p className="text-sm text-nest-ink-muted">
                {t('senior.speakReminderDesc', 'Press once to hear the complete medication details read aloud twice in your language.')}
              </p>
            </div>
          </div>
          <VoiceReminderButton
            medicine={medicine}
            variant="prominent"
            size="large"
            className="shrink-0 w-full sm:w-auto"
          />
        </div>

        {/* Structured Groups (Section 21) */}
        <div className="space-y-4">
          {/* Medicine Name & Type */}
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border">
            <span className="text-xs font-bold text-nest-ink-muted uppercase tracking-wider block">
              Medicine & Type
            </span>
            <div className="text-2xl sm:text-3xl font-black text-nest-ink mt-0.5">
              {medicine.name}{' '}
              <span className="text-lg font-normal text-nest-ink-muted">({displayType})</span>
            </div>
          </div>

          {/* Dosage & Amount per dose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-tactile bg-terracotta-50 border border-terracotta-200">
              <span className="text-xs font-bold text-terracotta-700 uppercase tracking-wider block">
                Dosage Strength
              </span>
              <strong className="text-2xl font-black text-terracotta-700 block mt-1">
                {medicine.dosage}
              </strong>
            </div>

            <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <span className="text-xs font-bold text-nest-ink-muted uppercase tracking-wider block">
                Amount per Dose
              </span>
              <strong className="text-2xl font-black text-nest-ink block mt-1">
                {medicine.amount_per_dose || '1 dose'}
              </strong>
            </div>
          </div>

          {/* If Syrup: Container Capacity and Taking Container Capacity */}
          {medicine.type === 'Syrup' && (medicine.container_capacity || medicine.taking_capacity) && (
            <div className="p-4 rounded-tactile-lg bg-olive-50/70 border border-olive-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧴</span>
                <span className="text-sm font-bold text-olive-900">
                  {t('senior.syrupDetails', 'Syrup Bottle & Cup Measurements')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-olive-800 block">
                    {t('senior.containerCapacity', 'Syrup Container Total Capacity')}
                  </span>
                  <strong className="text-xl font-black text-nest-ink block mt-0.5">
                    {medicine.container_capacity || 'Not specified'}
                  </strong>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-olive-800 block">
                    {t('senior.takingCapacity', 'Dose Taking Cup / Container Capacity')}
                  </span>
                  <strong className="text-xl font-black text-nest-ink block mt-0.5">
                    {medicine.taking_capacity || medicine.amount_per_dose || 'Not specified'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border space-y-2">
            <span className="text-xs font-bold text-nest-ink-muted uppercase tracking-wider block">
              Schedule ({medicine.frequency || 'Daily'})
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {medicine.scheduled_times && medicine.scheduled_times.length > 0 ? (
                medicine.scheduled_times.map((time, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-md bg-white text-nest-ink border border-nest-border text-lg font-black shadow-tactile-sm"
                  >
                    {time}
                  </span>
                ))
              ) : (
                <span className="text-base text-nest-ink font-bold">08:00 AM</span>
              )}
            </div>
          </div>

          {/* Food Relation */}
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border">
            <span className="text-xs font-bold text-nest-ink-muted uppercase tracking-wider block">
              Relation to Food
            </span>
            <strong className="text-lg font-bold text-nest-ink block mt-0.5">
              {medicine.food_relation || 'Not specified'}
            </strong>
          </div>

          {/* Duration */}
          <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border">
            <span className="text-xs font-bold text-nest-ink-muted uppercase tracking-wider block">
              Treatment Duration
            </span>
            <div className="text-base text-nest-ink mt-0.5">
              <span>Started: <strong>{medicine.start_date || 'Ongoing'}</strong></span>
              {medicine.end_date && (
                <span> • Ends: <strong>{medicine.end_date}</strong></span>
              )}
            </div>
          </div>

          {/* Additional Instructions */}
          {(medicine.additional_instructions || medicine.instructions) && (
            <div className="p-4 rounded-tactile bg-white border border-nest-border">
              <span className="text-xs font-bold text-nest-ink-muted uppercase tracking-wider block">
                Doctor Instructions
              </span>
              <p className="text-base text-nest-ink mt-1 leading-relaxed">
                {medicine.additional_instructions || medicine.instructions}
              </p>
            </div>
          )}

          {/* Prescriber & Pharmacy */}
          {(medicine.prescribed_by || medicine.pharmacy) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {medicine.prescribed_by && (
                <div className="p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border text-sm">
                  <span className="text-xs text-nest-ink-muted block font-semibold">Prescriber</span>
                  <strong className="text-nest-ink">{medicine.prescribed_by}</strong>
                </div>
              )}
              {medicine.pharmacy && (
                <div className="p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border text-sm">
                  <span className="text-xs text-nest-ink-muted block font-semibold">Pharmacy</span>
                  <strong className="text-nest-ink">{medicine.pharmacy}</strong>
                </div>
              )}
            </div>
          )}

          <MedicalSafetyNotice compact />
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-nest-border">
          <Link to="/senior/medicines" className="w-full sm:w-auto">
            <Button variant="secondary" size="large" fullWidth leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Medicines
            </Button>
          </Link>

          <Button
            variant="tertiary"
            size="default"
            onClick={() => setShowArchiveConfirm(true)}
            className="text-crimson-600 hover:bg-crimson-50 text-sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Remove from routine
          </Button>
        </div>
      </Card>

      {/* PAUSE CONFIRMATION DIALOG (Section 17) */}
      <ConfirmationDialog
        isOpen={showPauseConfirm}
        title={`Pause ${medicine.name}?`}
        description="Pausing removes it from your active routine. You can resume it anytime without losing your history."
        confirmLabel="Pause Medicine"
        cancelLabel="Cancel"
        confirmVariant="primary"
        isLoading={isUpdating}
        onConfirm={handlePause}
        onCancel={() => setShowPauseConfirm(false)}
      />

      {/* ARCHIVE/DELETE CONFIRMATION DIALOG (Section 20) */}
      <ConfirmationDialog
        isOpen={showArchiveConfirm}
        title={`Remove ${medicine.name}?`}
        description="Deleting this medicine will remove it from your active medication list. Are you sure?"
        confirmLabel="Remove Medicine"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isLoading={isUpdating}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
      />
    </div>
  );
};
