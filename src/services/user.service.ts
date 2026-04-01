import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface UserUploadImportFileResponse {
    history_id: string;
    s3_key: string;
    message: string;
}

export interface UserImportHistoryItem {
    id: string;
    created_at: string;
    original_filename: string;
    file_size_bytes: number | null;
    user_type: string;
    client_id: string | null;
    client_name: string | null;
    s3_key: string | null;
    status: 'pending' | 'uploaded' | 'processing' | 'completed' | 'failed';
    total_rows: number | null;
    success_count: number | null;
    failed_count: number | null;
    errors: string[] | null;
}

export interface UserImportHistoryList {
    items: UserImportHistoryItem[];
    total: number;
}

export interface UserPatchOutcomePayload {
    status: string;
    total_rows: number;
    success_count: number;
    failed_count: number;
    errors: string[];
}
export interface User {
    id: string;
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    phone_country_code?: string;
    phone_number?: string;
    status_id?: number | string;
    statusCode?: string;
    is_superuser: boolean;
    roles: Array<{ id: string; name: string }>;
    supervisor_id?: string;
    client_count?: number;
    created_by_name?: string;
    organisation_name?: string;
    client_id?: string;
    client_name?: string;
    profile_image_url?: string;
}

export interface UserStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    admin_users: number;
}

export interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    page_size: number;
}

export interface UserCreateData {
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    password: string;
    role_ids: string[];
    supervisor_id?: string;
}

export interface UserUpdateData {
    email?: string;
    username?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    status_id?: string;
    role_ids?: string[];
    supervisor_id?: string;
}
export interface BulkUserRow {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    password: string;
    middle_name?: string;
    phone_country_code?: string;
    phone_number?: string;
    role_ids?: string[];
    supervisor_id?: string;
}

export interface BulkUserUploadRequest {
    user_type: "internal" | "client";
    client_id?: string;
    users: BulkUserRow[];
}

export interface BulkUserUploadResponse {
    created: number;
    failed: number;
    failed_rows: {
        row_index: number;
        email?: string;
        error: string;
    }[];
    errors: string[];
}
const userService = {
    getUsers: async (
        page: number = 1,
        pageSize: number = 25,
        search?: string,
        statusId?: string | string[],
        roleId?: string | string[],
        organisationId?: string | string[],
        clientId?: string | string[],
        createdBy?: string | string[],
        isClient?: boolean
    ): Promise<UserListResponse> => {
        const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
        if (search) params.append('search', search);
        if (isClient !== undefined) params.append('is_client', isClient.toString());

        const appendParam = (key: string, value?: string | string[]) => {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v));
            } else {
                params.append(key, value);
            }
        };
            
        appendParam('status_id', statusId);
        appendParam('role_id', roleId);
        appendParam('organisation_id', organisationId);
        appendParam('client_id', clientId);
        appendParam('created_by', createdBy);

        const response = await apiClient(`${API_URL}/api/users?${params}`);
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },
    bulkCreateUsers: async (
    data: BulkUserUploadRequest
): Promise<BulkUserUploadResponse> => {
    const response = await apiClient(`${API_URL}/api/users/bulk`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to bulk create users');
    }

    return response.json();
},
    getUserStats: async (): Promise<UserStats> => {
        const response = await apiClient(`${API_URL}/api/users/stats`);
        if (!response.ok) throw new Error('Failed to fetch user stats');
        return response.json();
    },

    getUser: async (id: string): Promise<User> => {
        const response = await apiClient(`${API_URL}/api/users/${id}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        return response.json();
    },
    async getUsersByRole(roleId: string): Promise<
        { id: string; first_name: string; last_name: string; username: string }[]
    > {
        const response = await apiClient(
            `${API_URL}/api/users/by-role?role_id=${encodeURIComponent(roleId)}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch users by role');
        }

        return response.json();
    },
    /*
  Add these four methods to your existing userService object.
  They mirror the exact same pattern as clientService's import methods.
*/

// ── Types ─────────────────────────────────────────────────────────────────────


