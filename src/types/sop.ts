// export interface ProviderInfo {
//     providerName: string;
//     billingProviderName: string;
//     billingProviderNPI: string;
//     providerTaxID: string;
//     practiceName: string;
//     billingAddress: string;
//     software: string;
//     clearinghouse: string;
// }
export interface ProviderInfo {
  providerName: string;
  billingProviderName: string;
  billingProviderNPI: string;
  providerTaxID: string;
  practiceName: string;
  billingAddress: string;
  software: string;
  clearinghouse: string;
}
export interface WorkflowProcess {
    description: string;
    eligibilityPortals: string[];
}
export interface CodingRule {
    id: string;
    cptCode: string;
    description: string;
    ndcCode: string;
    units: string;
    chargePerUnit: string;
    modifier: string;
    replacementCPT: string;
}

export type CodingRuleCPT = {
  id?: string;
  cptCode: string;
  description?: string;
  ndcCode?: string;
  units?: string;
  chargePerUnit?: string;
  modifier?: string;
  replacementCPT?: string;
};

export type CodingRuleICD = {
  id?: string;
  icdCode: string;
  description?: string;
  notes?: string;
  ndcCode?: string;
  units?: string;
  chargePerUnit?: string;
  modifier?: string;
  replacementCPT?: string;
};


export interface XrayCodeMapping {
    id: string;
    cptCode: string;
    modifier: string;
    replacementCPT: string;
}
export interface BillingRule {
  id?: string;
  description: string;
}

export interface BillingGuideline {
  id?: string;
  category: string;
  rules: BillingRule[];
}

export interface PayerGuidelines {
  id: string;
  title: string;
  description: string;
}
export interface InfusionNDCCode {
    id: string;
    cptCode: string;
    description: string;
    ndcCode: string;
    units: string;
    chargePerUnit: string;
}
export type SOPCategory =
  | string
  | { title?: string; description?: string }
  | null;
// export interface SOP {
//     id: string;
//     title: string;
//     category: string | { title?: string; description?: string } | null;
//     providerType?: 'new' | 'existing';
//     clientId?: string;
//     providerInfo: ProviderInfo;
//     workflowProcess: WorkflowProcess;
//     postingCharges: string;
//     billingGuidelines: BillingGuideline[];
//     codingRules: any[];
//     insuranceSpecific: { [key: string]: string[] };
//     statusId?: number;
//     status?: { id: number; code: string; description?: string };
//     createdAt: Date;
//     updatedAt: Date;
// }
export interface SOPStatus {
  id: number;
  code: string;
  description?: string;
}

export interface SOP {
  id: string;
  title: string;

  // ✅ FIXED
  category: string | { title?: string; description?: string } | null;

  // ✅ ADD THESE (YOU WERE MISSING THEM)
  providerType?: "new" | "existing";
  clientId?: string | null;

  providerInfo?: ProviderInfo;

  workflowProcess?: {
    description?: string;
    eligibilityPortals?: string[];
  };

  billingGuidelines?: BillingGuideline[];
  payerGuidelines?:PayerGuidelines[];
  codingRulesCPT?: CodingRuleCPT[];
  codingRulesICD?:CodingRuleICD[];
  providers?: any[];
  statusId?: number;
  status?: SOPStatus;   // ✅ ADD THIS
  createdAt?: string;
  updatedAt?: string;
  created_by?: string;
  created_by_name?: string;
  organisation_id?: string;
  organisation_name?: string;
  client_name?: string;
  client_npi?: string;
}

export interface SOPFilters {
  skip?: number;
  limit?: number;
  search?: string;
  statusCode?: 'ACTIVE' | 'INACTIVE';
  fromDate?: string;
  toDate?: string;
  organisationId?: string;
  createdBy?: string;
  clientId?: string;
}
