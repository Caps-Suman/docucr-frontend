import React, { useRef, useState } from "react";
import { X, Upload, FileText, Trash2, Loader2, FilePlus } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import styles from "./ExtraDocumentsModal.module.css";
import sopService from "../../../services/sop.service";
import { SOPDocument } from "../../../types/sop";

const SOP_CATEGORIES = [
  // Sections
  "Basic Information",
  "Workflow Process",
  "Posting Charges Rules",
  "Eligibility Verification Portals",
  "Billing Guidelines",
  "Payer Guidelines",
  "Coding Guidelines",
  // Sub-sections
  "CPT Coding Rules",
  "ICD Coding Rules",
  // Other
  "General",
];

interface QueuedFile {
  id: string;
  file: File;
  category: string;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

interface ExtraDocumentsModalProps {
  sopId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadsComplete: () => void;
  existingDocuments?: SOPDocument[];
  onDocumentDeleted?: () => void;
}

const ExtraDocumentsModal: React.FC<ExtraDocumentsModalProps> = ({
  sopId,
  isOpen,
  onClose,
  onUploadsComplete,
  existingDocuments = [],
  onDocumentDeleted,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validationTriggered, setValidationTriggered] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isAddingMore, setIsAddingMore] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsAddingMore(false);
      setQueue([]);
      setValidationTriggered(false);
      setUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: QueuedFile[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      category: "",
      uploading: false,
      uploaded: false,
      error: null,
    }));
    setQueue((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateCategory = (id: string, category: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item))
    );
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUploadAll = async () => {
    if (!sopId || queue.length === 0) return;

    // Validate: all pending files must have a category
    const missing = queue.filter((f) => !f.uploaded && !f.category);
    if (missing.length > 0) {
      setValidationTriggered(true);
      return;
    }
    setValidationTriggered(false);
    setUploading(true);

    const updated = [...queue];
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].uploaded) continue;
      updated[i] = { ...updated[i], uploading: true, error: null };
      setQueue([...updated]);
      try {
        await sopService.uploadSOPDocument(sopId, updated[i].file, updated[i].category);
        updated[i] = { ...updated[i], uploading: false, uploaded: true };
      } catch {
        updated[i] = { ...updated[i], uploading: false, error: "Upload failed" };
      }
      setQueue([...updated]);
    }

    setUploading(false);
    const allUploaded = updated.every((f) => f.uploaded);
    if (allUploaded) {
      onUploadsComplete();
      setQueue([]);
      setIsAddingMore(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!sopId) return;
    try {
      setDeletingDocId(docId);
      await sopService.deleteSOPDocument(sopId, docId);
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeletingDocId(null);
    }
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return <FileText size={16} color={ext === "pdf" ? "#ef4444" : "#0284c7"} />;
  };

  const truncate = (name: string, max = 30) => {
    if (name.length <= max) return name;
    const ext = name.lastIndexOf(".");
    const extension = ext > -1 ? name.substring(ext) : "";
    return name.substring(0, max - extension.length - 3) + "..." + extension;
  };

  const pendingCount = queue.filter((f) => !f.uploaded).length;
  const uncategorisedCount = queue.filter((f) => !f.uploaded && !f.category).length;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FilePlus size={20} color="#0284c7" />
            <h2 className={styles.title}>Attach Extra Documents</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button" disabled={uploading}>
            <X size={18} />
          </button>
        </div>

        {/* Drop zone */}
        {!(existingDocuments.length > 0 && !isAddingMore) && (
          <div className={styles.dropZone} onClick={() => fileInputRef.current?.click()}>
            <Upload size={24} color="#94a3b8" />
            <p className={styles.dropText}>Click to select files</p>
            <p className={styles.dropHint}>PDF, DOCX, XLSX, XLS, PNG, JPG, JPEG</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={handleFilesSelected}
            />
          </div>
        )}

        {/* File list */}
        {(queue.length > 0 || (existingDocuments.length > 0 && !isAddingMore)) && (
          <div className={styles.fileList}>
            {/* Existing Documents */}
            {!isAddingMore && existingDocuments.map((doc) => (
              <div key={doc.id} className={`${styles.fileRow} ${styles.fileRowDone}`}>
                <div className={styles.fileInfo}>
                  <span className={styles.checkIcon}>✓</span>
                  <span className={styles.fileName} title={doc.name}>
                    {truncate(doc.name)}
                  </span>
                </div>
                <div className={styles.fileActions}>
                  <span className={styles.uploadedBadge}>{doc.category}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleDeleteDocument(doc.id)}
                    disabled={deletingDocId === doc.id || uploading}
                    title="Delete document"
                  >
                    {deletingDocId === doc.id ? (
                      <Loader2 size={14} className={styles.spin} />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
            
            {/* Queue Items */}
            {queue.map((item) => (
              <div
                key={item.id}
                className={`${styles.fileRow} ${item.uploaded ? styles.fileRowDone : ""} ${item.error ? styles.fileRowError : ""} ${validationTriggered && !item.uploaded && !item.category ? styles.fileRowMissing : ""}`}
              >
                <div className={styles.fileInfo}>
                  {item.uploading ? (
                    <Loader2 size={16} className={styles.spin} />
                  ) : item.uploaded ? (
                    <span className={styles.checkIcon}>✓</span>
                  ) : (
                    getFileIcon(item.file)
                  )}
                  <span className={styles.fileName} title={item.file.name}>
                    {truncate(item.file.name)}
                  </span>
                  {item.error && <span className={styles.errorText}>{item.error}</span>}
                </div>
                <div className={styles.fileActions}>
                  {!item.uploaded && (() => {
                    const categoryOptions = SOP_CATEGORIES.map((cat) => ({ value: cat, label: cat }));
                    const isMissing = validationTriggered && !item.category;
                    return (
                      <div style={{ minWidth: '180px' }}>
                        <Select
                          options={categoryOptions}
                          value={item.category ? { value: item.category, label: item.category } : null}
                          placeholder="Select category…"
                          onChange={(opt) => { opt && updateCategory(item.id, opt.value); setValidationTriggered(false); }}
                          styles={{
                            ...getCustomSelectStyles(),
                            control: (base: any) => ({
                              ...getCustomSelectStyles().control(base),
                              minHeight: '32px',
                              height: '32px',
                              fontSize: '12px',
                            }),
                            valueContainer: (base: any) => ({
                              ...base,
                              padding: '0 8px',
                            }),
                            indicatorsContainer: (base: any) => ({
                              ...base,
                              height: '32px',
                            }),
                            singleValue: (base: any) => ({
                              ...base,
                              fontSize: '12px',
                            }),
                            option: (base: any, state: any) => ({
                              ...getCustomSelectStyles().option(base, state),
                              fontSize: '12px',
                            }),
                            menuPortal: (base: any) => ({
                              ...base,
                              zIndex: 99999,
                            }),
                          }}
                          isDisabled={item.uploading || uploading}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                    );
                  })()}
                  {item.uploaded && (
                    <span className={styles.uploadedBadge}>{item.category}</span>
                  )}
                  {!item.uploading && !item.uploaded && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.id)}
                      disabled={uploading}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          {validationTriggered && uncategorisedCount > 0 && (
            <span className={styles.errorMessage}>
              {uncategorisedCount} file{uncategorisedCount > 1 ? 's' : ''} need a category
            </span>
          )}
          <div className={styles.footerButtons}>
            {existingDocuments.length > 0 && !isAddingMore ? (
              <>
                <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={uploading}>
                  Close
                </button>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => setIsAddingMore(true)}
                >
                  <FilePlus size={15} style={{ marginRight: '6px' }} /> Add More
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button" 
                  className={styles.cancelBtn} 
                  onClick={() => {
                    if (existingDocuments.length > 0) {
                      setIsAddingMore(false);
                      setQueue([]);
                      setValidationTriggered(false);
                    } else {
                      onClose();
                    }
                  }} 
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={handleUploadAll}
                  disabled={pendingCount === 0 || uploading}
                >
                  {uploading ? (
                    <><Loader2 size={15} className={styles.spin} /> Uploading…</>
                  ) : (
                    <><Upload size={15} /> Upload {pendingCount > 0 ? `(${pendingCount})` : ""}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtraDocumentsModal;
