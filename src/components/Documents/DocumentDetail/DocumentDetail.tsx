import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Trash2, FileText, Calendar, HardDrive, Maximize2, Loader2, AlertCircle, Edit3, Save, X, Archive, ArchiveRestore } from 'lucide-react';
import documentService from '../../../services/document.service';
import authService from '../../../services/auth.service';
import Toast, { ToastType } from '../../Common/Toast';
import formService, { Form } from '../../../services/form.service';
import clientService from '../../../services/client.service';
import documentTypeService from '../../../services/documentType.service';
import ConfirmModal from '../../Common/ConfirmModal';
import CommonDropdown from '../../Common/CommonDropdown';
import styles from './DocumentDetail.module.css';

interface DocumentDetailData {
    id: number;
    filename: string;
    original_filename: string;
    status_id: number;
    statusCode: string;
    status: string;
    file_size: number;
    content_type: string;
    created_at: string;
    updated_at: string;
    analysis_report_s3_key?: string;
    is_archived?: boolean;
    extracted_documents: Array<{
        id: string;
        document_type: string | null;
        page_range: string;
        confidence: number;
        extracted_data: any;
    }>;
    unverified_documents: Array<{
        id: string;
        suspected_type: string;
        page_range: string;
        status: string;
    }>;
}

const calculatePageCount = (pageRange: string | null): number => {
    if (!pageRange) return 0;
    try {
        const parts = pageRange.split(',').map(p => p.trim());
        let total = 0;
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end)) {
                    total += Math.abs(end - start) + 1;
                } else {
                    total += 1;
                }
            } else if (part) {
                total += 1;
            }
        });
        return total;
    } catch (e) {
        return 0;
    }
};

