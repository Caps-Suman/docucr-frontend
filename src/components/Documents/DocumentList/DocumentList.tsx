import React, { useState, useEffect, useRef } from 'react';
import { Eye, Download, Trash2, FileText, Upload, CheckCircle, Clock, UploadCloud, X, Loader2, RefreshCw, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Loading from '../../Common/Loading';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import documentService from '../../../services/document.service';
import authService from '../../../services/auth.service';
import documentListConfigService from '../../../services/documentListConfig.service';
import clientService, { Client } from '../../../services/client.service';
import documentTypeService, { DocumentType } from '../../../services/documentType.service';
import { useUploadStore, uploadStore } from '../../../store/uploadStore';
import styles from './DocumentList.module.css';

interface DocumentListItem {
    id: string;
    name: string;
    originalFilename: string;
    type: string;
    size: number;
    uploadedAt: string;
    status: 'processing' | 'completed' | 'failed' | 'uploading' | 'queued' | 'uploaded' | 'ai_queued' | 'analyzing' | 'ai_failed' | 'upload_failed' | 'cancelled';
    isUploading?: boolean;
    progress?: number;
    errorMessage?: string;
    customFormData?: any;
}

const DocumentList: React.FC = () => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<DocumentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [columnConfig, setColumnConfig] = useState<any[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [isPolling, setIsPolling] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<DocumentListItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const uploadingDocs = useUploadStore().uploadingDocs;
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        loadDocuments();
        setupWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    // Cleanup upload store for documents that are already present in the backend list
    useEffect(() => {
        if (documents.length > 0 && uploadingDocs.length > 0) {
            const { removeUpload } = uploadStore.getState();
            uploadingDocs.forEach((uDoc: any) => {
                if (uDoc.documentId) {
                    const exists = documents.find(d => String(d.id) === String(uDoc.documentId));
                    if (exists && (exists.status === 'uploaded' || exists.status === 'completed' || exists.status === 'processing')) {
                        removeUpload(uDoc.tempId);
                    }
                }
            });
        }
    }, [documents, uploadingDocs]);
    const loadDocuments = async () => {
        try {
            const docs = await documentService.getDocuments();
            const formattedDocs = docs.map(doc => ({
                id: doc.id,
                name: doc.filename,
                originalFilename: doc.original_filename || doc.filename,
                type: doc.filename.split('.').pop()?.toUpperCase() || 'FILE',
                size: doc.file_size / (1024 * 1024), // Convert to MB
                uploadedAt: doc.created_at,
                status: mapDocumentStatus(doc.status),
                progress: doc.upload_progress,
                errorMessage: doc.error_message,
                customFormData: (doc as any).custom_form_data || {}
            }));

            // Fetch column configuration
            try {
                const response = await documentListConfigService.getUserConfig();
                if (response.configuration) {
                    setColumnConfig(response.configuration.columns.filter((c: any) => c.visible));
                } else {
                    // Default config if none saved
                    setColumnConfig([
                        { id: 'name', label: 'Document Name', isSystem: true },
                        { id: 'type', label: 'Type', isSystem: true },
                        { id: 'size', label: 'Size', isSystem: true },
                        { id: 'uploadedAt', label: 'Uploaded', isSystem: true },
                        { id: 'status', label: 'Status', isSystem: true },
                        { id: 'actions', label: 'Actions', isSystem: true }
                    ]);
                }
            } catch (error) {
                console.error('Failed to load column config');
                // Default config on error
                setColumnConfig([
                    { id: 'name', label: 'Document Name', isSystem: true },
                    { id: 'type', label: 'Type', isSystem: true },
                    { id: 'size', label: 'Size', isSystem: true },
                    { id: 'uploadedAt', label: 'Uploaded', isSystem: true },
                    { id: 'status', label: 'Status', isSystem: true },
                    { id: 'actions', label: 'Actions', isSystem: true }
                ]);
            }

            try {
                const [clientsRes, docTypesRes] = await Promise.all([
                    clientService.getClients(1, 1000).catch(() => ({ clients: [] })),
                    documentTypeService.getDocumentTypes(1, 1000).catch(() => [])
                ]);

                // Handle different response formats safely
                const clientList = Array.isArray(clientsRes) ? clientsRes : (clientsRes as any).clients || [];
                const typeList = Array.isArray(docTypesRes) ? docTypesRes : (docTypesRes as any).document_types || [];

                setClients(clientList);
                setDocumentTypes(typeList);
            } catch (err) {
                console.error('Failed to load metadata for labels:', err);
            }

            setDocuments(prevNodes => {
                return formattedDocs.map(newDoc => {
                    const existingDoc = prevNodes.find(d => d.id === newDoc.id);
                    // Preserve progress if we have a higher value locally (from WS) and status is uploading
                    if (existingDoc &&
                        existingDoc.status === 'uploading' &&
                        newDoc.status === 'uploading' &&
                        (existingDoc.progress || 0) > (newDoc.progress || 0)) {
                        return { ...newDoc, progress: existingDoc.progress };
                    }
                    return newDoc;
                });
            });
        } catch (error) {
            // Silently fail or use a toast notification in a real app
        } finally {
            setLoading(false);
        }
    };

    const mapDocumentStatus = (status_id: string): 'processing' | 'completed' | 'failed' | 'uploading' | 'queued' | 'uploaded' | 'ai_queued' | 'analyzing' | 'ai_failed' | 'upload_failed' | 'cancelled' => {
        switch (status_id) {
            case 'COMPLETED': return 'completed';
            case 'UPLOADED': return 'uploaded';
            case 'PROCESSING': return 'processing';
            case 'UPLOADING': return 'uploading';
            case 'QUEUED': return 'queued';
            case 'FAILED': return 'failed';
            case 'AI_QUEUED': return 'ai_queued';
            case 'ANALYZING': return 'analyzing';
            case 'AI_FAILED': return 'ai_failed';
            case 'UPLOAD_FAILED': return 'upload_failed';
            case 'CANCELLED': return 'cancelled';
            default: return 'processing';
        }
    };

    const setupWebSocket = () => {
        const user = authService.getUser();

        const userId = authService.getCurrentUserId();

        if (!userId) {
            // Fallback to existing user ID for development
            const fallbackUserId = 'ae5b4fa6-44bb-45ce-beac-320bb4e21697';
            console.warn('No authenticated user ID, using fallback:', fallbackUserId);

            wsRef.current = documentService.createWebSocketConnection(fallbackUserId, (data) => {
                handleWebSocketMessage(data);
            });
            return;
        }

        wsRef.current = documentService.createWebSocketConnection(userId, (data) => {
            handleWebSocketMessage(data);
        });
    };

    const handleWebSocketMessage = (data: any) => {
        if (data.type === 'document_status_update') {
            const { updateUpload } = uploadStore.getState();

            // Update upload store if document exists there
            // Use String() for safe comparison of document IDs
            const uploadDoc = uploadingDocs.find((doc: any) =>
                doc.documentId && String(doc.documentId) === String(data.document_id)
            );

            if (uploadDoc) {
                updateUpload(uploadDoc.tempId, {
                    status: mapDocumentStatus(data.status) as any,
                    progress: data.progress || 0
                });

                // Remove from upload store if completed
                if (data.status === 'UPLOADED' || data.status === 'FAILED') {
                    // Short timeout to allow UI update before removal
                    setTimeout(() => {
                        uploadStore.getState().removeUpload(uploadDoc.tempId);
                        // Also refresh list to ensure we have the final backend state
                        loadDocuments();
                    }, 1000);
                }
            }

            setDocuments(prev => {
                const updated = prev.map(doc =>
                    String(doc.id) === String(data.document_id)
                        ? {
                            ...doc,
                            status: mapDocumentStatus(data.status),
                            progress: data.progress,
                            errorMessage: data.error_message
                        }
                        : doc
                );

                // If document not found in current list, refresh to get new documents
                const documentExists = prev.find(doc => String(doc.id) === String(data.document_id));
                if (!documentExists) {
                    // Delay refresh slightly to ensure backend is ready
                    setTimeout(() => loadDocuments(), 500);
                }

                return updated;
            });
        }
    };

    const handleCancel = async (id: string) => {
        try {
            await documentService.cancelDocumentAnalysis(id);
            setToast({ message: 'Analysis cancelled', type: 'success' });
        } catch (error) {
            console.error(error);
            setToast({ message: 'Failed to cancel analysis', type: 'error' });
        }
    };

    const handleReanalyze = async (id: string) => {
        try {
            await documentService.reanalyzeDocument(id);
            setToast({ message: 'Analysis restarted', type: 'success' });
        } catch (error) {
            console.error(error);
            setToast({ message: 'Failed to restart analysis', type: 'error' });
        }
    };



    const handleDeleteClick = (document: DocumentListItem) => {
        setDocumentToDelete(document);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (documentToDelete) {
            setDeleting(true);
            try {
                await documentService.deleteDocument(documentToDelete.id);
                setDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id));
                setShowDeleteModal(false);
                setDocumentToDelete(null);
                setToast({ message: 'Document deleted successfully', type: 'success' });
            } catch (error) {
                console.error('Failed to delete document:', error);
                setToast({ message: 'Failed to delete document', type: 'error' });
            } finally {
                setDeleting(false);
            }
        }
    };

    const handleDeleteCancel = () => {
        if (!deleting) {
            setShowDeleteModal(false);
            setDocumentToDelete(null);
        }
    };

    const columns = React.useMemo(() => {
        if (columnConfig.length === 0) return [];

        const systemIds = ['name', 'type', 'size', 'uploadedAt', 'status', 'actions'];

        return columnConfig.map(col => {
            const isSystem = col.isSystem || systemIds.includes(col.id);
            if (isSystem) {
                switch (col.id) {
                    case 'name':
                        return {
                            key: 'name',
                            header: col.label,
                            render: (value: string, row: DocumentListItem) => (
                                <span className={styles.tooltipWrapper} data-tooltip={value}>
                                    <div className={styles.documentName} style={{ maxWidth: '100%', overflow: 'hidden' }}>
                                        <FileText size={16} style={{ flexShrink: 0 }} />
                                        <span className={styles.cellContent}>{value}</span>
                                    </div>
                                </span>
                            )
                        };
                    case 'type':
                        return {
                            key: 'type',
                            header: col.label,
                            render: (value: string) => (
                                <span className={styles.tooltipWrapper} data-tooltip={value}>
                                    <span className={styles.documentType}>{value}</span>
                                </span>
                            )
                        };
                    case 'size':
                        return {
                            key: 'size',
                            header: col.label,
                            render: (value: number) => {
                                const sizeText = `${value.toFixed(2)} MB`;
                                return (
                                    <span className={styles.tooltipWrapper} data-tooltip={sizeText}>
                                        <span className={styles.cellContent}>{sizeText}</span>
                                    </span>
                                );
                            }
                        };
                    case 'uploadedAt':
                        return {
                            key: 'uploadedAt',
                            header: col.label,
                            render: (value: string) => {
                                const dateText = new Date(value).toLocaleDateString();
                                const fullDate = new Date(value).toLocaleString();
                                return (
                                    <span className={styles.tooltipWrapper} data-tooltip={fullDate}>
                                        <span className={styles.cellContent}>{dateText}</span>
                                    </span>
                                );
                            }
                        };
                    case 'status':
                        return {
                            key: 'status',
                            header: col.label,
                            render: (value: string, row: DocumentListItem) => {
                                const getStatusConfig = (status: string) => {
                                    switch (status) {
                                        case 'completed':
                                            return { class: 'active', icon: <CheckCircle size={12} />, text: 'Completed' };
                                        case 'queued':
                                            return { class: 'inactive', icon: <Clock size={12} />, text: 'Queued' };
                                        case 'uploading':
                                            const progressText = row.progress ? `Uploading (${row.progress}%)` : 'Uploading';
                                            return { class: 'inactive', icon: <UploadCloud size={12} />, text: progressText };
                                        case 'uploaded':
                                            return { class: 'active', icon: <CheckCircle size={12} />, text: 'Uploaded' };
                                        case 'processing':
                                            return { class: 'inactive', icon: <Clock size={12} />, text: 'Processing' };
                                        case 'upload_failed':
                                            return {
                                                class: 'error',
                                                icon: <X size={12} />,
                                                text: (
                                                    <span className={`${styles.tooltipWrapper} tooltip-bottom`} data-tooltip={row.errorMessage || 'Upload failed'}>
                                                        Upload Failed
                                                    </span>
                                                )
                                            };
                                        case 'ai_queued':
                                            return { class: 'inactive', icon: <Clock size={12} />, text: 'AI Queued' };
                                        case 'analyzing':
                                            return {
                                                class: 'processing',
                                                icon: <Loader2 size={12} className={styles.animateSpin} />,
                                                text: row.errorMessage || 'Analyzing...'
                                            };
                                        case 'ai_failed':
                                            return {
                                                class: 'error',
                                                icon: <X size={12} />,
                                                text: (
                                                    <span className={`${styles.tooltipWrapper} tooltip-bottom`} data-tooltip={row.errorMessage || 'Analysis failed'}>
                                                        Analysis Failed
                                                    </span>
                                                )
                                            };
                                        case 'cancelled':
                                            return {
                                                class: 'inactive',
                                                icon: <Ban size={12} />,
                                                text: 'Cancelled'
                                            };
                                        case 'failed':
                                            return {
                                                class: 'error',
                                                icon: <X size={12} />,
                                                text: (
                                                    <span className={`${styles.tooltipWrapper} tooltip-bottom`} data-tooltip={row.errorMessage || 'Unknown error'}>
                                                        Failed
                                                    </span>
                                                )
                                            };
                                        default:
                                            return { class: 'inactive', icon: <Clock size={12} />, text: status };
                                    }
                                };

                                const config = getStatusConfig(value);
                                return (
                                    <span className={`status-badge ${config.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        {config.icon}
                                        {config.text}
                                    </span>
                                );
                            }
                        };
                    case 'actions':
                        return {
                            key: 'actions',
                            header: col.label,
                            render: (_: any, row: DocumentListItem) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(row.status === 'failed' || row.status === 'ai_failed' || row.status === 'upload_failed' || row.status === 'cancelled') && (
                                        <span className={styles.tooltipWrapper} data-tooltip="Retry Analysis">
                                            <button onClick={() => handleReanalyze(row.id)} className="action-btn activate">
                                                <RefreshCw size={14} />
                                            </button>
                                        </span>
                                    )}

                                    {(row.status === 'analyzing' || row.status === 'ai_queued') && (
                                        <span className={styles.tooltipWrapper} data-tooltip="Cancel Analysis">
                                            <button onClick={() => handleCancel(row.id)} className="action-btn delete">
                                                <Ban size={14} />
                                            </button>
                                        </span>
                                    )}

                                    {!row.isUploading && (
                                        <>
                                            <span className={styles.tooltipWrapper} data-tooltip={
                                                row.status === 'queued' || row.status === 'uploading' || row.status === 'upload_failed'
                                                    ? "Upload in progress or failed"
                                                    : "View Details"
                                            }>
                                                <button
                                                    className={`action-btn edit ${row.status === 'queued' || row.status === 'uploading' || row.status === 'upload_failed' ? 'disabled' : ''}`}
                                                    onClick={() => {
                                                        if (row.status !== 'queued' && row.status !== 'uploading' && row.status !== 'upload_failed') {
                                                            navigate(`/documents/${row.id}`);
                                                        }
                                                    }}
                                                    disabled={row.status === 'queued' || row.status === 'uploading' || row.status === 'upload_failed'}
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </span>
                                            <span className={styles.tooltipWrapper} data-tooltip="Download">
                                                <button
                                                    className="action-btn activate"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            const url = await documentService.getDocumentDownloadUrl(row.id);
                                                            const link = window.document.createElement('a');
                                                            link.href = url;
                                                            link.setAttribute('download', row.originalFilename || row.name);
                                                            link.setAttribute('target', '_blank');
                                                            link.setAttribute('rel', 'noopener noreferrer');
                                                            window.document.body.appendChild(link);
                                                            link.click();
                                                            window.document.body.removeChild(link);
                                                        } catch (error) {
                                                            setToast({ message: "Failed to verify download", type: "error" });
                                                        }
                                                    }}
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </span>
                                            <span className={styles.tooltipWrapper} data-tooltip="Delete">
                                                <button className="action-btn delete" onClick={() => handleDeleteClick(row)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </span>
                                        </>
                                    )}
                                    {row.isUploading && (
                                        <span className={styles.tooltipWrapper} data-tooltip="Uploading...">
                                            <button className="action-btn" disabled>
                                                <Clock size={14} />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )
                        };
                    default:
                        return { key: col.id, header: col.label };
                }
            } else {
                // Custom Form Field
                const formFieldId = col.id.replace('form_', '');
                return {
                    key: col.id,
                    header: col.label,
                    render: (_: any, row: DocumentListItem) => {
                        const val = row.customFormData ? row.customFormData[formFieldId] : null;
                        if (!val) return <span style={{ color: '#94a3b8' }}>-</span>;

                        // Resolve UUIDs for specific fields
                        if (col.label.toLowerCase() === 'client') {
                            const client = clients.find(c => c.id === val);
                            const clientName = client ? (client.business_name || `${client.first_name} ${client.last_name}`) : String(val);
                            return (
                                <span className={styles.tooltipWrapper} data-tooltip={clientName}>
                                    <span className={styles.cellContent}>{clientName}</span>
                                </span>
                            );
                        }

                        if (col.label.toLowerCase().includes('document type')) {
                            const type = documentTypes.find(t => t.id === val);
                            const typeName = type ? type.name : String(val);
                            return (
                                <span className={styles.tooltipWrapper} data-tooltip={typeName}>
                                    <span className={styles.cellContent}>{typeName}</span>
                                </span>
                            );
                        }

                        const displayValue = Array.isArray(val) ? val.join(', ') : String(val);
                        return (
                            <span className={styles.tooltipWrapper} data-tooltip={displayValue}>
                                <span className={styles.cellContent}>{displayValue}</span>
                            </span>
                        );
                    }
                };
            }
        });
    }, [columnConfig, navigate, clients, documentTypes]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <FileText size={20} />
                        Documents
                    </h1>
                    <div className={styles.statusLegend}>
                        <span className={styles.legendItem}>
                            <CheckCircle size={12} className={`${styles.legendIcon} ${styles.colorSuccess}`} />
                            <span>Completed: Finished analysis</span>
                        </span>
                        <span className={styles.legendItem}>
                            <CheckCircle size={12} className={`${styles.legendIcon} ${styles.colorUploaded}`} />
                            <span>Uploaded: File ready for AI</span>
                        </span>
                        <span className={styles.legendItem}>
                            <Clock size={12} className={`${styles.legendIcon} ${styles.colorQueued}`} />
                            <span>Queued: Waiting to start</span>
                        </span>
                        <span className={styles.legendItem}>
                            <Clock size={12} className={`${styles.legendIcon} ${styles.colorProcessing}`} />
                            <span>Processing: Being analyzed</span>
                        </span>
                        <span className={styles.legendItem}>
                            <Loader2 size={12} className={`${styles.legendIcon} ${styles.colorAnalyzing} ${styles.animateSpin}`} />
                            <span>Analyzing: AI processing</span>
                        </span>
                        <span className={styles.legendItem}>
                            <Clock size={12} className={`${styles.legendIcon} ${styles.colorAIQueued}`} />
                            <span>AI Queued: Waiting for AI</span>
                        </span>
                        <span className={styles.legendItem}>
                            <UploadCloud size={12} className={`${styles.legendIcon} ${styles.colorUploading}`} />
                            <span>Uploading: File transfer</span>
                        </span>
                        <span className={styles.legendItem}>
                            <X size={12} className={`${styles.legendIcon} ${styles.colorFailed}`} />
                            <span>Failed: General error</span>
                        </span>
                        <span className={styles.legendItem}>
                            <X size={12} className={`${styles.legendIcon} ${styles.colorAIFailed}`} />
                            <span>AI Failed: Analysis error</span>
                        </span>
                        <span className={styles.legendItem}>
                            <X size={12} className={`${styles.legendIcon} ${styles.colorUploadFailed}`} />
                            <span>Upload Failed: Network error</span>
                        </span>
                        <span className={styles.legendItem}>
                            <Ban size={12} className={`${styles.legendIcon} ${styles.colorCancelled}`} />
                            <span>Cancelled: Manually stopped</span>
                        </span>
                    </div>
                </div>
                <button
                    className={styles.uploadButton}
                    onClick={() => navigate('/documents/upload')}
                >
                    <Upload size={16} />
                    Upload Document
                </button>
            </div>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconTotal}`}>
                        <FileText size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{documents.length}</span>
                        <span className={styles.statLabel}>Total Documents</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconProcessed}`}>
                        <CheckCircle size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {documents.filter(d => d.status === 'completed').length}
                        </span>
                        <span className={styles.statLabel}>Processed</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconProcessing}`}>
                        <Clock size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {documents.filter(d => d.status === 'processing').length}
                        </span>
                        <span className={styles.statLabel}>Processing</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconUploading}`}>
                        <UploadCloud size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {documents.filter(d => d.status === 'queued' || d.status === 'uploading').length + uploadingDocs.length}
                        </span>
                        <span className={styles.statLabel}>Uploading</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                    <Loading />
                </div>
            ) : documents.length === 0 && uploadingDocs.length === 0 ? (
                <div className={styles.emptyState}>
                    <FileText size={48} />
                    <p>No documents uploaded yet</p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {columns.map((column: any) => (
                                    <th key={column.key}>
                                        {column.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const uploading = uploadingDocs
                                    .filter((doc: any) => !documents.find(d => String(d.id) === String(doc.documentId)))
                                    .map((doc: any) => ({
                                        id: doc.tempId,
                                        name: doc.filename,
                                        originalFilename: doc.filename,
                                        type: doc.filename.split('.').pop()?.toUpperCase() || 'FILE',
                                        size: doc.fileSize / (1024 * 1024),
                                        uploadedAt: doc.createdAt,
                                        status: doc.status,
                                        isUploading: true,
                                        progress: doc.progress
                                    }));

                                const combined = [...uploading, ...documents];
                                const uniqueMap = new Map();
                                combined.forEach(item => {
                                    uniqueMap.set(item.id, item);
                                });

                                const finalData = Array.from(uniqueMap.values());

                                return finalData.map((row: any, index: number) => (
                                    <tr key={row.id || index}>
                                        {columns.map((column: any) => (
                                            <td key={column.key}>
                                                {column.render
                                                    ? column.render(row[column.key], row)
                                                    : row[column.key]
                                                }
                                            </td>
                                        ))}
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Document"
                message={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone.`}
                onConfirm={handleDeleteConfirm}
                onClose={handleDeleteCancel}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
                loading={deleting}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default DocumentList;