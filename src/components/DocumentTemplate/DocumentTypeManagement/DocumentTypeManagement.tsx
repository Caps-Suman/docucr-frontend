import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Files } from 'lucide-react';
import Table from '../../Table/Table';
import DocumentTypeModal from './DocumentTypeModal';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import { fetchWithAuth } from '../../../utils/api';
import styles from './DocumentTypeManagement.module.css';

interface DocumentType {
    id: string;
    name: string;
    description?: string;
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

    useEffect(() => {
        loadDocumentTypes();
    }, []);

    const loadDocumentTypes = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/document-types/');
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

    const handleModalSubmit = async (data: { name: string; description?: string }) => {
        try {
            const url = editingDocumentType 
                ? `/api/document-types/${editingDocumentType.id}` 
                : '/api/document-types/';
            
            const response = await fetchWithAuth(url, {
                method: editingDocumentType ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
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
        { key: 'name', header: 'Name', sortable: true },
        { key: 'description', header: 'Description', sortable: false },
        { 
            key: 'created_at', 
            header: 'Created', 
            sortable: true,
            render: (value: string) => new Date(value).toLocaleDateString()
        },
        {
            key: 'actions',
            header: 'Actions',
            sortable: false,
            render: (_: any, row: DocumentType) => (
                <div className={styles.actions}>
                    <button
                        className={styles.editButton}
                        onClick={() => handleEdit(row)}
                        title="Edit"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(row)}
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
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
                <div className={styles.loading}>
                    Loading...
                </div>
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