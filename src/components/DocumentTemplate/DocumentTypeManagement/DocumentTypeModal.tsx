import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import styles from "./DocumentTypeModal.module.css";

interface DocumentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  initialData?: { name: string; description: string } | null;
  title: string;
}

const DocumentTypeModal: React.FC<DocumentTypeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
    } else {
      setName("");
      setDescription("");
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length > 100) {
      newErrors.name = "Name cannot exceed 100 characters";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.trim().length > 500) {
      newErrors.description = "Description cannot exceed 500 characters";
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
        name: name.trim().toUpperCase(),
        description: description.trim(),
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
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formContent}>

            {/* Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Name *</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                placeholder="e.g. SUPERBILL, INVOICE, MED"
                maxLength={100}
                style={{ borderColor: errors.name ? "#ef4444" : "#d1d5db" }}
              />
              {errors.name && (
                <span className={styles.errorText}>{errors.name}</span>
              )}
            </div>

            {/* Description — required, used by AI to identify pages */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Description *
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 400,
                    color: "#6b7280",
                  }}
                >
                  (used by AI to identify this document type)
                </span>
              </label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                "Describe the visual appearance of this document so the AI can recognise it.\n" +
                "Example: 2-page medical billing form with CPT code grid (sections A–G), " +
                "patient name at top, provider name, Balance/Copay fields, " +
                "and a diagnosis list on the back page."
                }
                rows={5}
                maxLength={500}
                style={{
                  borderColor: errors.description ? "#ef4444" : "#d1d5db",
                  resize: "vertical",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                {errors.description ? (
                  <span className={styles.errorText}>{errors.description}</span>
                ) : (
                  <span
                    style={{ fontSize: 11, color: "#6b7280" }}
                  >
                    Be specific — mention headings, sections, codes, or layout
                    visible on the page
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    color: description.length > 450 ? "#ef4444" : "#9ca3af",
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {description.length}/500
                </span>
              </div>
            </div>

          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {/* FIX: type="submit" so the form's onSubmit fires */}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentTypeModal;