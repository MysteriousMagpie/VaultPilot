/**
 * VaultPilot Button Component
 * 
 * Accessible, themeable button component that integrates with the design system
 * and provides consistent interaction patterns across the workspace.
 */

import { Component, setIcon } from 'obsidian';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  children?: string;
  fullWidth?: boolean;
}

export class VPButton extends Component {
  private props: ButtonProps;
  private element: HTMLButtonElement;
  private iconElement?: HTMLElement;
  private textElement?: HTMLElement;
  private loadingElement?: HTMLElement;

  constructor(containerEl: HTMLElement, props: ButtonProps) {
    super();
    this.props = { ...this.getDefaultProps(), ...props };
    this.element = this.createElement(containerEl);
    this.setupEventListeners();
    this.applyStyles();
  }

  private getDefaultProps(): Partial<ButtonProps> {
    return {
      variant: 'primary',
      size: 'md',
      disabled: false,
      loading: false,
      iconPosition: 'left',
      fullWidth: false
    };
  }

  private createElement(containerEl: HTMLElement): HTMLButtonElement {
    const button = containerEl.createEl('button', {
      cls: this.getButtonClasses(),
      attr: {
        type: 'button',
        ...(this.props.ariaLabel && { 'aria-label': this.props.ariaLabel }),
        ...(this.props.ariaDescribedBy && { 'aria-describedby': this.props.ariaDescribedBy }),
        ...(this.props.disabled || this.props.loading ? { 'disabled': 'true' } : {}),
        ...(this.props.variant && { 'data-variant': this.props.variant }),
        ...(this.props.size && { 'data-size': this.props.size }),
        'data-loading': this.props.loading ? 'true' : 'false'
      }
    });

    this.createButtonContent(button);
    return button;
  }

  private createButtonContent(button: HTMLButtonElement): void {
    // Create loading indicator (hidden by default)
    this.loadingElement = button.createEl('span', {
      cls: 'vp-button-loading',
      attr: { 'aria-hidden': 'true' }
    });

    // Create content container
    const contentContainer = button.createEl('span', {
      cls: 'vp-button-content'
    });

    // Add icon (left side)
    if (this.props.icon && this.props.iconPosition === 'left') {
      this.iconElement = contentContainer.createEl('span', {
        cls: 'vp-button-icon vp-button-icon-left',
        attr: { 'aria-hidden': 'true' }
      });
      setIcon(this.iconElement, this.props.icon);
    }

    // Add text content
    if (this.props.children) {
      this.textElement = contentContainer.createEl('span', {
        cls: 'vp-button-text',
        text: this.props.children
      });
    }

    // Add icon (right side)
    if (this.props.icon && this.props.iconPosition === 'right') {
      this.iconElement = contentContainer.createEl('span', {
        cls: 'vp-button-icon vp-button-icon-right',
        attr: { 'aria-hidden': 'true' }
      });
      setIcon(this.iconElement, this.props.icon);
    }
  }

  private getButtonClasses(): string {
    const classes = [
      'vp-button',
      `vp-button-${this.props.variant}`,
      `vp-button-${this.props.size}`
    ];

    if (this.props.disabled) classes.push('vp-button-disabled');
    if (this.props.loading) classes.push('vp-button-loading');
    if (this.props.fullWidth) classes.push('vp-button-full-width');
    if (this.props.icon && !this.props.children) classes.push('vp-button-icon-only');
    if (this.props.className) classes.push(this.props.className);

    return classes.join(' ');
  }

  private setupEventListeners(): void {
    // Click handler
    this.element.addEventListener('click', (event: MouseEvent) => {
      if (this.props.disabled || this.props.loading) {
        event.preventDefault();
        return;
      }
      
      // Add click animation
      this.element.addClass('vp-button-clicked');
      setTimeout(() => this.element.removeClass('vp-button-clicked'), 150);
      
      this.props.onClick?.(event);
    });

    // Keyboard handler
    this.element.addEventListener('keydown', (event: KeyboardEvent) => {
      if (this.props.disabled || this.props.loading) {
        event.preventDefault();
        return;
      }

      // Handle Enter and Space key presses
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.element.click();
      }

      this.props.onKeyDown?.(event);
    });

    // Focus handlers for accessibility
    this.element.addEventListener('focus', () => {
      this.element.addClass('vp-button-focused');
    });

    this.element.addEventListener('blur', () => {
      this.element.removeClass('vp-button-focused');
    });

