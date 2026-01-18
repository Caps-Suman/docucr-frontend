import React, { useState, useEffect } from 'react';
import authService from '../services/auth.service';
import AdminDashboard from '../components/Dashboard/AdminDashboard';
import UserDashboard from '../components/Dashboard/UserDashboard';

const Home: React.FC = () => {
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const user = authService.getUser();
        if (user && user.role) {
            setUserRole(user.role.name);
        }
    }, []);

    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            {isAdmin ? <AdminDashboard /> : <UserDashboard />}
        </div>
    );
};

export default Home;
