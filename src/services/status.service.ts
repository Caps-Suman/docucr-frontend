import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Status {
    id: string;
    name: string;
    description: string | null;
    type: string | null;
}

const statusService = {
    getStatuses: async (): Promise<Status[]> => {
        const response = await apiClient(`${API_URL}/api/statuses`);
        if (!response.ok) throw new Error('Failed to fetch statuses');
        return response.json();
    },

    getStatusByName: async (name: string): Promise<Status | null> => {
        const statuses = await statusService.getStatuses();
        return statuses.find(s => s.name === name) || null;
    }
};

export default statusService;
