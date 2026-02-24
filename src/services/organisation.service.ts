import { fetchWithAuth } from '../utils/api';

export interface Organisation {
    id: string;
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    name: string; // Now mapping to backend column
    phone_country_code?: string;
    phone_number?: string;
    status_id?: number;
    statusCode?: string;
    created_at?: string;
    updated_at?: string;
}

export interface OrganisationStats {
    total_organisations: number;
    active_organisations: number;
    inactive_organisations: number;
}

export interface OrganisationListResponse {
    organisations: Organisation[];
    total: number;
    page: number;
    page_size: number;
}

const organisationService = {
    getOrganisations: async (page = 1, pageSize = 25, search?: string, status_id?: string): Promise<OrganisationListResponse> => {
        let url = `/api/organisations?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status_id) url += `&status_id=${status_id}`;

        const response = await fetchWithAuth(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch organisations');
        }

        return response.json();
    },

    getOrganisationStats: async (): Promise<OrganisationStats> => {
        const response = await fetchWithAuth('/api/organisations/stats', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        return response.json();
    },

    createOrganisation: async (data: any): Promise<Organisation> => {
        const response = await fetchWithAuth('/api/organisations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create organisation');
        }

        return response.json();
    },
    getOrganisationById: async (id: string): Promise<Organisation> => {
    const response = await fetchWithAuth(`/api/organisations/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to fetch organisation");
    }

    return response.json();
},
    updateOrganisation: async (id: string, data: any): Promise<Organisation> => {
        const response = await fetchWithAuth(`/api/organisations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update organisation');
        }

        return response.json();
    },

    deactivateOrganisation: async (id: string): Promise<any> => {
        const response = await fetchWithAuth(`/api/organisations/${id}/deactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to deactivate organisation');
        }

        return response.json();
    },

    activateOrganisation: async (id: string): Promise<any> => {
        const response = await fetchWithAuth(`/api/organisations/${id}/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to activate organisation');
        }

        return response.json();
    },
    selectOrganisation: async (org_id: string) => {
    const response = await fetchWithAuth(
        `/api/organisations/select-organisation/${org_id}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to select organisation");
    }

    return response.json();
},
};

export default organisationService;
