/**
 * Development Context Service for VaultPilot
 * 
 * Provides comprehensive development context for AI conversations including:
 * - Workspace structure and file analysis
 * - Active file content and metadata
 * - User selection and cursor context
 * - Project type and dependency detection
 * - Git repository information
 */

import { App, TFile, Vault, MetadataCache, Workspace } from 'obsidian';
import type VaultPilotPlugin from '../main';

// Context Interfaces
export interface DevelopmentContext {
  workspace: WorkspaceContext;
  activeFile: FileContext | null;
  selection: SelectionContext | null;
  project: ProjectContext;
  git: GitContext | null;
  timestamp: number;
}

export interface WorkspaceContext {
  totalFiles: number;
  recentFiles: string[];
  tags: string[];
  folders: FolderStructure[];
  fileTypes: Record<string, number>;
  vaultPath: string;
}

export interface FileContext {
  path: string;
  name: string;
  content: string;
  language: string;
  extension: string;
  size: number;
  metadata: FileMetadata;
  symbols: CodeSymbol[];
  dependencies: string[];
  lastModified: number;
}

export interface FileMetadata {
  frontmatter: Record<string, any>;
  tags: string[];
  links: string[];
  backlinks: string[];
  headings: HeadingInfo[];
  wordCount: number;
}

export interface HeadingInfo {
  level: number;
  text: string;
  line: number;
}

export interface SelectionContext {
  text: string;
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
  surroundingContext: string;
  lineContext: string;
}

export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'constant';
  line: number;
  scope: string;
  signature?: string;
}

export interface ProjectContext {
  type: ProjectType;
  structure: ProjectStructure;
  dependencies: DependencyInfo[];
  buildSystem: BuildSystemInfo | null;
  testFramework: TestFrameworkInfo | null;
  documentation: DocumentationInfo[];
}

export interface ProjectStructure {
  rootFiles: string[];
  sourceDirectories: string[];
  testDirectories: string[];
  configFiles: string[];
  documentationFiles: string[];
  depth: number;
  estimatedSize: 'small' | 'medium' | 'large';
}

export interface DependencyInfo {
  name: string;
  version?: string;
  type: 'dev' | 'runtime' | 'peer';
  source: string;
}

export interface BuildSystemInfo {
  type: 'npm' | 'yarn' | 'maven' | 'gradle' | 'cmake' | 'make' | 'other';
  configFile: string;
  scripts: string[];
}

export interface TestFrameworkInfo {
  type: 'jest' | 'mocha' | 'pytest' | 'junit' | 'other';
  configFile?: string;
  testPatterns: string[];
}

export interface DocumentationInfo {
  type: 'readme' | 'api' | 'guide' | 'changelog' | 'license';
  path: string;
  lastUpdated: number;
}

export interface FolderStructure {
  name: string;
  path: string;
  fileCount: number;
  subfolders: string[];
}

export interface GitContext {
  isRepository: boolean;
  currentBranch: string;
  uncommittedChanges: number;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: number;
  } | null;
  remoteUrl?: string;
}

export type ProjectType = 
  | 'obsidian-plugin'
  | 'typescript-library'
  | 'javascript-library'
  | 'react-app'
  | 'vue-app'
  | 'node-app'
  | 'python-package'
  | 'documentation'
  | 'notes'
  | 'unknown';

/**
 * Main Development Context Service
 */
