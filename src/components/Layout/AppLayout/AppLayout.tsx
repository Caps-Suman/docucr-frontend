import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, User, Power, LayoutDashboard, Home, Moon, Sun, Shield, Edit2, FileText, Layout, BookOpen, Users, Settings, FileEdit } from 'lucide-react';
import authService from '../../../services/auth.service';
import Sidebar from '../../Sidebar/Sidebar';
import './AppLayout.css';

const AppLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutTray, setShowLogoutTray] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [userRoleCount, setUserRoleCount] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark';
    });
    const logoutRef = useRef<HTMLDivElement>(null);

    const getBreadcrumbs = () => {
        const path = location.pathname;

        if (path === '/dashboard') return [{ icon: LayoutDashboard, label: 'Dashboard' }];
        if (path === '/profile') return [{ icon: User, label: 'Profile' }];
        if (path === '/users-permissions') return [{ icon: Shield, label: 'User & Permission' }];

        if (path.startsWith('/documents')) {
            const crumbs = [{ icon: FileText, label: 'Documents' }];
            if (path.includes('/upload')) {
                crumbs.push({ icon: FileText, label: 'Upload' });
            } else if (path !== '/documents') {
                crumbs.push({ icon: FileText, label: 'Document Details' });
            }
            return crumbs;
        }

        if (path.startsWith('/templates')) return [{ icon: Layout, label: 'Templates' }];
        if (path.startsWith('/sops')) return [{ icon: BookOpen, label: 'SOPs' }];
        if (path.startsWith('/clients')) return [{ icon: Users, label: 'Clients' }];
        if (path.startsWith('/settings')) return [{ icon: Settings, label: 'Settings' }];
        if (path.startsWith('/forms')) return [{ icon: FileEdit, label: 'Form Management' }];

        return [{ icon: LayoutDashboard, label: 'Dashboard' }];
    };

    const formatRoleName = (name: string) => {
        return name
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    useEffect(() => {
        const currentUser = authService.getUser();
        setUser(currentUser);

        // Fetch user's role count
        if (currentUser?.email) {
            fetchUserRoleCount(currentUser.email);
        }

        // Apply saved theme on mount
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    const fetchUserRoleCount = async (email: string) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/users/email/${email}`);
            if (response.ok) {
                const userData = await response.json();
                setUserRoleCount(userData.roles?.length || 0);
            }
        } catch (error) {
            console.error('Failed to fetch user roles:', error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
                setShowLogoutTray(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDarkMode = () => {
        const newDarkMode = !isDarkMode;
        setIsDarkMode(newDarkMode);
        document.documentElement.classList.toggle('dark', newDarkMode);
        localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    };

    const handleLogout = () => {
        authService.logout();
        sessionStorage.removeItem('hasSeenIntro');
        navigate('/login');
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="app-content">
                <header className="app-header">
                    <div className="breadcrumb">
                        {getBreadcrumbs().map((crumb, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <ChevronRight size={14} />}
                                <crumb.icon size={14} />
                                <span>{crumb.label}</span>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="user-info">
                        <button className="theme-toggle" onClick={toggleDarkMode}>
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        {user?.role && (
                            <div className="role-display">
                                <Shield size={16} />
                                <span>{formatRoleName(user.role.name)}</span>
                                {userRoleCount > 1 && (
                                    <button
                                        className="role-edit-btn"
                                        onClick={() => {
                                            navigate('/login', { state: { showRoleSelection: true } });
                                        }}
                                        title="Change role"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="user-details">
                            <User size={20} />
                            <span>{user?.first_name || user?.email || 'User'}</span>
                        </div>
                        <div className="logout-container" ref={logoutRef}>
                            <button
                                className="logout-btn"
                                onClick={() => setShowLogoutTray(!showLogoutTray)}
                            >
                                <Power size={18} />
                            </button>
                            {showLogoutTray && (
                                <div className="logout-tray">
                                    <button className="logout-option" onClick={handleLogout}>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="app-main">
                    <Outlet />
                </main>
                <div id="pagination-target"></div>
            </div>
        </div>
    );
};

export default AppLayout;