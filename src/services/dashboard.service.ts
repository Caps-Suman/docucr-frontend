import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface AdminDashboardData {
    kpis: {
        totalThroughput: number;
        stpRate: number;
        avgConfidence: number;
        totalStorage: number;
    };
    charts: {
        trend: Array<{ date: string; count: number }>;
        verificationRatio: {
            automated: number;
            manual: number;
        };
        statusDistribution: Record<string, number>;
        typeDistribution: Record<string, number>;
    };
}

export interface UserDashboardData {
    kpis: {
        totalAssigned: number;
        pendingReview: number;
        accuracyRate: number;
        completedToday: number;
    };
    recentActivity: Array<{
        id: number;
        filename: string;
        status: string;
        updatedAt: string;
    }>;
}

class DashboardService {
    async getAdminStats(): Promise<AdminDashboardData> {
        const response = await apiClient(`${API_BASE_URL}/api/dashboard/admin`);
        if (!response.ok) {
            throw new Error('Failed to fetch admin dashboard data');
        }
        return response.json();
    }

    async getUserStats(): Promise<UserDashboardData> {
        const response = await apiClient(`${API_BASE_URL}/api/dashboard/user`);
        if (!response.ok) {
            throw new Error('Failed to fetch user dashboard data');
        }
        return response.json();
    }
}

const dashboardService = new DashboardService();
export default dashboardService;
