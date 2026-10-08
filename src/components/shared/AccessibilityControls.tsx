import React, { useState, useEffect } from 'react';
import { Type } from 'lucide-react';

export const AccessibilityControls: React.FC = () => {
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('nestcare_text_size') as 'normal' | 'large' | 'xlarge') || 'normal';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (textSize === 'large') {
      root.style.fontSize = '112%';
    } else if (textSize === 'xlarge') {
      root.style.fontSize = '125%';
    } else {
      root.style.fontSize = '100%';
    }
    localStorage.setItem('nestcare_text_size', textSize);
  }, [textSize]);

  return (
    <div className="inline-flex items-center gap-1 bg-nest-surface-subtle p-1 rounded-tactile border border-nest-border text-sm">
      <span className="sr-only">Adjust text size</span>
      <Type className="w-4 h-4 text-nest-ink-muted ml-1.5 mr-0.5" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setTextSize('normal')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          textSize === 'normal'
            ? 'bg-nest-surface text-nest-ink shadow-tactile-sm font-bold'
            : 'text-nest-ink-muted hover:text-nest-ink'
        }`}
        aria-pressed={textSize === 'normal'}
      >
        A
      </button>
      <button
        type="button"
        onClick={() => setTextSize('large')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          textSize === 'large'
            ? 'bg-nest-surface text-nest-ink shadow-tactile-sm font-bold'
            : 'text-nest-ink-muted hover:text-nest-ink'
        }`}
        aria-pressed={textSize === 'large'}
      >
        A+
      </button>
      <button
        type="button"
        onClick={() => setTextSize('xlarge')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          textSize === 'xlarge'
            ? 'bg-nest-surface text-nest-ink shadow-tactile-sm font-bold'
            : 'text-nest-ink-muted hover:text-nest-ink'
        }`}
        aria-pressed={textSize === 'xlarge'}
      >
        A++
      </button>
    </div>
  );
};
