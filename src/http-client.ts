import fetch from 'cross-fetch';
import { configManager } from './config-manager.js';

export interface HttpClientConfig {
  serverUrl: string;
  authUrl?: string;
  authToken: string;
  basePath: string;
  username?: string;
  password?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileReadRequest {
  path: string;
  offset?: number;
  length?: number;
  isUrl?: boolean;
}

export interface FileWriteRequest {
  path: string;
  content: string;
  mode?: 'rewrite' | 'append';
}

export interface DirectoryListRequest {
  path: string;
}

export interface FileSearchRequest {
  path: string;
  pattern: string;
  timeoutMs?: number;
}

export interface CodeSearchRequest {
  path: string;
  pattern: string;
  contextLines?: number;
  filePattern?: string;
  ignoreCase?: boolean;
  includeHidden?: boolean;
  maxResults?: number;
  timeoutMs?: number;
}

export interface CreateDirectoryRequest {
  path: string;
}

export interface GetFileInfoRequest {
  path: string;
}

export interface EditBlockRequest {
  file_path: string;
  old_string: string;
  new_string: string;
  expected_replacements?: number;
}

/**
 * HTTP client for communicating with lit-server API
 */
export class HttpClient {
  private config: HttpClientConfig | null = null;

  /**
   * Initialize HTTP client with configuration
   */
  async init(): Promise<void> {
    const serverConfig = await configManager.getConfig();
    
    if (!serverConfig.serverUrl || !serverConfig.basePath) {
      throw new Error('HTTP client configuration incomplete. Please set serverUrl and basePath in config.');
    }

    this.config = {
      serverUrl: serverConfig.serverUrl,
      authUrl: serverConfig.authUrl,
      authToken: serverConfig.authToken || '',
      basePath: serverConfig.basePath,
      username: serverConfig.username,
      password: serverConfig.password
    };

    // If we have username/password but no auth token, try to get one
    if (!this.config.authToken && this.config.username && this.config.password) {
      await this.authenticate();
    }
  }

  /**
   * Authenticate with Keycloak to get bearer token
   */
  private async authenticate(): Promise<void> {
    if (!this.config || !this.config.username || !this.config.password) {
      throw new Error('Username and password required for authentication');
    }

    try {
      // Keycloak token endpoint - LIT realm with lit-api client
      const authUrl = (await configManager.getConfig()).authUrl || 'http://localhost:8080';
      const tokenUrl = `${authUrl}/realms/LIT/protocol/openid-connect/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'lit-app',
          username: this.config.username,
          password: this.config.password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Keycloak authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();
      this.config.authToken = tokenData.access_token;
      
      console.log('Successfully authenticated with Keycloak - token length:', this.config.authToken?.length);
    } catch (error) {
      console.error('Keycloak authentication error:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that path is within allowed basePath
   */
  private validatePath(requestPath: string): string {
    if (!this.config) {
      throw new Error('HTTP client not initialized');
    }

    // For now, just ensure path starts with basePath
    // TODO: Add more sophisticated path validation
    if (!requestPath.startsWith(this.config.basePath)) {
      return `${this.config.basePath}${requestPath.startsWith('/') ? '' : '/'}${requestPath}`;
    }
    
    return requestPath;
  }

  /**
   * Make HTTP request to API
   */
  private async makeRequest<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    if (!this.config) {
      throw new Error('HTTP client not initialized');
    }

    const url = `${this.config.serverUrl}/api/commander/${endpoint}`;
    
    console.log('Making request with token:', this.config.authToken ? 'Present' : 'Missing');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result = await response.json();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Read file via API
   */
  async readFile(request: FileReadRequest): Promise<ApiResponse<string>> {
    const validatedPath = this.validatePath(request.path);
    const response = await this.makeRequest<any>('read_file', { ...request, path: validatedPath });
    
    if (!response.success) {
      return response;
    }

    // Extract the content from the API response
    const content = response.data?.data || response.data;
    return {
      success: true,
      data: content
    };
  }

  /**
   * Write file via API
   */
  async writeFile(request: FileWriteRequest): Promise<ApiResponse<void>> {
    const validatedPath = this.validatePath(request.path);
    return this.makeRequest<void>('write_file', { ...request, path: validatedPath });
  }

  /**
   * List directory via API
   */
  async listDirectory(request: DirectoryListRequest): Promise<ApiResponse<string[]>> {
    const validatedPath = this.validatePath(request.path);
    const response = await this.makeRequest<any>('list_directory', { ...request, path: validatedPath });
    
    if (!response.success) {
      return response;
    }

    // Convert the detailed response to simple string array
    const items = response.data?.data || response.data || [];
    const itemNames = items.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item.name) return `[${item.type?.toUpperCase() || 'FILE'}] ${item.name}`;
      return String(item);
    });

    return {
      success: true,
      data: itemNames
    };
  }

  /**
   * Search files via API
   */
  async searchFiles(request: FileSearchRequest): Promise<ApiResponse<string[]>> {
    const validatedPath = this.validatePath(request.path);
    return this.makeRequest<string[]>('search_files', { ...request, path: validatedPath });
  }

  /**
   * Search code via API
   */
  async searchCode(request: CodeSearchRequest): Promise<ApiResponse<any>> {
    const validatedPath = this.validatePath(request.path);
    return this.makeRequest<any>('search_code', { ...request, path: validatedPath });
  }

  /**
   * Create directory via API
   */
  async createDirectory(request: CreateDirectoryRequest): Promise<ApiResponse<void>> {
    const validatedPath = this.validatePath(request.path);
    return this.makeRequest<void>('create_directory', { ...request, path: validatedPath });
  }

  /**
   * Get file info via API
   */
  async getFileInfo(request: GetFileInfoRequest): Promise<ApiResponse<any>> {
    const validatedPath = this.validatePath(request.path);
    return this.makeRequest<any>('get_file_info', { ...request, path: validatedPath });
  }

  /**
   * Edit block via API
   */
  async editBlock(request: EditBlockRequest): Promise<ApiResponse<any>> {
    const validatedPath = this.validatePath(request.file_path);
    return this.makeRequest<any>('edit_block', { ...request, file_path: validatedPath });
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
