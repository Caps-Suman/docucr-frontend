import React, { useState } from 'react';
import { Users, UserCheck, UserX, Shield } from 'lucide-react';
import Table from '../Table/Table';
import CommonPagination from '../Common/CommonPagination';
import './UserManagement.css';

const UserManagement: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [showPagination, setShowPagination] = useState(true);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const userStats = [
        { title: 'Total Users', value: '1,234', icon: Users, color: 'blue' },
        { title: 'Active Users', value: '1,180', icon: UserCheck, color: 'green' },
        { title: 'Inactive Users', value: '54', icon: UserX, color: 'red' },
        { title: 'Admin Users', value: '12', icon: Shield, color: 'purple' }
    ];

    const userColumns = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'role', header: 'Role' },
        { 
            key: 'status', 
            header: 'Status',
            render: (value: string) => (
                <span className={`status-badge ${value.toLowerCase()}`}>
                    {value}
                </span>
            )
        },
        { key: 'lastLogin', header: 'Last Login' }
    ];

    const userData = [
        { name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', lastLogin: '2024-01-15' },
        { name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active', lastLogin: '2024-01-14' },
        { name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', status: 'Inactive', lastLogin: '2024-01-10' }
    ];

    return (
        <div className="management-content">
            <div className="stats-grid">
                {userStats.map((stat, index) => (
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
                        <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Users
                    </h2>
                    <button className="add-btn">
                        Add User
                    </button>
                </div>
                <Table 
                    columns={userColumns}
                    data={userData}
                />
            </div>
            
            <CommonPagination
                show={showPagination}
                pageCount={5}
                currentPage={currentPage}
                totalItems={50}
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

export default UserManagement;