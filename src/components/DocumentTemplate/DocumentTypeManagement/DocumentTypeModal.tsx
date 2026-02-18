import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './DocumentTypeModal.module.css';

interface DocumentTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description?: string }) => void;
    initialData?: { name: string; description?: string } | null;
    title: string;
}

const DocumentTypeModal: React.FC<DocumentTypeModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setDescription(initialData.description || '');
        } else {
            setName('');
            setDescription('');
        }
        setErrors({});
    }, [initialData, isOpen]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        
        if (!name.trim()) {
            newErrors.name = 'Name is required';
        } else if (name.length > 100) {
            newErrors.name = 'Name cannot exceed 100 characters';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        setIsSubmitting(true);
        try {
            await onSubmit({
                name: name.trim(),
                description: description.trim() || undefined
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

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
                            <label className={styles.label}>Name *</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter document type name"
                                maxLength={100}
                                style={{ borderColor: errors.name ? '#ef4444' : '#d1d5db' }}
                            />
                            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter description (optional)"
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

export default DocumentTypeModal;