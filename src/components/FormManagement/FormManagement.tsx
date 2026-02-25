import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, FileText, CheckCircle, XCircle, StopCircle, PlayCircle, FileEdit } from 'lucide-react';
import Table from '../Table/Table';
import Loading from '../Common/Loading';
import formService, { Form, FormStats } from '../../services/form.service';
import CommonPagination from '../Common/CommonPagination';
import { Tooltip } from "../Common/Tooltip";
import ConfirmModal from '../Common/ConfirmModal';
import Toast from '../Common/Toast';
import styles from './FormManagement.module.css';
import authService from '../../services/auth.service';

const FormManagement: React.FC = () => {
    const navigate = useNavigate();
    const [forms, setForms] = useState<Form[]>([]);
    const [stats, setStats] = useState<FormStats>({ total_forms: 0, active_forms: 0, inactive_forms: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [formToDelete, setFormToDelete] = useState<string | null>(null);
    const [activateModalOpen, setActivateModalOpen] = useState(false);
    const [formToActivate, setFormToActivate] = useState<Form | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const user = authService.getUser();
    const isSuperAdmin = user?.role?.name === "SUPER_ADMIN";


useEffect(() => {
    fetchForms(currentPage, statusFilter);
    fetchStats();
}, [currentPage, statusFilter]);


    const fetchForms = async (page: number, status?: string | null) => {
        try {
            setLoading(true);
                const response = await formService.getForms(page, 10, status || undefined);
            setForms(response.forms);
            setTotalPages(Math.ceil(response.total / response.page_size));
        } catch (error) {
            console.error('Failed to fetch forms', error);
            setToast({ message: 'Failed to fetch forms', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await formService.getFormStats();
            setStats(response);
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const handleDeleteClick = (id: string) => {
        setFormToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!formToDelete) return;

        setActionLoading(formToDelete);
        try {
            await formService.deleteForm(formToDelete);
            setToast({ message: 'Form deleted successfully', type: 'success' });
            fetchForms(currentPage, statusFilter);
            fetchStats();
        } catch (error) {
            setToast({ message: 'Failed to delete form', type: 'error' });
        } finally {
            setActionLoading(null);
            setDeleteModalOpen(false);
            setFormToDelete(null);
        }
    };

    const handleToggleStatus = async (form: Form) => {
        const isActive = form.statusCode === 'ACTIVE';

        setActionLoading(form.id);
        if (isActive) {
            // Deactivate directly
            try {
                await formService.updateForm(form.id, { status_id: 'INACTIVE' });
                setToast({ message: 'Form deactivated successfully', type: 'success' });
                fetchForms(currentPage, statusFilter);
                fetchStats();
            } catch (error) {
                setToast({ message: 'Failed to deactivate form', type: 'error' });
            } finally {
                setActionLoading(null);
            }
        } else {
            // Show confirmation for activation
            setActionLoading(null);
            setFormToActivate(form);
            setActivateModalOpen(true);
        }
    };

    const confirmActivate = async () => {
        if (!formToActivate) return;

        setActionLoading(formToActivate.id);
        try {
            await formService.updateForm(formToActivate.id, { status_id: 'ACTIVE' });
            setToast({ message: 'Form activated successfully. All other forms have been deactivated.', type: 'success' });
            fetchForms(currentPage, statusFilter);
            fetchStats();
        } catch (error) {
            setToast({ message: 'Failed to activate form', type: 'error' });
        } finally {
            setActionLoading(null);
            setActivateModalOpen(false);
            setFormToActivate(null);
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Form Name',
            render: (value: string) => <span style={{ fontWeight: 500 }}>{value}</span>
        },
        {
            key: 'fields_count',
            header: 'Fields',
            render: (value: number) => <span>{value || 0} fields</span>
        },
        {
            key: 'created_at',
            header: 'Created At',
            render: (value: string) => new Date(value).toLocaleDateString()
        },
        ...(isSuperAdmin
  ? [{
      key: 'organisation_name',
      header: 'Organisation',
      render: (v: string) => <span>{v || '-'}</span>
    }]
  : []),
        {
        key: 'created_by_name',
        header: 'Created By',
        render: (v: string) => <span>{v || '-'}</span>
        },
        {
            key: 'statusCode',
            header: 'Status',
            render: (value: string) => {
                const isActive = value === 'ACTIVE';
                return (
                    <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: Form) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip="Edit">
                        <button
                            className="action-btn edit"
                            onClick={() => navigate(`/forms/${row.id}`)}
                        >
                            <Edit2 size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip={row.statusCode === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                        <button
                            className={`action-btn ${row.statusCode === 'ACTIVE' ? 'deactivate' : 'activate'} ${actionLoading === row.id ? 'loading' : ''}`}
                            onClick={() => handleToggleStatus(row)}
                            disabled={actionLoading === row.id}
                        >
                            {actionLoading === row.id ? (
                                <div className="spinner" />
                            ) : (
                                row.statusCode === 'ACTIVE' ? <StopCircle size={14} /> : <PlayCircle size={14} />
                            )}
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip="Delete">
                        <button
                            className="action-btn delete"
                            onClick={() => handleDeleteClick(row.id)}
                        >
                            <Trash2 size={14} />
                        </button>
                    </span>
                </div>
            )
        }
    ];

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.statsGrid}>
                    <div
  className={styles.statCard}
  onClick={() => {
    setStatusFilter(null);
    setCurrentPage(1);
  }}
>

                        <div className={`${styles.statIcon} ${styles.iconTotal}`}>
                            <FileText size={16} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.total_forms}</span>
                            <span className={styles.statLabel}>Total Forms</span>
                        </div>
                    </div>
<div
  className={styles.statCard}
  onClick={() => {
    setStatusFilter('ACTIVE');
    setCurrentPage(1);
  }}
>
                        <div className={`${styles.statIcon} ${styles.iconActive}`}>
                            <CheckCircle size={16} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.active_forms}</span>
                            <span className={styles.statLabel}>Active Forms</span>
                        </div>
                    </div>
<div
  className={styles.statCard}
  onClick={() => {
    setStatusFilter('INACTIVE');
    setCurrentPage(1);
  }}
>
                        <div className={`${styles.statIcon} ${styles.iconInactive}`}>
                            <XCircle size={16} />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats.inactive_forms}</span>
                            <span className={styles.statLabel}>Inactive Forms</span>
                        </div>
                    </div>
                </div>

                <div className={styles.header}>
                    <h1 className={styles.title}>
                        <FileEdit size={18} />
                        Form Templates
                    </h1>
                    <button
                        className={styles.createButton}
                        onClick={() => navigate('/forms/create')}
                    >
                        <Plus size={18} />
                        Create New Form
                    </button>
                </div>

                <Loading message="Loading forms..." />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.statsGrid}>
<div
  className={styles.statCard}
  onClick={() => {
    setStatusFilter(null);
    setCurrentPage(1);
  }}
>
                    <div className={`${styles.statIcon} ${styles.iconTotal}`}>
                        <FileText size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.total_forms}</span>
                        <span className={styles.statLabel}>Total Forms</span>
                    </div>
                </div>
<div
  className={styles.statCard}
  onClick={() => {
    setStatusFilter('ACTIVE');
    setCurrentPage(1);
  }}
>
                    <div className={`${styles.statIcon} ${styles.iconActive}`}>
                        <CheckCircle size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.active_forms}</span>
                        <span className={styles.statLabel}>Active Forms</span>
                    </div>
                </div>
