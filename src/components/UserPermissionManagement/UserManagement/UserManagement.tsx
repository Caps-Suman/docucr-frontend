import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Shield, Edit2, StopCircle, PlayCircle, Key, Loader2, Search, Filter, X, ChevronDown } from 'lucide-react';
import Table from '../../Table/Table';
import CommonPagination from '../../Common/CommonPagination';
import Loading from '../../Common/Loading';
import UserModal from './UserModal';
import ChangePasswordModal from './ChangePasswordModal';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import userService, { User, UserStats } from '../../../services/user.service';
import authService from '../../../services/auth.service';
import roleService from '../../../services/role.service';
import organisationService from '../../../services/organisation.service';
import statusService, { Status } from '../../../services/status.service';
import './UserManagement.css';
import ClientModal from '../../ClientManagement/ClientModal';
import clientService from '../../../services/client.service';
import ClientMappingModal from './ClientMappingModal';
import ClientSelectionModal from '../../SOP/SOPListing/ClientSelectionModal';
import { UserTypeModal } from './UserTypeModal';
import { debounce } from '../../../utils/debounce';
import CommonDropdown from '../../Common/CommonDropdown';
import CommonMultiSelect from '../../Common/CommonMultiSelect';

type StatCard = {
    title: string
    value: string
    icon: any
    color: string
    onClick?: () => void
    active?: boolean
}

