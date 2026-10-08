/**
 * NESTCARE Design System Tokens
 * "CALM TACTILE CARE"
 * 
 * Design Philosophy:
 * - Trustworthy, human, calm, warm, readable, modern, tactile
 * - Warm ivory/soft off-white surfaces, deep charcoal text, muted terracotta accent
 * - Muted olive positive status, warm amber attention, restrained crimson alert
 * - High accessibility: Atkinson Hyperlegible, minimum touch targets 48px/56px
 */

export const tokens = {
  fontFamily: {
    primary: '"Atkinson Hyperlegible", ui-sans-serif, system-ui, -apple-system, sans-serif',
  },

  colors: {
    // Base surfaces
    background: '#FAF8F5',       // Warm ivory base
    surface: '#FFFFFF',          // Clean card surface
    surfaceSubtle: '#F4EFEA',    // Tactile secondary surface
    surfaceWarm: '#ECE5DC',      // Active/toggled tactile surface
    
    // Borders
    border: '#E3DDD4',           // Subtle card border
    borderStrong: '#CFC6B8',     // High-contrast border
    
    // Text / Ink
    ink: '#1C2024',              // Deep charcoal primary
    inkMuted: '#5C636A',         // Secondary calm text
    inkFaint: '#8C949D',         // Helper/meta text
    
    // Accents & States
    primary: {
      light: '#FAE6DF',
      base: '#D45D3A',           // Muted terracotta
      hover: '#BE4B2A',
      dark: '#7F2F18',
    },
    positive: {
      light: '#E2EEE5',
      base: '#3D7953',           // Muted olive
      hover: '#316343',
      dark: '#264E34',
    },
    attention: {
      light: '#FAF0DA',
      base: '#C87B1D',           // Warm amber
      hover: '#A66314',
      dark: '#834C0E',
    },
    urgent: {
      light: '#FAE2E2',
      base: '#B83A3A',           // Restrained crimson
      hover: '#9C2C2C',
      dark: '#7E2020',
    },
  },

  // Senior Accessibility Touch & Sizing Standards
  sizing: {
    touchTargetMin: '48px',
    touchTargetSenior: '56px',
    touchTargetHero: '64px',
    borderRadius: '12px',
    borderRadiusLg: '16px',
  },

  // Elevation: Soft, tactile, physical notebook feeling without skeuomorphism
  shadows: {
    subtle: '0 1px 3px rgba(28, 32, 36, 0.05), 0 1px 2px rgba(28, 32, 36, 0.03)',
    card: '0 2px 8px -2px rgba(28, 32, 36, 0.06), 0 1px 4px -1px rgba(28, 32, 36, 0.04)',
    elevated: '0 8px 20px -4px rgba(28, 32, 36, 0.08), 0 3px 8px -2px rgba(28, 32, 36, 0.04)',
  },

  // Status definitions with visual + semantic text descriptors
  statuses: {
    UPCOMING: {
      label: 'Upcoming',
      badgeClass: 'bg-nest-surface-subtle text-nest-ink-muted border-nest-border',
      indicatorClass: 'bg-nest-ink-faint',
      icon: 'clock',
      description: 'Scheduled for later today',
    },
    DUE: {
      label: 'Due Now',
      badgeClass: 'bg-terracotta-50 text-terracotta-700 border-terracotta-200',
      indicatorClass: 'bg-terracotta-500',
      icon: 'bell',
      description: 'Ready to be taken now',
    },
    TAKEN: {
      label: 'Taken',
      badgeClass: 'bg-olive-50 text-olive-700 border-olive-200',
      indicatorClass: 'bg-olive-500',
      icon: 'check',
      description: 'Confirmed taken',
    },
    DELAYED: {
      label: 'Pending Confirmation',
      badgeClass: 'bg-amberwarm-50 text-amberwarm-700 border-amberwarm-200',
      indicatorClass: 'bg-amberwarm-500',
      icon: 'alert-triangle',
      description: 'Past scheduled time, waiting for confirmation',
    },
    MISSED: {
      label: 'Not Confirmed',
      badgeClass: 'bg-crimson-50 text-crimson-700 border-crimson-200',
      indicatorClass: 'bg-crimson-500',
      icon: 'alert-circle',
      description: 'Time window elapsed without confirmation',
    },
    ATTENTION_REQUIRED: {
      label: 'Attention Needed',
      badgeClass: 'bg-amberwarm-100 text-amberwarm-700 border-amberwarm-300',
      indicatorClass: 'bg-amberwarm-600',
      icon: 'shield-alert',
      description: 'Caregiver review requested',
    },
  },
} as const;

export type MedicationStatusKey = keyof typeof tokens.statuses;
