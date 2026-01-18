import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface User {
    id: string;
    email: string;
    username: string;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    status_id: string | null;
    is_superuser: boolean;
    roles: Array<{ id: string; name: string }>;
    supervisor_id: string | null;
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

const userService = {
    getUsers: async (page: number = 1, pageSize: number = 10, search?: string, statusId?: string): Promise<UserListResponse> => {
        const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
        if (search) params.append('search', search);
        if (statusId) params.append('status_id', statusId);
        const response = await apiClient(`${API_URL}/api/users?${params}`);
        if (!response.ok) throw new Error('Failed to fetch users');
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
    }
};

export default userService;
