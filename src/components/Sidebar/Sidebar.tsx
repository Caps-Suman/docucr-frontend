import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
    ArrowRightLeft,
    Activity,
    FileEdit
} from 'lucide-react';
import modulesService, { Module } from '../../services/modules.service';
import styles from './Sidebar.module.css';
import { jwtDecode } from "jwt-decode";
import authService from '../../services/auth.service';

const token = authService.getToken();
const payload: any = token ? jwtDecode(token) : null;

const isTempSession = payload?.temp === true;

interface SidebarProps {
    onCollapseChange?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onCollapseChange }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredModule, setHoveredModule] = useState<{ module: Module; top: number } | null>(null);
    const sidebarRef = React.useRef<HTMLDivElement>(null);

    // Icon mapping
    const iconMap: Record<string, React.ReactNode> = {
        LayoutDashboard: <LayoutDashboard size={20} />,
        FileText: <FileText size={20} />,
        Layout: <Layout size={20} />,
        BookOpen: <BookOpen size={20} />,
        Users: <Users size={20} />,
        Shield: <Shield size={20} />,
        Settings: <Settings size={20} />,
        User: <User size={20} />,
        Activity: <Activity size={20} />,
        FileEdit: <FileEdit size={20} />
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
        const newCollapsed = !collapsed;
        setCollapsed(newCollapsed);
        onCollapseChange?.(newCollapsed);
    };

    const getModulesByCategory = () => {
        return modulesService.getModulesByCategory(modules);
    };

    const renderModuleItem = (module: Module) => {
        const icon = iconMap[module.icon] || <FileText size={20} />;

        return (
            <NavLink
                key={module.id}
                to={module.route}
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                onMouseEnter={(e) => {
                    if (collapsed && sidebarRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const sidebarRect = sidebarRef.current.getBoundingClientRect();
                        setHoveredModule({
                            module,
                            top: rect.top - sidebarRect.top
                        });
                    }
                }}
                onMouseLeave={() => {
                    if (collapsed) {
                        setHoveredModule(null);
                    }
                }}
            >
                <div className={styles.navIcon}>{icon}</div>
                <span className={styles.navLabel}>{module.label}</span>
            </NavLink>
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
                    <div className={styles.navGroupLabel}>{categoryLabels[category] || category}</div>
                )}
                {categoryModules.map(renderModuleItem)}
            </div>
        );
    };

    if (loading) {
        return (
            <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}>
                <div className={styles.header}>
                    <div className={styles.logoContainer}>
                        <div className={styles.logoIcon}>
                            <ArrowRightLeft size={18} />
                        </div>
                        {!collapsed && <span className="brand-font">docucr</span>}
                    </div>
                </div>
                <div className={styles.nav}>
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        {!collapsed && <span>Loading...</span>}
                    </div>
                </div>
            </div>
        );
    }

    const modulesByCategory = getModulesByCategory();

    return (
        <div
            ref={sidebarRef}
            className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}
        >
            {/* Header */}
            <div className={styles.header}>
                {collapsed ? (
                    <button className={styles.collapseBtn} onClick={toggleCollapse}>
                        <LogOut size={16} />
                    </button>
                ) : (
                    <>
                        <div className={styles.logoContainer}>
                            <div className={styles.logoIcon}>
                                d
                            </div>
                            <span className="brand-font">docucr</span>
                        </div>
                        <button className={styles.collapseBtn} onClick={toggleCollapse}>
                            <LogOut size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    </>
                )}
            </div>

            {/* Navigation */}
            <div className={styles.nav}>
                {modules.length === 0 && !loading && (
                    <div style={{
                        padding: '24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280',
                        fontSize: '13px',
                        textAlign: 'center'
                    }}>
                        <Shield size={24} style={{ marginBottom: collapsed ? '0' : '8px', opacity: 0.5 }} />
                        {!collapsed && <div>No modules assigned</div>}
                    </div>
                )}

                {/* Main modules */}
                {renderCategorySection('main', modulesByCategory.main || [])}

                {/* Admin modules */}
                {renderCategorySection('admin', modulesByCategory.admin || [])}

                {/* User modules */}
                {renderCategorySection('user', modulesByCategory.user || [])}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
            </div>

            {/* Hover Panel for Collapsed Mode */}
            {collapsed && hoveredModule && (
                <div
                    className={styles.hoverPanel}
                    style={{ top: hoveredModule.top }}
                >
                    <div className={styles.hoverPanelContent}>
                        <div className={styles.hoverIcon}>
                            {iconMap[hoveredModule.module.icon] || <FileText size={20} />}
                        </div>
                        <span className={styles.hoverLabel}>{hoveredModule.module.label}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;