export class DevelopmentContextService {
  private app: App;
  private plugin: VaultPilotPlugin;
  private contextCache: Map<string, any> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  constructor(app: App, plugin: VaultPilotPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  /**
   * Get comprehensive development context
   */
  async getFullContext(): Promise<DevelopmentContext> {
    const cacheKey = 'full_context';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const context: DevelopmentContext = {
      workspace: await this.getWorkspaceContext(),
      activeFile: await this.getActiveFileContext(),
      selection: await this.getSelectionContext(),
      project: await this.getProjectContext(),
      git: await this.getGitContext(),
      timestamp: Date.now()
    };

    this.setCachedResult(cacheKey, context);
    return context;
  }

  /**
   * Get workspace-level context
   */
  async getWorkspaceContext(): Promise<WorkspaceContext> {
    const cacheKey = 'workspace_context';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const vault = this.app.vault;
    const allFiles = vault.getMarkdownFiles();
    
    // Get recent files (last 10 accessed)
    const recentFiles = this.getRecentFiles(10);
    
    // Analyze file types
    const fileTypes: Record<string, number> = {};
    allFiles.forEach(file => {
      const ext = file.extension || 'md';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    // Get all tags
    const tags = this.extractAllTags();

    // Build folder structure
    const folders = this.buildFolderStructure();

    const context: WorkspaceContext = {
      totalFiles: allFiles.length,
      recentFiles,
      tags,
      folders,
      fileTypes,
      vaultPath: (vault.adapter as any).basePath || vault.adapter.getName?.() || ''
    };

    this.setCachedResult(cacheKey, context, 60000); // Cache for 1 minute
    return context;
  }

  /**
   * Get active file context
   */
  async getActiveFileContext(): Promise<FileContext | null> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return null;

    const cacheKey = `file_context_${activeFile.path}_${activeFile.stat.mtime}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const content = await this.app.vault.read(activeFile);
    const metadata = this.app.metadataCache.getFileCache(activeFile);

    const context: FileContext = {
      path: activeFile.path,
      name: activeFile.name,
      content,
      language: this.detectLanguage(activeFile.extension),
      extension: activeFile.extension,
      size: activeFile.stat.size,
      lastModified: activeFile.stat.mtime,
      metadata: {
        frontmatter: metadata?.frontmatter || {},
        tags: this.extractTags(metadata),
        links: this.extractLinks(metadata),
        backlinks: this.getBacklinks(activeFile),
        headings: this.extractHeadings(metadata),
        wordCount: content.split(/\s+/).length
      },
      symbols: await this.extractCodeSymbols(content, activeFile.extension),
      dependencies: await this.extractDependencies(content, activeFile.extension)
    };

    this.setCachedResult(cacheKey, context);
    return context;
  }

  /**
   * Get current selection context
   */
  async getSelectionContext(): Promise<SelectionContext | null> {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf?.view) return null;

    // Check if this is a markdown view with an editor
    const view = activeLeaf.view as any;
    if (!view.editor) return null;

    const editor = view.editor;
    const selection = editor.getSelection();
    
    if (!selection) return null;

    const selectionRange = editor.listSelections()[0];
    const startPos = selectionRange.anchor;
    const endPos = selectionRange.head;
    
    // Ensure start is before end
    const actualStart = startPos.line < endPos.line || (startPos.line === endPos.line && startPos.ch < endPos.ch) ? startPos : endPos;
    const actualEnd = startPos.line > endPos.line || (startPos.line === endPos.line && startPos.ch > endPos.ch) ? startPos : endPos;
    
    const line = editor.getLine(actualStart.line);
    
    // Get surrounding context (5 lines before and after)
    const contextStartLine = Math.max(0, actualStart.line - 5);
    const contextEndLine = Math.min(editor.lineCount() - 1, actualEnd.line + 5);
    const surroundingLines = [];
    
    for (let i = contextStartLine; i <= contextEndLine; i++) {
      surroundingLines.push(editor.getLine(i));
    }

    return {
      text: selection,
      startLine: actualStart.line,
      endLine: actualEnd.line,
      startCol: actualStart.ch,
      endCol: actualEnd.ch,
      surroundingContext: surroundingLines.join('\n'),
      lineContext: line
    };
  }

  /**
   * Get project context
   */
  async getProjectContext(): Promise<ProjectContext> {
    const cacheKey = 'project_context';
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const projectType = await this.detectProjectType();
    const structure = await this.analyzeProjectStructure();
    const dependencies = await this.analyzeDependencies();
    const buildSystem = await this.detectBuildSystem();
    const testFramework = await this.detectTestFramework();
    const documentation = await this.findDocumentation();

    const context: ProjectContext = {
      type: projectType,
      structure,
      dependencies,
      buildSystem,
      testFramework,
      documentation
    };

    this.setCachedResult(cacheKey, context, 120000); // Cache for 2 minutes
    return context;
  }

  /**
   * Get Git context
   */
  async getGitContext(): Promise<GitContext | null> {
    const vault = this.app.vault;
    
    // Check if .git directory exists
    const gitDir = vault.getAbstractFileByPath('.git');
    if (!gitDir) return null;
    
    // Basic Git context - for full implementation, we'd need to read Git files
    // For now, just indicate it's a Git repository
    return {
      isRepository: true,
      currentBranch: 'main', // Default assumption
      uncommittedChanges: 0, // Would need to check git status
      lastCommit: null, // Would need to parse git log
      remoteUrl: undefined // Would need to parse git config
    };
  }

  // Caching methods
  private getCachedResult(key: string): any {
    const cached = this.contextCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.timeout) {
      this.contextCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCachedResult(key: string, data: any, timeout = this.cacheTimeout): void {
    this.contextCache.set(key, {
      data,
      timestamp: Date.now(),
      timeout
    });
  }

  // Helper methods for workspace analysis
  private getRecentFiles(limit: number): string[] {
    const recentFiles: string[] = [];
    const workspace = this.app.workspace;
    
    // Get recent files from workspace leaf history
    workspace.iterateAllLeaves(leaf => {
      if (leaf.view && 'file' in leaf.view && leaf.view.file) {
        const file = leaf.view.file as TFile;
        const filePath = file.path;
        if (!recentFiles.includes(filePath)) {
          recentFiles.push(filePath);
        }
      }
    });
    
    // Also check recently opened files from workspace if available
    try {
      const lastOpenFiles = (workspace as any).getLastOpenFiles?.() || [];
      lastOpenFiles.forEach((filePath: string) => {
        if (!recentFiles.includes(filePath)) {
          recentFiles.push(filePath);
        }
      });
    } catch (e) {
      // Fallback if method doesn't exist
    }
    
    return recentFiles.slice(0, limit);
  }

  private extractAllTags(): string[] {
    const tags = new Set<string>();
    const metadataCache = this.app.metadataCache;
    const vault = this.app.vault;
    
    // Get all markdown files and extract tags from their metadata
    vault.getMarkdownFiles().forEach(file => {
      const cache = metadataCache.getFileCache(file);
      if (cache?.tags) {
        cache.tags.forEach(tag => tags.add(tag.tag));
      }
      if (cache?.frontmatter?.tags) {
        const frontmatterTags = Array.isArray(cache.frontmatter.tags) 
          ? cache.frontmatter.tags 
          : [cache.frontmatter.tags];
        frontmatterTags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags);
  }

  private buildFolderStructure(): FolderStructure[] {
    const folders: FolderStructure[] = [];
    const vault = this.app.vault;
    const folderMap = new Map<string, { fileCount: number; subfolders: Set<string> }>();
    
    // Analyze all files to build folder structure
    vault.getAllLoadedFiles().forEach(file => {
      const pathParts = file.path.split('/');
      if (pathParts.length > 1) {
        // Build all folder paths in the hierarchy
        for (let i = 1; i < pathParts.length; i++) {
          const folderPath = pathParts.slice(0, i).join('/');
          const folderName = pathParts[i - 1];
          
          if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, { fileCount: 0, subfolders: new Set() });
          }
          
          const folderInfo = folderMap.get(folderPath)!;
          
          // If this is the file's direct parent folder, count it
          if (i === pathParts.length - 1) {
            folderInfo.fileCount++;
          }
          
          // Add subfolder if there are more path parts
          if (i < pathParts.length - 1) {
            folderInfo.subfolders.add(pathParts[i]);
          }
        }
      }
    });
    
    // Convert map to folder structures
    folderMap.forEach((info, path) => {
      const name = path.split('/').pop() || path;
      folders.push({
        name,
        path,
        fileCount: info.fileCount,
        subfolders: Array.from(info.subfolders)
      });
    });
    
    return folders.sort((a, b) => a.path.localeCompare(b.path));
  }

  // Helper methods for file analysis
  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'tsx': 'typescript-react',
      'jsx': 'javascript-react',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less'
    };
    
    return languageMap[extension] || 'text';
  }

  private extractTags(metadata: any): string[] {
    if (!metadata?.tags) return [];
    return metadata.tags.map((tag: any) => tag.tag || tag);
  }

  private extractLinks(metadata: any): string[] {
    if (!metadata?.links) return [];
    return metadata.links.map((link: any) => link.link);
  }

  private getBacklinks(file: TFile): string[] {
    const backlinks: string[] = [];
    const metadataCache = this.app.metadataCache;
    const vault = this.app.vault;
    
    // Check all markdown files for links to the target file
    vault.getMarkdownFiles().forEach(otherFile => {
      if (otherFile.path === file.path) return; // Skip self
      
      const cache = metadataCache.getFileCache(otherFile);
      if (cache?.links) {
        cache.links.forEach((link: any) => {
          if (link.link === file.basename || link.link === file.path) {
            backlinks.push(otherFile.path);
          }
        });
      }
    });
    
    return backlinks;
  }

  private extractHeadings(metadata: any): HeadingInfo[] {
    if (!metadata?.headings) return [];
    
    return metadata.headings.map((heading: any) => ({
      level: heading.level,
      text: heading.heading,
      line: heading.position?.start?.line || 0
    }));
  }

  private async extractCodeSymbols(content: string, extension: string): Promise<CodeSymbol[]> {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');
    
    // Simple symbol extraction for common languages
    if (extension === 'ts' || extension === 'js') {
      lines.forEach((line, index) => {
        // Extract functions
        const functionMatch = line.match(/(function|const|let|var)\s+(\w+)/);
        if (functionMatch) {
          symbols.push({
            name: functionMatch[2],
            type: 'function',
            line: index + 1,
            scope: 'global', // TODO: Implement proper scope detection
            signature: line.trim()
          });
        }
        
        // Extract classes
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          symbols.push({
            name: classMatch[1],
            type: 'class',
            line: index + 1,
            scope: 'global',
            signature: line.trim()
          });
        }
      });
    }
    
    return symbols;
  }

  private async extractDependencies(content: string, extension: string): Promise<string[]> {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    
    // Extract imports/requires
    lines.forEach(line => {
      // TypeScript/JavaScript imports
      const importMatch = line.match(/import.*from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        dependencies.push(importMatch[1]);
      }
      
      // Require statements
      const requireMatch = line.match(/require\(['"]([^'"]+)['"]\)/);
      if (requireMatch) {
        dependencies.push(requireMatch[1]);
      }
      
      // Python imports
      const pythonMatch = line.match(/(?:from\s+(\w+)|import\s+(\w+))/);
      if (pythonMatch) {
        dependencies.push(pythonMatch[1] || pythonMatch[2]);
      }
    });
    
    return dependencies;
  }

  // Project analysis methods
  private async detectProjectType(): Promise<ProjectType> {
    const vault = this.app.vault;
    const files = vault.getAllLoadedFiles();
    
    // Check for specific project indicators
    const hasPackageJson = files.some(f => f.name === 'package.json');
    const hasManifestJson = files.some(f => f.name === 'manifest.json');
    const hasTsConfig = files.some(f => f.name === 'tsconfig.json');
    const hasPyProject = files.some(f => f.name === 'pyproject.toml' || f.name === 'setup.py');
    
    if (hasManifestJson && hasPackageJson) return 'obsidian-plugin';
    if (hasPackageJson && hasTsConfig) return 'typescript-library';
    if (hasPackageJson) return 'javascript-library';
    if (hasPyProject) return 'python-package';
    
    // Check for framework-specific files
    const hasReactFiles = files.some(f => 
      f instanceof TFile && (f.name.includes('.jsx') || f.name.includes('.tsx'))
    );
    if (hasReactFiles) return 'react-app';
    
    // Default classifications
    const hasMarkdownFiles = files.some(f => f instanceof TFile && f.extension === 'md');
    if (hasMarkdownFiles) return 'documentation';
    
    return 'unknown';
  }

  private async analyzeProjectStructure(): Promise<ProjectStructure> {
    const vault = this.app.vault;
    const files = vault.getAllLoadedFiles();
    
    const rootFiles: string[] = [];
    const sourceDirectories: string[] = [];
    const testDirectories: string[] = [];
    const configFiles: string[] = [];
    const documentationFiles: string[] = [];
    
    files.forEach(file => {
      if (file.path.split('/').length === 1) {
        rootFiles.push(file.name);
      }
      
      if (file.path.includes('/src/')) {
        sourceDirectories.push(file.path);
      }
      
      if (file.path.includes('/test/') || file.path.includes('/__tests__/')) {
        testDirectories.push(file.path);
      }
      
      if (file.name.includes('config') || file.name.includes('.json') || file.name.includes('.yml')) {
        configFiles.push(file.path);
      }
      
      if (file instanceof TFile && (file.extension === 'md' || file.name.toLowerCase().includes('readme'))) {
        documentationFiles.push(file.path);
      }
    });
    
    return {
      rootFiles,
      sourceDirectories,
      testDirectories,
      configFiles,
      documentationFiles,
      depth: Math.max(...files.map(f => f.path.split('/').length)),
      estimatedSize: files.length < 50 ? 'small' : files.length < 200 ? 'medium' : 'large'
    };
  }

  private async analyzeDependencies(): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const vault = this.app.vault;
    
    try {
      // Try to read package.json
      const packageJsonFile = vault.getAbstractFileByPath('package.json');
      if (packageJsonFile instanceof TFile) {
        const content = await vault.read(packageJsonFile);
        const packageData = JSON.parse(content);
        
        // Parse dependencies
        Object.entries(packageData.dependencies || {}).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: version as string,
            type: 'runtime',
            source: 'package.json'
          });
        });
        
        // Parse devDependencies
        Object.entries(packageData.devDependencies || {}).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: version as string,
            type: 'dev',
            source: 'package.json'
          });
        });
        
        // Parse peerDependencies
        Object.entries(packageData.peerDependencies || {}).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: version as string,
            type: 'peer',
            source: 'package.json'
          });
        });
      }
    } catch (e) {
      // Package.json not found or invalid, try other dependency files
    }
    
    // TODO: Add support for requirements.txt, Cargo.toml, etc.
    
    return dependencies;
  }

  private async detectBuildSystem(): Promise<BuildSystemInfo | null> {
    const vault = this.app.vault;
    
    // Check for package.json (npm/yarn)
    const packageJsonFile = vault.getAbstractFileByPath('package.json');
    if (packageJsonFile instanceof TFile) {
      try {
        const content = await vault.read(packageJsonFile);
        const packageData = JSON.parse(content);
        const scripts = Object.keys(packageData.scripts || {});
        
        return {
          type: 'npm',
          configFile: 'package.json',
          scripts
        };
      } catch (e) {
        // Invalid package.json
      }
    }
    
    // Check for other build systems
    if (vault.getAbstractFileByPath('pom.xml')) {
      return {
        type: 'maven',
        configFile: 'pom.xml',
        scripts: ['compile', 'test', 'package']
      };
    }
    
    if (vault.getAbstractFileByPath('build.gradle')) {
      return {
        type: 'gradle',
        configFile: 'build.gradle',
        scripts: ['build', 'test', 'clean']
      };
    }
    
    if (vault.getAbstractFileByPath('CMakeLists.txt')) {
      return {
        type: 'cmake',
        configFile: 'CMakeLists.txt',
        scripts: ['build', 'install']
      };
    }
    
    if (vault.getAbstractFileByPath('Makefile')) {
      return {
        type: 'make',
        configFile: 'Makefile',
        scripts: ['all', 'clean', 'install']
      };
    }
    
    return null;
  }

  private async detectTestFramework(): Promise<TestFrameworkInfo | null> {
    const vault = this.app.vault;
    const files = vault.getAllLoadedFiles();
    
    // Check for Jest
    if (vault.getAbstractFileByPath('jest.config.js') || vault.getAbstractFileByPath('jest.config.json')) {
      return {
        type: 'jest',
        configFile: vault.getAbstractFileByPath('jest.config.js') ? 'jest.config.js' : 'jest.config.json',
        testPatterns: ['**/__tests__/**/*.test.js', '**/*.test.js', '**/*.spec.js']
      };
    }
    
    // Check package.json for test frameworks
    const packageJsonFile = vault.getAbstractFileByPath('package.json');
    if (packageJsonFile instanceof TFile) {
      try {
        const content = await vault.read(packageJsonFile);
        const packageData = JSON.parse(content);
        const allDeps = {
          ...packageData.dependencies,
          ...packageData.devDependencies
        };
        
        if (allDeps.jest) {
          return {
            type: 'jest',
            testPatterns: ['**/__tests__/**/*.test.js', '**/*.test.js', '**/*.spec.js']
          };
        }
        
        if (allDeps.mocha) {
          return {
            type: 'mocha',
            testPatterns: ['test/**/*.js', 'test/**/*.spec.js']
          };
        }
        
        if (allDeps.pytest) {
          return {
            type: 'pytest',
            testPatterns: ['test_*.py', '*_test.py', 'tests/**/*.py']
          };
        }
      } catch (e) {
        // Invalid package.json
      }
    }
    
    // Check for Python test files
    const hasPytestFiles = files.some(f => 
      f instanceof TFile && 
      (f.name.startsWith('test_') || f.name.endsWith('_test.py'))
    );
    if (hasPytestFiles) {
      return {
        type: 'pytest',
        testPatterns: ['test_*.py', '*_test.py', 'tests/**/*.py']
      };
    }
    
    // Check for JUnit
    const hasJunitFiles = files.some(f => 
      f instanceof TFile && 
      f.name.includes('Test.java')
    );
    if (hasJunitFiles) {
      return {
        type: 'junit',
        testPatterns: ['**/*Test.java', '**/Test*.java']
      };
    }
    
    return null;
  }

  private async findDocumentation(): Promise<DocumentationInfo[]> {
    const vault = this.app.vault;
    const files = vault.getAllLoadedFiles();
    const docs: DocumentationInfo[] = [];
    
    files.forEach(file => {
      if (!(file instanceof TFile)) return;
      
      if (file.name.toLowerCase().includes('readme')) {
        docs.push({
          type: 'readme',
          path: file.path,
          lastUpdated: file.stat.mtime
        });
      }
      
      if (file.name.toLowerCase().includes('changelog')) {
        docs.push({
          type: 'changelog',
          path: file.path,
          lastUpdated: file.stat.mtime
        });
      }
      
      if (file.name.toLowerCase().includes('license')) {
        docs.push({
          type: 'license',
          path: file.path,
          lastUpdated: file.stat.mtime
        });
      }
    });
    
    return docs;
  }

  /**
   * Clear all cached context data
   */
  public clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * Get context summary for chat
   */
  async getContextSummary(): Promise<string> {
    const context = await this.getFullContext();
    
    let summary = `## Development Context\n\n`;
    
    // Workspace info
    summary += `**Workspace**: ${context.workspace.totalFiles} files, ${context.workspace.folders.length} folders\n`;
    
    // Active file info
    if (context.activeFile) {
      summary += `**Active File**: ${context.activeFile.name} (${context.activeFile.language})\n`;
      summary += `**File Size**: ${Math.round(context.activeFile.size / 1024)}KB, ${context.activeFile.metadata.wordCount} words\n`;
      
      if (context.activeFile.symbols.length > 0) {
        summary += `**Code Symbols**: ${context.activeFile.symbols.length} found\n`;
      }
    }
    
    // Project info
    summary += `**Project Type**: ${context.project.type}\n`;
    summary += `**Project Size**: ${context.project.structure.estimatedSize}\n`;
    
    // Selection info
    if (context.selection) {
      summary += `**Current Selection**: "${context.selection.text.substring(0, 50)}${context.selection.text.length > 50 ? '...' : ''}"\n`;
    }
    
    return summary;
  }
}
