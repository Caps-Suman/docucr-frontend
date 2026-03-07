import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Upload, FileText, Trash2, Loader2, FilePlus, Sparkles, CheckCircle2, Clock } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import styles from "./ExtraDocumentsModal.module.css";
import sopService from "../../../services/sop.service";
import { SOPDocument } from "../../../types/sop";

const SOP_CATEGORIES = [
  "Billing Guidelines",
  "Payer Guidelines",
  "CPT Coding Rules",
  "ICD Coding Rules",
];

interface QueuedFile {
  id: string;
  file: File;
  category: string;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

// Per-document extraction state (tracked by document DB id after upload)
interface DocExtractionState {
  docId: string;       // DB document id returned after upload
  name: string;
  status: "pending" | "extracting" | "done" | "failed";
}

interface ExtraDocumentsModalProps {
  sopId: string;
  isOpen: boolean;
  onClose: () => void;
  onUploadsComplete: () => void;
  existingDocuments?: SOPDocument[];
  onDocumentDeleted?: () => void;
  onExtractionStateChange?: (isExtracting: boolean) => void;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1000; // 5 min safety cap

const ExtraDocumentsModal: React.FC<ExtraDocumentsModalProps> = ({
  sopId,
  isOpen,
  onClose,
  onUploadsComplete,
  existingDocuments = [],
  onDocumentDeleted,
  onExtractionStateChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validationTriggered, setValidationTriggered] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isAddingMore, setIsAddingMore] = useState(false);

