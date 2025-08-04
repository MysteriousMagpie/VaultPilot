/**
 * VaultPilot Workflow Mode Component
 * 
 * Extracted from MainPanel.ts - Handles workflow generation and task management
 * with AI-powered planning and milestone tracking.
 */

import { Notice } from 'obsidian';
import { BaseModeComponent } from './BaseModeComponent';
import { createButton } from '../../../design-system/components/core/Button';
import type { 
  ModeAction, 
  ModeContext, 
  ContextSource 
} from '../types';

interface WorkflowData {
  plan: {
    title: string;
    description: string;
    estimated_duration: string;
    tasks: TaskData[];
  };
  milestones: MilestoneData[];
  timeline: string;
}

interface TaskData {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimated_time: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

interface MilestoneData {
  title: string;
  description: string;
  target_date: string;
  tasks: string[];
}

export class WorkflowModeComponent extends BaseModeComponent {
  private workflowContainer?: HTMLElement;
  private currentWorkflow?: WorkflowData;
  private goalInput?: HTMLTextAreaElement;
  private timeframeSelect?: HTMLSelectElement;

  constructor() {
    super('workflow');
  }

  protected async initialize(): Promise<void> {
    // Any one-time initialization logic
    this.currentWorkflow = undefined;
  }

  protected async renderContent(): Promise<void> {
    // Create workflow interface
    this.workflowContainer = this.container.createEl('div', { cls: 'vp-workflow-interface' });
    
    // Render workflow components
    this.renderWorkflowHeader();
    this.renderCreationArea();
    this.renderWorkflowDisplay();
  }

  protected getModeActions(): ModeAction[] {
    return [
      {
        id: 'export-workflow',
        label: 'Export Workflow',
        icon: 'download',
        callback: () => this.exportWorkflow(),
        enabled: !!this.currentWorkflow
      },
      {
        id: 'save-workflow',
        label: 'Save Workflow',
        icon: 'save',
        callback: () => this.saveWorkflow(),
        enabled: !!this.currentWorkflow
      },
      {
        id: 'clear-workflow',
        label: 'Clear Workflow',
        icon: 'trash-2',
        callback: () => this.clearWorkflow(),
        enabled: !!this.currentWorkflow
      },
      {
        id: 'duplicate-workflow',
        label: 'Duplicate Workflow',
        icon: 'copy',
        callback: () => this.duplicateWorkflow(),
        enabled: !!this.currentWorkflow
      }
    ];
  }

