/**
 * Clerk appearance configuration theo VN Speech Guardian branding
 * Tùy chỉnh theme, màu sắc, và layout cho tất cả Clerk components
 * Tích hợp với Tailwind CSS v4 + VN branding guidelines
 */

import type { Appearance } from '@clerk/types'

// VN Speech Guardian Design Tokens
const vnSpeechGuardianColors = {
  // Primary colors - theo copilot-instructions.md
  primary: '#3B82F6',      // Blue - primary actions  
  success: '#10B981',      // Green - safe content
  warning: '#F59E0B',      // Orange - medium alerts
  danger: '#EF4444',       // Red - harmful content
  
  // Neutral colors
  background: '#FAFAFA',   // Light gray background
  surface: '#FFFFFF',      // White cards
  dark: '#1F2937',         // Dark theme background
  
  // Text colors
  textPrimary: '#111827',  // Almost black
  textSecondary: '#6B7280', // Medium gray
  textMuted: '#9CA3AF',    // Light gray
  
  // Border colors
  border: '#E5E7EB',       // Light border
  borderHover: '#D1D5DB',  // Darker border on hover
} as const

// Typography scale
const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px  
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

// Spacing scale
const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.25rem',   // 20px
  xl: '1.5rem',    // 24px
  '2xl': '2rem',   // 32px
  '3xl': '3rem',   // 48px
} as const

/**
 * Base appearance configuration cho tất cả Clerk components
 * Sử dụng trong ClerkProvider để apply cho toàn app
 */
