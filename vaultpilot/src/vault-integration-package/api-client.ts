// API client for EvoAgentX vault management
// Copy to your VaultPilot plugin src/ directory

import { requestUrl, RequestUrlParam } from 'obsidian';
import {
  VaultStructureResponse,
  BatchFileOperationsRequest,
  BatchOperationsResponse,
  SmartSearchRequest,
  SmartSearchResponse,
  VaultOrganizeRequest,
  VaultOrganizeResponse,
  VaultAnalytics,
  ApiResponse
} from './types';

export class EvoAgentXVaultClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = 'http://localhost:8000', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const params: RequestUrlParam = {
        url: `${this.baseUrl}${endpoint}`,
        method,
        headers,
      };

      if (body && method !== 'GET') {
        params.body = JSON.stringify(body);
      }

      const response = await requestUrl(params);
      
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.json,
      };
    } catch (error) {
      console.error('EvoAgentX API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get vault structure
  async getVaultStructure(): Promise<ApiResponse<VaultStructureResponse>> {
    return this.makeRequest<VaultStructureResponse>('/api/obsidian/vault/structure');
  }

  // Perform batch file operations
  async performBatchOperations(
    request: BatchFileOperationsRequest
  ): Promise<ApiResponse<BatchOperationsResponse>> {
    return this.makeRequest<BatchOperationsResponse>(
      '/api/obsidian/vault/files/operations',
      'POST',
      request
    );
  }

  // Smart search across vault
  async smartSearch(
    request: SmartSearchRequest
  ): Promise<ApiResponse<SmartSearchResponse>> {
    return this.makeRequest<SmartSearchResponse>(
      '/api/obsidian/vault/search/smart',
      'POST',
      request
    );
  }

  // Organize vault content
  async organizeVault(
    request: VaultOrganizeRequest
  ): Promise<ApiResponse<VaultOrganizeResponse>> {
    return this.makeRequest<VaultOrganizeResponse>(
      '/api/obsidian/vault/organize',
      'POST',
      request
    );
  }

  // Get vault analytics
  async getVaultAnalytics(): Promise<ApiResponse<VaultAnalytics>> {
    return this.makeRequest<VaultAnalytics>('/api/obsidian/vault/analytics');
  }

  // Test connection to EvoAgentX
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/health');
      return response.success;
    } catch {
      return false;
    }
  }

  // Update configuration
  updateConfig(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }
}
