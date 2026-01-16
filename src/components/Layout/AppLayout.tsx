import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { ChevronRight, User, Power, LayoutDashboard, Home, Moon, Sun } from 'lucide-react';
import authService from '../../services/auth.service';
import Sidebar from '../Sidebar/Sidebar';
import './AppLayout.css';

const AppLayout: React.FC = () => {
    const [showLogoutTray, setShowLogoutTray] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark';
    });
    const logoutRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentUser = authService.getUser();
        setUser(currentUser);
        
        // Apply saved theme on mount
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

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

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="app-content">
                <header className="app-header">
                    <div className="breadcrumb">
                        <LayoutDashboard size={14} />
                        <span>Dashboard</span>
                        <ChevronRight size={14} />
                        <Home size={14} />
                        <span>Home</span>
                    </div>
                    <div className="user-info">
                        <button className="theme-toggle" onClick={toggleDarkMode}>
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
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
                                    <button className="logout-option">
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
            </div>
        </div>
    );
};

export default AppLayout;