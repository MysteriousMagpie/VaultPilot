/**
 * TypeScript type definitions for VaultPilot vault management integration
 */

import { App } from 'obsidian';

// === VAULT STRUCTURE TYPES ===

export interface VaultStructureRequest {
  include_content?: boolean;
  max_depth?: number;
  file_types?: string[];
}

export interface VaultFileInfo {
  path: string;
  name: string;
  size: number;
  modified: string;
  file_type: string;
  content_preview?: string;
  tags?: string[];
  links?: string[];
}

export interface VaultFolderInfo {
  name: string;
  path: string;
  children: (VaultFileInfo | VaultFolderInfo)[];
  type: 'folder';
}

export interface VaultStructureResponse {
  vault_name: string;
  total_files: number;
  total_folders: number;
  total_size: number;
  structure: VaultFolderInfo;
  recent_files: VaultFileInfo[];
  orphaned_files: VaultFileInfo[];
}

// === FILE OPERATION TYPES ===

export type FileOperationType = 'create' | 'update' | 'delete' | 'move' | 'copy';

export interface FileOperationRequest {
  operation: FileOperationType;
  file_path: string;
  new_path?: string;
  content?: string;
  backup?: boolean;
}

export interface FileOperationResponse {
  success: boolean;
  message: string;
  file_path: string;
  backup_path?: string;
  new_path?: string;
}

// === BATCH OPERATIONS ===

export interface BatchFileOperationRequest {
  operations: FileOperationRequest[];
  atomic?: boolean;
  timeout?: number;
}

export interface BatchFileOperationResponse {
  success: boolean;
  completed: number;
  failed: number;
  results: FileOperationResponse[];
  errors?: string[];
}

// === SEARCH TYPES ===

export type SearchType = 'content' | 'filename' | 'tags' | 'links' | 'comprehensive';

export interface VaultSearchRequest {
  query: string;
  search_type?: SearchType;
  max_results?: number;
  include_content?: boolean;
  file_types?: string[];
  folders?: string[];
}

export interface VaultSearchResult {
  file_path: string;
  file_name: string;
  match_type: 'content' | 'filename' | 'tag' | 'link';
  matches: string[];
  preview: string;
  score: number;
  line_numbers?: number[];
}

export interface VaultSearchResponse {
  results: VaultSearchResult[];
  total_found: number;
  search_type: SearchType;
  query: string;
  insights?: string;
  suggested_queries?: string[];
}

// === ORGANIZATION TYPES ===

export interface VaultOrganizationRequest {
  focus_folders?: string[];
  organization_mode: 'by_topic' | 'by_date' | 'by_type' | 'custom';
  create_folders?: boolean;
  move_files?: boolean;
  custom_rules?: OrganizationRule[];
}

export interface OrganizationRule {
  pattern: string;
  target_folder: string;
  rule_type: 'filename' | 'content' | 'tag';
}

export interface VaultOrganizationResponse {
  suggested_moves: FileMoveOperation[];
  suggested_folders: string[];
  organization_insights: string;
  estimated_improvements: string;
}

export interface FileMoveOperation {
  from_path: string;
  to_path: string;
  reason: string;
  confidence: number;
}

// === BACKUP TYPES ===

export interface VaultBackupRequest {
  include_settings?: boolean;
  compression?: boolean;
  backup_name?: string;
}

export interface VaultBackupResponse {
  backup_path: string;
  backup_size: number;
  files_backed_up: number;
  timestamp: string;
}

// === ERROR HANDLING ===

export class VaultManagementError extends Error {
  public code: string;
  public feature: string;

  constructor(message: string, code: string, feature: string) {
    super(message);
    this.name = 'VaultManagementError';
    this.code = code;
    this.feature = feature;
  }
}

// === SETTINGS TYPES ===

export interface VaultManagementSettings {
  enableVaultManagement: boolean;
  autoSyncVaultStructure: boolean;
  searchResultsLimit: number;
  enableSmartSearch: boolean;
  batchOperationTimeout: number;
  showVaultStats: boolean;
  maxSearchResults: number;
  defaultSearchType: SearchType;
  enableFileOperations: boolean;
  confirmDestructiveOperations: boolean;
  autoBackupBeforeOperations: boolean;
}

// === API INTERFACE ===

export interface VaultManagementAPI {
  getVaultStructure(request: VaultStructureRequest): Promise<VaultStructureResponse>;
  performFileOperation(request: FileOperationRequest): Promise<FileOperationResponse>;
  performBatchOperations(request: BatchFileOperationRequest): Promise<BatchFileOperationResponse>;
  searchVault(request: VaultSearchRequest): Promise<VaultSearchResponse>;
  organizeVault(request: VaultOrganizationRequest): Promise<VaultOrganizationResponse>;
  backupVault(request: VaultBackupRequest): Promise<VaultBackupResponse>;
}

// === UTILITY TYPES ===

export interface VaultModalProps {
  app: App;
  plugin: any;
  onClose?: () => void;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  size?: number;
  modified?: string;
}

export interface VaultStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  averageFileSize: number;
  largestFile: VaultFileInfo;
  mostRecentFile: VaultFileInfo;
  fileTypeDistribution: Record<string, number>;
}

export interface SearchFilter {
  fileTypes?: string[];
  folders?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

export interface VaultHealthCheck {
  status: 'healthy' | 'warning' | 'error';
  issues: HealthIssue[];
  recommendations: string[];
  lastCheck: string;
}

export interface HealthIssue {
  type: 'orphaned_file' | 'broken_link' | 'duplicate_name' | 'large_file' | 'empty_folder';
  description: string;
  files: string[];
  severity: 'low' | 'medium' | 'high';
}
