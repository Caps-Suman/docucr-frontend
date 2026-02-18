import { fetchWithAuth } from '../utils/api';

export interface ActivityLogItem {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  action: string;
  action_label: string;
  description: string;
  created_at: string;
  details?: any;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  user_id?: string;
}

export interface ActivityLogResponse {
  items: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface EntityTypeOption {
  value: string;
  label: string;
}

export type ActivityLog = ActivityLogItem; // Alias for backward compatibility
const activityLogService = {
  // existing function — keep untouched
  getLogs: async (
    page = 1,
    limit = 20,
    action?: string,
    entityType?: string,
    userName?: string,
    startDate?: string,
    endDate?: string,
    entityId?: string
  ) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (action) queryParams.append('action', action);
    if (entityType) queryParams.append('entity_type', entityType);
    if (userName) queryParams.append('user_name', userName);
    if (startDate) queryParams.append('start_date', startDate);
    if (endDate) queryParams.append('end_date', endDate);
    if (entityId) queryParams.append('entity_id', entityId);

    const response = await fetchWithAuth(`/api/activity-logs/?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch activity logs`);
    }

    return await response.json();
  },

  // 🆕 NEW API FOR ENTITY DROPDOWN
  getEntityTypes: async (): Promise<EntityTypeOption[]> => {
    const response = await fetchWithAuth(`/api/activity-logs/entity-types`);

    if (!response.ok) {
      throw new Error("Failed to fetch entity types");
    }

     const data = await response.json();
     return data.entity_types;
  },
};

export default activityLogService;
