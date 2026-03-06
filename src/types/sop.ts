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
  payerName: string;
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
export interface SOPProvider extends ProviderInfo {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  npi: string;
  type: string;
}

export interface SOPStatus {
  id: number;
  code: string;
  description?: string;
}

export interface SOPDocument {
  id: string;
  name: string;
  category: string;
  s3_key: string;
  created_at: string;
}

export interface SOP {
  id: string;
  title: string;
  category: SOPCategory;
  providerType: "new" | "existing";
  clientId: string;
  providerInfo: ProviderInfo;
  workflowProcess: WorkflowProcess;
  billingGuidelines: BillingGuideline[]; // Assuming GroupedBillingGuidelines is equivalent to BillingGuideline[] or needs to be defined
  payerGuidelines: PayerGuidelines[]; // Assuming PayerGuideline is equivalent to PayerGuidelines or needs to be defined
  codingRulesCPT: CodingRuleCPT[];
  codingRulesICD: CodingRuleICD[];
  providers?: SOPProvider[];
  statusId?: number;
  status?: {
    id: number;
    code: string;
    description: string;
  };
  createdAt?: string;
  updatedAt?: string;
  created_by?: string;
  created_by_name?: string;
  organisation_id?: string;
  organisation_name?: string;
  client_name?: string;
  client_npi?: string;
  documents: SOPDocument[];
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
