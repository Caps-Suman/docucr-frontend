import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, User, Power, LayoutDashboard, Home, Moon, Sun, Shield, Edit2, FileText, Layout, BookOpen, Users, Settings, FileEdit, Activity, LogOut } from 'lucide-react';
import authService from '../../../services/auth.service';
import modulesService from '../../../services/modules.service';
import apiClient, { API_BASE_URL } from '../../../utils/apiClient';
import Sidebar from '../../Sidebar/Sidebar';
import './AppLayout.css';

const HIDE_SIDEBAR_ROUTES = ["/sops/create", "/sops/edit"];

const AppLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutTray, setShowLogoutTray] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [userRoleCount, setUserRoleCount] = useState(0);
    const [hasModuleAccess, setHasModuleAccess] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark';
    });
    const logoutRef = useRef<HTMLDivElement>(null);
    const hideSidebar = HIDE_SIDEBAR_ROUTES.some(route => location.pathname.startsWith(route));

    const getBreadcrumbs = () => {
        const path = location.pathname;
        const crumbs: { icon: any, label: string }[] = [];

        crumbs.push({ icon: Home, label: '' });

        if (path === '/dashboard' || path === '/') {
            if (hasModuleAccess) {
                crumbs.push({ icon: LayoutDashboard, label: 'Dashboard' });
            }
            return crumbs;
        }

        if (path === '/profile') {
            crumbs.push({ icon: User, label: 'Profile' });
            return crumbs;
        }

        if (path === '/users-permissions') {
            crumbs.push({ icon: Shield, label: 'User & Role Permission' });
            return crumbs;
        }

        if (path.startsWith('/documents')) {
            crumbs.push({ icon: FileText, label: 'Documents' });
            if (path.includes('/upload')) crumbs.push({ icon: FileText, label: 'Upload' });
            else if (path !== '/documents') crumbs.push({ icon: FileText, label: 'Details' });
            return crumbs;
        }

        if (path.startsWith('/templates')) {
            crumbs.push({ icon: Layout, label: 'Templates' });
            if (path.includes('/create')) crumbs.push({ icon: Layout, label: 'Create' });
            else if (path.includes('/edit')) crumbs.push({ icon: Layout, label: 'Edit' });
            return crumbs;
        }

        if (path.startsWith('/sops')) {
            crumbs.push({ icon: BookOpen, label: 'SOPs' });
            if (path.includes('/create')) crumbs.push({ icon: BookOpen, label: 'Create' });
            else if (path.includes('/edit')) crumbs.push({ icon: BookOpen, label: 'Edit' });
            return crumbs;
        }

        if (path.startsWith('/clients')) {
            crumbs.push({ icon: Users, label: 'Clients' });
            return crumbs;
        }

        if (path.startsWith('/settings')) {
            crumbs.push({ icon: Settings, label: 'Settings' });
            return crumbs;
        }

        if (path.startsWith('/forms')) {
            crumbs.push({ icon: FileEdit, label: 'Forms' });
            if (path.includes('/create')) crumbs.push({ icon: FileEdit, label: 'Create' });
            else if (path !== '/forms') crumbs.push({ icon: FileEdit, label: 'Edit' });
            return crumbs;
        }

        if (path.startsWith('/activity-logs')) {
            crumbs.push({ icon: Activity, label: 'Activity Logs' });
            return crumbs;
        }

        if (hasModuleAccess) {
            crumbs.push({ icon: LayoutDashboard, label: 'Dashboard' });
        }
        return crumbs;
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

        if (currentUser?.email) {
            fetchUserRoleCount();
            checkModuleAccess(currentUser.email);
        }

        const handleAuthChange = () => {
            const updatedUser = authService.getUser();
            setUser(updatedUser);
        };
        authService.subscribe(handleAuthChange);

        // Apply saved theme on mount
        document.documentElement.classList.toggle('dark', isDarkMode);

        return () => {
            authService.unsubscribe(handleAuthChange);
        };
    }, [isDarkMode]);

    const checkModuleAccess = async (email: string) => {
        try {
            const modules = await modulesService.getUserModules(email);
            setHasModuleAccess(modules.length > 0);
        } catch (error) {
            console.error('Failed to check module access', error);
        }
    };

    const fetchUserRoleCount = async () => {
        try {
            const response = await apiClient(`${API_BASE_URL}/api/users/me`);
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
            {/* <Sidebar /> */}
            {!hideSidebar && <Sidebar />}
            <div className={`app-content ${hideSidebar ? 'no-sidebar' : ''}`}>
                <header className="app-header">
                    <div className="breadcrumb">
                        {getBreadcrumbs().map((crumb, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <ChevronRight size={14} />}
                                <crumb.icon size={14} />
                                {crumb.label && <span>{crumb.label}</span>}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="user-info">
                        {/* <button className="theme-toggle" onClick={toggleDarkMode}>
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </button> */}
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
                        <div className="user-details" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                            <div className="user-avatar" style={user?.profile_image_url ? { backgroundImage: `url("${user.profile_image_url}")`, backgroundSize: '130%', backgroundPosition: 'center' } : {}}>
                                {!user?.profile_image_url && (user?.first_name ? user.first_name.charAt(0).toUpperCase() : <User size={16} />)}
                            </div>
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
                                        <LogOut size={16} />
                                        <span>Logout</span>
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