<div
  className={styles.statCard}
  onClick={() => {
    setStatusFilter('INACTIVE');
    setCurrentPage(1);
  }}
>
                    <div className={`${styles.statIcon} ${styles.iconInactive}`}>
                        <XCircle size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{stats.inactive_forms}</span>
                        <span className={styles.statLabel}>Inactive Forms</span>
                    </div>
                </div>
            </div>

            <div className={styles.header}>
                <h1 className={styles.title}>
                    <FileEdit size={18} />
                    Form Templates
                </h1>
                <button
                    className={styles.createButton}
                    onClick={() => navigate('/forms/create')}
                >
                    <Plus size={18} />
                    Create New Form
                </button>
            </div>

            {forms.length === 0 ? (
                <div className={styles.emptyState}>
                    <FileText size={48} />
                    <p>No forms available</p>
                    <button
                        className={styles.createButton}
                        onClick={() => navigate('/forms/create')}
                    >
                        <Plus size={20} />
                        Create Your First Form
                    </button>
                </div>
            ) : (
                <Table
                    columns={columns}
                    data={forms}
                    maxHeight="calc(100vh - 340px)"
                />
            )}

            <CommonPagination
                show={totalPages > 1}
                pageCount={totalPages}
                onPageChange={(selected) => setCurrentPage(selected.selected + 1)}
            />

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Form"
                message="Are you sure you want to delete this form? This action cannot be undone."
            />

            <ConfirmModal
                isOpen={activateModalOpen}
                onClose={() => {
                    setActivateModalOpen(false);
                    setFormToActivate(null);
                }}
                onConfirm={confirmActivate}
                title="Activate Form"
                message="This will deactivate the older one and activate the selected one. Do you want to continue?"
                confirmText="Activate"
                type="warning"
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

export default FormManagement;