const UserManagement: React.FC = () => {
    const currentUser = authService.getUser();
    console.log("CURRENT USER:", currentUser);

    const [currentPage, setCurrentPage] = useState(0);
    // const [itemsPerPage, setItemsPerPage] = useState(25);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);


    // const [supervisors, setSupervisors] = useState<Array<{ id: string; name: string }>>([]);
    const [userTypeModalOpen, setUserTypeModalOpen] = useState(false);
    const [selectedUserType, setSelectedUserType] = useState<"internal" | "client" | null>(null);

    const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [creatorSearch, setCreatorSearch] = useState('');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Additional Filters
    const [selectedRole, setSelectedRole] = useState<string[]>([]);
    const [selectedOrg, setSelectedOrg] = useState<string[]>([]);
    const [selectedClientFilter, setSelectedClientFilter] = useState<string[]>([]);
    const [createdByFilter, setCreatedByFilter] = useState<string[]>([]);

    // Filter Options
    const [organisations, setOrganisations] = useState<Array<{ label: string, value: string }>>([]);
    const [clients, setClients] = useState<Array<{ label: string, value: string, organisationName?: string }>>([]);
    const [allClients, setAllClients] = useState<Array<{ label: string, value: string, organisationName?: string }>>([]);
    const [createdByOptions, setCreatedByOptions] = useState<Array<{ label: string, value: string, organisationName?: string }>>([]);

    // Debounce search update
    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        debouncedUpdate(val);
    };

    const debouncedUpdate = React.useCallback(debounce((val: string) => {
        setDebouncedSearch(val);
        setCurrentPage(0); // Reset page on search
    }, 500), []);

    const clientAdminRoleId = roles.find(r => r.name === "CLIENT_ADMIN")?.id;
    const [step, setStep] = useState<0 | 1 | 2>(0);
    const [userType, setUserType] = useState<"internal" | "client" | null>(null);

    const canChooseUserType =
        currentUser?.role?.name === "ORGANISATION_ROLE";
    const clientAdmin = currentUser?.role?.name === "CLIENT_ADMIN";

    const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

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

    // Temp state for sidebar filters
    const [tempStatusFilter, setTempStatusFilter] = useState<string[]>([]);
    const [tempSelectedRole, setTempSelectedRole] = useState<string[]>([]);
    const [tempSelectedOrg, setTempSelectedOrg] = useState<string[]>([]);
    const [tempSelectedClientFilter, setTempSelectedClientFilter] = useState<string[]>([]);
    const [tempCreatedByFilter, setTempCreatedByFilter] = useState<string[]>([]);

    useEffect(() => {
        if (showFilters) {
            const nextStatus = statusFilter ? (Array.isArray(statusFilter) ? statusFilter : [statusFilter]) : [];
            // Simple array equality check helper or just JSON stringify for string IDs
            if (JSON.stringify(tempStatusFilter) !== JSON.stringify(nextStatus)) setTempStatusFilter(nextStatus);
            if (JSON.stringify(tempSelectedRole) !== JSON.stringify(selectedRole)) setTempSelectedRole(selectedRole);
            if (JSON.stringify(tempSelectedOrg) !== JSON.stringify(selectedOrg)) setTempSelectedOrg(selectedOrg);
            if (JSON.stringify(tempSelectedClientFilter) !== JSON.stringify(selectedClientFilter)) setTempSelectedClientFilter(selectedClientFilter);
            if (JSON.stringify(tempCreatedByFilter) !== JSON.stringify(createdByFilter)) setTempCreatedByFilter(createdByFilter);
        }
    }, [showFilters, statusFilter, selectedRole, selectedOrg, selectedClientFilter, createdByFilter]);

    // Pre-fill filters based on Role
    useEffect(() => {
        if (!currentUser) return;

        if (currentUser.role?.name === 'ORGANISATION_ROLE' && currentUser.organisation_id) {
            // Organisation Role: specific org, allow client selection
            const orgId = currentUser.organisation_id;
            setSelectedOrg([orgId]);
            setTempSelectedOrg([orgId]);
        } else if (currentUser.role?.name === 'CLIENT_ADMIN') {
            // Client Admin: specific org and client
            if (currentUser.organisation_id) {
                const orgId = currentUser.organisation_id;
                setSelectedOrg([orgId]);
                setTempSelectedOrg([orgId]);
            }
            if (currentUser.client_id) {
                const clientId = currentUser.client_id;
                setSelectedClientFilter([clientId]);
                setTempSelectedClientFilter([clientId]);
            }
        }
    }, []);

    // Hierarchy Cleanup moved to handlers/effects specific to data changes to avoid loops
    // Creator cleanup is handled by its own effect above.



    // Separate effect to clean up selected creators when options change
    useEffect(() => {
        if (createdByOptions.length > 0 && tempCreatedByFilter.length > 0) {
            setTempCreatedByFilter(prev => {
                const availableIds = createdByOptions.map(c => c.value);
                const validSelection = prev.filter(id => availableIds.includes(id));
                // Only update if changed to avoid unnecessary renders
                if (validSelection.length !== prev.length) {
                    return validSelection;
                }
                return prev;
            });
        }
    }, [createdByOptions]);

    const handleApplyFilters = () => {
        setStatusFilter(tempStatusFilter);
        setSelectedRole(tempSelectedRole);
        setSelectedOrg(tempSelectedOrg);
        setSelectedClientFilter(tempSelectedClientFilter);
        setCreatedByFilter(tempCreatedByFilter);
        setCurrentPage(0);
        setShowFilters(false);
    };

    const handleResetFilters = () => {
        setTempStatusFilter([]);
        setTempSelectedRole([]);
        setTempSelectedOrg([]);
        setTempSelectedClientFilter([]);
        setTempCreatedByFilter([]);
    };

    useEffect(() => {
        loadData();
    }, [currentPage, itemsPerPage, statusFilter, debouncedSearch, selectedRole, selectedOrg, selectedClientFilter, createdByFilter]);

    const rolesLoadedRef = React.useRef(false);
    const dataLoadingRef = React.useRef(false);

    useEffect(() => {
        if (!rolesLoadedRef.current) {
            rolesLoadedRef.current = true;
            loadRoles();
            loadFilterOptions();
        }
    }, []);

    const lastCreatorFetchId = React.useRef(0);

    const fetchCreators = async (searchVal: string, orgs: string[], clients: string[]) => {
        const requestId = Date.now();
        lastCreatorFetchId.current = requestId;

        try {
            // Use lightweight creators endpoint
            const creators = await userService.getCreators(
                searchVal,
                orgs.length > 0 ? orgs : undefined,
                clients.length > 0 ? clients : undefined
            );

            if (lastCreatorFetchId.current === requestId) {
                setCreatedByOptions(creators.map(u => ({
                    label: `${u.first_name || ''} ${u.last_name || ''} (${u.username})`.trim(),
                    value: u.id,
                    organisationName: u.organisation_name
                })));
            }

        } catch (e) {
            console.error("Failed to load creator options", e);
        }
    };

    const handleCreatorSearch = (val: string) => {
        setCreatorSearch(val);
    };

    // Debounced Search Effect
    useEffect(() => {
        if (!showFilters) return;
        const handler = setTimeout(() => {
            fetchCreators(creatorSearch, tempSelectedOrg, tempSelectedClientFilter);
        }, 500);
        return () => clearTimeout(handler);
    }, [creatorSearch]);

    // Immediate Filter Effect (Skip on initial mount to avoid double call if search effect also fires? 
    // Actually, search effect fires on mount too. We can just rely on search effect for initial load if search is empty.
    // But we need immediate update on FILTER change.)
    useEffect(() => {
        if (!showFilters) return;
        // avoid duplicate call if only creatorSearch changed (handled by other effect)
        // But here we rely on deps.
        fetchCreators(creatorSearch, tempSelectedOrg, tempSelectedClientFilter);
    }, [showFilters, tempSelectedOrg, tempSelectedClientFilter]);

    const loadFilterOptions = async () => {
        try {
            // Load Organisations (if superadmin)
            if (currentUser?.is_superuser || currentUser?.role?.name === 'SUPER_ADMIN') {
                const orgs = await organisationService.getOrganisations(1, 100);
                setOrganisations(orgs.organisations.map(o => ({ label: o.name || o.username, value: o.id })));
            }

            // Load Clients
            // Use getVisibleClients instead of getClients to get list without pagination for dropdown
            const visibleClients = await clientService.getVisibleClients();
            const mappedClients = visibleClients.map(c => ({
                label: c.business_name || c.first_name || 'Client',
                value: c.id,
                organisationName: c.organisation_name
            }));
            setClients(mappedClients);
            setAllClients(mappedClients); // Populate allClients with the full list

        } catch (error) {
            console.error("Failed to load filter options", error);
        }
    };

    const loadRoles = async () => {
        try {
            const rolesData = await roleService.getAssignableRoles(1, 100);
            setRoles(rolesData.roles.map(r => ({ id: r.id, name: r.name, organisation_id: r.organisation_id })));
        } catch (error) {
            console.error('Failed to load roles:', error);
            rolesLoadedRef.current = false;
        }
    };

    const loadData = async () => {
        // Prevent concurrent calls (fixes Strict Mode double-invocation)
        if (dataLoadingRef.current) return;
        dataLoadingRef.current = true;

        try {
            setLoading(true);
            const [usersData, statsData] = await Promise.all([
                userService.getUsers(
                    currentPage + 1,
                    itemsPerPage,
                    debouncedSearch || undefined,
                    (statusFilter && statusFilter.length > 0) ? statusFilter : undefined,
                    (selectedRole && selectedRole.length > 0) ? selectedRole : undefined,
                    (selectedOrg && selectedOrg.length > 0) ? selectedOrg : undefined,
                    (selectedClientFilter && selectedClientFilter.length > 0) ? selectedClientFilter : undefined,
                    (createdByFilter && createdByFilter.length > 0) ? createdByFilter : undefined
                ),
                userService.getUserStats()
            ]);
            setUsers(usersData.users);
            setTotalUsers(usersData.total);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load users:', error);
            setToast({ message: 'Failed to load users', type: 'error' });
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
            dataLoadingRef.current = false;
        }
    };

    const handleEdit = async (user: User) => {
        try {
            setLoadingEditId(user.id);
            const fullUser = await userService.getUser(user.id);
            setEditingUser(fullUser);

            setIsModalOpen(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingEditId(null);
        }
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

    // const handleAddNew = () => {
    //   setEditingUser(null);
    //   setSelectedClient(null);

    //   if (canChooseUserType) {
    //     setUserTypeModalOpen(true);
    //   } else {
    //     // not organisation role → directly open modal
    //     setSelectedUserType("internal");
    //     setIsModalOpen(true);
    //   }
    // };


    const handleAddNew = () => {

        if (!roles.length) {
            setToast({ message: "Roles still loading. Try again.", type: "warning" });
            return;
        }
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
                setToast({ message: "User updated", type: "success" });
            } else {
                await userService.createUser(data);
                setToast({ message: "User created", type: "success" });
            }

            setIsModalOpen(false);
            setEditingUser(null);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };


    const handleUserTypeNext = (type: "internal" | "client") => {
        setSelectedUserType(type);
        setUserTypeModalOpen(false);

        if (type === "internal") {
            setIsModalOpen(true);
            return;
        }

        // client user
        setClientSelectionOpen(true);
    };

    const handleClientSelected = (client: any) => {
        setSelectedClient(client);
        setClientSelectionOpen(false);
        setIsModalOpen(true);
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
            setStatusFilter([]);
        } else if (type === 'active') {
            setStatusFilter(['ACTIVE']);
        } else if (type === 'inactive') {
            setStatusFilter(['INACTIVE']);
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

    const userStats: StatItem[] = [
        {
            title: 'Total Users',
            value: stats?.total_users.toString() || '0',
            icon: Users,
            color: 'blue',
            onClick: () => handleStatClick('total'),
            active: statusFilter.length === 0
        },
        {
            title: 'Active Users',
            value: stats?.active_users.toString() || '0',
            icon: UserCheck,
            color: 'green',
            onClick: () => handleStatClick('active'),
            active: statusFilter.includes('ACTIVE')
        },
        {
            title: 'Inactive Users',
            value: stats?.inactive_users.toString() || '0',
            icon: UserX,
            color: 'red',
            onClick: () => handleStatClick('inactive'),
            active: statusFilter.includes('INACTIVE')
        },
        // { title: 'Admin Users', value: stats?.admin_users.toString() || '0', icon: Shield, color: 'purple', onClick: undefined, active: false }
    ];

    const userColumns = [
        {
            key: 'name',
            header: 'Name',
            render: (_: any, row: User) => `${row.first_name} ${row.last_name}`,
            width: '200px'
        },
        { key: 'email', header: 'Email', width: '220px' },
        { key: 'username', header: 'Username', width: '150px' },
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
            },
            width: '140px'
        },
        ...(currentUser?.role?.name === 'SUPER_ADMIN' || currentUser?.role?.name === 'ORGANISATION_ROLE' ? [{
            key: 'created_by_name',
            header: 'Created By',
            render: (_: any, row: User) => row.created_by_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}> {row.organisation_name == null ? "Super Admin" : "Organisation"} </span>,
            width: '180px'
        }] : []),
        ...(currentUser?.role?.name === 'SUPER_ADMIN' ? [{
            key: 'organisation_name',
            header: 'Organisation',
            render: (_: any, row: User) => row.organisation_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>,
            width: '180px'
        }] : []),
        {
            key: 'roles',
            header: 'Roles',
            render: (roles: Array<{ id: string; name: string }>) => {
                if (roles.length === 0) return 'No roles';
                if (roles.length === 1) return roles[0].name;
                return `${roles[0].name} +${roles.length - 1}`;
            },
            width: '150px'
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
            },
            width: '150px'
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
            },
            width: '150px'
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: User) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip={row.is_superuser ? 'Cannot edit superuser' : 'Edit'}>
                        <button
                            className="action-btn edit"
                            onClick={() => !loadingEditId && handleEdit(row)}
                            disabled={!!loadingEditId || row.is_superuser}
                            style={{
                                opacity: (row.is_superuser || !!loadingEditId) ? 0.5 : 1,
                                cursor: (row.is_superuser || !!loadingEditId) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loadingEditId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
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
            ),
            width: '120px'
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
                    <div>

                        {/* Search, Filters and Add User Bar */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                            <div className="filter-group" style={{ minWidth: '300px' }}>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Search by name, email..."
                                        className="filter-input"
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => handleSearchChange('')}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="filter-group" style={{ flex: '0 0 auto', minWidth: 'auto' }}>
                                <button
                                    className="filterButton"
                                    onClick={() => {
                                        setShowFilters(true);
                                        // fetchCreators is triggered by useEffect on showFilters
                                    }}
                                >
                                    <Filter size={16} />
                                    Filters
                                    {([selectedRole, selectedOrg, selectedClientFilter, statusFilter, createdByFilter].filter(f => f && f.length > 0).length) > 0 && (
                                        <span className="filterBadge">
                                            {([selectedRole, selectedOrg, selectedClientFilter, statusFilter, createdByFilter].filter(f => f && f.length > 0).length)}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="filter-group" style={{ flex: '0 0 auto', minWidth: 'auto', marginLeft: 'auto' }}>
                                <button className="add-btn" onClick={handleAddNew} style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
                                    Add User
                                </button>
                            </div>
                        </div>


                    </div>
                </div>

                <Table
                    columns={userColumns}
                    data={users}
                    maxHeight="calc(100vh - 360px)"
                    className="user-table-container"
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
            <UserTypeModal
                isOpen={userTypeModalOpen}
                onClose={() => setUserTypeModalOpen(false)}
                onNext={handleUserTypeNext}
            />

            <ClientSelectionModal
                isOpen={clientSelectionOpen}
                onClose={() => setClientSelectionOpen(false)}
                onSelect={handleClientSelected}
            />
            <UserModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                title={editingUser ? "Edit User" : "Add User"}
                initialData={
                    editingUser
                        ? {
                            id: editingUser.id,
                            email: editingUser.email || "",
                            username: editingUser.username || "",
                            first_name: editingUser.first_name || "",
                            middle_name: editingUser.middle_name || "",
                            last_name: editingUser.last_name || "",
                            roles: editingUser.roles || [],
                            supervisor_id: editingUser.supervisor_id || undefined,
                            client_id: editingUser.client_id,
                            client_name: editingUser.client_name,
                        }
                        : undefined
                }
                roles={roles}
                clientAdminRoleId={roles.find(r => r.name === "CLIENT_ADMIN")?.id}
                allowUserTypeSelection={
                    currentUser?.role?.name === "ORGANISATION_ROLE"
                }
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

            {/* Filter Offcanvas */}
            <div className={`offcanvas ${showFilters ? 'offcanvasOpen' : ''}`}>
                <div className="offcanvasOverlay" onClick={() => setShowFilters(false)} />
                <div className="offcanvasContent">
                    <div className="offcanvasHeader">
                        <h3>Filters</h3>
                        <button className="closeButton" onClick={() => setShowFilters(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="offcanvasBody">
                        <div className="filterGroup">
                            <label>Status</label>
                            <CommonMultiSelect
                                options={[
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'INACTIVE', label: 'Inactive' },
                                    { value: 'PENDING', label: 'Pending' }
                                ]}
                                value={tempStatusFilter || []}
                                onChange={(val) => setTempStatusFilter(val)}
                                placeholder="Filter by Status"
                                size="md"
                            />
                        </div>

                        {/* Organisation Filter - Show for Superuser ONLY (Hide for Org Role & Client Admin) */}
                        {(currentUser?.is_superuser || currentUser?.role?.name === 'SUPER_ADMIN') && (
                            <div className="filterGroup">
                                <label>Organisation</label>
                                <CommonMultiSelect
                                    options={organisations}
                                    value={tempSelectedOrg}
                                    onChange={(val) => {
                                        setTempSelectedOrg(val);
                                        // Update dependent clients immediately to prevent effect loops
                                        if (val.length > 0) {
                                            const selectedOrgNames = organisations
                                                .filter(o => val.includes(o.value))
                                                .map(o => o.label);

                                            setTempSelectedClientFilter(prev => {
                                                const validClients = allClients.filter(c =>
                                                    c.organisationName && selectedOrgNames.some(name => c.organisationName?.includes(name))
                                                ).map(c => c.value);
                                                // Only update if difference found (optimization)
                                                const newSelection = prev.filter(id => validClients.includes(id));
                                                if (newSelection.length !== prev.length) return newSelection;
                                                return prev;
                                            });
                                        }
                                    }}
                                    placeholder="Filter by Organisation"
                                    size="md"
                                />
                            </div>
                        )}

                        {/* Client Filter - Show for Superuser AND Organisation Role (Hide for Client Admin) */}
                        {(!currentUser?.role?.name || currentUser.role.name !== 'CLIENT_ADMIN') && (
                            <div className="filterGroup">
                                <label>Client</label>
                                <CommonMultiSelect
                                    options={allClients.filter(c => {
                                        if (tempSelectedOrg.length === 0) return true;
                                        // Find selected org names
                                        const selectedOrgNames = organisations
                                            .filter(o => tempSelectedOrg.includes(o.value))
                                            .map(o => o.label);

                                        // Check if client matches any selected org name
                                        return c.organisationName && selectedOrgNames.some(name => c.organisationName?.includes(name)); // Looser match or exact?
                                        // Ideally exact match, but organisation_name in client might differ slightly? 
                                        // Assuming exact match for now if possible, else looser. 
                                        // Actually, let's try exact match first
                                        // return c.organisationName && selectedOrgNames.includes(c.organisationName);
                                    })}
                                    value={tempSelectedClientFilter}
                                    onChange={(val) => setTempSelectedClientFilter(val)}
                                    placeholder="Filter by Client"
                                    size="md"
                                />
                            </div>
                        )}

                        <div className="filterGroup">
                            <label>Role</label>
                            <CommonMultiSelect
                                options={roles.filter(r => {
                                    // Hierarchical Role Filtering
                                    const roleName = r.name;
                                    const clientLevelRoles = ["CLIENT_ADMIN", "Client Admin", "USER", "User", "PARTICIPANT", "Participant"];
                                    const orgLevelRoles = ["ORGANISATION_ROLE", "Organisation Admin", "Organization Admin"];

                                    // 1. If Client is selected, show ONLY Client Level roles
                                    if (tempSelectedClientFilter.length > 0) {
                                        return clientLevelRoles.includes(roleName);
                                    }

                                    // 2. If Organisation is selected (and no Client)
                                    if (tempSelectedOrg.length > 0) {
                                        // Include roles that explicitly belong to this Org OR are generic Org roles (global)
                                        const matchesOrgId = (r as any).organisation_id && tempSelectedOrg.includes((r as any).organisation_id);
                                        const isGlobalOrgRole = !((r as any).organisation_id) && [...orgLevelRoles, ...clientLevelRoles].includes(roleName);

                                        return matchesOrgId || isGlobalOrgRole;
                                    }

                                    // 3. Otherwise (No Org/Client selected), show all available roles (default behavior)
                                    return true;
                                }).map(r => ({ label: r.name, value: r.id }))}
                                value={tempSelectedRole}
                                onChange={(val) => setTempSelectedRole(val)}
                                placeholder="Filter by Role"
                                size="md"
                            />
                        </div>

                        {/* Created By Filter - Show for Superuser and Organisation Role */}
                        {(currentUser?.is_superuser || currentUser?.role?.name === 'SUPER_ADMIN' || currentUser?.role?.name === 'ORGANISATION_ROLE' || currentUser?.role?.name === 'CLIENT_ADMIN') && (
                            <div className="filterGroup">
                                <label>Created By</label>
                                <CommonMultiSelect
                                    options={createdByOptions}
                                    value={tempCreatedByFilter}
                                    onChange={(val) => setTempCreatedByFilter(val)}
                                    placeholder="Filter by Creator"
                                    size="md"
                                    isSearchable={true}
                                    onInputChange={handleCreatorSearch}
                                />
                            </div>
                        )}
                    </div>
                    <div className="offcanvasFooter">
                        <button className="resetButton" onClick={handleResetFilters}>
                            Reset
                        </button>
                        <button className="applyButton" onClick={handleApplyFilters}>
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default UserManagement;