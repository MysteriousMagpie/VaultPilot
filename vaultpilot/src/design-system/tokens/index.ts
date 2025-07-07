/**
 * VaultPilot Design System - Design Tokens
 * 
 * Central design token system that integrates with Obsidian's theme system
 * while providing VaultPilot-specific tokens for AI-native interface elements.
 */

export interface ColorTokens {
  // Primary colors (inherit from Obsidian)
  primary: string;
  primaryHover: string;
  primarySoft: string;
  
  // AI-specific colors
  aiConfident: string;
  aiModerate: string;
  aiUncertain: string;
  aiProcessing: string;
  aiError: string;
  
  // Semantic colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  bgActive: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Border colors
  borderPrimary: string;
  borderSecondary: string;
  borderHover: string;
}

export interface SpacingTokens {
  // Base spacing scale (4px increments)
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  
  // Component-specific spacing
  componentPadding: string;
  componentMargin: string;
  panelGap: string;
  sectionGap: string;
}

export interface TypographyTokens {
  // Font families
  fontPrimary: string;
  fontMonospace: string;
  fontHeading: string;
  
  // Font sizes
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontSize2xl: string;
  fontSize3xl: string;
  
  // Line heights
  lineHeightTight: string;
  lineHeightNormal: string;
  lineHeightRelaxed: string;
  
  // Font weights
  fontWeightNormal: string;
  fontWeightMedium: string;
  fontWeightSemibold: string;
  fontWeightBold: string;
}

export interface BorderRadiusTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface ShadowTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface TransitionTokens {
  fast: string;
  normal: string;
  slow: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  bounce: string;
}

export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  borderRadius: BorderRadiusTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
}

// Design token implementation
export const designTokens: DesignTokens = {
  colors: {
    // Primary colors that integrate with Obsidian themes
    primary: 'var(--interactive-accent)',
    primaryHover: 'var(--interactive-accent-hover)',
    primarySoft: 'var(--interactive-accent-soft)',
    
    // AI-specific color palette
    aiConfident: '#22c55e',
    aiModerate: '#f59e0b',
    aiUncertain: '#f97316',
    aiProcessing: '#3b82f6',
    aiError: '#ef4444',
    
    // Semantic color system
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Background colors that adapt to Obsidian themes
    bgPrimary: 'var(--background-primary)',
    bgSecondary: 'var(--background-secondary)',
    bgTertiary: 'var(--background-modifier-border)',
    bgHover: 'var(--background-modifier-hover)',
    bgActive: 'var(--background-modifier-active)',
    
    // Text colors that adapt to themes
    textPrimary: 'var(--text-normal)',
    textSecondary: 'var(--text-muted)',
    textTertiary: 'var(--text-faint)',
    textInverse: 'var(--text-on-accent)',
    
    // Border colors
    borderPrimary: 'var(--background-modifier-border)',
    borderSecondary: 'var(--background-modifier-border-hover)',
    borderHover: 'var(--background-modifier-border-focus)'
  },
  
  spacing: {
    // 4px base spacing scale
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    
    // Component-specific spacing
    componentPadding: '16px',
    componentMargin: '16px',
    panelGap: '20px',
    sectionGap: '24px'
  },
  
  typography: {
    // Font families that integrate with Obsidian
    fontPrimary: 'var(--font-interface)',
    fontMonospace: 'var(--font-monospace)',
    fontHeading: 'var(--font-interface)',
    
    // Type scale
    fontSizeXs: '0.75rem',   // 12px
    fontSizeSm: '0.875rem',  // 14px
    fontSizeMd: '1rem',      // 16px
    fontSizeLg: '1.125rem',  // 18px
    fontSizeXl: '1.25rem',   // 20px
    fontSize2xl: '1.5rem',   // 24px
    fontSize3xl: '2rem',     // 32px
    
    // Line heights
    lineHeightTight: '1.2',
    lineHeightNormal: '1.4',
    lineHeightRelaxed: '1.6',
    
    // Font weights
    fontWeightNormal: '400',
    fontWeightMedium: '500',
    fontWeightSemibold: '600',
    fontWeightBold: '700'
  },
  
  borderRadius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '50%'
  },
  
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)'
  },
  
  transitions: {
    fast: '150ms ease-out',
    normal: '300ms ease-out',
    slow: '500ms ease-out',
    easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
    easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
};

// CSS Custom Properties Generator
export function generateCSSCustomProperties(): string {
  const tokens = designTokens;
  let css = ':root {\n';
  
  // Color tokens
  Object.entries(tokens.colors).forEach(([key, value]) => {
    const cssVar = `--vp-color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVar}: ${value};\n`;
  });
  
  // Spacing tokens
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    const cssVar = `--vp-space-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVar}: ${value};\n`;
  });
  
  // Typography tokens
  Object.entries(tokens.typography).forEach(([key, value]) => {
    const cssVar = `--vp-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVar}: ${value};\n`;
  });
  
  // Border radius tokens
  Object.entries(tokens.borderRadius).forEach(([key, value]) => {
    const cssVar = `--vp-radius-${key}`;
    css += `  ${cssVar}: ${value};\n`;
  });
  
  // Shadow tokens
  Object.entries(tokens.shadows).forEach(([key, value]) => {
    const cssVar = `--vp-shadow-${key}`;
    css += `  ${cssVar}: ${value};\n`;
  });
  
  // Transition tokens
  Object.entries(tokens.transitions).forEach(([key, value]) => {
    const cssVar = `--vp-transition-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    css += `  ${cssVar}: ${value};\n`;
  });
  
  css += '}\n';
  return css;
}

// Theme-specific adjustments
export function generateThemeAdjustments(): string {
  return `
/* Dark theme adjustments */
.theme-dark {
  --vp-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
  --vp-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --vp-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --vp-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
  --vp-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.4);
  --vp-shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.6);
}

/* Light theme adjustments */
.theme-light {
  --vp-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.03);
  --vp-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --vp-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.06);
  --vp-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.06);
  --vp-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.06);
  --vp-shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.12);
}

/* High contrast theme support */
@media (prefers-contrast: high) {
  :root {
    --vp-color-border-primary: #000000;
    --vp-color-text-primary: #000000;
  }
  
  .theme-dark {
    --vp-color-border-primary: #ffffff;
    --vp-color-text-primary: #ffffff;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  :root {
    --vp-transition-fast: 0ms;
    --vp-transition-normal: 0ms;
    --vp-transition-slow: 0ms;
  }
}
`;
}

// Export the complete CSS
export function getCompleteCSS(): string {
  return generateCSSCustomProperties() + generateThemeAdjustments();
}