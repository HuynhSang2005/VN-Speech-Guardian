import type { Config } from 'tailwindcss'

// TailwindCSS 4 configuration với design tokens cho VN Speech Guardian
// Theo frontend.instructions.md design system
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Include components từ packages nếu có
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  
  theme: {
    // Custom font family cho Vietnamese text
    fontFamily: {
      sans: [
        'Inter', 
        '-apple-system', 
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'system-ui',
        'sans-serif'
      ],
      mono: [
        '"Fira Code"',
        '"JetBrains Mono"',
        'Consolas',
        'monospace'
      ],
    },

    extend: {
      // Semantic color system theo frontend.instructions.md
      colors: {
        // Primary colors cho speech processing UI
        primary: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Main primary
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        },
        
        // Success colors cho safe content detection
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',  // Main success
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22'
        },
        
        // Warning colors cho medium severity alerts
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a', 
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Main warning
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03'
        },
        
        // Danger colors cho harmful content detection
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Main danger
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a'
        },

        // Gray scale với proper contrast
        gray: {
          50: '#fafafa',   // Light background
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a'
        },

        // Dark theme colors
        dark: {
          50: '#374151',
          100: '#1f2937',  // Main dark background
          200: '#111827',  // Dark surface
          300: '#0f172a',
          400: '#0c0a09'
        },

        // Audio visualizer specific colors
        audio: {
          active: '#10b981',    // Green when recording
          inactive: '#6b7280',  // Gray when idle
          danger: '#ef4444',    // Red for harmful content
          processing: '#3b82f6' // Blue when processing
        },
      },

      // Typography scale theo design system
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px - tiny labels
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px - small text  
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px - body text
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px - subheadings
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px - headings
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px - page titles
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px - hero text
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px - display
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px - large display
      },

      // Spacing system (8px base)
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
        '144': '36rem',   // 576px
      },

      // Border radius system
      borderRadius: {
        'sm': '0.25rem',   // 4px
        'md': '0.375rem',  // 6px
        'lg': '0.5rem',    // 8px
        'xl': '0.75rem',   // 12px
        '2xl': '1rem',     // 16px
        '3xl': '1.5rem',   // 24px
      },

      // Box shadow system
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'audio': '0 0 20px rgba(59, 130, 246, 0.3)', // Blue glow cho audio visualizer
      },

      // Animation timing functions
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
      },
      
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // Keyframes cho audio visualizer
      keyframes: {
        'audio-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.05)', opacity: '1' }
        },
        'breathing': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' }
        },
        'detection-alert': {
          '0%': { transform: 'translateX(0) scale(1)' },
          '25%': { transform: 'translateX(-5px) scale(1.02)' },
          '75%': { transform: 'translateX(5px) scale(1.02)' },
          '100%': { transform: 'translateX(0) scale(1)' }
        }
      },

      animation: {
        'audio-pulse': 'audio-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathing': 'breathing 3s ease-in-out infinite',
        'detection-alert': 'detection-alert 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },

      // Grid system cho dashboard layouts  
      gridTemplateColumns: {
        'auto-fit': 'repeat(auto-fit, minmax(250px, 1fr))',
        'auto-fill': 'repeat(auto-fill, minmax(200px, 1fr))',
      },

      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  
  plugins: [
    // Forms plugin cho better form styling
    require('@tailwindcss/forms')({
      strategy: 'base', // Only add basic form styles
    }),
    
    // Typography plugin cho rich text content
    require('@tailwindcss/typography')({
      className: 'prose',
    }),

    // Custom plugin cho audio-specific utilities
    function({ addUtilities, theme }) {
      const audioUtilities = {
        '.audio-visualizer': {
          background: `linear-gradient(135deg, ${theme('colors.primary.500')}, ${theme('colors.primary.700')})`,
          borderRadius: theme('borderRadius.full'),
          boxShadow: theme('boxShadow.audio'),
        },
        
        '.detection-safe': {
          backgroundColor: theme('colors.success.100'),
          borderColor: theme('colors.success.300'),
          color: theme('colors.success.800'),
        },
        
        '.detection-warning': {
          backgroundColor: theme('colors.warning.100'),
          borderColor: theme('colors.warning.300'), 
          color: theme('colors.warning.800'),
        },
        
        '.detection-danger': {
          backgroundColor: theme('colors.danger.100'),
          borderColor: theme('colors.danger.300'),
          color: theme('colors.danger.800'),
        }
      }
      
      addUtilities(audioUtilities)
    }
  ],

  // Dark mode configuration
  darkMode: 'class',
  
  // Responsive breakpoints
  screens: {
    'sm': '640px',
    'md': '768px', 
    'lg': '1024px',
    'xl': '1280px',
    '2xl': '1536px',
  },
} satisfies Config