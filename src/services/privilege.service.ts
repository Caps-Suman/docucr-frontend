import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Privilege {
  id: string;
  name: string;
  description: string | null;
}

class PrivilegeService {
  async getPrivileges(): Promise<Privilege[]> {
    const response = await apiClient(`${API_BASE_URL}/api/privileges`);

    if (!response.ok) {
      throw new Error('Failed to fetch privileges');
    }

    return response.json();
  }
}

const privilegeService = new PrivilegeService();
export default privilegeService;
