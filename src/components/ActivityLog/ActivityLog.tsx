import React, { useState, useEffect } from 'react';
import {
    Activity,
    RefreshCw,
    User,
    ChevronLeft,
    ChevronRight,
    RotateCcw
} from 'lucide-react';
import activityLogService, { ActivityLog } from '../../services/activityLog.service';
import styles from './ActivityLog.module.css';
import CommonDropdown from '../Common/CommonDropdown';
import CommonDatePicker from '../Common/CommonDatePicker';

const ActivityLogPage: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [total, setTotal] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(0);

    // Filters
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(20);
    const [actionFilter, setActionFilter] = useState<string>('');
    const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
    const [userNameFilter, setUserNameFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // Pre-defined Actions and Entity Types
    const actions = [
        { label: 'All Actions', value: '' },
        { label: 'Login', value: 'LOGIN' },
        { label: 'Create', value: 'CREATE' },
        { label: 'Update', value: 'UPDATE' },
        { label: 'Delete', value: 'DELETE' },
        { label: 'Share', value: 'SHARE' },
        { label: 'Export', value: 'EXPORT' }
    ];

    const entityTypes = [
        { label: 'All Entities', value: '' },
        { label: 'Document', value: 'document' },
        { label: 'Template', value: 'template' },
        { label: 'Form', value: 'form' },
        { label: 'User', value: 'user' },
        { label: 'Role', value: 'role' },
        { label: 'Client', value: 'client' },
        { label: 'Printer', value: 'printer' },
        { label: 'Webhook', value: 'webhook' },
        { label: 'Doc Type', value: 'document_type' },
        { label: 'Config', value: 'document_list_config' }
    ];

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await activityLogService.getLogs(
                page,
                limit,
                actionFilter || undefined,
                entityTypeFilter || undefined,
                userNameFilter || undefined,
                startDate ? startDate.toISOString() : undefined,
                endDate ? endDate.toISOString() : undefined
            );
            setLogs(data.items);
            setTotal(data.total);
            setTotalPages(data.pages);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, entityTypeFilter, userNameFilter, startDate, endDate]);

    const handleReset = () => {
        setActionFilter('');
        setEntityTypeFilter('');
        setUserNameFilter('');
        setStartDate(null);
        setEndDate(null);
        setPage(1);
    };

    const getBadgeClass = (action: string) => {
        switch (action) {
            case 'CREATE': return styles.badgeCreate;
            case 'UPDATE': return styles.badgeUpdate;
            case 'DELETE': return styles.badgeDelete;
            case 'LOGIN': return styles.badgeLogin;
            default: return styles.badgeDefault;
        }
    };

    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

    const toggleExpand = (logId: string) => {
        const newExpanded = new Set(expandedLogs);
        if (newExpanded.has(logId)) {
            newExpanded.delete(logId);
        } else {
            newExpanded.add(logId);
        }
        setExpandedLogs(newExpanded);
    };

    const renderDetails = (log: ActivityLog) => {
        let content = null;
        let diffs = null;

        // Custom handling for Sub-actions (e.g. Archive/Unarchive)
        if (log.details?.sub_action) {
            const actionText = log.details.sub_action === 'ARCHIVE' ? 'Archived' :
                log.details.sub_action === 'UNARCHIVE' ? 'Unarchived' :
                    log.details.sub_action;
            content = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={styles.subActionLabel}>{actionText}</span>
                    {log.entity_name && <span className={styles.detailText} title={log.entity_id || ''}>{log.entity_name}</span>}
                </div>
            );
        }
        // Default Entity Name Display
        else if (log.entity_name) {
            content = <span className={styles.detailText} title={log.entity_id || ''}>{log.entity_name}</span>;
        } else if (log.details) {
            // Try to extract meaningful info if entity_name is not available or supplementary
            if (log.details.filename) {
                content = <span className={styles.detailText} title={log.details.filename}>{log.details.filename}</span>;
            } else if (log.details.business_name) {
                content = <span className={styles.detailText}>{log.details.business_name}</span>;
            } else if (log.details.name) {
                content = <span className={styles.detailText}>{log.details.name}</span>;
            } else if (log.details.username) {
                content = <span className={styles.detailText}>{log.details.username}</span>;
            } else if (log.details.email) {
                content = <span className={styles.detailText}>{log.details.email}</span>;
            } else if (log.details.url) {
                content = <span className={styles.detailText} title={log.details.url}>{log.details.url}</span>;
            } else if (log.details.updated_fields && Array.isArray(log.details.updated_fields)) {
                content = <span className={styles.detailText} title={log.details.updated_fields.join(', ')}>Updated: {log.details.updated_fields.join(', ')}</span>;
            }
        }

        if (log.details && log.details.changes) {
            const changesList = Object.entries(log.details.changes);
            const isExpanded = expandedLogs.has(log.id);
            const displayChanges = isExpanded ? changesList : changesList.slice(0, 1);
            const hasMore = changesList.length > 1;

            diffs = (
                <div className={styles.diffContainer}>
                    {displayChanges.map(([field, change]: [string, any], index) => (
                        <div key={field} className={styles.diffLine}>
                            <span className={styles.diffField}>{field}:</span>
                            <span className={styles.diffFrom}>{String(change.from || 'None')}</span>
                            <span className={styles.diffArrow}>→</span>
                            <span className={styles.diffTo}>{String(change.to || 'None')}</span>
                            {!isExpanded && hasMore && index === 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(log.id); }}
                                    className={styles.moreLink}
                                    style={{ marginLeft: '6px' }}
                                >
                                    ...more (+{changesList.length - 1})
                                </button>
                            )}
                        </div>
                    ))}
                    {isExpanded && hasMore && (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(log.id); }}
                            className={styles.moreLink}
                            style={{ alignSelf: 'flex-start', marginTop: '2px' }}
                        >
                            Show less
                        </button>
                    )}
                </div>
            );
        } else if (log.details && !content) {
            // Fallback to JSON string but cleaner if possible, or truncated
            const jsonStr = JSON.stringify(log.details);
            content = <span className={styles.detailJson} title={JSON.stringify(log.details, null, 2)}>{jsonStr.length > 50 ? jsonStr.substring(0, 50) + '...' : jsonStr}</span>;
        }

        return (
            <div className={styles.detailsContainer}>
                {content}
                {diffs}
                {!content && !diffs && '-'}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <Activity className={styles.titleIcon} />
                        Activity Logs
                    </h1>
                    <p className={styles.subtitle}>Track system activity and user actions</p>
                </div>
                <div className={styles.actions}>
                    <button
                        onClick={fetchLogs}
                        className={styles.refreshBtn}
                        title="Refresh Logs"
                    >
                        <RefreshCw size={20} className={loading ? styles.animateSpin : ""} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <label className={styles.label}>Action</label>
                    <CommonDropdown
                        options={actions}
                        value={actionFilter}
                        onChange={(val) => { setActionFilter(val); setPage(1); }}
                        placeholder="All Actions"
                        size="md"
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label}>Entity Type</label>
                    <CommonDropdown
                        options={entityTypes}
                        value={entityTypeFilter}
                        onChange={(val) => { setEntityTypeFilter(val); setPage(1); }}
                        placeholder="All Entities"
                        size="md"
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label}>User Name</label>
                    <input
                        type="text"
                        placeholder="Search User Name..."
                        className={styles.input}
                        value={userNameFilter}
                        onChange={(e) => { setUserNameFilter(e.target.value); setPage(1); }}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label}>Start Date</label>
                    <CommonDatePicker
                        selected={startDate}
                        onChange={(date) => { setStartDate(date); setPage(1); }}
                        placeholderText="Select start date"
                        className={styles.datePickerOverride}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.label}>End Date</label>
                    <CommonDatePicker
                        selected={endDate}
                        onChange={(date) => { setEndDate(date); setPage(1); }}
                        placeholderText="Select end date"
                        className={styles.datePickerOverride}
                    />
                </div>

                <button
                    onClick={handleReset}
                    className={styles.resetBtnIcon}
                    title="Reset Filters"
                >
                    <RotateCcw size={16} />
                </button>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>Date</th>
                            <th className={styles.th}>User</th>
                            <th className={styles.th}>Action</th>
                            <th className={styles.th}>Entity</th>
                            <th className={styles.th}>Details</th>
                            <th className={styles.th}>IP Address</th>
                        </tr>
                    </thead>
                    <tbody className={styles.tbody}>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className={styles.loading}>
                                    Loading activity logs...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className={styles.empty}>
                                    No logs found matching filters.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className={styles.tr}>
                                    <td className={styles.td}>
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className={`${styles.td} ${styles.tdUser}`}>
                                        <div className={styles.userCell}>
                                            <User size={16} color="var(--color-gray-400)" />
                                            <span title={log.user?.username || log.user_id || 'System'}>
                                                {log.user ? (
                                                    log.user.first_name && log.user.last_name
                                                        ? `${log.user.first_name} ${log.user.last_name}`
                                                        : log.user.username
                                                ) : (log.user_id ? log.user_id.substring(0, 8) + '...' : 'System')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className={styles.td}>
                                        <span className={`${styles.badge} ${getBadgeClass(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.entityCell}>
                                            <span className={styles.entityType}>{log.entity_type}</span>
                                            {/* {log.entity_id && <span className={styles.entityId} title={log.entity_id}>({log.entity_id.substring(0, 8)}...)</span>} */}
                                        </div>
                                    </td>
                                    <td className={styles.td}>
                                        {renderDetails(log)}
                                    </td>
                                    <td className={styles.td}>
                                        <div className={styles.ipInfo}>{log.ip_address || '-'}</div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
                        </div>
                        <div className={styles.pageControls}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className={styles.pageBtn}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className={styles.pageBtn}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogPage;
