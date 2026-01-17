import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import formService, { Form, FormField } from '../../../services/form.service';
import clientService from '../../../services/client.service';
import documentTypeService from '../../../services/documentType.service';
import documentService from '../../../services/document.service';
import { uploadStore } from '../../../store/uploadStore';
import CommonDropdown from '../../Common/CommonDropdown';
import styles from './DocumentUpload.module.css';

const DocumentUpload: React.FC = () => {
    const navigate = useNavigate();
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [forms, setForms] = useState<Form[]>([]);
    const [selectedForm, setSelectedForm] = useState<Form | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [clients, setClients] = useState<any[]>([]);
    const [documentTypes, setDocumentTypes] = useState<any[]>([]);
    const [formLoading, setFormLoading] = useState(true);

    useEffect(() => {
        fetchActiveForm();
    }, []);

    useEffect(() => {
        if (selectedForm?.fields) {
            fetchSystemFieldData(selectedForm.fields);
        }
    }, [selectedForm]);

    const fetchActiveForm = async () => {
        try {
            setFormLoading(true);
            const activeForm = await formService.getActiveForm();
            setSelectedForm(activeForm);
            initializeFormData(activeForm);
        } catch (error) {
            console.error('Failed to fetch active form:', error);
        } finally {
            setFormLoading(false);
        }
    };

    const fetchSystemFieldData = async (fields: FormField[]) => {
        const clientField = fields.find(field => (field as any).is_system && field.label.toLowerCase() === 'client');
        const docTypeField = fields.find(field => (field as any).is_system && field.label.toLowerCase().includes('document type'));

        console.log('System fields check:', { clientField, docTypeField, fields });

        try {
            if (clientField) {
                console.log('Fetching clients...');
                const clientResponse = await clientService.getClients(1, 100);
                console.log('Client response:', clientResponse);
                const clientOptions = clientResponse.clients.map(client => ({
                    id: client.id,
                    name: client.business_name || `${client.first_name} ${client.last_name}`.trim()
                }));
                console.log('Client options:', clientOptions);
                setClients(clientOptions);
            }

            if (docTypeField) {
                console.log('Fetching document types...');
                try {
                    const docTypes = await documentTypeService.getActiveDocumentTypes();
                    console.log('Document types response:', docTypes);
                    const docTypeOptions = docTypes.map(type => ({
                        id: type.id,
                        name: type.name
                    }));
                    console.log('Document type options:', docTypeOptions);
                    setDocumentTypes(docTypeOptions);
                } catch (docTypeError) {
                    console.error('Failed to fetch document types:', docTypeError);
                    setDocumentTypes([]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch system field data:', error);
        }
    };

    const initializeFormData = (form: Form) => {
        const initialData: Record<string, any> = {};
        form.fields?.forEach(field => {
            if (field.field_type === 'checkbox') {
                initialData[field.id || ''] = [];
            } else {
                initialData[field.id || ''] = '';
            }
        });
        setFormData(initialData);
    };

    const handleFormFieldChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
        if (formErrors[fieldId]) {
            setFormErrors(prev => ({ ...prev, [fieldId]: '' }));
        }
    };

    const validateForm = (): boolean => {
        if (!selectedForm?.fields) return true;

        const newErrors: Record<string, string> = {};
        selectedForm.fields.forEach(field => {
            if (field.required && (!formData[field.id || ''] || formData[field.id || ''] === '')) {
                newErrors[field.id || ''] = `${field.label} is required`;
            }
        });

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            alert('Please select at least one file');
            return;
        }

        if (selectedForm && !validateForm()) {
            return;
        }

        setUploading(true);

        try {
            const { addUpload } = uploadStore.getState();

            // Keep track of tempIds to map back to results
            const tempIds: string[] = [];

            // Add files to upload store immediately
            files.forEach(file => {
                const tempId = `temp-${Date.now()}-${Math.random()}`;
                tempIds.push(tempId);
                addUpload({
                    tempId,
                    filename: file.name,
                    fileSize: file.size,
                    status: 'queued',
                    progress: 0,
                    createdAt: new Date().toISOString()
                });
            });

            // Start upload process (returns immediately with queued documents)
            const uploadResults = await documentService.uploadDocuments(files);
            console.log('Upload initiated:', uploadResults);

            // Update upload store with document IDs
            const { updateUpload } = uploadStore.getState();
            uploadResults.forEach((result, index) => {
                const tempId = tempIds[index];
                if (tempId) {
                    updateUpload(tempId, {
                        documentId: result.id,
                        status: 'uploading'
                    });
                }
            });

            // Show success message
            // Show success message
            console.log(`${uploadResults.length} document(s) queued for upload.`);

            // Navigate immediately to documents list to show queued documents
            navigate('/documents');
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const renderFormField = (field: FormField) => {
        const fieldId = field.id || '';
        const value = formData[fieldId] || '';
        const hasError = !!formErrors[fieldId];

        // Handle system fields
        if ((field as any).is_system) {
            console.log('Rendering system field:', fieldId, field.label, { clients, documentTypes });
            if (field.label.toLowerCase() === 'client') {
                return (
                    <CommonDropdown
                        value={value}
                        onChange={(val) => handleFormFieldChange(fieldId, val)}
                        options={[
                            { value: '', label: 'Select client' },
                            ...clients.map(client => ({ value: client.id, label: client.name }))
                        ]}
                        size="md"
                    />
                );
            }
            if (field.label.toLowerCase().includes('document type')) {
                return (
                    <CommonDropdown
                        value={value}
                        onChange={(val) => handleFormFieldChange(fieldId, val)}
                        options={[
                            { value: '', label: 'Select document type' },
                            ...documentTypes.map(type => ({ value: type.id, label: type.name }))
                        ]}
                        size="md"
                    />
                );
            }
        }

        switch (field.field_type) {
            case 'textarea':
                return (
                    <textarea
                        className={`${styles.formInput} ${hasError ? styles.error : ''}`}
                        value={value}
                        onChange={(e) => handleFormFieldChange(fieldId, e.target.value)}
                        placeholder={field.placeholder}
                        rows={4}
                    />
                );

            case 'select':
                return (
                    <CommonDropdown
                        value={value}
                        onChange={(val) => handleFormFieldChange(fieldId, val)}
                        options={[
                            { value: '', label: field.placeholder || 'Select an option' },
                            ...(field.options?.map(opt => ({ value: opt, label: opt })) || [])
                        ]}
                        size="md"
                    />
                );

            case 'checkbox':
                return (
                    <div className={styles.checkboxGroup}>
                        {field.options?.map((option, index) => (
                            <label key={index} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={(value || []).includes(option)}
                                    onChange={(e) => {
                                        const currentValues = value || [];
                                        const newValues = e.target.checked
                                            ? [...currentValues, option]
                                            : currentValues.filter((v: string) => v !== option);
                                        handleFormFieldChange(fieldId, newValues);
                                    }}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'radio':
                return (
                    <div className={styles.radioGroup}>
                        {field.options?.map((option, index) => (
                            <label key={index} className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name={fieldId}
                                    value={option}
                                    checked={value === option}
                                    onChange={(e) => handleFormFieldChange(fieldId, e.target.value)}
                                />
                                <span>{option}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'date':
                return (
                    <input
                        type="date"
                        className={`${styles.formInput} ${hasError ? styles.error : ''}`}
                        value={value}
                        onChange={(e) => handleFormFieldChange(fieldId, e.target.value)}
                        placeholder={field.placeholder}
                    />
                );

            default:
                return (
                    <input
                        type={field.field_type}
                        className={`${styles.formInput} ${hasError ? styles.error : ''}`}
                        value={value}
                        onChange={(e) => handleFormFieldChange(fieldId, e.target.value)}
                        placeholder={field.placeholder}
                    />
                );
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button
                        className={styles.backButton}
                        onClick={() => navigate('/documents')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className={styles.title}>Upload Documents</h1>
                </div>
                {files.length > 0 && (
                    <button
                        className={styles.uploadButtonTop}
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        <Upload size={14} />
                        {uploading ? 'Queuing Documents...' : 'Upload selected'}
                    </button>
                )}
            </div>

            <div className={styles.mainLayout}>
                {/* Left Section (60%) - Document Handling */}
                <div className={styles.leftSection}>
                    <div className={styles.section}>
                        <div
                            className={`${styles.dropZone} ${dragActive ? styles.active : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <Upload size={48} className={styles.uploadIcon} />
                            <p className={styles.dropText}>Drag and drop files here</p>
                            <p className={styles.orText}>or</p>
                            <label className={styles.browseButton}>
                                Browse Files
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.txt"
                                    onChange={handleFileSelect}
                                    className={styles.fileInput}
                                />
                            </label>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Selected Files</h3>
                            <div className={styles.fileList}>
                                {files.map((file, index) => (
                                    <div key={index} className={styles.fileItem}>
                                        <FileText size={20} />
                                        <span className={styles.fileName}>{file.name}</span>
                                        <span className={styles.fileSize}>
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                        <button
                                            className={styles.removeButton}
                                            onClick={() => removeFile(index)}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Section (40%) - Dynamic Form */}
                <div className={styles.rightSection}>
                    {formLoading ? (
                        <div className={styles.section}>
                            <div className={styles.loadingState}>
                                <p>Loading form...</p>
                            </div>
                        </div>
                    ) : selectedForm ? (
                        <div className={styles.formContainer}>
                            <div className={styles.formHeader}>
                                <h3 className={styles.formTitle}>{selectedForm.name}</h3>
                                {selectedForm.description && (
                                    <p className={styles.formDescription}>{selectedForm.description}</p>
                                )}
                            </div>

                            <div className={styles.formFields}>
                                {selectedForm.fields?.map((field) => (
                                    <div key={field.id} className={styles.formGroup}>
                                        <label className={styles.label}>
                                            {field.label}
                                            {field.required && <span className={styles.required}>*</span>}
                                        </label>
                                        {renderFormField(field)}
                                        {formErrors[field.id || ''] && (
                                            <span className={styles.errorMessage}>{formErrors[field.id || '']}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Document Information</h3>
                            <p className={styles.noFormMessage}>No active form template found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentUpload;