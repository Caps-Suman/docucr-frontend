import React, { useRef, useState, useEffect, useCallback } from "react";
import { X, Upload, FileText, Trash2, Loader2, FilePlus, Sparkles, CheckCircle2, Clock } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import styles from "./ExtraDocumentsModal.module.css";
import sopService from "../../../services/sop.service";
import { SOP, SOPDocument } from "../../../types/sop";

const SOP_CATEGORIES = [
  "Billing Guidelines",
  "Payer Guidelines",
  "CPT Coding Rules",
  "ICD Coding Rules",
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
  onUploadsComplete: (silent?: boolean) => void;
  existingDocuments?: SOPDocument[];
  onDocumentDeleted?: (docId: string, sourceName: string) => void;
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
    console.log('[ExtraDocsModal] stopPolling called, timer exists:', !!pollTimerRef.current);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── Reset on open/close ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Reset only when opening
      setIsAddingMore(false);
      setQueue([]);
      setValidationTriggered(false);
      setUploading(false);
      // We DON'T reset extractionDocs or isPolling here if we want them to persist
      // while the modal is closed but the parent page is still active.
      // However, usually we want a fresh start if nothing was already polling.
      if (!isPolling) {
        setExtractionDocs([]);
        setRecentlyDoneIds(new Set());
      }
    }
  }, [isOpen]); // Only trigger when isOpen changes

  useEffect(() => {
    return () => {
      // We ONLY stop polling on unmount. 
      // Individual poll cycles manage their own stop logic.
      if (pollTimerRef.current) {
        console.log('[ExtraDocsModal] Unmounting - stopping polling');
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      onExtractionStateChange?.(false);
    };
  }, [onExtractionStateChange]);


  // ── Polling helpers ────────────────────────────────────────────────────────
  const startPolling = useCallback((pendingIds: string[]) => {
    stopPolling();
    setIsPolling(true);
    onExtractionStateChange?.(true);
    pollStartRef.current = Date.now();

    const pollOnce = async () => {
      console.log('[ExtraDocsModal] Poll tick');
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        console.log('[ExtraDocsModal] Timeout');
        stopPolling();
        setIsPolling(false);
        onExtractionStateChange?.(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/sops/${sopId}?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
        });
        if (!response.ok) return;
        
        const sop: SOP = await response.json();
        const freshDocs: SOPDocument[] = sop.documents || [];
        console.log('[ExtraDocsModal] freshDocs:', freshDocs.map(d => ({ id: d.id, name: d.name, processed: d.processed })));

        setExtractionDocs(prev => {
          console.log('[ExtraDocsModal] extractionDocs:', prev);
          let anyNewlyDone = false;
          const next = prev.map(d => {
            if (d.status === "done" || d.status === "failed") return d;
            const match = freshDocs.find(fd => 
              (fd.id && d.docId && String(fd.id).toLowerCase() === String(d.docId).toLowerCase()) ||
              (fd.name === d.name)
            );
            console.log(`Match ${d.docId}:`, match ? { id: match.id, processed: match.processed } : 'NO MATCH');
            if (!match) return d;
            if (match.processed) {
              console.log(`Doc ${d.docId} DONE`);
              anyNewlyDone = true;
              return { ...d, status: "done" as const };
            }
            return { ...d, status: "extracting" as const };
          });

          if (anyNewlyDone) {
            console.log('[ExtraDocsModal] Incremental refresh triggered');
            // Silent refresh to update parent data without showing a toast
            onUploadsComplete(true);
          }

          const isStillBusy = next.some(d => d.status === "pending" || d.status === "extracting");
          console.log('isStillBusy:', isStillBusy, 'next:', next);

          if (!isStillBusy) {
            console.log('[ExtraDocsModal] STOPPING - calling stopPolling');
            setTimeout(() => {
              stopPolling();
              setIsPolling(false);
              onExtractionStateChange?.(false);
              // Final non-silent refresh to show the final toast
              onUploadsComplete(false);
            }, 0);
          }
          return next;
        });
      } catch (e) {
        console.error('[ExtraDocsModal] Poll error:', e);
      }
    };

    pollOnce();
    pollTimerRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
    console.log('[ExtraDocsModal] Started polling:', pendingIds);
  }, [sopId, stopPolling, onExtractionStateChange, onUploadsComplete]);

  // Sync isPolling state with parent callback
  useEffect(() => {
    onExtractionStateChange?.(isPolling);
  }, [isPolling, onExtractionStateChange]);

  // ── Auto-start polling for existing unprocessed docs ───────────────────────
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    // Only auto-start on mount/open
    if (isOpen && !isPolling && existingDocuments.length > 0 && !hasAutoStartedRef.current) {
      const unprocessed = existingDocuments.filter(d => !d.processed);
      if (unprocessed.length > 0) {
        hasAutoStartedRef.current = true;
        setExtractionDocs(prev => {
          const next = [...prev];
          unprocessed.forEach(d => {
            const exists = next.some(existing => 
              String(existing.docId) === String(d.id) || existing.name === d.name
            );
            if (!exists) {
              next.push({
                docId: d.id,
                name: d.name,
                status: "extracting"
              });
            }
          });
          return next;
        });
        startPolling(unprocessed.map(d => String(d.id)));
      }
    }
    
    // Reset the ref when modal is closed so it can auto-start again next time it opens
    if (!isOpen) {
      hasAutoStartedRef.current = false;
    }
  }, [isOpen, existingDocuments, isPolling, startPolling]);

  if (!isOpen) return null;

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

    const selected = queue; // Use 'queue' as 'selected' for now, assuming all are selected for upload

    for (const item of selected) {
      if (item.uploaded || item.uploading) continue;
      
      setQueue(prev => prev.map(f => f.id === item.id ? { ...f, uploading: true, error: null } : f));
      
      try {
        const uploadedDoc = await sopService.uploadSOPDocument(sopId, item.file, item.category);
        console.log('[ExtraDocsModal] Uploaded doc response:', uploadedDoc);
        uploadedIds.push(uploadedDoc.id);
        
        // Use the real docId instead of item.id
        extractionTargets.push({
          docId: uploadedDoc.id,
          name: uploadedDoc.name || item.file.name, // Fallback if server doesn't return name
          status: "pending"
        });

        setQueue(prev => prev.map(f => f.id === item.id ? { ...f, uploading: false, uploaded: true } : f));
      } catch (err: any) {
        console.error("Upload failed", err);
        setQueue(prev => prev.map(f => f.id === item.id ? { ...f, uploading: false, error: "Failed" } : f));
      }
    }

    setUploading(false);
    
    if (uploadedIds.length > 0) {
      try {
        console.log('[ExtraDocsModal] Triggering extraction for uploaded docs:', uploadedIds);
        await sopService.processSOPDocuments(sopId);
        
        // Set extraction docs BEFORE starting poll
        setExtractionDocs(prev => {
          const next = [...prev];
          extractionTargets.forEach(target => {
            const exists = next.some(existing => 
              String(existing.docId) === String(target.docId) || existing.name === target.name
            );
            if (!exists) {
              console.log('[ExtraDocsModal] Adding to extractionDocs:', target);
              next.push(target);
            }
          });
          return next;
        });
        
        setQueue([]);
        onUploadsComplete();
        
        // Start polling AFTER extraction docs are set
        setTimeout(() => startPolling(uploadedIds), 0);
      } catch (err) {
        console.error('[ExtraDocsModal] Failed to trigger extraction', err);
      }
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    setDeletingDocId(docId);
    setConfirmDeleteId(null);
    try {
      const docToDelete = existingDocuments.find(d => d.id === docId);
      const sourceName = docToDelete?.category === "Source file" ? "source_file" : (docToDelete?.name || "");
      
      await sopService.deleteSOPDocument(sopId, docId);
      onDocumentDeleted?.(docId, sourceName);
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
    if (!name) return "";
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

        {/* ── Drop zone (shown only when queue is empty or explicitly adding) ── */}
        {(isAddingMore || existingDocuments.length === 0) && queue.length === 0 && (
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

            {/* Existing (already-uploaded) documents & their extraction status */}
            {existingDocuments.map((doc, idx) => {
            const extractingDoc = extractionDocs.find(ed => String(ed.docId) === String(doc.id));
            const isRecent      = recentlyDoneIds.has(doc.id);
            
            // Visual Fix: Prioritize extractionDocs status over doc.processed
            // This prevents "flickering" back to extracting if the parent prop is stale
            let activeStatus: DocExtractionState["status"] | null = null;
            if (extractingDoc) {
              if (extractingDoc.status === "pending" || extractingDoc.status === "extracting" || extractingDoc.status === "failed") {
                activeStatus = extractingDoc.status;
              }
            } else if (!doc.processed) {
              activeStatus = "extracting";
            }
            
            const showDoneBadge = isRecent || (extractingDoc?.status === "done") || (doc.processed && !activeStatus);
            
            return (
              <div key={`existing-${doc.id || idx}`} className={`${styles.fileRow} ${showDoneBadge ? styles.fileRowDone : ""} ${activeStatus === 'failed' ? styles.fileRowError : ""}`}>
                <div className={styles.fileInfo}>
                  {activeStatus ? extractionStatusIcon(activeStatus) : showDoneBadge ? (
                    <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                  ) : (
                    <FileText size={14} style={{ color: "#94a3b8" }} />
                  )}
                  <span className={styles.fileName} title={doc.name}>{truncate(doc.name)}</span>
                  {activeStatus ? extractionStatusLabel(activeStatus) : showDoneBadge && (
                    <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>Done</span>
                  )}
                </div>
                <div className={styles.fileActions}>
                  <span className={styles.uploadedBadge}>{doc.category}</span>
                  
                  {!activeStatus ? (
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
                    ) : (
                      <span className={styles.uploadedBadge} style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}>
                           Extracting...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Extraction Progress for documents strictly NOT yet in the DB listing */}
            {extractionDocs.filter(d => 
              !existingDocuments.some(ed => String(ed.id) === String(d.docId) || ed.name === d.name)
            ).map((d, idx) => {
              return (
                <div
                  key={`extracting-${d.docId || idx}`}
                  className={`${styles.fileRow} ${d.status === "failed" ? styles.fileRowError : ""}`}
                >
                  <div className={styles.fileInfo}>
                    {extractionStatusIcon(d.status)}
                    <span className={styles.fileName} title={d.name}>{truncate(d.name)}</span>
                    {extractionStatusLabel(d.status)}
                  </div>
                  <div className={styles.fileActions}>
                    <span className={styles.uploadedBadge} style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}>
                      Extracting...
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Queue (pending upload) items */}
            {queue.map((item, idx) => (
              <div
                key={`queued-${item.id || idx}`}
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