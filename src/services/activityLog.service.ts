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

export type ActivityLog = ActivityLogItem; // Alias for backward compatibility

const activityLogService = {
  getLogs: async (
    page = 1, 
    limit = 20, 
    action?: string, 
    entityType?: string, 
    userName?: string, 
    startDate?: string, 
    endDate?: string,
    entityId?: string // make entityId optional and last since it was optional in the original context presumably, or add it to match usage
  ) => {
    // Note: The previous call in ActionLogModal was getLogs(docId, 'document', page, limit).
    // The call in ActivityLog.tsx is getLogs(page, limit, action, entityType, userName, start, end).
    // This implies an inconsistent signature or I need to handle both or unify them.
    // Given the TypeScript error "Expected 2-4 arguments, but got 7", TS was seeing the NEW signature I wrote: (entityId, entityType, page, limit).
    // I need to change it to something that supports BOTH or change the call sites.
    // Changing the call site in ActionLogModal is easier than ActivityLog.tsx (which has many filters).
    // Let's adopt a signature that works for the COMPLEX case (ActivityLog.tsx) and adapt ActionLogModal.
    
    // Valid signature for ActivityLog.tsx: (page, limit, action, entityType, userName, start, end)
    // But ActionLogModal needs filtering by entityId.
    // So let's make a unified object or optional params.
    // But to fix the TS error quickly without changing 10 files, let's look at the ERROR again.
    // ERROR in ActivityLog.tsx: "Expected 2-4 arguments, but got 7."
    // It was calling: getLogs(page, limit, action, entityType, userName, start, end).
    
    // I will change getLogs to accept an object OR multiple params, but standardizing on parameters is better.
    // Let's support the superset.
    
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

    const response = await fetchWithAuth(`/api/activity-logs/?${queryParams.toString()}`, {
        method: 'GET'
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch activity logs: ${response.statusText}`);
    }

    return await response.json();
  },
};

export default activityLogService;
