# Contributing to VaultPilot Frontend Components

We welcome contributions to the VaultPilot Frontend Components package! This document provides guidelines for contributing.

## 🤝 How to Contribute

### Reporting Issues
- Use the GitHub issue tracker
- Provide detailed bug reports with reproduction steps
- Include environment information (OS, browser, Obsidian version)
- Add screenshots or recordings if applicable

### Suggesting Features
- Open a GitHub issue with the "enhancement" label
- Describe the feature and its use case
- Explain how it fits with existing components
- Consider providing mockups or examples

### Code Contributions
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests if applicable
5. Ensure code follows our style guidelines
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting and conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Component Development
- Follow the existing component architecture patterns
- Ensure components are reusable and configurable
- Add proper error handling and fallbacks
- Include accessibility features (ARIA labels, keyboard navigation)
- Test with both light and dark themes

### CSS Guidelines
- Use CSS custom properties for theming
- Follow BEM naming convention for CSS classes
- Ensure responsive design for all screen sizes
- Test with Obsidian's theme system
- Minimize CSS specificity conflicts

### TypeScript Guidelines
- Use strict TypeScript settings
- Define proper interfaces for all data structures
- Avoid `any` types where possible
- Use union types for better type safety
- Export types that might be useful for consumers

## 🧪 Testing

### Manual Testing
- Test components in different Obsidian themes
- Verify responsive behavior on various screen sizes
- Test keyboard navigation and accessibility
- Verify integration with backend APIs
- Test error scenarios and edge cases

### Automated Testing
- Write unit tests for utility functions
- Add integration tests for complex components
- Ensure tests pass before submitting PR
- Maintain test coverage for new features

## 📚 Documentation

### Code Documentation
- Add JSDoc comments to all public methods
- Document component props and their types
- Include usage examples in comments
- Keep documentation up to date with code changes

### User Documentation
- Update README.md for new features
- Add examples to the examples/ directory
- Update integration guides as needed
- Include screenshots for UI changes

## 🔄 Pull Request Process

### Before Submitting
- Ensure your code follows the style guidelines
- Test your changes thoroughly
- Update documentation as needed
- Add changelog entry for significant changes

### PR Description
- Clearly describe what the PR does
- Link to related issues
- Include screenshots for UI changes
- List breaking changes if any
- Add testing instructions

### Review Process
- Maintainers will review your PR
- Address feedback promptly
- Keep PR scope focused and manageable
- Be open to suggestions and changes

## 🏗️ Component Architecture

### File Structure
```
components/
├── ComponentName.ts          # Main component implementation
├── ComponentName.types.ts    # Component-specific types
└── ComponentName.test.ts     # Component tests
```

### Component Template
```typescript
import { Modal, App } from 'obsidian';
import type VaultPilotPlugin from '../main';

export interface ComponentNameProps {
  // Define props interface
}

export class ComponentName extends Modal {
  private plugin: VaultPilotPlugin;
  
  constructor(app: App, plugin: VaultPilotPlugin, props: ComponentNameProps) {
    super(app);
    this.plugin = plugin;
  }
  
  async onOpen() {
    // Component implementation
  }
  
  onClose() {
    // Cleanup
  }
}
```

## 🎨 Design Guidelines

### Visual Design
- Follow Obsidian's design language
- Use consistent spacing and typography
- Maintain visual hierarchy
- Ensure good contrast ratios
- Support both light and dark themes

### User Experience
- Keep interactions intuitive
- Provide immediate feedback
- Use progressive disclosure
- Minimize cognitive load
- Test with real users

### Accessibility
- Include ARIA labels and descriptions
- Support keyboard navigation
- Ensure good color contrast
- Test with screen readers
- Follow WCAG 2.1 guidelines

## 🐛 Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to docs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `wontfix` - This will not be worked on

## 📞 Getting Help

### Development Questions
- Check existing documentation first
- Search closed issues for similar problems
- Ask questions in GitHub Discussions
- Join our Discord community (if available)

### Feature Discussions
- Open a GitHub issue for feature requests
- Participate in existing discussions
- Share your use cases and requirements
- Consider prototyping ideas

## 🙏 Recognition

Contributors will be recognized in:
- CHANGELOG.md for their contributions
- README.md contributors section
- Release notes for significant contributions

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.
