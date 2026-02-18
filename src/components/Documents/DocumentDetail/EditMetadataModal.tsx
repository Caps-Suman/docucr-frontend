import React from 'react';
import { X, Save } from 'lucide-react';
import CommonDropdown from '../../Common/CommonDropdown';
import { Form } from '../../../services/form.service';
import styles from './EditMetadataModal.module.css';

interface EditMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => Promise<void>;
    form: Form | null;
    editData: any;
    handleFieldChange: (fieldId: string, value: any, label?: string) => void;
    isSaving: boolean;
    clients: any[];
    documentTypes: any[];
}

const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
    isOpen,
    onClose,
    onSave,
    form,
    editData,
    handleFieldChange,
    isSaving,
    clients,
    documentTypes
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Edit Metadata</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.formGrid}>
                        {form?.fields?.map((field) => {
                            const fieldId = field.id || "";
                            const label = field.label || "";
                            const val = editData[fieldId] ?? editData[label];

                            return (
                                <div key={fieldId} className={styles.formGroup}>
                                    <label className={styles.label}>
                                        {field.label}
                                        {field.required && <span className={styles.required}>*</span>}
                                    </label>

                                    <div className={styles.inputWrapper}>
                                        {field.label.toLowerCase() === "client" ? (
                                            <CommonDropdown
                                                value={val || ""}
                                                onChange={(v) => handleFieldChange(fieldId, v, label)}
                                                options={[
                                                    { value: "", label: "Select client" },
                                                    ...clients.map((c) => ({ value: c.id, label: c.name }))
                                                ]}
                                                size="md"
                                            />
                                        ) : field.label.toLowerCase().includes("document type") ? (
                                            <CommonDropdown
                                                value={val || ""}
                                                onChange={(v) => handleFieldChange(fieldId, v, label)}
                                                options={[
                                                    { value: "", label: "Select document type" },
                                                    ...documentTypes.map((t) => ({ value: t.id, label: t.name }))
                                                ]}
                                                size="md"
                                            />
                                        ) : field.field_type === "textarea" ? (
                                            <textarea
                                                className={styles.textarea}
                                                value={val || ""}
                                                onChange={(e) => handleFieldChange(fieldId, e.target.value, label)}
                                                rows={3}
                                            />
                                        ) : field.field_type === "select" ? (
                                            <CommonDropdown
                                                value={val || ""}
                                                onChange={(v) => handleFieldChange(fieldId, v, label)}
                                                options={[
                                                    { value: "", label: "Select an option" },
                                                    ...(field.options?.map((opt) => ({ value: opt, label: opt })) || [])
                                                ]}
                                                size="md"
                                            />
                                        ) : (
                                            <input
                                                type={field.field_type === "date" ? "date" : "text"}
                                                className={styles.input}
                                                value={val || ""}
                                                onChange={(e) => handleFieldChange(fieldId, e.target.value, label)}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button className={styles.saveButton} onClick={onSave} disabled={isSaving}>
                        {isSaving ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditMetadataModal;
