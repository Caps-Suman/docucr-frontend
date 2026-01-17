import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Select from 'react-select';
import { customSelectStyles } from '../../styles/selectStyles';
import { Client } from '../../services/client.service';
import './ClientModal.css';

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
        status_id?: string;
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
    const [statusId, setStatusId] = useState('');
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
            status_id: statusId || undefined,
            description: description.trim() || undefined
        };
        
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Client Type *</label>
                        <Select
                            value={typeOptions.find(opt => opt.value === type)}
                            onChange={(selected) => setType(selected?.value || 'Individual')}
                            options={typeOptions}
                            placeholder="Select client type"
                            styles={customSelectStyles}
                        />
                    </div>
                    {type === 'Group' ? (
                        <div className="form-group">
                            <label>Business Name *</label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Enter business name"
                                style={{ borderColor: errors.businessName ? '#ef4444' : '#d1d5db' }}
                            />
                            {errors.businessName && <span className="error-text">{errors.businessName}</span>}
                        </div>
                    ) : (
                        <div className="form-row-three">
                            <div className="form-group">
                                <label>First Name *</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Enter first name"
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
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Enter last name"
                                />
                            </div>
                        </div>
                    )}
                    <div className="form-group">
                        <label>NPI</label>
                        <input
                            type="text"
                            value={npi}
                            onChange={(e) => setNpi(e.target.value)}
                            placeholder="Enter NPI"
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter description"
                            rows={3}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-submit" 
                            disabled={isSubmitting}
                            style={{ opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
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
