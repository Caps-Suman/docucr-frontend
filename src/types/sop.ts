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

export interface BillingGuideline {
    id: string;
    title: string;
    description: string;
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

export interface XrayCodeMapping {
    id: string;
    cptCode: string;
    modifier: string;
    replacementCPT: string;
}

export interface InfusionNDCCode {
    id: string;
    cptCode: string;
    description: string;
    ndcCode: string;
    units: string;
    chargePerUnit: string;
}

export interface SOP {
    id: string;
    title: string;
    category: string;
    providerType?: 'new' | 'existing';
    clientId?: string;
    providerInfo: ProviderInfo;
    workflowProcess: WorkflowProcess;
    postingCharges: string;
    billingGuidelines: BillingGuideline[];
    codingRules: any[];
    insuranceSpecific: { [key: string]: string[] };
    statusId?: number;
    status?: { id: number; code: string; description?: string };
    createdAt: Date;
    updatedAt: Date;
}