  // Extraction tracking
  const [extractionDocs, setExtractionDocs] = useState<DocExtractionState[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef  = useRef<number>(0);

  // ── stopPolling must be defined before the useEffect that calls it ─────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsAddingMore(false);
      setQueue([]);
      setValidationTriggered(false);
      setUploading(false);
      setExtractionDocs([]);
      setIsPolling(false);
      stopPolling();
    }
    return () => stopPolling();
  }, [isOpen, stopPolling]);

  if (!isOpen) return null;

  // ── Polling helpers ────────────────────────────────────────────────────────

  const startPolling = (pendingIds: string[]) => {
    setIsPolling(true);
    pollStartRef.current = Date.now();

    pollTimerRef.current = setInterval(async () => {
      // Safety timeout
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setIsPolling(false);
        onExtractionStateChange?.(false);
        setExtractionDocs(prev =>
          prev.map(d =>
            d.status === "extracting" ? { ...d, status: "failed" } : d
          )
        );
        return;
      }

      try {
        // Re-fetch SOP to check document.processed flags
        const sop = await sopService.getSOPById(sopId);
        const freshDocs: SOPDocument[] = sop.documents || [];

        let allDone = true;

        setExtractionDocs(prev => {
          const next = prev.map(d => {
            if (d.status === "done" || d.status === "failed") return d;

            const match = freshDocs.find(fd => fd.id === d.docId);
            if (!match) return d; // not found yet, keep waiting

            if (match.processed) {
              return { ...d, status: "done" as const };
            } else {
              allDone = false;
              return { ...d, status: "extracting" as const };
            }
          });

          // Check if any are still pending/extracting
          const stillRunning = next.some(
            d => d.status === "pending" || d.status === "extracting"
          );

          if (!stillRunning) {
            stopPolling();
            setIsPolling(false);
            onExtractionStateChange?.(false);
            // Notify parent — refresh SOP data
            onUploadsComplete();
          }

          return next;
        });

      } catch (e) {
        console.error("Poll error:", e);
      }
    }, POLL_INTERVAL_MS);
  };

  // ── File selection ─────────────────────────────────────────────────────────
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
    setQueue(prev => prev.map(item => item.id === id ? { ...item, category } : item));
  };

  const removeItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  // ── Main upload handler ────────────────────────────────────────────────────
  const handleUploadAll = async () => {
    if (!sopId || queue.length === 0) return;

    const missing = queue.filter(f => !f.uploaded && !f.category);
    if (missing.length > 0) {
      setValidationTriggered(true);
      return;
    }
    setValidationTriggered(false);
    setUploading(true);

    // ── Step 1: Upload files sequentially ────────────────────────────────────
    const updated = [...queue];
    // Collect the DB document ids returned by the upload API
    const uploadedDocIds: Array<{ queueId: string; docId: string; name: string }> = [];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].uploaded) continue;

      updated[i] = { ...updated[i], uploading: true, error: null };
      setQueue([...updated]);

      try {
        // sopService.uploadSOPDocument should return the created SOPDocument
        const createdDoc = await sopService.uploadSOPDocument(
          sopId,
          updated[i].file,
          updated[i].category
        );

        updated[i] = { ...updated[i], uploading: false, uploaded: true };

        if (createdDoc?.id) {
          uploadedDocIds.push({
            queueId: updated[i].id,
            docId: createdDoc.id,
            name: updated[i].file.name,
          });
        }
      } catch {
        updated[i] = { ...updated[i], uploading: false, error: "Upload failed" };
      }

      setQueue([...updated]);
    }

    setUploading(false);

    const allUploaded = updated.every(f => f.uploaded);
    if (!allUploaded || uploadedDocIds.length === 0) return;

    // ── Step 2: Fire-and-forget background extraction (no await on extraction) ─
    // Set extraction docs to pending immediately so UI shows them
    const extractionEntries: DocExtractionState[] = uploadedDocIds.map(({ docId, name }) => ({
      docId,
      name,
      status: "pending",
    }));
    setExtractionDocs(extractionEntries);

    // Tell the backend to start background extraction — returns 202 immediately
    try {
      await sopService.processSOPDocuments(sopId);
      // Mark all as "extracting" (background job accepted)
      setExtractionDocs(prev => prev.map(d => ({ ...d, status: "extracting" })));
    } catch (e) {
      console.error("Failed to queue extraction:", e);
      setExtractionDocs(prev => prev.map(d => ({ ...d, status: "failed" })));
      return;
    }

    // ── Step 3: Poll until all extracted ─────────────────────────────────────
    onExtractionStateChange?.(true);
    startPolling(uploadedDocIds.map(d => d.docId));

    // Clear the upload queue — extracted docs show in extraction panel below
    setQueue([]);
    setIsAddingMore(false);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!sopId) return;
    try {
      setDeletingDocId(docId);
      await sopService.deleteSOPDocument(sopId, docId);
      if (onDocumentDeleted) onDocumentDeleted();
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

  const pendingCount       = queue.filter(f => !f.uploaded).length;
  const uncategorisedCount = queue.filter(f => !f.uploaded && !f.category).length;
  const isBusy             = uploading || isPolling;

  const extractionStatusIcon = (status: DocExtractionState["status"]) => {
    if (status === "pending")   return <Clock size={14} style={{ color: "#94a3b8" }} />;
    if (status === "extracting") return <Loader2 size={14} className={styles.spin} style={{ color: "#f59e0b" }} />;
    if (status === "done")      return <CheckCircle2 size={14} style={{ color: "#22c55e" }} />;
    if (status === "failed")    return <X size={14} style={{ color: "#ef4444" }} />;
  };

  const extractionStatusLabel = (status: DocExtractionState["status"]) => {
    if (status === "pending")    return <span style={{ fontSize: "11px", color: "#94a3b8" }}>Queued</span>;
    if (status === "extracting") return <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>Extracting…</span>;
    if (status === "done")       return <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Done</span>;
    if (status === "failed")     return <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>Failed</span>;
  };

  return (
    <div
      className={styles.overlay}
      onClick={e => { if (e.target === e.currentTarget && !uploading) onClose(); }}
    >
      <div className={styles.modal}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FilePlus size={20} color="#0284c7" />
            <h2 className={styles.title}>Attach Extra Documents</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button" disabled={uploading}>
            <X size={18} />
          </button>
        </div>

        {/* ── Background extraction banner ── */}
        {isPolling && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 16px",
            background: "#fffbeb", borderBottom: "1px solid #fde68a",
            fontSize: "13px", color: "#92400e", fontWeight: 500
          }}>
            <Sparkles size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
            Extracting data in the background — you can close this modal anytime.
            <Loader2 size={14} className={styles.spin} style={{ marginLeft: "auto", color: "#f59e0b" }} />
          </div>
        )}

        {/* ── Drop zone (hidden when viewing existing docs) ── */}
        {!(existingDocuments.length > 0 && !isAddingMore) && (
          <div
            className={styles.dropZone}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            style={{ opacity: isBusy ? 0.5 : 1, cursor: isBusy ? "not-allowed" : "pointer" }}
          >
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

        {/* ── File list ── */}
        {(queue.length > 0 || (existingDocuments.length > 0 && !isAddingMore) || extractionDocs.length > 0) && (
          <div className={styles.fileList}>

            {/* Existing (already-uploaded) documents */}
            {!isAddingMore && existingDocuments.map(doc => (
              <div key={doc.id} className={`${styles.fileRow} ${styles.fileRowDone}`}>
                <div className={styles.fileInfo}>
                  <span className={styles.checkIcon}>✓</span>
                  <span className={styles.fileName} title={doc.name}>{truncate(doc.name)}</span>
                </div>
                <div className={styles.fileActions}>
                  <span className={styles.uploadedBadge}>{doc.category}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleDeleteDocument(doc.id)}
                    disabled={deletingDocId === doc.id || isBusy}
                    title="Delete document"
                  >
                    {deletingDocId === doc.id
                      ? <Loader2 size={14} className={styles.spin} />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>
            ))}

            {/* Extraction status rows (shown after upload, while polling) */}
            {extractionDocs.map(d => (
              <div
                key={d.docId}
                className={`${styles.fileRow} ${d.status === "done" ? styles.fileRowDone : ""} ${d.status === "failed" ? styles.fileRowError : ""}`}
              >
                <div className={styles.fileInfo}>
                  {extractionStatusIcon(d.status)}
                  <span className={styles.fileName} title={d.name}>{truncate(d.name)}</span>
                  {extractionStatusLabel(d.status)}
                </div>
                <div className={styles.fileActions}>
                  <span className={styles.uploadedBadge} style={{ background: "#f0fdf4", color: "#166534" }}>
                    Uploaded ✓
                  </span>
                </div>
              </div>
            ))}

            {/* Queue (pending upload) items */}
            {queue.map(item => (
              <div
                key={item.id}
                className={`${styles.fileRow} ${item.uploaded ? styles.fileRowDone : ""} ${item.error ? styles.fileRowError : ""} ${validationTriggered && !item.uploaded && !item.category ? styles.fileRowMissing : ""}`}
              >
                <div className={styles.fileInfo}>
                  {item.uploading
                    ? <Loader2 size={16} className={styles.spin} />
                    : item.uploaded
                      ? <span className={styles.checkIcon}>✓</span>
                      : getFileIcon(item.file)
                  }
                  <span className={styles.fileName} title={item.file.name}>
                    {truncate(item.file.name)}
                  </span>
                  {item.error && <span className={styles.errorText}>{item.error}</span>}
                </div>

                <div className={styles.fileActions}>
                  {!item.uploaded && (() => {
                    const categoryOptions = SOP_CATEGORIES.map(cat => ({ value: cat, label: cat }));
                    return (
                      <div style={{ minWidth: "180px" }}>
                        <Select
                          options={categoryOptions}
                          value={item.category ? { value: item.category, label: item.category } : null}
                          placeholder="Select category…"
                          onChange={opt => { opt && updateCategory(item.id, opt.value); setValidationTriggered(false); }}
                          styles={{
                            ...getCustomSelectStyles(),
                            control: (base: any) => ({
                              ...getCustomSelectStyles().control(base),
                              minHeight: "32px", height: "32px", fontSize: "12px",
                            }),
                            valueContainer: (base: any) => ({ ...base, padding: "0 8px" }),
                            indicatorsContainer: (base: any) => ({ ...base, height: "32px" }),
                            singleValue: (base: any) => ({ ...base, fontSize: "12px" }),
                            option: (base: any, state: any) => ({
                              ...getCustomSelectStyles().option(base, state), fontSize: "12px",
                            }),
                            menuPortal: (base: any) => ({ ...base, zIndex: 99999 }),
                          }}
                          isDisabled={item.uploading || isBusy}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                        />
                      </div>
                    );
                  })()}
                  {item.uploaded && <span className={styles.uploadedBadge}>{item.category}</span>}
                  {!item.uploading && !item.uploaded && (
                    <button type="button" className={styles.removeBtn} onClick={() => removeItem(item.id)} disabled={isBusy}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className={styles.footer}>
          {validationTriggered && uncategorisedCount > 0 && (
            <span className={styles.errorMessage}>
              {uncategorisedCount} file{uncategorisedCount > 1 ? "s" : ""} need a category
            </span>
          )}

          <div className={styles.footerButtons}>
            {existingDocuments.length > 0 && !isAddingMore ? (
              <>
                <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={uploading}>
                  {isPolling ? "Close (extracting in background…)" : "Close"}
                </button>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => setIsAddingMore(true)}
                  disabled={uploading}
                >
                  <FilePlus size={15} style={{ marginRight: "6px" }} /> Add More
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
                  {isPolling ? "Close (extracting in background…)" : "Cancel"}
                </button>

                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={handleUploadAll}
                  disabled={pendingCount === 0 || isBusy}
                >
                  {uploading ? (
                    <><Loader2 size={15} className={styles.spin} /> Uploading…</>
                  ) : (
                    <><Upload size={15} /> Upload{pendingCount > 0 ? ` (${pendingCount})` : ""}</>
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