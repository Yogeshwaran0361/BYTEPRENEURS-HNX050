import React from 'react';
import { Link } from 'react-router-dom';

export interface LogoProps {
  size?: 'default' | 'large';
  to?: string;
  subtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'default', to = '/', subtitle = false }) => {
  const iconSize = size === 'large' ? 'w-10 h-10' : 'w-8 h-8';
  const textClass = size === 'large' ? 'text-2xl font-bold tracking-tight' : 'text-xl font-bold tracking-tight';

  const content = (
    <div className="inline-flex items-center gap-2.5 group select-none">
      <div
        className={`${iconSize} rounded-tactile bg-terracotta-500 text-white flex items-center justify-center shadow-tactile-sm transition-transform group-hover:scale-102`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9a9 9 0 0 0-9-9z" />
          <path d="M8 12c1.5-2 6.5-2 8 0" />
          <path d="M9 15c1 1.5 5 1.5 6 0" />
          <circle cx="12" cy="9.5" r="1.5" fill="currentColor" />
        </svg>
      </div>
      <div className="flex flex-col text-left">
        <span className={`text-nest-ink ${textClass}`}>
          NEST<span className="text-terracotta-500">CARE</span>
        </span>
        {subtitle && (
          <span className="text-xs text-nest-ink-muted -mt-0.5 tracking-normal">
            Calm Care Routine
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="focus-visible:outline-terracotta-500 rounded-md">
        {content}
      </Link>
    );
  }

  return content;
};
