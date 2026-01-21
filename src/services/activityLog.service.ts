import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface UserSummary {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
}

export interface ActivityLog {
    id: string;
    user_id: string | null;
    user: UserSummary | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    entity_name: string | null;
    details: any | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

export interface ActivityLogListResponse {
    items: ActivityLog[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

const activityLogService = {
    getLogs: async (
        page: number = 1,
        limit: number = 20,
        action?: string,
        entity_type?: string,
        user_name?: string,
        start_date?: string,
        end_date?: string
    ): Promise<ActivityLogListResponse> => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });

        if (action) params.append('action', action);
        if (entity_type) params.append('entity_type', entity_type);
        if (user_name) params.append('user_name', user_name);
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);

        const response = await apiClient(`${API_URL}/api/activity-logs?${params}`);
        if (!response.ok) throw new Error('Failed to fetch activity logs');
        return response.json();
    }
};

export default activityLogService;
