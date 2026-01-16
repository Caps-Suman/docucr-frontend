const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Privilege {
  id: string;
  name: string;
  description: string | null;
}

class PrivilegeService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async getPrivileges(): Promise<Privilege[]> {
    const response = await fetch(`${API_BASE_URL}/api/privileges`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch privileges');
    }

    return response.json();
  }
}

const privilegeService = new PrivilegeService();
export default privilegeService;
