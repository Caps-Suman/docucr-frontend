import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Trash2,
  FileText,
  Calendar,
  HardDrive,
  Loader2,
  AlertCircle,
  Edit3,
  Archive,
  ArchiveRestore,
  Share,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import documentService from "../../../services/document.service";
import authService from "../../../services/auth.service";
import Toast, { ToastType } from "../../Common/Toast";
import formService, { Form } from "../../../services/form.service";
import clientService from "../../../services/client.service";
import documentTypeService from "../../../services/documentType.service";
import ConfirmModal from "../../Common/ConfirmModal";
import CommonDropdown from "../../Common/CommonDropdown";
import ShareDocumentsModal from "../ShareDocumentsModal/ShareDocumentsModal";
import PrintModal from "./PrintModal";
import EditMetadataModal from "./EditMetadataModal";
import styles from "./DocumentDetail.module.css";

interface DocumentDetailData {
  id: number;
  filename: string;
  original_filename: string;
  status_id: number;
  statusCode: string;
  status: string;
  file_size: number;
  content_type: string;
  created_at: string;
  updated_at: string;
  analysis_report_s3_key?: string;
  is_archived?: boolean;
  derived_documents?: Record<string, number>;
  extracted_documents: Array<{
    id: string;
    document_type: string | null;
    page_range: string;
    confidence: number;
    extracted_data: any;
  }>;
  unverified_documents: Array<{
    id: string;
    suspected_type: string;
    page_range: string;
    status: string;
  }>;
}

const calculatePageCount = (pageRange: string | null): number => {
  if (!pageRange) return 0;
  try {
    const parts = pageRange.split(",").map((p) => p.trim());
    let total = 0;
    parts.forEach((part) => {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          total += Math.abs(end - start) + 1;
        } else {
          total += 1;
        }
      } else if (part) {
        total += 1;
      }
    });
    return total;
  } catch (e) {
    return 0;
  }
};

