import React, { useState } from "react";
import {
    BookOpen,
    ChevronDown,
    ChevronUp,
    MapPin,
    Hash,
    Shield,
    Database,
    Users,
    Info,
    Globe
} from "lucide-react";
import { SOP } from "../../../types/sop";
import styles from "./SOPReadOnlyView.module.css";

interface SOPReadOnlyViewProps {
    sop: SOP;
    onClose: () => void;
}

const SOPReadOnlyView: React.FC<SOPReadOnlyViewProps> = ({ sop, onClose }) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        guidelines: true,
        coding: true
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const getCategoryLabel = (category: SOP["category"]): string => {
        if (typeof category === "string") return category;
        if (category && typeof category === "object") return category.title ?? "—";
        return "—";
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>
                        <BookOpen size={20} />
                        SOP Details: {sop.title}
                    </h2>
                    <button className={styles.modalClose} onClick={onClose}>×</button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.infoSection}>
                        <h3><Info size={16} /> Overview</h3>
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
                                <span>{sop.providerInfo?.billingProviderNPI || sop.client_npi || "—"}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.infoSection}>
                        <h3><MapPin size={16} /> Practice Details</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <strong>Practice Name</strong>
                                <span>{sop.providerInfo?.practiceName || "—"}</span>
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
                            <div className={styles.infoItem} style={{ gridColumn: 'span 2' }}>
                                <strong>Billing Address</strong>
                                <span>{sop.providerInfo?.billingAddress || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {sop.providers && sop.providers.length > 0 && (
                        <div className={styles.infoSection}>
                            <h3><Users size={16} /> Linked Providers</h3>
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

                    <div className={styles.infoSection}>
                        <h3><Globe size={16} /> Workflow Process</h3>
                        <div className={styles.infoItem} style={{ marginBottom: '16px' }}>
                            <strong>Process Description</strong>
                            <div style={{ marginTop: '8px', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0c4a6e', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                                {sop.workflowProcess?.description || "No description provided."}
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <strong>Eligibility Portals</strong>
                            <div className={styles.badgeList} style={{ marginTop: '8px' }}>
                                {sop.workflowProcess?.eligibilityPortals?.length ? (
                                    sop.workflowProcess.eligibilityPortals.map((p, i) => (
                                        <span key={i} className={styles.portalBadge}>{p}</span>
                                    ))
                                ) : (
                                    <span className={styles.emptyMessage}>No portals listed.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.accordion}>
                        <div className={styles.accordionItem}>
                            <div className={styles.accordionHeader} onClick={() => toggleSection("guidelines")}>
                                <span><Shield size={16} /> Billing Guidelines ({sop.billingGuidelines?.length || 0})</span>
                                {expandedSections.guidelines ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.guidelines && (
                                <div className={styles.accordionContent}>
                                    {sop.billingGuidelines?.length ? (
                                        sop.billingGuidelines.map((g, i) => (
                                            <div key={i} className={styles.guidelineItem}>
                                                <span className={styles.guidelineCategory}>{g.category}</span>
                                                <ul className={styles.ruleList}>
                                                    {g.rules.map((r, j) => (
                                                        <li key={j} className={styles.ruleItem}>{r.description}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.emptyMessage}>No billing guidelines available.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.accordionItem}>
                            <div className={styles.accordionHeader} onClick={() => toggleSection("coding")}>
                                <span><Database size={16} /> Coding Rules ({(sop.codingRulesCPT?.length || 0) + (sop.codingRulesICD?.length || 0)})</span>
                                {expandedSections.coding ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.coding && (
                                <div className={styles.accordionContent}>
                                    {sop.codingRulesCPT?.length ? (
                                        <div style={{ marginBottom: '16px' }}>
                                            <strong style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>CPT Rules</strong>
                                            {sop.codingRulesCPT.map((r, i) => (
                                                <div key={`cpt_${i}`} className={styles.codingRuleItem}>
                                                    <div className={styles.codeLabel}>{r.cptCode} <span className={styles.codeDesc}>– {r.description}</span></div>
                                                    <div className={styles.codeDetails}>
                                                        {r.ndcCode && <span className={styles.detailTag}><strong>NDC:</strong> {r.ndcCode}</span>}
                                                        {r.units && <span className={styles.detailTag}><strong>Units:</strong> {r.units}</span>}
                                                        {r.chargePerUnit && <span className={styles.detailTag}><strong>Charge:</strong> {r.chargePerUnit}</span>}
                                                        {r.modifier && <span className={styles.detailTag}><strong>Mod:</strong> {r.modifier}</span>}
                                                        {r.replacementCPT && <span className={styles.detailTag}><strong>Replace:</strong> {r.replacementCPT}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {sop.codingRulesICD?.length ? (
                                        <div>
                                            <strong style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>ICD Rules</strong>
                                            {sop.codingRulesICD.map((r, i) => (
                                                <div key={`icd_${i}`} className={styles.codingRuleItem}>
                                                    <div className={styles.codeLabel}>{r.icdCode} <span className={styles.codeDesc}>– {r.description}</span></div>
                                                    {r.notes && (
                                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
                                                            <strong>Notes:</strong> {r.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    {(!sop.codingRulesCPT?.length && !sop.codingRulesICD?.length) && (
                                        <div className={styles.emptyMessage}>No coding rules implemented.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SOPReadOnlyView;
