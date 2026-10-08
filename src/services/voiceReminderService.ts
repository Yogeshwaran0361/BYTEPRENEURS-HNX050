/**
 * NESTCARE Senior Voice Medication Reminder System
 * Centralized VoiceReminderManager using native browser Web Speech API (SpeechSynthesis).
 *
 * Guarantees:
 * - Deterministic spoken content directly from medication/schedule records.
 * - Predictable section ordering.
 * - Exactly two complete readings with a calm pause in between.
 * - Single-voice guarantee: never overlaps audio.
 * - Handles ta-IN (Tamil) and en-IN (English) voices with asynchronous loading.
 * - Graceful fallback notice when device lacks a Tamil voice.
 */

import { TodayMedicationItem, FoodRelationType, Medicine, Alert, MedicationLog } from '../types';

export interface VoiceReminderState {
  isSpeaking: boolean;
  currentRepeat: number;
  totalRepeats: number;
  activeMedicineId: string | null;
  language: 'en' | 'ta';
  tamilVoiceMissing: boolean;
  error: string | null;
}

export type VoiceStateListener = (state: VoiceReminderState) => void;

export interface ReminderSpeechDetails {
  seniorName?: string;
  medicineName: string;
  dosage: string;
  amountPerDose?: string;
  scheduledTime?: string;
  foodRelation?: FoodRelationType | string;
  instructions?: string;
}

