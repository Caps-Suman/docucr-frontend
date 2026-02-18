import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Shield, Lock, Save, Edit2 } from 'lucide-react';
import Select from 'react-select';
import authService from '../../services/auth.service';
import Toast, { ToastType } from '../Common/Toast';
import Loading from '../Common/Loading';
import ImageCropModal from '../Common/ImageCropModal/ImageCropModal';
import ProfileAvatarModal from './ProfileAvatarModal';
import { getCustomSelectStyles } from '../../styles/selectStyles';
import { fetchWithAuth } from '../../utils/api';
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
    profile_image_url: string | null;
    created_at: string;
}

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

            // Sync with auth service to update header avatar
            const currentUser = authService.getUser();
            if (currentUser) {
                authService.saveUser({
                    ...currentUser,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    profile_image_url: data.profile_image_url
                });
            }
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

    const handleAvatarClick = () => {
        // console.log('--- handleAvatarClick called ---');
        setIsAvatarModalOpen(true);
    };

    const handleUploadClick = () => {
        // console.log('--- handleUploadClick called ---');
        // DON'T close the modal here, wait for file selection
        // setIsAvatarModalOpen(false); 
        if (fileInputRef.current) {
            // console.log('--- Triggering file click ---');
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // console.log('--- handleFileChange called ---', file?.name);
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setToast({ message: 'Please select an image file', type: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            // console.log('--- Image loaded, setting selectedImage ---');
            setSelectedImage(reader.result as string);
            setIsAvatarModalOpen(false); // Close the preview modal only after image is loaded for cropping
        });
        reader.readAsDataURL(file);

        // Reset input value so same file can be selected again if needed
        event.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!selectedImage) return;

        try {
            setSelectedImage(null); // Close modal
            setIsUploadingAvatar(true);

            const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetchWithAuth('/api/profile/me/avatar', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to upload avatar');
            }

            const data = await response.json();
            const currentUser = authService.getUser();
            if (currentUser) {
                authService.saveUser({ ...currentUser, profile_image_url: data.profile_image_url });
            }
            setProfile(prev => prev ? { ...prev, profile_image_url: data.profile_image_url } : null);
            setToast({ message: 'Avatar updated successfully', type: 'success' });

            // Reload profile to sync across header
            loadProfile();
        } catch (error: any) {
            console.error('Failed to upload avatar:', error);
            setToast({ message: error.message || 'Failed to upload avatar', type: 'error' });
        } finally {
            setIsUploadingAvatar(false);
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
            const currentUser = authService.getUser();
            if (currentUser) {
                authService.saveUser({
                    ...currentUser,
                    first_name: formData.first_name,
                    last_name: formData.last_name
                });
            }
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
                <div className="profile-avatar-container">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar-large" style={profile?.profile_image_url ? { backgroundImage: `url(${profile.profile_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                            {!profile?.profile_image_url && (profile?.first_name ? profile.first_name.charAt(0).toUpperCase() : <User size={48} />)}
                            {isUploadingAvatar && <div className="avatar-loading-overlay"><Loading /></div>}
                        </div>
                        <button
                            className="avatar-edit-overlay"
                            title="Change profile picture"
                            onClick={handleAvatarClick}
                            disabled={isUploadingAvatar}
                        >
                            <Edit2 size={16} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div className="profile-header-text">
                        <h1>Profile Settings</h1>
                        <p>Manage your account information and security</p>
                        {authService.getUser()?.role && (
                            <div className="profile-role-badge">
                                <Shield size={14} />
                                <span>{authService.getUser()?.role?.name?.replace(/_/g, ' ')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="profile-content">
                <div className="profile-card">
                    <div className="card-header">
                        <User size={20} />
                        <h2>Personal Information</h2>
                        {!editMode && (
                            <button className="btn-edit" onClick={() => setEditMode(true)}>
                                <Edit2 size={16} />
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
                                            styles={getCustomSelectStyles()}
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
            {isAvatarModalOpen && (
                <ProfileAvatarModal
                    currentImage={profile?.profile_image_url || null}
                    firstName={profile?.first_name || ''}
                    onClose={() => setIsAvatarModalOpen(false)}
                    onUploadClick={handleUploadClick}
                />
            )}
            {selectedImage && (
                <ImageCropModal
                    image={selectedImage}
                    onCropComplete={handleCropComplete}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </div>
    );
};

export default Profile;
