import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  voiceReminderService,
  VoiceReminderState,
  ReminderSpeechDetails,
} from '../../services/voiceReminderService';
import { Medicine, Alert, MedicationLog, TodayMedicationItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

export interface VoiceReminderButtonProps {
  id?: string;
  medicine?: Medicine;
  alert?: Alert;
  log?: MedicationLog;
  item?: TodayMedicationItem;
  details?: ReminderSpeechDetails;
  seniorName?: string;
  variant?: 'prominent' | 'default' | 'subtle' | 'compact' | 'icon-only';
  size?: 'large' | 'default' | 'small';
  customLabel?: string;
  className?: string;
}

export const VoiceReminderButton: React.FC<VoiceReminderButtonProps> = ({
  id,
  medicine,
  alert,
  log,
  item,
  details,
  seniorName = 'Senior',
  variant = 'default',
  size = 'default',
  customLabel,
  className = '',
}) => {
  const [voiceState, setVoiceState] = useState<VoiceReminderState>(voiceReminderService.getState());
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = voiceReminderService.subscribe((state) => {
      setVoiceState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Determine active identifier
  const resolvedId =
    id ||
    medicine?.id ||
    alert?.id ||
    log?.id ||
    item?.id ||
    item?.scheduleId ||
    'reminder-voice';

  const isCurrentSpeaking = voiceState.isSpeaking && voiceState.activeMedicineId === resolvedId;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentSpeaking) {
      voiceReminderService.stop();
      return;
    }

    let success = false;
    const currentLang = (language === 'ta' ? 'ta' : 'en') as 'en' | 'ta';

    if (medicine) {
      success = await voiceReminderService.speakMedicine(medicine, seniorName, currentLang);
    } else if (alert) {
      success = await voiceReminderService.speakAlert(alert, currentLang);
    } else if (log) {
      success = await voiceReminderService.speakLog(log, seniorName, currentLang);
    } else if (item) {
      success = await voiceReminderService.speakTodayItem(item, seniorName, currentLang);
    } else if (details) {
      success = await voiceReminderService.speakReminder(details, currentLang, resolvedId);
    }

    if (!success && currentLang === 'ta' && voiceReminderService.getState().tamilVoiceMissing) {
      showToast(
        'Tamil Voice Notice',
        t(
          'senior.tamilVoiceMissing',
          'Tamil voice is not available on this device. Please enable a Tamil voice in your device settings.'
        ),
        'attention'
      );
    }
  };

  // Determine text labels
  const speakText =
    customLabel ||
    (language === 'ta' ? 'நினைவூட்டலைக் கேட்கவும்' : 'Speak Reminder');

  const roundText =
    language === 'ta'
      ? `வாசிக்கிறது (${voiceState.currentRepeat}/${voiceState.totalRepeats})`
      : `Speaking (${voiceState.currentRepeat}/${voiceState.totalRepeats})`;

  // Styling by variant and size
  let baseClasses =
    'relative inline-flex items-center justify-center font-extrabold rounded-tactile transition-all duration-200 select-none shadow-tactile-sm focus:outline-none focus:ring-3 focus:ring-offset-2';

  if (size === 'large') {
    baseClasses += ' text-lg px-6 py-3.5 gap-3';
  } else if (size === 'small') {
    baseClasses += ' text-xs px-2.5 py-1.5 gap-1.5';
  } else {
    baseClasses += ' text-sm sm:text-base px-3.5 py-2 gap-2';
  }

  let stateClasses = '';

  if (isCurrentSpeaking) {
    stateClasses =
      'bg-terracotta-600 text-white border-2 border-terracotta-700 shadow-lg ring-2 ring-terracotta-400 animate-pulse';
  } else {
    switch (variant) {
      case 'prominent':
        stateClasses =
          'bg-terracotta-500 hover:bg-terracotta-600 active:bg-terracotta-700 text-white border-2 border-terracotta-600 shadow-tactile hover:shadow-tactile-md';
        break;
      case 'subtle':
        stateClasses =
          'bg-nest-surface hover:bg-nest-surface-subtle active:bg-nest-border text-nest-ink border border-nest-border';
        break;
      case 'compact':
      case 'icon-only':
        stateClasses =
          'bg-terracotta-50 hover:bg-terracotta-100 active:bg-terracotta-200 text-terracotta-700 border border-terracotta-200';
        break;
      case 'default':
      default:
        stateClasses =
          'bg-amberwarm-50 hover:bg-amberwarm-100 active:bg-amberwarm-200 text-amberwarm-900 border border-amberwarm-300';
        break;
    }
  }

  const ariaLabel = isCurrentSpeaking
    ? `${roundText}. ${language === 'ta' ? 'நிறுத்த கிளிக் செய்யவும்' : 'Click to stop'}`
    : `${speakText} - ${t('senior.voiceAriaLabel', 'Speak this medication reminder clearly in your preferred language')}`;

  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={isCurrentSpeaking ? 'Stop voice' : speakText}
        aria-label={ariaLabel}
        className={`p-2 rounded-tactile flex items-center justify-center transition-all ${
          isCurrentSpeaking
            ? 'bg-terracotta-600 text-white border-2 border-terracotta-700 animate-pulse'
            : 'bg-amberwarm-100 hover:bg-amberwarm-200 text-amberwarm-900 border border-amberwarm-300'
        } ${className}`}
      >
        {isCurrentSpeaking ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-amberwarm-800" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-live="polite"
      className={`${baseClasses} ${stateClasses} ${className}`}
    >
      {isCurrentSpeaking ? (
        <>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <Volume2 className="w-5 h-5 animate-bounce shrink-0" />
          <span>{roundText}</span>
          <span className="text-xs font-normal opacity-90 underline ml-1">
            ({language === 'ta' ? 'நிறுத்து' : 'Stop'})
          </span>
        </>
      ) : (
        <>
          <Volume2 className="w-5 h-5 shrink-0 text-current" />
          <span>{speakText}</span>
        </>
      )}
    </button>
  );
};
