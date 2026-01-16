import React, { useState } from 'react';
import { Shield, UserCheck, Users, UserX } from 'lucide-react';
import Table from '../Table/Table';
import CommonPagination from '../Common/CommonPagination';
import './UserManagement.css';

const RoleManagement: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [showPagination, setShowPagination] = useState(true);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const roleStats = [
        { title: 'Total Roles', value: '8', icon: Shield, color: 'blue' },
        { title: 'Active Roles', value: '7', icon: UserCheck, color: 'green' },
        { title: 'Custom Roles', value: '3', icon: Users, color: 'purple' },
        { title: 'System Roles', value: '5', icon: UserX, color: 'orange' }
    ];

    const roleColumns = [
        { key: 'name', header: 'Role Name' },
        { key: 'description', header: 'Description' },
        { key: 'permissions', header: 'Permissions' },
        { 
            key: 'status', 
            header: 'Status',
            render: (value: string) => (
                <span className={`status-badge ${value.toLowerCase()}`}>
                    {value}
                </span>
            )
        },
        { key: 'users', header: 'Users Count' }
    ];

    const roleData = [
        { name: 'Administrator', description: 'Full system access', permissions: 'All', status: 'Active', users: '12' },
        { name: 'Manager', description: 'Department management', permissions: 'Read, Write, Manage', status: 'Active', users: '45' },
        { name: 'User', description: 'Basic user access', permissions: 'Read', status: 'Active', users: '1,177' }
    ];

    return (
        <div className="management-content">
            <div className="stats-grid">
                {roleStats.map((stat, index) => (
                    <div key={index} className={`stat-card ${stat.color}`}>
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

            <div className="table-section">
                <div className="table-header">
                    <h2>
                        <Shield size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Roles
                    </h2>
                    <button className="add-btn">
                        Add Role
                    </button>
                </div>
                <Table 
                    columns={roleColumns}
                    data={roleData}
                />
            </div>
            
            <CommonPagination
                show={showPagination}
                pageCount={3}
                currentPage={currentPage}
                totalItems={25}
                itemsPerPage={itemsPerPage}
                onPageChange={(data) => setCurrentPage(data.selected)}
                onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(0);
                }}
            />
        </div>
    );
};

export default RoleManagement;