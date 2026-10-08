/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        atkinson: ['"Atkinson Hyperlegible"', 'sans-serif'],
      },
      colors: {
        // Base surfaces: Warm ivory / soft off-white
        nest: {
          bg: '#FAF8F5',         // Warm ivory main background
          surface: '#FFFFFF',    // Clean card surface
          'surface-subtle': '#F4EFEA', // Slightly darker warm surface
          'surface-warm': '#ECE5DC',   // Secondary tactile elements
          border: '#E3DDD4',     // Tactile quiet card border
          'border-strong': '#CFC6B8', // High-contrast border
          ink: '#1C2024',        // Deep charcoal primary text
          'ink-muted': '#5C636A', // Calm secondary text
          'ink-faint': '#8C949D', // Subtle text
        },
        // Primary accent: Muted terracotta / warm coral
        terracotta: {
          50: '#FDF5F2',
          100: '#FAE6DF',
          200: '#F5CEBF',
          300: '#EEAF98',
          400: '#E4886C',
          500: '#D45D3A', // Primary brand action
          600: '#BE4B2A', // Hover / emphasis
          700: '#9B391D',
          800: '#7F2F18',
          900: '#682715',
        },
        // Positive state: Muted olive / calm green
        olive: {
          50: '#F2F7F3',
          100: '#E2EEE5',
          200: '#C7DECE',
          300: '#A4CAAE',
          500: '#3D7953', // Calm positive status
          600: '#316343',
          700: '#264E34',
          800: '#1D3B27',
          900: '#152C1D',
        },
        // Attention state: Warm amber
        amberwarm: {
          50: '#FDF9F0',
          100: '#FAF0DA',
          200: '#F4DEB2',
          300: '#ECC783',
          500: '#C87B1D', // Calm attention
          600: '#A66314',
          700: '#834C0E',
        },
        // Serious alert: Restrained deep red
        crimson: {
          50: '#FDF3F3',
          100: '#FAE2E2',
          200: '#F4C5C5',
          300: '#E99B9B',
          500: '#B83A3A', // Restrained alert
          600: '#9C2C2C',
          700: '#7E2020',
        },
      },
      boxShadow: {
        // Restrained, soft tactile shadows
        'tactile-sm': '0 1px 2px 0 rgba(28, 32, 36, 0.04), 0 1px 3px 0 rgba(28, 32, 36, 0.03)',
        'tactile': '0 2px 6px -1px rgba(28, 32, 36, 0.06), 0 1px 4px -1px rgba(28, 32, 36, 0.03)',
        'tactile-md': '0 4px 12px -2px rgba(28, 32, 36, 0.08), 0 2px 6px -1px rgba(28, 32, 36, 0.04)',
        'tactile-lg': '0 10px 24px -4px rgba(28, 32, 36, 0.09), 0 4px 10px -2px rgba(28, 32, 36, 0.04)',
      },
      borderRadius: {
        'tactile': '10px',
        'tactile-lg': '14px',
        'tactile-xl': '18px',
      },
      fontSize: {
        'senior-body': ['1.1875rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }], // ~19px
        'senior-title': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '700' }], // 30px
        'senior-hero': ['2.375rem', { lineHeight: '1.25', letterSpacing: '-0.025em', fontWeight: '700' }], // 38px
        'senior-med': ['2rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }], // 32px
      },
      minHeight: {
        'touch': '52px',
        'touch-lg': '60px',
      },
      minWidth: {
        'touch': '52px',
        'touch-lg': '60px',
      }
    },
  },
  plugins: [],
}
