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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isAddingMore, setIsAddingMore] = useState(false);

  // Extraction tracking
  const [extractionDocs, setExtractionDocs] = useState<DocExtractionState[]>([]);
  const [recentlyDoneIds, setRecentlyDoneIds] = useState<Set<string>>(new Set());
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
      setRecentlyDoneIds(new Set());
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

        setExtractionDocs(prev => {
          const next = prev.map(d => {
            if (d.status === "done" || d.status === "failed") return d;

            const match = freshDocs.find(fd => fd.id === d.docId);
            if (!match) return d; // not found yet, keep waiting

            if (match.processed) {
               // Newly finished (ince it wasn't done before)
               setRecentlyDoneIds(prevIds => {
                 const n = new Set(prevIds);
                 n.add(d.docId);
                 return n;
               });
               setTimeout(() => {
                 setRecentlyDoneIds(prevIds => {
                   const n = new Set(prevIds);
                   n.delete(d.docId);
                   return n;
                 });
               }, 10000);

              return { ...d, status: "done" as "done" };
            } else {
              return { ...d, status: "extracting" as "extracting" };
            }
          });

          // Check if any are still pending/extracting
          const stillRunning = next.some(
            doc => doc.status === "pending" || doc.status === "extracting"
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
    e.target.value = "";
  };

  const removeQueuedFile = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const updateCategory = (id: string, category: string) => {
    setQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, category } : f))
    );
  };

  // ── Upload logic ───────────────────────────────────────────────────────────
  const startUploadProcess = async () => {
    if (queue.length === 0) return;

    // Check if any file is missing a category
    const missing = queue.filter(f => !f.category);
    if (missing.length > 0) {
      setValidationTriggered(true);
      return;
    }

    setUploading(true);
    setValidationTriggered(false);
    
    // Track new document IDs for polling
    const uploadedIds: string[] = [];
    const extractionTargets: DocExtractionState[] = [];

    for (const item of queue) {
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, uploading: true } : f));
      
      try {
        const result = await sopService.uploadSOPDocument(sopId, item.file, item.category);
        
        setQueue(prev => prev.map(f => f.id === item.id ? { ...f, uploading: false, uploaded: true } : f));
        uploadedIds.push(result.id);
        
        extractionTargets.push({
          docId: result.id,
          name: item.file.name,
          status: "pending"
        });

      } catch (err: any) {
        console.error("Upload failed", err);
        setQueue(prev => prev.map(f => f.id === item.id ? { ...f, uploading: false, error: "Failed" } : f));
      }
    }

    setUploading(false);
    
    if (uploadedIds.length > 0) {
      // Start background extraction for these
      try {
        await sopService.processSOPDocuments(sopId);
        setExtractionDocs(prev => [...prev, ...extractionTargets]);
        startPolling(uploadedIds);
        onExtractionStateChange?.(true);
      } catch (e) {
        console.error("Failed to start processing", e);
      }
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setDeletingDocId(docId);
    setConfirmDeleteId(null);
    try {
      await sopService.deleteSOPDocument(sopId, docId);
      onDocumentDeleted?.();
      onUploadsComplete();
    } catch (e) {
      console.error(e);
      alert("Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  // ── Helper UI ─────────────────────────────────────────────────────────────
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
    return null;
  };

  const extractionStatusLabel = (status: DocExtractionState["status"]) => {
    if (status === "pending")    return <span style={{ fontSize: "11px", color: "#94a3b8" }}>Queued</span>;
    if (status === "extracting") return <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>Extracting…</span>;
    if (status === "done")       return <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Done</span>;
    if (status === "failed")     return <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>Failed</span>;
    return null;
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) return <FileText size={16} color="#ef4444" />;
    if (file.type.includes("image")) return <Sparkles size={16} color="#3b82f6" />;
    return <FileText size={16} color="#94a3b8" />;
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
          <div className={styles.extractionBanner}>
            <Sparkles size={14} className={styles.sparkleIcon} />
            <span>AI is extracting data in the background...</span>
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
            {!isAddingMore && existingDocuments.map(doc => {
              const extractingDoc = extractionDocs.find(ed => ed.docId === doc.id);
              // Hide from existing list if it's currently being extracted (unless it just finished)
              if (extractingDoc && extractingDoc.status !== "done") return null;
              
              const isRecent = recentlyDoneIds.has(doc.id);
              return (
                <div key={doc.id} className={`${styles.fileRow} ${isRecent ? styles.fileRowDone : ""}`}>
                  <div className={styles.fileInfo}>
                    {isRecent ? (
                      <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                    ) : (
                      <FileText size={14} style={{ color: "#94a3b8" }} />
                    )}
                    <span className={styles.fileName} title={doc.name}>{truncate(doc.name)}</span>
                    {isRecent && (
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Done</span>
                    )}
                  </div>
                  <div className={styles.fileActions}>
                    <span className={styles.uploadedBadge}>{doc.category}</span>
                    <div className={styles.deleteActions}>
                      {confirmDeleteId === doc.id ? (
                        <div className={styles.confirmWrapper}>
                          <button
                            type="button"
                            className={styles.confirmBtn}
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Confirm delete"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            type="button"
                            className={styles.cancelDeleteBtn}
                            onClick={() => setConfirmDeleteId(null)}
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => setConfirmDeleteId(doc.id)}
                          disabled={deletingDocId === doc.id || isBusy}
                          title="Delete document"
                        >
                          {deletingDocId === doc.id
                            ? <Loader2 size={14} className={styles.spin} />
                            : <Trash2 size={14} />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Extraction status rows (shown after upload, while polling) */}
            {extractionDocs.filter(d => d.status !== "done").map(d => {
              return (
                <div
                  key={d.docId}
                  className={`${styles.fileRow} ${d.status === "failed" ? styles.fileRowError : ""}`}
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
              );
            })}

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
                  {!item.uploaded && !item.uploading && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeQueuedFile(item.id)}
                      title="Remove from queue"
                    >
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
          <div className={styles.footerLeft}>
            {(existingDocuments.length > 0 && !isAddingMore) ? (
              <button
                className={styles.addMoreBtn}
                onClick={() => setIsAddingMore(true)}
                disabled={isBusy}
              >
                <FilePlus size={16} />
                Attach More
              </button>
            ) : null}
          </div>

          <div className={styles.footerButtons}>
            {isAddingMore && (
              <button
                className={styles.cancelBtn}
                onClick={() => { setQueue([]); setIsAddingMore(false); }}
                disabled={isBusy}
              >
                Cancel
              </button>
            )}
            
            {!isAddingMore && existingDocuments.length > 0 ? (
                 <button className={styles.doneBtn} onClick={onClose} disabled={isBusy} type="button">
                    Close
                 </button>
            ) : (
                <button
                className={styles.uploadBtn}
                disabled={queue.length === 0 || isBusy}
                onClick={startUploadProcess}
                type="button"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className={styles.spin} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload {queue.length > 0 ? `(${queue.length})` : ""}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExtraDocumentsModal;