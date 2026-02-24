import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import CommonDropdown from '../../Common/CommonDropdown';
import styles from './TemplateModal.module.css';

interface ExtractionField {
    fieldName: string;
    fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'EMAIL' | 'PHONE' | 'URL';
    description?: string;
    exampleValue?: string;
}

interface Template {
    id: string;
    template_name: string;
    description?: string;
    document_type_id: string;
    extraction_fields: ExtractionField[];
}

interface DocumentType {
    id: string;
    name: string;
    description?: string;
}

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        template_name: string;
        description?: string;
        document_type_id: string;
        extraction_fields: ExtractionField[];
    }) => void;
    initialData?: Template | null;
    documentTypes: DocumentType[];
    title: string;
}

const FIELD_TYPES = [
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'URL', label: 'URL' }
] as const;

const TemplateModal: React.FC<TemplateModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    documentTypes,
    title
}) => {
    const [formData, setFormData] = useState({
        template_name: '',
        description: '',
        document_type_id: ''
    });
    const [extractionFields, setExtractionFields] = useState<ExtractionField[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                template_name: initialData.template_name,
                description: initialData.description || '',
                document_type_id: initialData.document_type_id
            });
            setExtractionFields(initialData.extraction_fields || []);
        } else {
            setFormData({
                template_name: '',
                description: '',
                document_type_id: ''
            });
            setExtractionFields([]);
        }
        setErrors({});
    }, [initialData, isOpen]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const addExtractionField = () => {
        setExtractionFields(prev => [...prev, {
            fieldName: '',
            fieldType: 'TEXT',
            description: '',
            exampleValue: ''
        }]);
    };

    const updateExtractionField = (index: number, field: keyof ExtractionField, value: string) => {
        setExtractionFields(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const removeExtractionField = (index: number) => {
        setExtractionFields(prev => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!(formData.template_name || "").trim()) {
            newErrors.template_name = 'Template name is required';
        }

        if (!formData.document_type_id) {
            newErrors.document_type_id = 'Document type is required';
        }

        // Validate extraction fields
        extractionFields.forEach((field, index) => {
            if (!(field.fieldName || "").trim()) {
                newErrors[`field_${index}_name`] = 'Field name is required';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        onSubmit({
            template_name: (formData.template_name || "").trim(),
            description: (formData.description || "").trim() || undefined,
            document_type_id: formData.document_type_id,
            extraction_fields: extractionFields.filter(field => (field.fieldName || "").trim())
        });
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h2>{title}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formContent}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Template Name *</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={formData.template_name}
                                onChange={(e) => handleInputChange('template_name', e.target.value)}
                                placeholder="Enter template name"
                            />
                            {errors.template_name && (
                                <span className={styles.errorText}>{errors.template_name}</span>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Document Type *</label>
                            <CommonDropdown
                                value={formData.document_type_id}
                                onChange={(value) => handleInputChange('document_type_id', value)}
                                options={documentTypes.map(docType => ({
                                    value: docType.id,
                                    label: docType.name
                                }))}
                                placeholder="Select document type"
                                size="md"
                            />
                            {errors.document_type_id && (
                                <span className={styles.errorText}>{errors.document_type_id}</span>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Description</label>
                            <textarea
                                className={styles.textarea}
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Enter template description"
                                rows={3}
                            />
                        </div>

                        <div className={styles.fieldsSection}>
                            <div className={styles.fieldsHeader}>
                                <h3>Extraction Fields</h3>
                                <button
                                    type="button"
                                    className={styles.addFieldButton}
                                    onClick={addExtractionField}
                                >
                                    <Plus size={16} />
                                    Add Field
                                </button>
                            </div>

                            {extractionFields.map((field, index) => (
                                <div key={index} className={styles.fieldItem}>
                                    <div className={styles.fieldHeader}>
                                        <span className={styles.fieldIndex}>Field {index + 1}</span>
                                        <button
                                            type="button"
                                            className={styles.removeFieldButton}
                                            onClick={() => removeExtractionField(index)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className={styles.fieldGrid}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Field Name *</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value={field.fieldName}
                                                onChange={(e) => updateExtractionField(index, 'fieldName', e.target.value)}
                                                placeholder="e.g., Invoice Number"
                                            />
                                            {errors[`field_${index}_name`] && (
                                                <span className={styles.errorText}>{errors[`field_${index}_name`]}</span>
                                            )}
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Field Type *</label>
                                            <select
                                                className={styles.input}
                                                value={field.fieldType}
                                                onChange={(e) => updateExtractionField(index, 'fieldType', e.target.value as ExtractionField['fieldType'])}
                                            >
                                                {FIELD_TYPES.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Description</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value={field.description || ''}
                                                onChange={(e) => updateExtractionField(index, 'description', e.target.value)}
                                                placeholder="Field description"
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Example Value</label>
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value={field.exampleValue || ''}
                                                onChange={(e) => updateExtractionField(index, 'exampleValue', e.target.value)}
                                                placeholder="e.g., INV-2024-001"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {extractionFields.length === 0 && (
                                <div className={styles.emptyFields}>
                                    <p>No extraction fields defined. Add fields to specify what data should be extracted from documents.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            {initialData ? 'Update' : 'Create'} Template
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TemplateModal;