const DocumentDetail: React.FC = () => {
  const wsRef = React.useRef<WebSocket | null>(null);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // Actions state
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const getBadgeClass = (index: number) => {
    const badgeNumber = index % 20;
    return `${styles.typeBadge} ${styles[`badge${badgeNumber}` as keyof typeof styles]}`;
  };
  const getDerivedDocumentCounts = () => {
  const counts: Record<string, number> = {};

  document?.extracted_documents?.forEach((doc) => {
    const key = doc.document_type || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });

  document?.unverified_documents?.forEach((doc) => {
    const key = doc.suspected_type || "Unverified";
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
};

  const fetchDocumentDetails = async () => {
    try {
      if (!id) return;
      const data = await documentService.getDocument(id);
      setDocument(data);

      // Sync re-analyzing state with status
      if (data.statusCode === "ANALYZING" || data.statusCode === "AI_QUEUED") {
        setIsReanalyzing(true);
      } else {
        setIsReanalyzing(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load document details");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    try {
      if (!id) return;
      const url = await documentService.getDocumentPreviewUrl(id);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Preview fetch failed", err);
      setError("Failed to load document preview");
    }
  };

  const setupWebSocket = () => {
    const userId = authService.getCurrentUserId();
    if (!userId) return;

    wsRef.current = documentService.createWebSocketConnection(
      userId,
      (data) => {
        if (
          data.type === "document_status_update" &&
          String(data.document_id) === String(id)
        ) {
          if (
            data.status === "COMPLETED" ||
            data.status === "AI_FAILED" ||
            data.status === "FAILED"
          ) {
            fetchDocumentDetails();
            setIsReanalyzing(false);
          }

          setDocument((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              statusCode: data.status,
              status: data.status,
            };
          });
        }
      }
    );
  };

  useEffect(() => {
    if (id) {
      fetchDocumentDetails();
      fetchPreview();
      setupWebSocket();
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (wsRef.current) wsRef.current.close();
    };
  }, [id]);

  const handleReanalyze = async () => {
    if (!id) return;
    setIsReanalyzing(true);
    try {
      await documentService.reanalyzeDocument(id);
      setToast({ message: "Re-analysis started", type: "success" });
      fetchDocumentDetails();
    } catch (err) {
      setToast({ message: "Failed to start re-analysis", type: "error" });
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await documentService.deleteDocument(id);
      setToast({ message: "Document deleted", type: "success" });
      setTimeout(() => navigate("/documents"), 1000);
    } catch (err) {
      setToast({ message: "Failed to delete document", type: "error" });
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await documentService.archiveDocument(id);
      setToast({ message: "Document archived", type: "success" });
      fetchDocumentDetails();
    } catch (err) {
      setToast({ message: "Failed to archive document", type: "error" });
    }
  };

  const handleUnarchive = async () => {
    if (!id) return;
    try {
      await documentService.unarchiveDocument(id);
      setToast({ message: "Document unarchived", type: "success" });
      fetchDocumentDetails();
    } catch (err) {
      setToast({ message: "Failed to unarchive document", type: "error" });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={32} className={styles.animateSpin} />
        <p>Loading document details...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className={styles.loadingContainer}>
        <AlertCircle size={32} color="#ef4444" />
        <p>{error || "Document not found"}</p>
        <button
          className={styles.primaryAction}
          onClick={() => navigate("/documents")}
        >
          Back to Documents
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate("/documents")}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={styles.title}>{document.filename}</h1>
            <div className={styles.metaRow}>
              <span className={styles.metaSpan}>
                <Calendar size={14} /> {formatDate(document.created_at)}
              </span>
              <span className={styles.metaSpan}>
                <HardDrive size={14} /> {formatSize(document.file_size)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <span
            className="tooltip-wrapper"
            data-tooltip={isReanalyzing ? "Re-analyzing..." : "Re-analyze"}
          >
            <button
              className={`${styles.actionButton} ${isReanalyzing ? "disabled" : ""}`}
              onClick={handleReanalyze}
              disabled={isReanalyzing}
            >
              <RefreshCw
                size={16}
                className={isReanalyzing ? styles.animateSpin : ""}
              />
            </button>
          </span>
          {/* <span className="tooltip-wrapper" data-tooltip="Print">
            <button
              className={styles.actionButton}
              onClick={() => setShowPrintModal(true)}
            >
              <Printer size={16} />
            </button>
          </span> */}
          <span className="tooltip-wrapper" data-tooltip="Share">
            <button
              className={styles.actionButton}
              onClick={() => setShowShareModal(true)}
            >
              <Share size={16} />
            </button>
          </span>
          <span className="tooltip-wrapper" data-tooltip="Download">
            <button
              className={styles.actionButton}
              onClick={async () => {
                try {
                  if (!id) return;
                  const url = await documentService.getDocumentDownloadUrl(id);
                  const link = window.document.createElement("a");
                  link.href = url;
                  link.setAttribute("download", document.original_filename);
                  window.document.body.appendChild(link);
                  link.click();
                  window.document.body.removeChild(link);
                } catch (error) {
                  setToast({
                    message: "Failed to verify download",
                    type: "error",
                  });
                }
              }}
            >
              <Download size={16} />
            </button>
          </span>
          {document.analysis_report_s3_key && (
            <span className="tooltip-wrapper" data-tooltip="Download Report">
              <button
                className={`${styles.actionButton} ${styles.primaryAction}`}
                onClick={async () => {
                  try {
                    if (!id) return;
                    const url = await documentService.getDocumentReportUrl(id);
                    const link = window.document.createElement("a");
                    link.href = url;
                    link.setAttribute(
                      "download",
                      `analysis_report_${document.filename}.xlsx`
                    );
                    window.document.body.appendChild(link);
                    link.click();
                    window.document.body.removeChild(link);
                  } catch (error) {
                    setToast({
                      message: "Failed to download report",
                      type: "error",
                    });
                  }
                }}
              >
                <FileSpreadsheet size={16} />
              </button>
            </span>
          )}
          {!document.is_archived && (
            <span className="tooltip-wrapper" data-tooltip="Archive">
              <button className={styles.actionButton} onClick={handleArchive}>
                <Archive size={16} />
              </button>
            </span>
          )}
          {document.is_archived && (
            <span className="tooltip-wrapper" data-tooltip="Unarchive">
              <button
                className={`${styles.actionButton} ${styles.primaryAction}`}
                onClick={handleUnarchive}
              >
                <ArchiveRestore size={16} />
              </button>
            </span>
          )}
          <span className="tooltip-wrapper" data-tooltip="Delete">
            <button
              className={`${styles.actionButton} ${styles.deleteAction}`}
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={16} />
            </button>
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.leftPanel}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Derived Documents</h3>
            </div>
            <div className={styles.badgeList}>
              {/* {document.extracted_documents.map((ed, index) => (
                <span key={ed.id} className={getBadgeClass(index)}>
                  {ed.document_type || "Unknown"} |{" "}
                  {calculatePageCount(ed.page_range)}{" "}
                  {calculatePageCount(ed.page_range) === 1 ? "Page" : "Pages"}
                </span>
              ))}
              {document.unverified_documents.map((ud, index) => (
                <span
                  key={ud.id}
                  className={getBadgeClass(
                    document.extracted_documents.length + index
                  )}
                >
                  {ud.suspected_type || "Unverified"} |{" "}
                  {calculatePageCount(ud.page_range)}{" "}
                  {calculatePageCount(ud.page_range) === 1 ? "Page" : "Pages"}
                </span>
              ))} */}
              {Object.entries(getDerivedDocumentCounts()).map(
  ([type, count], index) => (
    <span key={type} className={getBadgeClass(index)}>
      {type}: {count}
    </span>
  )
)}

{Object.keys(getDerivedDocumentCounts()).length === 0 && (
  <p className={styles.emptyMessage}>
    No derived documents found.
  </p>
)}

              {/* {document.extracted_documents.length === 0 &&
                document.unverified_documents.length === 0 && (
                  <p className={styles.emptyMessage}>
                    No derived documents found.
                  </p>
                )} */}
            </div>
          </div>
          {id && <MetadataCard documentId={id} />}

         {id && (
  document.analysis_report_s3_key ? (
    <ExtractedReportCard documentId={id} />
  ) : (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          <FileSpreadsheet size={18} />
          Extracted Analysis
        </h3>
      </div>

      <div className={styles.metaList}>
        {document.statusCode === "ANALYZING" || document.statusCode === "AI_QUEUED" ? (
          <p className={styles.emptyMessage}>Analysis in progress…</p>
        ) : document.statusCode === "FAILED" || document.statusCode === "AI_FAILED" ? (
          <p className={styles.emptyMessage}>Analysis failed. Try re-analyzing.</p>
        ) : (
          <p className={styles.emptyMessage}>No extracted data found.</p>
        )}
      </div>
    </div>
  )
)}

        </div>

        <div className={styles.rightPanel}>
          <div className={styles.previewHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} />
              Document Preview
            </div>
            <span
              className={`${styles.statusBadge} ${styles[document.statusCode.toLowerCase()]}`}
            >
              {document.statusCode.replace("_", " ").toLowerCase()}
            </span>
          </div>
          <div className={styles.previewContainer}>
            {previewUrl ? (
              document.content_type === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  className={styles.pdfFrame}
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  className={styles.previewImage}
                  alt="Preview"
                />
              )
            ) : (
              <div className={styles.loadingContainer}>
                <Loader2 size={24} className={styles.animateSpin} />
                <p>Loading preview...</p>
              </div>
            )}
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

      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        documentId={Number(id)}
        documentName={document.filename}
        onSuccess={() =>
          setToast({ message: "Document sent to printer", type: "success" })
        }
      />

      <ShareDocumentsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        documentIds={id ? [id] : []}
        onShare={() => {
          setToast({
            message: "Document shared successfully",
            type: "success",
          });
        }}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setShowDeleteModal(false)}
        loading={isDeleting}
        type="danger"
      />
    </div>
  );
};

const MetadataCard: React.FC<{ documentId: string }> = ({ documentId }) => {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedValues, setResolvedValues] = useState<Record<string, string>>(
    {}
  );
  const [editData, setEditData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await documentService.getDocumentFormData(documentId);
      let normalizedData = { ...res.data };
      let finalMapping: Record<string, string> = {};

      if (res.form_id) {
        const formDef = await formService.getForm(res.form_id);
        setForm(formDef);

        if (formDef.fields) {
          formDef.fields.forEach((field) => {
            const fid = field.id || "";
            const flabel = field.label || "";
            if (fid && !normalizedData[fid] && flabel && normalizedData[flabel]) {
              normalizedData[fid] = normalizedData[flabel];
            }
          });
        }

        const clientRes = await clientService.getClients(1, 100);
        const docTypeRes = await documentTypeService.getActiveDocumentTypes();

        const clientList = clientRes.clients.map((c: any) => ({
          id: c.id,
          name: c.business_name || `${c.first_name} ${c.last_name}`.trim(),
        }));
        setClients(clientList);
        setDocumentTypes(docTypeRes.map((t: any) => ({ id: t.id, name: t.name })));

        for (const field of formDef.fields || []) {
          const fieldId = field.id || "";
          const label = field.label || "";
          const val = normalizedData[fieldId] || normalizedData[label];
          if (!val) continue;

          if (label.toLowerCase() === "client") {
            const client = clientList.find(
              (c: any) => String(c.id) === String(val) || String(c.name) === String(val)
            );
            if (client) {
              finalMapping[fieldId] = client.name;
              normalizedData[fieldId] = client.id;
            }
          } else if (label.toLowerCase().includes("document type")) {
            const type = docTypeRes.find(
              (t) => String(t.id) === String(val) || String(t.name) === String(val)
            );
            if (type) {
              finalMapping[fieldId] = type.name;
              normalizedData[fieldId] = type.id;
            }
          }
        }
      }
      setResolvedValues(finalMapping);
      setData(normalizedData);
      setEditData(normalizedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [documentId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await documentService.updateDocumentFormData(documentId, editData);
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any, label?: string) => {
    setEditData((prev: any) => {
      const next = { ...prev, [fieldId]: value };
      if (label && next[label] !== undefined) delete next[label];
      return next;
    });
  };

  if (loading)
    return (
      <div className={styles.card}>
        <div className={styles.loadingContainer}>
          <Loader2 size={20} className={styles.animateSpin} />
          <span>Loading metadata...</span>
        </div>
      </div>
    );

  if (!data || Object.keys(data).length === 0) return null;

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <FileText size={18} />
            Uploaded Metadata
          </h3>
          <button
            className={styles.editButton}
            onClick={() => setShowEditModal(true)}
          >
            <Edit3 size={14} />
            Edit
          </button>
        </div>

        <div className={styles.metaList}>
          {form
            ? form.fields?.map((field) => {
              const fieldId = field.id || "";
              const label = field.label || "";
              let val = data[fieldId] ?? data[label];

              if (
                val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)
              )
                return null;

              return (
                <div key={fieldId} className={styles.summaryItem}>
                  <div className={styles.summaryKey}>
                    {field.label}
                  </div>
                  <div className={styles.summaryValue}>
                    {resolvedValues[fieldId] || (Array.isArray(val) ? val.join(", ") : String(val))}
                  </div>
                </div>
              );
            })
            : Object.entries(data).map(([key, value]) => {
              if (!value) return null;
              return (
                <div key={key} className={styles.summaryItem}>
                  <div className={styles.summaryKey}>{key}</div>
                  <div className={styles.summaryValue}>{String(value)}</div>
                </div>
              );
            })}
        </div>
      </div>

      <EditMetadataModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditData(data);
        }}
        onSave={async () => {
          await handleSave();
          setShowEditModal(false);
        }}
        form={form}
        editData={editData}
        handleFieldChange={handleFieldChange}
        isSaving={isSaving}
        clients={clients}
        documentTypes={documentTypes}
      />
    </>
  );
};

const ExtractedReportCard: React.FC<{ documentId: string }> = ({
  documentId,
}) => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(1);

  const fetchReportData = async (page: number) => {
    try {
      setLoading(true);
      const data = await documentService.getDocumentReportData(documentId, page);
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(selectedPage);
  }, [documentId, selectedPage]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loadingContainer}>
          <Loader2 size={20} className={styles.animateSpin} />
          <span>Loading extracted analysis...</span>
        </div>
      </div>
    );
  }

  // Pre-calculate rendered findings to check if we have any data to show
  const renderedFindings = !reportData?.findings ? [] : reportData.findings.map((finding: any, idx: number) => {
    let displayData = finding.extracted_data || {};

    // Flatten wrapper keys
    if (displayData.fields && !Array.isArray(displayData.fields)) {
      displayData = displayData.fields;
    }

    // Format labels (camelCase/snake_case to Title Case)
    const formatLabel = (str: string) => {
      if (!str) return "";
      return str
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, (s) => s.toUpperCase())
        .trim();
    };

    // Recursive parser for values
    const parseAndRenderValue = (val: any): any => {
      if (val === null || val === undefined || val === "" || val === "null" || val === "NULL") return null;

      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try {
          const parsed = JSON.parse(val);
          return parseAndRenderValue(parsed);
        } catch (e) { /* ignore */ }
      }

      if (Array.isArray(val)) {
        const renderedItems = val
          .map(item => parseAndRenderValue(item))
          .filter(item => item !== null);

        if (renderedItems.length === 0) return null;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {renderedItems.map((item, i) => (
              <div key={i} style={{ paddingLeft: '10px', borderLeft: '2px solid var(--color-gray-200)' }}>
                {item}
              </div>
            ))}
          </div>
        );
      }

      if (typeof val === 'object' && val !== null) {
        if (val.fieldName && val.exampleValue !== undefined) {
          if (val.exampleValue === "null" || val.exampleValue === null || val.exampleValue === "") return null;
          return (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {formatLabel(val.fieldName)}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                {String(val.exampleValue)}
              </div>
            </div>
          );
        }

        const entries = Object.entries(val).filter(([k, v]) => {
          const internal = ['type_name', 'document_type', 'confidence', 'page_range', 'fieldType', 'description'];
          if (internal.includes(k)) return false;
          const evaluated = parseAndRenderValue(v);
          return evaluated !== null;
        });

        if (entries.length === 0) return null;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {entries.map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>{formatLabel(k)}</div>
                <div>{parseAndRenderValue(v)}</div>
              </div>
            ))}
          </div>
        );
      }

      return String(val);
    };

    // If it's an array, handle it
    if (Array.isArray(displayData)) {
      const items = displayData.map(item => parseAndRenderValue(item)).filter(i => i !== null);
      if (items.length === 0) return null;

      return (
        <div key={idx} className={styles.typeItem} style={{ marginBottom: "16px" }}>
          <div className={styles.typeHeader}>
            <span className={styles.typeBadge} style={{ background: "var(--color-primary-light)", color: "var(--color-primary-dark)", border: "1px solid var(--color-primary)" }}>
              {finding.document_type}
            </span>
            <span className={styles.typePageRange}>Pages: {finding.page_range}</span>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((item, i) => <div key={i}>{item}</div>)}
          </div>
        </div>
      );
    }

    // Standard map
    const entries = Object.entries(displayData).filter(([key, value]) => {
      const internalKeys = ['type_name', 'document_type', 'confidence', 'page_range'];
      if (internalKeys.includes(key.toLowerCase())) return false;
      return parseAndRenderValue(value) !== null;
    });

    if (entries.length === 0) return null;

    return (
      <div key={idx} className={styles.typeItem} style={{ marginBottom: idx === reportData.findings.length - 1 ? 0 : "16px" }}>
        <div className={styles.typeHeader}>
          <span className={styles.typeBadge} style={{ background: "var(--color-primary-light)", color: "var(--color-primary-dark)", border: "1px solid var(--color-primary)" }}>
            {finding.document_type}
          </span>
          <span className={styles.typePageRange}>Pages: {finding.page_range}</span>
        </div>
        <div className={styles.metaList} style={{ marginTop: "12px" }}>
          {entries.map(([key, value]) => (
            <div key={key} className={styles.summaryItem} style={{ marginBottom: "12px" }}>
              <div className={styles.summaryKey}>{formatLabel(key)}</div>
              <div className={styles.summaryValue} style={{ fontSize: "14px" }}>
                {parseAndRenderValue(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }).filter((f: React.ReactNode) => f !== null);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          <FileSpreadsheet size={18} />
          Extracted Analysis
        </h3>

        {reportData && reportData.total_pages > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Page:</span> */}
            <CommonDropdown
              value={selectedPage}
              onChange={(v) => setSelectedPage(Number(v))}
              options={Array.from({ length: reportData.total_pages }, (_, i) => ({
                value: i + 1,
                label: `Page ${i + 1}`
              }))}
              size="sm"
            />
          </div>
        )}
      </div>
      <div className={styles.metaList}>
        {renderedFindings.length > 0 ? renderedFindings : (
          <p className={styles.emptyMessage}>No specific data points were extracted for this document page.</p>
        )}
      </div>
    </div>
  );
};

export default DocumentDetail;
