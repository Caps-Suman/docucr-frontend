import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  Download,
  Trash2,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  UploadCloud,
  X,
  Loader2,
  RefreshCw,
  Ban,
  Filter,
  Archive,
  ArchiveRestore,
  Share,
  Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Loading from "../../Common/Loading";
import ConfirmModal from "../../Common/ConfirmModal";
import Toast, { ToastType } from "../../Common/Toast";
import CommonDropdown from "../../Common/CommonDropdown";
import CommonDatePicker from "../../Common/CommonDatePicker";
import documentService from "../../../services/document.service";
import authService from "../../../services/auth.service";
import documentListConfigService from "../../../services/documentListConfig.service";
import clientService, { Client } from "../../../services/client.service";
import documentTypeService, {
  DocumentType,
} from "../../../services/documentType.service";
import { useUploadStore, uploadStore } from "../../../store/uploadStore";
import ShareDocumentsModal from "../ShareDocumentsModal/ShareDocumentsModal";
import ActionLogModal from "./ActionLogModal";
import styles from "./DocumentList.module.css";
import formService from "../../../services/form.service";
import CommonPagination from "../../Common/CommonPagination";

export type DocStatus =
  | "processing"
  | "completed"
  | "failed"
  | "uploading"
  | "queued"
  | "uploaded"
  | "ai_queued"
  | "analyzing"
  | "ai_failed"
  | "upload_failed"
  | "cancelled"
  | "archived";
export interface DocumentListItem {
  id: string;
  name: string;
  originalFilename: string;
  type: string;
  size: number;
  uploadedBy?: string;
  organisationName?: string;
  client?: string;
  documentType?: string;
  medicalRecords?: string;
  uploadedAt: string;
  totalPages?: number; // ✅ ADD
  status: DocStatus;
  isUploading?: boolean;
  progress?: number;
  errorMessage?: string;
  customFormData?: any;
  isSharedWithMe?: boolean;
  isArchived?: boolean;
}

