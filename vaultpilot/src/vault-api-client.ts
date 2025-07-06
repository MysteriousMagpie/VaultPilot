/**
 * API Client Extensions for VaultPilot Vault Management
 */

import { Notice } from 'obsidian';
import {
  VaultStructureRequest,
  VaultStructureResponse,
  FileOperationRequest,
  FileOperationResponse,
  BatchFileOperationRequest,
  BatchFileOperationResponse,
  VaultSearchRequest,
  VaultSearchResponse,
  VaultOrganizationRequest,
  VaultOrganizationResponse,
  VaultBackupRequest,
  VaultBackupResponse,
  VaultManagementError,
  VaultManagementAPI
} from './vault-types';

/**
 * Vault Management API Client
 */
export class VaultManagementClient implements VaultManagementAPI {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // === CORE API METHODS ===

  /**
   * Get comprehensive vault structure with AI analysis
   */
  async getVaultStructure(request: VaultStructureRequest): Promise<VaultStructureResponse> {
    try {
      const response = await this.makeRequest('/api/obsidian/vault/structure', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (response.status === 404) {
        // Endpoint not implemented - return empty structure
        return {
          vault_name: 'Vault',
          total_files: 0,
          total_folders: 0,
          total_size: 0,
          structure: { name: 'vault', type: 'folder', path: '/', children: [] },
          recent_files: [],
          orphaned_files: []
        };
      }

      if (!response.ok) {
        throw new VaultManagementError(
          `Failed to get vault structure: ${response.statusText}`,
          'STRUCTURE_FETCH_FAILED',
          'structure'
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof VaultManagementError) {
        throw error;
      }
      this.handleVaultManagementError(error, 'structure');
      throw error;
    }
  }

  /**
   * Perform individual file operation (create, update, delete, move, copy)
   */
  async performFileOperation(request: FileOperationRequest): Promise<FileOperationResponse> {
    try {
      this.validateFileOperationRequest(request);

      const response = await this.makeRequest('/api/obsidian/vault/file/operation', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new VaultManagementError(
          `File operation failed: ${response.statusText}`,
          'FILE_OPERATION_FAILED',
          'file-operations'
        );
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new VaultManagementError(
          result.message || 'File operation failed',
          'FILE_OPERATION_FAILED',
          'file-operations'
        );
      }

      return result;
    } catch (error) {
      this.handleVaultManagementError(error, 'file-operations');
      throw error;
    }
  }

  /**
   * Perform multiple file operations efficiently
   */
  async performBatchOperations(request: BatchFileOperationRequest): Promise<BatchFileOperationResponse> {
    try {
      if (!request.operations || request.operations.length === 0) {
        throw new VaultManagementError(
          'No operations specified for batch request',
          'INVALID_BATCH_REQUEST',
          'batch-operations'
        );
      }

      // Validate each operation
      request.operations.forEach((op, index) => {
        try {
          this.validateFileOperationRequest(op);
        } catch (err: any) {
          throw new VaultManagementError(
            `Invalid operation at index ${index}: ${err.message || err}`,
            'INVALID_BATCH_OPERATION',
            'batch-operations'
          );
        }
      });

      const response = await this.makeRequest('/api/obsidian/vault/file/batch', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new VaultManagementError(
          `Batch operations failed: ${response.statusText}`,
          'BATCH_OPERATION_FAILED',
          'batch-operations'
        );
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new VaultManagementError(
          result.message || 'Batch operations failed',
          'BATCH_OPERATION_FAILED',
          'batch-operations'
        );
      }

      return result;
    } catch (error) {
      this.handleVaultManagementError(error, 'batch-operations');
      throw error;
    }
  }

  /**
   * Search vault with AI-powered insights
   */
  async searchVault(request: VaultSearchRequest): Promise<VaultSearchResponse> {
    try {
      if (!request.query || request.query.trim().length === 0) {
        throw new VaultManagementError(
          'Search query cannot be empty',
          'INVALID_SEARCH_QUERY',
          'search'
        );
      }

      const response = await this.makeRequest('/api/obsidian/vault/search', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new VaultManagementError(
          `Search failed: ${response.statusText}`,
          'SEARCH_FAILED',
          'search'
        );
      }

      return await response.json();
    } catch (error) {
      this.handleVaultManagementError(error, 'search');
      throw error;
    }
  }

  /**
   * Get AI-powered vault organization suggestions
   */
  async organizeVault(request: VaultOrganizationRequest): Promise<VaultOrganizationResponse> {
    try {
      const response = await this.makeRequest('/api/obsidian/vault/organize', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new VaultManagementError(
          `Organization analysis failed: ${response.statusText}`,
          'ORGANIZATION_FAILED',
          'organization'
        );
      }

      return await response.json();
    } catch (error) {
      this.handleVaultManagementError(error, 'organization');
      throw error;
    }
  }

  /**
   * Create vault backup
   */
  async backupVault(request: VaultBackupRequest): Promise<VaultBackupResponse> {
    try {
      const response = await this.makeRequest('/api/obsidian/vault/backup', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new VaultManagementError(
          `Backup failed: ${response.statusText}`,
          'BACKUP_FAILED',
          'backup'
        );
      }

      return await response.json();
    } catch (error) {
      this.handleVaultManagementError(error, 'backup');
      throw error;
    }
  }

  // === CONVENIENCE METHODS ===

  /**
   * Create a new file with content
   */
  async createFile(filePath: string, content: string, backup: boolean = false): Promise<FileOperationResponse> {
    return this.performFileOperation({
      operation: 'create',
      file_path: filePath,
      content,
      backup
    });
  }

  /**
   * Update existing file content
   */
  async updateFile(filePath: string, content: string, backup: boolean = true): Promise<FileOperationResponse> {
    return this.performFileOperation({
      operation: 'update',
      file_path: filePath,
      content,
      backup
    });
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string, backup: boolean = true): Promise<FileOperationResponse> {
    return this.performFileOperation({
      operation: 'delete',
      file_path: filePath,
      backup
    });
  }

  /**
   * Move a file to new location
   */
  async moveFile(fromPath: string, toPath: string, backup: boolean = true): Promise<FileOperationResponse> {
    return this.performFileOperation({
      operation: 'move',
      file_path: fromPath,
      new_path: toPath,
      backup
    });
  }

  /**
   * Copy a file to new location
   */
  async copyFile(fromPath: string, toPath: string): Promise<FileOperationResponse> {
    return this.performFileOperation({
      operation: 'copy',
      file_path: fromPath,
      new_path: toPath
    });
  }

  /**
   * Quick search with default settings
   */
  async quickSearch(query: string, maxResults: number = 20): Promise<VaultSearchResponse> {
    return this.searchVault({
      query,
      search_type: 'comprehensive',
      max_results: maxResults,
      include_content: true
    });
  }

  // === HELPER METHODS ===

  /**
   * Make authenticated request to the API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl.replace(/\/$/, '')}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, requestOptions);
      return response;
    } catch (err: any) {
      throw new VaultManagementError(
        `Network request failed: ${err.message || err}`,
        'NETWORK_ERROR',
        'api'
      );
    }
  }

  /**
   * Validate file operation request
   */
  private validateFileOperationRequest(request: FileOperationRequest): void {
    if (!request.file_path || request.file_path.trim().length === 0) {
      throw new VaultManagementError(
        'File path is required',
        'INVALID_FILE_PATH',
        'validation'
      );
    }

    if (request.operation === 'move' || request.operation === 'copy') {
      if (!request.new_path || request.new_path.trim().length === 0) {
        throw new VaultManagementError(
          'New path is required for move/copy operations',
          'INVALID_NEW_PATH',
          'validation'
        );
      }
    }

    if (request.operation === 'create' || request.operation === 'update') {
      if (request.content === undefined) {
        throw new VaultManagementError(
          'Content is required for create/update operations',
          'INVALID_CONTENT',
          'validation'
        );
      }
    }
  }

  /**
   * Handle vault management errors with user feedback
   */
  private handleVaultManagementError(error: any, feature: string): void {
    console.error(`Vault management error in ${feature}:`, error);
    
    if (error instanceof VaultManagementError) {
      new Notice(`Vault ${feature} error: ${error.message}`, 5000);
    } else {
      new Notice(`Vault ${feature} operation failed`, 3000);
    }
  }

  /**
   * Test connection to vault management endpoints
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try a simple vault structure request with minimal parameters
      const response = await this.makeRequest('/api/obsidian/vault/structure', {
        method: 'POST',
        body: JSON.stringify({ include_content: false, max_depth: 1 })
      });

      if (response.ok) {
        return { success: true, message: 'Vault management connection successful' };
      } else {
        return { 
          success: false, 
          message: `Connection failed: ${response.status} ${response.statusText}` 
        };
      }
    } catch (err: any) {
      return { 
        success: false, 
        message: `Connection error: ${err.message || err}` 
      };
    }
  }
}

// === UTILITY FUNCTIONS ===

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file path format
 */
export function isValidFilePath(path: string): boolean {
  if (!path || path.trim().length === 0) return false;
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(path)) return false;
  
  // Check for reserved names on Windows
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  const fileName = path.split('/').pop() || '';
  if (reservedNames.test(fileName.split('.')[0])) return false;
  
  return true;
}

/**
 * Sanitize file path
 */
export function sanitizeFilePath(path: string): string {
  return path
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}
