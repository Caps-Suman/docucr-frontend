import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import Select from 'react-select';
import { getCustomSelectStyles } from '../../../styles/selectStyles';
import styles from './RoleModal.module.css';

interface ModulePermission {
    module_id: string;
    privilege_id: string;
}

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string; modules: ModulePermission[] }) => void;
    initialData?: { name: string; description: string; id?: string };
    title: string;
    modules?: Array<{ id: string; name: string; label: string }>;
    privileges?: Array<{ id: string; name: string }>;
}

const RoleModal: React.FC<RoleModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    initialData, 
    title,
    modules = [],
    privileges = []
}) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedModules, setSelectedModules] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            if (initialData.id) {
                loadRoleModules(initialData.id);
            }
        } else {
            setName('');
            setDescription('');
            setSelectedModules({});
        }
        setStep(1);
        setErrors({});
    }, [initialData, isOpen]);

    const loadRoleModules = async (roleId: string) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/roles/${roleId}/modules`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const moduleMap: Record<string, string> = {};
                data.modules.forEach((m: any) => {
                    moduleMap[m.module_id] = m.privilege_id;
                });
                setSelectedModules(moduleMap);
            }
        } catch (error) {
            console.error('Failed to load role modules:', error);
        }
    };

    const validateName = (value: string): string | undefined => {
        if (!value.trim()) {
            return 'Role name is required';
        }
        if (value.trim().length > 50) {
            return 'Role name cannot exceed 50 characters';
        }
        return undefined;
    };

    const validateDescription = (value: string): string | undefined => {
        if (value.trim().length > 300) {
            return 'Description cannot exceed 300 characters';
        }
        return undefined;
    };

    const handleNameChange = (value: string) => {
        const upperValue = value.toUpperCase();
        setName(upperValue);
        const error = validateName(upperValue);
        setErrors(prev => ({ ...prev, name: error }));
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        const error = validateDescription(value);
        setErrors(prev => ({ ...prev, description: error }));
    };

    const handleNext = () => {
        const nameError = validateName(name);
        if (nameError) {
            setErrors({ name: nameError });
            return;
        }
        setErrors({});
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleModulePrivilegeChange = (moduleId: string, privilegeId: string) => {
        setSelectedModules(prev => ({
            ...prev,
            [moduleId]: privilegeId
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nameError = validateName(name);
        if (nameError) {
            setErrors({ name: nameError });
            setStep(1);
            return;
        }
        const modulePermissions = Object.entries(selectedModules).map(([module_id, privilege_id]) => ({
            module_id,
            privilege_id
        }));
        setIsSubmitting(true);
        try {
            await onSubmit({ name: name.trim(), description: description.trim(), modules: modulePermissions });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{title} {`- Step ${step} of 2`}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formContent}>
                        {step === 1 && (
                            <>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Role Name *</label>
                                    <input
                                        type="text"
                                        className={`${styles.input} ${styles.inputUppercase}`}
                                        value={name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        required
                                        placeholder="Enter role name"
                                        maxLength={50}
                                        style={{ borderColor: errors.name ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.name && (
                                        <span className={styles.errorText}>
                                            {errors.name}
                                        </span>
                                    )}
                                    <span className={styles.charCount}>
                                        {name.length}/50 characters
                                    </span>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Description</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={description}
                                        onChange={(e) => handleDescriptionChange(e.target.value)}
                                        placeholder="Enter role description"
                                        maxLength={300}
                                        rows={4}
                                        style={{ borderColor: errors.description ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.description && (
                                        <span className={styles.errorText}>
                                            {errors.description}
                                        </span>
                                    )}
                                    <span className={styles.charCount}>
                                        {description.length}/300 characters
                                    </span>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <div className={styles.moduleAssignment}>
                                <p className={styles.moduleHint}>Assign modules and privileges to this role</p>
                                {modules.length === 0 ? (
                                    <p className={styles.noModules}>No modules available</p>
                                ) : (
                                    <div className={styles.moduleList}>
                                        {modules.map(module => {
                                            const privilegeOptions = [
                                                { value: '', label: 'No Access', description: 'No permissions' },
                                                ...privileges.map(p => {
                                                    let description = '';
                                                    const name = p.name.toLowerCase();
                                                    if (name.includes('read')) description = 'View only';
                                                    else if (name.includes('write') || name.includes('create')) description = 'View & Create';
                                                    else if (name.includes('update') || name.includes('edit')) description = 'View, Create & Edit';
                                                    else if (name.includes('delete')) description = 'Full access';
                                                    else if (name.includes('manage') || name.includes('admin')) description = 'Complete control';
                                                    else description = 'Access granted';
                                                    return { value: p.id, label: p.name, description };
                                                })
                                            ];
                                            const selectedValue = privilegeOptions.find(opt => opt.value === (selectedModules[module.id] || ''));
                                            
                                            return (
                                                <div key={module.id} className={styles.moduleItem}>
                                                    <label className={styles.moduleLabel}>{module.label}</label>
                                                    <Select
                                                        value={selectedValue}
                                                        onChange={(option) => option && handleModulePrivilegeChange(module.id, option.value)}
                                                        options={privilegeOptions}
                                                        className="privilege-select-custom"
                                                        classNamePrefix="privilege"
                                                        isSearchable={false}
                                                        menuPortalTarget={document.body}
                                                        menuPosition="fixed"
                                                        formatOptionLabel={(option: any) => (
                                                            <div>
                                                                <div style={{ fontWeight: 500 }}>{option.label}</div>
                                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{option.description}</div>
                                                            </div>
                                                        )}
                                                        styles={{
                                                            ...getCustomSelectStyles(),
                                                            control: (base) => ({
                                                                ...getCustomSelectStyles().control(base),
                                                                minHeight: '32px',
                                                                fontSize: '13px'
                                                            }),
                                                            menu: (base) => ({
                                                                ...getCustomSelectStyles().menu(base),
                                                                fontSize: '13px',
                                                                zIndex: 10000
                                                            }),
                                                            menuPortal: (base) => ({
                                                                ...base,
                                                                zIndex: 10000
                                                            })
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={styles.actions}>
                        {step === 2 && (
                            <button type="button" className={styles.backButton} onClick={handleBack}>
                                <ChevronLeft size={16} color="#64748b" /> Back
                            </button>
                        )}
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        {step === 1 ? (
                            <button 
                                type="button" 
                                className={styles.nextButton} 
                                onClick={(e) => { e.preventDefault(); handleNext(); }}
                                disabled={!name.trim() || !!errors.name}
                            >
                                Next <ChevronRight size={16} color="white" />
                            </button>
                        ) : (
                            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RoleModal;
