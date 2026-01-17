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
    async uploadDocuments(files: File[]): Promise<DocumentUploadResponse[]> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

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

    async getDocuments(skip: number = 0, limit: number = 100): Promise<Document[]> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/?skip=${skip}&limit=${limit}`);

        if (!response.ok) {
            throw new Error('Failed to fetch documents');
        }

        return response.json();
    }

    async deleteDocument(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete document');
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
}

export default new DocumentService();