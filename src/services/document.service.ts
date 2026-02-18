import apiClient from '../utils/apiClient';
import { DocumentListItem } from "../components/Documents/DocumentList/DocumentList";
import { DocStatus } from "../components/Documents/DocumentList/DocumentList";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Document {
  id: string | number;

  filename: string;
  original_filename: string;

  client?: string | null;
  document_type?: string | null;
  medical_records?: string | null;

  uploaded_by?: string | null;
  organisation_name?: string | null;

  statusCode: string;

  file_size: number;
  upload_progress: number;
  total_pages?: number;
  error_message?: string | null;

  is_archived?: boolean | string | null;

  created_at: string;
  updated_at: string;
}


export interface DocumentUploadResponse {
    id: string;
    filename: string;
    status: string;
    file_size: number;
    upload_progress: number;
    total_pages: number; // ✅ ADD
}

class DocumentService {
normalizeDocument(doc: Document): DocumentListItem {
  const archived =
    doc.is_archived === true ||
    doc.is_archived === "true" ||
    doc.statusCode === "ARCHIVED";

  const customFormData: any = {};

  // 🔴 map to dynamic form keys
  if (doc.client) customFormData["client"] = doc.client;
  if (doc.document_type) customFormData["document_type"] = doc.document_type;
  if (doc.medical_records) customFormData["medical_records"] = doc.medical_records;

return {
  id: String(doc.id),
  name: doc.filename,
  originalFilename: doc.original_filename ?? doc.filename,
  type: doc.filename.split(".").pop()?.toUpperCase() || "FILE",

  size: (doc.file_size || 0) / (1024 * 1024),

  uploadedAt: doc.created_at,

  // 🔴 REQUIRED FIX
  uploadedBy: doc.uploaded_by || "Organisation",

  organisationName: doc.organisation_name ?? undefined,

  client: doc.client ?? undefined,
  documentType: doc.document_type ?? undefined,
  medicalRecords: doc.medical_records ?? undefined,

  customFormData,

  totalPages: doc.total_pages ?? 0,
  status: archived ? "archived" : this.mapStatus(doc.statusCode),
  progress: doc.upload_progress ?? 0,
  errorMessage: doc.error_message ?? undefined,
  isArchived: archived,
};
}


mapStatus(code: string): DocStatus {
  switch (code) {
    case "COMPLETED": return "completed";
    case "UPLOADED": return "uploaded";
    case "PROCESSING": return "processing";
    case "UPLOADING": return "uploading";
    case "QUEUED": return "queued";
    case "FAILED": return "failed";
    case "AI_QUEUED": return "ai_queued";
    case "ANALYZING": return "analyzing";
    case "AI_FAILED": return "ai_failed";
    case "UPLOAD_FAILED": return "upload_failed";
    case "CANCELLED": return "cancelled";
    case "ARCHIVED": return "archived";
    default: return "processing";
  }
}

    
    async uploadDocuments(files: File[], aiParams?: { enableAI: boolean; documentTypeId?: string; templateId?: string; formId?: string; customFormData?: any }): Promise<DocumentUploadResponse[]> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        if (aiParams) {
            formData.append('enable_ai', String(aiParams.enableAI));
            if (aiParams.documentTypeId) formData.append('document_type_id', aiParams.documentTypeId);
            if (aiParams.templateId) formData.append('template_id', aiParams.templateId);
            if (aiParams.formId) formData.append('form_id', aiParams.formId);
            if (aiParams.customFormData) formData.append('form_data', JSON.stringify(aiParams.customFormData));
        }

        const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return response.json();
    }

