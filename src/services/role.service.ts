import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  status_id: number | null;
  statusCode: string | null;
  can_edit: boolean;
  users_count: number;
}

export interface RoleListResponse {
  roles: Role[];
  total: number;
  page: number;
  page_size: number;
}

export interface RoleCreate {
  name: string;
  description?: string;
  modules?: Array<{ module_id: string; privilege_id: string }>;
}

export interface RoleUpdate {
  name?: string;
  description?: string;
  status_id?: string;
  modules?: Array<{ module_id: string; privilege_id: string }>;
}

export interface RoleStats {
  total_roles: number;
  active_roles: number;
  inactive_roles: number;
}

class RoleService {
  async getRoles(page: number = 1, pageSize: number = 10, statusId?: string): Promise<RoleListResponse> {
    const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() });
    if (statusId) params.append('status_id', statusId);
    const response = await apiClient(`${API_BASE_URL}/api/roles?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    return response.json();
  }

  async getAssignableRoles(page: number = 1, pageSize: number = 10): Promise<RoleListResponse> {
    const response = await apiClient(`${API_BASE_URL}/api/roles/assignable?page=${page}&page_size=${pageSize}`);

    if (!response.ok) {
      throw new Error('Failed to fetch assignable roles');
    }

    return response.json();
  }

  async getRoleStats(): Promise<RoleStats> {
    const response = await apiClient(`${API_BASE_URL}/api/roles/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch role stats');
    }

    return response.json();
  }

  async getRole(roleId: string): Promise<Role> {
    const response = await apiClient(`${API_BASE_URL}/api/roles/${roleId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch role');
    }

    return response.json();
  }

  async createRole(data: RoleCreate): Promise<Role> {
    const response = await apiClient(`${API_BASE_URL}/api/roles`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create role');
    }

    return response.json();
  }

  async updateRole(roleId: string, data: RoleUpdate): Promise<Role> {
    const response = await apiClient(`${API_BASE_URL}/api/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update role');
    }

    return response.json();
  }

  async getRoleModules(roleId: string): Promise<Array<{ module_id: string; privilege_id: string }>> {
    const response = await apiClient(`${API_BASE_URL}/api/roles/${roleId}/modules`);

    if (!response.ok) {
      throw new Error('Failed to fetch role modules');
    }

    const data = await response.json();
    return data.modules;
  }

  async deleteRole(roleId: string): Promise<{ message: string }> {
    const response = await apiClient(`${API_BASE_URL}/api/roles/${roleId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete role');
    }

    return response.json();
  }
}

const roleService = new RoleService();
export default roleService;