// ── Method 1: Upload CSV to S3 ────────────────────────────────────────────────
//
// Sends the File as multipart/form-data.
// IMPORTANT: do NOT set Content-Type — the browser sets it with the boundary.

uploadUserImportFile: async (
    file: File,
    userType: 'internal' | 'client',
    clientId?: string,
    clientName?: string,
): Promise<UserUploadImportFileResponse> => {
    const formData = new FormData();
    formData.append('file',      file);
    formData.append('user_type', userType);
    if (clientId)   formData.append('client_id',   clientId);
    if (clientName) formData.append('client_name', clientName);

    const response = await apiClient(`${API_URL}/api/users/import/upload`, {
        method: 'POST',
        // No Content-Type header — browser sets multipart/form-data with boundary
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.detail ?? `Upload failed (${response.status})`);
    }
    return response.json();
},

// ── Method 2: Patch history record with outcome ───────────────────────────────

patchUserImportOutcome: async (
    historyId: string,
    payload: UserPatchOutcomePayload,
): Promise<void> => {
    const response = await apiClient(`${API_URL}/api/users/import/history/${historyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        console.warn('Could not patch user import history:', await response.text().catch(() => ''));
    }
},

// ── Method 3: List import history ────────────────────────────────────────────

getUserImportHistory: async (page = 1, pageSize = 20): Promise<UserImportHistoryList> => {
    const response = await apiClient(
        `${API_URL}/api/users/import/history?page=${page}&page_size=${pageSize}`,
    );
    if (!response.ok) throw new Error(`Failed to fetch user import history (${response.status})`);
    return response.json();
},

// ── Method 4: Presigned download URL ─────────────────────────────────────────

getUserImportDownloadUrl: async (
    historyId: string,
): Promise<{ download_url: string; expires_in_seconds: number }> => {
    const response = await apiClient(
        `${API_URL}/api/users/import/${historyId}/download`,
    );
    if (!response.ok) throw new Error(`Failed to get download URL (${response.status})`);
    return response.json();
},
    getCreators: async (
        search?: string,
        organisationId?: string | string[],
        clientId?: string | string[]
    ): Promise<{ id: string; first_name: string; last_name: string; username: string; organisation_name?: string }[]> => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);

        const appendParam = (key: string, value?: string | string[]) => {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v));
            } else {
                params.append(key, value);
            }
        };

        appendParam('organisation_id', organisationId);
        appendParam('client_id', clientId);

        const response = await apiClient(`${API_URL}/api/users/creators?${params}`);
        if (!response.ok) throw new Error('Failed to fetch creators');
        return response.json();
    },


    createUser: async (data: UserCreateData): Promise<User> => {
        const response = await apiClient(`${API_URL}/api/users/`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create user');
        }
        return response.json();
    },

    updateUser: async (id: string, data: UserUpdateData): Promise<User> => {
        const response = await apiClient(`${API_URL}/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update user');
        }
        return response.json();
    },

    activateUser: async (id: string): Promise<User> => {
        const response = await apiClient(`${API_URL}/api/users/${id}/activate`, {
            method: 'POST'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to activate user');
        }
        return response.json();
    },

    deactivateUser: async (id: string): Promise<User> => {
        const response = await apiClient(`${API_URL}/api/users/${id}/deactivate`, {
            method: 'POST'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to deactivate user');
        }
        return response.json();
    },

    getUserClients: async (userId: string): Promise<any[]> => {
        const response = await apiClient(`${API_URL}/api/users/${userId}/clients`);
        if (!response.ok) throw new Error('Failed to fetch user clients');
        return response.json();
    },

    mapUserClients: async (userId: string, clientIds: string[], assignedBy: string): Promise<void> => {
        const response = await apiClient(`${API_URL}/api/users/${userId}/clients`, {
            method: 'POST',
            body: JSON.stringify({ client_ids: clientIds, assigned_by: assignedBy })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to map clients');
        }
    },

    unassignUserClients: async (userId: string, clientIds: string[]): Promise<void> => {
        const response = await apiClient(`${API_URL}/api/users/unassign-clients`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, client_ids: clientIds })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to unassign clients');
        }
    }
};

export default userService;
