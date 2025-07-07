/**
 * VaultPilot Design System - Main Export
 * 
 * Central export point for the complete design system including tokens,
 * components, and workspace architecture.
 */

// Design Tokens
export * from './tokens';

// Core Components
export * from './components/core/Button';

// Workspace Architecture
export * from '../workspace/WorkspaceManager';

// Design System Utilities
export interface DesignSystemConfig {
  enableWorkspace: boolean;
  themeMode: 'auto' | 'light' | 'dark';
  accessibility: {
    enableHighContrast: boolean;
    enableReducedMotion: boolean;
    enableScreenReader: boolean;
  };
  performance: {
    enableVirtualization: boolean;
    enableCodeSplitting: boolean;
    enableOptimizations: boolean;
  };
}

export const defaultDesignSystemConfig: DesignSystemConfig = {
  enableWorkspace: true,
  themeMode: 'auto',
  accessibility: {
    enableHighContrast: false,
    enableReducedMotion: false,
    enableScreenReader: true
  },
  performance: {
    enableVirtualization: true,
    enableCodeSplitting: true,
    enableOptimizations: true
  }
};

/**
 * Initialize the complete VaultPilot design system
 */
export function initializeDesignSystem(config: Partial<DesignSystemConfig> = {}): void {
  const finalConfig = { ...defaultDesignSystemConfig, ...config };
  
  // Apply design tokens
  // Note: CSS is loaded via the main plugin's loadWorkspaceStyles method
  console.log('VaultPilot Design System initialized with config:', finalConfig);
  
  // Apply accessibility preferences
  if (finalConfig.accessibility.enableHighContrast) {
    document.documentElement.classList.add('vp-high-contrast');
  }
  
  if (finalConfig.accessibility.enableReducedMotion) {
    document.documentElement.classList.add('vp-reduced-motion');
  }
  
  // Apply theme mode
  if (finalConfig.themeMode !== 'auto') {
    document.documentElement.classList.add(`vp-theme-${finalConfig.themeMode}`);
  }
  
  console.log('VaultPilot Design System initialized with config:', finalConfig);
}

/**
 * Clean up design system resources
 */
export function cleanupDesignSystem(): void {
  const styleElement = document.getElementById('vaultpilot-design-system');
  if (styleElement) {
    styleElement.remove();
  }
  
  // Remove design system classes
  document.documentElement.classList.remove(
    'vp-high-contrast',
    'vp-reduced-motion',
    'vp-theme-light',
    'vp-theme-dark'
  );
}

// Re-export for convenience
export { designTokens, getCompleteCSS } from './tokens';
export { VPButton, createButton, ButtonPresets } from './components/core/Button';
export { WorkspaceManager } from '../workspace/WorkspaceManager';