const DocumentDetail: React.FC = () => {
    const wsRef = React.useRef<WebSocket | null>(null);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [document, setDocument] = useState<DocumentDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Actions state
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const getBadgeClass = (index: number) => {
        const badgeNumber = index % 20;
        return `${styles.typeBadge} ${styles[`badge${badgeNumber}` as keyof typeof styles]}`;
    };

    useEffect(() => {
        if (id) {
            fetchDocumentDetails();
            fetchPreview();
            setupWebSocket();
        }
        return () => {
            // Cleanup blob URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [id]);

    const setupWebSocket = () => {
        const user = authService.getUser();
        const userId = authService.getCurrentUserId();

        if (!userId) {
            console.warn('No authenticated user ID for WebSocket');
            return;
        }

        wsRef.current = documentService.createWebSocketConnection(userId, (data) => {
            if (data.type === 'document_status_update' && String(data.document_id) === String(id)) {

                // If status changed to COMPLETED or FAILED, we should re-fetch full details
                // to get the analysis report key and extracted documents
                if (data.status === 'COMPLETED' || data.status === 'AI_FAILED' || data.status === 'FAILED') {
                    fetchDocumentDetails();
                    setIsReanalyzing(false); // Stop re-analyzing spinner if active
                }

                setDocument(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        statusCode: data.status,
                        status_id: data.status_id, // ensure we have it if sent
                        status: data.status,
                    };
                });
            }
        });
    };

    const fetchDocumentDetails = async () => {
        try {
            if (!id) return;
            const data = await documentService.getDocument(id);
            setDocument(data);

            // Sync re-analyzing state with status
            if (data.statusCode === 'ANALYZING' || data.statusCode === 'AI_QUEUED') {
                setIsReanalyzing(true);
            } else {
                setIsReanalyzing(false);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load document details");
        } finally {
            setLoading(false);
        }
    };

    const fetchPreview = async () => {
        try {
            if (!id) return;
            const url = await documentService.getDocumentPreviewUrl(id);
            setPreviewUrl(url);
        } catch (err) {
            console.error("Preview fetch failed", err);
            setError("Failed to load document preview");
        }
    };

    const handleReanalyze = async () => {
        if (!id) return;
        setIsReanalyzing(true);
        try {
            await documentService.reanalyzeDocument(id);
            setToast({ message: "Re-analysis started", type: "success" });
            fetchDocumentDetails(); // Refresh status
        } catch (err) {
            setToast({ message: "Failed to start re-analysis", type: "error" });
        } finally {
            setIsReanalyzing(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setIsDeleting(true);
        try {
            await documentService.deleteDocument(id);
            setToast({ message: "Document deleted", type: "success" });
            setTimeout(() => navigate('/documents'), 1000);
        } catch (err) {
            setToast({ message: "Failed to delete document", type: "error" });
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleArchive = async () => {
        if (!id) return;
        try {
            await documentService.archiveDocument(id);
            setToast({ message: "Document archived", type: "success" });
            fetchDocumentDetails(); // Refresh to show updated status
        } catch (err) {
            setToast({ message: "Failed to archive document", type: "error" });
        }
    };

    const handleUnarchive = async () => {
        if (!id) return;
        try {
            await documentService.unarchiveDocument(id);
            setToast({ message: "Document unarchived", type: "success" });
            fetchDocumentDetails(); // Refresh to show updated status
        } catch (err) {
            setToast({ message: "Failed to unarchive document", type: "error" });
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 size={32} className={styles.animateSpin} />
                <p>Loading document details...</p>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className={styles.loadingContainer}>
                <AlertCircle size={32} color="#ef4444" />
                <p>{error || "Document not found"}</p>
                <button className={styles.primaryAction} onClick={() => navigate('/documents')}>
                    Back to Documents
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backButton} onClick={() => navigate('/documents')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={styles.title}>{document.filename}</h1>
                        <div className={styles.metaRow}>
                            <span className={styles.metaSpan}>
                                <Calendar size={14} /> {formatDate(document.created_at)}
                            </span>
                            <span className={styles.metaSpan}>
                                <HardDrive size={14} /> {formatSize(document.file_size)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <button
                        className={`${styles.actionButton} ${isReanalyzing ? 'disabled' : ''}`}
                        onClick={handleReanalyze}
                        disabled={isReanalyzing}
                    >
                        <RefreshCw size={16} className={isReanalyzing ? styles.animateSpin : ''} />
                        {isReanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
                    </button>
                    <button
                        className={styles.actionButton}
                        onClick={async () => {
                            try {
                                if (!id) return;
                                const url = await documentService.getDocumentDownloadUrl(id);
                                const link = window.document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', document.original_filename);
                                window.document.body.appendChild(link);
                                link.click();
                                window.document.body.removeChild(link);
                            } catch (error) {
                                setToast({ message: "Failed to verify download", type: "error" });
                            }
                        }}
                    >
                        <Download size={16} />
                        Download
                    </button>
                    {document.analysis_report_s3_key && (
                        <button
                            className={`${styles.actionButton} ${styles.primaryAction}`}
                            onClick={async () => {
                                try {
                                    if (!id) return;
                                    const url = await documentService.getDocumentReportUrl(id);
                                    const link = window.document.createElement('a');
                                    link.href = url;
                                    // Filename is handled by Content-Disposition, but good to add attribute
                                    link.setAttribute('download', `analysis_report_${document.filename}.xlsx`);
                                    window.document.body.appendChild(link);
                                    link.click();
                                    window.document.body.removeChild(link);
                                } catch (error) {
                                    setToast({ message: "Failed to download report", type: "error" });
                                }
                            }}
                        >
                            <Download size={16} />
                            Report
                        </button>
                    )}
                    {!document.is_archived && (
                        <button
                            className={styles.actionButton}
                            onClick={handleArchive}
                        >
                            <Archive size={16} />
                            Archive
                        </button>
                    )}
                    {document.is_archived && (
                        <button
                            className={`${styles.actionButton} ${styles.primaryAction}`}
                            onClick={handleUnarchive}
                        >
                            <ArchiveRestore size={16} />
                            Unarchive
                        </button>
                    )}
                    <button
                        className={`${styles.actionButton} ${styles.deleteAction}`}
                        onClick={() => setShowDeleteModal(true)}
                    >
                        <Trash2 size={16} />
                        Delete
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {/* Left Panel: Metadata */}
                <div className={styles.leftPanel}>
                    {id && <MetadataCard documentId={id} />}

                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Derived Documents</h3>
                        <div className={styles.badgeList}>
                            {document.extracted_documents.map((ed, index) => (
                                <span key={ed.id} className={getBadgeClass(index)}>
                                    {ed.document_type || 'Unknown'} | {calculatePageCount(ed.page_range)} {calculatePageCount(ed.page_range) === 1 ? 'Page' : 'Pages'}
                                </span>
                            ))}
                            {document.unverified_documents.map((ud, index) => (
                                <span key={ud.id} className={getBadgeClass(document.extracted_documents.length + index)}>
                                    {ud.suspected_type || 'Unverified'} | {calculatePageCount(ud.page_range)} {calculatePageCount(ud.page_range) === 1 ? 'Page' : 'Pages'}
                                </span>
                            ))}
                            {document.extracted_documents.length === 0 && document.unverified_documents.length === 0 && (
                                <p className={styles.emptyMessage}>
                                    No derived documents found.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className={styles.rightPanel}>
                    <div className={styles.previewHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} />
                            Document Preview
                        </div>
                        <span className={`${styles.statusBadge} ${styles[document.statusCode.toLowerCase()]}`}>
                            {document.statusCode.replace('_', ' ').toLowerCase()}
                        </span>
                    </div>
                    <div className={styles.previewContainer}>
                        {previewUrl ? (
                            document.content_type === 'application/pdf' ? (
                                <iframe
                                    src={previewUrl}
                                    className={styles.pdfFrame}
                                    title="Document Preview"
                                />
                            ) : (
                                <img src={previewUrl} className={styles.previewImage} alt="Preview" />
                            )
                        ) : (
                            <div className={styles.loadingContainer}>
                                <Loader2 size={24} className={styles.animateSpin} />
                                <p>Loading preview...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}


            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Document"
                message="Are you sure you want to delete this document? This action cannot be undone."
                onConfirm={handleDelete}
                onClose={() => setShowDeleteModal(false)}
                loading={isDeleting}
                type="danger"
            />
        </div>
    );
};

const MetadataCard: React.FC<{ documentId: string }> = ({ documentId }) => {
    const [data, setData] = useState<any>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolvedValues, setResolvedValues] = useState<Record<string, string>>({});

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    // System data for dropdowns
    const [clients, setClients] = useState<any[]>([]);
    const [documentTypes, setDocumentTypes] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await documentService.getDocumentFormData(documentId);
            setData(res.data);
            setEditData(res.data);

            if (res.form_id) {
                const formDef = await formService.getForm(res.form_id);
                setForm(formDef);

                // Normalize data: preserve IDs, but if only label exists, map it to ID
                const normalizedData = { ...res.data };
                if (formDef.fields) {
                    formDef.fields.forEach(field => {
                        const fid = field.id || '';
                        const flabel = field.label || '';
                        if (fid && !normalizedData[fid] && flabel && normalizedData[flabel]) {
                            normalizedData[fid] = normalizedData[flabel];
                        }
                    });
                }

                setData(normalizedData);
                setEditData(normalizedData);

                // Fetch systems data for resolution and editing
                const clientRes = await clientService.getClients(1, 100);
                const docTypeRes = await documentTypeService.getActiveDocumentTypes();

                const clientList = clientRes.clients.map((c: any) => ({ id: c.id, name: c.business_name || `${c.first_name} ${c.last_name}`.trim() }));
                setClients(clientList);
                setDocumentTypes(docTypeRes.map((t: any) => ({ id: t.id, name: t.name })));

                // Resolve values for display (IDs to Names)
                const mapping: Record<string, string> = {};
                for (const field of formDef.fields || []) {
                    const fieldId = field.id || '';
                    const label = field.label || '';
                    const val = normalizedData[fieldId] || normalizedData[label];

                    if (!val) continue;

                    if (label.toLowerCase() === 'client') {
                        const client = clientList.find((c: any) => String(c.id) === String(val) || String(c.name) === String(val));
                        if (client) mapping[fieldId] = client.name;
                    } else if (label.toLowerCase().includes('document type')) {
                        const type = docTypeRes.find(t => String(t.id) === String(val) || String(t.name) === String(val));
                        if (type) mapping[fieldId] = type.name;
                    }
                }
                setResolvedValues(mapping);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [documentId]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await documentService.updateDocumentFormData(documentId, editData);
            await fetchData(); // Refresh and resolve
            setIsEditing(false);
        } catch (e) {
            console.error(e);
            alert('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (fieldId: string, value: any, label?: string) => {
        setEditData((prev: any) => {
            const next = { ...prev, [fieldId]: value };
            // If we have a label and it exists in the data, keep it in sync or remove it to prefer ID
            if (label && next[label] !== undefined) {
                delete next[label];
            }
            return next;
        });
    };

    if (loading) return (
        <div className={styles.card}>
            <div className={styles.loadingContainer}>
                <Loader2 size={20} className={styles.animateSpin} />
                <span>Loading metadata...</span>
            </div>
        </div>
    );

    if (!data || (Object.keys(data).length === 0 && !isEditing)) return null;

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                    <FileText size={18} />
                    Uploaded Metadata
                </h3>
                {!isEditing && (
                    <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                        <Edit3 size={14} />
                        Edit
                    </button>
                )}
            </div>

            <div className={styles.metaList}>
                {form ? (
                    form.fields?.map(field => {
                        const fieldId = field.id || '';
                        const label = field.label || '';

                        // Robust lookup for display and edit
                        let val = isEditing ? (editData[fieldId] ?? editData[label]) : (data[fieldId] ?? data[label]);

                        // Don't show empty fields in view mode
                        if (!isEditing && (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))) return null;

                        return (
                            <div key={fieldId} className={styles.summaryItem}>
                                <div className={styles.summaryKey}>
                                    {field.label}
                                    {isEditing && field.required && <span className={styles.requiredAsterisk}>*</span>}
                                </div>

                                {isEditing ? (
                                    <div className={styles.editInterface}>
                                        {/* Render Input based on field type */}
                                        {field.label.toLowerCase() === 'client' ? (
                                            <CommonDropdown
                                                value={val || ''}
                                                onChange={(v) => handleFieldChange(fieldId, v, label)}
                                                options={[
                                                    { value: '', label: 'Select client' },
                                                    ...clients.map(c => ({ value: c.id, label: c.name }))
                                                ]}
                                                size="md"
                                            />
                                        ) : field.label.toLowerCase().includes('document type') ? (
                                            <CommonDropdown
                                                value={val || ''}
                                                onChange={(v) => handleFieldChange(fieldId, v, label)}
                                                options={[
                                                    { value: '', label: 'Select document type' },
                                                    ...documentTypes.map(t => ({ value: t.id, label: t.name }))
                                                ]}
                                                size="md"
                                            />
                                        ) : field.field_type === 'textarea' ? (
                                            <textarea
                                                className={styles.formInput}
                                                value={val || ''}
                                                onChange={(e) => handleFieldChange(fieldId, e.target.value, label)}
                                                rows={3}
                                            />
                                        ) : field.field_type === 'select' ? (
                                            <CommonDropdown
                                                value={val || ''}
                                                onChange={(v) => handleFieldChange(fieldId, v, label)}
                                                options={[
                                                    { value: '', label: 'Select an option' },
                                                    ...(field.options?.map(opt => ({ value: opt, label: opt })) || [])
                                                ]}
                                                size="md"
                                            />
                                        ) : field.field_type === 'checkbox' ? (
                                            <div className={styles.checkboxGroup}>
                                                {field.options?.map((option, idx) => (
                                                    <label key={idx} className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={(val || []).includes(option)}
                                                            onChange={(e) => {
                                                                const current = val || [];
                                                                const next = e.target.checked
                                                                    ? [...current, option]
                                                                    : current.filter((v: string) => v !== option);
                                                                handleFieldChange(fieldId, next, label);
                                                            }}
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        ) : field.field_type === 'radio' ? (
                                            <div className={styles.radioGroup}>
                                                {field.options?.map((option, idx) => (
                                                    <label key={idx} className={styles.radioLabel}>
                                                        <input
                                                            type="radio"
                                                            name={fieldId}
                                                            value={option}
                                                            checked={val === option}
                                                            onChange={(e) => handleFieldChange(fieldId, e.target.value, label)}
                                                        />
                                                        {option}
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <input
                                                type={field.field_type === 'date' ? 'date' : 'text'}
                                                className={styles.formInput}
                                                value={val || ''}
                                                onChange={(e) => handleFieldChange(fieldId, e.target.value, label)}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.summaryValue}>
                                        {resolvedValues[fieldId] || (Array.isArray(val) ? val.join(', ') : String(val))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    Object.entries(data).map(([key, value]) => {
                        if (!value) return null;
                        return (
                            <div key={key} className={styles.summaryItem}>
                                <div className={styles.summaryKey}>{key}</div>
                                <div className={styles.summaryValue}>{String(value)}</div>
                            </div>
                        );
                    })
                )}
            </div>

            {isEditing && (
                <div className={styles.cardFooter}>
                    <button
                        className={styles.cancelButton}
                        onClick={() => {
                            setIsEditing(false);
                            setEditData(data);
                        }}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};


export default DocumentDetail;