export const clerkAppearance: Appearance = {
  // CSS Layer name cho Tailwind v4 compatibility
  cssLayerName: 'clerk',
  
  // Base theme variables
  variables: {
    // Color scheme
    colorPrimary: vnSpeechGuardianColors.primary,
    colorSuccess: vnSpeechGuardianColors.success,
    colorWarning: vnSpeechGuardianColors.warning,
    colorDanger: vnSpeechGuardianColors.danger,
    colorBackground: vnSpeechGuardianColors.background,
    colorInputBackground: vnSpeechGuardianColors.surface,
    colorInputText: vnSpeechGuardianColors.textPrimary,
    
    // Text colors
    colorText: vnSpeechGuardianColors.textPrimary,
    colorTextSecondary: vnSpeechGuardianColors.textSecondary,
    colorTextOnPrimaryBackground: vnSpeechGuardianColors.surface,
    
    // Border colors
    colorBorder: vnSpeechGuardianColors.border,
    // colorBorderFocus: vnSpeechGuardianColors.primary, // Property doesn't exist in Variables type
    
    // Typography
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize.base,
    // fontWeight: 400, // Temporarily commented due to FontWeightScale type compatibility
    
    // Border radius - modern rounded corners
    borderRadius: '0.375rem', // 6px - subtle rounded
    
    // Spacing
    spacingUnit: '1rem',
  },
  
  // Layout configuration
  layout: {
    // Logo customization
    logoImageUrl: '/logo-vn-speech-guardian.svg', // TODO: Create logo
    logoPlacement: 'inside',
    
    // Form layout
    showOptionalFields: true,
    
    // Social buttons
    socialButtonsPlacement: 'bottom',
    socialButtonsVariant: 'blockButton',
    
    // Footer links
    termsPageUrl: '/terms',
    privacyPageUrl: '/privacy',
    helpPageUrl: '/help',
  },
  
  // Element-specific styling
  elements: {
    // Root container
    rootBox: {
      backgroundColor: vnSpeechGuardianColors.background,
    },
    
    // Card/modal containers
    card: {
      backgroundColor: vnSpeechGuardianColors.surface,
      borderColor: vnSpeechGuardianColors.border,
      borderRadius: '0.75rem', // 12px - more pronounced for cards
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    
    // Header
    headerTitle: {
      color: vnSpeechGuardianColors.textPrimary,
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
    },
    
    headerSubtitle: {
      color: vnSpeechGuardianColors.textSecondary,
      fontSize: typography.fontSize.base,
    },
    
    // Form elements
    formFieldLabel: {
      color: vnSpeechGuardianColors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
    },
    
    formFieldInput: {
      backgroundColor: vnSpeechGuardianColors.surface,
      borderColor: vnSpeechGuardianColors.border,
      color: vnSpeechGuardianColors.textPrimary,
      '&:focus': {
        borderColor: vnSpeechGuardianColors.primary,
        boxShadow: `0 0 0 3px ${vnSpeechGuardianColors.primary}20`, // 20% opacity ring
      },
      '&:hover': {
        borderColor: vnSpeechGuardianColors.borderHover,
      },
    },
    
    formFieldError: {
      color: vnSpeechGuardianColors.danger,
      fontSize: typography.fontSize.sm,
    },
    
    // Primary button - main CTA
    formButtonPrimary: {
      backgroundColor: vnSpeechGuardianColors.primary,
      color: vnSpeechGuardianColors.surface,
      fontWeight: typography.fontWeight.semibold,
      fontSize: typography.fontSize.base,
      borderRadius: '0.375rem',
      padding: `${spacing.md} ${spacing.xl}`,
      border: 'none',
      '&:hover': {
        backgroundColor: '#2563EB', // Darker blue
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
      },
      '&:active': {
        transform: 'translateY(0)',
      },
      '&:disabled': {
        backgroundColor: vnSpeechGuardianColors.textMuted,
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none',
      },
    },
    
    // Secondary button
    formButtonSecondary: {
      backgroundColor: 'transparent',
      color: vnSpeechGuardianColors.primary,
      border: `1px solid ${vnSpeechGuardianColors.border}`,
      fontWeight: typography.fontWeight.medium,
      '&:hover': {
        backgroundColor: vnSpeechGuardianColors.primary + '10', // 10% opacity
        borderColor: vnSpeechGuardianColors.primary,
      },
    },
    
    // Social buttons
    socialButtonsBlockButton: {
      backgroundColor: vnSpeechGuardianColors.surface,
      border: `1px solid ${vnSpeechGuardianColors.border}`,
      '&:hover': {
        backgroundColor: vnSpeechGuardianColors.background,
        borderColor: vnSpeechGuardianColors.borderHover,
      },
    },
    
    // Divider
    dividerLine: {
      backgroundColor: vnSpeechGuardianColors.border,
    },
    
    dividerText: {
      color: vnSpeechGuardianColors.textSecondary,
      fontSize: typography.fontSize.sm,
    },
    
    // Footer
    footerActionText: {
      color: vnSpeechGuardianColors.textSecondary,
      fontSize: typography.fontSize.sm,
    },
    
    footerActionLink: {
      color: vnSpeechGuardianColors.primary,
      fontWeight: typography.fontWeight.medium,
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
    
    // User button (profile dropdown)
    userButtonAvatarBox: {
      borderColor: vnSpeechGuardianColors.border,
      '&:hover': {
        borderColor: vnSpeechGuardianColors.primary,
      },
    },
    
    userButtonPopoverCard: {
      backgroundColor: vnSpeechGuardianColors.surface,
      borderColor: vnSpeechGuardianColors.border,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    
    // Alert messages
    alert: {
      backgroundColor: vnSpeechGuardianColors.background,
      borderColor: vnSpeechGuardianColors.border,
      borderRadius: '0.5rem',
    },
    
    alertText: {
      color: vnSpeechGuardianColors.textPrimary,
      fontSize: typography.fontSize.sm,
    },
    
    // Loading states
    spinner: {
      color: vnSpeechGuardianColors.primary,
      width: '1.25rem',
      height: '1.25rem',
    },
  },
}

/**
 * Dark theme variant cho night mode
 * Có thể sử dụng trong tương lai khi implement dark mode
 */
export const clerkAppearanceDark: Appearance = {
  ...clerkAppearance,
  variables: {
    ...clerkAppearance.variables,
    colorBackground: vnSpeechGuardianColors.dark,
    colorInputBackground: '#374151', // Gray-700  
    colorText: vnSpeechGuardianColors.surface,
    colorTextSecondary: '#D1D5DB', // Gray-300
    colorBorder: '#4B5563', // Gray-600
  },
  elements: {
    ...clerkAppearance.elements,
    rootBox: {
      backgroundColor: vnSpeechGuardianColors.dark,
    },
    card: {
      backgroundColor: '#374151', // Gray-700
      borderColor: '#4B5563', // Gray-600
    },
  },
}

/**
 * Utility function để get appearance theo theme mode
 */
export const getClerkAppearance = (isDark: boolean = false): Appearance => {
  return isDark ? clerkAppearanceDark : clerkAppearance
}

/**
 * Custom appearance cho specific components
 */
export const signInAppearance: Appearance = {
  ...clerkAppearance,
  layout: {
    ...clerkAppearance.layout,
    socialButtonsPlacement: 'top', // Social buttons trên top cho sign in
  },
}

export const signUpAppearance: Appearance = {
  ...clerkAppearance,
  layout: {
    ...clerkAppearance.layout,
    showOptionalFields: false, // Ít fields hơn cho sign up experience
  },
}