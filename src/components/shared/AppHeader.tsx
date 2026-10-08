import React from 'react';
import { Logo } from './Logo';
import { AccessibilityControls } from './AccessibilityControls';
import { LanguageSelector } from './LanguageSelector';

export const AppHeader: React.FC = () => {
  return (
    <header className="bg-nest-surface border-b border-nest-border sticky top-0 z-40 shadow-tactile-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo size="large" subtitle />
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          <LanguageSelector variant="header" />
          <AccessibilityControls />
        </div>
      </div>
    </header>
  );
};
