import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  X,
  Save,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Upload,
} from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import clientService, { Client } from "../../../services/client.service";
import ConfirmModal from "../../Common/ConfirmModal";
import {
  SOP,
  ProviderInfo,
  BillingGuideline,
  CodingRule,
  CodingRuleCPT,
  CodingRuleICD,
} from "../../../types/sop";
import sopService from "../../../services/sop.service";
import styles from "./CreateSOP.module.css";
import { usePermission } from "../../../context/PermissionContext";

const CreateSOP: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // --- State ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [providerType, setProviderType] = useState<"new" | "existing">("new");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const [providerInfo, setProviderInfo] = useState<ProviderInfo>({
    providerName: "",
    billingProviderName: "",
    billingProviderNPI: "",
    providerTaxID: "",
    practiceName: "",
    billingAddress: "",
    software: "",
    clearinghouse: "",
  });
  const [uploading, setUploading] = useState(false);

  // Workflow
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [eligibilityPortals, setEligibilityPortals] = useState<string[]>([]);
  const [newPortal, setNewPortal] = useState("");

  // Posting
  const [postingCharges, setPostingCharges] = useState("");

  // Billing Guidelines
  const [billingGuidelines, setBillingGuidelines] = useState<
    BillingGuideline[]
  >([]);
  const [newGuideline, setNewGuideline] = useState({
    title: "",
    description: "",
  });

  const [payerGuidelines, setPayerGuidelines] = useState<
    { id?: string; payer_name: string; description: string }[]
  >([]);

  const [newPayerGuideline, setNewPayerGuideline] = useState({
    payer_name: "",
    description: "",
  });

  // Coding Rules - Unified
 const [codingType, setCodingType] = useState<"CPT" | "ICD">("CPT");

const [codingRulesCPT, setCodingRulesCPT] = useState<CodingRuleCPT[]>([]);
const [codingRulesICD, setCodingRulesICD] = useState<CodingRuleICD[]>([]);
const [newCpt, setNewCpt] = useState<CodingRuleCPT>({
  cptCode: "",
  description: "",
  ndcCode: "",
  units: "",
  chargePerUnit: "",
  modifier: "",
  replacementCPT: "",
});

const [newIcd, setNewIcd] = useState<CodingRuleICD>({
  icdCode: "",
  description: "",
  notes: "",
});

const resetCpt = () =>
  setNewCpt({
    cptCode: "",
    description: "",
    ndcCode: "",
    units: "",
    chargePerUnit: "",
    modifier: "",
    replacementCPT: "",
  });

