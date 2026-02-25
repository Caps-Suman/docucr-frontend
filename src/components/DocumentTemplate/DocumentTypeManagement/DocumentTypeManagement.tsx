import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Files, CheckCircle, XCircle } from 'lucide-react';
import Table from '../../Table/Table';
import DocumentTypeModal from './DocumentTypeModal';
import { Tooltip } from "../../Common/Tooltip";
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import Loading from '../../Common/Loading';
import { fetchWithAuth } from '../../../utils/api';
import documentTypeService from '../../../services/documentType.service';
import styles from './DocumentTypeManagement.module.css';
import '../../../styles/globals/tooltips.css';

interface DocumentType {
    id: string;
    name: string;
    description?: string;
    status_id: number;
    statusCode: string;
    created_at: string;
    updated_at: string;
}

const DocumentTypeManagement: React.FC = () => {
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDocumentType, setEditingDocumentType] = useState<DocumentType | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [documentTypeToDelete, setDocumentTypeToDelete] = useState<DocumentType | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadDocumentTypes();
    }, []);

    const loadDocumentTypes = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/document-types');
            if (response.ok) {
                const data = await response.json();
                setDocumentTypes(data);
            }
        } catch (error) {
            console.error('Failed to load document types:', error);
            setToast({ message: 'Failed to load document types', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingDocumentType(null);
        setIsModalOpen(true);
    };

    const handleEdit = (documentType: DocumentType) => {
        setEditingDocumentType(documentType);
        setIsModalOpen(true);
    };

    const handleDelete = (documentType: DocumentType) => {
        setDocumentTypeToDelete(documentType);
        setIsConfirmModalOpen(true);
    };

    const handleActivate = async (documentType: DocumentType) => {
        try {
            await documentTypeService.activateDocumentType(documentType.id);
            setToast({ message: 'Document type activated successfully', type: 'success' });
            loadDocumentTypes();
        } catch (error) {
            console.error('Failed to activate document type:', error);
            setToast({ message: 'Failed to activate document type', type: 'error' });
        }
    };

    const handleDeactivate = async (documentType: DocumentType) => {
        try {
            await documentTypeService.deactivateDocumentType(documentType.id);
            setToast({ message: 'Document type deactivated successfully', type: 'success' });
            loadDocumentTypes();
        } catch (error) {
            console.error('Failed to deactivate document type:', error);
            setToast({ message: 'Failed to deactivate document type', type: 'error' });
        }
    };

    const handleModalSubmit = async (data: { name: string; description?: string }) => {
        try {
             const payload = {
            ...data,
            name: data.name.trim().toUpperCase()
        };
            const url = editingDocumentType
                ? `/api/document-types/${editingDocumentType.id}`
                : '/api/document-types';

            const response = await fetchWithAuth(url, {
                method: editingDocumentType ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setToast({
                    message: `Document type ${editingDocumentType ? 'updated' : 'created'} successfully`,
                    type: 'success'
                });
                setIsModalOpen(false);
                loadDocumentTypes();
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Operation failed', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to save document type:', error);
            setToast({ message: 'Failed to save document type', type: 'error' });
        }
    };

    const confirmDelete = async () => {
        if (!documentTypeToDelete) return;

        try {
            const response = await fetchWithAuth(`/api/document-types/${documentTypeToDelete.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setToast({ message: 'Document type deleted successfully', type: 'success' });
                setIsConfirmModalOpen(false);
                setDocumentTypeToDelete(null);
                loadDocumentTypes();
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Failed to delete document type', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to delete document type:', error);
            setToast({ message: 'Failed to delete document type', type: 'error' });
        }
    };

    const columns = [
        { key: 'name', header: 'Name', sortable: true, width: '200px' },
        { 
            key: 'description', 
            header: 'Description', 
            sortable: false,
            width: '350px',
            render: (value: string, row: DocumentType) => {
                if (!value) return '-';
                const isExpanded = expandedDescriptions.has(row.id);
                const shouldTruncate = value.length > 100;
                
                return (
                    <div>
                        <span>{isExpanded || !shouldTruncate ? value : `${value.substring(0, 100)}...`}</span>
                        {shouldTruncate && (
                            <button
                                onClick={() => {
                                    const newExpanded = new Set(expandedDescriptions);
                                    if (isExpanded) {
                                        newExpanded.delete(row.id);
                                    } else {
                                        newExpanded.add(row.id);
                                    }
                                    setExpandedDescriptions(newExpanded);
                                }}
                                style={{
                                    marginLeft: '8px',
                                    color: '#0284c7',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}
                            >
                                {isExpanded ? 'Less' : 'More'}
                            </button>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'statusCode',
            header: 'Status',
            sortable: true,
            width: '120px',
            render: (value: string) => (
                <span className={`status-badge ${value === 'ACTIVE' ? 'active' : 'inactive'}`}>
                    {value === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            key: 'created_at',
            header: 'Created',
            sortable: true,
            width: '120px',
            render: (value: string) => new Date(value).toLocaleDateString()
        },
        {
            key: 'actions',
            header: 'Actions',
            sortable: false,
            width: '120px',
            render: (_: any, row: DocumentType) => (
                <div className={styles.actions}>
                    <span className="tooltip-wrapper" data-tooltip="Edit">
                        <button
                            className={styles.editButton}
                            onClick={() => handleEdit(row)}
                        >
                            <Edit size={16} />
                        </button>
                    </span>
                    {row.statusCode === 'ACTIVE' ? (
                        <span className="tooltip-wrapper" data-tooltip="Deactivate">
                            <button
                                className={styles.deactivateButton}
                                onClick={() => handleDeactivate(row)}
                            >
                                <XCircle size={16} />
                            </button>
                        </span>
                    ) : (
                        <span className="tooltip-wrapper" data-tooltip="Activate">
                            <button
                                className={styles.activateButton}
                                onClick={() => handleActivate(row)}
                            >
                                <CheckCircle size={16} />
                            </button>
                        </span>
                    )}
                    {/* <span className="tooltip-wrapper" data-tooltip="Delete">
                        <button
                            className={styles.deleteButton}
                            onClick={() => handleDelete(row)}
                        >
                            <Trash2 size={16} />
                        </button>
                    </span> */}
                </div>
            )
        }
    ];

    return (
        <div className={styles.container}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className={styles.header}>
                <h2>
                    <Files size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Document Types
                </h2>
                <button className={styles.createButton} onClick={handleCreate}>
                    <Plus size={16} />
                    Add Document Type
                </button>
            </div>

            {loading ? (
                <Loading message="Loading document types..." />
            ) : documentTypes.length === 0 ? (
                <div className={styles.emptyState}>
                    <Files size={48} />
                    <h3>No document types found</h3>
                    <p>Get started by creating your first document type</p>
                    {/* <button className={styles.createButton} onClick={handleCreate}>
                        <Plus size={16} />
                        Add Document Type
                    </button> */}
                </div>
            ) : (
                <Table
                    data={documentTypes}
                    columns={columns}
                    maxHeight="calc(100vh - 340px)"
                />
            )}

            <DocumentTypeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                initialData={editingDocumentType}
                title={editingDocumentType ? 'Edit Document Type' : 'Create Document Type'}
            />

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Document Type"
                message={`Are you sure you want to delete "${documentTypeToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
};

export default DocumentTypeManagement;