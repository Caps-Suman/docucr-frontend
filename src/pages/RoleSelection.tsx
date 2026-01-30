import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ChevronRight } from 'lucide-react';
import authService from '../services/auth.service';
import './RoleSelection.css';

interface Role {
    id: string;
    name: string;
}

interface LocationState {
    roles?: Role[];
    user?: {
        email: string;
        first_name: string;
        last_name: string;
    };
    rememberMe?: boolean;
}

const RoleSelection: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState;

    const [selectedRole, setSelectedRole] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userRoles, setUserRoles] = useState<Role[]>([]);

    useEffect(() => {
        // If coming from login with state
        if (state?.roles && state?.user) {
            setUserRoles(state.roles);
            setCurrentUser(state.user);
        } else {
            // If coming from header (already logged in)
            const user = authService.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setCurrentUser(user);
            // Fetch user's roles from API
            fetchUserRoles();
        }
    }, []);

    const fetchUserRoles = async () => {
        try {
            const token = authService.getToken();
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch user roles');
            const userData = await response.json();
            setUserRoles(userData.roles || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load roles');
        }
    };

    if (!currentUser) {
        return null;
    }

    const handleRoleSelect = async () => {
        if (!selectedRole) {
            setError('Please select a role');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const data = await authService.selectRole({
                email: currentUser.email,
                role_id: selectedRole,
                remember_me: state?.rememberMe || false
            });

            if (!data.access_token) {
                throw new Error('No access token received');
            }

            authService.saveToken(data.access_token);
            authService.saveUser(data.user);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Failed to select role');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="role-selection-container">
            <div className="role-selection-card">
                <div className="role-selection-header">
                    <Shield size={48} className="role-icon" />
                    <h2>Select Your Role</h2>
                    <p>Welcome, {currentUser.first_name} {currentUser.last_name}</p>
                    <p className="subtitle">Choose the role you want to use for this session</p>
                </div>

                <div className="roles-list">
                    {userRoles.map((role) => (
                        <div
                            key={role.id}
                            className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
                            onClick={() => setSelectedRole(role.id)}
                        >
                            <div className="role-card-content">
                                <Shield size={24} />
                                <span className="role-name">{role.name}</span>
                            </div>
                            {selectedRole === role.id && (
                                <ChevronRight size={20} className="selected-icon" />
                            )}
                        </div>
                    ))}
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                    className="btn-continue"
                    onClick={handleRoleSelect}
                    disabled={!selectedRole || loading}
                >
                    {loading ? 'Please wait...' : 'Continue'}
                </button>

                <button
                    className="btn-back"
                    onClick={() => navigate('/login')}
                    disabled={loading}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default RoleSelection;
