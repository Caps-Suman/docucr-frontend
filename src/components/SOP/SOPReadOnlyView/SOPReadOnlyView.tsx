import React, { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  MapPin,
  Shield,
  Database,
  Users,
  Info,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react";
import { SOP } from "../../../types/sop";
import styles from "./SOPReadOnlyView.module.css";
import Loading from "../../Common/Loading";

interface SOPReadOnlyViewProps {
  sop: SOP;
  onClose: () => void;
  isLoading?: boolean;
}

const SOPReadOnlyView: React.FC<SOPReadOnlyViewProps> = ({
  sop,
  onClose,
  isLoading,
}) => {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    guidelines: true,
    payerGuidelines: true,
    coding: true,
    cpt: true,
    icd: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getCategoryLabel = (category: SOP["category"]): string => {
    if (typeof category === "string") return category;
    if (category && typeof category === "object") return category.title ?? "—";
    return "—";
  };

  // ── Collect extracted data grouped by document, per data type ──────────────
  const extractedDocs = sop.documents?.filter((d) => d.extracted_data) || [];

  const extractedCPTByDoc = extractedDocs
    .map((doc) => ({
      name: doc.name,
      url: doc.document_url,
      rules: (doc.extracted_data?.coding_rules_cpt || []).filter(
        (r: any) => r.cptCode || r.description,
      ),
    }))
    .filter((d) => d.rules.length > 0);

  const extractedICDByDoc = extractedDocs
    .map((doc) => ({
      name: doc.name,
      url: doc.document_url,
      rules: (doc.extracted_data?.coding_rules_icd || []).filter(
        (r: any) => r.icdCode || r.description,
      ),
    }))
    .filter((d) => d.rules.length > 0);

  const extractedPayerByDoc = extractedDocs
    .map((doc) => ({
      name: doc.name,
      url: doc.document_url,
      guidelines: (doc.extracted_data?.payer_guidelines || []).filter(
        (g: any) => g.title || g.description,
      ),
    }))
    .filter((d) => d.guidelines.length > 0);

  const extractedBillingByDoc = extractedDocs
    .map((doc) => ({
      name: doc.name,
      url: doc.document_url,
      guidelines: (doc.extracted_data?.billing_guidelines || []).filter(
        (g: any) => g.category || g.rules?.length,
      ),
    }))
    .filter((d) => d.guidelines.length > 0);

  // Base payer guidelines (from sop root or flattened from extracted)
  const payerGuidelines = sop.payerGuidelines?.length
    ? sop.payerGuidelines
    : []; // extracted ones are handled separately via extractedPayerByDoc

  // ── Section counts (base + extracted) ──────────────────────────────────────
  const totalCPT =
    (sop.codingRulesCPT?.length || 0) +
    extractedCPTByDoc.reduce((sum, d) => sum + d.rules.length, 0);

  const totalICD =
    (sop.codingRulesICD?.length || 0) +
    extractedICDByDoc.reduce((sum, d) => sum + d.rules.length, 0);

  const totalPayer =
    payerGuidelines.length +
    extractedPayerByDoc.reduce((sum, d) => sum + d.guidelines.length, 0);

  const totalBilling =
    (sop.billingGuidelines?.length || 0) +
    extractedBillingByDoc.reduce((sum, d) => sum + d.guidelines.length, 0);

  // ── Reusable source badge ──────────────────────────────────────────────────
  const DocSourceBadge = ({ name, url }: { name: string; url?: string }) => (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        margin: "14px 0 8px 0",
        padding: "5px 10px",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "20px",
      }}
    >
      <FileText size={11} style={{ color: "#3b82f6", flexShrink: 0 }} />
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#1d4ed8",
          whiteSpace: "nowrap",
        }}
      >
        Extracted from: {name}
      </span>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "11px",
            color: "#2563eb",
            textDecoration: "none",
            padding: "2px 7px",
            background: "white",
            borderRadius: "12px",
            border: "1px solid #93c5fd",
            fontWeight: 600,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
        >
          <ExternalLink size={10} />
          View
        </a>
      )}
    </div>
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <BookOpen size={20} />
            SOP Details: {sop.title}
          </h2>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {isLoading ? (
            <div
              style={{
                padding: "40px 0",
                minHeight: "300px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Loading message="Fetching SOP details..." />
            </div>
          ) : (
            <>
              {/* ===== OVERVIEW ===== */}
              <div className={styles.infoSection}>
                <h3>
                  <Info size={16} /> Overview
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <strong>Client Name</strong>
                    <span>{sop.client_name || "—"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Category</strong>
                    <span>{getCategoryLabel(sop.category)}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Billing Provider</strong>
                    <span>{sop.providerInfo?.billingProviderName || "—"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <strong>NPI Number</strong>
                    <span>
                      {sop.providerInfo?.billingProviderNPI ||
                        sop.client_npi ||
                        "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ===== PRACTICE DETAILS ===== */}
              <div className={styles.infoSection}>
                <h3>
                  <MapPin size={16} /> Practice Details
                </h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <strong>Practice Name</strong>
                    <span>{sop.client_name || "—"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Software</strong>
                    <span>{sop.providerInfo?.software || "—"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Tax ID</strong>
                    <span>{sop.providerInfo?.providerTaxID || "—"}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <strong>Clearinghouse</strong>
                    <span>{sop.providerInfo?.clearinghouse || "—"}</span>
                  </div>
                  <div
                    className={styles.infoItem}
                    style={{ gridColumn: "span 2" }}
                  >
                    <strong>Billing Address</strong>
                    <span>{sop.providerInfo?.billingAddress || "—"}</span>
                  </div>
                </div>
              </div>

              {/* ===== ASSOCIATED PROVIDERS ===== */}
              {sop.providers && sop.providers.length > 0 && (
                <div className={styles.infoSection}>
                  <h3>
                    <Users size={16} /> Associated Providers
                  </h3>
                  <table className={styles.detailsTable}>
                    <thead>
                      <tr>
                        <th className={styles.detailsTh}>Provider Name</th>
                        <th className={styles.detailsTh}>NPI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sop.providers.map((p, idx) => (
                        <tr key={idx}>
                          <td className={styles.detailsTd}>{p.name}</td>
                          <td className={styles.detailsTd}>{p.npi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ===== WORKFLOW PROCESS ===== */}
              <div className={styles.infoSection}>
                <h3>
                  <Globe size={16} /> Workflow Process
                </h3>
                <div
                  className={styles.infoItem}
                  style={{ marginBottom: "16px" }}
                >
                  <strong>Process Description</strong>
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      color: "#0c4a6e",
                      fontSize: "13px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {sop.workflowProcess?.description ||
                      "No description provided."}
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <strong>Eligibility Portals</strong>
                  <div
                    className={styles.badgeList}
                    style={{ marginTop: "8px" }}
                  >
                    {sop.workflowProcess?.eligibilityPortals?.length ? (
                      sop.workflowProcess.eligibilityPortals.map((p, i) => (
                        <span key={i} className={styles.portalBadge}>
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className={styles.emptyMessage}>
                        No portals listed.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.accordion}>
                {/* ===== BILLING GUIDELINES ===== */}
                <div className={styles.accordionItem}>
                  <div
                    className={styles.accordionHeader}
                    onClick={() => toggleSection("guidelines")}
                  >
                    <span>
                      <Shield size={16} /> Billing Guidelines ({totalBilling})
                    </span>
                    {expandedSections.guidelines ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                  {expandedSections.guidelines && (
                    <div className={styles.accordionContent}>
                      {/* Base */}
                      {sop.billingGuidelines?.length
                        ? sop.billingGuidelines.map((g, i) => (
                            <div key={i} className={styles.guidelineItem}>
                              <span className={styles.guidelineCategory}>
                                {g.category}
                              </span>
                              <ul className={styles.ruleList}>
                                {g.rules.map((r, j) => (
                                  <li key={j} className={styles.ruleItem}>
                                    {r.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))
                        : null}

                      {/* Extracted from documents */}
                      {extractedBillingByDoc.map((docEntry, di) => (
                        <div key={`ext-billing-${di}`}>
                          <DocSourceBadge
                            name={docEntry.name}
                            url={docEntry.url}
                          />
                          {docEntry.guidelines.map((g: any, i: number) => (
                            <div key={i} className={styles.guidelineItem}>
                              <span className={styles.guidelineCategory}>
                                {g.category}
                              </span>
                              <ul className={styles.ruleList}>
                                {g.rules?.map((r: any, j: number) => (
                                  <li key={j} className={styles.ruleItem}>
                                    {r.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}

                      {totalBilling === 0 && (
                        <div className={styles.emptyMessage}>
                          No billing guidelines available.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ===== PAYER GUIDELINES ===== */}
                <div className={styles.accordionItem}>
                  <div
                    className={styles.accordionHeader}
                    onClick={() => toggleSection("payerGuidelines")}
                  >
                    <span>
                      <Shield size={16} /> Payer Guidelines ({totalPayer})
                    </span>
                    {expandedSections.payerGuidelines ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                  {expandedSections.payerGuidelines && (
                    <div className={styles.accordionContent}>
                      {/* Base */}
                      {payerGuidelines.length
                        ? payerGuidelines.map((g, i) => (
                            <div key={i} className={styles.guidelineItem}>
                              <span className={styles.guidelineCategory}>
                                {g.title}
                              </span>
                              <ul className={styles.ruleList}>
                                {g.description && (
                                  <li className={styles.ruleItem}>
                                    {g.description}
                                  </li>
                                )}
                              </ul>
                            </div>
                          ))
                        : null}

                      {/* Extracted from documents */}
                      {extractedPayerByDoc.map((docEntry, di) => (
                        <div key={`ext-payer-${di}`}>
                          <DocSourceBadge
                            name={docEntry.name}
                            url={docEntry.url}
                          />
                          {docEntry.guidelines.map((g: any, i: number) => (
                            <div key={i} className={styles.guidelineItem}>
                              <span className={styles.guidelineCategory}>
                                {g.title}
                              </span>
                              <ul className={styles.ruleList}>
                                {g.description && (
                                  <li className={styles.ruleItem}>
                                    {g.description}
                                  </li>
                                )}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}

                      {totalPayer === 0 && (
                        <div className={styles.emptyMessage}>
                          No payer guidelines available.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ===== CODING RULES ===== */}
                <div className={styles.accordionItem}>
                  <div
                    className={styles.accordionHeader}
                    onClick={() => toggleSection("coding")}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Database size={16} /> Coding Rules ({totalCPT + totalICD}
                      )
                    </span>
                    {expandedSections.coding ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>

                  {expandedSections.coding && (
                    <div className={styles.accordionContent}>
                      {/* ── CPT ── */}
                      <div className={styles.accordionItem}>
                        <div
                          className={styles.accordionHeader}
                          onClick={() => toggleSection("cpt")}
                        >
                          <span>CPT Codes ({totalCPT})</span>
                          {expandedSections.cpt ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </div>

                        {expandedSections.cpt && (
                          <div className={styles.accordionContent}>
                            {/* Base CPT */}
                            {sop.codingRulesCPT?.length ? (
                              <ul className={styles.ruleList}>
                                {sop.codingRulesCPT.map((r, i) => (
                                  <li
                                    key={`cpt_${i}`}
                                    className={styles.ruleItem}
                                  >
                                    <div className={styles.codeLabel}>
                                      <strong>{r.cptCode}</strong> —{" "}
                                      {r.description}
                                    </div>
                                    <div className={styles.codeDetails}>
                                      {r.ndcCode && (
                                        <span className={styles.detailTag}>
                                          NDC: {r.ndcCode}
                                        </span>
                                      )}
                                      {r.units && (
                                        <span className={styles.detailTag}>
                                          Units: {r.units}
                                        </span>
                                      )}
                                      {r.chargePerUnit && (
                                        <span className={styles.detailTag}>
                                          Charge: {r.chargePerUnit}
                                        </span>
                                      )}
                                      {r.modifier && (
                                        <span className={styles.detailTag}>
                                          Modifier: {r.modifier}
                                        </span>
                                      )}
                                      {r.replacementCPT && (
                                        <span className={styles.detailTag}>
                                          Replace: {r.replacementCPT}
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}

                            {/* Extracted CPT from documents */}
                            {extractedCPTByDoc.map((docEntry, di) => (
                              <div key={`ext-cpt-${di}`}>
                                <DocSourceBadge
                                  name={docEntry.name}
                                  url={docEntry.url}
                                />
                                <ul className={styles.ruleList}>
                                  {docEntry.rules.map((r: any, i: number) => (
                                    <li
                                      key={`ext-cpt-rule-${i}`}
                                      className={styles.ruleItem}
                                    >
                                      <div className={styles.codeLabel}>
                                        <strong>{r.cptCode}</strong> —{" "}
                                        {r.description}
                                      </div>
                                      <div className={styles.codeDetails}>
                                        {r.ndcCode && (
                                          <span className={styles.detailTag}>
                                            NDC: {r.ndcCode}
                                          </span>
                                        )}
                                        {r.units && (
                                          <span className={styles.detailTag}>
                                            Units: {r.units}
                                          </span>
                                        )}
                                        {r.chargePerUnit && (
                                          <span className={styles.detailTag}>
                                            Charge: {r.chargePerUnit}
                                          </span>
                                        )}
                                        {r.modifier && (
                                          <span className={styles.detailTag}>
                                            Modifier: {r.modifier}
                                          </span>
                                        )}
                                        {r.replacementCPT && (
                                          <span className={styles.detailTag}>
                                            Replace: {r.replacementCPT}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}

                            {totalCPT === 0 && (
                              <div className={styles.emptyMessage}>
                                No CPT rules.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── ICD ── */}
                      <div className={styles.accordionItem}>
                        <div
                          className={styles.accordionHeader}
                          onClick={() => toggleSection("icd")}
                        >
                          <span>ICD Codes ({totalICD})</span>
                          {expandedSections.icd ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </div>

                        {expandedSections.icd && (
                          <div className={styles.accordionContent}>
                            {/* Base ICD */}
                            {sop.codingRulesICD?.length ? (
                              <ul className={styles.ruleList}>
                                {sop.codingRulesICD.map((r, i) => (
                                  <li
                                    key={`icd_${i}`}
                                    className={styles.ruleItem}
                                  >
                                    <div className={styles.codeLabel}>
                                      <strong>{r.icdCode}</strong>
                                      {r.description && <> — {r.description}</>}
                                    </div>
                                    <div className={styles.codeDetails}>
                                      {r.ndcCode && (
                                        <span className={styles.detailTag}>
                                          NDC: {r.ndcCode}
                                        </span>
                                      )}
                                      {r.units && (
                                        <span className={styles.detailTag}>
                                          Units: {r.units}
                                        </span>
                                      )}
                                      {r.chargePerUnit && (
                                        <span className={styles.detailTag}>
                                          Charge: {r.chargePerUnit}
                                        </span>
                                      )}
                                      {r.modifier && (
                                        <span className={styles.detailTag}>
                                          Modifier: {r.modifier}
                                        </span>
                                      )}
                                      {r.replacementCPT && (
                                        <span className={styles.detailTag}>
                                          Replace: {r.replacementCPT}
                                        </span>
                                      )}
                                      {r.notes && (
                                        <span className={styles.detailTag}>
                                          Notes: {r.notes}
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}

                            {/* Extracted ICD from documents */}
                            {extractedICDByDoc.map((docEntry, di) => (
                              <div key={`ext-icd-${di}`}>
                                <DocSourceBadge
                                  name={docEntry.name}
                                  url={docEntry.url}
                                />
                                <ul className={styles.ruleList}>
                                  {docEntry.rules.map((r: any, i: number) => (
                                    <li
                                      key={`ext-icd-rule-${i}`}
                                      className={styles.ruleItem}
                                    >
                                      <div className={styles.codeLabel}>
                                        <strong>{r.icdCode}</strong>
                                        {r.description && (
                                          <> — {r.description}</>
                                        )}
                                      </div>
                                      <div className={styles.codeDetails}>
                                        {r.ndcCode && (
                                          <span className={styles.detailTag}>
                                            NDC: {r.ndcCode}
                                          </span>
                                        )}
                                        {r.units && (
                                          <span className={styles.detailTag}>
                                            Units: {r.units}
                                          </span>
                                        )}
                                        {r.chargePerUnit && (
                                          <span className={styles.detailTag}>
                                            Charge: {r.chargePerUnit}
                                          </span>
                                        )}
                                        {r.modifier && (
                                          <span className={styles.detailTag}>
                                            Modifier: {r.modifier}
                                          </span>
                                        )}
                                        {r.replacementCPT && (
                                          <span className={styles.detailTag}>
                                            Replace: {r.replacementCPT}
                                          </span>
                                        )}
                                        {r.notes && (
                                          <span className={styles.detailTag}>
                                            Notes: {r.notes}
                                          </span>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}

                            {totalICD === 0 && (
                              <div className={styles.emptyMessage}>
                                No ICD rules.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SOPReadOnlyView;
