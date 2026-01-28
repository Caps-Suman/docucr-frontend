import React from 'react';
import { X } from 'lucide-react';
import CommonDropdown from '../Common/CommonDropdown';
import { FormField } from '../../services/form.service';
import styles from './EditFieldModal.module.css';

interface EditFieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    field: FormField | null;
    onFieldChange: (key: keyof FormField, value: any) => void;
    onOptionsChange: (value: string) => void;
    fieldTypes: Array<{ value: string; label: string }>;
    optionsInput: string;
    optionsSeparator: 'comma' | 'newline';
    onSeparatorChange: (value: 'comma' | 'newline') => void;
}

const EditFieldModal: React.FC<EditFieldModalProps> = ({
    isOpen,
    onClose,
    onSave,
    field,
    onFieldChange,
    onOptionsChange,
    fieldTypes,
    optionsInput,
    optionsSeparator,
    onSeparatorChange
}) => {
    if (!isOpen || !field) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Edit Field</h3>
                    <button className={styles.modalClose} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className={styles.modalBody}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Input Type</label>
                        <CommonDropdown
                            value={field.field_type}
                            onChange={(value) => onFieldChange('field_type', value)}
                            options={fieldTypes}
                            size="md"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Label *</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={field.label}
                            onChange={(e) => onFieldChange('label', e.target.value)}
                            placeholder="Field Label"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Placeholder</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={field.placeholder || ''}
                            onChange={(e) => onFieldChange('placeholder', e.target.value)}
                            placeholder="Placeholder text"
                        />
                    </div>

                    {(['select', 'checkbox', 'radio'].includes(field.field_type)) && (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Options Separator</label>
                                <CommonDropdown
                                    value={optionsSeparator}
                                    onChange={(value) => onSeparatorChange(value as 'comma' | 'newline')}
                                    options={[
                                        { value: 'comma', label: 'Comma separated' },
                                        { value: 'newline', label: 'New line separated' }
                                    ]}
                                    size="md"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Options ({optionsSeparator === 'comma' ? 'comma separated' : 'one per line'})
                                </label>
                                {optionsSeparator === 'comma' ? (
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={optionsInput}
                                        onChange={(e) => onOptionsChange(e.target.value)}
                                        placeholder="Option 1, Option 2, Option 3"
                                    />
                                ) : (
                                    <textarea
                                        className={styles.textarea}
                                        value={optionsInput}
                                        onChange={(e) => onOptionsChange(e.target.value)}
                                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                                        rows={4}
                                    />
                                )}
                            </div>
                        </>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => onFieldChange('required', e.target.checked)}
                            />
                            <span className={styles.label}>Required Field</span>
                        </label>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    <button className={styles.saveButton} onClick={onSave}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditFieldModal;
