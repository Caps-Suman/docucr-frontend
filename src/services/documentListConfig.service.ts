import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface ColumnConfig {
    id: string;
    label: string;
    visible: boolean;
    order: number;
    width: number;
    type: string;
    required: boolean;
    isSystem: boolean;
    formName?: string;
}

export interface DocumentListConfigRequest {
    columns: ColumnConfig[];
    viewportWidth: number;
}

export interface DocumentListConfigResponse {
    configuration: DocumentListConfigRequest | null;
}

class DocumentListConfigService {
    async getUserConfig(): Promise<DocumentListConfigResponse> {
        const response = await apiClient(`${API_BASE_URL}/api/document-list-config`);
        if (!response.ok) {
            throw new Error('Failed to fetch document list configuration');
        }
        return response.json();
    }

    async getMyConfig(): Promise<DocumentListConfigResponse> {
        const response = await apiClient(`${API_BASE_URL}/api/document-list-config/me`);
        if (!response.ok) {
            throw new Error('Failed to fetch document list configuration');
        }
        return response.json();
    }

    async saveUserConfig(config: DocumentListConfigRequest): Promise<{ message: string; configuration: DocumentListConfigRequest }> {
        const response = await apiClient(`${API_BASE_URL}/api/document-list-config`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
        if (!response.ok) {
            throw new Error('Failed to save document list configuration');
        }
        return response.json();
    }

    async deleteUserConfig(): Promise<{ message: string }> {
        const response = await apiClient(`${API_BASE_URL}/api/document-list-config`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete document list configuration');
        }
        return response.json();
    }
}

const documentListConfigService = new DocumentListConfigService();
export default documentListConfigService;