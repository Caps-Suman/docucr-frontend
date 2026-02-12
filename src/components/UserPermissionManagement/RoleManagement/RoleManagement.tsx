import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, UserX, Edit2, StopCircle, PlayCircle, Search, Filter, X } from 'lucide-react';
import CommonMultiSelect from '../../Common/CommonMultiSelect';
import Table from '../../Table/Table';
import CommonPagination from '../../Common/CommonPagination';
import Loading from '../../Common/Loading';
import RoleModal from './RoleModal';
import RoleUsersModal from './RoleUsersModal';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import roleService, { Role, RoleStats } from '../../../services/role.service';
import modulesService, { Module } from '../../../services/modules.service';
import privilegeService, { Privilege } from '../../../services/privilege.service';
import statusService, { Status } from '../../../services/status.service';
import '../UserManagement/UserManagement.css';
import styles from './RoleManagement.module.css';
import authService from '../../../services/auth.service';
import organisationService from '../../../services/organisation.service';

const RoleManagement: React.FC = () => {
    const currentUser = authService.getUser();
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [roles, setRoles] = useState<Role[]>([]);
    const [stats, setStats] = useState<RoleStats | null>(null);
    const [totalRoles, setTotalRoles] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [privileges, setPrivileges] = useState<Privilege[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [activeStatusId, setActiveStatusId] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; role: Role | null }>({ isOpen: false, role: null });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [orgSearch, setOrgSearch] = useState('');
    const [selectedOrg, setSelectedOrg] = useState<string[]>([]);
    const [orgOptions, setOrgOptions] = useState<any[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(0);
            loadData();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedOrg]);

    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const dataLoadingRef = React.useRef(false);
    const modulesLoadedRef = React.useRef(false);

    useEffect(() => {
        loadData();
    }, [currentPage, itemsPerPage, statusFilter]);

    // useEffect(() => {
    //     if (!modulesLoadedRef.current) {
    //         modulesLoadedRef.current = true;
    //         loadModulesAndPrivileges();
    //     }
    // }, []);



    // const loadModulesAndPrivileges = async () => {
    //     try {
    //         const [modulesData, privilegesData] = await Promise.all([
    //             modulesService.getAllModules(),
    //             privilegeService.getPrivileges()
    //         ]);

    //         setModules(modulesData);
    //         setPrivileges(privilegesData);
    //     } catch (error) {
    //         console.error('Failed to load modules/privileges:', error);
    //         modulesLoadedRef.current = false; 
    //     }
    // };

    const loadData = async () => {
        // Prevent concurrent calls
        if (dataLoadingRef.current) return;
        dataLoadingRef.current = true;

        try {
            setLoading(true);
            const [rolesData, statsData] = await Promise.all([
                roleService.getRoles(
                    currentPage + 1,
                    itemsPerPage,
                    statusFilter || undefined,
                    searchQuery || undefined,
                    selectedOrg.length > 0 ? selectedOrg : undefined
                ),
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
            dataLoadingRef.current = false;
        }
    };

    /* const handleEdit = (role: Role) => {
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
     }; */

    const handleEdit = (role: Role) => {
        if (!role.can_edit) {
            setToast({ message: "System roles cannot be edited", type: "warning" });
            return;
        }

        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingRole(null);
        setIsModalOpen(true);
    };

    const loadFilterOptions = async () => {
        try {
            if (currentUser?.is_superuser || currentUser?.role?.name === 'SUPER_ADMIN') {
                const response = await organisationService.getOrganisations(1, 100);
                if (response && response.organisations) {
                    setOrgOptions(response.organisations.map((org: any) => ({
                        value: org.id,
                        label: org.name
                    })));
                }
            }
        } catch (error) {
            console.error('Failed to load filter options:', error);
        }
    };

    const handleOpenFilters = () => {
        if (!showFilters) {
            loadFilterOptions();
        }
        setShowFilters(!showFilters);
    };

    useEffect(() => {
        if (isModalOpen && !modulesLoadedRef.current && modules.length === 0) {
            modulesLoadedRef.current = true;
            const loadModulesAndPrivileges = async () => {
                try {
                    const [modulesData, privilegesData] = await Promise.all([
                        modulesService.getAllModules(),
                        privilegeService.getPrivileges(),
                    ]);
                    setModules(modulesData);
                    setPrivileges(privilegesData);
                } catch (error) {
                    console.error("Failed to load modules/privileges", error);
                    modulesLoadedRef.current = false;
                }
            };
            loadModulesAndPrivileges();
        }
    }, [isModalOpen, modules.length]);


    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingRole(null);
    };

    const handleModalSubmit = async (data: { name: string; description: string; modules: Array<{ module_id?: string; submodule_id?: string; privilege_id: string }> }) => {
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

    const [usersModalOpen, setUsersModalOpen] = useState(false);
    const [selectedRoleForUsers, setSelectedRoleForUsers] = useState<{ id: string, name: string } | null>(null);

    const handleUsersClick = (role: Role) => {
        setSelectedRoleForUsers({ id: role.id, name: role.name });
        setUsersModalOpen(true);
    };

    const roleColumns = [
        { key: 'name', header: 'Role Name' },
        { key: 'description', header: 'Description' },
        // {
        //     key: 'created_by_name',
        //     header: 'Created By',
        //     render: (_: any, row: Role) => row.created_by_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}> {row.organisation_name == null ? "Super Admin" : "Organisation"} </span>
        // },
        // ...(currentUser?.role?.name === 'SUPER_ADMIN' ? [{
        ...(currentUser?.role?.name === 'SUPER_ADMIN' || currentUser?.role?.name === 'ORGANISATION_ROLE' ? [{
            key: 'created_by_name',
            header: 'Created By',
            render: (_: any, row: Role) => row.created_by_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}> {row.organisation_name == null ? "Super Admin" : "Organisation"} </span>
        }] : []),
        ...(currentUser?.role?.name === 'SUPER_ADMIN' ? [{
            key: 'organisation_name',
            header: 'Organisation',
            render: (_: any, row: Role) => row.organisation_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>
        }] : []),
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
            key: 'users_count',
            header: 'Users Count',
            render: (value: number, row: Role) => (
                <span
                    className={`${styles.userCountBadge} ${value > 0 ? styles.clickable : styles.empty}`}
                    onClick={() => value > 0 && handleUsersClick(row)}
                >
                    {value}
                </span>
            )
        },
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
                    <div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
                            <div className="filter-group" style={{ minWidth: '300px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by role name..."
                                        className="filter-input"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ paddingLeft: '32px' }}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="filter-group" style={{ flex: '0 0 auto', minWidth: 'auto' }}>
                                {(currentUser?.is_superuser || currentUser?.role?.name === 'SUPER_ADMIN') && (
                                    <button
                                        className="filterButton"
                                        onClick={handleOpenFilters}
                                    >
                                        <Filter size={16} />
                                        Filters
                                        {selectedOrg.length > 0 && (
                                            <span className="filterBadge">
                                                1
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="filter-group" style={{ flex: '0 0 auto', minWidth: 'auto', marginLeft: 'auto' }}>
                                <button className="add-btn" onClick={handleAddNew} style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
                                    Add Role
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
                <Table
                    columns={roleColumns}
                    data={roles}
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
                        {(currentUser?.is_superuser || currentUser?.role?.name === 'SUPER_ADMIN') && (
                            <div className="filterGroup">
                                <label>Organisation</label>
                                <CommonMultiSelect
                                    options={orgOptions}
                                    value={selectedOrg}
                                    onChange={setSelectedOrg}
                                    placeholder="Filter by Organisation"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <RoleModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                initialData={editingRole ? { name: editingRole.name, description: editingRole.description || '', id: editingRole.id } : undefined}
                title={editingRole ? 'Edit Role' : 'Add New Role'}
                modules={modules}
                privileges={privileges}
            />

            <RoleUsersModal
                isOpen={usersModalOpen}
                onClose={() => setUsersModalOpen(false)}
                roleId={selectedRoleForUsers?.id || ''}
                roleName={selectedRoleForUsers?.name || ''}
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