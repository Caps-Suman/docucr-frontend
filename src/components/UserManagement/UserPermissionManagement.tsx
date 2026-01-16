import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import UserManagement from './UserManagement';
import RoleManagement from './RoleManagement';
import './UserPermissionManagement.css';

const UserPermissionManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState('users');

    return (
        <div className="user-permission-management">
            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={16} />
                    Users
                </button>
                <button 
                    className={`tab ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    <Shield size={16} />
                    Roles
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'users' ? <UserManagement /> : <RoleManagement />}
            </div>
        </div>
    );
};

export default UserPermissionManagement;