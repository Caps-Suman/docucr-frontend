import React, { useState, useEffect } from 'react';
import modulesService from '../../services/modules.service';
import authService from '../../services/auth.service';
import { Users, Shield } from 'lucide-react';
import NoAccess from '../Common/NoAccess';
import Loading from '../Common/Loading';
import UserManagement from './UserManagement/UserManagement';
import RoleManagement from './RoleManagement/RoleManagement';
import styles from './UserPermissionManagement.module.css';

const UserPermissionManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [canViewUsers, setCanViewUsers] = useState(false);
    const [canViewRoles, setCanViewRoles] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkPermissions = async () => {
            try {
                const user = authService.getUser();
                if (!user?.email) return;

                const modules = await modulesService.getUserModules(user.email);
                const userModule = modules.find(m => m.name === 'users_permissions'); // Ensure match DB name

                if (userModule) {
                    // Check for submodules existence. 
                    // Note: get_user_modules returns only submodules the user has access to (via role_submodule or role_module depending on impl).
                    // Actually, my backend impl: 
                    // 1. Fetches role_module -> maps to module permissions.
                    // 2. Fetches role_submodule -> maps to submodule permissions.
                    // So if I have role_submodule for "user_module", it appears in submodules list.

                    const submodules = userModule.submodules || [];
                    const hasUserSubmodule = submodules.some(s => s.name === 'user_module');
                    const hasRoleSubmodule = submodules.some(s => s.name === 'role_module');

                    setCanViewUsers(hasUserSubmodule);
                    setCanViewRoles(hasRoleSubmodule);

                    // Set default tab
                    if (hasUserSubmodule) setActiveTab('users');
                    else if (hasRoleSubmodule) setActiveTab('roles');
                }
            } catch (error) {
                console.error('Failed to load permissions:', error);
            } finally {
                setLoading(false);
            }
        };

        checkPermissions();
    }, []);

    if (loading) {
        return <Loading message="Checking permissions..." />;
    }

    if (!canViewUsers && !canViewRoles) {
        return (
            <NoAccess
                title="Module Access Restricted"
                description="You do not have permission to view the User & Permissions module. Please contact your administrator."
            />
        );
    }

    return (
        <div className={styles['user-permission-management']}>
            <div className={styles.tabs}>
                {canViewUsers && (
                    <button
                        className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={16} />
                        Users
                    </button>
                )}
                {canViewRoles && (
                    <button
                        className={`${styles.tab} ${activeTab === 'roles' ? styles.active : ''}`}
                        onClick={() => setActiveTab('roles')}
                    >
                        <Shield size={16} />
                        Roles
                    </button>
                )}
            </div>

            <div className={styles['tab-content']}>
                {activeTab === 'users' && canViewUsers && <UserManagement />}
                {activeTab === 'roles' && canViewRoles && <RoleManagement />}
            </div>
        </div>
    );
};

export default UserPermissionManagement;