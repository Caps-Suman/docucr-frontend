import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import authService from '../../services/auth.service';
import modulesService, { Module } from '../../services/modules.service';
import Loading from './Loading';

interface ProtectedRouteProps {
    moduleRoute: string; // The base route expected for this module (e.g., '/sops')
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ moduleRoute }) => {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const location = useLocation();

    useEffect(() => {
        const verifyAccess = async () => {
            try {
                const user = authService.getUser();
                if (!user || (!user.email && !user.is_superuser)) {
                    setIsAuthorized(false);
                    return;
                }

                // Superadmins bypass module restrictions entirely
                if (user.is_superuser) {
                    setIsAuthorized(true);
                    return;
                }

                if (user.email) {
                    const userModules = await modulesService.getUserModules(user.email);
                    
                    // Check if any of the user's assigned modules match the requested route
                    const hasAccess = userModules.some((module: Module) => {
                        // Exact match or sub-route (e.g., if module route is '/sops', user has access to '/sops/create')
                        return moduleRoute === module.route || module.route.startsWith(moduleRoute);
                    });

                    setIsAuthorized(hasAccess);
                } else {
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error('Failed to verify module access:', error);
                setIsAuthorized(false);
            }
        };

        verifyAccess();
    }, [moduleRoute, location.pathname]);

    // Show loading state while determining access
    if (isAuthorized === null) {
        return (
            <div style={{ height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loading message="Verifying access..." />
            </div>
        );
    }

    // If authorized, render the child routes
    if (isAuthorized) {
        return <Outlet />;
    }

    // If unauthorized, redirect to the dashboard
    return <Navigate to="/dashboard" replace />;
};

export default ProtectedRoute;
