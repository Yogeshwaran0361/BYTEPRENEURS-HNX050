/**
 * NestCare Deep Beep & Alarm Audio Engine
 * Uses Web Audio API for zero-latency, offline, dependable audio alerts
 * and browser notifications for medication reminders.
 */

class AlarmService {
  private audioCtx: AudioContext | null = null;
  private alarmInterval: any = null;
  private isRinging: boolean = false;
  private listeners: Set<(ringing: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Generates a unique, warm, deep medical beep sequence
   * Dual-tone (320Hz body + 160Hz sub-bass) with soft envelope
   */
  public playDeepBeep(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playPulse = (startTime: number, duration: number, freq: number) => {
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, startTime + duration);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(freq / 2, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      subOsc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      subOsc.start(startTime);
      osc.stop(startTime + duration);
      subOsc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // 3 distinct deep beeps: pulse, pulse, longer pulse
    playPulse(now, 0.18, 340);
    playPulse(now + 0.28, 0.18, 340);
    playPulse(now + 0.56, 0.35, 290);
  }

  /**
   * Starts repeating deep beep alarm and sends OS notification
   */
  public startAlarm(medicineName?: string, dosage?: string): void {
    if (this.isRinging) return;
    this.isRinging = true;
    this.notifyListeners();

    // 1. Play first deep beep immediately
    this.playDeepBeep();

    // 2. Repeat deep beep every 3.5 seconds
    this.alarmInterval = setInterval(() => {
      this.playDeepBeep();
    }, 3500);

    // 3. Trigger system / browser notification
    this.sendNotification(
      '🔔 NESTCARE: Medication Due Now!',
      medicineName
        ? `It is time to take ${medicineName}${dosage ? ` (${dosage})` : ''}. Please take your medicine now.`
        : 'It is time for your scheduled medicine.'
    );
  }

  /**
   * Stops the repeating alarm immediately
   */
  public stopAlarm(): void {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    this.isRinging = false;
    this.notifyListeners();
  }

  public isAlarmRinging(): boolean {
    return this.isRinging;
  }

  public subscribe(listener: (ringing: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => fn(this.isRinging));
  }

  /**
   * Dispatches an OS/browser notification
   */
  public async sendNotification(title: string, body: string): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    try {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          tag: 'nestcare-med-alarm',
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            tag: 'nestcare-med-alarm',
            icon: '/favicon.ico',
          });
        }
      }
    } catch {
      // Notification failed or blocked in incognito/permissions
    }
  }

  /**
   * Pre-request notification permissions
   */
  public requestPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }
}

export const alarmAudio = new AlarmService();
