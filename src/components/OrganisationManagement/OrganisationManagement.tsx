import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Shield, Edit2, StopCircle, PlayCircle, Building2, Key } from 'lucide-react';
import Table from '../Table/Table';
import CommonPagination from '../Common/CommonPagination';
import Loading from '../Common/Loading';
import OrganisationModal from './OrganisationModal';
import ChangePasswordModal from '../UserPermissionManagement/UserManagement/ChangePasswordModal';
import ConfirmModal from '../Common/ConfirmModal';
import Toast, { ToastType } from '../Common/Toast';
import organisationService, { Organisation, OrganisationStats } from '../../services/organisation.service';
import './OrganisationManagement.css';

const OrganisationManagement: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [organisations, setOrganisations] = useState<Organisation[]>([]);
    const [stats, setStats] = useState<OrganisationStats | null>(null);
    const [totalOrganisations, setTotalOrganisations] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
    const [changePasswordOrg, setChangePasswordOrg] = useState<Organisation | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; org: Organisation | null; action: 'toggle' }>({ isOpen: false, org: null, action: 'toggle' });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [currentPage, itemsPerPage, statusFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [orgsData, statsData] = await Promise.all([
                organisationService.getOrganisations(currentPage + 1, itemsPerPage, undefined, statusFilter || undefined),
                organisationService.getOrganisationStats()
            ]);
            setOrganisations(orgsData.organisations);
            setTotalOrganisations(orgsData.total);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load organisations:', error);
            setToast({ message: 'Failed to load organisations', type: 'error' });
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    };

    const handleEdit = (org: Organisation) => {
        setEditingOrg(org);
        setIsModalOpen(true);
    };

    const handleChangePassword = (org: Organisation) => {
        setChangePasswordOrg(org);
    };

    const handlePasswordSubmit = async (password: string) => {
        if (!changePasswordOrg) return;
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/organisations/${changePasswordOrg.id}/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ new_password: password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to change password');
            }

            setToast({ message: 'Password changed successfully', type: 'success' });
            setChangePasswordOrg(null);
        } catch (error: any) {
            console.error('Failed to change password:', error);
            setToast({ message: error.message || 'Failed to change password', type: 'error' });
            throw error;
        }
    };

    const handleAddNew = () => {
        setEditingOrg(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingOrg(null);
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (editingOrg) {
                await organisationService.updateOrganisation(editingOrg.id, data);
                setToast({ message: 'Organisation updated successfully', type: 'success' });
            } else {
                await organisationService.createOrganisation(data);
                setToast({ message: 'Organisation created successfully', type: 'success' });
            }
            handleModalClose();
            loadData();
        } catch (error: any) {
            console.error('Failed to save organisation:', error);
            const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save organisation';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    const handleToggleStatus = (org: Organisation) => {
        setConfirmModal({ isOpen: true, org, action: 'toggle' });
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.org) return;

        try {
            const isActive = confirmModal.org.statusCode === 'ACTIVE';
            if (isActive) {
                await organisationService.deactivateOrganisation(confirmModal.org.id);
                setToast({ message: 'Organisation deactivated successfully', type: 'success' });
            } else {
                await organisationService.deactivateOrganisation(confirmModal.org.id);
                setToast({ message: 'Organisation deactivated successfully', type: 'success' });
            }
            loadData();
        } catch (error: any) {
            console.error('Failed to perform action:', error);
            const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to perform action';
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setConfirmModal({ isOpen: false, org: null, action: 'toggle' });
        }
    };

    const handleStatClick = (type: 'total' | 'active' | 'inactive') => {
        if (type === 'total') {
            setStatusFilter(null);
        } else if (type === 'active') {
            setStatusFilter('ACTIVE');
        } else if (type === 'inactive') {
            setStatusFilter('INACTIVE');
        }
        setCurrentPage(0);
    };

    interface StatItem {
        title: string;
        value: string;
        icon: React.ElementType;
        color: string;
        onClick?: () => void;
        active?: boolean;
    }

    const orgStats: StatItem[] = [
        {
            title: 'All Organisations',
            value: stats?.total_organisations.toString() || '0',
            icon: Building2,
            color: 'blue',
            onClick: () => handleStatClick('total'),
            active: statusFilter === null
        },
        {
            title: 'Active Organisations',
            value: stats?.active_organisations.toString() || '0',
            icon: UserCheck,
            color: 'green',
            onClick: () => handleStatClick('active'),
            active: statusFilter === 'ACTIVE'
        },
        {
            title: 'Inactive Organisations',
            value: stats?.inactive_organisations.toString() || '0',
            icon: UserX,
            color: 'red',
            onClick: () => handleStatClick('inactive'),
            active: statusFilter === 'INACTIVE'
        }
    ];

    const columns = [
        {
            key: 'name',
            header: 'Organisation Name',
            render: (_: any, row: Organisation) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                </div>
            )
        },
        {
            key: 'username',
            header: 'Details',
            render: (_: any, row: Organisation) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>
                        {row.first_name} {row.middle_name ? row.middle_name + ' ' : ''}{row.last_name}
                    </span>
                    <span className="username-badge">{row.username}</span>
                </div>
            )
        },
        {
            key: 'phone',
            header: 'Phone',
            render: (_: any, row: Organisation) => {
                const phone = row.phone_country_code && row.phone_number
                    ? `${row.phone_country_code}-${row.phone_number}`
                    : null;
                return phone ? (
                    <span>{phone}</span>
                ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</span>
                );
            }
        },
        { key: 'email', header: 'Email' },
        {
            key: 'statusCode',
            header: 'Status',
            render: (value: string | undefined) => {
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
            render: (_: any, row: Organisation) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip="Edit">
                        <button className="action-btn edit" onClick={() => handleEdit(row)}>
                            <Edit2 size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip="Change Password">
                        <button
                            className="action-btn edit"
                            onClick={() => handleChangePassword(row)}
                            style={{ color: '#f59e0b', background: '#fef3c7' }}
                        >
                            <Key size={14} />
                        </button>
                    </span>
                    {row.statusCode === 'ACTIVE' && (
                        <span className="tooltip-wrapper" data-tooltip="Deactivate">
                            <button
                                className="action-btn deactivate"
                                onClick={() => handleToggleStatus(row)}
                            >
                                <StopCircle size={14} />
                            </button>
                        </span>
                    )}
                    {row.statusCode !== 'ACTIVE' && (
                        <span className="tooltip-wrapper" data-tooltip="Activate not implemented">
                            <button
                                className="action-btn activate"
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                onClick={() => { }}
                            >
                                <PlayCircle size={14} />
                            </button>
                        </span>
                    )}
                </div>
            )
        }
    ];

    if (isInitialLoading) {
        return <Loading message="Loading organisations..." />;
    }

    return (
        <div className="management-content">
            <div className="stats-grid">
                {orgStats.map((stat, index) => (
                    <div
                        key={index}
                        className={`stat-card ${stat.color} ${stat.onClick ? 'clickable' : ''} ${stat.active ? 'selected' : ''}`}
                        onClick={stat.onClick}
                        style={{ cursor: stat.onClick ? 'pointer' : 'default' }}
                    >
                        <div className="stat-icon">
                            <stat.icon size={16} />
                        </div>
                        <div className="stat-content">
                            <h3>{stat.value}</h3>
                            <p>{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="table-section" style={{ position: 'relative' }}>
                <div className="table-header">
                    <h2>
                        <Building2 size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Organisations
                    </h2>
                    <button className="add-btn" onClick={handleAddNew}>
                        Add Organisation
                    </button>
                </div>
                <Table
                    columns={columns}
                    data={organisations}
                    maxHeight="calc(100vh - 360px)"
                />
                {loading && !isInitialLoading && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255, 255, 255, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                    }}>
                        <Loading message="Updating..." />
                    </div>
                )}
            </div>

            <CommonPagination
                show={totalOrganisations > 0}
                pageCount={Math.ceil(totalOrganisations / itemsPerPage)}
                currentPage={currentPage}
                totalItems={totalOrganisations}
                itemsPerPage={itemsPerPage}
                onPageChange={(data) => setCurrentPage(data.selected)}
                onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(0);
                }}
            />
            <OrganisationModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                initialData={editingOrg ? {
                    id: editingOrg.id,
                    name: editingOrg.name,
                    email: editingOrg.email,
                    username: editingOrg.username,
                    first_name: editingOrg.first_name,
                    middle_name: editingOrg.middle_name,
                    last_name: editingOrg.last_name,
                    phone_country_code: editingOrg.phone_country_code,
                    phone_number: editingOrg.phone_number
                } : undefined}
                title={editingOrg ? 'Edit Organisation' : 'Add New Organisation'}
            />

            <ChangePasswordModal
                isOpen={!!changePasswordOrg}
                onClose={() => setChangePasswordOrg(null)}
                onSubmit={handlePasswordSubmit}
                username={changePasswordOrg?.name || ''}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, org: null, action: 'toggle' })}
                onConfirm={handleConfirmAction}
                title="Deactivate Organisation"
                message="Are you sure you want to deactivate this organisation?"
                confirmText="Deactivate"
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

export default OrganisationManagement;