const DocumentList: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnConfig, setColumnConfig] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<DocumentListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const uploadingDocs = useUploadStore().uploadingDocs;
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const user = authService.getUser();

  const isSuperAdmin = user?.role?.name === "SUPER_ADMIN";
  const isOrgAdmin = user?.role?.name === "ORGANISATION_ROLE"; // adjust if different
  const isOrgUser =
    !isSuperAdmin &&
    !user?.is_client &&
    !!user?.organisation_id &&
    !user?.client_id;

  const isClient = user?.is_client === true && !user?.client_id;
  const isClientUser = !!user?.client_id && user?.is_client === true;

  const showUploadedByFilter =
    isSuperAdmin || isOrgAdmin || isClient;

  const showOrganisationFilter =
    isSuperAdmin;

  const showClientFilter =
    isSuperAdmin || isOrgAdmin;

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({
    status: "",
    dateFrom: null,
    dateTo: null,
    sharedOnly: false,
    uploaded_by: "",        // NEW
    organisation_filter: "", // NEW
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({
    status: "",
    dateFrom: null,
    dateTo: null,
    sharedOnly: false,
    uploaded_by: "",
    organisation_filter: "",
  });
  const [showActionLogModal, setShowActionLogModal] = useState(false);
  const [actionLogDocumentId, setActionLogDocumentId] = useState<string | null>(
    null,
  );
  const [actionLogDocumentName, setActionLogDocumentName] = useState<
    string | null
  >(null);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );
  const [uploadedByOptions, setUploadedByOptions] = useState<any[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<any[]>([]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    processing: 0,
    sharedWithMe: 0,
    archived: 0,
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [statusTooltipVisible, setStatusTooltipVisible] = useState(false);
  const [statusTooltipPos, setStatusTooltipPos] = useState({ top: 0, left: 0 });

  const activeFilterCount = Object.entries(activeFilters).filter(
    ([key, value]) => {
      if (key === "dateFrom" || key === "dateTo") {
        return value !== null;
      }
      return value !== "" && value !== null && value !== undefined;
    },
  ).length;
  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleApplyFilters = () => {
    setActiveFilters(filters);
    setCurrentPage(0);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const resetState: Record<string, any> = {
      status: "",
      dateFrom: null,
      dateTo: null,
      sharedOnly: false,

      uploaded_by: "",
      organisation_filter: "",
    };
    // Reset all dynamic form fields
    formFields.forEach((field) => {
      resetState[`form_${field.id}`] = "";
    });
    setFilters(resetState);
    setActiveFilters(resetState);
    setCurrentPage(0);
  };

  const checkScroll = () => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        tableContainerRef.current;
      // Show shadow if the table is wider than the container
      // AND we haven't scrolled all the way to the right yet.
      // Use a 5px threshold for subpixel and zoom issues.
      const hasOverflow = scrollWidth > clientWidth;
      const atTheEnd = scrollLeft + clientWidth >= scrollWidth - 5;
      setIsScrolled(hasOverflow && !atTheEnd);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("resize", checkScroll);
    };
  }, [documents, loading]);

  const handleStatClick = (type: string) => {
    const newFilters = {
      status: "",
      sharedOnly: false,
      dateFrom: null,
      dateTo: null,
    };

    switch (type) {
      case "processed":
        newFilters.status = "COMPLETED";
        break;
      case "processing":
        newFilters.status = "PROCESSING";
        break;
      case "archived":
        newFilters.status = "ARCHIVED";
        break;
      case "shared":
        newFilters.sharedOnly = true;
        break;
      case "total":
        break;
    }

    setFilters((prev) => ({ ...prev, ...newFilters }));
    setActiveFilters(newFilters);
    setCurrentPage(0);
  };

  // Load metadata on component mount and wait for it
  useEffect(() => {
    const initializeData = async () => {
      await loadMetadata();
      // loadDocuments();
    };
    initializeData();
  }, []);
  useEffect(() => {
    setupWebSocket();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [activeFilters, currentPage, pageSize]);

  // Load documents when filters change
  // useEffect(() => {
  //   if (clients.length > 0 || documentTypes.length > 0) {
  //     loadDocuments();
  //   }
  //   // setupWebSocket();

  //   return () => {
  //     if (wsRef.current) {
  //       wsRef.current.close();
  //     }
  //   };
  // }, [activeFilters, clients, documentTypes, currentPage, pageSize]);

  //   const loadMetadata = async () => {
  //     try {
  //       const [clientsRes, docTypesRes, activeFormRes] = await Promise.all([
  //         clientService.getClients(1, 1000),
  //         documentTypeService.getDocumentTypes(1, 1000),
  //         authService.getUser()?.role?.name !== "SUPER_ADMIN"
  //           ? formService.getActiveForm().catch(() => null)
  //           : Promise.resolve(null),
  //       ]);
  //       try {
  //   const uploadedRes = await documentService.getUploadedByFilter();
  //   setUploadedByOptions(uploadedRes || []);
  // } catch {}

  // const user = authService.getUser();
  // if (user?.role?.name === "SUPER_ADMIN") {
  //   try {
  //     const orgRes = await documentService.getOrganisationFilter();
  //     setOrganisationOptions(orgRes || []);
  //   } catch {}
  // }

  //       // Handle different response formats safely
  //       const clientList = Array.isArray(clientsRes)
  //         ? clientsRes
  //         : (clientsRes as any).clients || [];
  //       const typeList = Array.isArray(docTypesRes)
  //         ? docTypesRes
  //         : (docTypesRes as any).document_types || [];

  //       setClients(clientList);
  //       setDocumentTypes(typeList);

  //       if (activeFormRes && activeFormRes.fields) {
  //         setFormFields(activeFormRes.fields);
  //       }
  //     } catch (err) {
  //       console.error("Failed to load metadata for labels:", err);
  //     }
  //   };

  const loadMetadata = async () => {
    try {
      const user = authService.getUser();

      const [
        clientsRes,
        docTypesRes,
        activeForm,
        uploadedByRes,
        orgRes
      ] = await Promise.all([
        clientService.getClients(1, 1000),
        documentTypeService.getDocumentTypes(1, 1000),

        user?.role?.name !== "SUPER_ADMIN"
          ? formService.getActiveForm()
          : Promise.resolve(null),

        // 🔥 LOAD DROPDOWN DATA
        documentService.getUploadedByFilter().catch(() => []),

        user?.role?.name === "SUPER_ADMIN"
          ? documentService.getOrganisationFilter().catch(() => [])
          : Promise.resolve([])
      ]);

      // clients
      setClients(
        Array.isArray(clientsRes)
          ? clientsRes
          : clientsRes?.clients || []
      );

      // doc types
      setDocumentTypes(
        Array.isArray(docTypesRes)
          ? docTypesRes
          : docTypesRes?.document_types || []
      );

      // uploaded by
      // uploaded by
      if (showUploadedByFilter) {
        setUploadedByOptions(uploadedByRes || []);
      }

      // organisation
      if (showOrganisationFilter) {
        setOrganisationOptions(orgRes || []);
      }

      // form
      const res = await formService.getActiveForm();

      if (res?.has_active_form && res.form?.fields) {
        setFormFields(res.form.fields);
      } else {
        setFormFields([]);
      }


    } catch (err) {
      console.error("metadata load failed", err);
      setFormFields([]);
    }
  };


  // Cleanup upload store for documents that are already present in the backend list
  useEffect(() => {
    if (documents.length > 0 && uploadingDocs.length > 0) {
      const { removeUpload } = uploadStore.getState();
      uploadingDocs.forEach((uDoc: any) => {
        if (uDoc.documentId) {
          const exists = documents.find(
            (d) => String(d.id) === String(uDoc.documentId),
          );
          if (
            exists &&
            (exists.status === "uploaded" ||
              exists.status === "completed" ||
              exists.status === "processing")
          ) {
            removeUpload(uDoc.tempId);
          }
        }
      });
    }
  }, [documents, uploadingDocs]);

  const loadStats = async () => {
    try {
      const statsRes = await documentService.getStats();
      setStats(statsRes);
    } catch (error) {
      console.error("Failed to load document stats:", error);
    }
  };
  const documentTypeFilter =
    activeFilters.document_type_id ||
    activeFilters.form_document_type ||
    undefined;

  const loadDocuments = async () => {
    try {
      setLoading(true);
      await loadStats();

      // ================================
      // BUILD FILTERS CLEANLY
      // ================================
      const formFilters: Record<string, any> = {};

      let clientId: string | undefined;
      let documentTypeId: string | undefined;
      let organisationId: string | undefined;

      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") return;

        // skip non-data filters
        if (["status", "sharedOnly", "dateFrom", "dateTo"].includes(key)) return;

        // handle form fields
        if (key.startsWith("form_")) {
          const fieldId = key.replace("form_", "");
          const fieldMeta = formFields.find(f => String(f.id) === fieldId);
          console.log("FORM FIELDS:", formFields);

          if (!fieldMeta) return;

          const label = fieldMeta.label?.toLowerCase() || "";

          // client dropdown
          if (label.includes("client")) {
            clientId = value;
            return;
          }

          // document type dropdown
          if (label.includes("document type")) {
            documentTypeId = value;
            return;
          }

          // organisation dropdown
          if (label.includes("organisation")) {
            organisationId = value;
            return;
          }

          // normal form field
          formFilters[fieldId] = value;
        }
      });

      const serviceFilters = {
        status: activeFilters.status || undefined,
        sharedOnly: activeFilters.sharedOnly || undefined,

        dateFrom: activeFilters.dateFrom
          ? formatLocalDate(activeFilters.dateFrom)
          : undefined,

        dateTo: activeFilters.dateTo
          ? formatLocalDate(activeFilters.dateTo)
          : undefined,

        client_id: clientId,
        document_type_id: documentTypeId,
        organisation_id: organisationId,
        uploaded_by: activeFilters.uploaded_by || undefined,
        organisation_filter: activeFilters.organisation_filter || undefined,

        formFilters: Object.keys(formFilters).length ? formFilters : undefined,

        skip: currentPage * pageSize,
        limit: pageSize,
      };

      // ================================
      // API CALL
      // ================================
      console.log("SERVICE FILTERS >>>", serviceFilters);

      const response = await documentService.getDocuments(serviceFilters);

      const docs = response.documents || [];
      setTotalDocuments(response.total || 0);

      // ================================
      // NORMALIZE
      // ================================
      let formattedDocs = docs.map((doc: any) => {
        const normalized = documentService.normalizeDocument(doc);

        return {
          ...normalized,
          status: (normalized.status?.toLowerCase() || "processing") as DocStatus,
        };
      });

      // ================================
      // FRONTEND FILTERS (ONLY TABS)
      // ================================
      if (activeFilters.sharedOnly) {
        formattedDocs = formattedDocs.filter(d => d.isSharedWithMe);
      }

      else if (activeFilters.status === "ARCHIVED") {
        formattedDocs = formattedDocs.filter(d => d.isArchived);
      }

      else if (activeFilters.status === "COMPLETED") {
        formattedDocs = formattedDocs.filter(
          d => d.status === "completed" && !d.isArchived
        );
      }

      else if (activeFilters.status === "PROCESSING") {
        formattedDocs = formattedDocs.filter(
          d => d.status === "processing" && !d.isArchived
        );
      }

      // ================================
      // SET DOCUMENTS
      // ================================
      setDocuments(formattedDocs);

      // ================================
      // COLUMN CONFIG (UNCHANGED)
      // ================================
      try {
        const configRes = await documentListConfigService.getMyConfig();

        let sortedColumns: any[] = [];

        if (configRes.configuration) {
          sortedColumns = [...configRes.configuration.columns];
        } else {
          // Default columns if no config exists for the organisation
          sortedColumns = [
            { id: "select", label: "", visible: true, order: 0, width: 50, type: "system", required: true },
            { id: "name", label: "Name", visible: true, order: 1, width: 200, type: "system", required: true },
            { id: "client", label: "Client", visible: true, order: 2, width: 150, type: "system", required: false },
            { id: "type", label: "Type", visible: true, order: 3, width: 100, type: "system", required: false },
            { id: "pages", label: "Pages", visible: true, order: 4, width: 80, type: "number", required: false },
            { id: "size", label: "Size", visible: true, order: 5, width: 100, type: "system", required: false },
            { id: "uploadedAt", label: "Date", visible: true, order: 6, width: 150, type: "date", required: false },
            { id: "uploadedBy", label: "Uploaded By", visible: true, order: 900, width: 150, type: "system", required: false },
            { id: "organisationName", label: "Organisation", visible: true, order: 900, width: 150, type: "system", required: false },
            { id: "status", label: "Status", visible: true, order: 1000, width: 120, type: "system", required: true },
            { id: "actions", label: "Actions", visible: true, order: 1001, width: 100, type: "system", required: true },
          ];
        }

        // 1. Enforce specific order for system columns
        //    UploadedBy/Org = 900 (before status)
        //    Status = 1000
        //    Actions = 1001 (end)
        const systemOrders: Record<string, number> = {
          uploadedBy: 900,
          organisationName: 900,
          status: 1000,
          actions: 1001,
        };

        // 2. Update existing columns if they match
        sortedColumns.forEach((col: any) => {
          if (systemOrders[col.id] !== undefined) {
            col.order = systemOrders[col.id];
          }
        });

        // 3. Add missing columns (UploadedBy, Organisation) if not present
        const requiredSystemColumns = [
          { id: "uploadedBy", label: "Uploaded By" },
          { id: "organisationName", label: "Organisation" },
        ];

        requiredSystemColumns.forEach((col) => {
          if (!sortedColumns.find((c: any) => c.id === col.id)) {
            sortedColumns.push({
              id: col.id,
              label: col.label,
              isSystem: true,
              visible: true,
              order: systemOrders[col.id],
              width: 150,
              type: "system",
              required: false,
            });
          }
        });

        // 4. Sort finally
        sortedColumns.sort((a: any, b: any) => a.order - b.order);

        setColumnConfig(sortedColumns);

      } catch {
        console.log("column config failed");
      }

    } catch (err) {
      console.error("loadDocuments error", err);
    } finally {
      setLoading(false);
    }
  };


  const mapDocumentStatus = (
    statusCode: string,
  ):
    | "processing"
    | "completed"
    | "failed"
    | "uploading"
    | "queued"
    | "uploaded"
    | "ai_queued"
    | "analyzing"
    | "ai_failed"
    | "upload_failed"
    | "cancelled"
    | "archived" => {
    switch (statusCode) {
      case "COMPLETED":
        return "completed";
      case "UPLOADED":
        return "uploaded";
      case "PROCESSING":
        return "processing";
      case "UPLOADING":
        return "uploading";
      case "QUEUED":
        return "queued";
      case "FAILED":
        return "failed";
      case "AI_QUEUED":
        return "ai_queued";
      case "ANALYZING":
        return "analyzing";
      case "AI_FAILED":
        return "ai_failed";
      case "UPLOAD_FAILED":
        return "upload_failed";
      case "CANCELLED":
        return "cancelled";
      case "ARCHIVED":
        return "archived";
      default:
        return "processing";
    }
  };

  const setupWebSocket = () => {
    const user = authService.getUser();

    const userId = authService.getCurrentUserId();

    if (!userId) {
      // Fallback to existing user ID for development
      const fallbackUserId = "ae5b4fa6-44bb-45ce-beac-320bb4e21697";
      console.warn("No authenticated user ID, using fallback:", fallbackUserId);

      wsRef.current = documentService.createWebSocketConnection(
        fallbackUserId,
        (data) => {
          handleWebSocketMessage(data);
        },
      );
      return;
    }

    wsRef.current = documentService.createWebSocketConnection(
      userId,
      (data) => {
        handleWebSocketMessage(data);
      },
    );
  };

  const handleWebSocketMessage = (data: any) => {
    if (data.type === "document_status_update") {
      const status = data.status;

      // 🔥 UPDATE STATS ON STATE-CHANGING EVENTS
      if (["ARCHIVED", "UNARCHIVED", "DELETED"].includes(status)) {
        loadStats();
        loadDocuments();
      }

      const { updateUpload } = uploadStore.getState();

      // Update upload store if document exists there
      // Use String() for safe comparison of document IDs
      const uploadDoc = uploadingDocs.find(
        (doc: any) =>
          doc.documentId && String(doc.documentId) === String(data.document_id),
      );

      if (uploadDoc) {
        updateUpload(uploadDoc.tempId, {
          status: mapDocumentStatus(data.status) as any,
          progress: data.progress || 0,
        });

        // Remove from upload store if completed
        if (data.status === "UPLOADED" || data.status === "FAILED") {
          // Short timeout to allow UI update before removal
          setTimeout(() => {
            uploadStore.getState().removeUpload(uploadDoc.tempId);
            // Also refresh list to ensure we have the final backend state
            loadDocuments();
          }, 1000);
        }
      }

      setDocuments((prev) => {
        const updated = prev.map((doc) =>
          String(doc.id) === String(data.document_id)
            ? {
              ...doc,
              status: mapDocumentStatus(data.status),
              progress: data.progress,
              errorMessage: data.error_message,
            }
            : doc,
        );

        // If document not found in current list, refresh to get new documents
        const documentExists = prev.find(
          (doc) => String(doc.id) === String(data.document_id),
        );
        if (!documentExists) {
          // Delay refresh slightly to ensure backend is ready
          // setTimeout(() => loadDocuments(), 500);
        }

        return updated;
      });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await documentService.cancelDocumentAnalysis(id);
      setToast({ message: "Analysis cancelled", type: "success" });
    } catch (error) {
      console.error(error);
      setToast({ message: "Failed to cancel analysis", type: "error" });
    }
  };

  const handleActionLogClick = (document: DocumentListItem) => {
    setActionLogDocumentId(document.id);
    setActionLogDocumentName(document.originalFilename || document.name);
    setShowActionLogModal(true);
  };

  const handleArchive = async (id: string) => {
    try {
      // setDocuments((prev) =>
      //   prev.map((doc) =>
      //     doc.id === id
      //       ? { ...doc, isArchived: true, status: "archived" }
      //       : doc,
      //   ),
      // );
      await documentService.archiveDocument(id);
      await loadDocuments();
      await loadStats();

      // loadStats(); // 🔥 REQUIRED

      setToast({ message: "Document archived", type: "success" });
    } catch {
      setToast({ message: "Failed to archive document", type: "error" });
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await documentService.unarchiveDocument(id);

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? { ...doc, isArchived: false, status: "completed" }
            : doc,
        ),
      );

      loadStats(); // 🔥 REQUIRED

      setToast({ message: "Document unarchived", type: "success" });
    } catch {
      setToast({ message: "Failed to unarchive document", type: "error" });
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocuments.size === 0) return;

    setIsDownloading(true);
    try {
      console.log(
        "Starting bulk download for",
        selectedDocuments.size,
        "documents",
      );

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const selectedDocs = documents.filter((doc) =>
        selectedDocuments.has(doc.id),
      );
      // console.log('Selected documents:', selectedDocs.map(d => d.name));

      // Download all files and add to ZIP
      for (const doc of selectedDocs) {
        try {
          console.log("Processing document:", doc.name);

          // Create folder for each document
          const folderName = `${doc.name.replace(/\.[^/.]+$/, "")}_${doc.id}`;
          const docFolder = zip.folder(folderName);

          // Download main document
          const docUrl = await documentService.getDocumentDownloadUrl(doc.id);
          const docResponse = await fetch(docUrl);

          if (docResponse.ok) {
            const docBlob = await docResponse.blob();
            docFolder?.file(doc.originalFilename || doc.name, docBlob);
            console.log("Added document to folder:", doc.name);
          }

          // Try to download report file
          try {
            const reportUrl = await documentService.getDocumentReportUrl(
              doc.id,
            );
            const reportResponse = await fetch(reportUrl);

            if (reportResponse.ok) {
              const reportBlob = await reportResponse.blob();
              const reportFileName = `analysis_report_${doc.name.replace(/\.[^/.]+$/, "")}.xlsx`;
              docFolder?.file(reportFileName, reportBlob);
              console.log("Added report to folder:", reportFileName);
            }
          } catch (reportError) {
            console.log("No report available for:", doc.name);
          }
        } catch (error) {
          console.error(`Failed to process ${doc.name}:`, error);
        }
      }

      console.log("Generating ZIP...");
      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      console.log("ZIP generated, size:", zipBlob.size);

      const zipUrl = URL.createObjectURL(zipBlob);

      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `docucr_docs_${new Date().toISOString().split("T")[0]}.zip`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(zipUrl);

      setToast({
        message: `Downloaded ${selectedDocuments.size} documents as ZIP`,
        type: "success",
      });
      setSelectedDocuments(new Set());
    } catch (error) {
      console.error("Bulk download error:", error);
      setToast({
        message:
          "Failed to create ZIP file: " +
          (error instanceof Error ? error.message : "Unknown error"),
        type: "error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReanalyze = async (id: string) => {
    try {
      await documentService.reanalyzeDocument(id);
      setToast({ message: "Analysis restarted", type: "success" });
    } catch (error) {
      console.error(error);
      setToast({ message: "Failed to restart analysis", type: "error" });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = documents
        .filter((doc) => !doc.isUploading)
        .map((doc) => doc.id);
      setSelectedDocuments(new Set(allIds));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleSelectDocument = (docId: string, checked: boolean) => {
    const newSelected = new Set(selectedDocuments);
    if (checked) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleDeleteClick = (document: DocumentListItem) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (documentToDelete) {
      setDeleting(true);
      try {
        await documentService.deleteDocument(documentToDelete.id);
        setDocuments((prev) =>
          prev.filter((doc) => doc.id !== documentToDelete.id),
        );
        loadStats(); // 🔥 REQUIRED
        setShowDeleteModal(false);
        setDocumentToDelete(null);
        setToast({ message: "Document deleted successfully", type: "success" });
      } catch (error) {
        console.error("Failed to delete document:", error);
        setToast({ message: "Failed to delete document", type: "error" });
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    if (!deleting) {
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    }
  };

  const columns = React.useMemo(() => {
    if (columnConfig.length === 0) return [];

    const systemIds = [
      "select",
      "name",
      "client",
      "documentType",
      "medicalRecords",
      "type",
      "uploadedBy",
      "organisationName",
      "size",
      "pages",
      "uploadedAt",
      "status",
      "actions",
    ];

    console.log(authService.getUser());

    const baseColumns = [
      {
        key: "select",
        header: (
          <input
            type="checkbox"
            checked={
              documents.filter((d) => !d.isUploading).length > 0 &&
              documents
                .filter((d) => !d.isUploading)
                .every((d) => selectedDocuments.has(d.id))
            }
            onChange={(e) => handleSelectAll(e.target.checked)}
            className={styles.checkbox}
          />
        ),
        render: (_: any, row: DocumentListItem) =>
          row.isUploading ? null : (
            <input
              type="checkbox"
              checked={selectedDocuments.has(row.id)}
              onChange={(e) => handleSelectDocument(row.id, e.target.checked)}
              className={styles.checkbox}
            />
          ),
        isSystem: true,
      },
    ];

    return [
      ...baseColumns,
      ...columnConfig
        .filter((col) => {
          if (!col.visible || col.id === 'select') return false;
          if (col.id === 'organisationName') {
            const user = authService.getUser();
            return user?.role?.name === "SUPER_ADMIN";
          }
          return true;
        })
        .map((col) => {
          const isSystem = col.isSystem || systemIds.includes(col.id);
          if (isSystem) {
            switch (col.id) {
              case "name":
                return {
                  key: "name",
                  header: col.label,
                  render: (value: string, row: DocumentListItem) => (
                    <span
                      className={styles.tooltipWrapper}
                      data-tooltip={value}
                    >
                      <div
                        className={styles.documentName}
                        style={{ maxWidth: "100%", overflow: "hidden" }}
                      >
                        <FileText size={16} style={{ flexShrink: 0 }} />
                        <span className={styles.cellContent}>{value}</span>
                      </div>
                    </span>
                  ),
                };
              case "type":
                return {
                  key: "type",
                  header: col.label,
                  render: (value: string) => (
                    <span
                      className={styles.tooltipWrapper}
                      data-tooltip={value}
                    >
                      <span className={styles.documentType}>{value}</span>
                    </span>
                  ),
                };
              case "uploadedBy":
                return {
                  key: "uploadedBy",
                  header: col.label,
                  render: (value: string) => <span>{value || "-"}</span>,
                };
              case "client":
                return {
                  key: "client",
                  header: col.label,
                  render: (value: string) => <span>{value || "-"}</span>,
                };

              case "documentType":
                return {
                  key: "documentType",
                  header: col.label,
                  render: (value: string) => <span>{value || "-"}</span>,
                };

              case "medicalRecords":
                return {
                  key: "medicalRecords",
                  header: col.label,
                  render: (value: string) => <span>{value || "-"}</span>,
                };

              case "organisationName":
                return {
                  key: "organisationName",
                  header: col.label,
                  render: (value: string) => <span>{value || "-"}</span>,
                };

              case "size":
                return {
                  key: "size",
                  header: col.label,
                  render: (value: number) => {
                    const sizeText = `${value.toFixed(2)} MB`;
                    return (
                      <span
                        className={styles.tooltipWrapper}
                        data-tooltip={sizeText}
                      >
                        <span className={styles.cellContent}>{sizeText}</span>
                      </span>
                    );
                  },
                };
              case "pages":
                return {
                  key: "pages",
                  header: col.label,
                  render: (_: any, row: DocumentListItem) => (
                    <span>{row.totalPages ?? "-"}</span>
                  ),
                };

              case "uploadedAt":
                return {
                  key: "uploadedAt",
                  header: col.label,
                  render: (value: string) => {
                    const dateText = new Date(value).toLocaleDateString();
                    const fullDate = new Date(value).toLocaleString();
                    return (
                      <span
                        className={styles.tooltipWrapper}
                        data-tooltip={fullDate}
                      >
                        <span className={styles.cellContent}>{dateText}</span>
                      </span>
                    );
                  },
                };
              case "status":
                return {
                  key: "status",
                  header: (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {col.label}
                      <span
                        className={styles.statusTooltipWrapper}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setStatusTooltipPos({
                            top: rect.bottom,
                            left: rect.left + rect.width / 2,
                          });
                          setStatusTooltipVisible(true);
                        }}
                        onMouseLeave={() => setStatusTooltipVisible(false)}
                      >
                        <Info
                          size={14}
                          style={{ cursor: "help", color: "#64748b" }}
                        />
                      </span>
                    </div>
                  ),
                  render: (value: string, row: DocumentListItem) => {
                    const getStatusConfig = (status: string) => {
                      switch (status) {
                        case "completed":
                          return {
                            class: "active",
                            icon: <CheckCircle size={12} />,
                            text: "Completed",
                          };
                        case "queued":
                          return {
                            class: "inactive",
                            icon: <Clock size={12} />,
                            text: "Queued",
                          };
                        case "uploading":
                          const progressText = row.progress
                            ? `Uploading (${row.progress}%)`
                            : "Uploading";
                          return {
                            class: "inactive",
                            icon: <UploadCloud size={12} />,
                            text: progressText,
                          };
                        case "uploaded":
                          return {
                            class: "active",
                            icon: <CheckCircle size={12} />,
                            text: "Uploaded",
                          };
                        case "processing":
                          return {
                            class: "inactive",
                            icon: <Clock size={12} />,
                            text: "Processing",
                          };
                        case "upload_failed":
                          return {
                            class: "error",
                            icon: <X size={12} />,
                            text: (
                              <span
                                className={`${styles.tooltipWrapper} tooltip-bottom`}
                                data-tooltip={
                                  row.errorMessage || "Upload failed"
                                }
                              >
                                Upload Failed
                              </span>
                            ),
                          };
                        case "ai_queued":
                          return {
                            class: "inactive",
                            icon: <Clock size={12} />,
                            text: "AI Queued",
                          };
                        case "analyzing":
                          return {
                            class: "processing",
                            icon: (
                              <Loader2
                                size={12}
                                className={styles.animateSpin}
                              />
                            ),
                            text: row.errorMessage || "Analyzing...",
                          };
                        case "ai_failed":
                          return {
                            class: "error",
                            icon: <X size={12} />,
                            text: (
                              <span
                                className={`${styles.tooltipWrapper} tooltip-bottom`}
                                data-tooltip={
                                  row.errorMessage || "Analysis failed"
                                }
                              >
                                Analysis Failed
                              </span>
                            ),
                          };
                        case "cancelled":
                          return {
                            class: "inactive",
                            icon: <Ban size={12} />,
                            text: "Cancelled",
                          };
                        case "archived":
                          return {
                            class: "inactive",
                            icon: <Archive size={12} />,
                            text: "Archived",
                          };
                        case "failed":
                          return {
                            class: "error",
                            icon: <X size={12} />,
                            text: (
                              <span
                                className={`${styles.tooltipWrapper} tooltip-bottom`}
                                data-tooltip={
                                  row.errorMessage || "Unknown error"
                                }
                              >
                                Failed
                              </span>
                            ),
                          };
                        default:
                          return {
                            class: "inactive",
                            icon: <Clock size={12} />,
                            text: status,
                          };
                      }
                    };

                    const config = getStatusConfig(value);
                    return (
                      <span
                        className={`status-badge ${config.class}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {config.icon}
                        {config.text}
                      </span>
                    );
                  },
                };
              case "actions":
                return {
                  key: "actions",
                  header: col.label,
                  render: (_: any, row: DocumentListItem) => (
                    <div style={{ display: "flex", gap: "8px" }}>

                      {(row.status === "analyzing" ||
                        row.status === "ai_queued") && (
                          <span
                            className={styles.tooltipWrapper}
                            data-tooltip="Cancel Analysis"
                          >
                            <button
                              onClick={() => handleCancel(row.id)}
                              className="action-btn delete"
                            >
                              <Ban size={14} />
                            </button>
                          </span>
                        )}

                      {!row.isUploading && (
                        <>
                          <span
                            className={styles.tooltipWrapper}
                            data-tooltip={
                              row.status === "queued" ||
                                row.status === "uploading" ||
                                row.status === "upload_failed"
                                ? "Upload in progress or failed"
                                : "View Details"
                            }
                          >
                            <button
                              className={`action-btn edit ${row.status === "queued" || row.status === "uploading" || row.status === "upload_failed" ? "disabled" : ""}`}
                              onClick={() => {
                                if (
                                  row.status !== "queued" &&
                                  row.status !== "uploading" &&
                                  row.status !== "upload_failed"
                                ) {
                                  navigate(`/documents/${row.id}`);
                                }
                              }}
                              disabled={
                                row.status === "queued" ||
                                row.status === "uploading" ||
                                row.status === "upload_failed"
                              }
                            >
                              <Eye size={14} />
                            </button>
                          </span>
                          <span
                            className={styles.tooltipWrapper}
                            data-tooltip="Download"
                          >
                            <button
                              className="action-btn activate"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const url =
                                    await documentService.getDocumentDownloadUrl(
                                      row.id,
                                    );
                                  const link =
                                    window.document.createElement("a");
                                  link.href = url;
                                  link.setAttribute(
                                    "download",
                                    row.originalFilename || row.name,
                                  );
                                  link.setAttribute("target", "_blank");
                                  link.setAttribute(
                                    "rel",
                                    "noopener noreferrer",
                                  );
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
                              <Download size={14} />
                            </button>
                          </span>
                          {!row.isArchived && (
                            <span
                              className={styles.tooltipWrapper}
                              data-tooltip="Archive"
                            >
                              <button
                                className="action-btn"
                                onClick={() => handleArchive(row.id)}
                              >
                                <Archive size={14} />
                              </button>
                            </span>
                          )}
                          {row.isArchived && (
                            <span
                              className={styles.tooltipWrapper}
                              data-tooltip="Unarchive"
                            >
                              <button
                                className="action-btn activate"
                                onClick={() => handleUnarchive(row.id)}
                              >
                                <ArchiveRestore size={14} />
                              </button>
                            </span>
                          )}
                          <span
                            className={styles.tooltipWrapper}
                            data-tooltip="Delete"
                          >
                            <button
                              className="action-btn delete"
                              onClick={() => handleDeleteClick(row)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>

                          {(row.status === "failed" ||
                            row.status === "ai_failed" ||
                            row.status === "upload_failed" ||
                            row.status === "cancelled") && (
                              <span
                                className={styles.tooltipWrapper}
                                data-tooltip="Retry Analysis"
                              >
                                <button
                                  onClick={() => handleReanalyze(row.id)}
                                  className="action-btn activate"
                                >
                                  <RefreshCw size={14} />
                                </button>
                              </span>
                            )}

                          {/* for action-log view */}
                          <span
                            className={styles.tooltipWrapper}
                            data-tooltip="View Log"
                          >
                            <button
                              className="action-btn view-log"
                              onClick={() => handleActionLogClick(row)}
                            >
                              <FileText size={14} />
                            </button>
                          </span>
                        </>
                      )}
                      {row.isUploading && (
                        <span
                          className={styles.tooltipWrapper}
                          data-tooltip="Uploading..."
                        >
                          <button className="action-btn" disabled>
                            <Clock size={14} />
                          </button>
                        </span>
                      )}
                    </div>
                  ),
                };
              default:
                return { key: col.id, header: col.label };
            }
          } else {
            // Custom Form Field
            const formFieldId = col.id.replace("form_", "");
            return {
              key: col.id,
              header: col.label,
              render: (_: any, row: DocumentListItem) => {
                const data = row.customFormData || {};

                // Strategy 1: Direct lookup by column ID (stripped of form_ prefix)
                let val =
                  data[formFieldId] ??
                  data[col.label] ??
                  data[col.label?.toLowerCase().replace(" ", "_")];

                // Strategy 2: Lookup by column label (handles cases where keys are labels)
                if (!val && col.label) {
                  val = data[col.label];
                }

                // Strategy 3: Lookup by actual field metadata (handles ID mismatch in config)
                if (!val && formFields.length > 0) {
                  const fieldMetadata = formFields.find(
                    (f) =>
                      f.id === formFieldId ||
                      f.label === col.label ||
                      (f.label &&
                        col.label &&
                        f.label.toLowerCase() === col.label.toLowerCase()),
                  );
                  if (fieldMetadata) {
                    val = data[fieldMetadata.id] || data[fieldMetadata.label];
                  }
                }

                if (!val) return <span style={{ color: "#94a3b8" }}>-</span>;

                // Better matching for system fields
                const normalizedLabel = col.label.trim().toLowerCase();
                const formField = formFields.find((f) => f.id === formFieldId);

                // Check if this is a client or document type field by UUID pattern and field name
                const isUuidPattern =
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    String(val),
                  );
                const isClientField =
                  normalizedLabel.includes("client") ||
                  (formField &&
                    formField.label &&
                    formField.label.toLowerCase().includes("client"));
                const isDocTypeField =
                  normalizedLabel.includes("document type") ||
                  normalizedLabel.includes("doc type") ||
                  (formField &&
                    formField.label &&
                    formField.label.toLowerCase().includes("document type"));
                const isSystemField =
                  isClientField || isDocTypeField || formField?.is_system;

                if (isSystemField && isUuidPattern) {
                  // Handle Client resolution
                  if (isClientField) {
                    if (clients.length === 0)
                      return (
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                          Loading clients...
                        </span>
                      );
                    const client = clients.find(
                      (c) => String(c.id) === String(val),
                    );
                    const clientName = client
                      ? client.business_name ||
                      `${client.first_name} ${client.last_name}`.trim()
                      : `Unknown Client (${String(val).substring(0, 8)}...)`;
                    return (
                      <span
                        className={styles.tooltipWrapper}
                        data-tooltip={clientName}
                      >
                        <span className={styles.cellContent}>{clientName}</span>
                      </span>
                    );
                  }

                  // Handle Document Type resolution
                  if (isDocTypeField) {
                    if (documentTypes.length === 0)
                      return (
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                          Loading types...
                        </span>
                      );
                    const type = documentTypes.find(
                      (t) => String(t.id) === String(val),
                    );
                    const typeName = type
                      ? type.name
                      : `Unknown Type (${String(val).substring(0, 8)}...)`;
                    return (
                      <span
                        className={styles.tooltipWrapper}
                        data-tooltip={typeName}
                      >
                        <span className={styles.cellContent}>{typeName}</span>
                      </span>
                    );
                  }
                }

                const displayValue = Array.isArray(val)
                  ? val.join(", ")
                  : String(val);
                return (
                  <span
                    className={styles.tooltipWrapper}
                    data-tooltip={displayValue}
                  >
                    <span className={styles.cellContent}>{displayValue}</span>
                  </span>
                );
              },
            };
          }
        }),
    ];
  }, [
    columnConfig,
    navigate,
    clients,
    documentTypes,
    formFields,
    loading,
    selectedDocuments,
    documents,
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <div
          className={`${styles.statCard} ${!activeFilters.status && !activeFilters.sharedOnly ? styles.activeTotal : ""}`}
          onClick={() => handleStatClick("total")}
        >
          <div className={`${styles.statIcon} ${styles.iconTotal}`}>
            <FileText size={16} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total Documents</span>
          </div>
        </div>
        <div
          className={`${styles.statCard} ${activeFilters.status === "COMPLETED" ? styles.activeProcessed : ""}`}
          onClick={() => handleStatClick("processed")}
        >
          <div className={`${styles.statIcon} ${styles.iconProcessed}`}>
            <CheckCircle size={16} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.processed}</span>
            <span className={styles.statLabel}>Processed</span>
          </div>
        </div>
        <div
          className={`${styles.statCard} ${activeFilters.status === "PROCESSING" ? styles.activeProcessing : ""}`}
          onClick={() => handleStatClick("processing")}
        >
          <div className={`${styles.statIcon} ${styles.iconProcessing}`}>
            <Clock size={16} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.processing}</span>
            <span className={styles.statLabel}>Processing</span>
          </div>
        </div>
        <div
          className={`${styles.statCard} ${activeFilters.sharedOnly ? styles.activeShared : ""}`}
          onClick={() => handleStatClick("shared")}
        >
          <div className={`${styles.statIcon} ${styles.iconShared}`}>
            <Share size={16} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.sharedWithMe}</span>
            <span className={styles.statLabel}>Shared with Me</span>
          </div>
        </div>
        <div
          className={`${styles.statCard} ${activeFilters.status === "ARCHIVED" ? styles.activeArchived : ""}`}
          onClick={() => handleStatClick("archived")}
        >
          <div className={`${styles.statIcon} ${styles.iconArchived}`}>
            <Archive size={16} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.archived}</span>
            <span className={styles.statLabel}>Archived</span>
          </div>
        </div>
      </div>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            <FileText size={20} />
            Documents
          </h1>
          <div className={styles.headerButtons}>
            <button
              className={styles.filterButton}
              onClick={() => setShowFilters(true)}
            >
              <Filter size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className={styles.filterBadge}>{activeFilterCount}</span>
              )}
            </button>
            {selectedDocuments.size > 0 && (
              <>
                <button
                  className={styles.shareButton}
                  onClick={() => setShowShareModal(true)}
                >
                  <Share size={16} />
                  Share ({selectedDocuments.size})
                </button>
                <button
                  className={styles.downloadButton}
                  onClick={handleBulkDownload}
                  disabled={isDownloading}
                >
                  <Download size={16} />
                  {isDownloading
                    ? "Downloading..."
                    : `Download ZIP (${selectedDocuments.size})`}
                </button>
              </>
            )}
            <button
              className={styles.uploadButton}
              onClick={() => navigate("/documents/upload")}
            >
              <Upload size={16} />
              Upload Document
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "48px" }}
        >
          <Loading />
        </div>
      ) : documents.length === 0 && uploadingDocs.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={48} />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div
          ref={tableContainerRef}
          className={`${styles.tableContainer} ${isScrolled ? styles.hasScrollShadow : ""}`}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((column: any) => (
                  <th
                    key={column.key}
                    className={
                      column.key === "status"
                        ? `${styles.stickyCol} ${styles.stickyStatus}`
                        : column.key === "actions"
                          ? `${styles.stickyCol} ${styles.stickyActions}`
                          : ""
                    }
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const uploading = uploadingDocs
                  .filter(
                    (doc: any) =>
                      !documents.find(
                        (d) => String(d.id) === String(doc.documentId),
                      ),
                  )
                  .map((doc: any) => ({
                    id: doc.tempId,
                    name: doc.filename,
                    originalFilename: doc.filename,
                    type:
                      doc.filename.split(".").pop()?.toUpperCase() || "FILE",
                    size: doc.fileSize / (1024 * 1024),
                    uploadedAt: doc.createdAt,
                    status: doc.status,
                    isUploading: true,
                    progress: doc.progress,
                  }));

                const combined = [...uploading, ...documents];
                const uniqueMap = new Map();
                combined.forEach((item) => {
                  uniqueMap.set(item.id, item);
                });

                const finalData = Array.from(uniqueMap.values());
                // Use finalData directly since filtering is now done on backend
                const filteredData = finalData;

                return filteredData.map((row: any, index: number) => (
                  <tr key={row.id || index}>
                    {columns.map((column: any) => (
                      <td
                        key={column.key}
                        className={
                          column.key === "status"
                            ? `${styles.stickyCol} ${styles.stickyStatus}`
                            : column.key === "actions"
                              ? `${styles.stickyCol} ${styles.stickyActions}`
                              : ""
                        }
                      >
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}

      <CommonPagination
        show={totalDocuments > 0}
        pageCount={Math.ceil(totalDocuments / pageSize)}
        currentPage={currentPage}
        onPageChange={({ selected }) => setCurrentPage(selected)}
        totalItems={totalDocuments}
        itemsPerPage={pageSize}
        onItemsPerPageChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(0);
        }}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onClose={handleDeleteCancel}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={deleting}
      />

      <ActionLogModal
        isOpen={showActionLogModal}
        onClose={() => setShowActionLogModal(false)}
        documentId={actionLogDocumentId}
        documentName={actionLogDocumentName}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ShareDocumentsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        documentIds={Array.from(selectedDocuments)}
        onShare={() => {
          setToast({
            message: "Documents shared successfully",
            type: "success",
          });
          setSelectedDocuments(new Set());
        }}
      />

      {/* Filter Offcanvas */}
      <div
        className={`${styles.offcanvas} ${showFilters ? styles.offcanvasOpen : ""}`}
      >
        <div
          className={styles.offcanvasOverlay}
          onClick={() => setShowFilters(false)}
        />
        <div className={styles.offcanvasContent}>
          <div className={styles.offcanvasHeader}>
            <h3>Filters</h3>
            <button
              className={styles.closeButton}
              onClick={() => setShowFilters(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className={styles.offcanvasBody}>
            <div className={styles.filterGroup}>
              <label>Status</label>
              <CommonDropdown
                value={filters.status}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "completed", label: "Completed" },
                  { value: "uploaded", label: "Uploaded" },
                  { value: "processing", label: "Processing" },
                  { value: "uploading", label: "Uploading" },
                  { value: "queued", label: "Queued" },
                  { value: "ai_queued", label: "AI Queued" },
                  { value: "analyzing", label: "Analyzing" },
                  { value: "failed", label: "Failed" },
                  { value: "ai_failed", label: "AI Failed" },
                  { value: "upload_failed", label: "Upload Failed" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "archived", label: "Archived" },
                ]}
                size="md"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={filters.sharedOnly}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sharedOnly: e.target.checked,
                    }))
                  }
                />
                <span style={{ marginLeft: "8px" }}>Shared with Me Only</span>
              </label>
            </div>
            <div className={styles.filterGroup}>
              <div className={styles.dateRow}>
                <div className={styles.dateField}>
                  <label>From</label>
                  <CommonDatePicker
                    selected={filters.dateFrom}
                    onChange={(date: Date | null) =>
                      setFilters((prev) => ({ ...prev, dateFrom: date }))
                    }
                    className={styles.filterInput}
                    placeholderText="Select from date"
                  />
                </div>
                <div className={styles.dateField}>
                  <label>To</label>
                  <CommonDatePicker
                    selected={filters.dateTo}
                    onChange={(date: Date | null) =>
                      setFilters((prev) => ({ ...prev, dateTo: date }))
                    }
                    className={styles.filterInput}
                    placeholderText="Select to date"
                    minDate={filters.dateFrom}
                  />
                </div>
              </div>
            </div>
            {showOrganisationFilter && (
              <div className={styles.filterGroup}>
                <label>Organisation</label>
                <CommonDropdown
                  value={filters.organisation_filter || ""}
                  onChange={(value) => {
                    setFilters((prev) => ({ ...prev, organisation_filter: value }));
                    setActiveFilters((prev) => ({ ...prev, organisation_filter: value }));
                    setCurrentPage(0);
                  }}
                  options={[
                    { value: "", label: "All Organisations" },
                    ...organisationOptions.map((o) => ({
                      value: o.id,
                      label: o.name,
                    })),
                  ]}
                  size="md"
                />
              </div>
            )}
            {showUploadedByFilter && (
              <div className={styles.filterGroup}>
                <label>Uploaded By</label>
                <CommonDropdown
                  value={filters.uploaded_by || ""}
                  onChange={(value) => {
                    setFilters((prev) => ({ ...prev, uploaded_by: value }));
                    setActiveFilters((prev) => ({ ...prev, uploaded_by: value }));
                    setCurrentPage(0);
                  }}
                  options={[
                    { value: "", label: "All Users" },
                    ...uploadedByOptions.map((u) => ({
                      value: u.id,
                      label: u.name,
                    })),
                  ]}
                  size="md"
                />
              </div>
            )}

            {/* Dynamic Form Field Filters */}
            {formFields.map((field) => {
              const isClientField =
                field.field_type === "client_dropdown" ||
                field.label.toLowerCase().includes("client");
              const isDocTypeField =
                field.field_type === "document_type_dropdown" ||
                field.label.toLowerCase().includes("document type");
              const isDateField = field.field_type === "date";
              const isDropdown =
                field.field_type === "select" ||
                field.field_type === "dropdown" ||
                isClientField ||
                isDocTypeField;
              const filterKey = `form_${field.id}`;

              let options: Array<{ value: string; label: string }> = [];

              if (isClientField) {
                options = clients.map((c) => ({
                  value: c.id,
                  label: c.business_name || `${c.first_name} ${c.last_name}`,
                }));
              } else if (isDocTypeField) {
                options = documentTypes.map((t) => ({
                  value: t.id,
                  label: t.name,
                }));
              } else if (isDropdown && field.options) {
                options = (field.options || []).map((opt: any) => {
                  if (typeof opt === "string") {
                    return { value: opt, label: opt };
                  }
                  return { value: opt.value || opt, label: opt.label || opt };
                });
              }

              return (
                <div className={styles.filterGroup} key={filterKey}>
                  <label>{field.label}</label>

                  {isDateField ? (
                    <CommonDatePicker
                      selected={
                        filters[filterKey] &&
                          typeof filters[filterKey] === "string"
                          ? new Date(filters[filterKey])
                          : filters[filterKey]
                      }
                      onChange={(date: Date | null) =>
                        setFilters((prev) => ({ ...prev, [filterKey]: date }))
                      }
                      className={styles.filterInput}
                      placeholderText={`Select ${field.label.toLowerCase()}`}
                      dateOnly={true}
                    />
                  ) : isDropdown ? (
                    <CommonDropdown
                      value={filters[filterKey] || ""}
                      onChange={(value) =>
                        setFilters((prev) => ({ ...prev, [filterKey]: value }))
                      }
                      options={[
                        { value: "", label: `All ${field.label}s` },
                        ...options,
                      ]}
                      size="md"
                    />
                  ) : (
                    <input
                      type="text"
                      className={styles.filterInput}
                      value={filters[filterKey] || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          [filterKey]: e.target.value,
                        }))
                      }
                      placeholder={`Filter by ${field.label}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.offcanvasFooter}>
            <button className={styles.resetButton} onClick={handleResetFilters}>
              Reset
            </button>
            <button className={styles.applyButton} onClick={handleApplyFilters}>
              Apply Filters
            </button>
          </div>
        </div>
      </div>
      {statusTooltipVisible &&
        createPortal(
          <div
            className={styles.statusTooltip}
            style={{
              position: "fixed",
              top: statusTooltipPos.top,
              left: statusTooltipPos.left,
              transform: "translateX(-50%)",
              opacity: 1,
              visibility: "visible",
              pointerEvents: "none",
              zIndex: 9999,
            }}
          >
            <div className={styles.statusTooltipItem}>
              <Clock size={12} /> Queued: Waiting to start
            </div>
            <div
              className={styles.statusTooltipItem}
              style={{ justifyContent: "center", padding: "2px 0" }}
            >
              ↓
            </div>
            <div className={styles.statusTooltipItem}>
              <UploadCloud size={12} /> Uploading: File transfer
            </div>
            <div
              className={styles.statusTooltipItem}
              style={{ justifyContent: "center", padding: "2px 0" }}
            >
              ↓
            </div>
            <div className={styles.statusTooltipItem}>
              <CheckCircle size={12} /> Uploaded: File ready for AI
            </div>
            <div
              className={styles.statusTooltipItem}
              style={{ justifyContent: "center", padding: "2px 0" }}
            >
              ↓
            </div>
            <div className={styles.statusTooltipItem}>
              <Clock size={12} /> Processing: Being analyzed
            </div>
            <div
              className={styles.statusTooltipItem}
              style={{ justifyContent: "center", padding: "2px 0" }}
            >
              ↓
            </div>
            <div className={styles.statusTooltipItem}>
              <Clock size={12} /> AI Queued: Waiting for AI
            </div>
            <div
              className={styles.statusTooltipItem}
              style={{ justifyContent: "center", padding: "2px 0" }}
            >
              ↓
            </div>
            <div className={styles.statusTooltipItem}>
              <Loader2 size={12} /> Analyzing: AI processing
            </div>
            <div
              className={styles.statusTooltipItem}
              style={{ justifyContent: "center", padding: "2px 0" }}
            >
              ↓
            </div>
            <div className={styles.statusTooltipItem}>
              <CheckCircle size={12} /> Completed: Finished analysis
            </div>
            <div
              className={styles.statusTooltipItem}
              style={{
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              Error States:
            </div>
            <div className={styles.statusTooltipItem}>
              <X size={12} /> Upload Failed: Network error
            </div>
            <div className={styles.statusTooltipItem}>
              <X size={12} /> Failed: General error
            </div>
            <div className={styles.statusTooltipItem}>
              <X size={12} /> AI Failed: Analysis error
            </div>
            <div className={styles.statusTooltipItem}>
              <Ban size={12} /> Cancelled: Manually stopped
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default DocumentList;
