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
import { Users, Plus, Phone, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

export const CaregiverAdultsPage: React.FC = () => {
  const [connections, setConnections] = useState<CaregiverConnection[]>([]);
  const [attentionItems, setAttentionItems] = useState<CaregiverAttentionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [relationship, setRelationship] = useState('Caregiver');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectedSuccessAdult, setConnectedSuccessAdult] = useState<CaregiverConnection | null>(null);

  const { showToast } = useToast();
  const { t } = useLanguage();
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
        return;
      }

      if (res.data) {
        setConnectedSuccessAdult(res.data);
        setConnections(prev => [...prev, res.data!]);
        setInviteModalOpen(false);
        setInviteCode('');
        showToast('Connected successfully', 'Older adult connected to your care dashboard.', 'success');
      }
    } catch (err: any) {
      setConnectError("We couldn't complete the connection. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message={t('common.loading', 'Loading...')} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t('caregiver.connectedAdults', 'Connected Older Adults')}
        subtitle={t('caregiver.historySubtitle', 'Family members and individuals you are authorized to support.')}
        breadcrumbs={[
          { label: t('nav.dashboard', 'Dashboard'), href: '/caregiver/dashboard' },
          { label: t('nav.olderAdults', 'Older Adults') },
        ]}
        actions={
          <Button
            variant="positive"
            size="large"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => {
              setConnectError(null);
              setInviteModalOpen(true);
            }}
          >
            {t('caregiver.connectOlderAdult', 'Connect Older Adult')}
          </Button>
        }
      />

      {connections.length === 0 ? (
        <EmptyState
          title={t('caregiver.noAdultsConnected', 'No older adults connected yet')}
          description={t('caregiver.noAdultsConnectedDesc', 'Connect an older adult using their connection code to monitor their routine and receive support alerts.')}
          actionLabel={t('caregiver.connectOlderAdult', 'Connect Older Adult')}
          onAction={() => {
            setConnectError(null);
            setInviteModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map(conn => {
            const adult = conn.older_adult;
            const adultId = adult?.id || conn.older_adult_id;
            const hasAttention = attentionItems.some(a => a.olderAdultId === adultId && !a.isReviewed);

            return (
              <Card
                key={conn.id}
                variant="default"
                isInteractive
                className="p-6 flex flex-col justify-between"
                onClick={() => navigate(`/caregiver/adults/${adultId}`)}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-olive-100 text-olive-800 font-extrabold text-2xl flex items-center justify-center border-2 border-olive-200">
                        {adult?.preferred_name ? adult.preferred_name[0].toUpperCase() : (adult?.profile?.full_name ? adult.profile.full_name[0].toUpperCase() : 'S')}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-nest-ink">
                          {adult?.preferred_name || adult?.profile?.full_name || 'Connected Senior'}
                        </h3>
                        <p className="text-sm text-nest-ink-muted">
                          Relationship: {conn.caregiver?.relationship_type || 'Family Caregiver'}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={hasAttention ? 'ATTENTION_REQUIRED' : 'TAKEN'} />
                  </div>

                  <div className="space-y-2 text-sm text-nest-ink-muted p-4 rounded-tactile bg-nest-surface-subtle border border-nest-border">
                    <div className="flex items-center justify-between">
                      <span>Connection Status:</span>
                      <strong className="text-olive-700 font-bold uppercase text-xs">
                        {conn.status || 'Active'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Emergency contact:</span>
                      <strong className="text-nest-ink">{adult?.emergency_phone || adult?.emergency_contact_phone || 'Not provided'}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-nest-border flex items-center justify-between text-base font-bold text-olive-700">
                  <span>View Details & Routine</span>
                  <ArrowRight className="w-4 h-4" />
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
          <div className="w-full max-w-md rounded-tactile-xl bg-nest-surface border border-nest-border p-6 sm:p-7 shadow-tactile-lg">
            <h2 id="modal-connect-title" className="text-2xl font-bold text-nest-ink mb-2">
              Connect an Older Adult
            </h2>
            <p className="text-base text-nest-ink-muted mb-6">
              Enter the connection code provided by the senior from their profile screen (format: <strong>NC-XXXX-XX</strong>).
            </p>

            <form onSubmit={handleConnect} className="space-y-4">
              <FormField
                id="connect-code"
                label="Connection Code"
                required
                helperText="Example: NC-7K4P-29"
              >
                <Input
                  id="connect-code"
                  sizeVariant="large"
                  placeholder="NC-7K4P-29"
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
                  navigate(`/caregiver/adults/${aid}`);
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
                  navigate('/caregiver/dashboard');
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
