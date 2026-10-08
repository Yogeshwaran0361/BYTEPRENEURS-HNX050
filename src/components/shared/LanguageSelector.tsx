import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../i18n/translations';

interface LanguageSelectorProps {
  variant?: 'header' | 'floating' | 'compact';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { language, setLanguage, languages, currentLanguageInfo, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'floating') {
    return (
      <div
        ref={dropdownRef}
        className="fixed floating-lang-pill right-4 lg:right-6 z-40 select-none print:hidden"
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title={language === 'en' ? 'Change language to Tamil / தமிழ்' : 'Change language to English'}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-nest-surface text-nest-ink font-bold shadow-tactile-lg border-2 border-olive-500 hover:border-olive-600 hover:bg-olive-50 active:scale-95 transition-all text-sm"
        >
          <Globe className="w-5 h-5 text-olive-700 animate-pulse" aria-hidden="true" />
          <span className="font-extrabold text-nest-ink">
            {language === 'en' ? 'EN / தமிழ்' : 'தமிழ் / EN'}
          </span>
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute bottom-14 right-0 w-48 bg-nest-surface border-2 border-nest-border rounded-tactile-lg shadow-tactile-xl p-1.5 space-y-1 mb-2 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 text-xs font-bold text-nest-ink-muted uppercase tracking-wider border-b border-nest-border">
              {t('common.language', 'Language')}
            </div>
            {languages.map(lang => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-tactile text-sm font-bold transition-colors ${
                    isSelected
                      ? 'bg-olive-100 text-olive-900 border border-olive-300'
                      : 'text-nest-ink hover:bg-nest-surface-subtle'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-olive-700" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative inline-block select-none ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Language / மொழியை மாற்றுக"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-tactile bg-nest-surface-subtle hover:bg-nest-surface text-nest-ink border border-nest-border hover:border-olive-400 font-bold text-xs sm:text-sm transition-all shadow-xs"
      >
        <Globe className="w-4 h-4 text-olive-700" aria-hidden="true" />
        <span className="tracking-wide">{currentLanguageInfo.nativeName}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 bg-nest-surface border-2 border-nest-border rounded-tactile-lg shadow-tactile-lg p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1 text-xs font-bold text-nest-ink-muted uppercase tracking-wider border-b border-nest-border">
            {t('common.language', 'Language')}
          </div>
          {languages.map(lang => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                role="menuitem"
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-tactile text-sm font-bold transition-colors ${
                  isSelected
                    ? 'bg-olive-100 text-olive-900 border border-olive-300'
                    : 'text-nest-ink hover:bg-nest-surface-subtle'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </span>
                {isSelected && <Check className="w-4 h-4 text-olive-700" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
