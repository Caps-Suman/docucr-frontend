import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Client {
  id: string;
  business_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  npi?: string;
  type?: string;
  status_id?: number;
  description?: string;
  status_code?: string;
  created_at: string;
  updated_at: string;
  is_user: boolean;
  // ✅ NEW
  address_line_1?: string;
  address_line_2?: string;
  state_code?: string;
  state_name?: string;
  zip_code?: string;
  zip_extension?: string;
}

export interface ClientStats {
    total_clients: number;
    active_clients: number;
    inactive_clients: number;
}

export interface ClientListResponse {
    clients: Client[];
    total: number;
    page: number;
    page_size: number;
}

export interface ClientCreateData {
    business_name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    npi?: string;
    is_user?: boolean;
    type?: string;
    status_id?: string; // Still allow sending code via status_id param to backend for now
    statusCode?: string;
    description?: string;
}

export interface ClientUpdateData extends ClientCreateData { }

const clientService = {
    getClients: async (page: number = 1, pageSize: number = 25, search?: string, statusId?: string): Promise<ClientListResponse> => {
        const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
        if (search) params.append('search', search);
        if (statusId) params.append('status_id', statusId);
        const response = await apiClient(`${API_URL}/api/clients?${params}`);
        if (!response.ok) throw new Error('Failed to fetch clients');
        return response.json();
    },
    getVisibleClients: async (): Promise<Client[]> => {
        const response = await apiClient(`${API_URL}/api/clients/visible`);
        if (!response.ok) throw new Error('Failed to fetch visible clients');
        return response.json();
    },

    getClientStats: async (): Promise<ClientStats> => {
        const response = await apiClient(`${API_URL}/api/clients/stats`);
        if (!response.ok) throw new Error('Failed to fetch client stats');
        return response.json();
    },

    getClient: async (id: string): Promise<Client> => {
        const response = await apiClient(`${API_URL}/api/clients/${id}`);
        if (!response.ok) throw new Error('Failed to fetch client');
        return response.json();
    },

    createClient: async (data: ClientCreateData): Promise<Client> => {
        const response = await apiClient(`${API_URL}/api/clients/`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create client');
        }
        return response.json();
    },

    updateClient: async (id: string, data: ClientUpdateData): Promise<Client> => {
        const response = await apiClient(`${API_URL}/api/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.message || 'Failed to update client');
        }
        return response.json();
    },

    activateClient: async (id: string): Promise<Client> => {
        const response = await apiClient(`${API_URL}/api/clients/${id}/activate`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to activate client');
        return response.json();
    },

    deactivateClient: async (id: string): Promise<Client> => {
        const response = await apiClient(`${API_URL}/api/clients/${id}/deactivate`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to deactivate client');
        return response.json();
    },

    assignClientsToUser: async (userId: string, clientIds: string[], assignedBy: string): Promise<void> => {
        const response = await apiClient(`${API_URL}/api/clients/users/${userId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ client_ids: clientIds, assigned_by: assignedBy })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to assign clients');
        }
    },

    getUserClients: async (userId: string): Promise<Client[]> => {
        const response = await apiClient(`${API_URL}/api/clients/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user clients');
        return response.json();
    },

    getClientUsers: async (clientId: string): Promise<Array<{ id: string; username: string; name: string }>> => {
        const response = await apiClient(`${API_URL}/api/clients/${clientId}/users`);
        if (!response.ok) throw new Error('Failed to fetch client users');
        return response.json();
    },
    getMyClient: async (): Promise<Client> => {
    const response = await apiClient(`${API_URL}/api/clients/me`);
    if (!response.ok) throw new Error('Failed to fetch client for user');
    return response.json();
},
    createClientsFromBulk: async (clients: ClientCreateData[]): Promise<{ success: number; failed: number; errors: string[] }> => {
        const response = await apiClient(`${API_URL}/api/clients/bulk`, {
            method: 'POST',
            body: JSON.stringify({ clients })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create clients from bulk');
        }
        return response.json();
    }
};

export default clientService;
