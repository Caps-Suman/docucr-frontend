import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface DocumentType {
    id: string;
    name: string;
    description?: string;
    status_id?: string;
    created_at?: string;
}

export interface DocumentTypeListResponse {
    document_types: DocumentType[];
    total: number;
    page: number;
    page_size: number;
}

const documentTypeService = {
    getDocumentTypes: async (page: number = 1, pageSize: number = 100): Promise<DocumentTypeListResponse> => {
        const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
        const response = await apiClient(`${API_URL}/api/document-types?${params}`);
        if (!response.ok) throw new Error('Failed to fetch document types');
        return response.json();
    },

    getActiveDocumentTypes: async (): Promise<DocumentType[]> => {
        const response = await apiClient(`${API_URL}/api/document-types/active`);
        if (!response.ok) throw new Error('Failed to fetch active document types');
        return response.json();
    },

    activateDocumentType: async (id: string): Promise<DocumentType> => {
        const response = await apiClient(`${API_URL}/api/document-types/${id}/activate`, {
            method: 'PATCH'
        });
        if (!response.ok) throw new Error('Failed to activate document type');
        return response.json();
    },

    deactivateDocumentType: async (id: string): Promise<DocumentType> => {
        const response = await apiClient(`${API_URL}/api/document-types/${id}/deactivate`, {
            method: 'PATCH'
        });
        if (!response.ok) throw new Error('Failed to deactivate document type');
        return response.json();
    }
};

export default documentTypeService;