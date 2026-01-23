import apiClient from '../utils/apiClient';
import { SOP } from '../types/sop';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper to map backend snake_case to frontend camelCase
const mapExampleToSOP = (data: any): SOP => ({
    id: data.id,
    title: data.title,
    category: data.category,
    providerType: data.provider_type,
    clientId: data.client_id,
    providerInfo: data.provider_info || {},
    workflowProcess: {
        description: data.workflow_process?.description || '',
        eligibilityPortals: data.workflow_process?.eligibilityPortals || []
    },
    postingCharges: '',
    billingGuidelines: data.billing_guidelines || [],
    codingRules: data.coding_rules || [],
    insuranceSpecific: {},
    statusId: data.status_id,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at
});

const sopService = {
    getSOPs: async (skip: number = 0, limit: number = 100): Promise<SOP[]> => {
        const response = await apiClient(`${API_URL}/api/sops?skip=${skip}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch SOPs');
        const data = await response.json();
        return data.map(mapExampleToSOP);
    },

    getSOPById: async (id: string): Promise<SOP> => {
        const response = await apiClient(`${API_URL}/api/sops/${id}`);
        if (!response.ok) throw new Error('Failed to fetch SOP');
        const data = await response.json();
        return mapExampleToSOP(data);
    },

    createSOP: async (data: any): Promise<SOP> => {
        const response = await apiClient(`${API_URL}/api/sops`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create SOP');
        }
        const responseData = await response.json();
        return mapExampleToSOP(responseData);
    },

    updateSOP: async (id: string, data: any): Promise<SOP> => {
        const response = await apiClient(`${API_URL}/api/sops/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update SOP');
        }
        const responseData = await response.json();
        return mapExampleToSOP(responseData);
    },

    deleteSOP: async (id: string): Promise<void> => {
        const response = await apiClient(`${API_URL}/api/sops/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete SOP');
    },

    toggleSOPStatus: async (id: string, statusId: number): Promise<SOP> => {
        const response = await apiClient(`${API_URL}/api/sops/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status_id: statusId })
        });
        if (!response.ok) throw new Error('Failed to update SOP status');
        const data = await response.json();
        return mapExampleToSOP(data);
    }
};

export default sopService;
