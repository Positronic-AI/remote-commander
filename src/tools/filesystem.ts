import { httpClient } from '../http-client.js';

// Keep the same types and interfaces as the original
export interface FileResult {
    content: string;
    mimeType: string;
    isImage: boolean;
}

export interface MultiFileResult {
    path: string;
    content?: string;
    mimeType?: string;
    isImage?: boolean;
    error?: string;
}

/**
 * Placeholder for path validation - now handled by HTTP client
 */
export async function validatePath(inputPath: string): Promise<string> {
    // Path validation is now handled by the HTTP client
    return inputPath;
}

/**
 * Read file from URL (keep original functionality for URLs)
 */
export async function readFileFromUrl(url: string, timeout: number = 30000): Promise<FileResult> {
    // For URLs, we still use the original implementation
    // TODO: Could proxy through API if needed
    throw new Error('URL reading not implemented in remote commander. Please use local paths only.');
}

/**
 * Read file from remote server via API
 */
export async function readFileFromDisk(
    filePath: string,
    offset: number = 0,
    length: number = 1000
): Promise<FileResult> {
    await httpClient.init();
    
    const response = await httpClient.readFile({
        path: filePath,
        offset,
        length
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to read file');
    }

    return {
        content: response.data || '',
        mimeType: 'text/plain',
        isImage: false
    };
}

/**
 * Main read file function - routes to remote API
 */
export async function readFile(
    path: string,
    isUrl: boolean = false,
    offset: number = 0,
    length: number = 1000
): Promise<FileResult> {
    if (isUrl) {
        return readFileFromUrl(path);
    }
    
    return readFileFromDisk(path, offset, length);
}

/**
 * Internal read file function (alias for readFile)
 */
export async function readFileInternal(
    filePath: string,
    offset: number = 0,
    length: number = 1000
): Promise<string> {
    const result = await readFile(filePath, false, offset, length);
    return result.content;
}

/**
 * Write file via remote API
 */
export async function writeFile(
    path: string,
    content: string,
    mode: 'rewrite' | 'append' = 'rewrite'
): Promise<void> {
    await httpClient.init();
    
    const response = await httpClient.writeFile({
        path,
        content,
        mode
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to write file');
    }
}

/**
 * Read multiple files via remote API
 */
export async function readMultipleFiles(paths: string[]): Promise<MultiFileResult[]> {
    const results: MultiFileResult[] = [];
    
    // Read files sequentially for now
    // TODO: Could optimize with parallel requests
    for (const filePath of paths) {
        try {
            const fileResult = await readFile(filePath);
            results.push({
                path: filePath,
                content: fileResult.content,
                mimeType: fileResult.mimeType,
                isImage: fileResult.isImage
            });
        } catch (error) {
            results.push({
                path: filePath,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return results;
}

/**
 * Create directory via remote API
 */
export async function createDirectory(path: string): Promise<void> {
    await httpClient.init();
    
    const response = await httpClient.createDirectory({ path });

    if (!response.success) {
        throw new Error(response.error || 'Failed to create directory');
    }
}

/**
 * List directory via remote API
 */
export async function listDirectory(path: string): Promise<string[]> {
    await httpClient.init();
    
    const response = await httpClient.listDirectory({ path });

    if (!response.success) {
        throw new Error(response.error || 'Failed to list directory');
    }

    return response.data || [];
}

/**
 * Move/rename file via remote API
 */
export async function moveFile(source: string, destination: string): Promise<void> {
    // TODO: Implement move file endpoint in API
    throw new Error('Move file not yet implemented in remote commander');
}

/**
 * Search files via remote API
 */
export async function searchFiles(
    path: string,
    pattern: string,
    timeoutMs: number = 30000
): Promise<string[]> {
    await httpClient.init();
    
    const response = await httpClient.searchFiles({
        path,
        pattern,
        timeoutMs
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to search files');
    }

    return response.data || [];
}

/**
 * Get file info via remote API
 */
export async function getFileInfo(path: string): Promise<any> {
    await httpClient.init();
    
    const response = await httpClient.getFileInfo({ path });

    if (!response.success) {
        throw new Error(response.error || 'Failed to get file info');
    }

    return response.data;
}

/**
 * Search code via remote API
 */
export async function searchCode(
    path: string,
    pattern: string,
    options: {
        contextLines?: number;
        filePattern?: string;
        ignoreCase?: boolean;
        includeHidden?: boolean;
        maxResults?: number;
        timeoutMs?: number;
    } = {}
): Promise<any> {
    await httpClient.init();
    
    const response = await httpClient.searchCode({
        path,
        pattern,
        ...options
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to search code');
    }

    return response.data;
}

/**
 * Edit block via remote API
 */
export async function editBlock(
    filePath: string,
    oldString: string,
    newString: string,
    expectedReplacements: number = 1
): Promise<any> {
    await httpClient.init();
    
    const response = await httpClient.editBlock({
        file_path: filePath,
        old_string: oldString,
        new_string: newString,
        expected_replacements: expectedReplacements
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to edit block');
    }

    return response.data;
}
