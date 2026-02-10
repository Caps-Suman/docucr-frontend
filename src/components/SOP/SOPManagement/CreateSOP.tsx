import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Plus,
  X,
  Save,
  ArrowLeft,
  Trash2,
  RotateCcw,
  Upload,
  Edit2,
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
import Table from "../../Table/Table";
import CommonPagination from "../../Common/CommonPagination";
import { Check, CheckCircle2, ChevronRight, Circle, Briefcase, Loader2, Search } from "lucide-react";
import { debounce } from "../../../utils/debounce";
import Toast, { ToastType } from "../../Common/Toast";
import Loading from "../../Common/Loading";

const CreateSOP: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // --- State ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [providerType, setProviderType] = useState<"new" | "existing">("existing");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const location = useLocation();
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [selectedProvidersList, setSelectedProvidersList] = useState<any[]>([]);

  // --- Stepper State ---
  const [currentStep, setCurrentStep] = useState(1);

  // --- Client Selection State (Step 2) ---
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [clientPage, setClientPage] = useState(0);
  const [clientItemsPerPage, setClientItemsPerPage] = useState(10);
  const [totalClients, setTotalClients] = useState(0);
  // Reusing `clients` state for the list

  // --- Provider Selection State (Step 3) ---
  const [providerSearchTerm, setProviderSearchTerm] = useState("");
  const [debouncedProviderSearch, setDebouncedProviderSearch] = useState("");
  const [providerPage, setProviderPage] = useState(0);
  const [providerItemsPerPage, setProviderItemsPerPage] = useState(10);
  const [modalProviders, setModalProviders] = useState<any[]>([]);
  const [totalProviders, setTotalProviders] = useState(0);
  const [loadingProviders, setLoadingProviders] = useState(false);

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


  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

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
    // Initial fetch if needed, but Step 2 handles client loading now
    if (isEditMode && id) {
      loadSOP(id);
    }
  }, [id]);

  // Debounce Client Search
  useEffect(() => {
    const handler = debounce((term: string) => {
      setDebouncedClientSearch(term);
      setClientPage(0);
    }, 500);
    handler(clientSearchTerm);
  }, [clientSearchTerm]);

  // Debounce Provider Search
  useEffect(() => {
    const handler = debounce((term: string) => {
      setDebouncedProviderSearch(term);
      setProviderPage(0);
    }, 500);
    handler(providerSearchTerm);
  }, [providerSearchTerm]);

  // Load Clients when Step 1 is active (Client Selection)
  useEffect(() => {
    // If Step 1 is "Select Client", load clients
    if (getSteps().find(s => s.number === currentStep)?.title === "Select Client") {
      // Only trigger load if not already loaded (handled inside loadClientsPaginated now)
      loadClientsPaginated();
    }
  }, [currentStep]); // Remove dependencies that shouldn't trigger a RE-FETCH from API

  // Load Providers when Step 2 is active (Provider Selection) and client selected
  useEffect(() => {
    if (getSteps().find(s => s.number === currentStep)?.title === "Select Providers" && selectedClientId) {
      loadProvidersPaginated();
    }
  }, [currentStep, providerPage, providerItemsPerPage, debouncedProviderSearch, selectedClientId]);

  useEffect(() => {
    if (location.state?.clientId) {
      setProviderType("existing");
      setSelectedClientId(location.state.clientId);
      if (location.state.providerIds) {
        setProviderIds(location.state.providerIds);
        if (location.state.selectedProviders) {
          setSelectedProvidersList(location.state.selectedProviders);
        }
      }
    }
  }, [location.state]);

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
      if (sop.providers) {
        setProviderIds(sop.providers.map((p: any) => p.id));
        setSelectedProvidersList(sop.providers);
      }

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
  // State to store ALL fetched clients from the new API
  const [allClients, setAllClients] = useState<any[]>([]);

  // Ref to track if we are currently fetching to prevent duplicate calls
  const isFetchingClients = React.useRef(false);

  const fetchAllClients = async () => {
    if (isFetchingClients.current) return;
    isFetchingClients.current = true;

    try {
      setLoadingClients(true);
      const data = await clientService.getAllClients();
      setAllClients(data);
      setTotalClients(data.length);

      // Initialize view
      const startIndex = 0;
      const sliced = data.slice(startIndex, clientItemsPerPage);
      setClients(sliced as any);
    } catch (error) {
      console.error("Failed to load clients:", error);
    } finally {
      setLoadingClients(false);
      // We keep isFetchingClients true if successful? 
      // No, we should reset it, BUT since we check allClients.length > 0 in loadClientsPaginated, 
      // ensuring we don't fetch if data exists is key.
      // Resetting it allows re-fetch if we manually clear allClients.
      isFetchingClients.current = false;
    }
  };

  const loadClientsPaginated = async () => {
    // If we already have clients loaded, don't fetch again unless explicitly needed
    if (allClients.length > 0 || isFetchingClients.current) return;
    await fetchAllClients();
  };

  // Effect to handle client-side filtering/pagination when search/page changes
  useEffect(() => {
    // If we are using the bulk list (allClients has data)
    if (allClients.length > 0) {
      let filtered = allClients;
      if (debouncedClientSearch) {
        const lower = debouncedClientSearch.toLowerCase();
        filtered = allClients.filter(c =>
          c.name.toLowerCase().includes(lower) ||
          (c.npi && c.npi.includes(lower))
        );
      }

      setTotalClients(filtered.length);
      const startIndex = clientPage * clientItemsPerPage;
      const sliced = filtered.slice(startIndex, startIndex + clientItemsPerPage);
      setClients(sliced as any);
    } else if (currentStep === 1 && !loadingClients) {
      // If empty and step 1, maybe re-fetch? Or it's just empty.
    }
  }, [clientPage, clientItemsPerPage, debouncedClientSearch, allClients]);

  const loadProvidersPaginated = async () => {
    if (!selectedClientId) return;
    try {
      setLoadingProviders(true);
      const data = await clientService.getClientProviders(
        selectedClientId,
        providerPage + 1,
        providerItemsPerPage,
        debouncedProviderSearch
      );
      setModalProviders(data.providers);
      setTotalProviders(data.total);
    } catch (error) {
      console.error("Failed to load providers:", error);
    } finally {
      setLoadingProviders(false);
    }
  };

  const isIndividualClient = (c?: Client) => {
    const client = c || clients.find(cl => cl.id === selectedClientId);
    return client?.type === 'Individual';
  };

  const handleNextStep = () => {
    const steps = getSteps();
    const isLastStep = currentStep === steps.length;

    // Current Step 1: Client Selection
    if (currentStep === 1) {
      // Validate Client
      // If skipping/new provider -> Go to Basic Info (Step 3 or 2 depending on logic)
      // Actually, "New Provider" button inside Client Selection might just set providerType='new' and move to Basic Info?
      // Let's assume there is a 'Skip / New Provider' button in the Client Step.

      if (providerType === 'new') {
        // Skip Provider Selection, Go to Basic Info (which is next available step)
        // It will be the "Basic Information" step. 
        // In getSteps(), if selectedClientId is empty or new, step 2 (Providers) is NOT added. 
        // So Basic Info is Step 2.
        setCurrentStep(2);
        return;
      }

      if (!selectedClientId) {
        // setErrors(["Please select a client to proceed."]); // User asked for toast/alert
        // alert("Client selection is required");
        setToast({ message: "Client selection is required", type: "warning" });
        return;
      }

      // Valid client selected
      // We need to find the client object. 
      // Since we might be using allClients or clients, let's look it up properly.
      const client = (allClients.length > 0 ? allClients : clients).find(c => c.id === selectedClientId);

      if (client && client.type !== 'Individual') {
        // Go to Provider Selection (Step 2)
        setCurrentStep(2);
      } else {
        // Individual -> Skip Provider Selection
        setCurrentStep(2);
      }
    }
    // Current Step 2: Provider Selection (Only if visible)
    else if (currentStep === 2 && getSteps().find(s => s.number === 2)?.title === "Select Providers") {
      if (providerIds.length === 0) {
        setToast({ message: "Select atleast one provider", type: "warning" });
        return;
      }
      // Moving to Basic Info
      setCurrentStep(3);
    }
    // Step 2 or 3: Basic Information
    else if (getSteps().find(s => s.number === currentStep)?.title === "Basic Information") {
      if (validateStep1()) {
        setCurrentStep(currentStep + 1);
      }
    }
    // Preview
    else if (isLastStep) {
      return;
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateStep1 = () => {
    const newErrors: string[] = [];
    if (!title.trim()) newErrors.push("SOP Title is required");
    if (!category.trim()) newErrors.push("Category is required");
    if (!workflowDescription.trim()) newErrors.push("Workflow Description is required");

    if (providerType === "new") {
      if (!providerInfo.providerName.trim()) newErrors.push("Provider Name is required");
      if (!providerInfo.billingProviderNPI.trim()) {
        newErrors.push("Billing Provider NPI is required");
      } else if (!/^\d{10}$/.test(providerInfo.billingProviderNPI)) {
        newErrors.push("Billing Provider NPI must be exactly 10 digits");
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const getSteps = () => {
    const steps = [
      { number: 1, title: "Select Client", desc: "Choose a client" }
    ];

    // Step 2: Select Providers (Conditional)
    const client = (allClients.length > 0 ? allClients : clients).find(c => c.id === selectedClientId);
    let stepCount = 1;

    // Logic: 
    // If client is Organization AND has providers -> Show Provider Step
    // Otherwise -> Skip Provider Step

    if (client && client.type !== 'Individual' && (client.provider_count > 0)) {
      stepCount++;
      steps.push({ number: stepCount, title: "Select Providers", desc: "Link providers" });
    }

    // Step 3 (or 2): Basic Information
    steps.push({ number: stepCount + 1, title: "Basic Information", desc: "SOP details & workflow" });
    stepCount++;

    // Step 4 (or 3): Preview & Save
    steps.push({ number: stepCount + 1, title: "Preview & Save", desc: "Review details" });

    return steps;
  };

  // const loadClients = async () => ... REMOVED

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
    // Validate Basic Info (Step 1)
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    // Validate Client Selection (Step 2)
    if (providerType === "existing" && !selectedClientId) {
      setCurrentStep(2);
      setErrors(["Please select a client to proceed."]);
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
      provider_ids: providerIds,
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
            <ArrowLeft size={18} />
          </button>
          <div className={styles.titleSection}>
            <h1 style={{ marginTop: "5px" }}>{isEditMode ? "Edit SOP" : "Create New SOP"}</h1>
            {/* <p>
              Step {currentStep}: {getSteps().find(s => s.number === currentStep)?.title}
            </p> */}
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
          {/* Header Actions mainly for Reset/Cancel. Main Save/Next is in footer now? 
              The prompt says "Footer buttons: Back / Next". 
              I will keep the "Upload" button here in the header? 
              Upload is for filling Step 1. So it should probably be in Step 1 or Global.
              Let's keep it in the header for now.
          */}
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
              disabled={currentStep !== 1} // Only allow upload on step 1?
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
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Left Panel: Stepper */}
        <div className={styles.leftPanel}>
          <div className={styles.stepperContainer}>
            {getSteps().map((step) => {
              const isActive = step.number === currentStep;
              const isCompleted = step.number < currentStep;
              return (
                <div key={step.number} className={`${styles.stepItem} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}>
                  <div className={styles.stepIndicator}>
                    {isCompleted ? <Check color="white" size={18} /> : step.number}
                  </div>
                  <div className={styles.stepContent}>
                    <div className={styles.stepTitle}>{step.title}</div>
                    <div className={styles.stepDesc}>{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Content */}
        <div className={styles.rightPanel}>
          <div className={styles.scrollableContent}>
            {/* {errors.length > 0 && (
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
            )} */}

            {/* Step 1: Select Client */}
            {getSteps().find(s => s.number === currentStep)?.title === "Select Client" && (
              <div className={styles.stepContainer}>
                {/* ... Client Selection UI ... */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    className={styles.input}
                    style={{ paddingLeft: '32px' }}
                    placeholder="Search clients..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                  />
                </div>

                {loadingClients ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <Loading message="Loading Clients..." />
                  </div>
                ) : (
                  <Table
                    columns={[
                      {
                        key: 'select',
                        header: 'Select',
                        render: (_, row) => (
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: selectedClientId === row.id ? '5px solid #3b82f6' : '1px solid #cbd5e1',
                              cursor: isEditMode ? 'not-allowed' : 'pointer',
                              opacity: isEditMode ? 0.5 : 1
                            }}
                            onClick={(e) => {
                              if (isEditMode) return;
                              e.stopPropagation(); // Prevent row click if any
                              if (selectedClientId !== row.id) {
                                setProviderIds([]);
                                setSelectedProvidersList([]);
                              }
                              setSelectedClientId(row.id);
                              setProviderType("existing");
                            }}
                            title={isEditMode ? "Cannot change client during edit" : "Select Client"}
                          />
                        ),
                        width: '60px'
                      },
                      {
                        key: 'name',
                        header: 'Client Name',
                        render: (_, row) => (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500 }}>{row.name}</span>
                            {row.email && <span style={{ fontSize: '12px', color: '#64748b' }}>{row.email}</span>}
                          </div>
                        )
                      },
                      { key: 'type', header: 'Type' },
                      { key: 'npi', header: 'NPI', render: (v) => v || '-' },
                      {
                        key: 'provider_count',
                        header: 'Providers',
                        render: (v) => (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: 500
                          }}>
                            {v || '0'}
                          </div>
                        )
                      },
                    ]}
                    data={clients}
                    maxHeight="calc(100vh - 350px)"
                    stickyHeader
                  />
                )}

                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={styles.resetButton}
                      onClick={() => {
                        setSelectedClientId("");
                        setProviderType("new");
                      }}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Skip / New Provider
                    </button>
                  </div> */}
                  <CommonPagination
                    show={totalClients > 0}
                    pageCount={Math.ceil(totalClients / clientItemsPerPage)}
                    currentPage={clientPage}
                    totalItems={totalClients}
                    itemsPerPage={clientItemsPerPage}
                    onPageChange={(d) => setClientPage(d.selected)}
                    onItemsPerPageChange={(n) => setClientItemsPerPage(n)}
                    renderInPlace
                  />
                </div>
              </div>
            )}

            {/* Step 2: Select Providers (Conditional) */}
            {getSteps().find(s => s.number === currentStep)?.title === "Select Providers" && (
              <div className={styles.stepContainer}>
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    className={styles.input}
                    style={{ paddingLeft: '32px' }}
                    placeholder="Search providers..."
                    value={providerSearchTerm}
                    onChange={(e) => setProviderSearchTerm(e.target.value)}
                  />
                </div>

                {loadingProviders ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <Loading message="Loading Providers..." />
                  </div>
                ) : (
                  <Table
                    columns={[
                      {
                        key: 'select',
                        header: 'Select',
                        render: (_, row) => (
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              border: providerIds.includes(row.id) ? 'none' : '1px solid #cbd5e1',
                              backgroundColor: providerIds.includes(row.id) ? '#3b82f6' : 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={() => {
                              setProviderIds(prev =>
                                prev.includes(row.id)
                                  ? prev.filter(id => id !== row.id)
                                  : [...prev, row.id]
                              );
                              // Maintain selected providers list for preview
                              setSelectedProvidersList(prev => {
                                const exists = prev.find(p => p.id === row.id);
                                if (exists) return prev.filter(p => p.id !== row.id);
                                return [...prev, row];
                              });
                            }}
                          >
                            {providerIds.includes(row.id) && <Check size={12} color="white" />}
                          </div>
                        ),
                        width: '50px'
                      },
                      { key: 'name', header: 'Provider Name' },
                      { key: 'npi', header: 'NPI', render: (v) => v || '-' },
                      { key: 'type', header: 'Type' }
                    ]}
                    data={modalProviders}
                    maxHeight="calc(100vh - 350px)"
                    stickyHeader
                  />
                )}

                {!loadingProviders && (
                  <>
                    <div style={{ marginTop: '16px' }}>
                      <CommonPagination
                        show={totalProviders > 0}
                        pageCount={Math.ceil(totalProviders / providerItemsPerPage)}
                        currentPage={providerPage}
                        totalItems={totalProviders}
                        itemsPerPage={providerItemsPerPage}
                        onPageChange={(d) => setProviderPage(d.selected)}
                        onItemsPerPageChange={(n) => setProviderItemsPerPage(n)}
                        renderInPlace
                      />
                    </div>

                    <div style={{ marginTop: '16px', fontSize: '13px', color: '#64748b' }}>
                      Selected: {selectedProvidersList.length} providers
                    </div>
                  </>
                )}


              </div>
            )}

            {/* Step 3 (or 2): Basic Information */}
            {getSteps().find(s => s.number === currentStep)?.title === "Basic Information" && (

              <div className={styles.stepContainer}>

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

                {/* Basic Info Form */}
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

                  {/* If Existing Client Selected, show read-only info or select */}
                  {/* {providerType === "existing" && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Selected Client</label>
                      <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#64748b' }}>
                        {selectedClientId
                          ? (() => {
                            const c = (allClients.length > 0 ? allClients : clients).find(cl => cl.id === selectedClientId);
                            return c ? c.name : "Client Selected"; 
                          })()
                          : "No Client Selected (Using New Provider Mode)"
                        }
                      </div>
                    </div>
                  )} */}

                  <div className={styles.formGrid}>
                    {/* Always show provider fields, but maybe pre-filled? */}
                    {/* If new, editable. If existing, editable but pre-filled? */}

                    <>
                      {/* <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Provider Name *
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
                          disabled={providerType === 'existing'} 
                        />
                      </div> */}

                      {/* <div className={styles.formGroup}>
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
                          placeholder="10-digit NPI"
                          disabled={providerType === 'existing'}
                        />
                      </div> */}

                      {/* Additional Fields */}
                      {/* <div className={styles.formGroup}>
                        <label className={styles.label}>Provider Tax ID</label>
                        <input
                          className={styles.input}
                          value={providerInfo.providerTaxID}
                          onChange={(e) =>
                            setProviderInfo({
                              ...providerInfo,
                              providerTaxID: e.target.value,
                            })
                          }
                        />
                      </div> */}

                      {/* <div className={styles.formGroup}>
                        <label className={styles.label}>Practice Name</label>
                        <input
                          className={styles.input}
                          value={providerInfo.practiceName}
                          onChange={(e) =>
                            setProviderInfo({
                              ...providerInfo,
                              practiceName: e.target.value,
                            })
                          }
                        />
                      </div> */}



                      {/* Requested Fields */}
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
                    </>

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
                    {/* ... rest of workflow ... */}
                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                      <label className={styles.label}>Posting Charges Rules</label>
                      <textarea
                        className={styles.textarea}
                        value={postingCharges}
                        onChange={(e) => setPostingCharges(e.target.value)}
                        placeholder="Rules for posting charges..."
                      />
                    </div>

                    <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                      <label className={styles.label}>Eligibility Verification Portals</label>
                      <div className={styles.addWrapper}>
                        <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                          <input
                            className={styles.input}
                            value={newPortal}
                            onChange={(e) => setNewPortal(e.target.value)}
                            placeholder="Add portal URL or name..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddPortal();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className={styles.saveButton}
                            onClick={handleAddPortal}
                            style={{ minWidth: "auto", padding: "8px 12px" }}
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
                        placeholder="Enter guideline..."
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>&nbsp;</label>
                      <button
                        type="button"
                        className={styles.saveButton}
                        onClick={() => {
                          if (newPayerGuideline.payer_name && newPayerGuideline.description) {
                            setPayerGuidelines([...payerGuidelines, { ...newPayerGuideline, id: `pg_temp_${Date.now()}` }]);
                            setNewPayerGuideline({ payer_name: "", description: "" });
                          }
                        }}
                      >
                        <Plus size={16} /> Add
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
                          onClick={() => setPayerGuidelines(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Coding Rules */}
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Coding Rules</div>
                  {/* ... Coding Rules existing UI ... */}
                  <div className={styles.toggleGroup}>
                    <button
                      className={`${styles.toggleButton} ${codingType === "CPT" ? styles.active : ""}`}
                      onClick={() => setCodingType("CPT")}
                    >
                      CPT Codes
                    </button>
                    <button
                      className={`${styles.toggleButton} ${codingType === "ICD" ? styles.active : ""}`}
                      onClick={() => setCodingType("ICD")}
                    >
                      ICD Codes
                    </button>
                  </div>

                  <div className={styles.helperText}>
                    {codingType === "CPT" ? (
                      <div className={styles.formGridWithButton}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>CPT Code</label>
                          <input className={styles.input} value={newCpt.cptCode} onChange={e => setNewCpt({ ...newCpt, cptCode: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Description</label>
                          <input className={styles.input} value={newCpt.description} onChange={e => setNewCpt({ ...newCpt, description: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>&nbsp;</label>
                          <button type="button" className={styles.saveButton} onClick={handleAddCodingRule}>
                            <Plus size={16} /> Add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.formGridWithButton}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>ICD Code</label>
                          <input className={styles.input} value={newIcd.icdCode} onChange={e => setNewIcd({ ...newIcd, icdCode: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Description</label>
                          <input className={styles.input} value={newIcd.description} onChange={e => setNewIcd({ ...newIcd, description: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>&nbsp;</label>
                          <button type="button" className={styles.saveButton} onClick={handleAddCodingRule}>
                            <Plus size={16} /> Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardList}>
                    {codingType === "CPT" ? (
                      codingRulesCPT.map((r, i) => (
                        <div key={i} className={styles.cardItem}>
                          <div className={styles.cardContent}>
                            <h4>{r.cptCode}</h4>
                            <p>{r.description}</p>
                          </div>
                          <button className={styles.deleteButton} onClick={() => handleRemoveCpt(r.id!)}><Trash2 size={16} /></button>
                        </div>
                      ))
                    ) : (
                      codingRulesICD.map((r, i) => (
                        <div key={i} className={styles.cardItem}>
                          <div className={styles.cardContent}>
                            <h4>{r.icdCode}</h4>
                            <p>{r.description}</p>
                          </div>
                          <button className={styles.deleteButton} onClick={() => handleRemoveIcd(r.id!)}><Trash2 size={16} /></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>


              </div>
            )}

            {/* Step 4: Preview & Save */}
            {getSteps().find(s => s.number === currentStep)?.title === "Preview & Save" && (
              <div className={styles.stepContainer}>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Review & Submit</div>

                  {selectedClientId && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Selected Client</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Client">
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <div className={styles.previewGrid}>
                        {(() => {
                          const client = (allClients.length > 0 ? allClients : clients).find(c => c.id === selectedClientId);
                          return client ? (
                            <>
                              <div className={styles.previewItem}>
                                <label>Client Name</label>
                                <span>{client.name || (client.type === 'individual' ? `${client.first_name} ${client.last_name}` : client.business_name)}</span>
                              </div>
                              <div className={styles.previewItem}>
                                <label>NPI</label>
                                <span>{client.npi}</span>
                              </div>
                            </>
                          ) : <div>No client selected</div>;
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedProvidersList.length > 0 && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Selected Providers ({selectedProvidersList.length})</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(2)} title="Edit Providers">
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <ul className={styles.previewList}>
                        {selectedProvidersList.map(p => (
                          <li key={p.id}>{p.first_name} {p.last_name} <span className={styles.mutedText}>({p.npi})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={styles.previewSection}>
                    <div className={styles.previewHeaderRow}>
                      <h3 className={styles.previewHeader}>Basic Information</h3>
                      <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Basic Info">
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <div className={styles.previewGrid}>
                      <div className={styles.previewItem}>
                        <label>Title</label>
                        <span>{title}</span>
                      </div>
                      <div className={styles.previewItem}>
                        <label>Category</label>
                        <span>{category}</span>
                      </div>
                      <div className={styles.previewItem}>
                        <label>Provider Type</label>
                        <span>{providerType === 'new' ? 'New Provider' : 'Existing Client'}</span>
                      </div>
                    </div>
                  </div>

                  {providerType === 'new' && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Provider Information</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Provider Info">
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <div className={styles.previewGrid}>
                        <div className={styles.previewItem}>
                          <label>Name</label>
                          <span>{providerInfo.providerName}</span>
                        </div>
                        <div className={styles.previewItem}>
                          <label>NPI</label>
                          <span>{providerInfo.billingProviderNPI}</span>
                        </div>
                        <div className={styles.previewItem}>
                          <label>Software</label>
                          <span>{providerInfo.software || '-'}</span>
                        </div>
                        <div className={styles.previewItem}>
                          <label>Billing Address</label>
                          <span>{providerInfo.billingAddress || '-'}</span>
                        </div>
                        <div className={styles.previewItem}>
                          <label>Clearing house</label>
                          <span>{providerInfo.clearinghouse || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Workflow Process */}
                  <div className={styles.previewSection}>
                    <div className={styles.previewHeaderRow}>
                      <h3 className={styles.previewHeader}>Workflow Process</h3>
                      <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Workflow">
                        <Edit2 size={14} />
                      </button>
                    </div>
                    <div className={styles.previewItem} style={{ marginBottom: '12px' }}>
                      <label>Workflow Description</label>
                      <p className={styles.previewText}>{workflowDescription || '-'}</p>
                    </div>
                    <div className={styles.previewItem} style={{ marginBottom: '12px' }}>
                      <label>Posting Charges Rules</label>
                      <p className={styles.previewText}>{postingCharges || '-'}</p>
                    </div>
                    {eligibilityPortals.length > 0 && (
                      <div className={styles.previewItem}>
                        <label>Eligibility Verification Portals</label>
                        <ul className={styles.previewList}>
                          {eligibilityPortals.map((portal, i) => (
                            <li key={i}>{portal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Billing Guidelines */}
                  {billingGuidelines.length > 0 && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Billing Guidelines</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Billing Guidelines">
                          <Edit2 size={14} />
                        </button>
                      </div>
                      {billingGuidelines.map((bg, i) => (
                        <div key={i} className={styles.previewSubItem}>
                          <strong>{bg.category}</strong>
                          <ul className={styles.previewListBullet}>
                            {bg.rules?.map((r, j) => (
                              <li key={j}>{r.description}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Payer Guidelines */}
                  {payerGuidelines.length > 0 && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Payer Guidelines</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Payer Guidelines">
                          <Edit2 size={14} />
                        </button>
                      </div>
                      {payerGuidelines.map((pg, i) => (
                        <div key={i} className={styles.previewSubItem}>
                          <strong>{pg.payer_name}</strong>
                          <p>{pg.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coding Guidelines */}
                  {(codingRulesCPT.length > 0 || codingRulesICD.length > 0) && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Coding Guidelines</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Coding Guidelines">
                          <Edit2 size={14} />
                        </button>
                      </div>

                      {codingRulesCPT.length > 0 && (
                        <div className={styles.previewSubGroup}>
                          <h4 className={styles.previewSubHeader}>CPT Codes</h4>
                          <div className={styles.cardList}>
                            {codingRulesCPT.map((rule, i) => (
                              <div key={i} className={styles.previewCard}>
                                <div className={styles.cardContent}>
                                  <div><strong>{rule.cptCode}</strong> – {rule.description}</div>
                                  {rule.ndcCode && <div className={styles.mutedText}>NDC: {rule.ndcCode}</div>}
                                  {rule.units && <div className={styles.mutedText}>Units: {rule.units}</div>}
                                  {rule.chargePerUnit && <div className={styles.mutedText}>Charge: {rule.chargePerUnit}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {codingRulesICD.length > 0 && (
                        <div className={styles.previewSubGroup}>
                          <h4 className={styles.previewSubHeader}>ICD Codes</h4>
                          <div className={styles.cardList}>
                            {codingRulesICD.map((rule, i) => (
                              <div key={i} className={styles.previewCard}>
                                <div className={styles.cardContent}>
                                  <div><strong>{rule.icdCode}</strong> – {rule.description}</div>
                                  {rule.notes && <div className={styles.mutedText}>Notes: {rule.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* {selectedClientId && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Selected Client</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(1)} title="Edit Client">
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <div className={styles.previewGrid}>
                        {(() => {
                          const client = (allClients.length > 0 ? allClients : clients).find(c => c.id === selectedClientId);
                          return client ? (
                            <>
                              <div className={styles.previewItem}>
                                <label>Client Name</label>
                                <span>{client.name || (client.type === 'individual' ? `${client.first_name} ${client.last_name}` : client.business_name)}</span>
                              </div>
                              <div className={styles.previewItem}>
                                <label>NPI</label>
                                <span>{client.npi}</span>
                              </div>
                            </>
                          ) : <div>No client selected</div>;
                        })()}
                      </div>
                    </div>
                  )}

                  {selectedProvidersList.length > 0 && (
                    <div className={styles.previewSection}>
                      <div className={styles.previewHeaderRow}>
                        <h3 className={styles.previewHeader}>Selected Providers ({selectedProvidersList.length})</h3>
                        <button type="button" className={styles.editIcon} onClick={() => setCurrentStep(2)} title="Edit Providers">
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <ul className={styles.previewList}>
                        {selectedProvidersList.map(p => (
                          <li key={p.id}>{p.first_name} {p.last_name} <span className={styles.mutedText}>({p.npi})</span></li>
                        ))}
                      </ul>
                    </div>
                  )} */}

                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {currentStep == 1 && (
              <button
                className={styles.backButton}
                onClick={() => navigate("/sops")}
              >
                Close
              </button>
            )}

            {currentStep > 1 && (
              <button
                className={styles.backButton}
                onClick={handleBackStep}
              >
                Back
              </button>
            )}

            <button
              className={styles.saveButton}
              onClick={currentStep === getSteps().length ? handleSave : handleNextStep}
              disabled={saving}
            >
              {currentStep === getSteps().length ? (
                <>
                  <Save size={16} />
                  {/* {saving ? "Creating..." : "Create SOP"} */}
                  {saving ? "Saving..." : isEditMode ? "Update SOP" : "Create New SOP"}
                </>
              ) : (
                <>
                  Next <ChevronRight size={16} />
                </>
              )}
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default CreateSOP;
