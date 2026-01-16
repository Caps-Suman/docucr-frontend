import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    Layout,
    BookOpen,
    Users,
    Shield,
    Settings,
    User,
    LogOut,
    ArrowRightLeft
} from 'lucide-react';
import modulesService, { Module } from '../../services/modules.service';
import authService from '../../services/auth.service';
import './Sidebar.css';

interface SidebarProps {}

const Sidebar: React.FC<SidebarProps> = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // Icon mapping
    const iconMap: Record<string, React.ReactNode> = {
        LayoutDashboard: <LayoutDashboard size={20} />,
        FileText: <FileText size={20} />,
        Layout: <Layout size={20} />,
        BookOpen: <BookOpen size={20} />,
        Users: <Users size={20} />,
        Shield: <Shield size={20} />,
        Settings: <Settings size={20} />,
        User: <User size={20} />
    };

    useEffect(() => {
        loadUserModules();
    }, []);

    const loadUserModules = async () => {
        try {
            const user = authService.getUser();
            if (user?.email) {
                const userModules = await modulesService.getUserModules(user.email);
                setModules(userModules);
            }
        } catch (error) {
            console.error('Failed to load user modules:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    const getModulesByCategory = () => {
        return modulesService.getModulesByCategory(modules);
    };

    const renderModuleItem = (module: Module) => {
        const isActive = location.pathname === module.route;
        const icon = iconMap[module.icon] || <FileText size={20} />;

        return (
            <div key={module.id}>
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                    <NavLink 
                        to={module.route} 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            width: '100%', 
                            color: 'inherit', 
                            textDecoration: 'none' 
                        }}
                    >
                        <div className="nav-icon">{icon}</div>
                        <span className="nav-label">{module.label}</span>
                    </NavLink>
                </div>
            </div>
        );
    };

    const renderCategorySection = (category: string, categoryModules: Module[]) => {
        if (categoryModules.length === 0) return null;

        const categoryLabels: Record<string, string> = {
            main: 'Main',
            admin: 'Administration',
            user: 'User'
        };

        return (
            <div key={category}>
                {!collapsed && category !== 'main' && (
                    <div className="nav-group-label">{categoryLabels[category] || category}</div>
                )}
                {categoryModules.map(renderModuleItem)}
            </div>
        );
    };

    if (loading) {
        return (
            <div className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
                <div className="sidebar-header">
                    <div className="logo-container">
                        <div className="logo-icon">
                            <ArrowRightLeft size={18} />
                        </div>
                        {!collapsed && <span>docucr</span>}
                    </div>
                </div>
                <div className="sidebar-nav">
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    const modulesByCategory = getModulesByCategory();

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
            {/* Header */}
            <div className="sidebar-header">
                {collapsed ? (
                    <button className="collapse-btn" onClick={toggleCollapse}>
                        <LogOut size={16} />
                    </button>
                ) : (
                    <>
                        <div className="logo-container">
                            <div className="logo-icon">
                                d
                            </div>
                            <span>docucr</span>
                        </div>
                        <button className="collapse-btn" onClick={toggleCollapse}>
                            <LogOut size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </>
                )}
            </div>

            {/* Navigation */}
            <div className="sidebar-nav">
                {/* Main modules */}
                {renderCategorySection('main', modulesByCategory.main || [])}
                
                {/* Admin modules */}
                {renderCategorySection('admin', modulesByCategory.admin || [])}
                
                {/* User modules */}
                {renderCategorySection('user', modulesByCategory.user || [])}
            </div>

            {/* Footer */}
            <div className="sidebar-footer">
            </div>
        </div>
    );
};

export default Sidebar;