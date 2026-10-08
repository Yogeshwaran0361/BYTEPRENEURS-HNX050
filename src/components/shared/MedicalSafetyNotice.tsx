import React from 'react';
import { Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const MedicalSafetyNotice: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { language } = useLanguage();
  const isTamil = language === 'ta';

  if (compact) {
    return (
      <div className="text-xs text-nest-ink-muted flex items-center gap-1.5 py-1">
        <Shield className="w-3.5 h-3.5 text-nest-ink-faint shrink-0" aria-hidden="true" />
        <span>
          {isTamil
            ? 'நெஸ்ட்கேர் வழக்கமான கண்காணிப்பு மற்றும் பராமரிப்பாளர் தகவல்தொடர்புக்கு உதவுகிறது. எப்போதும் மருத்துவர் அல்லது மருந்தாளுநரின் வழிமுறைகளைப் பின்பற்றவும்.'
            : 'NESTCARE assists with routine tracking and caregiver communication. Always follow instructions from your doctor or pharmacist.'}
        </span>
      </div>
    );
  }

  return (
    <aside
      role="note"
      aria-label="Medical safety notice"
      className="rounded-tactile border border-nest-border bg-nest-surface-subtle p-4 my-6 text-sm text-nest-ink-muted flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-nest-surface flex items-center justify-center shrink-0 text-nest-ink-muted border border-nest-border mt-0.5">
        <Shield className="w-4 h-4" aria-hidden="true" />
      </div>
      <div>
        <h4 className="font-bold text-nest-ink text-sm">
          {isTamil ? 'மருத்துவ பாதுகாப்பு எல்லை' : 'Medical Safety Boundary'}
        </h4>
        <p className="mt-0.5 leading-relaxed">
          {isTamil
            ? 'நெஸ்ட்கேர் என்பது அன்றாட மருந்து ஒழுங்குமுறை மற்றும் பராமரிப்பாளர் தகவல்தொடர்புக்கான ஒரு கருவி மட்டுமே. இது மருத்துவ நோயறிதல்களை வழங்குவதில்லை அல்லது மருத்துவ ஆலோசனைகளுக்கு மாற்றாக அமையாது. மருந்துகள் மற்றும் அறிகுறிகள் பற்றிய சந்தேகங்களுக்கு உங்கள் மருத்துவரை நேரடியாக அணுகவும்.'
            : 'NESTCARE is a routine organization and caregiver communication aid. It does not provide medical diagnoses, alter dosages, or replace professional clinical consultations. For any questions regarding symptoms, changes in medication, or clinical advice, contact your licensed physician or pharmacist directly.'}
        </p>
      </div>
    </aside>
  );
};
