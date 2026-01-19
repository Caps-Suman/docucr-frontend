import React, { useState, useEffect } from 'react';
import { Users, Edit2, PlayCircle, StopCircle, UserCheck, UserX, Briefcase } from 'lucide-react';
import Select from 'react-select';
import { getCustomSelectStyles } from '../../styles/selectStyles';
import Table from '../Table/Table';
import CommonPagination from '../Common/CommonPagination';
import Loading from '../Common/Loading';
import ConfirmModal from '../Common/ConfirmModal';
import Toast, { ToastType } from '../Common/Toast';
import ClientModal from './ClientModal';
import clientService, { Client, ClientStats } from '../../services/client.service';
import statusService, { Status } from '../../services/status.service';
import UserModal from '../UserPermissionManagement/UserManagement/UserModal';
import userService from '../../services/user.service';
import roleService from '../../services/role.service';
import styles from './ClientManagement.module.css';

const ClientManagement: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [clients, setClients] = useState<Client[]>([]);
    const [totalClients, setTotalClients] = useState(0);
    const [stats, setStats] = useState<ClientStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [users, setUsers] = useState<Array<{ id: string; name: string; roles: string }>>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [clientUsers, setClientUsers] = useState<Array<{ id: string; username: string; name: string }>>([]);

    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; client: Client | null; action: 'toggle' }>({
        isOpen: false,
        client: null,
        action: 'toggle'
    });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Cross-creation state
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [crossCreationData, setCrossCreationData] = useState<any>(null);
    const [showCrossCreationConfirm, setShowCrossCreationConfirm] = useState(false);
    const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
    const [supervisors, setSupervisors] = useState<Array<{ id: string; name: string }>>([]);

    const loadUserFormData = async () => {
        try {
            const [rolesData, usersData] = await Promise.all([
                roleService.getAssignableRoles(1, 100),
                userService.getUsers(1, 1000)
            ]);
            setRoles(rolesData.roles.map(r => ({ id: r.id, name: r.name })));
            setSupervisors(usersData.users.map(u => ({
                id: u.id,
                name: `${u.first_name} ${u.last_name} (${u.username})`
            })));
            setUsers(usersData.users.map(u => ({
                id: u.id,
                name: `${u.first_name} ${u.last_name} (${u.username})`,
                roles: u.roles.map(r => r.name).join(', ') || 'No roles'
            })));
        } catch (error) {
            console.error('Failed to load user form data:', error);
        }
    };

    const [isInitialLoading, setIsInitialLoading] = useState(true);



    useEffect(() => {
        loadClients();
    }, [currentPage, itemsPerPage, debouncedSearchTerm, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(0);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);



    const loadClients = async () => {
        try {
            setLoading(true);
            const [data, statsData] = await Promise.all([
                clientService.getClients(currentPage + 1, itemsPerPage, debouncedSearchTerm || undefined, statusFilter || undefined),
                clientService.getClientStats()
            ]);
            setClients(data.clients);
            setTotalClients(data.total);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load clients:', error);
            setToast({ message: 'Failed to load clients', type: 'error' });
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    };

    const handleToggleStatus = (client: Client) => {
        setConfirmModal({ isOpen: true, client, action: 'toggle' });
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleCrossCreationConfirm = async () => {
        setShowCrossCreationConfirm(false);
        await loadUserFormData();
        setIsUserModalOpen(true);
    };

    const handleUserModalSubmit = async (data: any) => {
        try {
            const payload = { ...data, client_id: crossCreationData?.client_id };
            await userService.createUser(payload);
            setToast({ message: 'User created successfully', type: 'success' });
            setIsUserModalOpen(false);
            setCrossCreationData(null);
        } catch (error: any) {
            console.error('Failed to create user:', error);
            setToast({ message: error?.message || 'Failed to create user', type: 'error' });
        }
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (editingClient) {
                await clientService.updateClient(editingClient.id, data);
                setToast({ message: 'Client updated successfully', type: 'success' });
                handleModalClose();
                loadClients();
            } else {
                const newClient = await clientService.createClient(data);
                setToast({ message: 'Client created successfully', type: 'success' });
                handleModalClose();
                loadClients();

                // Setup and show cross-creation confirmation
                setCrossCreationData({
                    client_id: newClient.id,
                    email: '', // Email not in client data, will be empty
                    username: '', // Username not in client data, will be empty
                    first_name: data.first_name || '',
                    middle_name: data.middle_name || '',
                    last_name: data.last_name || '',
                    roles: [], // empty roles
                    supervisor_id: undefined
                });
                setShowCrossCreationConfirm(true);
            }
        } catch (error: any) {
            console.error('Failed to save client:', error);
            setToast({ message: error?.message || 'Failed to save client', type: 'error' });
        }
    };

    const handleAssignClients = async (userId: string) => {
        try {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const assignedBy = currentUser.id || 'system';
            await clientService.assignClientsToUser(userId, selectedClients, assignedBy);
            setToast({ message: 'Clients assigned successfully', type: 'success' });
            setSelectedClients([]);
            setSelectedUserId('');
            setShowAssignModal(false);
            loadClients();
        } catch (error: any) {
            console.error('Failed to assign clients:', error);
            setToast({ message: error?.message || 'Failed to assign clients', type: 'error' });
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedClients(clients.map(c => c.id));
        } else {
            setSelectedClients([]);
        }
    };

    const handleSelectClient = (clientId: string, checked: boolean) => {
        if (checked) {
            setSelectedClients(prev => [...prev, clientId]);
        } else {
            setSelectedClients(prev => prev.filter(id => id !== clientId));
        }
    };

    const handleShowClientUsers = async (clientId: string) => {
        try {
            const users = await clientService.getClientUsers(clientId);
            setClientUsers(users);
            setShowUsersModal(true);
        } catch (error) {
            console.error('Failed to load client users:', error);
            setToast({ message: 'Failed to load client users', type: 'error' });
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.client) return;

        setActionLoading(confirmModal.client.id);
        try {
            const isActive = confirmModal.client.statusCode === 'ACTIVE';
            if (isActive) {
                await clientService.deactivateClient(confirmModal.client.id);
                setToast({ message: 'Client deactivated successfully', type: 'success' });
            } else {
                await clientService.activateClient(confirmModal.client.id);
                setToast({ message: 'Client activated successfully', type: 'success' });
            }
            loadClients();
        } catch (error: any) {
            console.error('Failed to perform action:', error);
            setToast({ message: error?.message || 'Failed to perform action', type: 'error' });
        } finally {
            setActionLoading(null);
            setConfirmModal({ isOpen: false, client: null, action: 'toggle' });
        }
    };

    const clientColumns = [
        {
            key: 'select',
            header: (
                <input
                    type="checkbox"
                    checked={selectedClients.length === clients.length && clients.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ margin: 0 }}
                />
            ),
            render: (_: any, row: Client) => (
                <input
                    type="checkbox"
                    checked={selectedClients.includes(row.id)}
                    onChange={(e) => handleSelectClient(row.id, e.target.checked)}
                    style={{ margin: 0 }}
                />
            ),
            width: '40px'
        },
        {
            key: 'name',
            header: 'Name',
            render: (_: any, row: Client) => {
                if (row.business_name) return row.business_name;
                const name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ');
                return name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>;
            }
        },
        {
            key: 'npi',
            header: 'NPI',
            render: (value: string | null) => value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>
        },
        {
            key: 'type',
            header: 'Type',
            render: (value: string | null) => value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>
        },
        {
            key: 'statusCode',
            header: 'Status',
            render: (value: string | null) => {
                const isActive = value === 'ACTIVE';
                return (
                    <span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                );
            }
        },
        {
            key: 'assigned_users',
            header: 'Assigned Users',
            render: (value: string[], row: Client) => {
                if (!value || value.length === 0) {
                    return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unassigned</span>;
                }
                if (value.length === 1) {
                    return value[0];
                }
                return (
                    <span>
                        {value[0]}
                        <button
                            onClick={() => handleShowClientUsers(row.id)}
                            style={{
                                marginLeft: '8px',
                                background: '#e2f3f9',
                                border: '1px solid #83cee4',
                                borderRadius: '12px',
                                padding: '2px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: '#011926'
                            }}
                        >
                            +{value.length - 1}
                        </button>
                    </span>
                );
            }
        },
        {
            key: 'created_at',
            header: 'Created Date',
            render: (value: string | null) => {
                if (!value) return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>;
                return new Date(value).toLocaleDateString();
            }
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: Client) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip="Edit">
                        <button className={`${styles.actionBtn} ${styles.edit}`} onClick={() => handleEdit(row)}>
                            <Edit2 size={14} />
                        </button>
                    </span>
                    {!row.is_user && (
                        <span className="tooltip-wrapper" data-tooltip="Create User">
                            <button
                                className={`${styles.actionBtn} ${styles.createUser}`}
                                onClick={() => {
                                    setCrossCreationData({
                                        client_id: row.id,
                                        email: '',
                                        username: '',
                                        first_name: row.first_name || '',
                                        middle_name: row.middle_name || '',
                                        last_name: row.last_name || '',
                                        roles: [],
                                        supervisor_id: undefined
                                    });
                                    loadUserFormData().then(() => setIsUserModalOpen(true));
                                }}
                            >
                                <UserCheck size={14} />
                            </button>
                        </span>
                    )}
                    <span className="tooltip-wrapper" data-tooltip={row.statusCode === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                        <button
                            className={`${styles.actionBtn} ${row.statusCode === 'ACTIVE' ? styles.deactivate : styles.activate}`}
                            onClick={() => handleToggleStatus(row)}
                        >
                            {row.statusCode === 'ACTIVE' ? <StopCircle size={14} /> : <PlayCircle size={14} />}
                        </button>
                    </span>
                </div>
            )
        }
    ];

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

    const clientStats = [
        {
            title: 'Total Clients',
            value: stats?.total_clients.toString() || '0',
            icon: Users,
            color: 'blue',
            onClick: () => handleStatClick('total'),
            active: statusFilter === null
        },
        {
            title: 'Active Clients',
            value: stats?.active_clients.toString() || '0',
            icon: UserCheck,
            color: 'green',
            onClick: () => handleStatClick('active'),
            active: statusFilter === 'ACTIVE'
        },
        {
            title: 'Inactive Clients',
            value: stats?.inactive_clients.toString() || '0',
            icon: UserX,
            color: 'red',
            onClick: () => handleStatClick('inactive'),
            active: statusFilter === 'INACTIVE'
        }
    ];

    if (isInitialLoading) {
        return (
            <div className={styles.managementContent}>
                <div className={styles.statsGrid}>
                    {clientStats.map((stat, index) => (
                        <div
                            key={index}
                            className={`${styles.statCard} ${styles[stat.color]} ${stat.active ? styles.selected : ''}`}
                            onClick={stat.onClick}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.statIcon}>
                                <stat.icon size={16} />
                            </div>
                            <div className={styles.statContent}>
                                <h3>{stat.value}</h3>
                                <p>{stat.title}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.tableSection}>
                    <div className={styles.tableHeader}>
                        <h2>
                            <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            Clients
                        </h2>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {selectedClients.length > 0 && (
                                <button
                                    className={styles.assignBtn}
                                    onClick={() => {
                                        loadUserFormData().then(() => setShowAssignModal(true));
                                    }}
                                >
                                    Assign to User ({selectedClients.length})
                                </button>
                            )}
                            <input
                                type="text"
                                placeholder="Search by name, business name, or NPI..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                }}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    width: '350px'
                                }}
                            />
                            <button className={styles.addBtn} onClick={handleAddNew}>
                                Add Client
                            </button>
                        </div>
                    </div>
                    <Loading message="Loading clients..." />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.managementContent}>
            <div className={styles.statsGrid}>
                {clientStats.map((stat, index) => (
                    <div
                        key={index}
                        className={`${styles.statCard} ${styles[stat.color]} ${stat.active ? styles.selected : ''}`}
                        onClick={stat.onClick}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.statIcon}>
                            <stat.icon size={16} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{stat.value}</h3>
                            <p>{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.tableSection}>
                <div className={styles.tableHeader}>
                    <h2>
                        <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Clients
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {selectedClients.length > 0 && (
                            <button
                                className={styles.assignBtn}
                                onClick={() => {
                                    loadUserFormData().then(() => setShowAssignModal(true));
                                }}
                            >
                                Assign to User ({selectedClients.length})
                            </button>
                        )}
                        <input
                            type="text"
                            placeholder="Search by name, business name, or NPI..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                            }}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '14px',
                                width: '350px'
                            }}
                        />
                        <button className={styles.addBtn} onClick={handleAddNew}>
                            Add Client
                        </button>
                    </div>
                </div>
                {clients.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#64748b'
                    }}>
                        <Briefcase size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>No clients found</h3>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first client'}
                        </p>
                    </div>
                ) : (
                    <Table columns={clientColumns} data={clients} />
                )}
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
                show={totalClients > 0}
                pageCount={Math.ceil(totalClients / itemsPerPage)}
                currentPage={currentPage}
                totalItems={totalClients}
                itemsPerPage={itemsPerPage}
                onPageChange={(data) => setCurrentPage(data.selected)}
                onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(0);
                }}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, client: null, action: 'toggle' })}
                onConfirm={handleConfirmAction}
                title={confirmModal.client?.statusCode === 'ACTIVE' ? 'Deactivate Client' : 'Activate Client'}
                message={`Are you sure you want to ${confirmModal.client?.statusCode === 'ACTIVE' ? 'deactivate' : 'activate'} this client?`}
                confirmText={confirmModal.client?.statusCode === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                type="warning"
            />

            <ClientModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                initialData={editingClient || undefined}
                title={editingClient ? 'Edit Client' : 'Add New Client'}
            />

            <ConfirmModal
                isOpen={showCrossCreationConfirm}
                onClose={() => setShowCrossCreationConfirm(false)}
                onConfirm={handleCrossCreationConfirm}
                title="Create Linked User"
                message="Client created successfully. Do you want to create a linked User account for this client?"
                confirmText="Yes, Create User"
                type="info"
            />

            <UserModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSubmit={handleUserModalSubmit}
                initialData={crossCreationData}
                title="Create Linked User"
                roles={roles}
                supervisors={supervisors}
                clientName={crossCreationData ? (
                    clients.find(c => c.id === crossCreationData.client_id)?.business_name ||
                    [crossCreationData.first_name, crossCreationData.middle_name, crossCreationData.last_name]
                        .filter(Boolean).join(' ') || 'Unknown Client'
                ) : undefined}
            />

            {showAssignModal && (
                <div className={styles.overlay} onClick={() => setShowAssignModal(false)}>
                    <div className={styles.assignModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.assignModalHeader}>
                            <h3>Assign Clients to User</h3>
                            <button onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <div className={styles.assignModalBody}>
                            <label>Select User:</label>
                            <Select
                                options={users.map(user => ({
                                    value: user.id,
                                    label: `${user.name} - ${user.roles}`
                                }))}
                                onChange={(selected) => {
                                    setSelectedUserId(selected?.value || '');
                                }}
                                placeholder="Select a user..."
                                styles={{
                                    ...getCustomSelectStyles(),
                                    menu: (base) => ({
                                        ...getCustomSelectStyles().menu(base),
                                        zIndex: 10000
                                    }),
                                    menuPortal: (base) => ({
                                        ...base,
                                        zIndex: 10000
                                    })
                                }}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                            <p>{selectedClients.length} client(s) will be assigned to the selected user.</p>
                            <div className={styles.assignModalActions}>
                                <button
                                    className={styles.cancelButton}
                                    onClick={() => setShowAssignModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.assignButton}
                                    onClick={() => handleAssignClients(selectedUserId)}
                                    disabled={!selectedUserId}
                                >
                                    Assign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showUsersModal && (
                <div className={styles.overlay} onClick={() => setShowUsersModal(false)}>
                    <div className={styles.usersModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.usersModalHeader}>
                            <h3>Assigned Users</h3>
                            <button onClick={() => setShowUsersModal(false)}>×</button>
                        </div>
                        <div className={styles.usersModalBody}>
                            {clientUsers.map(user => (
                                <div key={user.id} className={styles.userItem}>
                                    <span className={styles.userName}>{user.name}</span>
                                    <span className={styles.userUsername}>@{user.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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

export default ClientManagement;
