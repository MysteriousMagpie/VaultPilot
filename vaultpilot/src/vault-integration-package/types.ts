// TypeScript type definitions for EvoAgentX vault management
// Copy to your VaultPilot plugin src/ directory

export interface VaultStructureNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: VaultStructureNode[];
  size?: number;
  modified?: string;
  tags?: string[];
}

export interface VaultStructureResponse {
  success: boolean;
  structure: VaultStructureNode;
  total_files: number;
  total_folders: number;
  vault_size: number;
}

export interface FileOperation {
  operation: 'create' | 'delete' | 'move' | 'rename' | 'copy';
  source_path: string;
  target_path?: string;
  content?: string;
  is_folder?: boolean;
}

export interface BatchFileOperationsRequest {
  operations: FileOperation[];
  create_backup?: boolean;
}

export interface FileOperationResult {
  operation: string;
  source_path: string;
  target_path?: string;
  success: boolean;
  error?: string;
}

export interface BatchOperationsResponse {
  success: boolean;
  results: FileOperationResult[];
  backup_location?: string;
  errors: string[];
}

export interface SmartSearchRequest {
  query: string;
  search_type: 'content' | 'tags' | 'properties' | 'all';
  file_types?: string[];
  date_range?: {
    start?: string;
    end?: string;
  };
  max_results?: number;
  include_content?: boolean;
}

export interface SearchResult {
  file_path: string;
  title: string;
  content_snippet?: string;
  tags: string[];
  properties: Record<string, any>;
  modified: string;
  score: number;
  match_context?: string;
}

export interface SmartSearchResponse {
  success: boolean;
  results: SearchResult[];
  total_matches: number;
  search_time: number;
  query_processed: string;
}

export interface OrganizationRule {
  name: string;
  pattern: string;
  target_folder: string;
  enabled: boolean;
}

export interface VaultOrganizeRequest {
  strategy: 'by_tags' | 'by_type' | 'by_date' | 'by_size' | 'custom';
  target_folder?: string;
  rules?: OrganizationRule[];
  dry_run?: boolean;
}

export interface OrganizationChange {
  file_path: string;
  current_location: string;
  suggested_location: string;
  reason: string;
  confidence: number;
}

export interface VaultOrganizeResponse {
  success: boolean;
  changes: OrganizationChange[];
  total_files_affected: number;
  estimated_time: string;
  backup_recommended: boolean;
}

export interface VaultAnalytics {
  total_files: number;
  total_folders: number;
  file_types: Record<string, number>;
  largest_files: Array<{path: string; size: number}>;
  recent_files: Array<{path: string; modified: string}>;
  tag_usage: Record<string, number>;
  orphaned_files: string[];
  duplicate_content: Array<{files: string[]; similarity: number}>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
