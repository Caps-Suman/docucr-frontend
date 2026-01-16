import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Lock, Save } from 'lucide-react';
import Select from 'react-select';
import authService from '../services/auth.service';
import Toast, { ToastType } from '../components/Common/Toast';
import Loading from '../components/Common/Loading';
import { customSelectStyles } from '../styles/selectStyles';
import { fetchWithAuth } from '../utils/api';
import './Profile.css';

interface ProfileData {
    id: string;
    email: string;
    username: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    phone_country_code: string | null;
    phone_number: string | null;
    is_superuser: boolean;
    created_at: string;
}

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        username: '',
        phone_country_code: '+91',
        phone_number: ''
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const countryCodeOptions = [
        { value: '+91', label: '+91' },
        { value: '+1', label: '+1' }
    ];

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/profile/me');
            
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }
            
            const data = await response.json();
            setProfile(data);
            setFormData({
                first_name: data.first_name || '',
                middle_name: data.middle_name || '',
                last_name: data.last_name || '',
                username: data.username || '',
                phone_country_code: data.phone_country_code || '+91',
                phone_number: data.phone_number || ''
            });
        } catch (error: any) {
            console.error('Failed to load profile:', error);
            setToast({ message: error.message || 'Failed to load profile', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const validateProfile = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        if (formData.phone_number && (formData.phone_number.length < 10 || formData.phone_number.length > 15)) {
            newErrors.phone_number = 'Phone must be 10-15 digits';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePassword = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (!passwordData.current_password) newErrors.current_password = 'Current password is required';
        if (!passwordData.new_password) newErrors.new_password = 'New password is required';
        else if (passwordData.new_password.length < 8) newErrors.new_password = 'Password must be at least 8 characters';
        if (!passwordData.confirm_password) newErrors.confirm_password = 'Confirm password is required';
        else if (passwordData.new_password !== passwordData.confirm_password) {
            newErrors.confirm_password = 'Passwords do not match';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateProfile()) return;
        setIsUpdatingProfile(true);
        try {
            const response = await fetchWithAuth('/api/profile/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update profile');
            }
            
            setToast({ message: 'Profile updated successfully', type: 'success' });
            setEditMode(false);
            loadProfile();
        } catch (error: any) {
            setToast({ message: error.message || 'Failed to update profile', type: 'error' });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePassword()) return;
        setIsChangingPassword(true);
        try {
            const response = await fetchWithAuth('/api/profile/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: passwordData.current_password,
                    new_password: passwordData.new_password
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to change password');
            }
            
            setToast({ message: 'Password changed successfully', type: 'success' });
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (error: any) {
            setToast({ message: error.message || 'Failed to change password', type: 'error' });
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (loading) {
        return <Loading message="Loading profile..." />;
    }

    return (
        <div className="profile-container">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="profile-header">
                <h1>Profile Settings</h1>
                <p>Manage your account information and security</p>
            </div>

            <div className="profile-content">
                <div className="profile-card">
                    <div className="card-header">
                        <User size={20} />
                        <h2>Personal Information</h2>
                        {!editMode && (
                            <button className="btn-edit" onClick={() => setEditMode(true)}>
                                Edit
                            </button>
                        )}
                    </div>
                    
                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, first_name: e.target.value });
                                        setErrors({ ...errors, first_name: '' });
                                    }}
                                    disabled={!editMode}
                                    required
                                />
                                {errors.first_name && <span className="error-text">{errors.first_name}</span>}
                            </div>
                            <div className="form-group">
                                <label>Middle Name</label>
                                <input
                                    type="text"
                                    value={formData.middle_name}
                                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                                    disabled={!editMode}
                                />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, last_name: e.target.value });
                                        setErrors({ ...errors, last_name: '' });
                                    }}
                                    disabled={!editMode}
                                    required
                                />
                                {errors.last_name && <span className="error-text">{errors.last_name}</span>}
                            </div>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => {
                                        setFormData({ ...formData, username: e.target.value });
                                        setErrors({ ...errors, username: '' });
                                    }}
                                    disabled={!editMode}
                                    required
                                />
                                {errors.username && <span className="error-text">{errors.username}</span>}
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={profile?.email || ''}
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <div className="phone-input-group">
                                    <div style={{ width: '30%' }}>
                                        <Select
                                            value={countryCodeOptions.find(opt => opt.value === formData.phone_country_code)}
                                            onChange={(option) => setFormData({ ...formData, phone_country_code: option?.value || '+91' })}
                                            options={countryCodeOptions}
                                            styles={customSelectStyles}
                                            isDisabled={!editMode}
                                        />
                                    </div>
                                    <div style={{ width: '70%' }}>
                                        <input
                                            type="tel"
                                            value={formData.phone_number}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                if (value.length <= 15) {
                                                    setFormData({ ...formData, phone_number: value });
                                                    setErrors({ ...errors, phone_number: '' });
                                                }
                                            }}
                                            disabled={!editMode}
                                            placeholder="10-15 digits"
                                        />
                                    </div>
                                </div>
                                {errors.phone_number && <span className="error-text">{errors.phone_number}</span>}
                            </div>
                        </div>
                        
                        {editMode && (
                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={() => {
                                    setEditMode(false);
                                    setFormData({
                                        first_name: profile?.first_name || '',
                                        middle_name: profile?.middle_name || '',
                                        last_name: profile?.last_name || '',
                                        username: profile?.username || '',
                                        phone_country_code: profile?.phone_country_code || '+91',
                                        phone_number: profile?.phone_number || ''
                                    });
                                }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-save" disabled={isUpdatingProfile} style={{ opacity: isUpdatingProfile ? 0.6 : 1, cursor: isUpdatingProfile ? 'not-allowed' : 'pointer' }}>
                                    <Save size={16} />
                                    {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <div className="profile-card">
                    <div className="card-header">
                        <Lock size={20} />
                        <h2>Change Password</h2>
                        <button type="submit" form="password-form" className="btn-save" disabled={isChangingPassword} style={{ opacity: isChangingPassword ? 0.6 : 1, cursor: isChangingPassword ? 'not-allowed' : 'pointer' }}>
                            <Lock size={16} />
                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                    
                    <form id="password-form" onSubmit={handleChangePassword}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.current_password}
                                    onChange={(e) => {
                                        setPasswordData({ ...passwordData, current_password: e.target.value });
                                        setErrors({ ...errors, current_password: '' });
                                    }}
                                    required
                                />
                                {errors.current_password && <span className="error-text">{errors.current_password}</span>}
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.new_password}
                                    onChange={(e) => {
                                        setPasswordData({ ...passwordData, new_password: e.target.value });
                                        setErrors({ ...errors, new_password: '' });
                                    }}
                                    required
                                />
                                {errors.new_password && <span className="error-text">{errors.new_password}</span>}
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirm_password}
                                    onChange={(e) => {
                                        setPasswordData({ ...passwordData, confirm_password: e.target.value });
                                        setErrors({ ...errors, confirm_password: '' });
                                    }}
                                    required
                                />
                                {errors.confirm_password && <span className="error-text">{errors.confirm_password}</span>}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