class VoiceReminderService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private pauseTimer: any = null;

  private state: VoiceReminderState = {
    isSpeaking: false,
    currentRepeat: 0,
    totalRepeats: 2,
    activeMedicineId: null,
    language: 'en',
    tamilVoiceMissing: false,
    error: null,
  };

  private listeners: Set<VoiceStateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    const available = this.synth.getVoices();
    if (available && available.length > 0) {
      this.voices = available;
      this.voicesLoaded = true;
    }
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public getState(): VoiceReminderState {
    return { ...this.state };
  }

  /**
   * Finds the best matching system voice for the given language.
   * Prefers ta-IN for Tamil, en-IN for English, with fallback to dialect matches.
   */
  public getPreferredVoice(language: 'en' | 'ta'): {
    voice: SpeechSynthesisVoice | null;
    isSupported: boolean;
  } {
    if (!this.synth) {
      return { voice: null, isSupported: false };
    }

    if (!this.voicesLoaded || this.voices.length === 0) {
      this.loadVoices();
    }

    const langLower = language.toLowerCase();

    if (langLower === 'ta') {
      // 1. Exact ta-IN
      const taIn = this.voices.find(v => v.lang === 'ta-IN' || v.lang === 'ta_IN');
      if (taIn) return { voice: taIn, isSupported: true };

      // 2. Any Tamil voice
      const anyTa = this.voices.find(
        v =>
          v.lang.toLowerCase().startsWith('ta') ||
          v.name.toLowerCase().includes('tamil')
      );
      if (anyTa) return { voice: anyTa, isSupported: true };

      return { voice: null, isSupported: false };
    }

    // English:
    // 1. Prefer en-IN (Indian English)
    const enIn = this.voices.find(v => v.lang === 'en-IN' || v.lang === 'en_IN');
    if (enIn) return { voice: enIn, isSupported: true };

    // 2. Prefer en-US / en-GB
    const enCommon = this.voices.find(
      v =>
        v.lang === 'en-US' ||
        v.lang === 'en-GB' ||
        v.lang.toLowerCase().startsWith('en')
    );
    if (enCommon) return { voice: enCommon, isSupported: true };

    // 3. Fallback to default voice
    const defVoice = this.voices.find(v => v.default) || this.voices[0] || null;
    return { voice: defVoice, isSupported: defVoice !== null };
  }

  /**
   * Converts times such as "08:00 AM", "08:00", "13:00", "20:00" into natural,
   * understandable spoken phrasing for seniors.
   */
  public formatTimeForSpeech(timeStr?: string, language: 'en' | 'ta' = 'en'): string {
    if (!timeStr) return '';
    const clean = timeStr.trim();

    // Check if format contains AM/PM
    const ampmMatch = clean.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
    let hour = 8;
    let minute = 0;
    let period = 'AM';

    if (ampmMatch) {
      hour = parseInt(ampmMatch[1], 10);
      minute = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
      period = ampmMatch[3].toUpperCase();
    } else {
      // Try 24h format "HH:mm"
      const h24Match = clean.match(/^(\d{1,2}):(\d{2})$/);
      if (h24Match) {
        const rawHour = parseInt(h24Match[1], 10);
        minute = parseInt(h24Match[2], 10);
        if (rawHour >= 12) {
          period = 'PM';
          hour = rawHour === 12 ? 12 : rawHour - 12;
        } else {
          period = 'AM';
          hour = rawHour === 0 ? 12 : rawHour;
        }
      }
    }

    if (language === 'ta') {
      // Natural Tamil time speech
      let timeOfDay = 'காலை'; // Morning
      if (period === 'PM') {
        if (hour === 12 || (hour >= 1 && hour <= 3)) {
          timeOfDay = 'மதியம்'; // Afternoon
        } else if (hour >= 4 && hour <= 6) {
          timeOfDay = 'மாலை'; // Evening
        } else {
          timeOfDay = 'இரவு'; // Night
        }
      } else {
        if (hour >= 4 && hour <= 11) {
          timeOfDay = 'காலை';
        } else {
          timeOfDay = 'இரவு';
        }
      }

      const minuteStr = minute > 0 ? ` ${minute} நிமிடம்` : '';
      return `${timeOfDay} ${hour} மணிக்கு${minuteStr}`;
    }

    // English natural time speech
    const minuteStr = minute > 0 ? ` ${minute}` : '';
    return `${hour}${minuteStr} ${period}`;
  }

  /**
   * Builds the complete spoken text according to the strict predictable order:
   * 1. Senior name
   * 2. Reminder notification
   * 3. Medicine name (NEVER translated incorrectly)
   * 4. Dosage
   * 5. Amount per dose
   * 6. Scheduled time
   * 7. Food relation (if present)
   * 8. Additional instructions (if present)
   * 9. Available action
   */
  public buildSpeechText(
    details: ReminderSpeechDetails,
    language: 'en' | 'ta' = 'en'
  ): string {
    const seniorName = (details.seniorName || 'Senior').trim();
    const medicineName = details.medicineName.trim();
    const dosage = (details.dosage || '').trim();
    const amount = (details.amountPerDose || '').trim();
    const timeFormatted = this.formatTimeForSpeech(details.scheduledTime, language);

    if (language === 'ta') {
      const parts: string[] = [];

      // 1. Senior name
      parts.push(`வணக்கம் ${seniorName}.`);

      // 2. Reminder notification
      parts.push('உங்கள் மருந்தை எடுத்துக்கொள்ள வேண்டிய நேரம் இது.');

      // 3. Medicine name (Exact as entered, recognizable)
      parts.push(`உங்கள் மருந்து ${medicineName}.`);

      // 4. Dosage
      if (dosage) {
        parts.push(`அளவு ${dosage}.`);
      }

      // 5. Amount per dose
      if (amount) {
        parts.push(`${amount} எடுத்துக்கொள்ளவும்.`);
      }

      // 6. Scheduled time
      if (timeFormatted) {
        parts.push(`இந்த மருந்து ${timeFormatted} திட்டமிடப்பட்டுள்ளது.`);
      }

      // 7. Food relation
      if (details.foodRelation) {
        const fr = details.foodRelation.toLowerCase();
        if (fr.includes('before') || fr === 'before_meal') {
          parts.push('உணவுக்கு முன் எடுத்துக்கொள்ளவும்.');
        } else if (fr.includes('after') || fr === 'after_meal') {
          parts.push('உணவுக்குப் பிறகு எடுத்துக்கொள்ளவும்.');
        } else if (fr.includes('with') || fr === 'with_meal') {
          parts.push('உணவுடன் எடுத்துக்கொள்ளவும்.');
        }
      }

      // 8. Additional instructions
      if (details.instructions && details.instructions.trim().length > 0) {
        const rawInst = details.instructions.trim();
        let spokenInst = rawInst;
        const instLower = rawInst.toLowerCase();
        if (instLower.includes('drink water') || instLower.includes('with water')) {
          spokenInst = 'மருந்தை தண்ணீருடன் எடுத்துக்கொள்ளவும்';
        } else if (instLower.includes('empty stomach')) {
          spokenInst = 'வெறும் வயிற்றில் எடுத்துக்கொள்ளவும்';
        } else if (instLower.includes('do not chew') || instLower.includes('swallow whole')) {
          spokenInst = 'மெல்லாமல் விழுங்கவும்';
        }
        parts.push(`கூடுதல் அறிவுரை: ${spokenInst}.`);
      }

      // 9. Available action
      parts.push('மருந்தை எடுத்த பிறகு, மருந்து எடுத்துவிட்டேன் என்பதை அழுத்தவும்.');

      return parts.join(' ');
    }

    // English
    const parts: string[] = [];

    // 1. Senior name
    parts.push(`Hello ${seniorName}.`);

    // 2. Reminder notification
    parts.push('It is time for your medicine.');

    // 3. Medicine name
    parts.push(`Your medicine is ${medicineName}.`);

    // 4. Dosage
    if (dosage) {
      parts.push(`The dosage is ${dosage}.`);
    }

    // 5. Amount per dose
    if (amount) {
      parts.push(`Take ${amount}.`);
    }

    // 6. Scheduled time
    if (timeFormatted) {
      parts.push(`This medicine is scheduled for ${timeFormatted}.`);
    }

    // 7. Food relation
    if (details.foodRelation) {
      const fr = details.foodRelation.toLowerCase();
      if (fr.includes('before') || fr === 'before_meal') {
        parts.push('Take it before food.');
      } else if (fr.includes('after') || fr === 'after_meal') {
        parts.push('Take it after food.');
      } else if (fr.includes('with') || fr === 'with_meal') {
        parts.push('Take it with food.');
      }
    }

    // 8. Additional instructions
    if (details.instructions && details.instructions.trim().length > 0) {
      parts.push(`Additional instruction: ${details.instructions.trim()}.`);
    }

    // 9. Available action
    parts.push('Press Medicine Taken once you take it.');

    return parts.join(' ');
  }

  /**
   * Stops any ongoing speech immediately and cleans up timers.
   */
  public stop(): void {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // non-blocking
      }
    }

    this.currentUtterance = null;
    this.state = {
      ...this.state,
      isSpeaking: false,
      currentRepeat: 0,
      activeMedicineId: null,
      error: null,
    };
    this.notify();
  }

  /**
   * Initiates the voice reminder.
   * Repeats the COMPLETE message exactly TWICE with a short pause between rounds.
   */
  public speakReminder(
    details: ReminderSpeechDetails,
    language: 'en' | 'ta' = 'en',
    medicineId: string = 'active-reminder'
  ): Promise<boolean> {
    // 1. Stop any currently active speech cleanly
    this.stop();

    if (!this.synth) {
      this.state.error = 'Speech synthesis is not supported in this browser.';
      this.notify();
      return Promise.resolve(false);
    }

    // Check voice support
    const voiceInfo = this.getPreferredVoice(language);
    const isTamilMissing = language === 'ta' && !voiceInfo.isSupported;

    this.state = {
      isSpeaking: true,
      currentRepeat: 1,
      totalRepeats: 2,
      activeMedicineId: medicineId,
      language,
      tamilVoiceMissing: isTamilMissing,
      error: null,
    };
    this.notify();

    if (isTamilMissing) {
      // Keep visual state briefly then recover cleanly
      setTimeout(() => {
        this.stop();
      }, 2000);
      return Promise.resolve(false);
    }

    const fullText = this.buildSpeechText(details, language);

    return new Promise((resolve) => {
      let currentRound = 1;
      const totalRounds = 2;

      const speakRound = (round: number) => {
        if (!this.synth || !this.state.isSpeaking) {
          resolve(false);
          return;
        }

        this.state.currentRepeat = round;
        this.notify();

        const utterance = new SpeechSynthesisUtterance(fullText);
        if (voiceInfo.voice) {
          utterance.voice = voiceInfo.voice;
        }
        utterance.lang = language === 'ta' ? 'ta-IN' : (voiceInfo.voice?.lang || 'en-IN');

        // Senior-friendly parameters: clear, bold, moderate rate
        utterance.rate = 0.90; // Slower, comfortable for older adults
        utterance.pitch = 1.0;
        utterance.volume = 1.0; // Clear and bold volume

        utterance.onend = () => {
          if (!this.state.isSpeaking) {
            resolve(true);
            return;
          }

          if (round < totalRounds) {
            // Calm ~1.4s pause between rounds
            this.pauseTimer = setTimeout(() => {
              currentRound = 2;
              speakRound(2);
            }, 1400);
          } else {
            // Completed two full readings -> stop automatically
            this.state.isSpeaking = false;
            this.state.currentRepeat = 0;
            this.state.activeMedicineId = null;
            this.notify();
            resolve(true);
          }
        };

        utterance.onerror = (e) => {
          if (e.error === 'canceled' || e.error === 'interrupted') {
            resolve(false);
            return;
          }
          this.state.isSpeaking = false;
          this.state.currentRepeat = 0;
          this.state.error = 'Speech error occurred.';
          this.notify();
          resolve(false);
        };

        this.currentUtterance = utterance;
        try {
          this.synth.speak(utterance);
        } catch (err: any) {
          this.state.isSpeaking = false;
          this.state.error = err?.message || 'Failed to start speech';
          this.notify();
          resolve(false);
        }
      };

      // Start round 1
      speakRound(1);
    });
  }

  /**
   * Helper to speak an item from TodayMedicationItem
   */
  public speakTodayItem(
    item: TodayMedicationItem,
    seniorName: string,
    language: 'en' | 'ta'
  ): Promise<boolean> {
    return this.speakReminder(
      {
        seniorName,
        medicineName: item.medicineName,
        dosage: item.dosage,
        amountPerDose: item.amountPerDose,
        scheduledTime: item.scheduledTime,
        foodRelation: item.foodRelation || (item.foodInstruction ? item.foodInstruction.replace('_', ' ') : undefined),
        instructions: item.instructions,
      },
      language,
      item.id || item.scheduleId
    );
  }

  /**
   * Helper to speak directly from a Medicine object
   */
  public speakMedicine(
    medicine: Medicine,
    seniorName: string = 'Senior',
    language: 'en' | 'ta' = 'en'
  ): Promise<boolean> {
    const scheduledTime = medicine.scheduled_times && medicine.scheduled_times.length > 0 
      ? medicine.scheduled_times[0] 
      : '08:00 AM';
    const amount = medicine.taking_capacity || medicine.amount_per_dose || '1 dose';
    return this.speakReminder(
      {
        seniorName,
        medicineName: medicine.name,
        dosage: medicine.dosage,
        amountPerDose: amount,
        scheduledTime,
        foodRelation: medicine.food_relation,
        instructions: medicine.additional_instructions || medicine.instructions,
      },
      language,
      medicine.id
    );
  }

  /**
   * Helper to speak a reminder from an Alert
   */
  public speakAlert(
    alert: Alert,
    language: 'en' | 'ta' = 'en'
  ): Promise<boolean> {
    const seniorName = alert.older_adult?.preferred_name || alert.older_adult?.profile?.full_name || 'Senior';
    const medName = alert.medicine?.name || alert.title || 'Medication';
    const dosage = alert.medicine?.dosage || '1 dose';
    const scheduledTime = alert.scheduled_time || (alert.medicine?.scheduled_times?.[0]) || '08:00 AM';
    const amount = alert.medicine?.taking_capacity || alert.medicine?.amount_per_dose || '1 dose';
    return this.speakReminder(
      {
        seniorName,
        medicineName: medName,
        dosage,
        amountPerDose: amount,
        scheduledTime,
        foodRelation: alert.medicine?.food_relation,
        instructions: alert.medicine?.additional_instructions || alert.medicine?.instructions,
      },
      language,
      alert.id
    );
  }

  /**
   * Helper to speak a reminder from a MedicationLog
   */
  public speakLog(
    log: MedicationLog,
    seniorName: string = 'Senior',
    language: 'en' | 'ta' = 'en'
  ): Promise<boolean> {
    const medName = log.medicine?.name || 'Medication';
    const dosage = log.medicine?.dosage || '1 dose';
    const scheduledTime = log.scheduled_for
      ? new Date(log.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '08:00 AM';
    const amount = log.medicine?.taking_capacity || log.medicine?.amount_per_dose || '1 dose';
    return this.speakReminder(
      {
        seniorName,
        medicineName: medName,
        dosage,
        amountPerDose: amount,
        scheduledTime,
        foodRelation: log.medicine?.food_relation,
        instructions: log.notes || log.medicine?.additional_instructions || log.medicine?.instructions,
      },
      language,
      log.id
    );
  }

  /**
   * Helper to test voice directly from settings/preferences
   */
  public testVoice(language: 'en' | 'ta', seniorName: string = 'Senior'): Promise<boolean> {
    const testDetails: ReminderSpeechDetails = {
      seniorName,
      medicineName: 'Paracetamol',
      dosage: '500 mg',
      amountPerDose: language === 'ta' ? '1 மாத்திரை' : '1 tablet',
      scheduledTime: '08:00 AM',
      foodRelation: 'After food',
      instructions: 'Drink water with the medicine',
    };
    return this.speakReminder(testDetails, language, 'test-voice');
  }
}

export const voiceReminderService = new VoiceReminderService();
