import apiClient from '../utils/apiClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface FormField {
  id?: string;
  field_type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: any;
  order?: number;
}

export interface Form {
  id: string;
  name: string;
  description: string | null;
  status_id: string | null;
  created_at: string;
  fields_count?: number;
  fields?: FormField[];
}

export interface FormListResponse {
  forms: Form[];
  total: number;
  page: number;
  page_size: number;
}

export interface FormCreate {
  name: string;
  description?: string;
  fields: FormField[];
}

export interface FormUpdate {
  name?: string;
  description?: string;
  status_id?: string;
  fields?: FormField[];
}

export interface FormStats {
  total_forms: number;
  active_forms: number;
  inactive_forms: number;
}

class FormService {
  async getForms(page: number = 1, pageSize: number = 10): Promise<FormListResponse> {
    const response = await apiClient(`${API_BASE_URL}/api/forms?page=${page}&page_size=${pageSize}`);

    if (!response.ok) {
      throw new Error('Failed to fetch forms');
    }

    return response.json();
  }

  async getFormStats(): Promise<FormStats> {
    const response = await apiClient(`${API_BASE_URL}/api/forms/stats`);

    if (!response.ok) {
      throw new Error('Failed to fetch form stats');
    }

    return response.json();
  }

  async getForm(formId: string): Promise<Form> {
    const response = await apiClient(`${API_BASE_URL}/api/forms/${formId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch form');
    }

    return response.json();
  }

  async createForm(data: FormCreate): Promise<Form> {
    const response = await apiClient(`${API_BASE_URL}/api/forms`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create form');
    }

    return response.json();
  }

  async updateForm(formId: string, data: FormUpdate): Promise<Form> {
    const response = await apiClient(`${API_BASE_URL}/api/forms/${formId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update form');
    }

    return response.json();
  }

  async deleteForm(formId: string): Promise<{ message: string }> {
    const response = await apiClient(`${API_BASE_URL}/api/forms/${formId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete form');
    }

    return response.json();
  }
}

const formService = new FormService();
export default formService;
