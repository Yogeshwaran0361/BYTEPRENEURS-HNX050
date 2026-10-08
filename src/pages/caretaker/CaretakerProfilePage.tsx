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
import { UserCheck, Mail, Phone, HeartHandshake, LogOut, Shield, Edit2, X, Check } from 'lucide-react';

export const CaretakerProfilePage: React.FC = () => {
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
    async function load() {
      const res = await caregiverService.getConnectedAdults();
      setConnections(res.data || []);
    }
    load();
  }, []);

  const handleOpenEdit = () => {
    setEditName(profile?.full_name || '');
    setEditEmail(profile?.email || '');
    setEditPhone(caregiver?.phone || profile?.phone || '');
    setEditRel(caregiver?.relationship_type || 'Care Oversight');
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
        showToast('Profile Updated', 'Your caretaker details have been saved successfully.', 'success');
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
  const name = profile?.full_name || resolvedEmergencyName || 'Caretaker';
  const displayPhone = caregiver?.phone || profile?.phone || connectedAdult?.emergency_contact_phone || 'Not provided';
  const displayRel = caregiver?.relationship_type || connectedAdult?.emergency_contact_relationship || 'Care Oversight';

  return (
    <div className="max-w-2xl pb-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-olive-800 bg-olive-100/80 px-2.5 py-0.5 rounded border border-olive-300">
              <Shield className="w-3.5 h-3.5 text-olive-700" />
              Caretaker Identity
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-nest-ink tracking-tight mt-1.5">
            Caretaker Profile
          </h1>
          <p className="text-lg text-nest-ink-muted mt-1">
            Manage your caretaker contact details and authorization.
          </p>
        </div>

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
      </div>

      <Card variant="default" className="border-2 border-nest-border">
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-4 pb-4 border-b border-nest-border">
            <div className="w-16 h-16 rounded-full bg-olive-100 text-olive-900 font-extrabold text-2xl flex items-center justify-center border-2 border-olive-300">
              {name[0] || 'C'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-nest-ink">{name}</h2>
              <p className="text-base text-nest-ink-muted">
                Role: Caretaker • {displayRel}
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
                <span className="text-xs text-nest-ink-muted block">Alert Contact Phone</span>
                <strong className="text-base text-nest-ink">
                  {displayPhone}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border">
              <HeartHandshake className="w-5 h-5 text-olive-700 shrink-0" />
              <div>
                <span className="text-xs text-nest-ink-muted block">Connected Older Adults</span>
                <strong className="text-base text-nest-ink">
                  {connections.length > 0
                    ? connections.map(c => c.older_adult?.preferred_name || c.older_adult?.profile?.full_name || 'Senior').join(', ')
                    : 'No seniors connected yet'}
                </strong>
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
          aria-labelledby="caretaker-modal-title"
        >
          <div className="bg-white rounded-tactile border border-nest-border max-w-lg w-full p-6 shadow-tactile-lg space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-nest-border">
              <h2 id="caretaker-modal-title" className="text-xl font-bold text-nest-ink flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-olive-700" />
                Edit Caretaker Profile
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
                id="edit-caretaker-name"
                label="Full Name"
                helperText="Your real caretaker name"
              >
                <Input
                  id="edit-caretaker-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </FormField>

              <FormField
                id="edit-caretaker-email"
                label="Email Address"
                helperText="Used for login and notifications"
              >
                <Input
                  id="edit-caretaker-email"
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </FormField>

              <FormField
                id="edit-caretaker-phone"
                label="Phone for Urgent Alerts"
                helperText="Primary phone number for medication alerts"
              >
                <Input
                  id="edit-caretaker-phone"
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 000-0000"
                />
              </FormField>

              <FormField
                id="edit-caretaker-rel"
                label="Role / Relationship"
                helperText="e.g. Care Coordinator, Nurse, Family Caregiver"
              >
                <Input
                  id="edit-caretaker-rel"
                  value={editRel}
                  onChange={e => setEditRel(e.target.value)}
                  placeholder="e.g. Care Oversight"
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