async getDocuments(filterParams?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  formFilters?: Record<string, any>;
  sharedOnly?: boolean;

  document_type_id?: string;
  client_id?: string;
  organisation_filter?: string;
  uploaded_by?: string;

  skip?: number;
  limit?: number;
}): Promise<{ documents: Document[]; total: number }> {

  let url = `${API_BASE_URL}/api/documents`;
  const params = new URLSearchParams();

  if (filterParams) {

    // STATUS
    if (filterParams.status) {
      params.append("status_code", filterParams.status);
    }

    // DATE
    if (filterParams.dateFrom) {
      params.append("date_from", filterParams.dateFrom);
    }

    if (filterParams.dateTo) {
      params.append("date_to", filterParams.dateTo);
    }

    // SEARCH
    if (filterParams.search) {
      params.append("search_query", filterParams.search);
    }

    // FORM FILTERS
    if (filterParams.formFilters && Object.keys(filterParams.formFilters).length) {
      params.append("form_filters", JSON.stringify(filterParams.formFilters));
    }

    // SHARED
    if (filterParams.sharedOnly) {
      params.append("shared_only", "true");
    }

    // DOCUMENT TYPE
    if (filterParams.document_type_id) {
      params.append("document_type_id", filterParams.document_type_id);
    }

    // CLIENT
    if (filterParams.client_id) {
      params.append("client_id", filterParams.client_id);
    }

    // ORG (superadmin only)
    if (filterParams.organisation_filter) {
      params.append("organisation_filter", filterParams.organisation_filter);
    }

    // UPLOADED BY
    if (filterParams.uploaded_by) {
      params.append("uploaded_by", filterParams.uploaded_by);
    }

    // PAGINATION
    if (filterParams.skip !== undefined) {
      params.append("skip", String(filterParams.skip));
    }

    if (filterParams.limit !== undefined) {
      params.append("limit", String(filterParams.limit));
    }
  }

  const query = params.toString();
  if (query) url += `?${query}`;

  const response = await apiClient(url);

  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }

  const data = await response.json();

  return {
    documents: data.documents,
    total: data.total,
  };
}
// users who uploaded docs
async getUploadedByFilter() {
  const res = await apiClient(`${API_BASE_URL}/api/documents/filters/uploaded-by`);
  if (!res.ok) throw new Error("uploaded_by filter failed");
  return res.json();
}

// organisations for superadmin
async getOrganisationFilter() {
  const res = await apiClient(`${API_BASE_URL}/api/documents/filter/organisations`);
  if (!res.ok) throw new Error("org filter failed");
  return res.json();
}

    async getStats(): Promise<{
        total: number;
        processed: number;
        processing: number;
        sharedWithMe: number;
        archived: number;
    }> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/stats`);
        if (!response.ok) {
            throw new Error('Failed to fetch document stats');
        }
        return response.json();
    }

    async getDocumentFormData(id: string): Promise<any> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/form-data`);
        if (!response.ok) {
            // It's possible there is no form data, handle gracefully or throw?
            // If 404 on the document itself, throw. If 200 with empty data, return.
            // Our backend returns {data: {}, form_id: null} if no relation, providing doc exists.
            throw new Error('Failed to fetch form data');
        }
        return response.json();
    }

    async updateDocumentFormData(id: string, data: any): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/form-data`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to update form data');
        }
    }



    async archiveDocument(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}/archive`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to archive document');
        }
    }

    async unarchiveDocument(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}/unarchive`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to unarchive document');
        }
    }

    async deleteDocument(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete document');
        }
    }
    async cancelDocumentAnalysis(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}/cancel`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to cancel analysis');
        }
    }

    async reanalyzeDocument(documentId: string): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${documentId}/reanalyze`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to start re-analysis');
        }
    }

    createWebSocketConnection(userId: string, onMessage: (data: any) => void): WebSocket {
        const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/documents/ws/${userId}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return ws;
    }

    async getDocument(id: string): Promise<any> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch document details');
        }
        return response.json();
    }

    async getDocumentPreviewUrl(id: string): Promise<string> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/preview-url`);
        if (!response.ok) {
            throw new Error('Failed to get preview URL');
        }
        const data = await response.json();
        return data.url;
    }

    async getDocumentDownloadUrl(id: string): Promise<string> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/download-url`);
        if (!response.ok) {
            throw new Error('Failed to get download URL');
        }
        const data = await response.json();
        return data.url;
    }

    async getDocumentReportUrl(id: string): Promise<string> {
        const response = await apiClient(`${API_BASE_URL}/api/documents/${id}/report-url`);
        if (!response.ok) {
            throw new Error('Failed to get report URL');
        }
        const data = await response.json();
        return data.url;
    }

    async getDocumentReportData(id: string, page?: number): Promise<any> {
        let url = `${API_BASE_URL}/api/documents/${id}/report-data`;
        if (page !== undefined) {
            url += `?page=${page}`;
        }
        const response = await apiClient(url);
        if (!response.ok) {
            throw new Error('Failed to fetch report data');
        }
        return response.json();
    }
}

const documentService = new DocumentService();
export default documentService;