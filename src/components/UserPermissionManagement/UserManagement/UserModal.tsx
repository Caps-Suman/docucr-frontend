import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import Select from 'react-select';
import { customSelectStyles } from '../../../styles/selectStyles';
import './UserModal.css';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        email: string;
        username: string;
        first_name: string;
        middle_name?: string;
        last_name: string;
        password?: string;
        phone_country_code?: string;
        phone_number?: string;
        role_ids: string[];
        supervisor_id?: string;
    }) => void;
    initialData?: {
        id?: string;
        email: string;
        username: string;
        first_name: string;
        middle_name?: string;
        last_name: string;
        roles: Array<{ id: string; name: string }>;
        supervisor_id?: string;
    };
    title: string;
    roles?: Array<{ id: string; name: string }>;
    supervisors?: Array<{ id: string; name: string }>;
}

const UserModal: React.FC<UserModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title,
    roles = [],
    supervisors = []
}) => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setEmail(initialData.email);
            setUsername(initialData.username);
            setFirstName(initialData.first_name);
            setMiddleName(initialData.middle_name || '');
            setLastName(initialData.last_name);
            setPhoneCountryCode((initialData as any).phone_country_code || '+91');
            setPhoneNumber((initialData as any).phone_number || '');
            setSelectedRoles(initialData.roles.map(r => r.id));
            setSelectedSupervisor(initialData.supervisor_id || '');
            setPassword('');
        } else {
            setEmail('');
            setUsername('');
            setFirstName('');
            setMiddleName('');
            setLastName('');
            setPassword('');
            setPhoneCountryCode('+91');
            setPhoneNumber('');
            setSelectedRoles([]);
            setSelectedSupervisor('');
        }
        setStep(1);
        setErrors({});
    }, [initialData, isOpen]);

    const validateStep1 = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (!email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
        
        if (!username.trim()) newErrors.username = 'Username is required';
        else if (username.length < 3) newErrors.username = 'Username must be at least 3 characters';
        else if (username.length > 50) newErrors.username = 'Username cannot exceed 50 characters';
        
        if (!firstName.trim()) newErrors.firstName = 'First name is required';
        else if (firstName.length > 50) newErrors.firstName = 'First name cannot exceed 50 characters';
        
        if (!lastName.trim()) newErrors.lastName = 'Last name is required';
        else if (lastName.length > 50) newErrors.lastName = 'Last name cannot exceed 50 characters';
        
        if (middleName && middleName.length > 50) newErrors.middleName = 'Middle name cannot exceed 50 characters';
        
        if (!initialData && !password.trim()) newErrors.password = 'Password is required';
        else if (!initialData && password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep1()) {
            setStep(1);
            return;
        }
        
        const data: any = {
            email: email.trim(),
            username: username.trim(),
            first_name: firstName.trim(),
            middle_name: middleName.trim() || undefined,
            last_name: lastName.trim(),
            phone_country_code: phoneCountryCode,
            phone_number: phoneNumber || undefined,
            role_ids: selectedRoles,
            supervisor_id: selectedSupervisor || undefined
        };
        
        if (!initialData) {
            data.password = password;
        }
        
        setIsSubmitting(true);
        try {
            await onSubmit(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const roleOptions = roles.map(r => ({ value: r.id, label: r.name }));
    const supervisorOptions = [
        { value: '', label: 'No Supervisor' },
        ...supervisors.map(s => ({ value: s.id, label: s.name }))
    ];
    const countryCodeOptions = [
        { value: '+91', label: '+91' },
        { value: '+1', label: '+1' }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title} - Step {step} of 2</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter email"
                                        style={{ borderColor: errors.email ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.email && <span className="error-text">{errors.email}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Username *</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter username"
                                        maxLength={50}
                                        style={{ borderColor: errors.username ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.username && <span className="error-text">{errors.username}</span>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name *</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Enter first name"
                                        maxLength={50}
                                        style={{ borderColor: errors.firstName ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Middle Name</label>
                                    <input
                                        type="text"
                                        value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)}
                                        placeholder="Enter middle name"
                                        maxLength={50}
                                        style={{ borderColor: errors.middleName ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.middleName && <span className="error-text">{errors.middleName}</span>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Last Name *</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Enter last name"
                                        maxLength={50}
                                        style={{ borderColor: errors.lastName ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                                </div>
                                {!initialData && (
                                    <div className="form-group">
                                        <label>Password *</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter password"
                                            style={{ borderColor: errors.password ? '#ef4444' : '#d1d5db' }}
                                        />
                                        {errors.password && <span className="error-text">{errors.password}</span>}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <div className="phone-input-group">
                                    <Select
                                        value={countryCodeOptions.find(opt => opt.value === phoneCountryCode)}
                                        onChange={(selected) => setPhoneCountryCode(selected?.value || '+91')}
                                        options={countryCodeOptions}
                                        className="country-code-select"
                                        classNamePrefix="select"
                                        styles={customSelectStyles}
                                        isSearchable={false}
                                    />
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            if (value.length <= 15) {
                                                setPhoneNumber(value);
                                            }
                                        }}
                                        placeholder="10-15 digits"
                                        className="phone-number-input"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div className="form-group">
                                <label>Roles</label>
                                <Select
                                    isMulti
                                    value={roleOptions.filter(opt => selectedRoles.includes(opt.value))}
                                    onChange={(selected) => setSelectedRoles(selected.map(s => s.value))}
                                    options={roleOptions}
                                    className="role-select"
                                    classNamePrefix="select"
                                    placeholder="Select roles"
                                    styles={customSelectStyles}
                                />
                            </div>
                            <div className="form-group">
                                <label>Supervisor</label>
                                <Select
                                    value={supervisorOptions.find(opt => opt.value === selectedSupervisor)}
                                    onChange={(selected) => setSelectedSupervisor(selected?.value || '')}
                                    options={supervisorOptions}
                                    className="supervisor-select"
                                    classNamePrefix="select"
                                    placeholder="Select supervisor"
                                    styles={customSelectStyles}
                                />
                            </div>
                        </>
                    )}

                    <div className="modal-actions">
                        {step === 2 && (
                            <button type="button" className="btn-back" onClick={handleBack}>
                                <ChevronLeft size={16} /> Back
                            </button>
                        )}
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        {step === 1 ? (
                            <button type="button" className="btn-next" onClick={(e) => { e.preventDefault(); handleNext(); }}>
                                Next <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button type="submit" className="btn-submit" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
                                {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
