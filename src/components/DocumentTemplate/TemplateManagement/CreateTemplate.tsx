import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit, X } from 'lucide-react';
import CommonDropdown from '../../Common/CommonDropdown';
import Toast, { ToastType } from '../../Common/Toast';
import { fetchWithAuth } from '../../../utils/api';
import statusService, { Status } from '../../../services/status.service';
import styles from './CreateTemplate.module.css';

interface ExtractionField {
    fieldName: string;
    fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'EMAIL' | 'PHONE' | 'URL';
    description?: string;
    exampleValue?: string;
}

interface DocumentType {
    id: string;
    name: string;
    description?: string;
}

interface CreateTemplateProps { }

const FIELD_TYPES = [
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'DATE', label: 'Date' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'URL', label: 'URL' }
] as const;

const CreateTemplate: React.FC<CreateTemplateProps> = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [formData, setFormData] = useState({
        template_name: '',
        description: '',
        document_type_id: ''
    });
    const [extractionFields, setExtractionFields] = useState<ExtractionField[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [newField, setNewField] = useState<ExtractionField>({
        fieldName: '',
        fieldType: 'TEXT',
        description: '',
        exampleValue: ''
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        loadDocumentTypes();
    }, []);

    useEffect(() => {
        if (isEditMode) {
            loadTemplate();
        } else {
            setLoading(false);
        }
    }, [id, isEditMode]);



    const loadDocumentTypes = async () => {
        try {
            const response = await fetchWithAuth('/api/document-types/');
            if (response.ok) {
                const data = await response.json();
                // Filter by 'ACTIVE' statusCode
                setDocumentTypes(data.filter((dt: any) => dt.statusCode === 'ACTIVE'));
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Failed to load document types', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to load document types:', error);
            setToast({ message: 'Failed to load document types', type: 'error' });
        }
    };

    const loadTemplate = async () => {
        try {
            const response = await fetchWithAuth(`/api/templates/${id}`);
            if (response.ok) {
                const data = await response.json();
                setFormData({
                    template_name: data.template_name,
                    description: data.description || '',
                    document_type_id: data.document_type_id
                });
                setExtractionFields(data.extraction_fields || []);
            } else {
                setToast({ message: 'Template not found', type: 'error' });
                navigate('/templates');
            }
        } catch (error) {
            console.error('Failed to load template:', error);
            setToast({ message: 'Failed to load template', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const addExtractionField = () => {
        if (newField.fieldName.trim()) {
            if (editingIndex !== null) {
                // Update existing field
                setExtractionFields(prev => prev.map((item, i) =>
                    i === editingIndex ? { ...newField } : item
                ));
                setEditingIndex(null);
            } else {
                // Add new field
                setExtractionFields(prev => [...prev, { ...newField }]);
            }
            setNewField({
                fieldName: '',
                fieldType: 'TEXT',
                description: '',
                exampleValue: ''
            });
        }
    };

    const editField = (index: number) => {
        setNewField({ ...extractionFields[index] });
        setEditingIndex(index);
    };

    const cancelEdit = () => {
        setNewField({
            fieldName: '',
            fieldType: 'TEXT',
            description: '',
            exampleValue: ''
        });
        setEditingIndex(null);
    };

    const updateNewField = (field: keyof ExtractionField, value: string) => {
        setNewField(prev => ({ ...prev, [field]: value }));
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

        if (!formData.template_name.trim()) {
            newErrors.template_name = 'Template name is required';
        }

        if (!formData.document_type_id) {
            newErrors.document_type_id = 'Document type is required';
        }

        extractionFields.forEach((field, index) => {
            if (!field.fieldName.trim()) {
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

        const data = {
            template_name: formData.template_name.trim(),
            description: formData.description.trim() || undefined,
            document_type_id: formData.document_type_id,
            extraction_fields: extractionFields.filter(field => field.fieldName.trim())
        };

        if (isEditMode) {
            updateTemplate(data);
        } else {
            createTemplate(data);
        }
    };

    const createTemplate = async (data: any) => {
        try {
            const response = await fetchWithAuth('/api/templates/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                setToast({ message: 'Template created successfully', type: 'success' });
                setTimeout(() => navigate('/templates'), 1500);
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Failed to create template', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to create template:', error);
            setToast({ message: 'Failed to create template', type: 'error' });
        }
    };

    const updateTemplate = async (data: any) => {
        try {
            const response = await fetchWithAuth(`/api/templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                setToast({ message: 'Template updated successfully', type: 'success' });
                setTimeout(() => navigate('/templates'), 1500);
            } else {
                const error = await response.json();
                setToast({ message: error.detail || 'Failed to update template', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to update template:', error);
            setToast({ message: 'Failed to update template', type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/templates')}>
                    <ArrowLeft size={16} />
                    Back to Templates
                </button>
                <button type="submit" className={styles.submitButton} form="template-form">
                    {isEditMode ? 'Update' : 'Create'} Template
                </button>
            </div>

            <form id="template-form" className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.content}>
                    <div className={styles.leftSection}>
                        <div className={styles.templateInfo}>
                            <h2>Template Information</h2>

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
                        </div>

                        <div className={styles.fieldsPreview}>
                            {extractionFields.map((field, index) => (
                                <div key={index} className={styles.fieldPreview}>
                                    <div className={styles.fieldPreviewHeader}>
                                        <span className={styles.fieldName}>{field.fieldName || `Field ${index + 1}`}</span>
                                        <div className={styles.fieldActions}>
                                            <span className={styles.fieldType}>{field.fieldType}</span>
                                            <button
                                                type="button"
                                                className={styles.editFieldButton}
                                                onClick={() => editField(index)}
                                                title="Edit field"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.removeFieldButton}
                                                onClick={() => removeExtractionField(index)}
                                                title="Remove field"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {field.description && (
                                        <p className={styles.fieldDescription}>{field.description}</p>
                                    )}
                                </div>
                            ))}

                            {extractionFields.length === 0 && (
                                <div className={styles.emptyPreview}>
                                    <p>No fields added yet. Add fields from the right panel.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.rightSection}>
                        <div className={styles.fieldDefinition}>
                            <div className={styles.fieldHeader}>
                                <h3>Field Definition</h3>
                            </div>

                            <div className={styles.newFieldCard}>
                                <div className={styles.fieldInputs}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Field Name *</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={newField.fieldName}
                                            onChange={(e) => updateNewField('fieldName', e.target.value)}
                                            placeholder="e.g., Invoice Number"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Field Type *</label>
                                        <CommonDropdown
                                            value={newField.fieldType}
                                            onChange={(value) => updateNewField('fieldType', value as ExtractionField['fieldType'])}
                                            options={FIELD_TYPES.map(type => ({
                                                value: type.value,
                                                label: type.label
                                            }))}
                                            placeholder="Select field type"
                                            size="md"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Description</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={newField.description || ''}
                                            onChange={(e) => updateNewField('description', e.target.value)}
                                            placeholder="Field description"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>Example Value</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={newField.exampleValue || ''}
                                            onChange={(e) => updateNewField('exampleValue', e.target.value)}
                                            placeholder="e.g., INV-2024-001"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.fieldButtonGroup}>
                                <button
                                    type="button"
                                    className={styles.addFieldButton}
                                    onClick={addExtractionField}
                                >
                                    <ArrowLeft size={16} />
                                    {editingIndex !== null ? 'Update Field' : 'Add Field'}
                                </button>
                                {editingIndex !== null && (
                                    <button
                                        type="button"
                                        className={styles.cancelButton}
                                        onClick={cancelEdit}
                                    >
                                        <X size={16} />
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateTemplate;