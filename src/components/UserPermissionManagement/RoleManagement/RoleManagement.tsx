import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, UserX, Edit2, StopCircle, PlayCircle } from 'lucide-react';
import Table from '../../Table/Table';
import CommonPagination from '../../Common/CommonPagination';
import Loading from '../../Common/Loading';
import RoleModal from './RoleModal';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import roleService, { Role, RoleStats } from '../../../services/role.service';
import modulesService from '../../../services/modules.service';
import privilegeService, { Privilege } from '../../../services/privilege.service';
import statusService, { Status } from '../../../services/status.service';
import '../UserManagement/UserManagement.css';

const RoleManagement: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [roles, setRoles] = useState<Role[]>([]);
    const [stats, setStats] = useState<RoleStats | null>(null);
    const [totalRoles, setTotalRoles] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [modules, setModules] = useState<Array<{ id: string; name: string; label: string }>>([]);
    const [privileges, setPrivileges] = useState<Privilege[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [activeStatusId, setActiveStatusId] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; role: Role | null }>({ isOpen: false, role: null });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [currentPage, itemsPerPage, statusFilter]);

    useEffect(() => {
        loadModulesAndPrivileges();
    }, []);



    const loadModulesAndPrivileges = async () => {
        try {
            const [modulesData, privilegesData] = await Promise.all([
                modulesService.getAllModules(),
                privilegeService.getPrivileges()
            ]);
            console.log('Modules loaded:', modulesData);
            console.log('Privileges loaded:', privilegesData);
            setModules(modulesData.map(m => ({ id: m.id, name: m.name, label: m.label })));
            setPrivileges(privilegesData);
        } catch (error) {
            console.error('Failed to load modules/privileges:', error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [rolesData, statsData] = await Promise.all([
                roleService.getRoles(currentPage + 1, itemsPerPage, statusFilter || undefined),
                roleService.getRoleStats()
            ]);
            setRoles(rolesData.roles);
            setTotalRoles(rolesData.total);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load roles:', error);
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    };

    const handleEdit = (role: Role) => {
        if (!role.can_edit) {
            setToast({ message: 'System roles cannot be edited', type: 'warning' });
            return;
        }
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingRole(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingRole(null);
    };

    const handleModalSubmit = async (data: { name: string; description: string; modules: Array<{ module_id: string; privilege_id: string }> }) => {
        try {
            if (editingRole) {
                await roleService.updateRole(editingRole.id, {
                    name: data.name,
                    description: data.description,
                    modules: data.modules
                });
                setToast({ message: 'Role updated successfully', type: 'success' });
            } else {
                await roleService.createRole({
                    name: data.name,
                    description: data.description,
                    modules: data.modules
                });
                setToast({ message: 'Role created successfully', type: 'success' });
            }
            handleModalClose();
            loadData();
        } catch (error: any) {
            console.error('Failed to save role:', error);
            const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save role';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    const handleToggleStatus = (role: Role) => {
        if (!role.can_edit) {
            setToast({ message: 'System roles cannot be modified', type: 'warning' });
            return;
        }
        const isActive = role.statusCode === 'ACTIVE';
        if (isActive) {
            setConfirmModal({ isOpen: true, role });
            return;
        }
        toggleRoleStatus(role);
    };

    const toggleRoleStatus = async (role: Role) => {
        try {
            const isActive = role.statusCode === 'ACTIVE';
            const newStatusId = isActive ? 'INACTIVE' : 'ACTIVE';
            await roleService.updateRole(role.id, { status_id: newStatusId });
            loadData();
        } catch (error) {
            console.error('Failed to update role status:', error);
        }
    };

    const handleConfirmDeactivate = async () => {
        if (confirmModal.role) {
            await toggleRoleStatus(confirmModal.role);
            setConfirmModal({ isOpen: false, role: null });
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

    const roleStats: Array<{
        title: string;
        value: string;
        icon: any;
        color: string;
        onClick?: () => void;
        active: boolean;
    }> = [
            {
                title: 'Total Roles',
                value: stats?.total_roles.toString() || '0',
                icon: Shield,
                color: 'blue',
                onClick: () => handleStatClick('total'),
                active: statusFilter === null
            },
            {
                title: 'Active Roles',
                value: stats?.active_roles.toString() || '0',
                icon: UserCheck,
                color: 'green',
                onClick: () => handleStatClick('active'),
                active: statusFilter === 'ACTIVE'
            },
            {
                title: 'Inactive Roles',
                value: stats?.inactive_roles.toString() || '0',
                icon: UserX,
                color: 'orange',
                onClick: () => handleStatClick('inactive'),
                active: statusFilter === 'INACTIVE'
            }
        ];

    const roleColumns = [
        { key: 'name', header: 'Role Name' },
        { key: 'description', header: 'Description' },
        {
            key: 'statusCode',
            header: 'Status',
            render: (value: string | null) => {
                const isActive = value === 'ACTIVE';
                return (
                    <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                );
            }
        },
        { key: 'users_count', header: 'Users Count' },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: Role) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip={row.can_edit ? "Edit" : "Cannot edit system role"}>
                        <button
                            className="action-btn edit"
                            onClick={() => handleEdit(row)}
                            style={{ opacity: row.can_edit ? 1 : 0.5, cursor: row.can_edit ? 'pointer' : 'not-allowed' }}
                        >
                            <Edit2 size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip={row.can_edit ? (row.statusCode === 'ACTIVE' ? 'Deactivate' : 'Activate') : "Cannot modify system role"}>
                        <button
                            className={`action-btn ${row.statusCode === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                            onClick={() => handleToggleStatus(row)}
                            style={{ opacity: row.can_edit ? 1 : 0.5, cursor: row.can_edit ? 'pointer' : 'not-allowed' }}
                        >
                            {row.statusCode === 'ACTIVE' ? <StopCircle size={14} /> : <PlayCircle size={14} />}
                        </button>
                    </span>
                </div>
            )
        }
    ];

    if (isInitialLoading) {
        return <Loading message="Loading roles..." />;
    }

    return (
        <div className="management-content">
            <div className="stats-grid">
                {roleStats.map((stat, index) => (
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
                        <Shield size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Roles
                    </h2>
                    <button className="add-btn" onClick={handleAddNew}>
                        Add Role
                    </button>
                </div>
                <Table
                    columns={roleColumns}
                    data={roles}
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
                show={totalRoles > itemsPerPage}
                pageCount={Math.ceil(totalRoles / itemsPerPage)}
                currentPage={currentPage}
                totalItems={totalRoles}
                itemsPerPage={itemsPerPage}
                onPageChange={(data) => setCurrentPage(data.selected)}
                onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(0);
                }}
            />

            <RoleModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                initialData={editingRole ? { name: editingRole.name, description: editingRole.description || '', id: editingRole.id } : undefined}
                title={editingRole ? 'Edit Role' : 'Add New Role'}
                modules={modules}
                privileges={privileges}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, role: null })}
                onConfirm={handleConfirmDeactivate}
                title="Deactivate Role"
                message={confirmModal.role?.users_count ?
                    `Deactivating this role will also affect ${confirmModal.role.users_count} user(s) assigned to it. Are you sure you want to continue?` :
                    `Are you sure you want to deactivate this role?`
                }
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

export default RoleManagement;