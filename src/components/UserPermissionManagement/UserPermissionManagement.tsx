import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import UserManagement from './UserManagement/UserManagement';
import RoleManagement from './RoleManagement/RoleManagement';
import styles from './UserPermissionManagement.module.css';

const UserPermissionManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState('users');

    return (
        <div className={styles['user-permission-management']}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={16} />
                    Users
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'roles' ? styles.active : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    <Shield size={16} />
                    Roles
                </button>
            </div>

            <div className={styles['tab-content']}>
                {activeTab === 'users' ? <UserManagement /> : <RoleManagement />}
            </div>
        </div>
    );
};

export default UserPermissionManagement;