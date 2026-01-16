const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  status_id: string | null;
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
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getRoles(page: number = 1, pageSize: number = 10): Promise<RoleListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/roles?page=${page}&page_size=${pageSize}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    return response.json();
  }

  async getRoleStats(): Promise<RoleStats> {
    const response = await fetch(`${API_BASE_URL}/api/roles/stats`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch role stats');
    }

    return response.json();
  }

  async getRole(roleId: string): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/api/roles/${roleId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch role');
    }

    return response.json();
  }

  async createRole(data: RoleCreate): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/api/roles`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create role');
    }

    return response.json();
  }

  async updateRole(roleId: string, data: RoleUpdate): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/api/roles/${roleId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update role');
    }

    return response.json();
  }

  async getRoleModules(roleId: string): Promise<Array<{ module_id: string; privilege_id: string }>> {
    const response = await fetch(`${API_BASE_URL}/api/roles/${roleId}/modules`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch role modules');
    }

    const data = await response.json();
    return data.modules;
  }

  async deleteRole(roleId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/roles/${roleId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
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
