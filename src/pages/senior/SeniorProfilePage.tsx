import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { ConnectionCodeDisplay } from '../../components/ui/ConnectionCodeDisplay';
import { LoadingState } from '../../components/ui/LoadingState';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { seniorService } from '../../services/seniorService';
import { connectionService } from '../../services/connectionService';
import { OlderAdult, ConnectionCode, CaregiverConnection } from '../../types';
import {
  User,
  Phone,
  LogOut,
  HeartHandshake,
  MapPin,
  Mail,
  Edit2,
  Check,
  ShieldCheck,
  KeyRound,
  X,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const SeniorProfilePage: React.FC = () => {
  const { profile, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [adult, setAdult] = useState<OlderAdult | null>(null);
  const [codeData, setCodeData] = useState<ConnectionCode | null>(null);
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Profile Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editPreferredName, setEditPreferredName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmergencyName, setEditEmergencyName] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [editEmergencyRel, setEditEmergencyRel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [adultRes, codeRes, connRes] = await Promise.all([
          seniorService.getProfile(),
          connectionService.getActiveCodeForSenior(),
          connectionService.getConnectionsForSenior(),
        ]);
        setAdult(adultRes.data);
        setCodeData(codeRes.data);
        setConnections(connRes.data || []);

        if (adultRes.data) {
          setEditPreferredName(adultRes.data.preferred_name || '');
          setEditPhone(adultRes.data.phone || '');
          setEditEmergencyName(adultRes.data.emergency_contact_name || '');
          setEditEmergencyPhone(adultRes.data.emergency_contact_phone || '');
          setEditEmergencyRel(adultRes.data.emergency_contact_relationship || '');
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleGenerateNewCode = async () => {
    setIsGenerating(true);
    try {
      const res = await connectionService.generateNewCodeForSenior(adult?.id);
      if (res.data) {
        setCodeData(res.data);
        showToast('New code generated', 'Your previous code has been deactivated.', 'info');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adult) return;
    setIsSaving(true);
    try {
      const res = await seniorService.updateProfile(adult.id, {
        preferred_name: editPreferredName,
        phone: editPhone,
        emergency_contact_name: editEmergencyName,
        emergency_contact_phone: editEmergencyPhone,
        emergency_contact_relationship: editEmergencyRel,
      });

      if (res.data) {
        setAdult(res.data);
        setIsEditing(false);
        showToast('Profile updated', 'Your personal details have been saved.', 'success');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Signed out', 'You have been safely signed out.', 'info');
    navigate('/senior/login');
  };

  if (isLoading) return <LoadingState message={t('common.loading', 'Loading...')} />;

  const displayName = adult?.preferred_name || adult?.profile?.full_name || 'Senior';
  const hasConnectedCaregiver = connections.length > 0 || Boolean(adult?.emergency_contact_name);

  return (
    <div className="max-w-3xl pb-12 space-y-6">
      <PageHeader
        title={t('senior.profileTitle', 'My Profile & Contacts')}
        subtitle={t('senior.profileSubtitle', 'Your personal details, caregiver connection, and preferences.')}
        breadcrumbs={[
          { label: t('nav.home', 'Home'), href: '/senior/dashboard' },
          { label: t('nav.profile', 'Profile') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              {t('senior.editProfile', 'Edit Profile')}
            </Button>
            <Button
              variant="danger"
              size="default"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              {t('common.signOut', 'Sign Out')}
            </Button>
          </div>
        }
      />

      {/* Main Profile Information */}
      <Card variant="default">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-4 pb-4 border-b border-nest-border">
            <div className="w-16 h-16 rounded-full bg-terracotta-100 text-terracotta-700 font-black text-2xl flex items-center justify-center border-2 border-terracotta-200">
              {displayName[0] || 'S'}
            </div>
            <div>
              <h2 className="text-2xl font-black text-nest-ink">
                {adult?.profile?.full_name || profile?.full_name || 'Senior'}
              </h2>
              <p className="text-base text-nest-ink-muted">
                Preferred Name: <strong className="text-nest-ink">{displayName}</strong> • Role: Older Adult
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <Mail className="w-5 h-5 text-nest-ink-muted shrink-0" />
              <div>
                <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                  Email Address
                </span>
                <strong className="text-base text-nest-ink">
                  {adult?.profile?.email || profile?.email || ''}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <Phone className="w-5 h-5 text-terracotta-600 shrink-0" />
              <div>
                <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                  Phone Number
                </span>
                <strong className="text-base text-nest-ink">
                  {adult?.phone || profile?.phone || 'Not provided'}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <MapPin className="w-5 h-5 text-nest-ink-muted shrink-0" />
              <div>
                <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                  Location / Timezone
                </span>
                <strong className="text-base text-nest-ink">
                  {adult?.address || 'Boston, MA'} ({adult?.timezone || 'America/New_York'})
                </strong>
              </div>
            </div>

            {/* Language & Voice Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-olive-700 shrink-0" />
                <div>
                  <span className="text-xs text-nest-ink-muted block uppercase tracking-wider font-semibold">
                    {t('senior.voiceLanguage', 'Website & Voice Language')}
                  </span>
                  <strong className="text-base text-nest-ink">
                    {language === 'ta' ? 'தமிழ் (ta-IN)' : 'English (en-IN)'}
                  </strong>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 rounded-tactile text-xs font-black border transition-colors ${
                    language === 'en'
                      ? 'bg-olive-700 text-white border-olive-800'
                      : 'bg-white text-nest-ink border-nest-border hover:bg-olive-50'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ta')}
                  className={`px-3 py-1.5 rounded-tactile text-xs font-black border transition-colors ${
                    language === 'ta'
                      ? 'bg-olive-700 text-white border-olive-800'
                      : 'bg-white text-nest-ink border-nest-border hover:bg-olive-50'
                  }`}
                >
                  தமிழ்
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CAREGIVER CONNECTION AREA (Section 24) */}
      <section aria-labelledby="caregiver-connection-heading" className="space-y-4">
        <h2 id="caregiver-connection-heading" className="text-2xl font-bold text-nest-ink">
          Caregiver Connection
        </h2>

        {hasConnectedCaregiver ? (
          // Connected State
          <Card variant="default" className="border-2 border-olive-200 bg-olive-50/30 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-olive-100 text-olive-800 flex items-center justify-center font-bold">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-olive-800 block">
                    Connected Caregiver
                  </span>
                  <h3 className="text-2xl font-black text-nest-ink">
                    {connections[0]?.caregiver?.profile?.full_name || adult?.emergency_contact_name || 'Caregiver Connected'}
                  </h3>
                  <p className="text-sm text-nest-ink-muted">
                    Relationship: <strong>{connections[0]?.caregiver?.relationship_type || adult?.emergency_contact_relationship || 'Family Caregiver'}</strong>
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded bg-olive-50 text-olive-800 border border-olive-200 text-xs font-bold uppercase tracking-wider">
                ✓ Connected
              </span>
            </div>

            {(adult?.emergency_contact_phone || connections[0]?.caregiver?.profile?.phone) && (
              <div className="p-3.5 rounded-tactile bg-white border border-olive-200 text-sm text-nest-ink flex items-center justify-between">
                <span>Caregiver contact phone:</span>
                <strong className="text-base text-nest-ink">
                  {connections[0]?.caregiver?.profile?.phone || adult?.emergency_contact_phone}
                </strong>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-nest-ink-muted">
                Your caregiver receives routine confirmations and delayed dose notifications.
              </span>
              {(adult?.emergency_contact_phone || connections[0]?.caregiver?.profile?.phone) ? (
                <a
                  href={`tel:${connections[0]?.caregiver?.profile?.phone || adult?.emergency_contact_phone}`}
                  className="text-base font-bold text-olive-800 hover:underline inline-flex items-center gap-1.5"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {connections[0]?.caregiver?.profile?.full_name?.split(' ')[0] || adult?.emergency_contact_name?.split(' ')[0] || 'Caregiver'}</span>
                </a>
              ) : null}
            </div>
          </Card>
        ) : (
          // Not Connected State
          <Card variant="subtle" className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nest-surface text-nest-ink-muted flex items-center justify-center border border-nest-border">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-nest-ink">No caregiver connected</h3>
                <p className="text-sm text-nest-ink-muted">
                  You are currently using NESTCARE independently. You can connect a family member or caregiver at any time.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Connection Code Display */}
        <ConnectionCodeDisplay
          code={codeData?.code || 'NC-7K4P-29'}
          onGenerateNew={handleGenerateNewCode}
          isLoading={isGenerating}
        />
      </section>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-ink/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
        >
          <div className="w-full max-w-lg rounded-tactile-xl bg-nest-surface border border-nest-border p-6 sm:p-7 shadow-tactile-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-nest-border mb-5">
              <h2 id="edit-profile-title" className="text-2xl font-bold text-nest-ink">
                Edit My Profile
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded text-nest-ink-muted hover:text-nest-ink"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <FormField
                id="edit-preferred-name"
                label="Preferred Name (Greeting)"
                helperText="How should we greet you on the Home screen?"
              >
                <Input
                  id="edit-preferred-name"
                  sizeVariant="large"
                  value={editPreferredName}
                  onChange={e => setEditPreferredName(e.target.value)}
                  required
                />
              </FormField>

              <FormField
                id="edit-phone"
                label="Phone Number"
                helperText="Your personal contact phone"
              >
                <Input
                  id="edit-phone"
                  sizeVariant="large"
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                />
              </FormField>

              <div className="pt-2 border-t border-nest-border">
                <span className="font-bold text-nest-ink text-base block mb-3">
                  Emergency & Caregiver Contact
                </span>

                <FormField
                  id="edit-em-name"
                  label="Caregiver Name"
                  helperText="Primary family or caregiver"
                >
                  <Input
                    id="edit-em-name"
                    value={editEmergencyName}
                    onChange={e => setEditEmergencyName(e.target.value)}
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <FormField
                    id="edit-em-phone"
                    label="Caregiver Phone"
                  >
                    <Input
                      id="edit-em-phone"
                      type="tel"
                      value={editEmergencyPhone}
                      onChange={e => setEditEmergencyPhone(e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="edit-em-rel"
                    label="Relationship"
                  >
                    <Input
                      id="edit-em-rel"
                      value={editEmergencyRel}
                      onChange={e => setEditEmergencyRel(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-nest-border">
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  isLoading={isSaving}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
