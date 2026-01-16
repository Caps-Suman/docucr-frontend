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

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('access_token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

const userService = {
    getUsers: async (page: number = 1, pageSize: number = 10, search?: string): Promise<UserListResponse> => {
        const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
        if (search) params.append('search', search);
        const response = await fetch(`${API_URL}/api/users?${params}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    getUserStats: async (): Promise<UserStats> => {
        const response = await fetch(`${API_URL}/api/users/stats`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch user stats');
        return response.json();
    },

    getUser: async (id: string): Promise<User> => {
        const response = await fetch(`${API_URL}/api/users/${id}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        return response.json();
    },

    createUser: async (data: UserCreateData): Promise<User> => {
        const response = await fetch(`${API_URL}/api/users/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create user');
        }
        return response.json();
    },

    updateUser: async (id: string, data: UserUpdateData): Promise<User> => {
        const response = await fetch(`${API_URL}/api/users/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update user');
        }
        return response.json();
    },

    deleteUser: async (id: string): Promise<void> => {
        const response = await fetch(`${API_URL}/api/users/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete user');
        }
    }
};

export default userService;
