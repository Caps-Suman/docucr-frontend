import apiClient from '../utils/apiClient';
import { BillingGuideline, CodingRule, CodingRuleCPT, CodingRuleICD, SOP } from '../types/sop';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

type RawBillingGuideline =
  | string
  | {
      id?: string;

      // ✅ NEW backend schema
      category?: string;
      rules?: {
        id?: string;
        description?: string;
      }[];

      // 🔁 Legacy / AI schema
      title?: string;
      description?: string | { title?: string; description?: string };
    };

// Helper to map backend snake_case to frontend camelCase
const mapExampleToSOP = (data: any): SOP => ({
  id: data.id,
  title: data.title,
  category: data.category,

  providerType: data.provider_type,
  clientId: data.client_id,

  providerInfo: data.provider_info || {},

  workflowProcess: {
    description: data.workflow_process?.description || data.workflow_process?.superbill_source || '',
    eligibilityPortals: data.workflow_process?.eligibilityPortals || data.workflow_process?.eligibility_verification_portals || []
  },

  billingGuidelines: normalizeBillingGuidelines(data.billing_guidelines),
  codingRulesCPT: data.coding_rules_cpt || [],
  codingRulesICD: data.coding_rules_icd || [],
  providers: data.providers || [],


  statusId: data.status_id,
  status: data.status,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});
type RawSOP = Omit<
  SOP,
  'billingGuidelines' | 'codingRulesCPT' | 'codingRulesICD'
> & {
  billingGuidelines?: RawBillingGuideline[];
  codingRulesCPT?: CodingRuleCPT[];
  codingRulesICD?: CodingRuleICD[];
};


export const normalizeSOP = (raw: RawSOP): SOP => {
  return {
    ...raw,

    // ---- CATEGORY ----
    category:
      typeof raw.category === 'string'
        ? raw.category
        : raw.category?.title ?? '',

    // ---- BILLING GUIDELINES ----
billingGuidelines: (raw.billingGuidelines ?? []).map((g, i): BillingGuideline => {

  // ✅ HARD TYPE NARROWING (THIS IS THE KEY)
  if (typeof g === 'object' && g !== null && 'category' in g && Array.isArray(g.rules)) {
    return {
      id: g.id ?? `bg_${i}`,
      category: g.category ?? `Guideline ${i + 1}`,
      rules: g.rules.map((r, j) => ({
        id: r.id ?? `rule_${i}_${j}`,
        description: r.description ?? '',
      })),
    };
  }

  // 🔁 Legacy / AI / string formats
  let description = '';

  if (typeof g === 'string') {
    description = g;
  } else if (typeof g === 'object' && g !== null) {
    if (typeof g.description === 'string') {
      description = g.description;
    } else if (typeof g.description === 'object' && g.description !== null) {
      description = g.description.description ?? '';
    }
  }

  return {
    id: typeof g === 'object' && g !== null ? g.id ?? `bg_${i}` : `bg_${i}`,
    category:
      typeof g === 'object' && g !== null
        ? g.title ?? `Guideline ${i + 1}`
        : `Guideline ${i + 1}`,
    rules: description
      ? [{ id: `rule_${i}_0`, description }]
      : [],
  };
}),



    // ---- CODING RULES (defensive) ----
codingRulesCPT: (raw.codingRulesCPT ?? []).map((r, i) => ({
  ...r,
  cptCode: r.cptCode ?? "",
  description: r.description ?? "",
})),

codingRulesICD: (raw.codingRulesICD ?? []).map((r, i) => ({
  ...r,
  icdCode: r.icdCode ?? "",
  description: r.description ?? "",
})),
};
};

const normalizeBillingGuidelines = (input: any[] = []): BillingGuideline[] => {
  return input.map((g, i) => ({
    id: g.id || `bg_${i}`,
    category: g.category || `Guideline ${i + 1}`,
    rules: Array.isArray(g.rules)
      ? g.rules.map((r: any, j: number) => ({
          id: r.id || `rule_${i}_${j}`,
          description: r.description || ""
        }))
      : []
  }));
};

const sopService = {
  getSOPs: async (skip: number = 0, limit: number = 100, search?: string, statusCode?: 'ACTIVE' | 'INACTIVE'): Promise<{ sops: SOP[]; total: number }> => {
    let url = `${API_URL}/api/sops?skip=${skip}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (statusCode) url += `&status_code=${statusCode}`;

    const response = await apiClient(url);
    if (!response.ok) throw new Error('Failed to fetch SOPs');
    const data = await response.json();
    return {
      sops: data.sops.map(mapExampleToSOP),
      total: data.total
    };
  },
  getSOPStats: async (): Promise<{
    totalSOPs: number;
    activeSOPs: number;
    inactiveSOPs: number;
  }> => {
    const response = await apiClient(`${API_URL}/api/sops/stats`);
    if (!response.ok) throw new Error('Failed to fetch SOP stats');
    const data = await response.json();

    return {
      totalSOPs: data.total_sops,
      activeSOPs: data.active_sops,
      inactiveSOPs: data.inactive_sops
    };
  },
  uploadAndExtractSOP: async (file: File, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `${API_URL}/api/sops/ai/extract-sop`,
      {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  },
  getSOPById: async (id: string): Promise<SOP> => {
    const response = await apiClient(`${API_URL}/api/sops/${id}`);
    if (!response.ok) throw new Error('Failed to fetch SOP');
    const data = await response.json();
    return mapExampleToSOP(data);
  },

  createSOP: async (data: any): Promise<SOP> => {
    const response = await apiClient(`${API_URL}/api/sops`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create SOP');
    }
    const responseData = await response.json();
    return normalizeSOP(mapExampleToSOP(responseData));
  },

  updateSOP: async (id: string, data: any): Promise<SOP> => {
    const response = await apiClient(`${API_URL}/api/sops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update SOP');
    }
    const responseData = await response.json();
    return normalizeSOP(mapExampleToSOP(responseData));
  },

  deleteSOP: async (id: string): Promise<void> => {
    const response = await apiClient(`${API_URL}/api/sops/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete SOP');
  },

  toggleSOPStatus: async (id: string, statusId: number): Promise<SOP> => {
    const response = await apiClient(`${API_URL}/api/sops/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status_id: statusId })
    });
    if (!response.ok) throw new Error('Failed to update SOP status');
    const data = await response.json();
    return normalizeSOP(mapExampleToSOP(data));
  },

  downloadSOPPDF: async (id: string, title: string): Promise<void> => {
    const response = await apiClient(`${API_URL}/api/sops/${id}/pdf`);
    if (!response.ok) throw new Error('Failed to download PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

export default sopService;
