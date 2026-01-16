import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import modulesService, { Module } from '../../services/modules.service';
import authService from '../../services/auth.service';
import { getComponentForRoute } from '../../utils/componentRegistry';
import DocumentDetail from '../Documents/DocumentDetail/DocumentDetail';

const DynamicRoutes: React.FC = () => {
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

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

    if (loading) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                Loading modules...
            </div>
        );
    }

    const defaultModule = modules.find(m => m.category === 'main') || modules[0];
    const defaultRoute = defaultModule?.route === '/dashboard' ? '' : defaultModule?.route?.substring(1) || '';

    return (
        <Routes>
            {modules.map((module) => {
                const Component = getComponentForRoute(module.route);
                // For /dashboard route, use empty string (index route)
                // For other routes like /users-permissions, remove leading slash
                const routePath = module.route === '/dashboard' ? '' : module.route.substring(1);
                
                return (
                    <Route 
                        key={module.id} 
                        path={routePath} 
                        element={<Component />} 
                    />
                );
            })}
            
            <Route path="documents/:id" element={<DocumentDetail />} />
            <Route index element={<Navigate to={defaultRoute} replace />} />
            <Route path="*" element={
                <div style={{ padding: '24px', textAlign: 'center' }}>
                    <h2>Page Not Found</h2>
                    <p>The requested page could not be found.</p>
                </div>
            } />
        </Routes>
    );
};

export default DynamicRoutes;