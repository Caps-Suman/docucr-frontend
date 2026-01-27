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
    getSOPs: async (skip: number = 0, limit: number = 100, search?: string, statusId?: number): Promise<{ sops: SOP[]; total: number }> => {
        let url = `${API_URL}/api/sops?skip=${skip}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (statusId) url += `&status_id=${statusId}`;

        const response = await apiClient(url);
        if (!response.ok) throw new Error('Failed to fetch SOPs');
        const data = await response.json();
        return {
            sops: data.sops.map(mapExampleToSOP),
            total: data.total
        };
    },
    getSOPStats: async (): Promise<{
    totalSOPs: number;
    activeSOPs: number;
    inactiveSOPs: number;
}> => {
    const response = await apiClient(`${API_URL}/api/sops/stats`);
    if (!response.ok) throw new Error('Failed to fetch SOP stats');
    const data = await response.json();

    return {
        totalSOPs: data.total_sops,
        activeSOPs: data.active_sops,
        inactiveSOPs: data.inactive_sops
    };
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
    },

    downloadSOPPDF: async (id: string, title: string): Promise<void> => {
        const response = await apiClient(`${API_URL}/api/sops/${id}/pdf`);
        if (!response.ok) throw new Error('Failed to download PDF');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};

export default sopService;
