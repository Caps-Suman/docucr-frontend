import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Shield, Edit2, StopCircle, PlayCircle, Key } from 'lucide-react';
import Table from '../../Table/Table';
import CommonPagination from '../../Common/CommonPagination';
import Loading from '../../Common/Loading';
import UserModal from './UserModal';
import ChangePasswordModal from './ChangePasswordModal';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import userService, { User, UserStats } from '../../../services/user.service';
import roleService from '../../../services/role.service';
import statusService, { Status } from '../../../services/status.service';
import './UserManagement.css';
import ClientModal from '../../ClientManagement/ClientModal';
import clientService from '../../../services/client.service';
import ClientMappingModal from './ClientMappingModal';

const UserManagement: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
    // const [supervisors, setSupervisors] = useState<Array<{ id: string; name: string }>>([]);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; user: User | null; action: 'toggle' }>({ isOpen: false, user: null, action: 'toggle' });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Cross-creation state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [crossCreationData, setCrossCreationData] = useState<any>(null);
    const [showCrossCreationConfirm, setShowCrossCreationConfirm] = useState(false);

    // Client Mapping State
    const [clientMappingModal, setClientMappingModal] = useState<{ isOpen: boolean; user: User | null }>({
        isOpen: false,
        user: null
    });

    const handleOpenMapping = (user: User) => {
        setClientMappingModal({ isOpen: true, user });
    };

    const handleCloseMapping = () => {
        setClientMappingModal({ isOpen: false, user: null });
    };

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [currentPage, itemsPerPage, statusFilter]);

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            const rolesData = await roleService.getAssignableRoles(1, 100);
            setRoles(rolesData.roles.map(r => ({ id: r.id, name: r.name })));
        } catch (error) {
            console.error('Failed to load roles:', error);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, statsData] = await Promise.all([
                userService.getUsers(currentPage + 1, itemsPerPage, undefined, statusFilter || undefined),
                userService.getUserStats()
            ]);
            setUsers(usersData.users);
            setTotalUsers(usersData.total);
            setStats(statsData);

            // Load supervisors (all users except current)
            // const allUsers = await userService.getUsers(1, 1000);
            // setSupervisors(allUsers.users.map(u => ({
            //     id: u.id,
            //     name: `${u.first_name} ${u.last_name} (${u.username})`
            // })));
        } catch (error) {
            console.error('Failed to load users:', error);
            setToast({ message: 'Failed to load users', type: 'error' });
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        if (user.is_superuser) {
            setToast({ message: 'Cannot edit super admin', type: 'warning' });
            return;
        }
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleChangePassword = (user: User) => {
        if (user.is_superuser) {
            setToast({ message: 'Cannot change password for super admin', type: 'warning' });
            return;
        }
        setChangePasswordUser(user);
    };

    const handlePasswordSubmit = async (password: string) => {
        if (!changePasswordUser) return;
        try {
            // Check if userService has changePassword, if not, we need to add it or use raw fetch
            // Ideally we add it to userService.ts, but for now I'll use fetch here if needed or assume user service update
            // Let's check userService.ts content... waiting... I can't check it right now easily inside replace.
            // I'll assume I need to ADD it to userService.ts differently or use direct fetch.
            // Using direct fetch for safety since I didn't update frontend service yet.

            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/users/${changePasswordUser.id}/change-password`, {
                method: 'POST',
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
            setChangePasswordUser(null);
        } catch (error: any) {
            console.error('Failed to change password:', error);
            setToast({ message: error.message || 'Failed to change password', type: 'error' });
            throw error; // Re-throw to let modal handle it if needed
        }
    };

    const handleAddNew = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };



    const handleClientModalSubmit = async (data: any) => {
        try {
            const payload = { ...data, user_id: crossCreationData?.user_id };
            const createdClient = await clientService.createClient(data);
            setToast({ message: 'Client created successfully', type: 'success' });
            setIsClientModalOpen(false);
            setCrossCreationData(null);
            return createdClient; // ✅ THIS IS THE FIX

        } catch (error: any) {
            console.error('Failed to create client:', error);
            setToast({ message: error?.message || 'Failed to create client', type: 'error' });
                throw error; // ✅ required for Promise<Client>

        }
    };

    const handleCrossCreationConfirm = () => {
        setShowCrossCreationConfirm(false);
        setIsClientModalOpen(true);
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (editingUser) {
                await userService.updateUser(editingUser.id, data);
                setToast({ message: 'User updated successfully', type: 'success' });
                handleModalClose();
                loadData();
            } else {
                const newUser = await userService.createUser(data);
                setToast({ message: 'User created successfully', type: 'success' });
                handleModalClose();
                loadData();

                // Setup and show cross-creation confirmation
                setCrossCreationData({
                    user_id: newUser.id,
                    first_name: data.first_name,
                    middle_name: data.middle_name,
                    last_name: data.last_name,
                    description: `Linked user: ${data.username}`
                });
                setShowCrossCreationConfirm(true);
            }
        } catch (error: any) {
            console.error('Failed to save user:', error);
            const errorMessage = error?.message || 'Failed to save user';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    const handleToggleStatus = (user: User) => {
        if (user.is_superuser) {
            setToast({ message: 'Cannot modify superuser status', type: 'warning' });
            return;
        }
        setConfirmModal({ isOpen: true, user, action: 'toggle' });
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.user) return;

        try {
            const isActive = confirmModal.user.statusCode === 'ACTIVE';
            if (isActive) {
                await userService.deactivateUser(confirmModal.user.id);
                setToast({ message: 'User deactivated successfully', type: 'success' });
            } else {
                await userService.activateUser(confirmModal.user.id);
                setToast({ message: 'User activated successfully', type: 'success' });
            }
            loadData();
        } catch (error: any) {
            console.error('Failed to perform action:', error);
            const errorMessage = error?.message || 'Failed to perform action';
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setConfirmModal({ isOpen: false, user: null, action: 'toggle' });
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

    const userStats = [
        {
            title: 'Total Users',
            value: stats?.total_users.toString() || '0',
            icon: Users,
            color: 'blue',
            onClick: () => handleStatClick('total'),
            active: statusFilter === null
        },
        {
            title: 'Active Users',
            value: stats?.active_users.toString() || '0',
            icon: UserCheck,
            color: 'green',
            onClick: () => handleStatClick('active'),
            active: statusFilter === 'ACTIVE'
        },
        {
            title: 'Inactive Users',
            value: stats?.inactive_users.toString() || '0',
            icon: UserX,
            color: 'red',
            onClick: () => handleStatClick('inactive'),
            active: statusFilter === 'INACTIVE'
        },
        { title: 'Admin Users', value: stats?.admin_users.toString() || '0', icon: Shield, color: 'purple', onClick: undefined, active: false }
    ];

    const userColumns = [
        {
            key: 'name',
            header: 'Name',
            render: (_: any, row: User) => `${row.first_name} ${row.last_name}`
        },
        { key: 'email', header: 'Email' },
        { key: 'username', header: 'Username' },
        {
            key: 'phone',
            header: 'Phone',
            render: (_: any, row: User) => {
                const phone = (row as any).phone_country_code && (row as any).phone_number
                    ? `${(row as any).phone_country_code}-${(row as any).phone_number}`
                    : null;
                return phone ? (
                    <span>{phone}</span>
                ) : (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</span>
                );
            }
        },
        {
            key: 'roles',
            header: 'Roles',
            render: (roles: Array<{ id: string; name: string }>) => {
                if (roles.length === 0) return 'No roles';
                if (roles.length === 1) return roles[0].name;
                return `${roles[0].name} +${roles.length - 1}`;
            }
        },
        {
            key: 'clients',
            header: 'Clients',
            render: (_: any, row: User) => {
                const count = row.client_count ?? 0;
                let text = 'No clients';

                // Default styles for "No clients" (Gray/Neutral)
                let style = {
                    bg: '#f3f4f6',
                    color: '#6b7280',
                    hoverBg: '#e5e7eb'
                };

                if (count > 0) {
                    text = count === 1 ? '1 Client' : `${count} Clients`;
                    // Styles for Assigned Clients (Blue)
                    style = {
                        bg: '#e0f2fe',
                        color: '#0369a1',
                        hoverBg: '#bae6fd'
                    };
                }

                return (
                    <div
                        onClick={() => handleOpenMapping(row)}
                        style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: style.bg,
                            color: style.color,
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = style.hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = style.bg}
                    >
                        {text}
                    </div>
                );
            }
        },
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
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: User) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip={row.is_superuser ? 'Cannot edit superuser' : 'Edit'}>
                        <button className="action-btn edit" onClick={() => handleEdit(row)} style={{ opacity: row.is_superuser ? 0.5 : 1, cursor: row.is_superuser ? 'not-allowed' : 'pointer' }}>
                            <Edit2 size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip={row.is_superuser ? 'Cannot change password' : 'Change Password'}>
                        <button
                            className="action-btn edit"
                            onClick={() => handleChangePassword(row)}
                            style={{ opacity: row.is_superuser ? 0.5 : 1, cursor: row.is_superuser ? 'not-allowed' : 'pointer', color: '#f59e0b', background: '#fef3c7' }}
                        >
                            <Key size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip={row.statusCode === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                        <button
                            className={`action-btn ${row.statusCode === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                            onClick={() => handleToggleStatus(row)}
                            style={{ opacity: row.is_superuser ? 0.5 : 1, cursor: row.is_superuser ? 'not-allowed' : 'pointer' }}
                        >
                            {row.statusCode === 'ACTIVE' ? <StopCircle size={14} /> : <PlayCircle size={14} />}
                        </button>
                    </span>
                </div>
            )
        }
    ];

    if (isInitialLoading) {
        return <Loading message="Loading users..." />;
    }

    return (
        <div className="management-content">
            <div className="stats-grid">
                {userStats.map((stat, index) => (
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
                        <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Users
                    </h2>
                    <button className="add-btn" onClick={handleAddNew}>
                        Add User
                    </button>
                </div>
                <Table
                    columns={userColumns}
                    data={users}
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
                show={totalUsers > 0}
                pageCount={Math.ceil(totalUsers / itemsPerPage)}
                currentPage={currentPage}
                totalItems={totalUsers}
                itemsPerPage={itemsPerPage}
                onPageChange={(data) => setCurrentPage(data.selected)}
                onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(0);
                }}
            />
            <UserModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                initialData={editingUser ? {
                    id: editingUser.id,
                    email: editingUser.email,
                    username: editingUser.username,
                    first_name: editingUser.first_name || '',
                    middle_name: editingUser.middle_name || '',
                    last_name: editingUser.last_name || '',
                    roles: editingUser.roles,
                    supervisor_id: editingUser.supervisor_id || undefined
                } : undefined}
                title={editingUser ? 'Edit User' : 'Add New User'}
                roles={roles}
            />

            <ChangePasswordModal
                isOpen={!!changePasswordUser}
                onClose={() => setChangePasswordUser(null)}
                onSubmit={handlePasswordSubmit}
                username={changePasswordUser?.username || ''}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, user: null, action: 'toggle' })}
                onConfirm={handleConfirmAction}
                title={confirmModal.user?.statusCode === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                message={`Are you sure you want to ${confirmModal.user?.statusCode === 'ACTIVE' ? 'deactivate' : 'activate'} this user?`}
                confirmText={confirmModal.user?.statusCode === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                type="warning"
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmModal
                isOpen={showCrossCreationConfirm}
                onClose={() => setShowCrossCreationConfirm(false)}
                onConfirm={handleCrossCreationConfirm}
                title="Create Linked Client"
                message="User created successfully. Do you want to create a linked Client entity for this user?"
                confirmText="Yes, Create Client"
                type="info"
            />

            <ClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onSubmit={handleClientModalSubmit}
                initialData={crossCreationData}
                title="Create Linked Client"
            />

            <ClientMappingModal
                isOpen={clientMappingModal.isOpen}
                onClose={handleCloseMapping}
                user={clientMappingModal.user}
                onUpdate={loadData}
            />
        </div>
    );
};

export default UserManagement;