const resetIcd = () =>
  setNewIcd({
    icdCode: "",
    description: "",
    notes: "",
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { can } = usePermission();
  const canCreateSOP = can("SOPS", "CREATE");
  const canUpdateSOP = can("SOPS", "UPDATE");
  const handleResetClick = () => {
    setIsResetModalOpen(true);
  };

  const confirmReset = () => {
    setTitle("");
    setCategory("");
    setProviderType("new");
    setSelectedClientId("");
    setProviderInfo({
      providerName: "",
      billingProviderName: "",
      billingProviderNPI: "",
      providerTaxID: "",
      practiceName: "",
      billingAddress: "",
      software: "",
      clearinghouse: "",
    });
    setWorkflowDescription("");
    setEligibilityPortals([]);
    setPostingCharges("");
    setBillingGuidelines([]);
    setCodingRulesCPT([]);
setCodingRulesICD([]);
resetCpt();
resetIcd();
    setNewGuideline({ title: "", description: "" });
    setErrors([]);
    setIsResetModalOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  useEffect(() => {
  if (!canCreateSOP && !isEditMode) {
    navigate("/unauthorized");
  }
  if (isEditMode && !canUpdateSOP) {
    navigate("/unauthorized");
  }
}, [canCreateSOP, canUpdateSOP, isEditMode, navigate]);
  // --- Effects ---
  useEffect(() => {
    loadClients();
    if (isEditMode && id) {
      loadSOP(id);
    }
  }, [id]);

  const loadSOP = async (sopId: string) => {
    try {
      setLoading(true);
      const sop = await sopService.getSOPById(sopId);
      setTitle(sop.title);
      setCategory(
        typeof sop.category === "string"
          ? sop.category
          : (sop.category?.title ?? ""),
      );
      // Type assertion or mapping if backend returns snake_case but frontend uses camelCase for internal state variables
      // However, SOP type is shared. If backend returns snake_case keys in JSON response, we might need to map them to component state
      // provider_type from backend to providerType state
      setProviderType(sop.providerType || "new");
      setSelectedClientId(sop.clientId || "");

      // Map JSONB fields back to state
      if (sop.providerInfo) {
        setProviderInfo({
          providerName: sop.providerInfo.providerName ?? "",
          billingProviderName: sop.providerInfo.billingProviderName ?? "",
          billingProviderNPI: sop.providerInfo.billingProviderNPI ?? "",
          providerTaxID: sop.providerInfo.providerTaxID ?? "",
          practiceName: sop.providerInfo.practiceName ?? "",
          billingAddress: sop.providerInfo.billingAddress ?? "",
          software: sop.providerInfo.software ?? "",
          clearinghouse: sop.providerInfo.clearinghouse ?? "",
        });
      }
      if (sop.workflowProcess) {
        setWorkflowDescription(sop.workflowProcess.description || "");
        setEligibilityPortals(sop.workflowProcess.eligibilityPortals || []);
      }
      if (sop.billingGuidelines) {
        setBillingGuidelines(normalizeBillingGuidelines(sop.billingGuidelines));
      }
      if (sop.payerGuidelines) {
        setPayerGuidelines(
          sop.payerGuidelines.map((pg: any, i: number) => ({
            id: `pg_db_${i}`,
            payer_name: pg.payer_name || "Unknown",
            description: pg.description || "",
          })),
        );
      }

      if (sop.codingRulesCPT) setCodingRulesCPT(sop.codingRulesCPT);
if (sop.codingRulesICD) setCodingRulesICD(sop.codingRulesICD);

    } catch (error) {
      console.error("Failed to load SOP:", error);
      // Handle error (e.g., redirect or show notification)
    } finally {
      setLoading(false);
    }
  };
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleSOPUpload = async (file: File) => {
    try {
      setUploading(true);

      // Create new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await sopService.uploadAndExtractSOP(
        file,
        controller.signal,
      );

      if (!response?.extracted_data) {
        throw new Error("No extracted data returned from AI");
      }

      applyExtractedSOP(response.extracted_data);
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("SOP extraction cancelled");
      } else {
        console.error(err);
        alert("Failed to extract SOP from file");
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const applyExtractedSOP = (data: any) => {
    if (!data || typeof data !== "object") {
      console.error("Invalid extracted SOP payload", data);
      return;
    }

    // ---- BASIC ----
    if (data.basic_information?.sop_title) {
      setTitle(data.basic_information.sop_title);
    }

    if (data.basic_information?.category) {
      setCategory(data.basic_information.category);
    }

    // ---- PROVIDER ----
    if (data.provider_information) {
      setProviderType("new");
      setProviderInfo((prev) => ({
        ...prev,
        providerName: data.provider_information.billing_provider_name || "",
        billingProviderName:
          data.provider_information.billing_provider_name || "",
        billingProviderNPI:
          data.provider_information.billing_provider_npi || "",
        providerTaxID: data.provider_information.provider_tax_id || "",
        billingAddress: data.provider_information.billing_address || "",
        software: data.provider_information.software || "",
        clearinghouse: data.provider_information.clearinghouse || "",
      }));
    }

    // ---- WORKFLOW (THIS IS THE PART YOU BROKE) ----
    if (data.workflow_process) {
     setWorkflowDescription(data.workflow_process.description ?? "");
     setPostingCharges(data.workflow_process.posting_charges_rules ?? "");


      setEligibilityPortals(
        Array.isArray(data.workflow_process.eligibility_verification_portals)
          ? data.workflow_process.eligibility_verification_portals
          : [],
      );
    }

    // ---- BILLING GUIDELINES ----
 if (Array.isArray(data.billing_guidelines)) {
  setBillingGuidelines(
    normalizeBillingGuidelines(data.billing_guidelines)
  );
}
    if (Array.isArray(data.payer_guidelines)) {
      setPayerGuidelines(
        data.payer_guidelines.map((pg: any, i: number) => ({
          id: `pg_ai_${i}`,
          payer_name: pg?.payer_name || "Unknown",
          description: pg?.description || "",
        })),
      );
    }
    // ---- CODING RULES ----
if (Array.isArray(data.coding_rules_cpt)) {
  setCodingRulesCPT(data.coding_rules_cpt);
}

if (Array.isArray(data.coding_rules_icd)) {
  setCodingRulesICD(data.coding_rules_icd);
}
  }

  useEffect(() => {
    if (providerType === "existing" && selectedClientId) {
      const selectedClient = clients.find((c) => c.id === selectedClientId);
      if (selectedClient) {
        setProviderInfo((prev) => ({
          ...prev,
          providerName:
            selectedClient.type === "individual"
              ? `${selectedClient.first_name || ""} ${selectedClient.middle_name || ""} ${selectedClient.last_name || ""}`.trim()
              : selectedClient.business_name || "",
          billingProviderName:
            selectedClient.business_name ||
            `${selectedClient.first_name || ""} ${selectedClient.last_name || ""}`.trim(),
          billingProviderNPI: selectedClient.npi || "",
        }));
      }
    }
  }, [selectedClientId, providerType, clients]);

  // --- Helpers ---
  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const clients = await clientService.getVisibleClients();
      setClients(clients);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    if (!title.trim()) newErrors.push("SOP Title is required");
    if (!category.trim()) newErrors.push("Category is required");
    if (providerType === "existing" && !selectedClientId)
      newErrors.push("Please select an existing client");
    if (providerType === "new") {
      if (!providerInfo.providerName.trim())
        newErrors.push("Provider Name is required");
      if (!providerInfo.billingProviderNPI.trim()) {
        newErrors.push("Billing Provider NPI is required");
      } else if (!/^\d{10}$/.test(providerInfo.billingProviderNPI)) {
        newErrors.push("Billing Provider NPI must be exactly 10 digits");
      }
    }
    if (!workflowDescription.trim())
      newErrors.push("Workflow Description is required");

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // --- Handlers ---
  const handleAddPortal = () => {
    if (newPortal.trim()) {
      setEligibilityPortals([...eligibilityPortals, newPortal.trim()]);
      setNewPortal("");
    }
  };

  const handleRemovePortal = (index: number) => {
    setEligibilityPortals(eligibilityPortals.filter((_, i) => i !== index));
  };

  const handleAddGuideline = () => {
    if (newGuideline.title.trim() && newGuideline.description.trim()) {
     setBillingGuidelines([
  ...billingGuidelines,
  {
    id: `bg_${Date.now()}`,
    category: newGuideline.title,
    rules: [
      {
        id: `rule_${Date.now()}`,
        description: newGuideline.description,
      },
    ],
  },
]);

      setNewGuideline({ title: "", description: "" });
    }
  };

  const handleRemoveGuideline = (id: string | undefined, index: number) => {
    setBillingGuidelines(
      billingGuidelines.filter((g, i) => (id ? g.id !== id : i !== index)),
    );
  };

const handleAddCodingRule = () => {
  if (codingType === "CPT" && newCpt.cptCode.trim()) {
    setCodingRulesCPT(prev => [
      ...prev,
      { id: `cpt_${Date.now()}`, ...newCpt },
    ]);
    resetCpt();
  }

  if (codingType === "ICD" && newIcd.icdCode.trim()) {
    setCodingRulesICD(prev => [
      ...prev,
      { id: `icd_${Date.now()}`, ...newIcd },
    ]);
    resetIcd();
  }
};
const handleRemoveCpt = (id: string) => {
  setCodingRulesCPT(prev => prev.filter(r => r.id !== id));
};

const handleRemoveIcd = (id: string) => {
  setCodingRulesICD(prev => prev.filter(r => r.id !== id));
};

const normalizeBillingGuidelines = (input: any[]): BillingGuideline[] => {
  return input.map((g, i) => {
    // Already correct shape
    if (g?.category && Array.isArray(g.rules)) {
      return {
        id: g.id || `bg_norm_${i}`,
        category: g.category,
        rules: g.rules.map((r: any, j: number) => ({
          id: r.id || `rule_${i}_${j}`,
          description: r.description || "",
        })),
      };
    }

    // Old AI / legacy shape
    if (g?.title || g?.description) {
      return {
        id: g.id || `bg_norm_${i}`,
        category: g.title || `Guideline ${i + 1}`,
        rules: [
          {
            id: `rule_${i}_0`,
            description: g.description || "",
          },
        ],
      };
    }

    // Fallback
    return {
      id: `bg_norm_${i}`,
      category: `Guideline ${i + 1}`,
      rules: [],
    };
  });
};
  
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      title,
      category,
      provider_type: providerType,
      client_id: selectedClientId || null,
      provider_info: providerInfo,
workflow_process: {
  description: workflowDescription,           // ✅ REQUIRED
  superbill_source: workflowDescription,       // optional, legacy
  posting_charges_rules: postingCharges,
  eligibility_verification_portals: eligibilityPortals,
},
billing_guidelines: billingGuidelines.map(bg => ({
  category: bg.category,
  rules: (bg.rules ?? []).map(r => ({
    description: r.description
  }))
})),
      payer_guidelines: payerGuidelines, // 🔥 THIS WAS MISSING
coding_rules_cpt: codingRulesCPT,
coding_rules_icd: codingRulesICD,
    };

    try {
      setSaving(true);
      if (isEditMode && id) {
        await sopService.updateSOP(id, payload);
      } else {
        await sopService.createSOP(payload);
      }
      navigate("/sops");
    } catch (error) {
      console.error("Failed to save SOP:", error);
      // Here you might want to set a general error state or show a toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate("/sops")}
            title="Back to List"
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.titleSection}>
            <h1>{isEditMode ? "Edit SOP" : "Create New SOP"}</h1>
            <p>
              {isEditMode
                ? "Update standard operating procedure details"
                : "Define a new standard operating procedure"}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.resetButton}
            onClick={handleResetClick}
            disabled={saving || uploading}
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving || uploading}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save SOP"}
          </button>

          {uploading ? (
            <>
              <button className={styles.saveButton} type="button" disabled>
                Extracting...
              </button>
              <button
                className={styles.saveButton}
                type="button"
                onClick={handleCancelUpload}
                style={{
                  backgroundColor: "#ef4444",
                  borderColor: "#ef4444",
                  color: "white",
                }}
              >
                <X size={16} />
                Cancel
              </button>
            </>
          ) : (
            <button
              className={styles.saveButton}
              type="button"
              onClick={handleUploadClick}
            >
              <Upload size={16} />
              Upload SOP
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleSOPUpload(file);
                e.target.value = ""; // 🔥 REQUIRED
              }
            }}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading SOP...</p>
        </div>
      ) : (
        <div className={styles.content}>
          {errors.length > 0 && (
            <div
              className={styles.section}
              style={{ borderColor: "#ef4444", backgroundColor: "#fef2f2" }}
            >
              <div
                className={styles.sectionTitle}
                style={{ color: "#ef4444", marginBottom: "8px" }}
              >
                Please fix the following errors:
              </div>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  color: "#b91c1c",
                  margin: 0,
                }}
              >
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Info */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Basic Information</div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>SOP Title *</label>
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Dr. John Smith - Cardiology"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Category *</label>
                <input
                  className={styles.input}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Rheumatology"
                />
              </div>
            </div>
          </div>

          {/* Provider Info */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Provider Information</div>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Provider Type *</label>
                <Select
                  options={[
                    { value: "new", label: "New Provider" },
                    { value: "existing", label: "Existing Client" },
                  ]}
                  value={{
                    value: providerType,
                    label:
                      providerType === "new"
                        ? "New Provider"
                        : "Existing Client",
                  }}
                  onChange={(option) => setProviderType(option?.value as any)}
                  styles={getCustomSelectStyles()}
                />
              </div>

              {providerType === "existing" && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Client *</label>
                  <Select
                    options={clients.map((c) => ({
                      value: c.id,
                      label: `${
                        c.type === "individual"
                          ? `${c.first_name || ""} ${c.middle_name || ""} ${c.last_name || ""}`.trim()
                          : c.business_name || ""
                      } ${c.npi ? `(${c.npi})` : ""}`,
                    }))}
                    value={
                      selectedClientId
                        ? clients.find((c) => c.id === selectedClientId)
                          ? {
                              value: selectedClientId,
                              label: (() => {
                                const client = clients.find(
                                  (c) => c.id === selectedClientId,
                                );
                                if (!client) return "";
                                return `${
                                  client.type === "individual"
                                    ? `${client.first_name || ""} ${client.middle_name || ""} ${client.last_name || ""}`.trim()
                                    : client.business_name || ""
                                } ${client.npi ? `(${client.npi})` : ""}`;
                              })(),
                            }
                          : null
                        : null
                    }
                    onChange={(option) =>
                      setSelectedClientId(option?.value || "")
                    }
                    isDisabled={loadingClients}
                    placeholder="Select a client"
                    styles={getCustomSelectStyles()}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Provider Name {providerType === "new" && "*"}
                </label>
                <input
                  className={styles.input}
                  value={providerInfo.providerName}
                  onChange={(e) =>
                    setProviderInfo({
                      ...providerInfo,
                      providerName: e.target.value,
                    })
                  }
                  disabled={providerType === "existing"}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Billing Provider NPI *</label>
                <input
                  className={styles.input}
                  value={providerInfo.billingProviderNPI}
                  onChange={(e) =>
                    setProviderInfo({
                      ...providerInfo,
                      billingProviderNPI: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10),
                    })
                  }
                  disabled={providerType === "existing"}
                  placeholder="10-digit NPI"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Software</label>
                <input
                  className={styles.input}
                  value={providerInfo.software}
                  onChange={(e) =>
                    setProviderInfo({
                      ...providerInfo,
                      software: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Billing Address</label>
                <input
                  className={styles.input}
                  value={providerInfo.billingAddress}
                  onChange={(e) =>
                    setProviderInfo({
                      ...providerInfo,
                      billingAddress: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Clearing house</label>
                <input
                  className={styles.input}
                  value={providerInfo.clearinghouse}
                  onChange={(e) =>
                    setProviderInfo({
                      ...providerInfo,
                      clearinghouse: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Workflow */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Workflow Process</div>
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>Workflow Description *</label>
                <textarea
                  className={styles.textarea}
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe how superbills are received and processed..."
                />
              </div>
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
  <label className={styles.label}>Posting Charges Rules</label>
  <textarea
    className={styles.textarea}
    value={postingCharges}
    onChange={(e) => setPostingCharges(e.target.value)}
    placeholder="Describe charge posting rules..."
  />
</div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>
                  Eligibility Verification Portals
                </label>
                <div className={styles.addWrapper}>
                  <input
                    className={styles.input}
                    value={newPortal}
                    onChange={(e) => setNewPortal(e.target.value)}
                    placeholder="e.g., Availity"
                    onKeyPress={(e) => e.key === "Enter" && handleAddPortal()}
                  />
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={handleAddPortal}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className={styles.tagsList}>
                  {eligibilityPortals.map((portal, idx) => (
                    <span key={idx} className={styles.tag}>
                      {portal}
                      <div
                        className={styles.removeTag}
                        onClick={() => handleRemovePortal(idx)}
                      >
                        <X size={12} />
                      </div>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Billing Guidelines */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Billing Guidelines</div>
            <div className={styles.helperText}>
              <div className={styles.formGridWithButton}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Title</label>
                  <input
                    className={styles.input}
                    value={newGuideline.title}
                    onChange={(e) =>
                      setNewGuideline({
                        ...newGuideline,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <input
                    className={styles.input}
                    value={newGuideline.description}
                    onChange={(e) =>
                      setNewGuideline({
                        ...newGuideline,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>&nbsp;</label>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={handleAddGuideline}
                  >
                    <Plus size={16} /> Add Guideline
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.cardList}>
              {billingGuidelines.map((g, i) => (
  <div key={i} className={styles.cardItem}>
    <div className={styles.cardContent}>
      <h4>{g.category}</h4>
      <ul style={{ paddingLeft: "18px", margin: 0 }}>
{(g.rules ?? []).map((r, j) => (
          <li key={j}>{r.description}</li>
        ))}
      </ul>
    </div>
    <button
      className={styles.deleteButton}
      onClick={() => handleRemoveGuideline(g.id, i)}
    >
      <Trash2 size={16} />
    </button>
  </div>
))}
            </div>
          </div>
          {/* Payer Guidelines */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Payer Guidelines</div>

            <div className={styles.formGridWithButton}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Payer Name</label>
                <input
                  className={styles.input}
                  value={newPayerGuideline.payer_name}
                  onChange={(e) =>
                    setNewPayerGuideline({
                      ...newPayerGuideline,
                      payer_name: e.target.value,
                    })
                  }
                  placeholder="e.g., Medicare, Aetna"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <input
                  className={styles.input}
                  value={newPayerGuideline.description}
                  onChange={(e) =>
                    setNewPayerGuideline({
                      ...newPayerGuideline,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>&nbsp;</label>
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={() => {
                    if (
                      newPayerGuideline.payer_name.trim() &&
                      newPayerGuideline.description.trim()
                    ) {
                      setPayerGuidelines([
                        ...payerGuidelines,
                        { id: `pg_${Date.now()}`, ...newPayerGuideline },
                      ]);
                      setNewPayerGuideline({ payer_name: "", description: "" });
                    }
                  }}
                >
                  <Plus size={16} /> Add Payer Rule
                </button>
              </div>
            </div>

            <div className={styles.cardList}>
              {payerGuidelines.map((pg, i) => (
                <div key={pg.id || i} className={styles.cardItem}>
                  <div className={styles.cardContent}>
                    <h4>{pg.payer_name}</h4>
                    <p>{pg.description}</p>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={() =>
                      setPayerGuidelines(
                        payerGuidelines.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
           {/* Coding Guidelines */}
<div className={styles.section}>
  <div className={styles.sectionTitle}>Coding Guidelines</div>

  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
    <button
      type="button"
      className={codingType === "CPT" ? styles.activeTab : styles.tab}
      onClick={() => setCodingType("CPT")}
    >
      CPT Codes
    </button>

    <button
      type="button"
      className={codingType === "ICD" ? styles.activeTab : styles.tab}
      onClick={() => setCodingType("ICD")}
    >
      ICD Codes
    </button>
  </div>
            {/* Existing CPT Rules */}
{codingRulesCPT.length > 0 && (
  <div className={styles.cardList}>
    <h4>CPT Coding Rules</h4>

    {codingRulesCPT.map((rule) => (
      <div key={rule.id} className={styles.cardItem}>
        <div className={styles.cardContent}>
          <strong>{rule.cptCode}</strong> – {rule.description}
          {rule.ndcCode && <div>NDC: {rule.ndcCode}</div>}
          {rule.units && <div>Units: {rule.units}</div>}
          {rule.chargePerUnit && <div>Charge: {rule.chargePerUnit}</div>}
          {rule.modifier && <div>Modifier: {rule.modifier}</div>}
        </div>

        <button
          className={styles.deleteButton}
          onClick={() => rule.id && handleRemoveCpt(rule.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    ))}
  </div>
)}
{codingRulesICD.length > 0 && (
  <div className={styles.cardList}>
    <h4>ICD Coding Rules</h4>

    {codingRulesICD.map((rule) => (
      <div key={rule.id} className={styles.cardItem}>
        <div className={styles.cardContent}>
          <strong>{rule.icdCode}</strong> – {rule.description}
          {rule.notes && <div>Notes: {rule.notes}</div>}
        </div>

        <button
          className={styles.deleteButton}
onClick={() => rule.id && handleRemoveIcd(rule.id)}        >
          <Trash2 size={16} />
        </button>
      </div>
    ))}
  </div>
)}


  <div className={styles.formGrid}>
    <div className={styles.formGroup}>
      <label className={styles.label}>
        {codingType === "CPT" ? "CPT Code" : "ICD Code"}
      </label>

      <input
        className={styles.input}
        value={codingType === "CPT" ? newCpt.cptCode : newIcd.icdCode}
        onChange={(e) =>
          codingType === "CPT"
            ? setNewCpt({ ...newCpt, cptCode: e.target.value })
            : setNewIcd({ ...newIcd, icdCode: e.target.value })
        }
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.label}>Description</label>
      <input
        className={styles.input}
        value={codingType === "CPT" ? newCpt.description : newIcd.description}
        onChange={(e) =>
          codingType === "CPT"
            ? setNewCpt({ ...newCpt, description: e.target.value })
            : setNewIcd({ ...newIcd, description: e.target.value })
        }
      />
    </div>
    {codingType === "ICD" && (
  <div className={styles.formGroup}>
    <label className={styles.label}>Notes</label>
    <textarea
      className={styles.textarea}
      value={newIcd.notes}
      onChange={(e) =>
        setNewIcd({ ...newIcd, notes: e.target.value })
      }
      placeholder="Optional ICD-specific notes or rules"
    />
  </div>
)}

        {codingType === "CPT" && (
  <>
    <div className={styles.formGroup}>
      <label className={styles.label}>NDC Code</label>
      <input
        className={styles.input}
        value={newCpt.ndcCode}
        onChange={(e) =>
          setNewCpt({ ...newCpt, ndcCode: e.target.value })
        }
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.label}>Units</label>
      <input
        className={styles.input}
        value={newCpt.units}
        onChange={(e) =>
          setNewCpt({ ...newCpt, units: e.target.value })
        }
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.label}>Charge per Unit</label>
      <input
        className={styles.input}
        value={newCpt.chargePerUnit}
        onChange={(e) =>
          setNewCpt({ ...newCpt, chargePerUnit: e.target.value })
        }
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.label}>Modifier</label>
      <input
        className={styles.input}
        value={newCpt.modifier}
        onChange={(e) =>
          setNewCpt({ ...newCpt, modifier: e.target.value })
        }
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.label}>Replacement CPT</label>
      <input
        className={styles.input}
        value={newCpt.replacementCPT}
        onChange={(e) =>
          setNewCpt({ ...newCpt, replacementCPT: e.target.value })
        }
      />
    </div>
  </>
)}

    <div className={styles.formGroup}>
      <label className={styles.label}>&nbsp;</label>
      <button
        type="button"
        className={styles.saveButton}
        onClick={handleAddCodingRule}
      >
        <Plus size={16} /> Add
      </button>
    </div>
  </div>
</div>
        <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={confirmReset}
        title="Reset Form"
        message="Are you sure you want to reset the form? All unsaved changes will be lost."
        confirmText="Reset"
        type="warning"
      />
      </div>
      )}
    </div>
  );
};

export default CreateSOP;
