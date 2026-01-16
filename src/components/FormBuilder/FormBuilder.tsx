import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Edit2 } from 'lucide-react';
import formService, { FormField } from '../../services/form.service';
import Toast from '../Common/Toast';
import CommonDropdown from '../Common/CommonDropdown';
import EditFieldModal from './EditFieldModal';
import styles from './FormBuilder.module.css';

const FIELD_TYPES = [
    { value: 'text', label: 'Text Input' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'number', label: 'Number' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio Button' }
];

const FormBuilder: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState<FormField[]>([]);
    const [currentField, setCurrentField] = useState<FormField>({
        id: '',
        field_type: 'text',
        label: '',
        placeholder: '',
        required: false,
        options: [],
        order: 0
    });
    const [optionsInput, setOptionsInput] = useState('');
    const [optionsSeparator, setOptionsSeparator] = useState<'comma' | 'newline'>('comma');
    const [editOptionsInput, setEditOptionsInput] = useState('');
    const [editOptionsSeparator, setEditOptionsSeparator] = useState<'comma' | 'newline'>('comma');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<FormField | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isEditMode) {
            fetchForm(id);
        }
    }, [id, isEditMode]);

    const fetchForm = async (formId: string) => {
        try {
            setLoading(true);
            const form = await formService.getForm(formId);
            setName(form.name);
            setDescription(form.description || '');
            setFields(form.fields || []);
        } catch (error) {
            console.error('Failed to fetch form', error);
            setToast({ message: 'Failed to load form details', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = () => {
        if (!currentField.label.trim()) {
            setToast({ message: 'Field label is required', type: 'error' });
            return;
        }

        const newField: FormField = {
            ...currentField,
            id: `temp_${Date.now()}`,
            order: fields.length
        };
        setFields([...fields, newField]);
        
        // Reset current field
        setCurrentField({
            id: '',
            field_type: 'text',
            label: '',
            placeholder: '',
            required: false,
            options: [],
            order: 0
        });
        setOptionsInput('');
    };

    const handleRemoveField = (index: number) => {
        const updatedFields = fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i }));
        setFields(updatedFields);
    };

    const handleFieldChange = (key: keyof FormField, value: any) => {
        setCurrentField({ ...currentField, [key]: value });
    };

    const handleOptionsChange = (value: string) => {
        setOptionsInput(value);
        const options = optionsSeparator === 'comma'
            ? value.split(',').map(opt => opt.trim()).filter(opt => opt !== '')
            : value.split('\n').map(opt => opt.trim()).filter(opt => opt !== '');
        handleFieldChange('options', options);
    };

    const handleEditField = (index: number) => {
        setEditingIndex(index);
        const fieldToEdit = { ...fields[index] };
        setEditingField(fieldToEdit);
        setEditOptionsInput(fieldToEdit.options?.join(', ') || '');
        setEditOptionsSeparator('comma');
        setEditModalOpen(true);
    };

    const handleEditFieldChange = (key: keyof FormField, value: any) => {
        if (editingField) {
            setEditingField({ ...editingField, [key]: value });
        }
    };

    const handleEditOptionsChange = (value: string) => {
        setEditOptionsInput(value);
        const options = editOptionsSeparator === 'comma'
            ? value.split(',').map(opt => opt.trim()).filter(opt => opt !== '')
            : value.split('\n').map(opt => opt.trim()).filter(opt => opt !== '');
        handleEditFieldChange('options', options);
    };

    const handleSaveEdit = () => {
        if (editingIndex !== null && editingField) {
            if (!editingField.label.trim()) {
                setToast({ message: 'Field label is required', type: 'error' });
                return;
            }
            const updatedFields = [...fields];
            updatedFields[editingIndex] = editingField;
            setFields(updatedFields);
            setEditModalOpen(false);
            setEditingIndex(null);
            setEditingField(null);
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const previewField = target.closest(`.${styles.previewField}`);
        if (!previewField || draggedIndex === null) return;
        
        const allFields = Array.from(previewField.parentElement?.children || []);
        const targetIndex = allFields.indexOf(previewField);
        
        if (draggedIndex === targetIndex) return;
        
        const updatedFields = [...fields];
        const draggedField = updatedFields[draggedIndex];
        updatedFields.splice(draggedIndex, 1);
        updatedFields.splice(targetIndex, 0, draggedField);
        
        setFields(updatedFields.map((f, i) => ({ ...f, order: i })));
        setDraggedIndex(targetIndex);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setToast({ message: 'Form name is required', type: 'error' });
            return;
        }

        if (fields.some(f => !f.label.trim())) {
            setToast({ message: 'All fields must have a label', type: 'error' });
            return;
        }

        try {
            setSaving(true);
            const formData = {
                name,
                description,
                fields: fields.map((f, index) => ({
                    ...f,
                    order: index,
                    // Remove temp id
                    id: f.id?.startsWith('temp_') ? undefined : f.id
                }))
            };

            if (isEditMode) {
                await formService.updateForm(id, formData);
                setToast({ message: 'Form updated successfully', type: 'success' });
            } else {
                await formService.createForm(formData);
                setToast({ message: 'Form created successfully', type: 'success' });
            }

            // Redirect after short delay
            setTimeout(() => {
                navigate('/forms');
            }, 1000);
        } catch (error: any) {
            console.error('Failed to save form', error);
            setToast({ message: error.message || 'Failed to save form', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className={styles.container}>Loading form details...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.pageTitle}>
                    <button className={styles.backButton} onClick={() => navigate('/forms')}>
                        <ArrowLeft size={20} />
                    </button>
                    {isEditMode ? 'Edit Form' : 'Create New Form'}
                </div>
                <div className={styles.actions}>
                    <button
                        className={styles.cancelButton}
                        onClick={() => navigate('/forms')}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : (
                            <>
                                <Save size={16} style={{ marginRight: 8 }} />
                                Save Form
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Form Name *</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Employee Onboarding"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        className={styles.textarea}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter form description..."
                    />
                </div>
            </div>

            <div className={styles.twoColumnLayout}>
                {/* Left: Form Preview */}
                <div className={styles.leftPanel}>
                    <h3 className={styles.panelTitle}>Form Preview</h3>
                    <div className={styles.formPreview} onDragOver={handleDragOver}>
                        {fields.length === 0 ? (
                            <div className={styles.emptyPreview}>
                                No fields added yet
                            </div>
                        ) : (
                            fields.map((field, index) => (
                                <div 
                                    key={field.id || index} 
                                    className={`${styles.previewField} ${draggedIndex === index ? styles.dragging : ''}`}
                                >
                                    <div className={styles.previewFieldHeader}>
                                        <div className={styles.previewFieldTitle}>
                                            <div
                                                draggable
                                                onDragStart={() => handleDragStart(index)}
                                                onDragEnd={handleDragEnd}
                                                className={styles.dragHandle}
                                            >
                                                <GripVertical size={16} />
                                            </div>
                                            <label className={styles.previewLabel}>
                                                {field.label || 'Untitled Field'}
                                                {field.required && <span className={styles.required}>*</span>}
                                            </label>
                                        </div>
                                        <div className={styles.previewActions}>
                                            <button
                                                className={styles.editFieldPreview}
                                                onClick={() => handleEditField(index)}
                                                title="Edit Field"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className={styles.removeFieldPreview}
                                                onClick={() => handleRemoveField(index)}
                                                title="Remove Field"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    {field.field_type === 'textarea' ? (
                                        <textarea className={styles.previewInput} placeholder={field.placeholder} />
                                    ) : field.field_type === 'select' ? (
                                        <CommonDropdown
                                            value=""
                                            onChange={() => {}}
                                            options={[
                                                { value: '', label: field.placeholder || 'Select an option' },
                                                ...(field.options?.map(opt => ({ value: opt, label: opt })) || [])
                                            ]}
                                            size="md"
                                        />
                                    ) : field.field_type === 'checkbox' ? (
                                        <div className={styles.previewOptions}>
                                            {field.options?.map((opt, i) => (
                                                <label key={i} className={styles.previewCheckbox}>
                                                    <input type="checkbox" /> {opt}
                                                </label>
                                            ))}
                                        </div>
                                    ) : field.field_type === 'radio' ? (
                                        <div className={styles.previewOptions}>
                                            {field.options?.map((opt, i) => (
                                                <label key={i} className={styles.previewCheckbox}>
                                                    <input type="radio" name={`preview_${index}`} /> {opt}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <input type={field.field_type} className={styles.previewInput} placeholder={field.placeholder} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Field Editor */}
                <div className={styles.rightPanel}>
                    <div className={styles.fieldsHeader}>
                        <h3 className={styles.panelTitle}>Add New Field</h3>
                        <button className={styles.addFieldButton} onClick={handleAddField}>
                            <Plus size={16} />
                            Add Field
                        </button>
                    </div>

                    <div className={styles.fieldItem}>
                        <div className={styles.fieldGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Type</label>
                                <CommonDropdown
                                    value={currentField.field_type}
                                    onChange={(value) => handleFieldChange('field_type', value)}
                                    options={FIELD_TYPES}
                                    size="md"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Label *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={currentField.label}
                                    onChange={(e) => handleFieldChange('label', e.target.value)}
                                    placeholder="Field Label"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Placeholder</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={currentField.placeholder || ''}
                                    onChange={(e) => handleFieldChange('placeholder', e.target.value)}
                                    placeholder="Placeholder text"
                                />
                            </div>

                            {(['select', 'checkbox', 'radio'].includes(currentField.field_type)) && (
                                <>
                                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                        <label className={styles.label}>Options Separator</label>
                                        <CommonDropdown
                                            value={optionsSeparator}
                                            onChange={(value) => {
                                                setOptionsSeparator(value as 'comma' | 'newline');
                                                setOptionsInput('');
                                                handleFieldChange('options', []);
                                            }}
                                            options={[
                                                { value: 'comma', label: 'Comma separated' },
                                                { value: 'newline', label: 'New line separated' }
                                            ]}
                                            size="md"
                                        />
                                    </div>
                                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                        <label className={styles.label}>
                                            Options ({optionsSeparator === 'comma' ? 'comma separated' : 'one per line'})
                                        </label>
                                        {optionsSeparator === 'comma' ? (
                                            <input
                                                type="text"
                                                className={styles.input}
                                                value={optionsInput}
                                                onChange={(e) => handleOptionsChange(e.target.value)}
                                                placeholder="Option 1, Option 2, Option 3"
                                            />
                                        ) : (
                                            <textarea
                                                className={styles.textarea}
                                                value={optionsInput}
                                                onChange={(e) => handleOptionsChange(e.target.value)}
                                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                                rows={4}
                                            />
                                        )}
                                    </div>
                                </>
                            )}

                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label className={styles.checkbox}>
                                    <input
                                        type="checkbox"
                                        checked={currentField.required}
                                        onChange={(e) => handleFieldChange('required', e.target.checked)}
                                    />
                                    <span className={styles.label}>Required Field</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <EditFieldModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setEditingIndex(null);
                    setEditingField(null);
                }}
                onSave={handleSaveEdit}
                field={editingField}
                onFieldChange={handleEditFieldChange}
                onOptionsChange={handleEditOptionsChange}
                fieldTypes={FIELD_TYPES}
                optionsInput={editOptionsInput}
                optionsSeparator={editOptionsSeparator}
                onSeparatorChange={(value) => {
                    setEditOptionsSeparator(value);
                    setEditOptionsInput('');
                    handleEditFieldChange('options', []);
                }}
            />
        </div>
    );
};

export default FormBuilder;