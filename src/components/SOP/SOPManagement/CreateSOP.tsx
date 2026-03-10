import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  FileText,
  Hash,
  User,
  Users,
  MapPin,
  Activity,
  Stethoscope,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Download,
} from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import clientService, { Client } from "../../../services/client.service";
import ConfirmModal from "../../Common/ConfirmModal";
import {
  SOP,
  ProviderInfo,
  BillingGuideline,
  PayerGuidelines,
  CodingRule,
  CodingRuleCPT,
  CodingRuleICD,
  SOPDocument,
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
import ExtraDocumentsModal from "./ExtraDocumentsModal";

const truncateFileName = (name: string = "", maxLength: number = 25) => {
  if (name.length <= maxLength) return name;
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) return name.substring(0, maxLength - 3) + "...";
  const ext = name.substring(lastDot);
  const base = name.substring(0, lastDot);
  return base.substring(0, maxLength - ext.length - 3) + "..." + ext;
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
            source: r.source || "Manual"
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
              source: g.source || "Manual"
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

const CreateSOP: React.FC = () => {
  const navigate = useNavigate();
  const { id: sopId } = useParams();
  const id = sopId;
  const isEditMode = !!id;
  const [initialProviderIds, setInitialProviderIds] = useState<string[]>([]);
  // --- State ---
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [providerType, setProviderType] = useState<"new" | "existing">("existing");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const location = useLocation();
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [selectedProvidersList, setSelectedProvidersList] = useState<any[]>([]);
  const [expandCpt, setExpandCpt] = useState(true);
  const [expandIcd, setExpandIcd] = useState(true);

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
    PayerGuidelines[]
  >([]);

  const [newPayerGuideline, setNewPayerGuideline] = useState({
    title: "",
    description: "",
    payerId: "",
    eraStatus: "",
    ediStatus: "",
    tfl: "",
    networkStatus: "",
    mailingAddress: "",
  });
  const [extractedData, setExtractedData] = useState<any>(null);
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
    ndcCode: "",
    units: "",
    chargePerUnit: "",
    modifier: "",
    replacementCPT: "",
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
      ndcCode: "",
      units: "",
      chargePerUnit: "",
      modifier: "",
      replacementCPT: "",
    });


  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const [blockedProviders, setBlockedProviders] = useState<string[]>([]);
  type ExtractionMode =
    | "IDLE"
    | "EXTRACTING"
    | "READY";
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>("IDLE");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [documents, setDocuments] = useState<SOPDocument[]>([]);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const [isExtraDocsOpen, setIsExtraDocsOpen] = useState(false);
  const [isExtractingDocs, setIsExtractingDocs] = useState(false);
  const [mergedDocIds, setMergedDocIds] = useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { can } = usePermission();
  const [currentBackgroundSopId, setCurrentBackgroundSopId] = useState<string | null>(null);

  const applyExtractedSOP = useCallback((data: any, sourceName: string = 'AI Extracted') => {
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
    if (data.provider_information && (providerType === "new" || !isEditMode)) {
      if (!isEditMode) setProviderType("new");
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

    // ---- WORKFLOW ----
    if (data.workflow_process) {
      if (data.workflow_process.description) {
        setWorkflowDescription(prev => (prev && prev !== "Test" && !prev.includes(data.workflow_process.description)) 
          ? `${prev}\n\n${data.workflow_process.description}` 
          : data.workflow_process.description);
      }
      
      if (data.workflow_process.posting_charges_rules) {
        setPostingCharges(prev => (prev && !prev.includes(data.workflow_process.posting_charges_rules))
          ? `${prev}\n\n${data.workflow_process.posting_charges_rules}`
          : data.workflow_process.posting_charges_rules);
      }

      setEligibilityPortals(prev => {
        const newPortals = Array.isArray(data.workflow_process.eligibility_verification_portals)
          ? data.workflow_process.eligibility_verification_portals
          : [];
        return Array.from(new Set([...prev, ...newPortals]));
      });
    }

    // ---- BILLING GUIDELINES ----
    if (Array.isArray(data.billing_guidelines)) {
      setBillingGuidelines(prev => {
        const newGroups = normalizeBillingGuidelines(data.billing_guidelines).map(bg => ({
          ...bg,
          rules: bg.rules?.map(r => ({ ...r, source: sourceName }))
        }));
        
        let merged = [...prev];

        // Replace existing rules from the SAME source to avoid duplication
        merged = merged.map(group => ({
          ...group,
          rules: (group.rules || []).filter(r => r.source !== sourceName)
        })).filter(group => group.rules.length > 0 || newGroups.some(ng => ng.category.toLowerCase() === group.category.toLowerCase()));

        newGroups.forEach(newG => {
          const existing = merged.find(g => g.category.toLowerCase() === newG.category.toLowerCase());
          if (existing) {
            existing.rules = [...(existing.rules || []), ...(newG.rules || [])];
          } else {
            merged.push(newG);
          }
        });
        return merged;
      });
    }

    if (Array.isArray(data.payer_guidelines)) {
      setPayerGuidelines(prev => {
        const filtered = prev.filter(pg => pg.source !== sourceName);
        return [
          ...filtered,
          ...data.payer_guidelines.map((pg: any, i: number) => ({
            id: `pg_ai_${Date.now()}_${i}`,
            title: pg?.payerName || pg?.title || "Unknown",
            description: pg?.description || "",
            payerId: pg?.payerId || "",
            eraStatus: pg?.eraStatus || "",
            ediStatus: pg?.ediStatus || "",
            tfl: pg?.tfl || "",
            networkStatus: pg?.networkStatus || "",
            mailingAddress: pg?.mailingAddress || "",
            source: sourceName
          }))
        ];
      });
    }
    // ---- CODING RULES ----
    if (Array.isArray(data.coding_rules_cpt)) {
      setCodingRulesCPT(prev => {
        const filtered = prev.filter(r => r.source !== sourceName);
        return [
          ...filtered,
          ...data.coding_rules_cpt.map((c: any) => ({...c, source: sourceName}))
        ];
      });
    }

    if (Array.isArray(data.coding_rules_icd)) {
      setCodingRulesICD(prev => {
        const filtered = prev.filter(r => r.source !== sourceName);
        return [
          ...filtered,
          ...data.coding_rules_icd.map((c: any) => ({...c, source: sourceName}))
        ];
      });
    }
  }, [providerType, isEditMode]);
  const handleResetClick = () => {
    setIsResetModalOpen(true);
  };

  const handleExtraDocsClose = useCallback(() => setIsExtraDocsOpen(false), []);
  const extraDocumentsFiltered = useMemo(() => documents.filter(doc => doc.category !== "Source file"), [documents]);
  const onExtractionStateChangeStable = useCallback((extracting: boolean) => setIsExtractingDocs(extracting), []);
  
  const onUploadsCompleteStable = useCallback(async () => {
    if (!id) return;
    setToast({ message: "Documents uploaded successfully", type: "success" });
    // Refresh documents and merge newly processed ones
    try {
      const sop = await sopService.getSOPById(id);
      
      // 1. Identify newly processed documents
      const newlyProcessed = (sop.documents || []).filter(
        (doc: any) => doc.processed && !mergedDocIds.has(doc.id)
      );

      // 2. Incrementally merge each new doc into state
      newlyProcessed.forEach((doc: any) => {
        const sourceName = doc.name;
        // Reconstruct data structure expected by applyExtractedSOP
        const extractedData = {
          billing_guidelines: doc.billing_guidelines,
          payer_guidelines: doc.payer_guidelines,
          coding_rules_cpt: doc.coding_rules_cpt,
          coding_rules_icd: doc.coding_rules_icd,
        };
        applyExtractedSOP(extractedData, sourceName);
      });

      // 3. Update documents and tracking set
      setDocuments(sop.documents || []);
      if (newlyProcessed.length > 0) {
        setMergedDocIds(prev => {
          const next = new Set(prev);
          newlyProcessed.forEach(d => next.add(d.id));
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  }, [id, mergedDocIds, applyExtractedSOP]);

  const onDocumentDeletedStable = useCallback(async (docId: string, sourceName: string) => {
    if (!id) return;
    setToast({ message: "Document deleted successfully", type: "success" });
    
    // Remove any data that was extracted from this source
    setBillingGuidelines(prev => prev.map(bg => ({
      ...bg,
      rules: bg.rules?.filter(r => r.source !== sourceName)
    })).filter(bg => bg.rules && bg.rules.length > 0));

    setPayerGuidelines(prev => prev.filter(pg => pg.source !== sourceName));
    setCodingRulesCPT(prev => prev.filter(r => r.source !== sourceName));
    setCodingRulesICD(prev => prev.filter(r => r.source !== sourceName));

    // Remove from merged tracker
    setMergedDocIds(prev => {
      const next = new Set(prev);
      next.delete(docId);
      return next;
    });

    // Refresh documents after delete
    try {
      const sop = await sopService.getSOPById(id);
      setDocuments(sop.documents || []);
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  }, [id]);
  const isNavLocked = saving || extractionMode === "EXTRACTING";

  const confirmReset = () => {
    setTitle("");
    setCategory("");
    setProviderType("new");
    setSelectedClientId("");
    setSelectedClient(null);
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
    setNewPayerGuideline({
      title: "",
      description: "",
      payerId: "",
      eraStatus: "",
      ediStatus: "",
      tfl: "",
      networkStatus: "",
      mailingAddress: "",
    });
    setErrors([]);
    setIsResetModalOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (
      getSteps().find(s => s.number === currentStep)?.title === "Select Providers"
      && selectedClientId
    ) {
      loadProvidersPaginated();

      // ADD THIS
      sopService
        .checkProviders(selectedClientId, modalProviders.map(p => p.id))
        .then(res => setBlockedProviders(res.blocked_provider_ids || []))
        .catch(() => setBlockedProviders([]));
    }
  }, [currentStep]);
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
    if (!selectedClientId) return;

    if (
      getSteps().find(s => s.number === currentStep)?.title !== "Select Providers"
    ) return;

    if (!modalProviders.length) return;

    const ids = modalProviders.map(p => p.id);

    sopService
      .checkProviders(selectedClientId, ids, id) // pass sopId in edit mode
      .then(res => {
        setBlockedProviders(res.blocked_provider_ids || []);
      })
      .catch(() => setBlockedProviders([]));

  }, [modalProviders, selectedClientId, currentStep]);

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
  useEffect(() => {
    if (!currentBackgroundSopId) return;

    const interval = setInterval(async () => {
      try {
        const sop = await sopService.getSOPById(currentBackgroundSopId);

        if (sop.status?.code === "ACTIVE") {
          clearInterval(interval);
          navigate("/sops");
        }

      } catch (e) {
        console.error(e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentBackgroundSopId]);
  // useEffect(() => {
  //   if (!selectedClientId) return;

  //   const ids = providerIds;   // ✅ ONLY selected providers

  //   if (!ids.length) {
  //     setBlockedProviders([]);
  //     return;
  //   }

  //   // CREATE MODE
  //   if (!isEditMode) {
  //     sopService.checkProviders(selectedClientId, ids)
  //       .then(res => setBlockedProviders(res.blocked_provider_ids || []))
  //       .catch(() => setBlockedProviders([]));
  //     return;
  //   }

  //   // EDIT MODE → only validate if providers changed
  //   const hasChanged =
  //     JSON.stringify([...ids].sort()) !==
  //     JSON.stringify([...initialProviderIds].sort());

  //   if (!hasChanged) return;

  //   sopService.checkProviders(selectedClientId, ids, sopId)
  //     .then(res => setBlockedProviders(res.blocked_provider_ids || []))
  //     .catch(() => setBlockedProviders([]));

  // }, [providerIds, selectedClientId, sopId]);

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
      if (sop.clientId) {
        setSelectedClientId(sop.clientId);
        // Fetch client details for display
        clientService.getClient(sop.clientId).then(cl => setSelectedClient(cl)).catch(err => console.error("Failed to load client details", err));
      } else {
        setSelectedClientId("");
        setSelectedClient(null);
      }

      // Map JSONB fields back to state
      if (sop.providers) {
        setProviderIds(sop.providers.map((p: any) => p.id));
        setInitialProviderIds(sop.providers.map((p: any) => p.id));
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

      let loadedBillingGuidelines: any[] = sop.billingGuidelines ? normalizeBillingGuidelines(sop.billingGuidelines) : [];
      let loadedPayerGuidelines: any[] = sop.payerGuidelines ? sop.payerGuidelines.map((pg: any, i: number) => ({
        id: `pg_db_${i}`,
        title: pg.payerName || pg.title || "Unknown",
        description: pg.description || "",
        payerId: pg.payerId || "",
        eraStatus: pg.eraStatus || "",
        ediStatus: pg.ediStatus || "",
        tfl: pg.tfl || "",
        networkStatus: pg.networkStatus || "",
        mailingAddress: pg.mailingAddress || "",
        source: pg.source || "Manual"
      })) : [];
      let loadedCodingRulesCPT: any[] = sop.codingRulesCPT ? sop.codingRulesCPT.map((r: any) => ({ ...r, source: r.source || 'Manual' })) : [];
      let loadedCodingRulesICD: any[] = sop.codingRulesICD ? sop.codingRulesICD.map((r: any) => ({ ...r, source: r.source || 'Manual' })) : [];

      if (sop.documents) {
        sop.documents.forEach((doc: any, docIdx: number) => {
          if (doc.processed) {
            const sourceName = doc.category === "Source file" ? "source_file" : doc.name;

            if (doc.billing_guidelines) {
              const normalizedDocBg = normalizeBillingGuidelines(doc.billing_guidelines).map(bg => ({
                ...bg,
                rules: bg.rules?.map(r => ({ ...r, source: sourceName }))
              }));
              
              // Simple aggregation strategy for billing guidelines
              normalizedDocBg.forEach(docBg => {
                const existing = loadedBillingGuidelines.find(g => g.category.toLowerCase() === docBg.category.toLowerCase());
                if (existing) {
                  existing.rules = [...(existing.rules || []), ...(docBg.rules || [])];
                } else {
                  loadedBillingGuidelines.push(docBg);
                }
              });
            }

            if (doc.payer_guidelines) {
              doc.payer_guidelines.forEach((pg: any, i: number) => {
                loadedPayerGuidelines.push({
                   id: `pg_ext_${docIdx}_${i}`,
                   title: pg.payerName || pg.title || "Unknown",
                   description: pg.description || "",
                   payerId: pg.payerId || "",
                   eraStatus: pg.eraStatus || "",
                   ediStatus: pg.ediStatus || "",
                   tfl: pg.tfl || "",
                   networkStatus: pg.networkStatus || "",
                   mailingAddress: pg.mailingAddress || "",
                   source: sourceName
                });
              });
            }

            if (doc.coding_rules_cpt) {
                loadedCodingRulesCPT.push(...doc.coding_rules_cpt.map((c: any) => ({...c, source: sourceName})));
            }
            if (doc.coding_rules_icd) {
                loadedCodingRulesICD.push(...doc.coding_rules_icd.map((c: any) => ({...c, source: sourceName})));
            }
          }
        });
      }

      setBillingGuidelines(loadedBillingGuidelines);
      setPayerGuidelines(loadedPayerGuidelines);
      setCodingRulesCPT(loadedCodingRulesCPT);
      setCodingRulesICD(loadedCodingRulesICD);
      setDocuments(sop.documents || []);

      // Track which documents have already been merged into state
      const processedIds = (sop.documents || [])
        .filter((d: any) => d.processed)
        .map((d: any) => d.id);
      setMergedDocIds(new Set(processedIds));

    } catch (error) {
      console.error("Failed to load SOP:", error);
      // Handle error (e.g., redirect or show notification)
    } finally {
      setLoading(false);
    }
  };
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // const handleSOPBackgroundUpload = async (file: File) => {
  //   try {
  //     if (!selectedClientId) {
  //       alert("Please select a client before uploading.");
  //       return;
  //     }

  //     const controller = new AbortController();
  //     abortControllerRef.current = controller;

  //     setExtractionMode("FOREGROUND");

  //     const formData = new FormData();
  //     formData.append("file", file);
  //     formData.append("provider_type", providerType);
  //     formData.append("client_id", selectedClientId);
  //     providerIds.forEach(id => {
  //       formData.append("provider_ids", id);
  //     });

  //     const result = await sopService.backgroundUploadAndExtractSOP(
  //       formData,
  //       controller.signal
  //     );

  //     setCurrentBackgroundSopId(result.sop_id);

  //   } catch (err: any) {
  //     if (err.name === "CanceledError") {
  //       console.log("Upload cancelled");
  //     } else {
  //       console.error(err);
  //       alert("Failed to upload SOP");
  //     }
  //   } finally {
  //     abortControllerRef.current = null;
  //   }
  // };

  const handleForegroundExtraction = async (file: File) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setExtractionMode("EXTRACTING");

      const formData = new FormData();
      formData.append("file", file);

      const result = await sopService.extractSOPForeground(
        formData,
        controller.signal
      );

      applyExtractedSOP(result.extracted_data, "source_file");
      setExtractedData(result.extracted_data);

      // Only set READY if extraction actually succeeded
      setExtractionMode("READY");
      setTimeout(() => {
        setExtractionMode(prev => prev === "READY" ? "IDLE" : prev);
      }, 10000);

    } catch (err: any) {

      if (err.name === "AbortError") {
        console.log("Extraction cancelled");
        setExtractionMode("IDLE");   // IMPORTANT
      } else {
        console.error(err);
        setExtractionMode("IDLE");   // Reset on error
      }

    } finally {
      abortControllerRef.current = null;
    }
  };
  const [backgroundLoading, setBackgroundLoading] = useState(false);

  const moveToBackground = async () => {
    if (!uploadedFile) return;

    try {

      const res = await sopService.checkSOPExistence(
        selectedClientId,
        providerIds
      );

      if (res.exists) {
        setToast({
          message: "This client already has an SOP",
          type: "warning"
        });
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setBackgroundLoading(true);

      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("provider_type", providerType);
      formData.append("client_id", selectedClientId);

      providerIds.forEach(id => {
        formData.append("provider_ids", id);
      });

      const result = await sopService.backgroundUploadAndExtractSOP(formData);

      setCurrentBackgroundSopId(result.sop_id);

      navigate("/sops");

    } catch (err) {
      console.error(err);
      setBackgroundLoading(false);
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };



  const handleDownloadSourceFile = async () => {
    const sourceDoc = documents.find(doc => doc.category === "Source file");
    if (!id || !sourceDoc) return;
    try {
      setIsDownloadingSource(true);
      const filename = sourceDoc.name || sourceDoc.s3_key.split('/').pop() || 'source_file';
      await sopService.downloadSourceFile(id, filename);
      setToast({ message: "Source file downloaded successfully", type: "success" });
    } catch (error) {
      console.error("Failed to download source file:", error);
      setToast({ message: "Failed to download source file", type: "error" });
    } finally {
      setIsDownloadingSource(false);
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
  useEffect(() => {
    if (currentStep === 1) {
      loadClientsPaginated();
    }
  }, [currentStep]);
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

  const handleNextStep = async () => {
    const steps = getSteps();

    // STEP 1: Select Client
    if (currentStep === 1) {
      if (!selectedClientId) {
        setToast({
          message: "Please select a client",
          type: "warning",
        });
        return;
      }

      // Only validate in CREATE mode
      if (!isEditMode) {
        try {
          setLoading(true);

          const res = await sopService.checkSOPExistence(
            selectedClientId,
            providerIds
          );

          setLoading(false);

          if (res.exists) {
            setToast({
              message: "This client already has an SOP",
              type: "warning",
            });
            return;
          }

        } catch (err) {
          setLoading(false);
          setToast({
            message: "Failed to validate SOP existence",
            type: "error",
          });
          return;
        }
      }

      setCurrentStep(prev => prev + 1);
      return;
    }

    // STEP 2: Providers
    if (
      getSteps().find(s => s.number === currentStep)?.title === "Select Providers"
    ) {
      if (providerIds.length === 0) {
        setToast({
          message: "Select at least one provider",
          type: "warning",
        });
        return;
      }

      setCurrentStep(prev => prev + 1);
      return;
    }

    // STEP: Basic Information
    if (
      getSteps().find(s => s.number === currentStep)?.title === "Basic Information"
    ) {
      if (!validateStep1()) return;

      setCurrentStep(prev => prev + 1);
      return;
    }
  };

  // Only check in CREATE mode
  //   if (!isEditMode) {
  //     try {
  //       setLoading(true);

  //       // const res = await sopService.checkSOPExistence(selectedClientId, providerIds);

  //       setLoading(false);

  //       if (res.exists) {
  //         setToast({
  //           message: "This client already has an SOP.",
  //           type: "warning",
  //         });
  //         return; // 🚨 STOP HERE
  //       }
  //     } catch (err) {
  //       setLoading(false);
  //       setToast({
  //         message: "Failed to validate SOP existence.",
  //         type: "error",
  //       });
  //       return;
  //     }
  //   }

  //   setCurrentStep(2);
  //   return;
  // }
  //     else if (currentStep === 2 && getSteps().find(s => s.number === 2)?.title === "Select Providers") {
  //       if (providerIds.length === 0) {
  //         setToast({ message: "Select atleast one provider", type: "warning" });
  //         return;
  //       }
  //       setCurrentStep(3);
  //     }
  //     // Step 2 or 3: Basic Information
  //     else if (getSteps().find(s => s.number === currentStep)?.title === "Basic Information") {
  //       if (validateStep1()) {
  //         setCurrentStep(currentStep + 1);
  //       }
  //     }
  //     // Preview
  //     else if (isLastStep) {
  //       return;
  //     }
  //   };

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

    // if (providerType === "new") {
    //   if (!providerInfo.providerName.trim()) newErrors.push("Provider Name is required");
    //   if (!providerInfo.billingProviderNPI.trim()) {
    //     newErrors.push("Billing Provider NPI is required");
    //   } else if (!/^\d{10}$/.test(providerInfo.billingProviderNPI)) {
    //     newErrors.push("Billing Provider NPI must be exactly 10 digits");
    //   }
    // }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const getSteps = () => {
    const steps = [
      { number: 1, title: "Select Client", desc: "Choose a client" }
    ];

    const client = (allClients.length > 0 ? allClients : clients)
      .find(c => c.id === selectedClientId);

    let stepCount = 1;

    // Step 2: Select Providers (only if organization with providers)
    if (client && client.type !== 'Individual' && client.provider_count > 0) {
      stepCount++;
      steps.push({
        number: stepCount,
        title: "Select Providers",
        desc: "Link providers"
      });
    }

    // Basic Information step
    stepCount++;
    steps.push({
      number: stepCount,
      title: "Basic Information",
      desc: "SOP details & workflow"
    });

    // 🚫 DO NOT add Preview step in edit mode
    if (!isEditMode) {
      stepCount++;
      steps.push({
        number: stepCount,
        title: "Preview & Save",
        desc: "Review details"
      });
    }

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
      const newEntry = {
        id: `bg_${Date.now()}`,
        category: newGuideline.title,
        rules: [
          {
            id: `rule_${Date.now()}`,
            description: newGuideline.description,
            source: 'Manual',
          },
        ],
      };

      setBillingGuidelines(prev => [newEntry, ...prev]); // 🔥 prepend

      setNewGuideline({ title: "", description: "" });
    }
  };

  const handleRemoveGuideline = (id: string | undefined, index: number) => {
    setBillingGuidelines(
      billingGuidelines.filter((_, i) => i !== index),
    );
  };

  const handleAddCodingRule = () => {
    if (codingType === "CPT" && newCpt.cptCode.trim()) {
      setCodingRulesCPT(prev => [
        { id: `cpt_${Date.now()}`, ...newCpt, source: 'Manual' },
        ...prev
      ]);
      resetCpt();
    }

    if (codingType === "ICD" && newIcd.icdCode.trim()) {
      setCodingRulesICD(prev => [
        { id: `icd_${Date.now()}`, ...newIcd, source: 'Manual' },
        ...prev
      ]);
      resetIcd();
    }
  };
  const handleRemoveCpt = (index: number) => {
    setCodingRulesCPT(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveIcd = (index: number) => {
    setCodingRulesICD(prev => prev.filter((_, i) => i !== index));
  };



  const handleSave = async () => {
    if (saving) return; // Guard against multiple triggers

    // Validate Basic Info (Section that contains Title, Category, Workflow)
    if (!validateStep1()) {
      const basicInfoStep = getSteps().find(s => s.title === "Basic Information")?.number || 1;
      setCurrentStep(basicInfoStep);
      return;
    }

    // Validate Client Selection
    if (providerType === "existing" && !selectedClientId) {
      const selectClientStep = getSteps().find(s => s.title === "Select Client")?.number || 1;
      setCurrentStep(selectClientStep);
      setErrors(["Please select a client to proceed."]);
      return;
    }

    setSaving(true); // Set saving immediately after validation
    const res = await sopService.checkProviders(selectedClientId, providerIds, id);

    if (res.blocked_provider_ids?.length) {
      setToast({ message: "Some providers already have SOP", type: "warning" });
      return;
    }

    // Send all guidelines (manual + extracted) to the backend
    // The backend will now split and sync them between SOP table and SOPDocument table
    const allBillingGuidelines = billingGuidelines.map(bg => ({
      category: bg.category,
      rules: (bg.rules ?? []).map(r => ({
        description: r.description,
        source: r.source || 'Manual'
      }))
    })).filter(bg => (bg.rules || []).length > 0);

    const allPayerGuidelines = payerGuidelines
      .filter(pg => pg.title && pg.title.trim())
      .map(pg => ({
        payerName: pg.title,
        description: pg.description || "",
        payerId: pg.payerId || "",
        eraStatus: pg.eraStatus || "",
        ediStatus: pg.ediStatus || "",
        tfl: pg.tfl || "",
        networkStatus: pg.networkStatus || "",
        mailingAddress: pg.mailingAddress || "",
        source: pg.source || 'Manual'
      }));

    const allCodingRulesCPT = codingRulesCPT.map(r => ({
      ...r,
      source: r.source || 'Manual'
    }));

    const allCodingRulesICD = codingRulesICD.map(r => ({
      ...r,
      source: r.source || 'Manual'
    }));

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
      billing_guidelines: allBillingGuidelines,
      payer_guidelines: allPayerGuidelines,
      coding_rules_cpt: allCodingRulesCPT,
      coding_rules_icd: allCodingRulesICD,
      provider_ids: providerIds,
    };

    try {
      let savedSop;
      if (isEditMode && id) {
        savedSop = await sopService.updateSOP(id, payload);
      } else {
        savedSop = await sopService.createSOP(payload);
      }

      // If we have an uploaded file (foreground extraction), upload it now
      if (uploadedFile && savedSop.id) {
        try {
          await sopService.uploadSOPDocument(savedSop.id, uploadedFile, "Source file", extractedData);
        } catch (uploadError) {
          console.error("Failed to upload source file after save:", uploadError);
          setToast({ message: "SOP saved, but source file upload failed", type: "error" });
          // We still navigate away as the SOP itself is saved
        }
      }

      navigate("/sops");
    } catch (error) {
      console.error("Failed to save SOP:", error);
      // Here you might want to set a general error state or show a toast
    } finally {
      setSaving(false);
    }
  };

  const sourceFile = uploadedFile || documents.find(doc => doc.category === "Source file");

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate("/sops")}
            title="Back to List"
            disabled={uploading}
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
            disabled={saving || extractionMode === "EXTRACTING"}
          >
            <RotateCcw size={16} />
            Reset
          </button>
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
                    onRowClick={(row) => {
                      if (isEditMode) return;
                      if (selectedClientId !== row.id) {
                        setProviderIds([]);
                        setSelectedProvidersList([]);
                      }
                      setSelectedClientId(row.id);
                      setSelectedClient(row);
                      setProviderType("existing");
                    }}
                    columns={[
                      {
                        key: 'select',
                        header: 'Select',
                        render: (_, row) => {
                          const isSelected = selectedClientId === row.id;
                          return (
                            <div
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                border: isSelected ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                backgroundColor: isSelected ? '#3b82f6' : 'white',
                                cursor: isEditMode ? 'not-allowed' : 'pointer',
                                opacity: isEditMode ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title={isEditMode ? "Cannot change client during edit" : "Select Client"}
                            >
                              {isSelected && <Check size={12} color="white" />}
                            </div>
                          );
                        },
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    onRowClick={(row) => {
                      const isBlocked = blockedProviders.includes(row.id);
                      if (isBlocked) return;

                      setProviderIds(prev =>
                        prev.includes(row.id)
                          ? prev.filter(id => id !== row.id)
                          : [...prev, row.id]
                      );

                      setSelectedProvidersList(prev => {
                        const exists = prev.find(p => p.id === row.id);
                        if (exists) return prev.filter(p => p.id !== row.id);
                        return [...prev, row];
                      });
                    }}
                    columns={[
                      {
                        key: 'select',
                        header: 'Select',
                        width: '50px',
                        render: (_: any, row: any) => {
                          const isBlocked = blockedProviders.includes(row.id);
                          const isSelected = providerIds.includes(row.id);

                          return (
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                border: isBlocked
                                  ? '2px solid #ef4444'
                                  : isSelected
                                    ? '2px solid #3b82f6'
                                    : '1px solid #cbd5e1',
                                backgroundColor: isBlocked
                                  ? '#fee2e2'
                                  : isSelected
                                    ? '#3b82f6'
                                    : 'white',
                                cursor: isBlocked ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title={
                                isBlocked
                                  ? "This provider already has an SOP"
                                  : ""
                              }
                            >
                              {isBlocked && (
                                <X size={12} color="#ef4444" />
                              )}

                              {!isBlocked && isSelected && (
                                <Check size={12} color="white" />
                              )}
                            </div>
                          );
                        }
                      },
                      { key: 'name', header: 'Provider Name' },
                      { key: 'npi', header: 'NPI', render: (v: any) => v || '-' },
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
                <div style={{ display: "none" }}>
                  {/* Elements moved to header */}
                </div>
                {errors.length > 0 && (
                  <div
                    style={{
                      border: "1px solid #f87171",
                      backgroundColor: "#fef2f2",
                      padding: "16px",
                      borderRadius: "8px",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        color: "#b91c1c",
                        fontWeight: 600,
                        fontSize: "14px",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>Please fix the following errors:</span>
                    </div>
                    <ul
                      style={{
                        listStyle: "disc",
                        paddingLeft: "32px",
                        color: "#b91c1c",
                        margin: 0,
                        fontSize: "13px",
                      }}
                    >
                      {errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Display Selected Client & Provider Info */}
                <div className={styles.selectionSummary}>
                  {/* Client Info */}
                  <div className={styles.summarySection}>
                    <div className={styles.summaryLabel}>
                      <User size={14} /> Selected Client
                    </div>
                    {selectedClient ? (
                      <div className={styles.summaryContent}>
                        <div className={styles.summaryValue}>
                          {selectedClient.name || selectedClient.business_name || `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim() || 'Unknown Client'}
                        </div>
                        <div className={styles.summarySubValue}>
                          <Hash size={12} /> NPI: {selectedClient.npi || '-'}
                        </div>
                        {selectedClient.email && (
                          <div className={styles.summarySubValue}>
                            {selectedClient.email}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.mutedText}>No client selected</div>
                    )}
                  </div>

                  {/* Provider Info */}
                  {selectedProvidersList.length > 0 && (
                    <div className={styles.summarySection} style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '40px' }}>
                      <div className={styles.summaryLabel}>
                        <Users size={14} /> Selected Providers ({selectedProvidersList.length})
                      </div>
                      <div className={styles.providerList}>
                        {selectedProvidersList.slice(0, 3).map(p => (
                          <div key={p.id} className={styles.providerItem}>
                            <span>{p.name}</span>
                            <span className={styles.mutedText} style={{ fontSize: '11px' }}>NPI: {p.npi || 'N/A'}</span>
                          </div>
                        ))}
                        {selectedProvidersList.length > 3 && (
                          <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, textAlign: 'right' }}>
                            + {selectedProvidersList.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.guidelineGrid}>
                    {(() => {
                      const manualBilling = billingGuidelines.map(bg => ({
                        ...bg,
                        rules: (bg.rules ?? []).filter(r => r.source === 'Manual')
                      })).filter(bg => bg.rules.length > 0);

                      const extractedBilling = billingGuidelines.map(bg => ({
                        ...bg,
                        rules: (bg.rules ?? []).filter(r => r.source && r.source !== 'Manual')
                      })).filter(bg => bg.rules.length > 0);

                      return (
                        <>
                          {manualBilling.length > 0 && (
                            <div className={`${styles.sourceGroup} ${styles.manualSourceGroup}`}>
                              <div className={styles.sourceGroupHeader}>
                                <FileText size={14} style={{ color: '#3b82f6' }} />
                                <span className={styles.manualSourceTitle}>Manual Entry</span>
                              </div>
                              {manualBilling.map((g, i) => (
                                <div key={i} className={styles.guidelineItem} style={{ marginBottom: '12px' }}>
                                  <div className={styles.guidelineHeader}>
                                    <h4><Stethoscope size={16} /> {g.category}</h4>
                                    <button
                                      className={styles.deleteButton}
                                      onClick={() => handleRemoveGuideline(g.id, i)}
                                      title="Remove Category"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                  <div className={styles.guidelineBody}>
                                    <div className={styles.guidelinePoints}>
                                      {g.rules.map((r, j) => (
                                        <div key={j} className={styles.guidelinePoint}>
                                          <CheckCircle2 size={14} className={styles.pointIcon} style={{ marginTop: '3px' }} />
                                          <span>{r.description}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {extractedBilling.length > 0 && (
                            <div className={`${styles.sourceGroup} ${styles.extractedSourceGroup}`}>
                              <div className={styles.sourceGroupHeader}>
                                <FileText size={14} style={{ color: '#0284c7' }} />
                                <span className={styles.extractedSourceTitle}>Extracted from Documents</span>
                              </div>
                              {extractedBilling.map((g, i) => {
                                const uniqueSources = Array.from(new Set(g.rules.map(r => r.source).filter(Boolean)));
                                return (
                                  <div key={i} className={styles.guidelineItem} style={{ marginBottom: i === extractedBilling.length - 1 ? '0' : '12px' }}>
                                    <div className={styles.guidelineHeader}>
                                      <h4><Stethoscope size={16} /> {g.category}</h4>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {uniqueSources.length > 0 && (
                                          <span className={styles.sourceBadgeExtracted}>
                                            {uniqueSources.map(src => src === 'source_file' ? `Source file: ${uploadedFile?.name || documents.find(d => d.category === 'Source file')?.name || 'Unknown'}` : src).join(', ')}
                                          </span>
                                        )}
                                        <button
                                          className={styles.deleteButton}
                                          onClick={() => handleRemoveGuideline(g.id, i)}
                                          title="Remove Category"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className={styles.guidelineBody}>
                                      <div className={styles.guidelinePoints}>
                                        {g.rules.map((r, j) => (
                                          <div key={j} className={styles.guidelinePoint}>
                                            <CheckCircle2 size={14} className={styles.pointIcon} style={{ marginTop: '3px' }} />
                                            <span>{r.description}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {/* Payer Guidelines */}
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Payer Guidelines</div>

                  <div className={styles.payerFormContainer}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Title</label>
                      <input
                        className={styles.input}
                        value={newPayerGuideline.title}
                        onChange={(e) =>
                          setNewPayerGuideline({
                            ...newPayerGuideline,
                            title: e.target.value,
                          })
                        }
                        placeholder="e.g., Medicare, Aetna"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Payer ID</label>
                      <input
                        className={styles.input}
                        value={newPayerGuideline.payerId}
                        onChange={(e) =>
                          setNewPayerGuideline({
                            ...newPayerGuideline,
                            payerId: e.target.value,
                          })
                        }
                        placeholder="e.g., 60054"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>ERA Status</label>
                      <input
                        className={styles.input}
                        value={newPayerGuideline.eraStatus}
                        onChange={(e) =>
                          setNewPayerGuideline({
                            ...newPayerGuideline,
                            eraStatus: e.target.value,
                          })
                        }
                        placeholder="e.g., Completed"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>EDI Status</label>
                      <input
                        className={styles.input}
                        value={newPayerGuideline.ediStatus}
                        onChange={(e) =>
                          setNewPayerGuideline({
                            ...newPayerGuideline,
                            ediStatus: e.target.value,
                          })
                        }
                        placeholder="e.g., Form Submitted"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>TFL</label>
                      <input
                        className={styles.input}
                        value={newPayerGuideline.tfl}
                        onChange={(e) =>
                          setNewPayerGuideline({
                            ...newPayerGuideline,
                            tfl: e.target.value,
                          })
                        }
                        placeholder="e.g., 120 days"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Network Status</label>
                      <input
                        className={styles.input}
                        value={newPayerGuideline.networkStatus}
                        onChange={(e) =>
                          setNewPayerGuideline({
                            ...newPayerGuideline,
                            networkStatus: e.target.value,
                          })
                        }
                        placeholder="e.g., INN, OON"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Mailing Address</label>
                      <input
                        className={styles.input}
                        value={newPayerGuideline.mailingAddress}
                        onChange={(e) =>
                          setNewPayerGuideline({
                            ...newPayerGuideline,
                            mailingAddress: e.target.value,
                          })
                        }
                        placeholder="Claims mailing address..."
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
                        placeholder="Enter guideline description..."
                      />
                    </div>

                    <div className={styles.actionArea}>
                      <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => {
                          if (newPayerGuideline.title) {
                            setPayerGuidelines(prev => [
                              { ...newPayerGuideline, id: `pg_temp_${Date.now()}`, source: 'Manual' },
                              ...prev
                            ]);
                            setNewPayerGuideline({
                              title: "",
                              description: "",
                              payerId: "",
                              eraStatus: "",
                              ediStatus: "",
                              tfl: "",
                              networkStatus: "",
                              mailingAddress: "",
                            });
                          }
                        }}
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>

                  <div className={styles.cardList}>
                    {(() => {
                      const manualPayer = payerGuidelines.filter(pg => pg.source === 'Manual');
                      const extractedPayer = payerGuidelines.filter(pg => pg.source && pg.source !== 'Manual');

                      // Group extracted by source
                      const groupedExtracted = extractedPayer.reduce((acc, pg) => {
                        const src = pg.source || 'Unknown Source';
                        if (!acc[src]) acc[src] = [];
                        acc[src].push(pg);
                        return acc;
                      }, {} as Record<string, typeof extractedPayer>);

                      // Sort each group by payer title
                      Object.values(groupedExtracted).forEach(docs => {
                        docs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                      });
                      
                      manualPayer.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

                      return (
                        <>
                          {manualPayer.length > 0 && (
                            <div className={`${styles.sourceGroup} ${styles.manualSourceGroup}`}>
                              <div className={styles.sourceGroupHeader}>
                                <FileText size={14} style={{ color: '#3b82f6' }} />
                                <span className={styles.manualSourceTitle}>Manual Entry</span>
                              </div>
                              <div className={styles.cardList}>
                                {manualPayer.map((pg, i) => (
                                  <div key={pg.id || i} className={styles.cardItem}>
                                    <div className={styles.cardContent}>
                                      <div className={styles.codingMetaGrid}>
                                        <div className={styles.metaItem}>
                                          <span className={styles.metaLabel}>Payer Name:</span>
                                          <span className={styles.metaValue}>{pg.title}</span>
                                        </div>
                                        {pg.description && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Description:</span>
                                            <span className={styles.metaValue}>{pg.description}</span>
                                          </div>
                                        )}
                                        {pg.payerId && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Payer ID:</span>
                                            <span className={styles.metaValue}>{pg.payerId}</span>
                                          </div>
                                        )}
                                        {pg.eraStatus && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>ERA Status:</span>
                                            <span className={styles.metaValue}>{pg.eraStatus}</span>
                                          </div>
                                        )}
                                        {pg.ediStatus && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>EDI Status:</span>
                                            <span className={styles.metaValue}>{pg.ediStatus}</span>
                                          </div>
                                        )}
                                        {pg.tfl && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>TFL:</span>
                                            <span className={styles.metaValue}>{pg.tfl}</span>
                                          </div>
                                        )}
                                        {pg.networkStatus && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Network:</span>
                                            <span className={styles.metaValue}>{pg.networkStatus}</span>
                                          </div>
                                        )}
                                        {pg.mailingAddress && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Mailing Address:</span>
                                            <span className={styles.metaValue}>{pg.mailingAddress}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      className={styles.deleteButton}
                                      onClick={() => setPayerGuidelines(prev => prev.filter((_, idx) => idx !== payerGuidelines.indexOf(pg)))}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {Object.entries(groupedExtracted).map(([source, docs], groupIdx) => (
                            <div key={groupIdx} className={`${styles.sourceGroup} ${styles.extractedSourceGroup}`}>
                              <div className={styles.sourceGroupHeader}>
                                <FileText size={14} style={{ color: '#0284c7' }} />
                                <span className={styles.extractedSourceTitle}>
                                  {source === 'source_file' ? `Source file: ${uploadedFile?.name || documents.find(d => d.category === 'Source file')?.name || 'Main Document'}` : source}
                                </span>
                              </div>
                              <div className={styles.cardList}>
                                {docs.map((pg, i) => (
                                  <div key={pg.id || i} className={styles.cardItem}>
                                    <div className={styles.cardContent}>
                                      <div className={styles.codingMetaGrid}>
                                        <div className={styles.metaItem}>
                                          <span className={styles.metaLabel}>Payer Name:</span>
                                          <span className={styles.metaValue}>{pg.title}</span>
                                        </div>
                                        {pg.description && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Description:</span>
                                            <span className={styles.metaValue}>{pg.description}</span>
                                          </div>
                                        )}
                                        {pg.payerId && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Payer ID:</span>
                                            <span className={styles.metaValue}>{pg.payerId}</span>
                                          </div>
                                        )}
                                        {pg.eraStatus && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>ERA Status:</span>
                                            <span className={styles.metaValue}>{pg.eraStatus}</span>
                                          </div>
                                        )}
                                        {pg.ediStatus && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>EDI Status:</span>
                                            <span className={styles.metaValue}>{pg.ediStatus}</span>
                                          </div>
                                        )}
                                        {pg.tfl && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>TFL:</span>
                                            <span className={styles.metaValue}>{pg.tfl}</span>
                                          </div>
                                        )}
                                        {pg.networkStatus && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Network:</span>
                                            <span className={styles.metaValue}>{pg.networkStatus}</span>
                                          </div>
                                        )}
                                        {pg.mailingAddress && (
                                          <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>Mailing Address:</span>
                                            <span className={styles.metaValue}>{pg.mailingAddress}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      className={styles.deleteButton}
                                      onClick={() => setPayerGuidelines(prev => prev.filter((_, idx) => idx !== payerGuidelines.indexOf(pg)))}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>


                <div className={styles.section}>

                  <div className={styles.sectionHeaderRow}>
                    <div className={styles.sectionHeaderTitle}>Coding Guidelines</div>
                    <div className={styles.toggleGroupCompact}>
                      <button
                        className={`${styles.toggleButtonCompact} ${codingType === "CPT" ? styles.active : ""}`}
                        onClick={() => setCodingType("CPT")}
                      >
                        <FileText size={14} />
                        CPT Codes
                      </button>
                      <button
                        className={`${styles.toggleButtonCompact} ${codingType === "ICD" ? styles.active : ""}`}
                        onClick={() => setCodingType("ICD")}
                      >
                        <Hash size={14} />
                        ICD Codes
                      </button>
                    </div>
                  </div>

                  <div className={styles.helperText}>
                    <div className={styles.codingRulesGrid}>

                      {codingType === "CPT" ? (
                        <div className={`${styles.formGroup} ${styles.gridSpan2}`}>
                          <label className={styles.label}>CPT Code</label>
                          <input
                            className={styles.input}
                            value={newCpt.cptCode}
                            onChange={(e) =>
                              setNewCpt({
                                ...newCpt,
                                cptCode: e.target.value,
                              })
                            }
                          />
                        </div>
                      ) : (
                        <div className={`${styles.formGroup} ${styles.gridSpan2}`}>
                          <label className={styles.label}>ICD Code</label>
                          <input
                            className={styles.input}
                            value={newIcd.icdCode}
                            onChange={(e) =>
                              setNewIcd({ ...newIcd, icdCode: e.target.value })
                            }
                          />
                        </div>
                      )}

                      <div className={`${styles.formGroup} ${styles.gridSpan2}`}>
                        <label className={styles.label}>NDC Code</label>
                        <input
                          className={styles.input}
                          value={codingType === "CPT" ? newCpt.ndcCode : newIcd.ndcCode || ""}
                          onChange={(e) =>
                            codingType === "CPT"
                              ? setNewCpt({ ...newCpt, ndcCode: e.target.value })
                              : setNewIcd({ ...newIcd, ndcCode: e.target.value })
                          }
                        />
                      </div>
                      <div className={`${styles.formGroup} ${styles.gridSpan2}`}>
                        <label className={styles.label}>Units</label>
                        <input
                          className={styles.input}
                          value={codingType === "CPT" ? newCpt.units : newIcd.units || ""}
                          onChange={(e) =>
                            codingType === "CPT"
                              ? setNewCpt({ ...newCpt, units: e.target.value })
                              : setNewIcd({ ...newIcd, units: e.target.value })
                          }
                        />
                      </div>
                      <div className={`${styles.formGroup} ${styles.gridSpan2}`}>
                        <label className={styles.label}>Charge per Unit</label>
                        <input
                          className={styles.input}
                          value={codingType === "CPT" ? newCpt.chargePerUnit : newIcd.chargePerUnit || ""}
                          onChange={(e) =>
                            codingType === "CPT"
                              ? setNewCpt({ ...newCpt, chargePerUnit: e.target.value })
                              : setNewIcd({ ...newIcd, chargePerUnit: e.target.value })
                          }
                        />
                      </div>
                      <div className={`${styles.formGroup} ${styles.gridSpan2}`}>
                        <label className={styles.label}>Modifier</label>
                        <input
                          className={styles.input}
                          value={codingType === "CPT" ? newCpt.modifier : newIcd.modifier || ""}
                          onChange={(e) =>
                            codingType === "CPT"
                              ? setNewCpt({ ...newCpt, modifier: e.target.value })
                              : setNewIcd({ ...newIcd, modifier: e.target.value })
                          }
                        />
                      </div>
                      <div className={`${styles.formGroup} ${styles.gridSpan2}`}>
                        <label className={styles.label}>Replacement CPT</label>
                        <input
                          className={styles.input}
                          value={codingType === "CPT" ? newCpt.replacementCPT : newIcd.replacementCPT || ""}
                          onChange={(e) =>
                            codingType === "CPT"
                              ? setNewCpt({ ...newCpt, replacementCPT: e.target.value })
                              : setNewIcd({ ...newIcd, replacementCPT: e.target.value })
                          }
                        />
                      </div>
                      <div className={`${styles.formGroup} ${styles.gridSpan3}`}>
                        <label className={styles.label}>Description</label>
                        <input
                          className={styles.input}
                          value={codingType === "CPT" ? newCpt.description : newIcd.description || ""}
                          onChange={(e) =>
                            codingType === "CPT"
                              ? setNewCpt({ ...newCpt, description: e.target.value })
                              : setNewIcd({ ...newIcd, description: e.target.value })
                          }
                        />
                      </div>
                      <div className={`${styles.formGroup} ${styles.gridSpan3}`}>
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
                  {codingRulesCPT.length > 0 && (
                    <div className={styles.guidelineItem}>
                      {/* HEADER */}
                      <div
                        className={styles.accordionHeader}
                        onClick={() => setExpandCpt(!expandCpt)}
                      >
                        <div className={styles.accordionHeaderTitle}>
                          <Activity size={18} color="#3b82f6" />
                          <span>CPT Codes ({codingRulesCPT.length})</span>
                        </div>
                        {expandCpt ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>

                      {/* BODY */}
                      {expandCpt && (
                        <div className={styles.guidelineBody}>
                          {(() => {
                            const manualCPT = codingRulesCPT.filter(r => r.source === 'Manual');
                            const extractedCPT = codingRulesCPT.filter(r => r.source && r.source !== 'Manual');
                            const groupedBySource = extractedCPT.reduce((acc, r) => {
                              const src = r.source || 'Unknown';
                              if (!acc[src]) acc[src] = [];
                              acc[src].push(r);
                              return acc;
                            }, {} as Record<string, typeof extractedCPT>);

                            return (
                              <>
                                {manualCPT.length > 0 && (
                                  <div className={`${styles.sourceGroup} ${styles.manualSourceGroup}`}>
                                    <div className={styles.sourceGroupHeader}>
                                      <FileText size={14} style={{ color: '#3b82f6' }} />
                                      <span className={styles.manualSourceTitle}>Manual Entry</span>
                                    </div>
                                    <div className={styles.cardList}>
                                      {manualCPT.map((r, i) => (
                                        <div key={i} className={styles.cardItem}>
                                          <div className={styles.cardContent}>
                                            <div className={styles.codeBadge}>CPT: {r.cptCode}</div>
                                            <div className={styles.codingMetaGrid}>
                                              {r.ndcCode && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>NDC Code:</span>
                                                  <span className={styles.metaValue}>{r.ndcCode}</span>
                                                </div>
                                              )}
                                              {r.units && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>Units:</span>
                                                  <span className={styles.metaValue}>{r.units}</span>
                                                </div>
                                              )}
                                               {r.chargePerUnit && (
                                                 <div className={styles.metaItem}>
                                                   <span className={styles.metaLabel}>Charge/Unit:</span>
                                                   <span className={styles.metaValue}>{r.chargePerUnit.toString().startsWith('$') ? r.chargePerUnit : `$${r.chargePerUnit}`}</span>
                                                 </div>
                                               )}
                                              {r.modifier && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>Modifier:</span>
                                                  <span className={styles.metaValue}>{r.modifier}</span>
                                                </div>
                                              )}
                                              {r.replacementCPT && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>Replace CPT:</span>
                                                  <span className={styles.metaValue}>{r.replacementCPT}</span>
                                                </div>
                                              )}
                                            </div>
                                            {r.description && (
                                              <div className={styles.codeDescription}>
                                                {r.description}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            className={styles.deleteButton}
                                            onClick={() => handleRemoveCpt(codingRulesCPT.indexOf(r))}
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {Object.entries(groupedBySource).map(([source, rules]) => (
                                  <div key={source} className={`${styles.sourceGroup} ${styles.extractedSourceGroup}`}>
                                    <div className={styles.sourceGroupHeader}>
                                      <FileText size={14} style={{ color: '#0284c7' }} />
                                      <span className={styles.extractedSourceTitle}>
                                        {source === 'source_file' ? `Source file: ${uploadedFile?.name || documents.find(d => d.category === 'Source file')?.name || 'Unknown'}` : source}
                                      </span>
                                    </div>
                                    <div className={styles.cardList}>
                                      {rules.map((r, i) => (
                                        <div key={i} className={styles.cardItem}>
                                          <div className={styles.cardContent}>
                                            <div className={styles.codeBadge}>CPT: {r.cptCode}</div>
                                            <div className={styles.codingMetaGrid}>
                                              {r.ndcCode && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>NDC Code:</span>
                                                  <span className={styles.metaValue}>{r.ndcCode}</span>
                                                </div>
                                              )}
                                              {r.units && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>Units:</span>
                                                  <span className={styles.metaValue}>{r.units}</span>
                                                </div>
                                              )}
                                               {r.chargePerUnit && (
                                                 <div className={styles.metaItem}>
                                                   <span className={styles.metaLabel}>Charge/Unit:</span>
                                                   <span className={styles.metaValue}>{r.chargePerUnit.toString().startsWith('$') ? r.chargePerUnit : `$${r.chargePerUnit}`}</span>
                                                 </div>
                                               )}
                                              {r.modifier && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>Modifier:</span>
                                                  <span className={styles.metaValue}>{r.modifier}</span>
                                                </div>
                                              )}
                                              {r.replacementCPT && (
                                                <div className={styles.metaItem}>
                                                  <span className={styles.metaLabel}>Replace CPT:</span>
                                                  <span className={styles.metaValue}>{r.replacementCPT}</span>
                                                </div>
                                              )}
                                            </div>
                                            {r.description && (
                                              <div className={styles.codeDescription}>
                                                {r.description}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            className={styles.deleteButton}
                                            onClick={() => handleRemoveCpt(codingRulesCPT.indexOf(r))}
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  {codingRulesICD.length > 0 && (
                    <div className={styles.guidelineItem} style={{ marginTop: 12 }}>
                      {/* HEADER */}
                      <div
                        className={styles.accordionHeader}
                        onClick={() => setExpandIcd(!expandIcd)}
                      >
                        <div className={styles.accordionHeaderTitle}>
                          <Hash size={18} color="#3b82f6" />
                          <span>ICD Codes ({codingRulesICD.length})</span>
                        </div>
                        {expandIcd ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>

                      {/* BODY */}
                      {expandIcd && (
                        <div className={styles.guidelineBody}>
                          {(() => {
                            const manualICD = codingRulesICD.filter(r => r.source === 'Manual');
                            const extractedICD = codingRulesICD.filter(r => r.source && r.source !== 'Manual');
                            const groupedBySource = extractedICD.reduce((acc, r) => {
                              const src = r.source || 'Unknown';
                              if (!acc[src]) acc[src] = [];
                              acc[src].push(r);
                              return acc;
                            }, {} as Record<string, typeof extractedICD>);

                            return (
                              <>
                                {manualICD.length > 0 && (
                                  <div className={`${styles.sourceGroup} ${styles.manualSourceGroup}`}>
                                    <div className={styles.sourceGroupHeader}>
                                      <FileText size={14} style={{ color: '#3b82f6' }} />
                                      <span className={styles.manualSourceTitle}>Manual Entry</span>
                                    </div>
                                    <div className={styles.cardList}>
                                      {manualICD.map((r, i) => (
                                        <div key={i} className={styles.cardItem}>
                                          <div className={styles.cardContent}>
                                            <div className={styles.codeBadge}>ICD: {r.icdCode}</div>
                                            {r.description && (
                                              <div className={styles.codeDescription}>
                                                {r.description}
                                              </div>
                                            )}
                                            {r.notes && (
                                              <div className={styles.mutedText} style={{ fontSize: '12px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                                                <strong>Notes:</strong> {r.notes}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            className={styles.deleteButton}
                                            onClick={() => handleRemoveIcd(codingRulesICD.indexOf(r))}
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {Object.entries(groupedBySource).map(([source, rules]) => (
                                  <div key={source} className={`${styles.sourceGroup} ${styles.extractedSourceGroup}`}>
                                    <div className={styles.sourceGroupHeader}>
                                      <FileText size={14} style={{ color: '#0284c7' }} />
                                      <span className={styles.extractedSourceTitle}>
                                        {source === 'source_file' ? `Source file: ${uploadedFile?.name || documents.find(d => d.category === 'Source file')?.name || 'Unknown'}` : source}
                                      </span>
                                    </div>
                                    <div className={styles.cardList}>
                                      {rules.map((r, i) => (
                                        <div key={i} className={styles.cardItem}>
                                          <div className={styles.cardContent}>
                                            <div className={styles.codeBadge}>ICD: {r.icdCode}</div>
                                            {r.description && (
                                              <div className={styles.codeDescription}>
                                                {r.description}
                                              </div>
                                            )}
                                            {r.notes && (
                                              <div className={styles.mutedText} style={{ fontSize: '12px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                                                <strong>Notes:</strong> {r.notes}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            className={styles.deleteButton}
                                            onClick={() => handleRemoveIcd(codingRulesICD.indexOf(r))}
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
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
                          <strong>{pg.title}</strong>
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
                                  <div className={styles.codeBadge}>CPT: {rule.cptCode}</div>
                                  <div className={styles.codingMetaGrid}>
                                    {rule.ndcCode && (
                                      <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>NDC Code:</span>
                                        <span className={styles.metaValue}>{rule.ndcCode}</span>
                                      </div>
                                    )}
                                    {rule.units && (
                                      <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Units:</span>
                                        <span className={styles.metaValue}>{rule.units}</span>
                                      </div>
                                    )}
                                    {rule.chargePerUnit && (
                                      <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Charge/Unit:</span>
                                        <span className={styles.metaValue}>${rule.chargePerUnit}</span>
                                      </div>
                                    )}
                                    {rule.modifier && (
                                      <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Modifier:</span>
                                        <span className={styles.metaValue}>{rule.modifier}</span>
                                      </div>
                                    )}
                                    {rule.replacementCPT && (
                                      <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Replace CPT:</span>
                                        <span className={styles.metaValue}>{rule.replacementCPT}</span>
                                      </div>
                                    )}
                                  </div>
                                  {rule.description && (
                                    <div className={styles.codeDescription}>{rule.description}</div>
                                  )}
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
                                  <div className={styles.codeBadge}>ICD: {rule.icdCode}</div>
                                  {rule.description && (
                                    <div className={styles.codeDescription}>{rule.description}</div>
                                  )}
                                  {rule.notes && (
                                    <div className={styles.mutedText} style={{ fontSize: '12px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
                                      Notes: {rule.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className={styles.footer}>

            {extractionMode === "EXTRACTING" && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginRight: 'auto' }}>
                  <button className={styles.saveButton} type="button" disabled>
                    <Loader2 size={16} className={styles.animateSpin} />
                    Extracting...
                  </button>
                  <button
                    className={styles.saveButton}
                    type="button"
                    onClick={handleCancelUpload}
                    style={{
                      backgroundColor: "#ef4444",
                      borderColor: "#ef4444",
                      color: "white"
                    }}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
                <button
                  className={styles.saveButton}
                  onClick={moveToBackground}
                  disabled={backgroundLoading}
                >
                  {backgroundLoading ? (
                    <>
                      <Loader2 size={16} className={styles.animateSpin} />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Activity size={16} />
                      Run in Background
                    </>
                  )}
                </button>
              </>
            )}

            {extractionMode !== "EXTRACTING" && (
              <>
                {getSteps().find(s => s.number === currentStep)?.title === "Basic Information" && (
                  <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    {!sourceFile ? (
                      <button
                        className={styles.saveButton}
                        type="button"
                        onClick={handleUploadClick}
                      >
                        <Upload size={16} />
                        Upload Source SOP
                      </button>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#f8fafc',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }}>
                          {extractionMode === "READY" ? (
                            <CheckCircle2 size={16} color="#22c55e" />
                          ) : (
                            <FileText size={16} color="#0284c7" />
                          )}
                          <span title={sourceFile.name}>
                            {truncateFileName(sourceFile.name)}
                          </span>
                          {extractionMode === "READY" && (
                            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginLeft: '4px' }}>Done</span>
                          )}
                        </div>
                        {/* Divider */}
                        <span style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0', display: 'inline-block' }} />
                        {/* Edit (Change) icon */}
                        <button
                          type="button"
                          onClick={handleUploadClick}
                          title="Change file"
                          className={styles.iconButton}
                        >
                          <Edit2 size={15} />
                        </button>
                        {/* Download icon — only in edit mode with saved source */}
                        {isEditMode && documents.some(doc => doc.category === "Source file") && (
                          <>
                            {/* Divider */}
                            <span style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0', display: 'inline-block' }} />
                            <button
                              type="button"
                              onClick={handleDownloadSourceFile}
                              disabled={isDownloadingSource}
                              title="Download Source"
                              className={styles.iconButton}
                            >
                              {isDownloadingSource ? (
                                <Loader2 size={16} className={styles.animateSpin} />
                              ) : (
                                <Download size={16} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFile(file);
                          handleForegroundExtraction(file);
                          e.target.value = "";
                        }
                      }}
                    />
                    {/* Extra Documents button — right of the source chip */}
                    {isEditMode && id && (() => {
                      const extraDocsCount = documents.filter(doc => doc.category !== "Source file").length;
                      return (
                        <button
                          type="button"
                          className={styles.backButton}
                          onClick={async () => {
                            setIsExtraDocsOpen(true);
                            try {
                              const sop = await sopService.getSOPById(id);
                              setDocuments(sop.documents || []);
                            } catch (error) {
                              console.error("Failed to refresh documents:", error);
                            }
                          }}
                          title="Attach extra documents"
                          disabled={saving}
                          style={{ position: "relative" }}
                        >
                          <FileText size={16} />
                          Extras {extraDocsCount > 0 && `(${extraDocsCount})`}
                          {isExtractingDocs ? (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              marginLeft: "8px",
                              padding: "2px 8px",
                              background: "#fffbeb",
                              border: "1px solid #fde68a",
                              borderRadius: "12px",
                              color: "#d97706",
                              fontSize: "11px",
                              fontWeight: 600
                            }}>
                              <Loader2 size={12} className={styles.animateSpin} />
                              Extracting…
                            </span>
                          ) : null}
                        </button>
                      );
                    })()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  {currentStep > 1 && (
                    <button
                      className={styles.backButton}
                      onClick={handleBackStep}
                      disabled={saving}
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                  )}

                  <button
                    className={styles.saveButton}
                    onClick={
                      currentStep === getSteps().length
                        ? handleSave
                        : handleNextStep
                    }
                    disabled={saving}
                  >
                    {currentStep === getSteps().length ? (
                      saving ? (
                        <>
                          <Loader2 size={16} className={styles.animateSpin} />
                          Saving...
                        </>
                      ) : isEditMode ? (
                        <>
                          <Save size={16} />
                          Update SOP
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Create SOP
                        </>
                      )
                    ) : (
                      <>
                        Next
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

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
      {/* Extra Documents Modal */}
      {isEditMode && id && (
        <ExtraDocumentsModal
          sopId={id}
          isOpen={isExtraDocsOpen}
          onClose={handleExtraDocsClose}
          existingDocuments={extraDocumentsFiltered}
          onExtractionStateChange={onExtractionStateChangeStable}
          onUploadsComplete={onUploadsCompleteStable}
          onDocumentDeleted={onDocumentDeletedStable}
        />
      )}
    </div>
  );
};

export default CreateSOP;
