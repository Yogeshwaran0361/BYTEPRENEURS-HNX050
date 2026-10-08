import React, { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Copy, Check, RefreshCw, ShieldAlert, KeyRound } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface ConnectionCodeDisplayProps {
  code: string;
  onGenerateNew?: () => Promise<void> | void;
  isLoading?: boolean;
}

export const ConnectionCodeDisplay: React.FC<ConnectionCodeDisplayProps> = ({
  code,
  onGenerateNew,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast('Connection code copied', 'You can share this code with your caregiver.', 'info');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
      showToast('Copy failed', 'Please select and copy the code manually.', 'attention');
    }
  };

  return (
    <Card variant="default" className="border-2 border-nest-border p-6 sm:p-7">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-tactile bg-terracotta-50 text-terracotta-700 border border-terracotta-200 flex items-center justify-center shrink-0">
          <KeyRound className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-nest-ink">Connect a Caregiver</h3>
          <p className="text-sm text-nest-ink-muted">
            Share this temporary code with your caregiver to link your accounts.
          </p>
        </div>
      </div>

      <div className="my-5 p-5 rounded-tactile-lg bg-nest-surface-subtle border-2 border-dashed border-terracotta-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-nest-ink-muted block">
            Your Connection Code
          </span>
          <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-nest-ink mt-1 select-all">
            {code}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="large"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-5 h-5 text-olive-600" /> : <Copy className="w-5 h-5" />}
          >
            {copied ? 'Copied' : 'Copy Code'}
          </Button>

          {onGenerateNew && (
            <Button
              variant="tertiary"
              size="large"
              onClick={onGenerateNew}
              isLoading={isLoading}
              title="Generate a fresh code"
              aria-label="Generate new connection code"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-3.5 rounded-tactile bg-amberwarm-50 border border-amberwarm-200 text-sm text-nest-ink flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amberwarm-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong className="block text-nest-ink font-semibold">Important privacy note:</strong>
          <span className="text-nest-ink-muted">
            Only share this code with someone you trust. Once connected, your caregiver will be able to see your medication routine and confirmations.
          </span>
        </div>
      </div>
    </Card>
  );
};
