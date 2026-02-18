import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, FileText, Loader2, Calendar } from 'lucide-react';
import styles from './ActionLogModal.module.css';
import activityLogService, { ActivityLogItem } from '../../../services/activityLog.service';
import CommonPagination from '../../Common/CommonPagination';

interface ActionLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string | null;
    documentName: string | null;
}

const ActionLogModal: React.FC<ActionLogModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentName
}) => {
    const [logs, setLogs] = useState<ActivityLogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && documentId) {
            fetchLogs();
        } else {
            setLogs([]); // Clear logs when closed
        }
    }, [isOpen, documentId, currentPage, pageSize]);

    const fetchLogs = async () => {
        if (!documentId) return;

        setLoading(true);
        setError(null);
        try {
            const data = await activityLogService.getLogs(
                currentPage + 1,
                pageSize,
                undefined, // action
                'document', // entityType
                undefined, // userName
                undefined, // startDate
                undefined, // endDate
                documentId // entityId
            );
            setLogs(data.items);
            setTotal(data.total);
        } catch (err) {
            console.error("Failed to fetch activity logs:", err);
            setError("Failed to load activity logs.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleGroup}>
                        <div className={styles.headerIcon}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className={styles.title}>Action Log</h3>
                            {documentId && (
                                <div className={styles.subtitle}>Document Name: {documentName}</div>
                            )}
                        </div>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {loading && logs.length === 0 ? (
                        <div className={styles.loadingState}>
                            <Loader2 className={styles.spinner} size={32} />
                            <p>Loading activity...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <p>{error}</p>
                            <button onClick={fetchLogs} className={styles.retryButton}>Retry</button>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FileText size={48} />
                            <p>No activity found for this document.</p>
                        </div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Action</th>
                                        <th>Description</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className={styles.nameCell}>
                                                <span className={styles.userName}>{log.name}</span>
                                            </td>
                                            <td className={styles.emailCell}>{log.email || '-'}</td>
                                            <td>
                                                <span className={styles.actionBadge}>{log.action_label}</span>
                                            </td>
                                            <td className={styles.descriptionCell} title={log.description}>
                                                {log.description}
                                            </td>
                                            <td className={styles.dateCell}>
                                                <div className={styles.dateTime}>
                                                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                                                    <span className={styles.time}>{new Date(log.created_at).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <CommonPagination
                        show={total > 0}
                        pageCount={Math.ceil(total / pageSize)}
                        currentPage={currentPage}
                        onPageChange={({ selected }) => setCurrentPage(selected)}
                        totalItems={total}
                        itemsPerPage={pageSize}
                        onItemsPerPageChange={(newSize) => {
                            setPageSize(newSize);
                            setCurrentPage(0);
                        }}
                        renderInPlace={true}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ActionLogModal;
