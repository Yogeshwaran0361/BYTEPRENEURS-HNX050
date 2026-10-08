import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { caregiverService } from '../../services/caregiverService';
import { CaregiverConnection } from '../../types';
import { UserCheck, Mail, Phone, HeartHandshake, LogOut, Users, Edit2, X, Check } from 'lucide-react';

export const CaregiverProfilePage: React.FC = () => {
  const { profile, caregiver, logout, updateCaregiverProfile } = useAuth();
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRel, setEditRel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadConns() {
      const res = await caregiverService.getConnectedAdults();
      setConnections(res.data || []);
    }
    loadConns();
  }, []);

  const handleOpenEdit = () => {
    setEditName(profile?.full_name || '');
    setEditEmail(profile?.email || '');
    setEditPhone(caregiver?.phone || profile?.phone || '');
    setEditRel(caregiver?.relationship_type || 'Family Caregiver');
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Name Required', 'Please enter your full name.', 'attention');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateCaregiverProfile({
        fullName: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        relationshipType: editRel.trim(),
      });

      if (res.success) {
        showToast('Profile Updated', 'Your caregiver details have been saved successfully.', 'success');
        setIsEditing(false);
      } else {
        showToast('Update Failed', res.error || 'Failed to save changes.', 'error');
      }
    } catch {
      showToast('Error', 'An unexpected error occurred while saving profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Signed out', 'You have been safely signed out.', 'info');
    navigate('/caretaker/login');
  };

  const connectedAdult = connections[0]?.older_adult;
  const resolvedEmergencyName = connectedAdult?.emergency_contact_name;
  const name = profile?.full_name || resolvedEmergencyName || 'Caregiver';
  const displayPhone = caregiver?.phone || profile?.phone || connectedAdult?.emergency_contact_phone || 'Not provided';
  const displayRel = caregiver?.relationship_type || connectedAdult?.emergency_contact_relationship || 'Family Caregiver';

  return (
    <div className="max-w-2xl pb-12 space-y-6">
      <PageHeader
        title="Caregiver Profile"
        subtitle="Manage your contact information and care authorization details."
        breadcrumbs={[
          { label: 'Dashboard', href: '/caregiver/dashboard' },
          { label: 'Profile' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              onClick={handleOpenEdit}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit Profile
            </Button>
            <Button
              variant="danger"
              size="default"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>
        }
      />

      <Card variant="default">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-4 pb-4 border-b border-nest-border">
            <div className="w-16 h-16 rounded-full bg-olive-100 text-olive-800 font-extrabold text-2xl flex items-center justify-center border-2 border-olive-200">
              {name[0] || 'C'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-nest-ink">{name}</h2>
              <p className="text-base text-nest-ink-muted">
                Role: Caregiver • {displayRel}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <Mail className="w-5 h-5 text-olive-700 shrink-0" />
              <div>
                <span className="text-xs text-nest-ink-muted block">Email Address</span>
                <strong className="text-base text-nest-ink">
                  {profile?.email || 'Not provided'}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <Phone className="w-5 h-5 text-olive-700 shrink-0" />
              <div>
                <span className="text-xs text-nest-ink-muted block">Phone for Urgent Attention Alerts</span>
                <strong className="text-base text-nest-ink">
                  {displayPhone}
                </strong>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <HeartHandshake className="w-5 h-5 text-olive-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs text-nest-ink-muted block">Connected Older Adults</span>
                {connections.length === 0 ? (
                  <span className="text-sm text-nest-ink-muted italic">No older adults connected yet</span>
                ) : (
                  <div className="space-y-1 mt-1">
                    {connections.map(conn => (
                      <strong key={conn.id} className="text-base text-nest-ink block">
                        {conn.older_adult?.preferred_name || conn.older_adult?.profile?.full_name || 'Senior'} ({conn.caregiver?.relationship_type || displayRel})
                      </strong>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="caregiver-modal-title"
        >
          <div className="bg-white rounded-tactile border border-nest-border max-w-lg w-full p-6 shadow-tactile-lg space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-nest-border">
              <h2 id="caregiver-modal-title" className="text-xl font-bold text-nest-ink flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-olive-700" />
                Edit Caregiver Profile
              </h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-nest-ink-muted hover:text-nest-ink p-1 rounded-tactile transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <FormField
                id="edit-caregiver-name"
                label="Full Name"
                helperText="Your real caregiver name"
              >
                <Input
                  id="edit-caregiver-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </FormField>

              <FormField
                id="edit-caregiver-email"
                label="Email Address"
                helperText="Used for login and notifications"
              >
                <Input
                  id="edit-caregiver-email"
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </FormField>

              <FormField
                id="edit-caregiver-phone"
                label="Phone for Urgent Alerts"
                helperText="Primary phone number for medication alerts"
              >
                <Input
                  id="edit-caregiver-phone"
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 000-0000"
                />
              </FormField>

              <FormField
                id="edit-caregiver-rel"
                label="Relationship to Senior"
                helperText="e.g. Daughter, Son, Spouse, Care Assistant"
              >
                <Input
                  id="edit-caregiver-rel"
                  value={editRel}
                  onChange={e => setEditRel(e.target.value)}
                  placeholder="e.g. Daughter"
                />
              </FormField>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-nest-border">
                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => setIsEditing(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="default"
                  isLoading={isSaving}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
