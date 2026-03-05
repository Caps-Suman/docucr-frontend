import { ProviderInfo, BillingGuideline, CodingRule, PayerGuidelines } from "./sop";

export interface SOPForm {
  title: string;
  category: string;

  providerType: "new" | "existing";
  clientId: string | null;

  providerInfo: ProviderInfo;

  workflowDescription: string;
  eligibilityPortals: string[];

  billingGuidelines: BillingGuideline[];
  payerGuidelines: PayerGuidelines[];
  codingRules: CodingRule[];
}
