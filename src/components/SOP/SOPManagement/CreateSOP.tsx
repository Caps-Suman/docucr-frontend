import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, X, Save, ArrowLeft, Trash2 } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import clientService, { Client } from "../../../services/client.service";
import {
  SOP,
  ProviderInfo,
  BillingGuideline,
  CodingRule,
} from "../../../types/sop";
import sopService from "../../../services/sop.service";
import styles from "./CreateSOP.module.css";

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

  // Coding Rules - Unified
  const [codingRules, setCodingRules] = useState<CodingRule[]>([]);
  const [newCodingRule, setNewCodingRule] = useState({
    cptCode: "",
    description: "",
    ndcCode: "",
    units: "",
    chargePerUnit: "",
    modifier: "",
    replacementCPT: "",
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
      if (sop.codingRules) setCodingRules(sop.codingRules);
    } catch (error) {
      console.error("Failed to load SOP:", error);
      // Handle error (e.g., redirect or show notification)
    } finally {
      setLoading(false);
    }
  };
  const handleSOPUpload = async (file: File) => {
    try {
      setUploading(true);

      const response = await sopService.uploadAndExtractSOP(file);

      if (!response?.extracted_data) {
        throw new Error("No extracted data returned from AI");
      }

      applyExtractedSOP(response.extracted_data);
    } catch (err) {
      console.error(err);
      alert("Failed to extract SOP from file");
    } finally {
      setUploading(false);
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
    setProviderInfo(prev => ({
      ...prev,
      providerName: data.provider_information.billing_provider_name || "",
      billingProviderName: data.provider_information.billing_provider_name || "",
      billingProviderNPI: data.provider_information.billing_provider_npi || "",
      providerTaxID: data.provider_information.provider_tax_id || "",
      billingAddress: data.provider_information.billing_address || "",
      software: data.provider_information.software || "",
      clearinghouse: data.provider_information.clearinghouse || "",
    }));
  }

  // ---- WORKFLOW (THIS IS THE PART YOU BROKE) ----
  if (data.workflow_process) {
    setWorkflowDescription(
      [
        data.workflow_process.superbill_source,
        data.workflow_process.posting_charges_rules,
      ]
        .filter(Boolean)
        .join("\n\n")
    );

    setEligibilityPortals(
      Array.isArray(data.workflow_process.eligibility_verification_portals)
        ? data.workflow_process.eligibility_verification_portals
        : []
    );
  }

  // ---- BILLING GUIDELINES ----
  if (Array.isArray(data.billing_guidelines)) {
    setBillingGuidelines(
      data.billing_guidelines.map((g: any, i: number) => ({
        id: `bg_ai_${i}`,
        title: g?.title || `Guideline ${i + 1}`,
        description: g?.description || "",
      }))
    );
  }

  // ---- CODING RULES ----
  if (Array.isArray(data.coding_rules)) {
    setCodingRules(
      data.coding_rules.map((r: any, i: number) => ({
        id: `cr_ai_${i}`,
        cptCode: r.cptCode || "",
        description: r.description || "",
        ndcCode: r.ndcCode || "",
        units: r.units || "",
        chargePerUnit: r.chargePerUnit || "",
        modifier: r.modifier || "",
        replacementCPT: r.replacementCPT || "",
      }))
    );
  }
};

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
        { id: `bg${Date.now()}`, ...newGuideline },
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
    if (newCodingRule.cptCode.trim()) {
      setCodingRules([
        ...codingRules,
        { id: `cr${Date.now()}`, ...newCodingRule },
      ]);
      setNewCodingRule({
        cptCode: "",
        description: "",
        ndcCode: "",
        units: "",
        chargePerUnit: "",
        modifier: "",
        replacementCPT: "",
      });
    }
  };

  const handleRemoveCodingRule = (id: string) => {
    setCodingRules(codingRules.filter((r) => r.id !== id));
  };
  const normalizeBillingGuidelines = (input: any[]): BillingGuideline[] => {
    return input.map((g, i) => {
      if (typeof g === "string") {
        return {
          id: `bg_norm_${i}`,
          title: `Guideline ${i + 1}`,
          description: g,
        };
      }

      if (typeof g === "object" && g !== null) {
        return {
          id: g.id || `bg_norm_${i}`,
          title: g.title || `Guideline ${i + 1}`,
          description: g.description || "",
        };
      }

      return {
        id: `bg_norm_${i}`,
        title: `Guideline ${i + 1}`,
        description: "",
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
  superbill_source: workflowDescription,
  posting_charges_rules: postingCharges,
  eligibility_verification_portals: eligibilityPortals,
},
      billing_guidelines: billingGuidelines,
      coding_rules: codingRules,
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
        <div className={styles.titleSection}>
          <h1>{isEditMode ? "Edit SOP" : "Create New SOP"}</h1>
          <p>
            {isEditMode
              ? "Update standard operating procedure details"
              : "Define a new standard operating procedure"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.backButton}
            onClick={() => navigate("/sops")}
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save SOP"}
          </button>

          <button
            className={styles.saveButton}
            type="button"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? "Extracting..." : "Upload SOP"}
          </button>

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
                    <h4>{g.title}</h4>
                    <p>{g.description}</p>
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

          {/* Coding Guidelines */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Coding Guidelines</div>
            <div className={styles.helperText}>
              <div className={styles.codingRulesGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>CPT Code</label>
                  <input
                    className={styles.input}
                    value={newCodingRule.cptCode}
                    onChange={(e) =>
                      setNewCodingRule({
                        ...newCodingRule,
                        cptCode: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Description</label>
                  <input
                    className={styles.input}
                    value={newCodingRule.description}
                    onChange={(e) =>
                      setNewCodingRule({
                        ...newCodingRule,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>NDC Code</label>
                  <input
                    className={styles.input}
                    value={newCodingRule.ndcCode}
                    onChange={(e) =>
                      setNewCodingRule({
                        ...newCodingRule,
                        ndcCode: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Units</label>
                  <input
                    className={styles.input}
                    value={newCodingRule.units}
                    onChange={(e) =>
                      setNewCodingRule({
                        ...newCodingRule,
                        units: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Charge per Unit</label>
                  <input
                    className={styles.input}
                    value={newCodingRule.chargePerUnit}
                    onChange={(e) =>
                      setNewCodingRule({
                        ...newCodingRule,
                        chargePerUnit: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Modifier</label>
                  <input
                    className={styles.input}
                    value={newCodingRule.modifier}
                    onChange={(e) =>
                      setNewCodingRule({
                        ...newCodingRule,
                        modifier: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Replacement CPT</label>
                  <input
                    className={styles.input}
                    value={newCodingRule.replacementCPT}
                    onChange={(e) =>
                      setNewCodingRule({
                        ...newCodingRule,
                        replacementCPT: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>&nbsp;</label>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={handleAddCodingRule}
                  >
                    <Plus size={16} /> Add More
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.cardList}>
              {codingRules.map((r, i) => (
                <div key={i} className={styles.cardItem}>
                  <div className={styles.cardContent} style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#111827" }}>
                        CPT: {r.cptCode}
                      </span>
                      {r.description && (
                        <>
                          <span style={{ color: "#000" }}>|</span>
                          <span style={{ color: "#6b7280" }}>
                            Description: {r.description}
                          </span>
                        </>
                      )}
                      {r.ndcCode && (
                        <>
                          <span style={{ color: "#000" }}>|</span>
                          <span style={{ color: "#6b7280" }}>
                            NDC: {r.ndcCode}
                          </span>
                        </>
                      )}
                      {r.units && (
                        <>
                          <span style={{ color: "#000" }}>|</span>
                          <span style={{ color: "#6b7280" }}>
                            Units: {r.units}
                          </span>
                        </>
                      )}
                      {r.chargePerUnit && (
                        <>
                          <span style={{ color: "#000" }}>|</span>
                          <span style={{ color: "#6b7280" }}>
                            Charge/Unit: {r.chargePerUnit}
                          </span>
                        </>
                      )}
                      {r.modifier && (
                        <>
                          <span style={{ color: "#000" }}>|</span>
                          <span style={{ color: "#6b7280" }}>
                            Modifier: {r.modifier}
                          </span>
                        </>
                      )}
                      {r.replacementCPT && (
                        <>
                          <span style={{ color: "#000" }}>|</span>
                          <span style={{ color: "#6b7280" }}>
                            Replacement CPT: {r.replacementCPT}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleRemoveCodingRule(r.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSOP;
