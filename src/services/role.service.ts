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

export interface ModulePermission {
  module_id?: string;
  submodule_id?: string;
  privilege_id: string;
}

export interface RoleCreate {
  name: string;
  description?: string;
  modules?: Array<ModulePermission>;
}

export interface RoleUpdate {
  name?: string;
  description?: string;
  status_id?: string;
  modules?: Array<ModulePermission>;
}

export interface RoleStats {
  total_roles: number;
  active_roles: number;
  inactive_roles: number;
}

export interface RoleUser {
    id: string;
    name: string;
    email: string;
    phone?: string;
}

export interface RoleUsersResponse {
    items: RoleUser[];
    total: number;
    page: number;
    page_size: number;
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

  async getRoleUsers(roleId: string, page: number = 1, pageSize: number = 10, search?: string): Promise<RoleUsersResponse> {
    const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
    });

    if (search) {
        params.append('search', search);
    }

    const response = await apiClient(`${API_BASE_URL}/api/roles/${roleId}/users?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Failed to fetch role users');
    }
    return await response.json();
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

  async getRoleModules(roleId: string): Promise<Array<ModulePermission>> {
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