    // Mouse interaction handlers
    this.element.addEventListener('mouseenter', () => {
      if (!this.props.disabled && !this.props.loading) {
        this.element.addClass('vp-button-hovered');
      }
    });

    this.element.addEventListener('mouseleave', () => {
      this.element.removeClass('vp-button-hovered');
    });

    this.element.addEventListener('mousedown', () => {
      if (!this.props.disabled && !this.props.loading) {
        this.element.addClass('vp-button-pressed');
      }
    });

    this.element.addEventListener('mouseup', () => {
      this.element.removeClass('vp-button-pressed');
    });
  }

  private applyStyles(): void {
    // Styles are primarily handled through CSS classes
    // This method can be used for dynamic style applications
    
    if (this.props.fullWidth) {
      this.element.style.width = '100%';
    }
  }

  // Public API methods
  public updateProps(newProps: Partial<ButtonProps>): void {
    const oldProps = { ...this.props };
    this.props = { ...this.props, ...newProps };

    // Update classes
    this.element.className = this.getButtonClasses();

    // Update attributes
    if (newProps.disabled !== undefined) {
      this.element.toggleAttribute('disabled', this.props.disabled);
    }

    if (newProps.loading !== undefined) {
      this.element.setAttribute('data-loading', this.props.loading ? 'true' : 'false');
      this.element.toggleAttribute('disabled', this.props.disabled || this.props.loading);
    }

    if (newProps.ariaLabel !== undefined) {
      if (this.props.ariaLabel) {
        this.element.setAttribute('aria-label', this.props.ariaLabel);
      } else {
        this.element.removeAttribute('aria-label');
      }
    }

    if (newProps.ariaDescribedBy !== undefined) {
      if (this.props.ariaDescribedBy) {
        this.element.setAttribute('aria-describedby', this.props.ariaDescribedBy);
      } else {
        this.element.removeAttribute('aria-describedby');
      }
    }

    // Update content if changed
    if (newProps.children !== oldProps.children && this.textElement) {
      this.textElement.textContent = this.props.children || '';
    }

    // Update icon if changed
    if (newProps.icon !== oldProps.icon) {
      if (this.iconElement) {
        this.iconElement.empty();
        if (this.props.icon) {
          setIcon(this.iconElement, this.props.icon);
        }
      } else if (this.props.icon) {
        // Create icon element if it didn't exist before
        this.recreateContent();
      }
    }

    // Apply styles
    this.applyStyles();
  }

  private recreateContent(): void {
    // Clear existing content
    this.element.empty();
    
    // Recreate content with new props
    this.createButtonContent(this.element);
  }

  public setLoading(loading: boolean): void {
    this.updateProps({ loading });
  }

  public setDisabled(disabled: boolean): void {
    this.updateProps({ disabled });
  }

  public setText(text: string): void {
    this.updateProps({ children: text });
  }

  public setIcon(icon: string): void {
    this.updateProps({ icon });
  }

  public focus(): void {
    this.element.focus();
  }

  public blur(): void {
    this.element.blur();
  }

  public click(): void {
    this.element.click();
  }

  public getElement(): HTMLButtonElement {
    return this.element;
  }

  public getProps(): Readonly<ButtonProps> {
    return { ...this.props };
  }

  // Component lifecycle
  onunload(): void {
    // Remove event listeners (handled automatically by DOM removal)
    // Clean up any timers or intervals if needed
    super.onunload();
  }
}

// Utility function for creating buttons quickly
export function createButton(
  containerEl: HTMLElement,
  props: ButtonProps
): VPButton {
  return new VPButton(containerEl, props);
}

// Predefined button configurations
export const ButtonPresets = {
  primary: (text: string, onClick: () => void): ButtonProps => ({
    variant: 'primary',
    children: text,
    onClick
  }),

  secondary: (text: string, onClick: () => void): ButtonProps => ({
    variant: 'secondary',
    children: text,
    onClick
  }),

  danger: (text: string, onClick: () => void): ButtonProps => ({
    variant: 'danger',
    children: text,
    onClick
  }),

  iconOnly: (icon: string, ariaLabel: string, onClick: () => void): ButtonProps => ({
    variant: 'secondary',
    size: 'md',
    icon,
    ariaLabel,
    onClick
  }),

  loading: (text: string): ButtonProps => ({
    variant: 'primary',
    children: text,
    loading: true,
    disabled: true
  })
} as const;