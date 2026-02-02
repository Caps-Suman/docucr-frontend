import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    RefreshCw,
    User,
    RotateCcw
} from 'lucide-react';
import activityLogService, { ActivityLog } from '../../services/activityLog.service';
import styles from './ActivityLog.module.css';
import CommonDropdown from '../Common/CommonDropdown';
import CommonDatePicker from '../Common/CommonDatePicker';
import Table from '../Table/Table';
import CommonPagination from '../Common/CommonPagination';
import Loading from '../Common/Loading';
import { debounce } from '../../utils/debounce';

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
    const [debouncedUserNameFilter, setDebouncedUserNameFilter] = useState<string>('');
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
                debouncedUserNameFilter || undefined,
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

    // Debounced handler for user name filter
    const debouncedSetUserNameFilter = useCallback(
        debounce((value: string) => {
            setDebouncedUserNameFilter(value);
            setPage(1);
        }, 500),
        []
    );

    const refreshFiltersAndLogs = () => {
        // Reset all filters to default values
        setActionFilter('');
        setEntityTypeFilter('');
        setUserNameFilter('');
        setDebouncedUserNameFilter('');
        setStartDate(null);
        setEndDate(null);
        setPage(1);
        // fetchLogs will be called automatically due to useEffect dependencies
    };

    const refreshOnlyLogs = () => {
        // Only refresh logs with current filter values
        fetchLogs();
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, entityTypeFilter, debouncedUserNameFilter, startDate, endDate]);

    const handleReset = () => {
        setActionFilter('');
        setEntityTypeFilter('');
        setUserNameFilter('');
        setDebouncedUserNameFilter('');
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

    const columns = [
        {
            key: 'created_at',
            header: 'Date',
            render: (value: string) => new Date(value).toLocaleString(),
            width: '150px'
        },
    {
  key: 'name',
  header: 'User',
  render: (_: any, row: ActivityLog) => (
    <div className={styles.userCell}>
      <User size={16} color="var(--color-gray-400)" />
      <span title={row.email || row.user_id}>
        {row.name || 'System'}
      </span>
    </div>
  ),
  width: '180px'
},
        {
            key: 'action',
            header: 'Action',
            render: (value: string) => (
                <span className={`${styles.badge} ${getBadgeClass(value)}`}>
                    {value}
                </span>
            ),
            width: '100px'
        },
        {
            key: 'entity_type',
            header: 'Entity',
            render: (value: string) => (
                <div className={styles.entityCell}>
                    <span className={styles.entityType}>{value}</span>
                </div>
            ),
            width: '120px'
        },
        {
            key: 'details',
            header: 'Details',
            render: (_: any, row: ActivityLog) => renderDetails(row),
            width: '360px'
        },
        {
            key: 'ip_address',
            header: 'IP Address',
            render: (value: string) => (
                <div className={styles.ipInfo}>{value || '-'}</div>
            ),
            width: '100px'
        }
    ];

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
                        onClick={refreshFiltersAndLogs}
                        className={styles.refreshBtn}
                        title="Refresh Filters and Logs"
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
                        onChange={(e) => {
                            setUserNameFilter(e.target.value);
                            debouncedSetUserNameFilter(e.target.value);
                        }}
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

                {/* <button
                    onClick={refreshOnlyLogs}
                    className={styles.refreshBtnIcon}
                    title="Refresh Logs Only"
                >
                    <RefreshCw size={16} className={loading ? styles.animateSpin : ""} />
                </button> */}
            </div>

            {/* Table */}
            <div className={styles.tableSection}>
                {loading && logs.length === 0 ? (
                    <Loading message="Loading activity logs..." />
                ) : logs.length === 0 ? (
                    <div className={styles.empty}>
                        <Activity size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>No logs found</h3>
                        <p style={{ margin: 0, fontSize: '14px' }}>Try adjusting your filters to find what you're looking for</p>
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        data={logs}
                        maxHeight="calc(100vh - 340px)"
                    />
                )}
            </div>

            <CommonPagination
                show={total > 0}
                pageCount={totalPages}
                currentPage={page - 1}
                onPageChange={(data) => setPage(data.selected + 1)}
                totalItems={total}
                itemsPerPage={limit}
            />
        </div>
    );
};

export default ActivityLogPage;
