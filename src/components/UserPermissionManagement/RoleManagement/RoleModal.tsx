import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './RoleModal.module.css';

interface ModulePermission {
    module_id?: string;
    submodule_id?: string;
    privilege_id: string;
}

interface Submodule {
    id: string;
    name: string;
    label: string;
    privileges: string[];
}

interface Module {
    id: string;
    name: string;
    label: string;
    submodules: Submodule[];
    privileges: string[];
}

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description: string; modules: ModulePermission[] }) => void;
    initialData?: { name: string; description: string; id?: string };
    title: string;
    modules?: Array<Module>;
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

    // Store selected privileges:
    // { "module_id": ["priv1", "priv2"], "submodule_id": ["priv1"] }
    const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});

    const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Accordion state: map of module_id -> boolean (isExpanded)
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
            if (initialData.id) {
                loadRoleModules(initialData.id);
            }
        } else if (!isOpen) {
            setName('');
            setDescription('');
            setSelectedPermissions({});
            setExpandedModules({});
            setStep(1);
            setErrors({});
        }
    }, [initialData?.id, isOpen]);

    const loadRoleModules = async (roleId: string) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/roles/${roleId}/modules`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const permMap: Record<string, string[]> = {};

                data.modules.forEach((m: any) => {
                    const targetId = m.submodule_id || m.module_id;
                    if (!targetId) return;

                    if (!permMap[targetId]) {
                        permMap[targetId] = [];
                    }
                    permMap[targetId].push(m.privilege_id);
                });
                setSelectedPermissions(permMap);
            }
        } catch (error) {
            console.error('Failed to load role modules:', error);
        }
    };

    const validateName = (value: string): string | undefined => {
        if (!value.trim()) return 'Role name is required';
        if (value.trim().length > 50) return 'Role name cannot exceed 50 characters';
        return undefined;
    };

    const validateDescription = (value: string): string | undefined => {
        if (value.trim().length > 300) return 'Description cannot exceed 300 characters';
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

    const handleBack = () => setStep(1);

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };

    const togglePermission = (targetId: string, privilegeId: string, availablePrivilegeIds: string[]) => {
        setSelectedPermissions(prev => {
            const current = prev[targetId] || [];

            // "NO_ACCESS" is a special virtual privilegeId we'll use in the UI
            if (privilegeId === 'NO_ACCESS') {
                return {
                    ...prev,
                    [targetId]: [] // Clear all permissions for this target
                };
            }

            const adminPrivilege = privileges.find(p => p.name === 'ADMIN');
            const isAdminToggling = adminPrivilege && privilegeId === adminPrivilege.id;
            const isSelecting = !current.includes(privilegeId);

            if (isAdminToggling && isSelecting) {
                // If selecting ADMIN, Select ALL available
                return {
                    ...prev,
                    [targetId]: availablePrivilegeIds
                };
            } else if (isAdminToggling && !isSelecting) {
                // If unchecking ADMIN, Remove ALL (Uncheck all)
                return {
                    ...prev,
                    [targetId]: []
                };
            }

            if (current.includes(privilegeId)) {
                return {
                    ...prev,
                    [targetId]: current.filter(id => id !== privilegeId)
                };
            } else {
                return {
                    ...prev,
                    [targetId]: [...current, privilegeId]
                };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nameError = validateName(name);
        if (nameError) {
            setErrors({ name: nameError });
            setStep(1);
            return;
        }

        const modulePermissions: ModulePermission[] = [];

        modules.forEach(module => {
            // Module level
            const modPrivs = selectedPermissions[module.id] || [];
            modPrivs.forEach(pid => {
                modulePermissions.push({ module_id: module.id, privilege_id: pid });
            });

            // Submodule level
            if (module.submodules) {
                module.submodules.forEach(sub => {
                    const subPrivs = selectedPermissions[sub.id] || [];
                    subPrivs.forEach(pid => {
                        modulePermissions.push({
                            module_id: module.id,
                            submodule_id: sub.id,
                            privilege_id: pid
                        });
                    });
                });
            }
        });

        setIsSubmitting(true);
        try {
            await onSubmit({ name: name.trim(), description: description.trim(), modules: modulePermissions });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Sort privileges to ensure consistent order: READ, WRITE (CREATE), UPDATE, DELETE, ...
    // Map of name -> order index
    const privOrder: Record<string, number> = {
        'READ': 1,
        'CREATE': 2,
        'WRITE': 2,
        'UPDATE': 3,
        'DELETE': 4,
        'EXPORT': 5,
        'IMPORT': 6,
        'SHARE': 7,
        'ADMIN': 99
    };

    const sortedPrivileges = [...privileges].sort((a, b) => {
        const orderA = privOrder[a.name.toUpperCase()] || 50;
        const orderB = privOrder[b.name.toUpperCase()] || 50;
        return orderA - orderB;
    });

    const getPrivilegeLabel = (name: string) => {
        const upper = name.toUpperCase();
        if (upper === 'CREATE') return 'Write'; // User requested "Write"
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(); // Title Case
    };

    const renderPrivilegeCheckboxes = (targetId: string, availablePrivilegeNames: string[]) => {
        const selectedIds = selectedPermissions[targetId] || [];

        // Filter global privileges to match what's available for this module/submodule
        const available = sortedPrivileges.filter(p => availablePrivilegeNames.includes(p.name));

        const isNoAccess = selectedIds.length === 0;

        return (
            <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={isNoAccess}
                        onChange={() => togglePermission(targetId, 'NO_ACCESS', [])}
                        className={styles.checkboxInput}
                    />
                    <span className={styles.checkboxText}>No Access</span>
                </label>

                {available.map(priv => (
                    <label key={priv.id} className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(priv.id)}
                            onChange={() => togglePermission(targetId, priv.id, available.map(p => p.id))}
                            className={styles.checkboxInput}
                        />
                        <span className={styles.checkboxText}>{getPrivilegeLabel(priv.name)}</span>
                    </label>
                ))}
            </div>
        );
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
                                    {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                                    <span className={styles.charCount}>{name.length}/50 characters</span>
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
                                    {errors.description && <span className={styles.errorText}>{errors.description}</span>}
                                    <span className={styles.charCount}>{description.length}/300 characters</span>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <div className={styles.moduleAssignment}>
                                <p className={styles.moduleHint}>Assign privileges to modules and submodules</p>
                                {modules.length === 0 ? (
                                    <p className={styles.noModules}>No modules available</p>
                                ) : (
                                    <div className={styles.accordionContainer}>
                                        {modules.map(module => {
                                            const isExpanded = expandedModules[module.id];
                                            const hasSubmodules = module.submodules && module.submodules.length > 0;
                                            const modulePrivs = module.privileges || [];

                                            // If no submodules, show flat layout with privileges in same row
                                            if (!hasSubmodules) {
                                                return (
                                                    <div key={module.id} className={styles.flatModuleItem}>
                                                        <div className={styles.flatModuleRow}>
                                                            <span className={styles.moduleLabel}>{module.label}</span>
                                                            {renderPrivilegeCheckboxes(module.id, modulePrivs)}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // If has submodules, show accordion layout
                                            return (
                                                <div key={module.id} className={styles.accordionItem}>
                                                    <div className={styles.accordionHeader} onClick={() => toggleModule(module.id)}>
                                                        <div className={styles.accordionTitle}>
                                                            <span className={styles.moduleLabel}>{module.label}</span>
                                                        </div>
                                                        <div className={styles.accordionArrow}>
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className={styles.accordionContent}>
                                                            <div className={styles.submoduleList}>
                                                                {module.submodules.map(sub => (
                                                                    <div key={sub.id} className={styles.submoduleItem}>
                                                                        <label className={styles.submoduleLabel}>{sub.label}</label>
                                                                        {renderPrivilegeCheckboxes(sub.id, sub.privileges || [])}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
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
