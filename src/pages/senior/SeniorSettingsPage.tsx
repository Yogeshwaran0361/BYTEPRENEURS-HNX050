import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { AccessibilityControls } from '../../components/shared/AccessibilityControls';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Type,
  BellRing,
  Clock,
  Volume2,
  LogOut,
  ShieldCheck,
  Check,
  Globe,
  Mic,
} from 'lucide-react';
import { alarmAudio } from '../../lib/alarmAudio';
import { useLanguage } from '../../context/LanguageContext';
import { voiceReminderService } from '../../services/voiceReminderService';

export const SeniorSettingsPage: React.FC = () => {
  const { logout, profile } = useAuth();
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [smsAlerts, setSmsAlerts] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem('nestcare_voice_enabled') !== 'false';
  });
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const toggleVoiceEnabled = () => {
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    localStorage.setItem('nestcare_voice_enabled', String(nextVal));
    showToast(
      'Voice Reminders ' + (nextVal ? 'Enabled' : 'Disabled'),
      nextVal ? 'Reminders will be spoken aloud when due.' : 'Voice reminders are muted.',
      'info'
    );
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    const seniorName = profile?.full_name?.split(' ')[0] || 'Senior';
    const ok = await voiceReminderService.testVoice(language, seniorName);
    setIsTestingVoice(false);
    if (!ok && language === 'ta') {
      showToast(
        'Tamil Voice Notice',
        t('senior.tamilVoiceMissing', 'Tamil voice is not available on this device. Please enable a Tamil voice in your device settings.'),
        'attention'
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Signed out', 'You have been safely signed out.', 'info');
    navigate('/senior/login');
  };

  return (
    <div className="max-w-2xl pb-12 space-y-6">
      <PageHeader
        title={t('senior.voiceSettings', 'Settings & Display')}
        subtitle="Make NESTCARE comfortable, readable, and suited to your routine."
        breadcrumbs={[
          { label: 'Home', href: '/senior/dashboard' },
          { label: 'Settings' },
        ]}
      />

      {/* Accessibility / Typography */}
      <Card variant="default">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center justify-between gap-4 p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border">
            <div className="flex items-center gap-3">
              <Type className="w-6 h-6 text-terracotta-600 shrink-0" />
              <div>
                <strong className="text-lg text-nest-ink block">Text Size</strong>
                <span className="text-sm text-nest-ink-muted">
                  Make text larger across all screens for comfortable reading
                </span>
              </div>
            </div>
            <AccessibilityControls />
          </div>

          {/* VOICE MEDICATION REMINDER SYSTEM SETTINGS */}
          <div className="space-y-4 pt-2 border-t border-nest-border">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-olive-700" />
              <span className="text-sm font-black uppercase tracking-wider text-nest-ink block">
                {t('senior.voiceSettings', 'Voice Reminder Settings')}
              </span>
            </div>

            {/* Language Segmented Control */}
            <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong className="text-base text-nest-ink block">
                    {t('senior.voiceLanguage', 'Website & Voice Language')}
                  </strong>
                  <span className="text-sm text-nest-ink-muted">
                    Controls both display language and natural speech voice
                  </span>
                </div>
                <Globe className="w-5 h-5 text-olive-700 shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    showToast('Language updated', 'English (en-IN) selected for website and voice.', 'info');
                  }}
                  className={`py-3 px-4 rounded-tactile text-sm font-black border-2 transition-all flex items-center justify-center gap-2 ${
                    language === 'en'
                      ? 'bg-olive-700 text-white border-olive-800 shadow-tactile-sm'
                      : 'bg-white text-nest-ink border-nest-border hover:bg-olive-50'
                  }`}
                >
                  <span>English (en-IN)</span>
                  {language === 'en' && <Check className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLanguage('ta');
                    showToast('மொழி புதுப்பிக்கப்பட்டது', 'தமிழ் (ta-IN) குரல் மற்றும் இணையதளத்திற்கு தேர்ந்தெடுக்கப்பட்டது.', 'info');
                  }}
                  className={`py-3 px-4 rounded-tactile text-sm font-black border-2 transition-all flex items-center justify-center gap-2 ${
                    language === 'ta'
                      ? 'bg-olive-700 text-white border-olive-800 shadow-tactile-sm'
                      : 'bg-white text-nest-ink border-nest-border hover:bg-olive-50'
                  }`}
                >
                  <span>தமிழ் (ta-IN)</span>
                  {language === 'ta' && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Voice Reminders Active Toggle & Repeat Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-3">
                <div>
                  <strong className="text-base text-nest-ink block">
                    {t('senior.voiceReminders', 'Voice Reminders')}
                  </strong>
                  <span className="text-xs text-nest-ink-muted">
                    Audio speech when dose is due
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceEnabled}
                  className={`px-4 py-2 rounded-tactile text-xs font-black transition-colors border ${
                    voiceEnabled
                      ? 'bg-olive-100 text-olive-900 border-olive-300'
                      : 'bg-nest-surface text-nest-ink-muted border-nest-border'
                  }`}
                >
                  {voiceEnabled ? '✓ ON' : 'OFF'}
                </button>
              </div>

              <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-3">
                <div>
                  <strong className="text-base text-nest-ink block">
                    {t('senior.voiceRepeatCount', 'Repeat: 2 times')}
                  </strong>
                  <span className="text-xs text-nest-ink-muted">
                    Senior Safety Standard (Fixed)
                  </span>
                </div>
                <span className="px-3 py-1 rounded bg-olive-50 text-olive-800 border border-olive-200 text-xs font-bold uppercase">
                  2 Rounds
                </span>
              </div>
            </div>

            {/* Test Voice Reminder Button */}
            <div className="p-4 rounded-tactile bg-amberwarm-50/70 border border-amberwarm-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <strong className="text-base text-nest-ink block">
                  {t('senior.testVoice', '🔊 Test Voice Reminder')}
                </strong>
                <span className="text-xs text-nest-ink-muted">
                  Listen to a demonstration of how medication reminders sound
                </span>
              </div>

              <button
                type="button"
                onClick={handleTestVoice}
                disabled={isTestingVoice}
                className="px-4 py-2.5 rounded-tactile bg-slate-900 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-tactile-sm shrink-0"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>{isTestingVoice ? 'Speaking...' : t('senior.testVoice', '🔊 Test Voice')}</span>
              </button>
            </div>
          </div>

          {/* Reminder Preferences */}
          <div className="space-y-3 pt-2">
            <span className="text-sm font-bold uppercase tracking-wider text-nest-ink block">
              Reminder Preferences
            </span>

            <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-terracotta-600 shrink-0" />
                <div>
                  <strong className="text-base text-nest-ink block">
                    Default "Remind Me Later" Duration
                  </strong>
                  <span className="text-sm text-nest-ink-muted">
                    Effortless 1-tap quick snooze without complex menus
                  </span>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-tactile bg-terracotta-50 text-terracotta-800 border border-terracotta-300 font-extrabold text-sm">
                10 Minutes (Fixed)
              </div>
            </div>

            <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BellRing className="w-6 h-6 text-olive-600 shrink-0" />
                <div>
                  <strong className="text-base text-nest-ink block">SMS Text Notifications</strong>
                  <span className="text-sm text-nest-ink-muted">
                    Quiet text message to your phone when a dose is due
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSmsAlerts(!smsAlerts)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors border ${
                  smsAlerts
                    ? 'bg-olive-50 text-olive-800 border-olive-200'
                    : 'bg-nest-surface text-nest-ink-muted border-nest-border'
                }`}
              >
                {smsAlerts ? '✓ Active' : 'Off'}
              </button>
            </div>

            <div className="p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-6 h-6 text-terracotta-600 shrink-0" />
                <div>
                  <strong className="text-base text-nest-ink block">Audible Deep Beep Alarm</strong>
                  <span className="text-sm text-nest-ink-muted">
                    Warm, resonant medical beep and system alert when dose is due
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  alarmAudio.playDeepBeep();
                  showToast('Playing deep beep sound', 'Audible alert test played successfully.', 'info');
                }}
                className="px-3.5 py-1.5 rounded-tactile bg-terracotta-600 text-white font-black text-xs hover:bg-terracotta-700 shadow-tactile-sm transition-all"
              >
                🔊 Test Sound
              </button>
            </div>
          </div>

          {/* Account / Sign out */}
          <div className="pt-4 border-t border-nest-border flex items-center justify-between">
            <div>
              <strong className="text-base text-nest-ink block">Account Session</strong>
              <span className="text-xs text-nest-ink-muted">Sign out of your NESTCARE session</span>
            </div>

            <Button
              variant="danger"
              size="default"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
