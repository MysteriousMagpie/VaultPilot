/**
 * Lightweight Development Context Service
 *
 * This is a pragmatic, dependency-light implementation that provides
 * the context surface expected by ConversationDevService. It avoids
 * heavy editor/runtime coupling and returns best-effort data, allowing
 * the plugin to compile and run in all environments.
 */

export interface ActiveFileContext {
  name: string;
  symbols: any[];
  dependencies: any[];
}

export interface ProjectStructure {
  estimatedSize: 'small' | 'medium' | 'large';
  sourceDirectories: string[];
}

export interface ProjectContext {
  type: string;
  structure: ProjectStructure;
  dependencies: any[];
  documentation: any[];
  buildSystem?: { type: string } | null;
  testFramework?: { type: string } | null;
}

export interface GitContext {
  isRepository: boolean;
}

export interface DevelopmentContext {
  workspace: any;
  activeFile: ActiveFileContext | null;
  selection: any | null;
  project: ProjectContext;
  git: GitContext | null;
  timestamp: number;
}

export class DevelopmentContextService {
  private app: any;
  private plugin: any;

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }

  async getContextSummary(): Promise<string> {
    const project = await this.getProjectContext();
    const active = await this.getActiveFileContext();
    const parts: string[] = [];
    parts.push(`Project type: ${project.type}`);
    parts.push(`Estimated size: ${project.structure.estimatedSize}`);
    if (active?.name) parts.push(`Active file: ${active.name}`);
    return parts.join(' | ');
  }

  async getWorkspaceContext(): Promise<any> {
    try {
      const vault = (this.app as any)?.vault;
      const files = Array.isArray(vault?.getFiles?.()) ? vault.getFiles().length : undefined;
      return {
        fileCount: files,
        platform: (navigator as any)?.userAgent || 'unknown',
      };
    } catch {
      return { fileCount: undefined, platform: 'unknown' };
    }
  }

  async getActiveFileContext(): Promise<ActiveFileContext | null> {
    try {
      const view = (this.app as any)?.workspace?.getActiveViewOfType?.(Object) || null;
      const file = view?.file || view?.currentFile || null;
      const name: string | undefined = file?.name;
      return name
        ? { name, symbols: [], dependencies: [] }
        : null;
    } catch {
      return null;
    }
  }

  async getSelectionContext(): Promise<any | null> {
    try {
      const activeLeaf = (this.app as any)?.workspace?.activeLeaf;
      const editor = activeLeaf?.view?.editor || activeLeaf?.view?._editor;
      const selection = editor?.getSelection?.() || null;
      return selection || null;
    } catch {
      return null;
    }
  }

  async getProjectContext(): Promise<ProjectContext> {
    // Heuristic project detection with safe fallbacks
    const structure: ProjectStructure = {
      estimatedSize: 'medium',
      sourceDirectories: ['src'],
    };
    return {
      type: 'obsidian-plugin',
      structure,
      dependencies: [],
      documentation: [],
      buildSystem: { type: 'rollup' },
      testFramework: { type: 'jest' },
    };
  }

  async getGitContext(): Promise<GitContext | null> {
    // Avoid bundling node/git - provide minimal signal
    return { isRepository: true };
  }

  async getFullContext(): Promise<DevelopmentContext> {
    const [workspace, activeFile, selection, project, git] = await Promise.all([
      this.getWorkspaceContext(),
      this.getActiveFileContext(),
      this.getSelectionContext(),
      this.getProjectContext(),
      this.getGitContext(),
    ]);
    return {
      workspace,
      activeFile,
      selection,
      project,
      git,
      timestamp: Date.now(),
    };
  }

  clearCache(): void {
    // No-op placeholder for future caching
  }
}


