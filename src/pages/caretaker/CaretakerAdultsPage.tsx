import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';
import { caregiverService, CaregiverAttentionItem } from '../../services/caregiverService';
import { CaregiverConnection } from '../../types';
import { Users, Plus, Phone, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CaretakerAdultsPage: React.FC = () => {
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [attentionItems, setAttentionItems] = useState<CaregiverAttentionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [relationship, setRelationship] = useState('Caretaker');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectedSuccessAdult, setConnectedSuccessAdult] = useState<CaregiverConnection | null>(null);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadAdults = async () => {
    setIsLoading(true);
    try {
      const [connRes, attRes] = await Promise.all([
        caregiverService.getConnectedAdults(),
        caregiverService.getAttentionItems(),
      ]);
      setConnections(connRes.data || []);
      setAttentionItems(attRes.data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdults();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsSubmitting(true);
    setConnectError(null);
    try {
      const res = await caregiverService.connectOlderAdult(
        undefined,
        inviteCode.trim().toUpperCase(),
        relationship
      );

      if (res.error) {
        setConnectError(res.error);
        showToast('Connection failed', res.error, 'attention');
        return;
      }

      if (res.data) {
        showToast('Connected successfully', 'Older adult is now linked to your care portal.', 'success');
        setInviteModalOpen(false);
        setInviteCode('');
        setConnectedSuccessAdult(res.data);
        await loadAdults();
      }
    } catch (e: any) {
      setConnectError('Could not connect. Please verify the code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading monitored older adults..." subMessage="Fetching connection authorizations" />;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-olive-800 bg-olive-100/80 px-2.5 py-0.5 rounded border border-olive-300">
              <Shield className="w-3.5 h-3.5 text-olive-700" />
              Caretaker Management
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-nest-ink tracking-tight mt-1.5">
            Monitored Older Adults
          </h1>
          <p className="text-lg text-nest-ink-muted mt-1">
            View routines, medication adherence history, and emergency details for connected older adults.
          </p>
        </div>

        <Button
          variant="positive"
          size="large"
          onClick={() => {
            setConnectError(null);
            setInviteModalOpen(true);
          }}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          Connect Older Adult
        </Button>
      </div>

      {connections.length === 0 ? (
        <EmptyState
          title="No connected older adults"
          description="You are not currently monitoring any older adults. Enter their 8-character invite code (e.g., NC-7K4P-29) to link accounts."
          actionLabel="Enter Connection Code"
          onAction={() => setInviteModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {connections.map(conn => {
            const adult = conn.older_adult;
            const adultId = adult?.id || conn.older_adult_id;
            const hasAttention = attentionItems.some(a => a.olderAdultId === adultId && !a.isReviewed);

            return (
              <Card
                key={conn.id}
                variant="default"
                isInteractive
                className="p-6 flex flex-col justify-between border-2 border-nest-border hover:border-olive-400"
                onClick={() => navigate(`/caretaker/adults/${adultId}`)}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-full bg-olive-100 text-olive-900 font-black text-2xl flex items-center justify-center border-2 border-olive-300">
                        {adult?.preferred_name ? adult.preferred_name[0] : 'S'}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-nest-ink">
                          {adult?.preferred_name || adult?.profile?.full_name || 'Connected Senior'}
                        </h3>
                        <p className="text-sm text-nest-ink-muted">
                          Your Relationship: <strong>{conn.caregiver?.relationship_type || relationship}</strong>
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={hasAttention ? 'ATTENTION_REQUIRED' : 'TAKEN'} />
                  </div>

                  <div className="space-y-2 py-3 border-y border-nest-border/80 text-sm">
                    <div className="flex items-center justify-between text-nest-ink">
                      <span>Phone:</span>
                      <strong className="text-nest-ink">{adult?.phone || 'Not provided'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-nest-ink">
                      <span>Location:</span>
                      <span className="text-nest-ink-muted">{adult?.address || 'Boston, MA'}</span>
                    </div>
                    <div className="flex items-center justify-between text-nest-ink">
                      <span>Emergency Contact:</span>
                      <span className="text-nest-ink font-semibold">
                        {adult?.emergency_contact_name || 'On file'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 flex items-center justify-between text-base font-bold text-olive-800">
                  <span>View Details & Routine</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect Modal */}
      {inviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-ink/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-connect-title"
        >
          <div className="w-full max-w-lg rounded-tactile-xl bg-nest-surface border border-nest-border p-6 sm:p-7 shadow-tactile-lg">
            <h2 id="modal-connect-title" className="text-2xl font-bold text-nest-ink mb-1">
              Connect to an Older Adult
            </h2>
            <p className="text-sm text-nest-ink-muted mb-5">
              Enter the unique 8-character connection code displayed on the older adult's Profile page.
            </p>

            <form onSubmit={handleConnect} className="space-y-4">
              <FormField
                id="relationship"
                label="Your Relationship"
                helperText="How are you related to this person?"
              >
                <select
                  id="relationship"
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  className="w-full px-4 py-3 rounded-tactile bg-white border border-nest-border font-medium text-nest-ink focus:outline-hidden focus:ring-2 focus:ring-olive-500"
                >
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Caretaker">Professional Caretaker</option>
                  <option value="Family Caregiver">Family Caregiver</option>
                  <option value="Friend / Neighbor">Friend / Neighbor</option>
                </select>
              </FormField>

              <FormField
                id="inviteCode"
                label="Connection Code"
                helperText="Example format: NC-7K4P-29"
              >
                <Input
                  id="inviteCode"
                  placeholder="NC-XXXX-XX"
                  value={inviteCode}
                  onChange={e => {
                    setInviteCode(e.target.value);
                    if (connectError) setConnectError(null);
                  }}
                  required
                />
              </FormField>

              {connectError && (
                <div className="p-3.5 rounded-tactile bg-crimson-50 border border-crimson-200 text-sm text-crimson-800 flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-crimson-600 shrink-0 mt-0.5" />
                  <span>{connectError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-nest-border">
                <Button
                  variant="secondary"
                  size="large"
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="positive"
                  size="large"
                  isLoading={isSubmitting}
                >
                  Connect
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connection Success Modal */}
      {connectedSuccessAdult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nest-ink/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-success-title"
        >
          <div className="w-full max-w-md rounded-tactile-xl bg-nest-surface border border-nest-border p-6 sm:p-7 shadow-tactile-lg text-center">
            <div className="w-14 h-14 rounded-full bg-olive-100 text-olive-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 id="modal-success-title" className="text-2xl font-bold text-nest-ink mb-2">
              Older adult connected successfully
            </h2>
            <p className="text-base text-nest-ink-muted mb-6">
              You are now authorized to view medication routine activities and receive support notifications.
            </p>

            <div className="flex flex-col gap-2.5">
              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => {
                  const aid = connectedSuccessAdult.older_adult_id;
                  setConnectedSuccessAdult(null);
                  navigate(`/caretaker/adults/${aid}`);
                }}
              >
                View Older Adult
              </Button>
              <Button
                variant="secondary"
                size="large"
                fullWidth
                onClick={() => {
                  setConnectedSuccessAdult(null);
                  navigate('/caretaker/dashboard');
                }}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
