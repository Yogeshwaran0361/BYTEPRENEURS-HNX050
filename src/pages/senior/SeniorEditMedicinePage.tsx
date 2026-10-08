import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../context/ToastContext';
import { medicineService } from '../../services/medicineService';
import {
  Medicine,
  MedicineFormType,
  MedicineFrequencyType,
  FoodRelationType,
} from '../../types';
import {
  Pill,
  Clock,
  Utensils,
  Calendar,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { MedicalSafetyNotice } from '../../components/shared/MedicalSafetyNotice';
import { useLanguage } from '../../context/LanguageContext';

const MEDICINE_TYPES: MedicineFormType[] = [
  'Tablet',
  'Capsule',
  'Liquid',
  'Syrup',
  'Drops',
  'Inhaler',
  'Injection',
  'Other',
];

const FREQUENCY_OPTIONS: MedicineFrequencyType[] = [
  'Once a day',
  'Twice a day',
  'Three times a day',
  'Four times a day',
  'Custom',
];

const FOOD_OPTIONS: FoodRelationType[] = [
  'Before food',
  'With food',
  'After food',
  'Any time',
  'Not specified',
];

export const SeniorEditMedicinePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Form State
  const [name, setName] = useState('');
  const [medicineType, setMedicineType] = useState<MedicineFormType>('Tablet');
  const [customType, setCustomType] = useState('');
  const [dosage, setDosage] = useState('');
  const [amountPerDose, setAmountPerDose] = useState('1 tablet');
  const [containerCapacity, setContainerCapacity] = useState('100 ml');
  const [takingCapacity, setTakingCapacity] = useState('10 ml');
  const [frequency, setFrequency] = useState<MedicineFrequencyType>('Once a day');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['08:00 AM']);
  const [foodRelation, setFoodRelation] = useState<FoodRelationType>('Not specified');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await medicineService.getMedicineById(id || 'med-1');
        if (res.data) {
          const m = res.data;
          setMedicine(m);
          setName(m.name);
          setMedicineType(m.type || 'Tablet');
          setCustomType(m.custom_type || '');
          setDosage(m.dosage || '');
          setAmountPerDose(m.amount_per_dose || '1 tablet');
          setContainerCapacity(m.container_capacity || '100 ml');
          setTakingCapacity(m.taking_capacity || '10 ml');
          setFrequency((m.frequency as MedicineFrequencyType) || 'Once a day');
          setScheduledTimes(m.scheduled_times && m.scheduled_times.length > 0 ? m.scheduled_times : ['08:00 AM']);
          setFoodRelation(m.food_relation || 'Not specified');
          setAdditionalInstructions(m.additional_instructions || m.instructions || '');
          setPrescribedBy(m.prescribed_by || '');
          setStartDate(m.start_date || new Date().toISOString().split('T')[0]);
          if (m.end_date) {
            setHasEndDate(true);
            setEndDate(m.end_date);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  const handleAddTime = () => {
    setScheduledTimes(prev => [...prev, '12:00 PM']);
  };

  const handleRemoveTime = (indexToRemove: number) => {
    if (scheduledTimes.length <= 1) return;
    setScheduledTimes(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...scheduledTimes];
    updated[index] = val;
    setScheduledTimes(updated);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Please enter the medicine name.';
    if (!dosage.trim()) newErrors.dosage = 'Please enter the dosage strength.';
    if (!amountPerDose.trim()) newErrors.amount = 'Please enter the amount per dose.';
    if (scheduledTimes.length === 0) newErrors.times = 'At least one time is required.';
    if (hasEndDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date cannot be earlier than start date.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !medicine) return;

    setIsSaving(true);
    setErrors({});
    try {
      const finalType = medicineType === 'Other' && customType ? customType : medicineType;

      const res = await medicineService.updateMedicine(medicine.id, {
        name: name.trim(),
        type: medicineType,
        custom_type: customType || undefined,
        form: finalType.toLowerCase(),
        dosage: dosage.trim(),
        amount_per_dose: amountPerDose.trim(),
        container_capacity: medicineType === 'Syrup' ? containerCapacity.trim() : undefined,
        taking_capacity: medicineType === 'Syrup' ? takingCapacity.trim() : undefined,
        frequency,
        scheduled_times: scheduledTimes,
        food_relation: foodRelation,
        start_date: startDate,
        end_date: hasEndDate && endDate ? endDate : null,
        additional_instructions: additionalInstructions.trim() || undefined,
        instructions: additionalInstructions.trim() || undefined,
        prescribed_by: prescribedBy.trim() || undefined,
      });

      if (!res.data) {
        setErrors({ form: res.error || "We couldn't save your changes. Please try again." });
        return;
      }

      showToast('Medicine updated', `${name} details have been updated.`, 'success');
      navigate(`/senior/medicines/${medicine.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading medicine details for editing..." />;
  if (!medicine) return <ErrorState message="Medicine not found" onRetry={() => navigate('/senior/medicines')} />;

  return (
    <div className="max-w-3xl pb-12 space-y-6">
      <PageHeader
        title={`Edit ${medicine.name}`}
        subtitle="Update dosage, schedule times, or instructions."
        breadcrumbs={[
          { label: 'Home', href: '/senior/dashboard' },
          { label: 'My Medicines', href: '/senior/medicines' },
          { label: medicine.name, href: `/senior/medicines/${medicine.id}` },
          { label: 'Edit' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card variant="default" className="p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
            <Pill className="w-5 h-5 text-terracotta-600" />
            <h2 className="text-xl font-bold text-nest-ink">Medicine Information</h2>
          </div>

          <FormField
            id="edit-med-name"
            label="Medicine Name"
            required
            errorMessage={errors.name}
          >
            <Input
              id="edit-med-name"
              sizeVariant="large"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="edit-med-type" label="Medicine Type">
              <Select
                id="edit-med-type"
                sizeVariant="large"
                value={medicineType}
                onChange={e => setMedicineType(e.target.value as MedicineFormType)}
                options={MEDICINE_TYPES.map(t => ({ value: t, label: t }))}
              />
            </FormField>

            {medicineType === 'Other' && (
              <FormField id="edit-custom-type" label="Specify Type" required>
                <Input
                  id="edit-custom-type"
                  sizeVariant="large"
                  value={customType}
                  onChange={e => setCustomType(e.target.value)}
                  required
                />
              </FormField>
            )}
          </div>
        </Card>

        <Card variant="default" className="p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
            <Clock className="w-5 h-5 text-terracotta-600" />
            <h2 className="text-xl font-bold text-nest-ink">Dose & Schedule</h2>
          </div>

          {/* If medicineType is Syrup: Container Actual Capacity & Actual Taking Container Capacity */}
          {medicineType === 'Syrup' && (
            <div className="p-4 rounded-tactile-lg bg-olive-50/70 border-2 border-olive-200 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧴</span>
                <div>
                  <h3 className="text-base font-bold text-olive-900">
                    {t('senior.syrupDetails', 'Syrup Bottle & Cup Measurements')}
                  </h3>
                  <p className="text-xs text-olive-800">
                    Specify the bottle's total capacity and the cup/container measurement you use to take each dose.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="edit-container-capacity"
                  label={t('senior.containerCapacity', 'Syrup Container Total Capacity')}
                  helperText={t('senior.containerCapacityHelper', 'e.g., 100 ml, 200 ml (total bottle volume)')}
                >
                  <Input
                    id="edit-container-capacity"
                    sizeVariant="large"
                    placeholder="e.g., 100 ml, 200 ml"
                    value={containerCapacity}
                    onChange={e => setContainerCapacity(e.target.value)}
                  />
                </FormField>

                <FormField
                  id="edit-taking-capacity"
                  label={t('senior.takingCapacity', 'Dose Taking Cup / Container Capacity')}
                  helperText={t('senior.takingCapacityHelper', 'e.g., 10 ml, 15 ml, 20 ml (amount measured to take)')}
                >
                  <Input
                    id="edit-taking-capacity"
                    sizeVariant="large"
                    placeholder="e.g., 10 ml, 15 ml, 20 ml"
                    value={takingCapacity}
                    onChange={e => {
                      setTakingCapacity(e.target.value);
                      setAmountPerDose(e.target.value);
                    }}
                  />
                </FormField>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="edit-dosage" label="Dosage Strength" required errorMessage={errors.dosage}>
              <Input
                id="edit-dosage"
                sizeVariant="large"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                required
              />
            </FormField>

            <FormField
              id="edit-amount"
              label="Amount per Dose"
              required
              errorMessage={errors.amount}
              helperText={medicineType === 'Syrup' ? 'e.g., 10 ml, 15 ml (measured taking container capacity)' : undefined}
            >
              <Input
                id="edit-amount"
                sizeVariant="large"
                value={amountPerDose}
                onChange={e => setAmountPerDose(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField id="edit-freq" label="Frequency">
            <Select
              id="edit-freq"
              sizeVariant="large"
              value={frequency}
              onChange={e => setFrequency(e.target.value as MedicineFrequencyType)}
              options={FREQUENCY_OPTIONS.map(f => ({ value: f, label: f }))}
            />
          </FormField>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-base font-semibold text-nest-ink">Scheduled Daily Times</label>
              <Button type="button" variant="secondary" size="default" onClick={handleAddTime} leftIcon={<Plus className="w-4 h-4" />}>
                Add Time
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scheduledTimes.map((time, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="text"
                    sizeVariant="large"
                    value={time}
                    onChange={e => handleTimeChange(idx, e.target.value)}
                    className="font-bold text-lg"
                  />
                  {scheduledTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(idx)}
                      className="p-3 rounded-tactile hover:bg-crimson-50 text-crimson-600 border border-nest-border transition-colors"
                      aria-label="Remove time slot"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
            <Utensils className="w-5 h-5 text-terracotta-600" />
            <h2 className="text-xl font-bold text-nest-ink">Food & Instructions</h2>
          </div>

          <FormField id="edit-food" label="Relation to Food">
            <Select
              id="edit-food"
              sizeVariant="large"
              value={foodRelation}
              onChange={e => setFoodRelation(e.target.value as FoodRelationType)}
              options={FOOD_OPTIONS.map(opt => ({ value: opt, label: opt }))}
            />
          </FormField>

          <FormField id="edit-instructions" label="Doctor Instructions">
            <Input
              id="edit-instructions"
              sizeVariant="large"
              value={additionalInstructions}
              onChange={e => setAdditionalInstructions(e.target.value)}
            />
          </FormField>

          <MedicalSafetyNotice compact />
        </Card>

        <div className="flex items-center justify-between gap-4 pt-4">
          <Link to={`/senior/medicines/${medicine.id}`}>
            <Button variant="secondary" size="large">
              Cancel
            </Button>
          </Link>

          <Button type="submit" variant="primary" size="large" isLoading={isSaving} leftIcon={<Check className="w-5 h-5" />}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