  protected onContextUpdate(sources: ContextSource[]): void {
    // Update context info in workflow header
    const contextInfo = this.container.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Planning with ${sources.length} context sources`;
    }
  }

  protected onCleanup(): void {
    // Clean up any event listeners or resources
    this.workflowContainer = undefined;
    this.currentWorkflow = undefined;
    this.goalInput = undefined;
    this.timeframeSelect = undefined;
  }

  private renderWorkflowHeader(): void {
    if (!this.workflowContainer) return;

    const workflowHeader = this.workflowContainer.createEl('div', { cls: 'vp-workflow-header' });
    workflowHeader.createEl('h3', { text: 'AI Workflow Builder' });
    
    const contextInfo = workflowHeader.createEl('div', { cls: 'vp-workflow-context-info' });
    contextInfo.createEl('span', { 
      text: `Planning with ${this.context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Add workflow status indicator
    const statusEl = workflowHeader.createEl('div', { cls: 'vp-workflow-status' });
    if (this.currentWorkflow) {
      statusEl.textContent = '✅ Workflow Generated';
      statusEl.addClass('vp-status-success');
    } else {
      statusEl.textContent = '⏳ Ready to Generate';
      statusEl.addClass('vp-status-ready');
    }
  }

  private renderCreationArea(): void {
    if (!this.workflowContainer) return;

    const creationArea = this.workflowContainer.createEl('div', { cls: 'vp-workflow-creation' });
    
    // Goal input section
    const goalContainer = creationArea.createEl('div', { cls: 'vp-goal-container' });
    goalContainer.createEl('label', { 
      text: 'Workflow Goal:',
      cls: 'vp-input-label',
      attr: { 'for': 'workflow-goal-input' }
    });
    
    this.goalInput = goalContainer.createEl('textarea', {
      cls: 'vp-goal-input',
      attr: { 
        id: 'workflow-goal-input',
        placeholder: 'Describe what you want to accomplish...\n\nExample: "Create a comprehensive blog post about AI in education, including research, writing, editing, and publication"',
        'aria-label': 'Workflow goal description',
        rows: '4'
      }
    });

    // Options section
    const optionsContainer = creationArea.createEl('div', { cls: 'vp-workflow-options' });
    
    const timeframeLabel = optionsContainer.createEl('label', {
      text: 'Timeframe:',
      cls: 'vp-input-label',
      attr: { 'for': 'timeframe-select' }
    });
    
    this.timeframeSelect = optionsContainer.createEl('select', {
      cls: 'vp-timeframe-select',
      attr: { 
        'id': 'timeframe-select',
        'aria-label': 'Workflow timeframe' 
      }
    });
    
    const timeframes = [
      { value: '1 hour', label: '1 Hour - Quick Task' },
      { value: '1 day', label: '1 Day - Daily Goal' },
      { value: '1 week', label: '1 Week - Weekly Project' },
      { value: '1 month', label: '1 Month - Major Initiative' },
      { value: 'custom', label: 'Custom Duration' }
    ];
    
    timeframes.forEach(timeframe => {
      this.timeframeSelect!.createEl('option', { 
        value: timeframe.value, 
        text: timeframe.label 
      });
    });

    // Action buttons
    const buttonContainer = creationArea.createEl('div', { cls: 'vp-workflow-buttons' });
    
    createButton(buttonContainer, {
      variant: 'primary',
      size: 'md',
      children: 'Generate AI Workflow',
      icon: 'zap',
      onClick: () => this.generateWorkflow()
    });

    createButton(buttonContainer, {
      variant: 'secondary',
      size: 'md',
      children: 'Use Template',
      icon: 'layout-template',
      onClick: () => this.showTemplates()
    });

    // Auto-resize textarea
    this.goalInput.addEventListener('input', () => {
      this.goalInput!.style.height = 'auto';
      this.goalInput!.style.height = this.goalInput!.scrollHeight + 'px';
    });

    // Generate on Enter (Ctrl+Enter)
    this.goalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.generateWorkflow();
      }
    });
  }

  private renderWorkflowDisplay(): void {
    if (!this.workflowContainer) return;

    const workflowDisplay = this.workflowContainer.createEl('div', { 
      cls: 'vp-workflow-display',
      attr: { 'role': 'region', 'aria-label': 'Generated Workflow' }
    });

    if (this.currentWorkflow) {
      this.renderWorkflow(this.currentWorkflow);
    } else {
      this.renderEmptyState(workflowDisplay);
    }
  }

  private renderEmptyState(container: HTMLElement): void {
    container.empty();
    
    const emptyState = container.createEl('div', { cls: 'vp-workflow-empty' });
    emptyState.createEl('div', { cls: 'vp-empty-icon', text: '📋' });
    emptyState.createEl('h4', { text: 'No Workflow Generated Yet' });
    emptyState.createEl('p', { 
      text: 'Describe your goal above and click "Generate AI Workflow" to create a personalized action plan with tasks and milestones.' 
    });
  }

  private async generateWorkflow(): Promise<void> {
    if (!this.goalInput || !this.timeframeSelect || !this.context.plugin) return;
    
    const goal = this.goalInput.value.trim();
    const timeframe = this.timeframeSelect.value;
    
    if (!goal) {
      new Notice('Please describe your workflow goal');
      this.goalInput.focus();
      return;
    }

    const workflowDisplay = this.container.querySelector('.vp-workflow-display');
    if (!workflowDisplay) return;

    // Clear previous workflow
    workflowDisplay.empty();

    // Add loading indicator
    const loadingEl = this.showLoading('Generating AI workflow...');

    try {
      // Get context for planning
      const contextSummary = this.prepareWorkflowContext();
      
      // Call workflow planning API
      const response = await this.context.plugin.apiClient.planTasks({
        goal,
        context: contextSummary,
        timeframe
      });

      // Remove loading indicator
      this.hideLoading();

      if (response.success && response.data) {
        this.currentWorkflow = response.data;
        this.renderWorkflow(response.data);
        this.updateWorkflowStatus('success');
        new Notice('✅ Workflow generated successfully');
      } else {
        this.showError(`Failed to generate workflow: ${response.error}`);
        this.updateWorkflowStatus('error');
      }
    } catch (error) {
      this.hideLoading();
      this.showError(`Error generating workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.updateWorkflowStatus('error');
    }
  }

  private renderWorkflow(workflowData: WorkflowData): void {
    const workflowDisplay = this.container.querySelector('.vp-workflow-display');
    if (!workflowDisplay) return;

    workflowDisplay.empty();

    // Workflow header section
    const headerSection = workflowDisplay.createEl('div', { cls: 'vp-workflow-result-header' });
    
    const titleEl = headerSection.createEl('h4', { 
      text: workflowData.plan?.title || 'Generated Workflow',
      cls: 'vp-workflow-title'
    });

    if (workflowData.plan?.description) {
      headerSection.createEl('p', { 
        text: workflowData.plan.description,
        cls: 'vp-workflow-description'
      });
    }

    // Workflow metadata
    const metaSection = workflowDisplay.createEl('div', { cls: 'vp-workflow-meta' });
    
    if (workflowData.plan?.estimated_duration) {
      this.createMetaItem(metaSection, 'Duration', workflowData.plan.estimated_duration, 'clock');
    }
    
    if (workflowData.plan?.tasks) {
      this.createMetaItem(metaSection, 'Tasks', workflowData.plan.tasks.length.toString(), 'list');
    }
    
    if (workflowData.milestones) {
      this.createMetaItem(metaSection, 'Milestones', workflowData.milestones.length.toString(), 'flag');
    }

    // Tasks section
    if (workflowData.plan?.tasks && workflowData.plan.tasks.length > 0) {
      this.renderTasksSection(workflowDisplay, workflowData.plan.tasks);
    }

    // Milestones section
    if (workflowData.milestones && workflowData.milestones.length > 0) {
      this.renderMilestonesSection(workflowDisplay, workflowData.milestones);
    }

    // Progress tracking
    this.addProgressTracking(workflowDisplay);
  }

  private createMetaItem(container: HTMLElement, label: string, value: string, icon: string): void {
    const metaItem = container.createEl('div', { cls: 'vp-meta-item' });
    metaItem.createEl('span', { cls: `vp-meta-icon vp-icon-${icon}` });
    metaItem.createEl('span', { text: `${label}:`, cls: 'vp-meta-label' });
    metaItem.createEl('span', { text: value, cls: 'vp-meta-value' });
  }

  private renderTasksSection(container: HTMLElement, tasks: TaskData[]): void {
    const tasksSection = container.createEl('div', { cls: 'vp-workflow-tasks' });
    tasksSection.createEl('h5', { text: 'Tasks', cls: 'vp-section-title' });

    const tasksList = tasksSection.createEl('div', { 
      cls: 'vp-tasks-list',
      attr: { role: 'list' }
    });

    tasks.forEach((task, index) => {
      this.renderTask(tasksList, task, index);
    });
  }

  private renderTask(container: HTMLElement, task: TaskData, index: number): void {
    const taskEl = container.createEl('div', { 
      cls: `vp-task-item vp-priority-${task.priority || 'medium'}`,
      attr: { 'role': 'listitem' }
    });

    const taskHeader = taskEl.createEl('div', { cls: 'vp-task-header' });
    
    const checkbox = taskHeader.createEl('input', {
      type: 'checkbox',
      cls: 'vp-task-checkbox',
      attr: { 
        id: `task-${index}`,
        'aria-describedby': `task-desc-${index}`
      }
    });

    checkbox.checked = task.status === 'completed';
    checkbox.addEventListener('change', () => {
      this.updateTaskStatus(task, checkbox.checked ? 'completed' : 'pending');
    });

    const taskInfo = taskHeader.createEl('div', { cls: 'vp-task-info' });
    
    const taskTitle = taskInfo.createEl('label', {
      text: task.title || `Task ${index + 1}`,
      cls: 'vp-task-title',
      attr: { 'for': `task-${index}` }
    });

    const priorityBadge = taskHeader.createEl('span', {
      text: task.priority || 'medium',
      cls: `vp-priority-badge vp-priority-${task.priority || 'medium'}`
    });

    // Task details
    if (task.description) {
      const taskDetails = taskEl.createEl('div', { 
        cls: 'vp-task-details',
        attr: { id: `task-desc-${index}` }
      });
      taskDetails.createEl('p', { text: task.description });
    }

    // Task metadata
    const taskMeta = taskEl.createEl('div', { cls: 'vp-task-meta' });
    
    if (task.estimated_time) {
      const timeEl = taskMeta.createEl('span', { cls: 'vp-task-time' });
      timeEl.createEl('span', { cls: 'vp-icon-clock' });
      timeEl.createEl('span', { text: task.estimated_time });
    }

    if (task.dependencies && task.dependencies.length > 0) {
      const depsEl = taskMeta.createEl('span', { cls: 'vp-task-deps' });
      depsEl.createEl('span', { cls: 'vp-icon-link' });
      depsEl.createEl('span', { text: `${task.dependencies.length} dependencies` });
    }
  }

  private renderMilestonesSection(container: HTMLElement, milestones: MilestoneData[]): void {
    const milestonesSection = container.createEl('div', { cls: 'vp-workflow-milestones' });
    milestonesSection.createEl('h5', { text: 'Milestones', cls: 'vp-section-title' });

    const milestonesList = milestonesSection.createEl('div', { 
      cls: 'vp-milestones-list',
      attr: { role: 'list' }
    });

    milestones.forEach((milestone) => {
      this.renderMilestone(milestonesList, milestone);
    });
  }

  private renderMilestone(container: HTMLElement, milestone: MilestoneData): void {
    const milestoneEl = container.createEl('div', { 
      cls: 'vp-milestone-item',
      attr: { role: 'listitem' }
    });

    const milestoneHeader = milestoneEl.createEl('div', { cls: 'vp-milestone-header' });
    
    milestoneHeader.createEl('span', { cls: 'vp-milestone-icon', text: '🎯' });
    milestoneHeader.createEl('h6', { 
      text: milestone.title,
      cls: 'vp-milestone-title'
    });
    
    if (milestone.target_date) {
      milestoneHeader.createEl('span', { 
        text: milestone.target_date,
        cls: 'vp-milestone-date'
      });
    }

    if (milestone.description) {
      milestoneEl.createEl('p', { 
        text: milestone.description,
        cls: 'vp-milestone-description'
      });
    }

    if (milestone.tasks && milestone.tasks.length > 0) {
      const tasksInfo = milestoneEl.createEl('div', { cls: 'vp-milestone-tasks' });
      tasksInfo.createEl('span', { 
        text: `${milestone.tasks.length} related tasks`,
        cls: 'vp-milestone-task-count'
      });
    }
  }

  private addProgressTracking(container: HTMLElement): void {
    if (!this.currentWorkflow?.plan?.tasks) return;

    const progressSection = container.createEl('div', { cls: 'vp-workflow-progress' });
    progressSection.createEl('h5', { text: 'Progress', cls: 'vp-section-title' });

    const tasks = this.currentWorkflow.plan.tasks;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const progressBar = progressSection.createEl('div', { cls: 'vp-progress-bar' });
    const progressFill = progressBar.createEl('div', { 
      cls: 'vp-progress-fill',
      attr: { style: `width: ${percentage}%` }
    });

    const progressText = progressSection.createEl('div', { cls: 'vp-progress-text' });
    progressText.textContent = `${completedTasks} of ${totalTasks} tasks completed (${percentage}%)`;
  }

  private prepareWorkflowContext(): string {
    const sources = this.context.contextSources;
    let contextSummary = 'Workflow Planning Context:\n\n';
    
    if (sources.length > 0) {
      contextSummary += `Available context sources (${sources.length}):\n`;
      sources.forEach(source => {
        contextSummary += `- ${source.type}: ${source.name}`;
        if (source.preview) {
          contextSummary += ` (${source.preview.substring(0, 100)}...)`;
        }
        contextSummary += '\n';
      });
    }

    // Add active file info if available
    if (this.context.activeFile) {
      contextSummary += `\nActive file: ${this.context.activeFile.name}`;
    }

    return contextSummary;
  }

  private updateTaskStatus(task: TaskData, status: 'pending' | 'in_progress' | 'completed'): void {
    task.status = status;
    
    // Update progress display
    const progressSection = this.container.querySelector('.vp-workflow-progress');
    if (progressSection && this.currentWorkflow) {
      const tasks = this.currentWorkflow.plan.tasks;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const totalTasks = tasks.length;
      const percentage = Math.round((completedTasks / totalTasks) * 100);
      
      const progressFill = progressSection.querySelector('.vp-progress-fill') as HTMLElement;
      const progressText = progressSection.querySelector('.vp-progress-text') as HTMLElement;
      
      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
      }
      
      if (progressText) {
        progressText.textContent = `${completedTasks} of ${totalTasks} tasks completed (${percentage}%)`;
      }
    }
  }

  private updateWorkflowStatus(status: 'ready' | 'generating' | 'success' | 'error'): void {
    const statusEl = this.container.querySelector('.vp-workflow-status');
    if (!statusEl) return;

    statusEl.className = 'vp-workflow-status';
    
    switch (status) {
      case 'ready':
        statusEl.textContent = '⏳ Ready to Generate';
        statusEl.addClass('vp-status-ready');
        break;
      case 'generating':
        statusEl.textContent = '⚡ Generating...';
        statusEl.addClass('vp-status-generating');
        break;
      case 'success':
        statusEl.textContent = '✅ Workflow Generated';
        statusEl.addClass('vp-status-success');
        break;
      case 'error':
        statusEl.textContent = '❌ Generation Failed';
        statusEl.addClass('vp-status-error');
        break;
    }
  }

  private showError(message: string): void {
    const workflowDisplay = this.container.querySelector('.vp-workflow-display');
    if (!workflowDisplay) return;

    workflowDisplay.empty();
    
    const errorEl = workflowDisplay.createEl('div', { 
      cls: 'vp-workflow-error',
      attr: { role: 'alert' }
    });
    
    errorEl.createEl('div', { cls: 'vp-error-icon', text: '⚠️' });
    errorEl.createEl('h4', { text: 'Workflow Generation Failed' });
    errorEl.createEl('p', { text: message });
    
    const retryBtn = errorEl.createEl('button', {
      text: 'Try Again',
      cls: 'mod-cta'
    });
    
    retryBtn.addEventListener('click', () => {
      this.generateWorkflow();
    });
  }

  private showTemplates(): void {
    // TODO: Implement workflow templates
    new Notice('Workflow templates coming soon!');
  }

  private async exportWorkflow(): Promise<void> {
    if (!this.currentWorkflow) {
      new Notice('No workflow to export');
      return;
    }

    try {
      let exportContent = '# Workflow Export\n\n';
      exportContent += `**Generated:** ${new Date().toISOString()}\n\n`;
      
      if (this.currentWorkflow.plan) {
        const plan = this.currentWorkflow.plan;
        exportContent += `## ${plan.title || 'Workflow Plan'}\n\n`;
        
        if (plan.description) {
          exportContent += `${plan.description}\n\n`;
        }
        
        if (plan.estimated_duration) {
          exportContent += `**Duration:** ${plan.estimated_duration}\n\n`;
        }
        
        if (plan.tasks && plan.tasks.length > 0) {
          exportContent += '## Tasks\n\n';
          plan.tasks.forEach((task, index) => {
            const status = task.status === 'completed' ? '✅' : '⏳';
            exportContent += `${index + 1}. ${status} **${task.title}** (${task.priority})\n`;
            if (task.description) {
              exportContent += `   ${task.description}\n`;
            }
            if (task.estimated_time) {
              exportContent += `   *Estimated time: ${task.estimated_time}*\n`;
            }
            exportContent += '\n';
          });
        }
      }
      
      if (this.currentWorkflow.milestones && this.currentWorkflow.milestones.length > 0) {
        exportContent += '## Milestones\n\n';
        this.currentWorkflow.milestones.forEach((milestone, index) => {
          exportContent += `${index + 1}. 🎯 **${milestone.title}**`;
          if (milestone.target_date) {
            exportContent += ` - ${milestone.target_date}`;
          }
          exportContent += '\n';
          if (milestone.description) {
            exportContent += `   ${milestone.description}\n`;
          }
          exportContent += '\n';
        });
      }

      const filename = `workflow-${new Date().toISOString().split('T')[0]}.md`;
      
      // Create and download file
      const blob = new Blob([exportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      new Notice(`Workflow exported as ${filename}`);
    } catch (error) {
      new Notice('Failed to export workflow');
      console.error('Export error:', error);
    }
  }

  private async saveWorkflow(): Promise<void> {
    if (!this.currentWorkflow) {
      new Notice('No workflow to save');
      return;
    }

    // TODO: Implement workflow saving to vault
    new Notice('Workflow saving to vault coming soon!');
  }

  private clearWorkflow(): void {
    this.currentWorkflow = undefined;
    
    // Clear goal input
    if (this.goalInput) {
      this.goalInput.value = '';
      this.goalInput.style.height = 'auto';
    }
    
    // Reset timeframe
    if (this.timeframeSelect) {
      this.timeframeSelect.selectedIndex = 0;
    }
    
    // Clear display area
    const workflowDisplay = this.container.querySelector('.vp-workflow-display');
    if (workflowDisplay) {
      this.renderEmptyState(workflowDisplay);
    }
    
    // Update status
    this.updateWorkflowStatus('ready');
    
    new Notice('Workflow cleared');
  }

  private duplicateWorkflow(): void {
    if (!this.currentWorkflow || !this.goalInput) {
      new Notice('No workflow to duplicate');
      return;
    }

    // Copy the goal to input for modification
    const originalGoal = this.goalInput.value;
    this.goalInput.value = `${originalGoal} (Copy)`;
    this.goalInput.focus();
    
    new Notice('Goal copied - modify and regenerate workflow');
  }
}