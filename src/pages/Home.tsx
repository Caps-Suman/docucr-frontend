import React, { useState, useEffect } from 'react';
import authService from '../services/auth.service';
import modulesService from '../services/modules.service';
import NoAccess from '../components/Common/NoAccess';
import Loading from '../components/Common/Loading';
import AdminDashboard from '../components/Dashboard/AdminDashboard';
import UserDashboard from '../components/Dashboard/UserDashboard';

const Home: React.FC = () => {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [hasAccess, setHasAccess] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const user = authService.getUser();
                if (user && user.email) {
                    if (user.role) {
                        setUserRole(user.role.name);
                    }

                    // Check if user has any modules assigned
                    const modules = await modulesService.getUserModules(user.email);
                    setHasAccess(modules.length > 0);
                }
            } catch (error) {
                console.error('Failed to check module access:', error);
                // Default to true or handle error? 
                // If error, maybe safely assume no access or show error?
                // Let's assume access if error to avoid locking out due to transient network, 
                // OR fail safe. Fail safe is better for security, but annoying for UX.
                // Given this is a dashboard view, fail safe (no access) might be confusing if backend is down.
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, []);

    if (loading) {
        return <Loading />;
    }

    if (!hasAccess) {
        return <NoAccess />;
    }

    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            {isAdmin ? <AdminDashboard /> : <UserDashboard />}
        </div>
    );
};

export default Home;
