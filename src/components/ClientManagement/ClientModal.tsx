import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Select from 'react-select';
import { getCustomSelectStyles } from '../../styles/selectStyles';
import { Client } from '../../services/client.service';
import styles from './ClientModal.module.css';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        business_name?: string;
        first_name?: string;
        middle_name?: string;
        last_name?: string;
        npi?: string;
        type?: string;
        status_id?: string | number;
        description?: string;
    }) => void;
    initialData?: Client;
    title: string;
}

const ClientModal: React.FC<ClientModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title
}) => {
    const [businessName, setBusinessName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [npi, setNpi] = useState('');
    const [type, setType] = useState('Individual');
    const [statusId, setStatusId] = useState<string | number>('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setBusinessName(initialData.business_name || '');
            setFirstName(initialData.first_name || '');
            setMiddleName(initialData.middle_name || '');
            setLastName(initialData.last_name || '');
            setNpi(initialData.npi || '');
            setType(initialData.type || 'Individual');
            setStatusId(initialData.status_id || '');
            setDescription(initialData.description || '');
        } else {
            setBusinessName('');
            setFirstName('');
            setMiddleName('');
            setLastName('');
            setNpi('');
            setType('Individual');
            setStatusId('');
            setDescription('');
        }
        setErrors({});
    }, [initialData, isOpen]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (type === 'Group' && !businessName.trim()) {
            newErrors.businessName = 'Business Name is required for Group type';
        }

        if (type === 'Individual' && !firstName.trim()) {
            newErrors.firstName = 'First Name is required for Individual type';
        }

        if (npi && !/^\d{10}$/.test(npi)) {
            newErrors.npi = 'NPI must be exactly 10 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const data: any = {
            business_name: businessName.trim() || undefined,
            first_name: firstName.trim() || undefined,
            middle_name: middleName.trim() || undefined,
            last_name: lastName.trim() || undefined,
            npi: npi.trim() || undefined,
            type: type.trim() || undefined,
            description: description.trim() || undefined
        };

        // Only include status_id for new clients, not updates
        if (!initialData && statusId) {
            data.status_id = statusId;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const typeOptions = [
        { value: 'Individual', label: 'Individual' },
        { value: 'Group', label: 'Group' }
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{title}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formContent}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Client Type *</label>
                            <Select
                                value={typeOptions.find(opt => opt.value === type)}
                                onChange={(selected) => setType(selected?.value || 'Individual')}
                                options={typeOptions}
                                placeholder="Select client type"
                                styles={{
                                    ...getCustomSelectStyles(),
                                    menu: (base) => ({
                                        ...getCustomSelectStyles().menu(base),
                                        zIndex: 10000
                                    }),
                                    menuPortal: (base) => ({
                                        ...base,
                                        zIndex: 10000
                                    })
                                }}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        {type === 'Group' ? (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Business Name *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Enter business name"
                                    style={{ borderColor: errors.businessName ? '#ef4444' : '#d1d5db' }}
                                />
                                {errors.businessName && <span className={styles.errorText}>{errors.businessName}</span>}
                            </div>
                        ) : (
                            <div className={styles.formRowThree}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>First Name *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Enter first name"
                                        style={{ borderColor: errors.firstName ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.firstName && <span className={styles.errorText}>{errors.firstName}</span>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Middle Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)}
                                        placeholder="Enter middle name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Last Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                </div>
                            </div>
                        )}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>NPI</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={npi}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 10) {
                                        setNpi(value);
                                    }
                                }}
                                placeholder="Enter 10-digit NPI"
                                style={{ borderColor: errors.npi ? '#ef4444' : '#d1d5db' }}
                            />
                            {errors.npi && <span className={styles.errorText}>{errors.npi}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter description"
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;
