import React, { useState, useEffect } from 'react';
import { Plus, Edit, Power, PowerOff, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../../Table/Table';
import TemplateModal from './TemplateModal';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import Loading from '../../Common/Loading';
import { fetchWithAuth } from '../../../utils/api';
import statusService, { Status } from '../../../services/status.service';
import styles from './TemplateManagement.module.css';
import '../../../styles/globals/tooltips.css';

interface Template {
    id: string;
    template_name: string;
    description?: string;
    document_type_id: string;
    status_id: number;
    statusCode: string;
    extraction_fields: ExtractionField[];
    created_at: string;
    updated_at: string;
    document_type?: {
        id: string;
        name: string;
        description?: string;
    };
}

interface ExtractionField {
    fieldName: string;
    fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'EMAIL' | 'PHONE' | 'URL';
    description?: string;
    exampleValue?: string;
}

interface DocumentType {
    id: string;
    name: string;
    description?: string;
    status_id?: number;
    statusCode?: string;
}

const TemplateManagement: React.FC = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [activeStatusCode, setActiveStatusCode] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [templateToToggle, setTemplateToToggle] = useState<{ template: Template; action: 'activate' | 'deactivate' } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        loadStatuses();
        loadTemplates();
        loadDocumentTypes();
    }, []);

    const loadStatuses = async () => {
        try {
            const statusesData = await statusService.getStatuses();
            setStatuses(statusesData);
            const active = statusesData.find(s => s.code === 'ACTIVE');
            if (active) setActiveStatusCode(active.code);
        } catch (error) {
            console.error('Failed to load statuses:', error);
        }
    };

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/templates/');
            if (response.ok) {
                const data = await response.json();
                setTemplates(data);
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Failed to load templates', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            setToast({ message: 'Failed to load templates', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const loadDocumentTypes = async () => {
        try {
            const response = await fetchWithAuth('/api/document-types/');
            if (response.ok) {
                const data = await response.json();
                // Filter by 'ACTIVE' status (uppercase)
                setDocumentTypes(data.filter((dt: any) => dt.statusCode === 'ACTIVE'));
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Failed to load document types', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to load document types:', error);
            setToast({ message: 'Failed to load document types', type: 'error' });
        }
    };

    const handleCreate = () => {
        navigate('/templates/create');
    };

    const handleEdit = (template: Template) => {
        navigate(`/templates/edit/${template.id}`);
    };

    const handleToggleStatus = (template: Template, action: 'activate' | 'deactivate') => {
        setTemplateToToggle({ template, action });
        setIsConfirmModalOpen(true);
    };

    const handleModalSubmit = async (data: {
        template_name: string;
        description?: string;
        document_type_id: string;
        extraction_fields: ExtractionField[];
    }) => {
        try {
            const url = editingTemplate
                ? `/api/templates/${editingTemplate.id}`
                : '/api/templates/';

            const response = await fetchWithAuth(url, {
                method: editingTemplate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                setToast({
                    message: `Template ${editingTemplate ? 'updated' : 'created'} successfully`,
                    type: 'success'
                });
                setIsModalOpen(false);
                loadTemplates();
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Operation failed', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to save template:', error);
            setToast({ message: 'Failed to save template', type: 'error' });
        }
    };

    const confirmToggleStatus = async () => {
        if (!templateToToggle) return;

        try {
            const { template, action } = templateToToggle;
            const response = await fetchWithAuth(`/api/templates/${template.id}/${action}`, {
                method: 'PATCH'
            });

            if (response.ok) {
                setToast({
                    message: `Template ${action}d successfully`,
                    type: 'success'
                });
                setIsConfirmModalOpen(false);
                setTemplateToToggle(null);
                loadTemplates();
            } else {
                const error = await response.json();
                setToast({ message: error.detail || `Failed to ${action} template`, type: 'error' });
            }
        } catch (error) {
            console.error(`Failed to ${templateToToggle.action} template:`, error);
            setToast({ message: `Failed to ${templateToToggle.action} template`, type: 'error' });
        }
    };

    const getDocumentTypeName = (template: Template) => {
        // First try to get from the relationship
        if (template.document_type?.name) {
            return template.document_type.name;
        }
        // Fallback to lookup in documentTypes array
        const docType = documentTypes.find(dt => dt.id === template.document_type_id);
        return docType?.name || 'Unknown';
    };

    const columns = [
        { key: 'template_name', header: 'Template Name', sortable: true },
        {
            key: 'document_type_id',
            header: 'Document Type',
            sortable: false,
            render: (_: string, row: Template) => getDocumentTypeName(row)
        },
        { key: 'description', header: 'Description', sortable: false },
        {
            key: 'extraction_fields',
            header: 'Fields',
            sortable: false,
            render: (value: ExtractionField[]) => `${value?.length || 0} fields`
        },
        {
            key: 'statusCode',
            header: 'Status',
            sortable: false,
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
            render: (value: string) => new Date(value).toLocaleDateString()
        },
        {
            key: 'actions',
            header: 'Actions',
            sortable: false,
            render: (_: any, row: Template) => (
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
                                onClick={() => handleToggleStatus(row, 'deactivate')}
                            >
                                <PowerOff size={16} />
                            </button>
                        </span>
                    ) : (
                        <span className="tooltip-wrapper" data-tooltip="Activate">
                            <button
                                className={styles.activateButton}
                                onClick={() => handleToggleStatus(row, 'activate')}
                            >
                                <Power size={16} />
                            </button>
                        </span>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className={styles.container}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className={styles.header}>
                <h2>
                    <Layout size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Templates
                </h2>
                <button className={styles.createButton} onClick={handleCreate}>
                    <Plus size={16} />
                    Add Template
                </button>
            </div>

            {loading ? (
                <Loading message="Loading templates..." />
            ) : templates.length === 0 ? (
                <div className={styles.emptyState}>
                    <Layout size={48} />
                    <h3>No templates found</h3>
                    <p>Get started by creating your first template</p>
                </div>
            ) : (
                <Table
                    data={templates}
                    columns={columns}
                    maxHeight="calc(100vh - 340px)"
                />
            )}

            <TemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                initialData={editingTemplate}
                documentTypes={documentTypes}
                title={editingTemplate ? 'Edit Template' : 'Create Template'}
            />

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmToggleStatus}
                title={`${templateToToggle?.action === 'activate' ? 'Activate' : 'Deactivate'} Template`}
                message={`Are you sure you want to ${templateToToggle?.action} "${templateToToggle?.template.template_name}"?`}
                confirmText={templateToToggle?.action === 'activate' ? 'Activate' : 'Deactivate'}
                type={templateToToggle?.action === 'activate' ? 'warning' : 'warning'}
            />
        </div>
    );
};

export default TemplateManagement;