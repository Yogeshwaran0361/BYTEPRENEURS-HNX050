import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { medicineService } from '../../services/medicineService';
import {
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

export const SeniorAddMedicinePage: React.FC = () => {
  const { olderAdult } = useAuth();
  const { t } = useLanguage();
  // Step in the Add flow: 1 = Form, 2 = Review before save
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Section 1: Medicine
  const [name, setName] = useState('');
  const [medicineType, setMedicineType] = useState<MedicineFormType>('Tablet');
  const [customType, setCustomType] = useState('');

  // Section 2: Dose & Syrup Container Capacities
  const [dosage, setDosage] = useState('');
  const [amountPerDose, setAmountPerDose] = useState('1 tablet');
  const [containerCapacity, setContainerCapacity] = useState('100 ml');
  const [takingCapacity, setTakingCapacity] = useState('10 ml');

  // Section 3: Schedule
  const [frequency, setFrequency] = useState<MedicineFrequencyType>('Once a day');
  const [scheduledTimes, setScheduledTimes] = useState<string[]>(['08:00 AM']);

  // Section 4: Instructions & Food
  const [foodRelation, setFoodRelation] = useState<FoodRelationType>('Not specified');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');

  // Section 5: Duration
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  // Errors & submission state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Helper when frequency changes to recommend initial times
  const handleFrequencyChange = (newFreq: MedicineFrequencyType) => {
    setFrequency(newFreq);
    if (newFreq === 'Once a day') {
      setScheduledTimes(['08:00 AM']);
    } else if (newFreq === 'Twice a day') {
      setScheduledTimes(['08:00 AM', '08:00 PM']);
    } else if (newFreq === 'Three times a day') {
      setScheduledTimes(['08:00 AM', '01:00 PM', '08:00 PM']);
    } else if (newFreq === 'Four times a day') {
      setScheduledTimes(['08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM']);
    }
  };

  const handleAddTime = () => {
    setScheduledTimes(prev => [...prev, '12:00 PM']);
  };

  const handleRemoveTime = (indexToRemove: number) => {
    if (scheduledTimes.length <= 1) {
      setErrors(prev => ({ ...prev, times: 'At least one scheduled time is required.' }));
      return;
    }
    setScheduledTimes(prev => prev.filter((_, i) => i !== indexToRemove));
    setErrors(prev => ({ ...prev, times: '' }));
  };

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...scheduledTimes];
    updated[index] = val;
    setScheduledTimes(updated);
  };

  // Validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter the medicine name.';
    }

    if (medicineType === 'Other' && !customType.trim()) {
      newErrors.customType = 'Please specify the medicine type.';
    }

    if (!dosage.trim()) {
      newErrors.dosage = 'Please enter the dosage strength (e.g., 500 mg).';
    }

    if (!amountPerDose.trim()) {
      newErrors.amount = 'Please enter amount per dose (e.g., 1 tablet).';
    }

    if (scheduledTimes.length === 0) {
      newErrors.times = 'At least one scheduled time is required.';
    }

    if (!startDate) {
      newErrors.startDate = 'Please select a start date.';
    }

    if (hasEndDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        newErrors.endDate = 'End date cannot be earlier than the start date.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveMedicine = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const finalType = medicineType === 'Other' && customType ? customType : medicineType;

      const res = await medicineService.createMedicine({
        older_adult_id: olderAdult?.id || '',
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
        is_active: true,
      });

      if (!res.data) {
        setErrors({ form: res.error || "We couldn't save this medicine. Please try again." });
        return;
      }

      showToast('Medicine added to your routine', `${name} is now tracked in your daily schedule.`, 'success');
      navigate('/senior/medicines');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl pb-12 space-y-6">
      <PageHeader
        title={currentStep === 1 ? 'Add a Medicine' : 'Review Medicine'}
        subtitle={
          currentStep === 1
            ? 'Enter your prescription details to organize your routine.'
            : 'Check your medicine details before saving.'
        }
        breadcrumbs={[
          { label: 'Home', href: '/senior/dashboard' },
          { label: 'My Medicines', href: '/senior/medicines' },
          { label: currentStep === 1 ? 'Add Medicine' : 'Review' },
        ]}
      />

      {errors.form && (
        <div
          role="alert"
          className="p-4 rounded-tactile bg-crimson-50 border border-crimson-200 text-crimson-700 text-base flex items-center gap-2"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{errors.form}</span>
        </div>
      )}

      {currentStep === 1 ? (
        /* STEP 1: Structured Form */
        <form onSubmit={handleProceedToReview} className="space-y-6">
          {/* SECTION 1: MEDICINE INFORMATION */}
          <Card variant="default" className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
              <Pill className="w-5 h-5 text-terracotta-600" aria-hidden="true" />
              <h2 className="text-xl font-bold text-nest-ink">1. Medicine Information</h2>
            </div>

            <FormField
              id="med-name"
              label="Medicine Name"
              required
              errorMessage={errors.name}
              helperText="Use the name shown on your medicine label or prescription."
            >
              <Input
                id="med-name"
                sizeVariant="large"
                placeholder="Enter medicine name (e.g., Metformin)"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                hasError={Boolean(errors.name)}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="med-type"
                label="Medicine Type"
                helperText="How is this medication taken?"
              >
                <Select
                  id="med-type"
                  sizeVariant="large"
                  value={medicineType}
                  onChange={e => setMedicineType(e.target.value as MedicineFormType)}
                  options={MEDICINE_TYPES.map(t => ({ value: t, label: t }))}
                />
              </FormField>

              {medicineType === 'Other' && (
                <FormField
                  id="med-custom-type"
                  label="Specify Type"
                  required
                  errorMessage={errors.customType}
                  helperText="e.g., Topical Cream, Patch"
                >
                  <Input
                    id="med-custom-type"
                    sizeVariant="large"
                    placeholder="Enter type"
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    hasError={Boolean(errors.customType)}
                    required
                  />
                </FormField>
              )}
            </div>
          </Card>

          {/* SECTION 2: DOSE */}
          <Card variant="default" className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
              <span className="w-5 h-5 rounded-full bg-terracotta-100 text-terracotta-700 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-xl font-bold text-nest-ink">2. Dosage & Amount</h2>
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
                    id="med-container-capacity"
                    label={t('senior.containerCapacity', 'Syrup Container Total Capacity')}
                    helperText={t('senior.containerCapacityHelper', 'e.g., 100 ml, 200 ml (total bottle volume)')}
                  >
                    <Input
                      id="med-container-capacity"
                      sizeVariant="large"
                      placeholder="e.g., 100 ml, 200 ml"
                      value={containerCapacity}
                      onChange={e => setContainerCapacity(e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="med-taking-capacity"
                    label={t('senior.takingCapacity', 'Dose Taking Cup / Container Capacity')}
                    helperText={t('senior.takingCapacityHelper', 'e.g., 10 ml, 15 ml, 20 ml (amount measured to take)')}
                  >
                    <Input
                      id="med-taking-capacity"
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
              <FormField
                id="med-dosage"
                label="Dosage Strength"
                required
                errorMessage={errors.dosage}
                helperText="e.g., 500 mg, 10 mg, 2.5 ml"
              >
                <Input
                  id="med-dosage"
                  sizeVariant="large"
                  placeholder="e.g., 500 mg"
                  value={dosage}
                  onChange={e => {
                    setDosage(e.target.value);
                    if (errors.dosage) setErrors(prev => ({ ...prev, dosage: '' }));
                  }}
                  hasError={Boolean(errors.dosage)}
                  required
                />
              </FormField>

              <FormField
                id="med-amount"
                label="Amount per Dose"
                required
                errorMessage={errors.amount}
                helperText={medicineType === 'Syrup' ? 'e.g., 10 ml, 15 ml, 20 ml (measured taking container capacity)' : 'e.g., 1 tablet, 5 ml, 2 drops, 1 puff'}
              >
                <Input
                  id="med-amount"
                  sizeVariant="large"
                  placeholder={medicineType === 'Syrup' ? 'e.g., 10 ml, 15 ml' : 'e.g., 1 tablet'}
                  value={amountPerDose}
                  onChange={e => {
                    setAmountPerDose(e.target.value);
                    if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
                  }}
                  hasError={Boolean(errors.amount)}
                  required
                />
              </FormField>
            </div>
          </Card>

          {/* SECTION 3: SCHEDULE & FREQUENCY */}
          <Card variant="default" className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
              <Clock className="w-5 h-5 text-terracotta-600" aria-hidden="true" />
              <h2 className="text-xl font-bold text-nest-ink">3. Schedule & Frequency</h2>
            </div>

            <FormField
              id="med-frequency"
              label="How often do you take this medicine?"
              helperText="Select the planned daily frequency"
            >
              <Select
                id="med-frequency"
                sizeVariant="large"
                value={frequency}
                onChange={e => handleFrequencyChange(e.target.value as MedicineFrequencyType)}
                options={FREQUENCY_OPTIONS.map(f => ({ value: f, label: f }))}
              />
            </FormField>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-base font-semibold text-nest-ink">
                  Scheduled Daily Times
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="default"
                  onClick={handleAddTime}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Time
                </Button>
              </div>

              {errors.times && (
                <p role="alert" className="text-sm font-medium text-crimson-600">
                  {errors.times}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scheduledTimes.map((time, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      sizeVariant="large"
                      value={time}
                      onChange={e => handleTimeChange(idx, e.target.value)}
                      placeholder="e.g., 08:00 AM"
                      className="font-bold text-lg"
                    />
                    {scheduledTimes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(idx)}
                        className="p-3 rounded-tactile hover:bg-crimson-50 text-crimson-600 border border-nest-border transition-colors"
                        aria-label={`Remove time slot ${time}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* SECTION 4: FOOD & SPECIAL INSTRUCTIONS */}
          <Card variant="default" className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
              <Utensils className="w-5 h-5 text-terracotta-600" aria-hidden="true" />
              <h2 className="text-xl font-bold text-nest-ink">4. Food & Doctor Instructions</h2>
            </div>

            <FormField
              id="med-food"
              label="Relation to Food"
              helperText="As instructed on your prescription"
            >
              <Select
                id="med-food"
                sizeVariant="large"
                value={foodRelation}
                onChange={e => setFoodRelation(e.target.value as FoodRelationType)}
                options={FOOD_OPTIONS.map(opt => ({ value: opt, label: opt }))}
              />
            </FormField>

            <FormField
              id="med-additional"
              label="Additional Instructions (Optional)"
              helperText="Instructions provided by your doctor or pharmacist (e.g., Take with a full glass of water)"
            >
              <Input
                id="med-additional"
                sizeVariant="large"
                placeholder="e.g., Take with a full glass of water after breakfast"
                value={additionalInstructions}
                onChange={e => setAdditionalInstructions(e.target.value)}
              />
            </FormField>

            <FormField
              id="med-prescriber"
              label="Prescribing Doctor (Optional)"
              helperText="For caregiver reference"
            >
              <Input
                id="med-prescriber"
                placeholder="e.g., Dr. Sarah Lin (Cardiology)"
                value={prescribedBy}
                onChange={e => setPrescribedBy(e.target.value)}
              />
            </FormField>
          </Card>

          {/* SECTION 5: DURATION & DATES */}
          <Card variant="default" className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-nest-border">
              <Calendar className="w-5 h-5 text-terracotta-600" aria-hidden="true" />
              <h2 className="text-xl font-bold text-nest-ink">5. Duration & Start Date</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="med-start-date"
                label="Start Date"
                required
                errorMessage={errors.startDate}
                helperText="When did or will you start this medicine?"
              >
                <Input
                  id="med-start-date"
                  type="date"
                  sizeVariant="large"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
              </FormField>

              <div>
                <label className="text-base font-semibold text-nest-ink block mb-2">
                  Treatment Duration
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setHasEndDate(!hasEndDate)}
                    className={`px-4 py-2.5 rounded-tactile text-sm font-bold border transition-colors ${
                      hasEndDate
                        ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-300'
                        : 'bg-nest-surface text-nest-ink border-nest-border'
                    }`}
                  >
                    {hasEndDate ? '✓ Has End Date' : 'No End Date (Ongoing)'}
                  </button>
                </div>
              </div>
            </div>

            {hasEndDate && (
              <FormField
                id="med-end-date"
                label="End Date"
                required
                errorMessage={errors.endDate}
                helperText="When is the last planned dose?"
              >
                <Input
                  id="med-end-date"
                  type="date"
                  sizeVariant="large"
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                  }}
                  hasError={Boolean(errors.endDate)}
                  required
                />
              </FormField>
            )}

            <MedicalSafetyNotice compact />
          </Card>

          {/* Navigation to Review */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <Button
              variant="secondary"
              size="large"
              onClick={() => navigate('/senior/medicines')}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="large"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Review Medicine
            </Button>
          </div>
        </form>
      ) : (
        /* STEP 2: REVIEW BEFORE SAVE (Section 14) */
        <Card variant="highlight" className="border-2 border-terracotta-300 p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-terracotta-200">
            <span className="text-xs font-bold uppercase tracking-wider text-terracotta-700 block">
              Please check your information
            </span>
            <h2 className="text-3xl font-black text-nest-ink mt-1">REVIEW MEDICINE</h2>
            <p className="text-base text-nest-ink-muted mt-1">
              Confirm that this matches your prescription label before adding it to your routine.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-tactile bg-white border border-terracotta-200 shadow-tactile-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted block">
                Medicine Name & Type
              </span>
              <div className="text-2xl font-black text-nest-ink mt-0.5">
                {name}{' '}
                <span className="text-lg font-normal text-nest-ink-muted">
                  ({medicineType === 'Other' && customType ? customType : medicineType})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-tactile bg-white border border-nest-border">
                <span className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted block">
                  Dosage Strength
                </span>
                <strong className="text-xl font-bold text-terracotta-700 block mt-0.5">
                  {dosage}
                </strong>
              </div>

              <div className="p-4 rounded-tactile bg-white border border-nest-border">
                <span className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted block">
                  Amount per Dose
                </span>
                <strong className="text-xl font-bold text-nest-ink block mt-0.5">
                  {amountPerDose}
                </strong>
              </div>
            </div>

            {medicineType === 'Syrup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-tactile bg-olive-50/70 border border-olive-200">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-olive-800 block">
                    {t('senior.containerCapacity', 'Syrup Container Total Capacity')}
                  </span>
                  <strong className="text-lg font-bold text-nest-ink block mt-0.5">
                    {containerCapacity || 'Not specified'}
                  </strong>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-olive-800 block">
                    {t('senior.takingCapacity', 'Dose Taking Cup / Container Capacity')}
                  </span>
                  <strong className="text-lg font-bold text-nest-ink block mt-0.5">
                    {takingCapacity || 'Not specified'}
                  </strong>
                </div>
              </div>
            )}

            <div className="p-4 rounded-tactile bg-white border border-nest-border">
              <span className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted block">
                Schedule & Times ({frequency})
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {scheduledTimes.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-md bg-terracotta-50 text-terracotta-800 border border-terracotta-200 text-base font-bold"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-tactile bg-white border border-nest-border">
                <span className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted block">
                  Relation to Food
                </span>
                <strong className="text-base text-nest-ink block mt-0.5">
                  {foodRelation}
                </strong>
              </div>

              <div className="p-4 rounded-tactile bg-white border border-nest-border">
                <span className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted block">
                  Duration
                </span>
                <strong className="text-base text-nest-ink block mt-0.5">
                  Starts {startDate} {hasEndDate && endDate ? `• Ends ${endDate}` : '• Ongoing'}
                </strong>
              </div>
            </div>

            {additionalInstructions && (
              <div className="p-4 rounded-tactile bg-white border border-nest-border">
                <span className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted block">
                  Doctor Instructions
                </span>
                <p className="text-base text-nest-ink mt-0.5">{additionalInstructions}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-terracotta-200">
            <Button
              variant="secondary"
              size="large"
              onClick={() => setCurrentStep(1)}
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Go Back & Edit
            </Button>

            <Button
              variant="positive"
              size="senior"
              onClick={handleSaveMedicine}
              isLoading={isLoading}
              leftIcon={<Check className="w-7 h-7 stroke-[3]" />}
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Saving your medicine...' : 'Save Medicine'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
