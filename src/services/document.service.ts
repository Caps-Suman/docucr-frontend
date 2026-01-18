import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Document {
    id: string;
    filename: string;
    original_filename: string;
    status: string;
    file_size: number;
    upload_progress: number;
    error_message?: string;
    created_at: string;
    updated_at: string;
}

export interface DocumentUploadResponse {
    id: string;
    filename: string;
    status: string;
    file_size: number;
}

class DocumentService {
    async uploadDocuments(files: File[], aiParams?: { enableAI: boolean; documentTypeId?: string; templateId?: string; formId?: string; customFormData?: any }): Promise<DocumentUploadResponse[]> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        if (aiParams) {
            formData.append('enable_ai', String(aiParams.enableAI));
            if (aiParams.documentTypeId) formData.append('document_type_id', aiParams.documentTypeId);
            if (aiParams.templateId) formData.append('template_id', aiParams.templateId);
            if (aiParams.formId) formData.append('form_id', aiParams.formId);
            if (aiParams.customFormData) formData.append('form_data', JSON.stringify(aiParams.customFormData));
        }

        const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return response.json();
    }

    async getDocuments(filterParams?: {
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
        formFilters?: Record<string, any>;
        skip?: number;
        limit?: number;
    }): Promise<Document[]> {
        let url = `${API_BASE_URL}/api/documents/`;
        const params = new URLSearchParams();

        if (filterParams) {
            if (filterParams.status) params.append('status_id', filterParams.status);
            if (filterParams.dateFrom) params.append('date_from', filterParams.dateFrom);
            if (filterParams.dateTo) params.append('date_to', filterParams.dateTo);
            if (filterParams.search) params.append('search_query', filterParams.search);
            if (filterParams.formFilters && Object.keys(filterParams.formFilters).length > 0) {
                params.append('form_filters', JSON.stringify(filterParams.formFilters));
            }
            if (filterParams.skip !== undefined) params.append('skip', String(filterParams.skip));
            if (filterParams.limit !== undefined) params.append('limit', String(filterParams.limit));
        }

        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        const response = await apiClient(url);
        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }
        return response.json();
    }

    async getDocumentFormData(id: string): Promise<any> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/form-data`);
        if (!response.ok) {
            // It's possible there is no form data, handle gracefully or throw?
            // If 404 on the document itself, throw. If 200 with empty data, return.
            // Our backend returns {data: {}, form_id: null} if no relation, providing doc exists.
            throw new Error('Failed to fetch form data');
        }
        return response.json();
    }

    async updateDocumentFormData(id: string, data: any): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/form-data`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to update form data');
        }
    }



    async deleteDocument(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete document');
        }
    }
    async cancelDocumentAnalysis(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}/cancel`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to cancel analysis');
        }
    }

    async reanalyzeDocument(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}/reanalyze`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to start re-analysis');
        }
    }

    createWebSocketConnection(userId: string, onMessage: (data: any) => void): WebSocket {
        const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/documents/ws/${userId}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return ws;
    }

    async getDocument(id: string): Promise<any> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch document details');
        }
        return response.json();
    }

    async getDocumentPreviewUrl(id: string): Promise<string> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/preview-url`);
        if (!response.ok) {
            throw new Error('Failed to get preview URL');
        }
        const data = await response.json();
        return data.url;
    }

    async getDocumentDownloadUrl(id: string): Promise<string> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/download-url`);
        if (!response.ok) {
            throw new Error('Failed to get download URL');
        }
        const data = await response.json();
        return data.url;
    }

    async getDocumentReportUrl(id: string): Promise<string> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/report-url`);
        if (!response.ok) {
            throw new Error('Failed to get report URL');
        }
        const data = await response.json();
        return data.url;
    }
}

export default new DocumentService();