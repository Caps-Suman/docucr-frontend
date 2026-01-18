import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    events: string[];
    is_active: boolean;
    secret?: string;
    created_at?: string;
}

class WebhookService {
    async getWebhooks(): Promise<WebhookConfig[]> {
        const response = await apiClient(`${API_BASE_URL}/api/webhooks/`);
        if (!response.ok) {
            throw new Error('Failed to fetch webhooks');
        }
        return response.json();
    }

    async createWebhook(data: Partial<WebhookConfig>): Promise<WebhookConfig> {
        const response = await apiClient(`${API_BASE_URL}/api/webhooks/`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Failed to create webhook');
        }
        return response.json();
    }

    async updateWebhook(id: string, data: Partial<WebhookConfig>): Promise<WebhookConfig> {
        const response = await apiClient(`${API_BASE_URL}/api/webhooks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Failed to update webhook');
        }
        return response.json();
    }

    async deleteWebhook(id: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/webhooks/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete webhook');
        }
    }
}

const webhookService = new WebhookService();
export default webhookService;
