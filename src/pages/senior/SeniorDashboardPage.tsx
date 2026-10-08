import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { seniorService } from '../../services/seniorService';
import { connectionService } from '../../services/connectionService';
import { realtimeService } from '../../lib/realtime';
import { TodayMedicationItem, OlderAdult } from '../../types';
import {
  Check,
  Clock,
  Utensils,
  Plus,
  BellRing,
  Pill,
  Calendar,
  User,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  HeartHandshake,
  Phone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { alarmAudio } from '../../lib/alarmAudio';
import { voiceReminderService, VoiceReminderState } from '../../services/voiceReminderService';

export const SeniorDashboardPage: React.FC = () => {
  const [profile, setProfile] = useState<OlderAdult | null>(null);
  const [items, setItems] = useState<TodayMedicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connected caregiver details for calling and alerts
  const [caregiverName, setCaregiverName] = useState<string>('Caregiver');
  const [caregiverFirstName, setCaregiverFirstName] = useState<string>('Caregiver');
  const [caregiverPhone, setCaregiverPhone] = useState<string>('');
  const [caregiverRel, setCaregiverRel] = useState<string>('Caregiver');
  const [hasCaregiver, setHasCaregiver] = useState<boolean>(false);

  // Modal & alarm workflows
  const [confirmingItem, setConfirmingItem] = useState<TodayMedicationItem | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);

  // Voice Reminder Engine State
  const [voiceState, setVoiceState] = useState<VoiceReminderState>(voiceReminderService.getState());

  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, scheduleRes, connRes] = await Promise.all([
        seniorService.getProfile(),
        seniorService.getTodaySchedule(),
        connectionService.getConnectionsForSenior(),
      ]);

      if (profileRes.error) throw new Error(profileRes.error);
      if (scheduleRes.error) throw new Error(scheduleRes.error);

      setProfile(profileRes.data);
      setItems(scheduleRes.data || []);

      const conns = connRes.data || [];
      if (conns.length > 0 && conns[0].caregiver) {
        const cg = conns[0].caregiver;
        const full = cg.profile?.full_name || cg.relationship_type || 'Caregiver';
        setCaregiverName(full);
        setCaregiverFirstName(full.split(' ')[0]);
        setCaregiverPhone(cg.phone || cg.profile?.phone || profileRes.data?.emergency_contact_phone || '');
        setCaregiverRel(cg.relationship_type || 'Caregiver');
        setHasCaregiver(true);
      } else if (profileRes.data?.emergency_contact_name) {
        const full = profileRes.data.emergency_contact_name;
        setCaregiverName(full);
        setCaregiverFirstName(full.split(' ')[0]);
        setCaregiverPhone(profileRes.data.emergency_contact_phone || '');
        setCaregiverRel(profileRes.data.emergency_contact_relationship || 'Emergency Contact');
        setHasCaregiver(true);
      } else {
        setHasCaregiver(false);
      }
    } catch (err: any) {
      setError(err?.message || "Could not load today's routine.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    alarmAudio.requestPermission();

    const unsubscribeAlarm = alarmAudio.subscribe((ringing) => {
      setIsAlarmActive(ringing);
    });

    const unsubscribeVoice = voiceReminderService.subscribe((vState) => {
      setVoiceState(vState);
    });

    const channel = realtimeService.subscribeToAlerts(() => {
      loadDashboard();
    });

    return () => {
      unsubscribeAlarm();
      unsubscribeVoice();
      voiceReminderService.stop();
      realtimeService.unsubscribe(channel);
    };
  }, []);

  // Trigger deep beep alarm when a dose is DUE or DELAYED
  useEffect(() => {
    const dueItem = items.find(i => i.status === 'DUE' || i.status === 'DELAYED');
    if (dueItem && !alarmAudio.isAlarmRinging() && !voiceState.isSpeaking) {
      alarmAudio.startAlarm(dueItem.medicineName, dueItem.dosage);
    }
  }, [items]);

  // Time-based calm greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('senior.greetingMorning', 'Good morning');
    if (hour < 17) return t('senior.greetingAfternoon', 'Good afternoon');
    return t('senior.greetingEvening', 'Good evening');
  };

  // 1. Confirm Medication Action (with duplicate protection and error handling)
  const handleConfirmTaken = async () => {
    if (!confirmingItem) return;
    voiceReminderService.stop();
    setIsProcessing(true);
    try {
      alarmAudio.stopAlarm();
      const res = await seniorService.confirmMedicationTaken(
        confirmingItem.scheduleId,
        confirmingItem.medicineId
      );

      if (res.error) {
        showToast(
          "Couldn't record confirmation",
          res.error,
          'attention'
        );
        return;
      }

      if (res.data) {
        if (res.data.alreadyConfirmed) {
          showToast(
            'Already confirmed',
            `This medicine has already been confirmed for this scheduled time.`,
            'info'
          );
        } else {
          showToast(
            'Medicine confirmed',
            `${confirmingItem.medicineName} recorded at ${res.data.recordedAt}.`,
            'success'
          );
        }

        // Reload schedule to refresh states deterministically
        const updatedRes = await seniorService.getTodaySchedule(profile?.id);
        if (updatedRes.data) {
          setItems(updatedRes.data);
        }
      }
    } catch (e: any) {
      showToast(
        "Couldn't record confirmation",
        "Please check your connection and try again.",
        'attention'
      );
    } finally {
      setIsProcessing(false);
      setConfirmingItem(null);
    }
  };

  // 2. Postpone Reminder Action (fixed default 10 minutes, no modal questions)
  const handlePostponeTenMinutes = async (item: TodayMedicationItem) => {
    voiceReminderService.stop();
    alarmAudio.stopAlarm();
    setIsProcessing(true);
    try {
      const res = await seniorService.postponeReminder(
        item.scheduleId,
        item.medicineId,
        10
      );
      if (res.data) {
        showToast(
          'Reminder set',
          `We will automatically sound the alarm and remind you again in 10 minutes.`,
          'info'
        );
        const updatedRes = await seniorService.getTodaySchedule(profile?.id);
        if (updatedRes.data) {
          setItems(updatedRes.data);
        }
        // Schedule client-side alarm trigger in 10 minutes
        setTimeout(() => {
          alarmAudio.startAlarm(item.medicineName, item.dosage);
          loadDashboard();
        }, 10 * 60 * 1000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const [alarmSecondsRemaining, setAlarmSecondsRemaining] = useState<number>(60);

  // Auto-timeout countdown for active alarm: if senior does not respond within 60s, marks as DELAYED
  useEffect(() => {
    if (!isAlarmActive) {
      setAlarmSecondsRemaining(60);
      return;
    }

    const timer = setInterval(() => {
      setAlarmSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const dueItem = items.find(i => i.status === 'DUE' || i.status === 'DELAYED');
          if (dueItem) {
            handleMarkDelayed(dueItem, 'Senior did not respond to audible alarm reminder (timed out)');
          } else {
            alarmAudio.stopAlarm();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAlarmActive, items]);

  const handleMarkDelayed = async (item: TodayMedicationItem, reason = 'Senior did not respond to medication reminder') => {
    voiceReminderService.stop();
    alarmAudio.stopAlarm();
    setIsProcessing(true);
    try {
      const res = await seniorService.recordReminderDelayed(
        item.scheduleId,
        item.medicineId,
        reason
      );
      if (res.data) {
        showToast(
          'Reminder Marked as Delayed',
          'Your caretaker has been alerted so they can assist you.',
          'attention'
        );
        const updatedRes = await seniorService.getTodaySchedule(profile?.id);
        if (updatedRes.data) {
          setItems(updatedRes.data);
        }
      }
    } catch (e: any) {
      // non-blocking
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeakReminder = async (item: TodayMedicationItem) => {
    alarmAudio.stopAlarm();
    const currentItemId = item.id || item.scheduleId;
    if (voiceState.isSpeaking && voiceState.activeMedicineId === currentItemId) {
      // Interruption/restart logic: stop current speech, reset, start again
      voiceReminderService.stop();
      setTimeout(() => {
        voiceReminderService.speakTodayItem(item, displayName, language as 'en' | 'ta');
      }, 120);
      return;
    }

    const success = await voiceReminderService.speakTodayItem(
      item,
      displayName,
      language as 'en' | 'ta'
    );
    if (!success && language === 'ta' && voiceReminderService.getState().tamilVoiceMissing) {
      showToast(
        'Tamil Voice Notice',
        t('senior.tamilVoiceMissing', 'Tamil voice is not available on this device. Please enable a Tamil voice in your device settings.'),
        'attention'
      );
    }
  };

  const handleStopVoice = () => {
    voiceReminderService.stop();
    showToast('Voice stopped', 'Medication voice reading stopped.', 'info');
  };

  const handleRequestSupport = async (item: TodayMedicationItem) => {
    voiceReminderService.stop();
    alarmAudio.stopAlarm();
    setIsProcessing(true);
    try {
      const res = await seniorService.requestSupport(
        profile?.id,
        item.medicineId,
        item.medicineName,
        'Senior requested support from dashboard.'
      );
      if (res.data) {
        showToast(
          'Support request sent',
          res.data.message || `A gentle alert was sent to ${caregiverName}.`,
          'info'
        );
      }
    } catch {
      showToast('Could not send request', 'Please try again or call your caregiver.', 'attention');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSilenceAlarm = () => {
    alarmAudio.stopAlarm();
    showToast('Alarm muted', 'Sound muted. Please take your medicine when ready.', 'info');
  };

  if (isLoading) {
    return (
      <LoadingState
        message="Loading your medication routine..."
        subMessage="Preparing today's schedule for you"
      />
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboard} />;
  }

  // Find currently due medication or immediate upcoming
  // Active focus priorities:
  // 1. ATTENTION_REQUIRED or DELAYED or DUE
  // 2. Next UPCOMING
  const urgentMedicine = items.find(i => i.status === 'ATTENTION_REQUIRED' || i.status === 'DELAYED' || i.status === 'DUE');
  const nextUpcomingMedicine = items.find(i => i.status === 'UPCOMING');
  const activeFocusMedicine = urgentMedicine || nextUpcomingMedicine || null;

  const displayName = profile?.preferred_name || profile?.profile?.full_name?.split(' ')[0] || 'Senior';

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Calm Time-Based Header */}
      <section className="bg-nest-surface border border-nest-border rounded-tactile-xl p-6 sm:p-7 shadow-tactile-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-nest-ink tracking-tight">
              {getTimeGreeting()}, {displayName}
            </h1>
            <p className="text-lg text-nest-ink-muted mt-0.5">
              {t('senior.whatToDoToday', 'Here is what you need to do today.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                if (urgentMedicine) {
                  handleSpeakReminder(urgentMedicine);
                } else if (activeFocusMedicine) {
                  handleSpeakReminder(activeFocusMedicine);
                } else if (items.length > 0) {
                  handleSpeakReminder(items[0]);
                } else {
                  voiceReminderService.testVoice(language as 'en' | 'ta', displayName);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-tactile border text-xs font-black transition-colors shadow-2xs ${
                voiceState.isSpeaking
                  ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-950'
              }`}
              title="Speak medication reminder aloud"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>
                {voiceState.isSpeaking
                  ? `🔊 ${t('senior.speaking', 'Speaking')} (${voiceState.currentRepeat}/2)`
                  : `🔊 ${t('senior.speakReminder', 'Speak Reminder')}`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                alarmAudio.playDeepBeep();
                showToast('Playing deep beep sound', 'Audible alert test played successfully.', 'info');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-tactile bg-terracotta-50 hover:bg-terracotta-100 border border-terracotta-300 text-xs font-black text-terracotta-800 transition-colors shadow-2xs"
              title="Test the deep medical alert beep"
            >
              <Volume2 className="w-4 h-4 text-terracotta-600" />
              <span>{t('senior.testAlarmSound', '🔊 Test Alarm Sound')}</span>
            </button>

            <div className="inline-flex items-center gap-2 p-2 rounded-tactile bg-nest-surface-subtle border border-nest-border text-sm font-bold text-nest-ink">
              <Clock className="w-4 h-4 text-terracotta-600" aria-hidden="true" />
              <span>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE MEDICATION ALARM BANNER (Deep beep audio & visual alert) */}
      {isAlarmActive && (
        <section aria-label="Medication Alarm" className="rounded-tactile-2xl bg-terracotta-600 border-3 border-terracotta-700 p-5 sm:p-6 text-white shadow-tactile-lg animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-white text-terracotta-700 flex items-center justify-center font-bold shrink-0 shadow-tactile-sm">
                <BellRing className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded bg-terracotta-800 text-[11px] font-black uppercase tracking-wider text-terracotta-100">
                  {t('senior.alarmActive', '🔔 AUDIBLE ALARM ACTIVE')} • Auto-alerting caretaker in {alarmSecondsRemaining}s
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-0.5">
                  {t('senior.timeFor', 'Time for')} {urgentMedicine?.medicineName || 'your medication'}{' '}
                  <span className="text-lg font-normal opacity-90">({urgentMedicine?.dosage})</span>
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {urgentMedicine && (
                <button
                  type="button"
                  onClick={() => handleSpeakReminder(urgentMedicine)}
                  className={`px-4 py-2.5 rounded-tactile font-black text-sm flex items-center gap-2 transition-all shadow-tactile-sm ${
                    voiceState.isSpeaking && voiceState.activeMedicineId === (urgentMedicine.id || urgentMedicine.scheduleId)
                      ? 'bg-amber-300 text-amber-950 ring-2 ring-white animate-pulse'
                      : 'bg-white text-terracotta-900 hover:bg-terracotta-50'
                  }`}
                  aria-label={t('senior.voiceAriaLabel')}
                >
                  <Volume2 className="w-5 h-5 shrink-0 text-terracotta-700" />
                  <span>
                    {voiceState.isSpeaking && voiceState.activeMedicineId === (urgentMedicine.id || urgentMedicine.scheduleId)
                      ? `🔊 ${t('senior.speaking', 'SPEAKING...')} (${voiceState.currentRepeat}/2)`
                      : `🔊 ${t('senior.speakReminder', 'SPEAK REMINDER')}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSilenceAlarm}
                className="px-3.5 py-2.5 rounded-tactile bg-white/20 hover:bg-white/30 text-white font-bold text-sm flex items-center gap-1.5 transition-colors"
              >
                <VolumeX className="w-4 h-4" />
                <span>{t('senior.muteAlarm', 'Mute')}</span>
              </button>

              {urgentMedicine && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePostponeTenMinutes(urgentMedicine)}
                    className="px-4 py-2.5 rounded-tactile bg-white/30 hover:bg-white/40 text-white font-bold text-sm transition-colors"
                  >
                    {t('senior.remindLater', 'Remind Later (+10m)')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkDelayed(urgentMedicine, 'Senior selected Can not take right now')}
                    className="px-4 py-2.5 rounded-tactile bg-amberwarm-700 hover:bg-amberwarm-800 text-white font-bold text-sm transition-colors"
                    title="Alert caretaker that medication is delayed"
                  >
                    {t('senior.cannotTakeNow', "Can't Take (Alert Caretaker)")}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmingItem(urgentMedicine)}
                    className="px-5 py-2.5 rounded-tactile bg-white text-terracotta-900 hover:bg-terracotta-50 font-black text-sm transition-colors shadow-tactile-sm"
                  >
                    {t('senior.takeMedicine', 'Take Medicine')}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Quick Caregiver Access Bar with Registered Caregiver Name */}
      {hasCaregiver && (
        <section aria-label="Caregiver Quick Access" className="p-4 rounded-tactile-xl bg-olive-50/70 border-2 border-olive-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-tactile-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-olive-100 text-olive-800 flex items-center justify-center font-bold shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-olive-800 block">
                {t('senior.caregiverConnected', 'Connected Caregiver')}
              </span>
              <strong className="text-lg text-nest-ink">
                {caregiverName} <span className="text-sm font-normal text-nest-ink-muted">({caregiverRel})</span>
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {caregiverPhone ? (
              <a
                href={`tel:${caregiverPhone}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-tactile bg-white text-terracotta-700 hover:bg-terracotta-50 border border-terracotta-200 text-sm font-bold shadow-tactile-sm transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{t('senior.call', 'Call')} {caregiverFirstName}</span>
              </a>
            ) : null}
          </div>
        </section>
      )}

      {/* PRIMARY SECTION: "What do I need to do now?" */}
      {items.length === 0 ? (
        // Case 1: No medicines added yet (Empty state)
        <EmptyState
          title="Your medication routine hasn't been added yet"
          description="Add your medicines to create your daily routine and keep your schedule organized."
          actionLabel="Add Medicine"
          onAction={() => navigate('/senior/medicines/add')}
        />
      ) : activeFocusMedicine && (activeFocusMedicine.status === 'DUE' || activeFocusMedicine.status === 'DELAYED') ? (
        // Case 2: Medication is DUE or DELAYED (Prominent Action Card)
        <section aria-labelledby="current-medicine-title">
          <Card
            variant="highlight"
            className={`border-3 p-6 sm:p-9 shadow-tactile-md ${
              activeFocusMedicine.status === 'DELAYED'
                ? 'border-amberwarm-400 bg-gradient-to-b from-amberwarm-50/90 to-white'
                : 'border-terracotta-400 bg-gradient-to-b from-terracotta-50/90 to-white'
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-white font-black text-sm tracking-wider uppercase ${
                  activeFocusMedicine.status === 'DELAYED' ? 'bg-amberwarm-600' : 'bg-terracotta-500'
                }`}
              >
                <Clock className="w-4 h-4" />{' '}
                {activeFocusMedicine.status === 'DELAYED'
                  ? t('senior.medicinePending', 'MEDICINE STILL PENDING')
                  : t('senior.medicineNow', 'YOUR MEDICINE NOW')}
              </span>
              <StatusBadge status={activeFocusMedicine.status} size="large" />
            </div>

            <div className="my-4">
              <h2
                id="current-medicine-title"
                className="text-3xl sm:text-5xl font-black text-nest-ink tracking-tight"
              >
                {activeFocusMedicine.medicineName}
              </h2>

              <div className="flex flex-wrap items-baseline gap-3 mt-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-terracotta-700">
                  {activeFocusMedicine.dosage}
                </span>
                <span className="text-xl text-nest-ink-muted">
                  • {t('senior.scheduledFor', 'Scheduled for')} <strong>{activeFocusMedicine.scheduledTime}</strong>
                </span>
              </div>
            </div>

            {/* Food or special instruction */}
            {activeFocusMedicine.instructions && (
              <div className="p-4 rounded-tactile bg-white border border-nest-border text-lg text-nest-ink flex items-start gap-3 my-4 shadow-tactile-sm">
                <Utensils className="w-6 h-6 text-terracotta-600 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="font-medium">{activeFocusMedicine.instructions}</span>
              </div>
            )}

            {/* PROMINENT SENIOR VOICE MEDICATION REMINDER BUTTON */}
            <div className="my-5 p-5 rounded-tactile-xl bg-slate-900 text-white shadow-tactile-md border-2 border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    🔊 {t('senior.voiceSettings', 'VOICE MEDICATION REMINDER')}
                  </span>
                  <span className="text-sm text-slate-300">
                    {t('senior.speakReminderDesc', 'Press once to hear the complete medication details read aloud twice.')}
                  </span>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
                  {language === 'ta' ? 'தமிழ் குரல் (ta-IN)' : 'English Voice (en-IN)'} • 2x
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSpeakReminder(activeFocusMedicine)}
                  className={`flex-1 py-4 px-6 rounded-tactile-lg font-black text-lg sm:text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-tactile ${
                    voiceState.isSpeaking && voiceState.activeMedicineId === (activeFocusMedicine.id || activeFocusMedicine.scheduleId)
                      ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-300/50 animate-pulse'
                      : 'bg-white hover:bg-amber-50 text-slate-950 hover:text-amber-950'
                  }`}
                  aria-label={t('senior.voiceAriaLabel')}
                >
                  <Volume2 className="w-7 h-7 shrink-0 text-amber-600" />
                  <span>
                    {voiceState.isSpeaking && voiceState.activeMedicineId === (activeFocusMedicine.id || activeFocusMedicine.scheduleId)
                      ? `🔊 ${t('senior.speaking', 'SPEAKING...')} (${t('senior.readingRound', 'Reading reminder')} ${voiceState.currentRepeat}/2)`
                      : `🔊 ${t('senior.speakReminder', 'SPEAK REMINDER')}`}
                  </span>
                </button>

                {voiceState.isSpeaking && voiceState.activeMedicineId === (activeFocusMedicine.id || activeFocusMedicine.scheduleId) && (
                  <button
                    type="button"
                    onClick={handleStopVoice}
                    className="px-5 py-4 rounded-tactile-lg bg-red-600 hover:bg-red-700 text-white font-black text-base flex items-center justify-center gap-2 transition-colors shadow-tactile-sm"
                  >
                    <VolumeX className="w-5 h-5" />
                    <span>{t('senior.stopSpeaking', 'Stop Voice')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* PRIMARY SENIOR ACTIONS */}
            <div className="pt-4 border-t border-nest-border space-y-3">
              {/* Action 1: Medicine Taken (Large, prominent) */}
              <Button
                variant="positive"
                size="senior"
                fullWidth
                leftIcon={<Check className="w-8 h-8 stroke-[3]" />}
                onClick={() => setConfirmingItem(activeFocusMedicine)}
              >
                {t('senior.medicineTakenUpper', 'MEDICINE TAKEN')}
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Action 2: Remind Me Later (Automatically snoozes for 10 minutes) */}
                <Button
                  variant="secondary"
                  size="large"
                  fullWidth
                  leftIcon={<BellRing className="w-6 h-6 text-terracotta-600" />}
                  onClick={() => handlePostponeTenMinutes(activeFocusMedicine)}
                  isLoading={isProcessing}
                >
                  {t('senior.remindLater', 'Remind Me Later')}
                </Button>

                {/* Action 3: I Need Support */}
                <Button
                  variant="tertiary"
                  size="large"
                  fullWidth
                  leftIcon={<HeartHandshake className="w-6 h-6 text-olive-700" />}
                  onClick={() => handleRequestSupport(activeFocusMedicine)}
                  isLoading={isProcessing}
                >
                  {t('senior.needSupportUpper', 'I NEED SUPPORT')}
                </Button>
              </div>
            </div>
          </Card>
        </section>
      ) : activeFocusMedicine && activeFocusMedicine.status === 'ATTENTION_REQUIRED' ? (
        // Case 3: ATTENTION REQUIRED CARD
        <section aria-labelledby="attention-medicine-title">
          <Card
            variant="highlight"
            className="border-3 border-amberwarm-500 p-6 sm:p-9 shadow-tactile-md bg-gradient-to-b from-amberwarm-100/70 to-white"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amberwarm-700 text-white font-black text-sm tracking-wider uppercase">
                <ShieldAlert className="w-4 h-4" /> {t('senior.needsAttentionUpper', 'THIS NEEDS ATTENTION')}
              </span>
              <StatusBadge status="ATTENTION_REQUIRED" size="large" />
            </div>

            <div className="my-4">
              <h2
                id="attention-medicine-title"
                className="text-3xl sm:text-5xl font-black text-nest-ink tracking-tight"
              >
                {activeFocusMedicine.medicineName}
              </h2>
              <p className="text-xl text-nest-ink-muted mt-2">
                {t('senior.scheduledFor', 'Scheduled for')} <strong>{activeFocusMedicine.scheduledTime}</strong> ({activeFocusMedicine.dosage})
              </p>
              <p className="text-lg text-amberwarm-900 mt-2 font-medium">
                {t('senior.caregiverCanHelp', 'Your caregiver can help if support is needed.')}
              </p>
            </div>

            {/* VOICE REMINDER BUTTON ON ATTENTION CARD */}
            <div className="my-4">
              <button
                type="button"
                onClick={() => handleSpeakReminder(activeFocusMedicine)}
                className={`w-full py-3.5 px-5 rounded-tactile-lg font-black text-base flex items-center justify-center gap-2.5 transition-all shadow-tactile-sm ${
                  voiceState.isSpeaking && voiceState.activeMedicineId === (activeFocusMedicine.id || activeFocusMedicine.scheduleId)
                    ? 'bg-amber-400 text-amber-950 animate-pulse'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
                aria-label={t('senior.voiceAriaLabel')}
              >
                <Volume2 className="w-6 h-6 text-amber-400" />
                <span>
                  {voiceState.isSpeaking && voiceState.activeMedicineId === (activeFocusMedicine.id || activeFocusMedicine.scheduleId)
                    ? `🔊 ${t('senior.speaking', 'SPEAKING...')} (${t('senior.readingRound', 'Reading reminder')} ${voiceState.currentRepeat}/2)`
                    : `🔊 ${t('senior.speakReminder', 'SPEAK REMINDER')}`}
                </span>
              </button>
            </div>

            <div className="pt-4 border-t border-amberwarm-200 flex flex-col sm:flex-row gap-3">
              <Button
                variant="positive"
                size="large"
                leftIcon={<Check className="w-6 h-6 stroke-[3]" />}
                onClick={() => setConfirmingItem(activeFocusMedicine)}
              >
                {t('senior.takeNow', 'Confirm Taken Now')}
              </Button>
              <Button
                variant="secondary"
                size="large"
                leftIcon={<BellRing className="w-5 h-5 text-amberwarm-700" />}
                onClick={() => handlePostponeTenMinutes(activeFocusMedicine)}
                isLoading={isProcessing}
              >
                {t('senior.remindLater', 'Remind Me Later')}
              </Button>
            </div>
          </Card>
        </section>
      ) : activeFocusMedicine ? (
        // Case 4: Nothing currently due, showing NEXT scheduled medicine
        <section aria-labelledby="all-caught-up-title" className="space-y-4">
          <Card variant="subtle" className="border-olive-300 bg-olive-50/60 p-6 sm:p-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-olive-500 text-white flex items-center justify-center font-bold">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h2 id="all-caught-up-title" className="text-2xl font-bold text-nest-ink">
                  {t('senior.allCaughtUp', "You're all caught up for now.")}
                </h2>
                <p className="text-base text-nest-ink-muted">
                  {t('senior.noMedicinesDueNow', 'No medicines are due right at this moment.')}
                </p>
              </div>
            </div>

            <div className="mt-5 p-5 rounded-tactile-lg bg-white border border-olive-200 shadow-tactile-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
                {t('senior.nextScheduledMedicine', 'Next scheduled medicine')}
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                <div>
                  <h3 className="text-2xl font-black text-nest-ink">
                    {activeFocusMedicine.medicineName}{' '}
                    <span className="text-xl font-normal text-nest-ink-muted">
                      ({activeFocusMedicine.dosage})
                    </span>
                  </h3>
                  <p className="text-base text-nest-ink-muted mt-0.5">
                    {t('common.today', 'Today')} • {activeFocusMedicine.scheduledTime}
                    {activeFocusMedicine.instructions ? ` • ${activeFocusMedicine.instructions}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSpeakReminder(activeFocusMedicine)}
                    className={`px-3.5 py-2 rounded-tactile font-black text-sm flex items-center gap-2 transition-all border shadow-2xs ${
                      voiceState.isSpeaking && voiceState.activeMedicineId === (activeFocusMedicine.id || activeFocusMedicine.scheduleId)
                        ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse'
                        : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-950'
                    }`}
                    aria-label={t('senior.voiceAriaLabel')}
                  >
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>
                      {voiceState.isSpeaking && voiceState.activeMedicineId === (activeFocusMedicine.id || activeFocusMedicine.scheduleId)
                        ? `🔊 ${t('senior.speaking', 'SPEAKING...')} (${voiceState.currentRepeat}/2)`
                        : `🔊 ${t('senior.speakReminder', 'SPEAK REMINDER')}`}
                    </span>
                  </button>
                  <StatusBadge status="UPCOMING" size="large" />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-olive-200 flex justify-end">
              <a
                href="#routine-timeline"
                className="text-base font-bold text-olive-800 hover:underline inline-flex items-center gap-1.5"
              >
                <span>{t('senior.viewTodayRoutine', "View Today's Routine")}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </Card>
        </section>
      ) : (
        // Case 5: All today's medications taken
        <Card variant="subtle" className="p-8 text-center border-olive-200 bg-olive-50/60">
          <div className="w-14 h-14 rounded-full bg-olive-500 text-white flex items-center justify-center mx-auto mb-3 shadow-tactile-sm">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h2 className="text-2xl font-bold text-nest-ink">
            {t('senior.allConfirmedToday', 'All medicines confirmed for today!')}
          </h2>
          <p className="text-base text-nest-ink-muted mt-1 max-w-md mx-auto">
            {t('senior.allConfirmedDesc', 'Great job! You have completed and confirmed all scheduled doses for today.')}
          </p>
        </Card>
      )}

      {/* TODAY'S CHRONOLOGICAL ROUTINE TIMELINE */}
      <section id="routine-timeline" aria-labelledby="routine-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="routine-heading" className="text-2xl font-bold text-nest-ink">
              {t('senior.todaysRoutine', "Today's Routine")}
            </h2>
            <p className="text-sm text-nest-ink-muted">
              {t('senior.chronologicalSchedule', 'Chronological schedule for today')}
            </p>
          </div>

          <Link
            to="/senior/medicines"
            className="text-base font-bold text-terracotta-600 hover:underline inline-flex items-center gap-1"
          >
            <span>{t('senior.viewAllMedicines', 'View All Medicines')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {items.map(item => {
            const isTaken = item.status === 'TAKEN';
            const isDue = item.status === 'DUE';

            return (
              <Card
                key={item.scheduleId}
                variant={isDue ? 'highlight' : 'default'}
                className={`p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all ${
                  isDue ? 'border-2 border-terracotta-300' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-12 h-12 rounded-tactile flex items-center justify-center shrink-0 border ${
                      isTaken
                        ? 'bg-olive-500 text-white border-olive-600 shadow-tactile-sm'
                        : isDue
                        ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-tactile-sm'
                        : 'bg-nest-surface-subtle border-nest-border text-nest-ink-muted'
                    }`}
                  >
                    {isTaken ? (
                      <Check className="w-7 h-7 stroke-[3]" aria-hidden="true" />
                    ) : isDue ? (
                      <Clock className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
                    ) : (
                      <Clock className="w-6 h-6" aria-hidden="true" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xl font-black text-nest-ink">
                        {item.medicineName}
                      </strong>
                      <span className="text-base text-nest-ink-muted font-semibold">
                        ({item.dosage})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-nest-ink-muted mt-0.5">
                      <span className="font-bold text-nest-ink">{item.scheduledTime}</span>
                      {item.instructions && <span>• {item.instructions}</span>}
                      {isTaken && item.takenAt && (
                        <span className="text-olive-700 font-bold block sm:inline">
                          • {t('senior.takenAt', 'Taken at')} {item.takenAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-0 border-nest-border/70">
                  <StatusBadge status={item.status} size={isDue ? 'large' : 'default'} />

                  <button
                    type="button"
                    onClick={() => handleSpeakReminder(item)}
                    className={`px-3 py-1.5 rounded-tactile font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all border shadow-2xs ${
                      voiceState.isSpeaking && voiceState.activeMedicineId === (item.id || item.scheduleId)
                        ? 'bg-amber-400 text-amber-950 border-amber-500 animate-pulse'
                        : 'bg-white hover:bg-amber-50 text-slate-900 border-nest-border'
                    }`}
                    aria-label={t('senior.voiceAriaLabel')}
                    title="Speak this medication reminder"
                  >
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <span>
                      {voiceState.isSpeaking && voiceState.activeMedicineId === (item.id || item.scheduleId)
                        ? `${voiceState.currentRepeat}/2`
                        : `🔊 ${t('senior.speakReminder', 'Speak')}`}
                    </span>
                  </button>

                  {!isTaken && (
                    <Button
                      variant={isDue ? 'positive' : 'secondary'}
                      size="default"
                      onClick={() => setConfirmingItem(item)}
                    >
                      {t('senior.takeNow', 'Take Now')}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* QUICK ACCESS ACTIONS (Section 16) */}
      <section aria-labelledby="quick-access-heading" className="space-y-3 pt-4">
        <h3 id="quick-access-heading" className="text-lg font-bold text-nest-ink">
          {t('senior.quickAccess', 'Quick Access')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/senior/medicines"
            className="p-4 rounded-tactile-lg bg-nest-surface border border-nest-border hover:border-terracotta-300 hover:shadow-tactile-sm transition-all flex items-center gap-3 font-bold text-nest-ink text-base"
          >
            <div className="w-10 h-10 rounded-tactile bg-terracotta-50 text-terracotta-600 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <span>{t('senior.myMedicines', 'My Medicines')}</span>
          </Link>

          <Link
            to="/senior/history"
            className="p-4 rounded-tactile-lg bg-nest-surface border border-nest-border hover:border-terracotta-300 hover:shadow-tactile-sm transition-all flex items-center gap-3 font-bold text-nest-ink text-base"
          >
            <div className="w-10 h-10 rounded-tactile bg-olive-50 text-olive-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <span>{t('senior.todayHistory', "Today's History")}</span>
          </Link>

          <Link
            to="/senior/profile"
            className="p-4 rounded-tactile-lg bg-nest-surface border border-nest-border hover:border-terracotta-300 hover:shadow-tactile-sm transition-all flex items-center gap-3 font-bold text-nest-ink text-base"
          >
            <div className="w-10 h-10 rounded-tactile bg-amberwarm-50 text-amberwarm-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <span>{t('nav.profile', 'My Profile')}</span>
          </Link>
        </div>
      </section>

      {/* 1. CONFIRMATION DIALOG (Section 12) */}
      <ConfirmationDialog
        isOpen={Boolean(confirmingItem)}
        title={`${t('senior.confirmTaking', 'Confirm taking')} ${confirmingItem?.medicineName}?`}
        description={`${t('senior.confirmTakingDesc', 'You are confirming that you took')} ${confirmingItem?.medicineName} (${confirmingItem?.dosage}).`}
        confirmLabel={t('common.confirm', 'Confirm')}
        cancelLabel={t('common.cancel', 'Cancel')}
        confirmVariant="positive"
        isLoading={isProcessing}
        onConfirm={handleConfirmTaken}
        onCancel={() => setConfirmingItem(null)}
      />
    </div>
  );
};
