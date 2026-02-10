import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface ClientLocation {
    id: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state_code: string;
    state_name?: string;
    country?: string;
    zip_code: string;
    is_primary: boolean;
}

export interface Provider {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    npi: string;
    location_id?: string; // or linked location
    created_at?: string;
}

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
    // NEW
    address_line_1?: string;
    address_line_2?: string;
    state_code?: string;
    state_name?: string;
    zip_code?: string;
    country?:string;
    city?:string;
    user_count?: number;
    provider_count?: number;

    // Detailed Edit Fields
    locations?: ClientLocation[];
    providers?: Provider[];

    organisation_name?: string;
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

export interface ProviderListResponse {
    providers: Provider[];
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
    // ADDRESS
    address_line_1?: string;
    address_line_2?: string;
    state_code?: string;
    state_name?: string;
    zip_code?: string;
    zip_extension?: string;
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
   addProviders: async (
    clientId: string,
    providers: {
        first_name: string;
        middle_name?: string;
        last_name: string;
        npi: string;
        address_line_1: string;
        address_line_2?: string;
        city: string;
        state_code: string;
        zip_code: string;
        country?: string;
    }[]
): Promise<void> => {
    const response = await apiClient(
        `${API_URL}/api/clients/${clientId}/providers`,
        {
            method: "POST",
            body: JSON.stringify(providers),
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to add providers");
    }
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

    mapClientUsers: async (clientId: string, userIds: string[], assignedBy: string): Promise<void> => {
        const response = await apiClient(`${API_URL}/api/clients/${clientId}/users/map`, {
            method: 'POST',
            body: JSON.stringify({ user_ids: userIds, assigned_by: assignedBy })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to map users');
        }
    },

    unassignClientUsers: async (clientId: string, userIds: string[]): Promise<void> => {
        const response = await apiClient(`${API_URL}/api/clients/${clientId}/users/unassign`, {
            method: 'POST',
            body: JSON.stringify({ user_ids: userIds })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to unassign users');
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
            let errorMessage = 'Failed to create clients from bulk';

            if (error.detail) {
                if (Array.isArray(error.detail)) {
                    errorMessage = error.detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join(', ');
                } else {
                    errorMessage = error.detail;
                }
            }
            throw new Error(errorMessage);
        }
        return response.json();
    },
    lookupNPI: async (npi: string): Promise<any> => {
        const response = await apiClient(`${API_URL}/api/clients/npi-lookup/${npi}`);
        if (!response.ok) throw new Error('Failed to fetch NPI details');
        return response.json();
    },
    checkExistingNPIs: async (npis: string[]): Promise<string[]> => {
        const response = await apiClient(`${API_URL}/api/clients/check-npis`, {
            method: 'POST',
            body: JSON.stringify({ npis })
        });
        if (!response.ok) throw new Error('Failed to check existing NPIs');
        const data = await response.json();
        return data.existing_npis;
    },

    getClientProviders: async (clientId: string, page: number = 1, pageSize: number = 10, search?: string): Promise<ProviderListResponse> => {
        const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
        if (search) params.append('search', search);

        const response = await apiClient(`${API_URL}/api/clients/${clientId}/providers?${params}`);
        if (!response.ok) throw new Error('Failed to fetch client providers');
        return response.json();
    },
    getAllClients: async (): Promise<{ id: string; name: string; npi: string; type: string }[]> => {
        const response = await apiClient(`${API_URL}/api/clients/all`);
        if (!response.ok) throw new Error('Failed to fetch clients for SOP');
        return response.json();
    }
};

export default clientService;
