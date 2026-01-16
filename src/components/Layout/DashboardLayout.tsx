import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import './DashboardLayout.css';

const DashboardLayout: React.FC = () => {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main className="dashboard-content">
                <header className="dashboard-header">
                    {/* Header content will go here */}
                </header>
                <div className="dashboard-main">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
