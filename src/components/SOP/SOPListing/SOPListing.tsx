import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Edit,
  Users,
  FolderOpen,
  PlayCircle,
  StopCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  BookOpen,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import Table from "../../Table/Table";
import Loading from "../../Common/Loading";
import CommonPagination from "../../Common/CommonPagination";
import styles from "./SOPListing.module.css";
import sopService, { normalizeSOP } from "../../../services/sop.service";
import apiClient from "../../../utils/apiClient";
import statusService, { Status } from "../../../services/status.service";
import { BillingGuideline, SOP } from "../../../types/sop";
import ConfirmModal from "../../Common/ConfirmModal";
import Toast, { ToastType } from "../../Common/Toast";
import CommonDropdown from "../../Common/CommonDropdown";
import CommonDatePicker from "../../Common/CommonDatePicker";
import { usePermission } from "../../../context/PermissionContext";
import ClientSelectionModal from "./ClientSelectionModal";
import ProviderSelectionModal from "./ProviderSelectionModal";
import authService from "../../../services/auth.service";
import organisationService from "../../../services/organisation.service";
import userService from "../../../services/user.service";
import clientService from "../../../services/client.service";

const SOPListing: React.FC = () => {
  const currentUser = authService.getUser();
  const navigate = useNavigate();
  const [sops, setSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
  const cptRules = selectedSOP?.codingRulesCPT ?? [];
  const icdRules = selectedSOP?.codingRulesICD ?? [];

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    sopId: string;
    action: "activate" | "deactivate";
  }>({ isOpen: false, sopId: "", action: "activate" });
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [activeStatusId, setActiveStatusId] = useState<number | null>(null);
  const [inactiveStatusId, setInactiveStatusId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalSOPs, setTotalSOPs] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const { can } = usePermission();

  // Selection Modal State
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [selectedClientForCreation, setSelectedClientForCreation] = useState<{ id: string, name: string, type: string } | null>(null);

  const canReadSOP = can("SOPS", "READ");
  const canCreateSOP = can("SOPS", "CREATE");
  const canUpdateSOP = can("SOPS", "UPDATE");
  const [stats, setStats] = useState({
    totalSOPs: 0,
    activeSOPs: 0,
    inactiveSOPs: 0,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({
    fromDate: null,
    toDate: null,
    organisationId: [],
    clientId: [],
    createdBy: [],
  });
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({
    fromDate: null,
    toDate: null,
    organisationId: [],
    clientId: [],
    createdBy: [],
  });

  const [organisations, setOrganisations] = useState<any[]>([]);
  const [clientsForFilter, setClientsForFilter] = useState<any[]>([]);
  const [usersForFilter, setUsersForFilter] = useState<any[]>([]);
  const [loadingFilterData, setLoadingFilterData] = useState(false);

  const activeFilterCount = Object.entries(activeFilters).filter(
    ([key, value]) => {
      if (key === "fromDate" || key === "toDate") {
        return value !== null;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== "" && value !== null && value !== undefined;
    }
  ).length;

  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const getCategoryLabel = (category: SOP["category"]): string => {
    if (typeof category === "string") return category;
    if (category && typeof category === "object") return category.title ?? "—";
    return "—";
  };

  const isInitialMount = React.useRef(true);
  const lastFetchParams = React.useRef("");

  useEffect(() => {
    loadStatuses();
    loadStats();
  }, []);

  useEffect(() => {
    // Stringify dependencies that are objects/arrays to prevent reference-based triggers
    const paramsKey = JSON.stringify({
      currentPage,
      itemsPerPage,
      debouncedSearchTerm,
      statusFilter,
      activeFilters
    });

    if (lastFetchParams.current === paramsKey) {
      return;
    }

    lastFetchParams.current = paramsKey;
    loadSOPs(debouncedSearchTerm, statusFilter);
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    statusFilter,
    activeFilters,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const loadSOPs = async (search?: string, filter?: string) => {
    try {
      setLoading(true);
      let statusCode: "ACTIVE" | "INACTIVE" | undefined;

      if (filter === "active") statusCode = "ACTIVE";
      if (filter === "inactive") statusCode = "INACTIVE";

      const data = await sopService.getSOPs({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
        search: search,
        statusCode: statusCode,
        fromDate: activeFilters.fromDate
          ? formatLocalDate(activeFilters.fromDate)
          : undefined,
        toDate: activeFilters.toDate
          ? formatLocalDate(activeFilters.toDate)
          : undefined,
        organisationId: activeFilters.organisationId?.length > 0 ? activeFilters.organisationId.join(',') : undefined,
        createdBy: activeFilters.createdBy?.length > 0 ? activeFilters.createdBy.join(',') : undefined,
        clientId: activeFilters.clientId?.length > 0 ? activeFilters.clientId.join(',') : undefined,
      });
      setSops(
        data.sops.map((sop: any) => ({
          ...sop,

          // normalize provider info
          providerInfo: sop.providerInfo ?? sop.provider_info ?? {},

          // normalize updatedAt
          updatedAt: sop.updatedAt ?? sop.updated_at ?? null,

          // existing category logic
          category:
            typeof sop.category === "string"
              ? sop.category
              : (sop.category?.title ?? "—"),
        })),
      );
      setTotalSOPs(data.total);
    } catch (error) {
      console.error("Failed to load SOPs:", error);
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  };
  const loadStats = async () => {
    try {
      const data = await sopService.getSOPStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load SOP stats", err);
    }
  };

  const loadFilterData = async () => {
    try {
      setLoadingFilterData(true);
      const user = currentUser as any;
      const isAdmin = user?.role?.name === "SUPER_ADMIN";

      const promises: Promise<any>[] = [
        userService.getUsers(1, 1000, undefined, "ACTIVE"),
      ];

      if (isAdmin) {
        promises.push(
          organisationService.getOrganisations(1, 1000, undefined, "ACTIVE")
        );
      }

      const results = await Promise.all(promises);
      setUsersForFilter(results[0].users || []);

      if (isAdmin) {
        setOrganisations(results[1].organisations || []);
      }

      // Improved detection for organization login
      const hasOrgContext =
        user?.organisation_id ||
        (user?.role?.name && user.role.name.includes("ORGANISATION"));

      if (hasOrgContext && !isAdmin) {
        // Explicitly fetch clients for this organisation
        const orgId = user?.organisation_id || user?.id;
        const clientsRes = await clientService.getClients(
          1,
          1000,
          undefined,
          "ACTIVE",
          orgId
        );
        setClientsForFilter(clientsRes.clients || []);
      } else {
        const clientsRes = await clientService.getAllClients();
        setClientsForFilter(clientsRes || []);
      }
    } catch (err) {
      console.error("Failed to load filter data", err);
    } finally {
      setLoadingFilterData(false);
    }
  };

  useEffect(() => {
    if (showFilters) {
      loadFilterData();
    }
  }, [showFilters]);

  const handleApplyFilters = () => {
    setActiveFilters(filters);
    setCurrentPage(0);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      fromDate: null,
      toDate: null,
      organisationId: [],
      clientId: [],
      createdBy: [],
    };
    setFilters(resetFilters);
    setActiveFilters(resetFilters);
    setCurrentPage(0);
    setShowFilters(false);
  };

  const handleOrganisationChange = async (orgIds: string[]) => {
    setFilters((prev) => ({ ...prev, organisationId: orgIds, clientId: [] }));
    const user = currentUser as any;
    // const isAdmin = user?.role?.name === "SUPER_ADMIN";
    const isAdmin = user?.role?.name === "SUPER_ADMIN";

    if (!orgIds || orgIds.length === 0) {
      // Re-load clients if it's an organization user, otherwise clear
      if (!isAdmin) {
        const orgId = user?.organisation_id || user?.id; // Important
        const clientsRes = await clientService.getClients(
          1,
          1000,
          undefined, "ACTIVE", orgId);
        setClientsForFilter(clientsRes.clients || []);
      } else {
        setClientsForFilter([]);
      }
      return;
    }

    try {
      setLoadingFilterData(true);
      const orgIdsStr = orgIds.join(",");
      const clientsRes = await clientService.getClients(1, 1000, undefined, "ACTIVE", orgIdsStr);
      setClientsForFilter(clientsRes.clients || []);
      // const clientsRes = await clientService.getAllClients();
      // setClientsForFilter(clientsRes || []);
    } catch (err) {
      console.error("Failed to load clients for organisation", err);
    } finally {
      setLoadingFilterData(false);
    }
  };

  const loadStatuses = async () => {
    try {
      const data = await statusService.getStatuses();
      setStatuses(data);
      const active = data.find((s) => s.code === "ACTIVE");
      const inactive = data.find((s) => s.code === "INACTIVE");
      setActiveStatusId(active ? Number(active.id) : null);
      setInactiveStatusId(inactive ? Number(inactive.id) : null);
    } catch (error) {
      console.error("Failed to load statuses:", error);
    }
  };

  const handleToggleStatus = (id: string, currentStatusId?: number) => {
    const isActive = currentStatusId === activeStatusId;

    setConfirmModal({
      isOpen: true,
      sopId: id,
      action: isActive ? "deactivate" : "activate",
    });
  };

  const confirmToggleStatus = async () => {
    try {
      const newStatusId =
        confirmModal.action === "activate" ? activeStatusId : inactiveStatusId;
      if (newStatusId) {
        await sopService.toggleSOPStatus(confirmModal.sopId, newStatusId);
        await Promise.all([
          loadSOPs(debouncedSearchTerm, statusFilter),
          loadStats(),
        ]);
        // loadSOPs(debouncedSearchTerm, statusFilter);
        setToast({
          message: `SOP ${confirmModal.action === "activate" ? "activated" : "deactivated"} successfully`,
          type: "success",
        });
      }
      setConfirmModal({ isOpen: false, sopId: "", action: "activate" });
    } catch (error) {
      console.error("Failed to update SOP status:", error);
      setToast({
        message: `Failed to ${confirmModal.action} SOP`,
        type: "error",
      });
    }
  };

  const filteredSOPs = useMemo(() => {
    return sops;
  }, [sops]);

  const handleDownloadPDF = async (sop: SOP) => {
    try {
      setDownloadingId(sop.id);
      await sopService.downloadSOPPDF(sop.id, sop.title);
      setToast({ message: "PDF downloaded successfully", type: "success" });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      setToast({ message: "Failed to download PDF", type: "error" });
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleViewSOP = async (sop: SOP) => {
    try {
      setSelectedSOP(sop);
      setViewModalOpen(true);
      setLoadingDetails(true);
      setExpandedSections({});
      const fullSOP = await sopService.getSOPById(sop.id);
      setSelectedSOP(normalizeSOP(fullSOP));

      // fullSOP.billingGuidelines = normalizeBillingGuidelines(
      //   fullSOP.billingGuidelines || []
      // );

      // setSelectedSOP(fullSOP);
      //         }
    } catch (error) {
      console.error("Failed to fetch SOP details:", error);
      setToast({ message: "Failed to load SOP details", type: "error" });
      setViewModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateSOP = () => {
    navigate("/sops/create");
  };

  const handleClientSelect = (client: { id: string, name: string, npi: string, type: string }) => {
    setClientModalOpen(false);
    setSelectedClientForCreation(client);

    // Check type (case insensitive just in case, though usually 'Individual' or 'Organization')
    // Requirement: "If client.type === 'Individual'"
    // Adjusting to match backend/frontend constants if needed. 
    // Assuming 'Individual' is the value.
    if (client.type === 'Individual' || client.type === 'NPA1') {
      // NPA1 is legacy code for Individual, covering both just in case.
      navigate("/sops/create", {
        state: {
          clientId: client.id,
          clientName: client.name
        }
      });
    } else {
      // Open Provider Selection
      setProviderModalOpen(true);
    }
  };

  const handleProviderSelect = (providerIds: string[], providers: any[]) => {
    setProviderModalOpen(false);
    if (selectedClientForCreation) {
      navigate("/sops/create", {
        state: {
          clientId: selectedClientForCreation.id,
          clientName: selectedClientForCreation.name,
          providerIds: providerIds,
          selectedProviders: providers // Optional: pass details for display
        }
      });
    }
  };

  const columns = [
    // {
    //   key: "providerName",
    //   header: "Provider",
    //   width: "32%",
    //   render: (_: string, row: SOP) => (
    //     <div>
    //       <div style={{ fontWeight: 500, color: "#111827" }}>
    //         {row.providerInfo?.providerName || row.title}
    //       </div>
    //       <div style={{ fontSize: "12px", color: "#6b7280" }}>
    //         {typeof row.providerInfo?.billingProviderName === "string"
    //           ? row.providerInfo.billingProviderName
    //           : getCategoryLabel(row.category)}
    //       </div>
    //     </div>
    //   ),
    // },
    {
      key: "title",
      header: "Title",
      width: "250px",
      render: (_: string, row: SOP) => (
        <div>
          <div style={{ fontWeight: 500, color: "#111827" }}>
            {row.title}
          </div>
        </div>
      ),
    },
    {
      key: "client_name",
      header: "Client",
      width: "200px",
      render: (_: string, row: SOP) => (
        <div>
          <div style={{ fontWeight: 500, color: "#111827" }}>
            {row.client_name}
          </div>
        </div>
      ),
    },
    {
      key: "npi",
      header: "NPI",
      width: "120px",
      render: (_: any, row: SOP) => row.providerInfo?.billingProviderNPI || "-",
    },
    {
      key: "category",
      header: "Category",
      width: "150px",
      render: (_: any, row: SOP) => (
        <span className={styles.badge}>{getCategoryLabel(row.category)}</span>
      ),
    },
    {
      key: "software",
      header: "Software",
      width: "120px",
      render: (_: any, row: SOP) => row.providerInfo?.software || "-",
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      width: "140px",
      render: (_: any, row: SOP) =>
        row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "-",
    },
    ...(currentUser?.role?.name === 'SUPER_ADMIN' || currentUser?.role?.name === 'ORGANISATION_ROLE' ? [{
      key: 'created_by_name',
      header: 'Created By',
      width: '150px',
      render: (_: any, row: SOP) => row.created_by_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}> {row.organisation_name == null ? "Super Admin" : "Organisation"} </span>
    }] : []),
    ...(currentUser?.role?.name === 'SUPER_ADMIN' ? [{
      key: 'organisation_name',
      header: 'Organisation',
      width: '150px',
      render: (_: any, row: SOP) => row.organisation_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>
    }] : []),
    {
      key: "actions",
      header: "Actions",
      width: "150px",
      render: (_: any, row: SOP) => {
        // ✅ CORRECT PLACE
        const isActive = row.statusId === activeStatusId;

        return (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className={styles.viewButton}
              onClick={() => handleViewSOP(row)}
              title="View SOP"
            >
              <Eye size={14} />
            </button>

            <button
              className={styles.downloadButton}
              onClick={() => handleDownloadPDF(row)}
              disabled={downloadingId === row.id}
              title="Download PDF"
            >
              {downloadingId === row.id ? (
                <div className={styles.smallSpinner}></div>
              ) : (
                <Download size={14} />
              )}
            </button>

            <button
              className={`${styles.editButton} ${!canUpdateSOP ? styles.disabled : ""}`}
              disabled={!canUpdateSOP}
              onClick={() => canUpdateSOP && navigate(`/sops/edit/${row.id}`)}
              title={
                canUpdateSOP
                  ? "Edit SOP"
                  : "You do not have permission to edit SOPs"
              }
            >
              <Edit size={14} />
            </button>

            {/* ✅ STATUS ACTION BUTTON */}
            <button
              className={`${isActive ? styles.deactivateButton : styles.activateButton} ${!canUpdateSOP ? styles.disabled : ""
                }`}
              disabled={!canUpdateSOP}
              onClick={() =>
                canUpdateSOP && handleToggleStatus(row.id, row.statusId)
              }
              title={
                canUpdateSOP
                  ? isActive
                    ? "Deactivate SOP"
                    : "Activate SOP"
                  : "You do not have permission to update SOPs"
              }
            >
              {isActive ? <StopCircle size={14} /> : <PlayCircle size={14} />}
            </button>
          </div>
        );
      },
    },
  ];
  if (!canReadSOP && !isInitialLoading) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to view SOPs.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div
          className={`${styles.statCard} ${statusFilter === "all" ? styles.statCardActiveBlue : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <div className={styles.statIcon}>
            <BookOpen size={16} />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalSOPs}</h3>
            <p>Total SOPs</p>
          </div>
        </div>
        <div
          className={`${styles.statCard} ${statusFilter === "active" ? styles.statCardActiveGreen : ""}`}
          onClick={() => setStatusFilter("active")}
        >
          <div
            className={styles.statIcon}
            style={{ backgroundColor: "#dcfce7", color: "#166534" }}
          >
            <Users size={16} />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.activeSOPs}</h3>
            <p>Active SOPs</p>
          </div>
        </div>
        <div
          className={`${styles.statCard} ${statusFilter === "inactive" ? styles.statCardActiveRed : ""}`}
          onClick={() => setStatusFilter("inactive")}
        >
          <div
            className={styles.statIcon}
            style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
          >
            <FolderOpen size={16} />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.inactiveSOPs}</h3>
            <p>Inactive SOPs</p>
          </div>
        </div>
      </div>

      {/* Header with Title and Actions */}
      <div className={styles.header}>
        <h1>
          <BookOpen size={20} style={{ marginRight: "8px" }} />
          Standard Operating Procedures
        </h1>
        <div className={styles.actions}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={16} />
            <input
              type="text"
              placeholder="Search by Provider, Practice, Category, NPI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilters(true)}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>
          {/* <button
            className={`${styles.createButton} ${!canCreateSOP ? styles.disabled : ""}`}
            onClick={() => canCreateSOP && navigate("/sops/create")}
            title={
              canCreateSOP
                ? "Create new SOP"
                : "You do not have permission to create SOPs"
            }
          >
            <Plus size={16} />
            Create New SOP
          </button> */}
          <button
            className={`${styles.createButton}`}
            onClick={handleCreateSOP}
            title={'Create new SOP'}
          >
            <Plus size={16} />
            Create New SOP
          </button>
        </div>
      </div>

      {/* Table */}
      {isInitialLoading ? (
        <div className={styles.tableSection}>
          <Loading message="Loading SOPs..." />
        </div>
      ) : (
        <Table
          className={styles.sopTable}
          data={filteredSOPs}
          columns={columns}
          maxHeight="calc(100vh - 240px)"
        />
      )}

      {/* View Modal */}
      {viewModalOpen && selectedSOP && (
        <div
          className={styles.modalOverlay}
          onClick={() => setViewModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>
                <BookOpen
                  size={20}
                  style={{
                    marginRight: "8px",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
                SOP Details
              </h2>
              <button
                className={styles.modalClose}
                onClick={() => setViewModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {loadingDetails ? (
                <Loading message="Loading details..." />
              ) : (
                <>
                  {/* Client Information */}
                  <div className={styles.infoSection}>
                    <h3>Practice Information</h3>
                    <div className={styles.infoGrid}>
                      <div>
                        <strong>Name:</strong>
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.client_name || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>NPI:</strong>
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.client_npi || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Associated Providers */}
                  {selectedSOP.providers && selectedSOP.providers.length > 0 && (
                    <div className={styles.infoSection}>
                      <h3>Providers</h3>
                      <table className={styles.detailsTable}>
                        <thead>
                          <tr>
                            <th className={styles.detailsTh}>Provider Name</th>
                            <th className={styles.detailsTh}>NPI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSOP.providers.map((p, idx) => (
                            <tr key={idx}>
                              <td className={styles.detailsTd}>{p.name}</td>
                              <td className={styles.detailsTd}>{p.npi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className={styles.infoSection}>
                    <h3>Basic Information</h3>
                    <div className={styles.infoGrid}>
                      <div>
                        <strong>Title:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.title}
                        </span>
                      </div>
                      <div>
                        <strong>Category:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {getCategoryLabel(selectedSOP.category)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Information */}
                  <div className={styles.infoSection}>
                    <h3>Billing Information</h3>
                    <div className={styles.infoGrid}>
                      <div>
                        <strong>Provider Name:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.providerName || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>Billing Provider:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.billingProviderName || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>NPI:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.billingProviderNPI || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>Practice Name:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.practiceName || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>Software:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.software || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>Tax ID:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.providerTaxID || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>Address:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.billingAddress || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>Clearinghouse:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.providerInfo?.clearinghouse || "-"}
                        </span>
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <span style={{ color: "#0c4a6e", fontWeight: 500 }}>
                          {selectedSOP.status?.code || "Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Process */}
                  <div className={styles.infoSection}>
                    <h3>Workflow Process</h3>
                    <div style={{ marginBottom: "12px" }}>
                      <strong
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "12px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#475569",
                        }}
                      >
                        Description:
                      </strong>
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          color: "#0c4a6e",
                          fontSize: "14px",
                          fontWeight: 500,
                          padding: "10px",
                          background: "white",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {selectedSOP.workflowProcess?.description || "-"}
                      </div>
                    </div>
                    <div>
                      <strong
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "12px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#475569",
                        }}
                      >
                        Eligibility Portals:
                      </strong>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {selectedSOP.workflowProcess?.eligibilityPortals
                          ?.length ? (
                          selectedSOP.workflowProcess.eligibilityPortals.map(
                            (p, i) => (
                              <span
                                key={i}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: "20px",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  background:
                                    "linear-gradient(135deg, #83cee4 0%, #e2f3f9 100%)",
                                  color: "#011926",
                                }}
                              >
                                {p}
                              </span>
                            ),
                          )
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "14px" }}>
                            No portals listed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.accordion}>
                    <div className={styles.accordionItem}>
                      <div
                        className={styles.accordionHeader}
                        onClick={() => toggleSection("guidelines")}
                      >
                        <span>
                          Billing Guidelines (
                          {selectedSOP.billingGuidelines?.map((g, i) => (
                            <div
                              key={i}
                              style={{
                                marginBottom: "16px",
                                padding: "12px",
                                background: "white",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {/* CATEGORY */}
                              <div
                                style={{
                                  fontWeight: 600,
                                  marginBottom: "8px",
                                  color: "#334155",
                                  fontSize: "14px",
                                }}
                              >
                                {g.category}
                              </div>

                              {/* RULES */}
                              <ul style={{ paddingLeft: "18px", margin: 0 }}>
                                {g.rules.map((r, j) => (
                                  <li
                                    key={j}
                                    style={{
                                      color: "#0c4a6e",
                                      fontSize: "13px",
                                      lineHeight: "1.6",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    {r.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                          {(!selectedSOP.billingGuidelines ||
                            selectedSOP.billingGuidelines.length === 0) && (
                              <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                                No guidelines.
                              </p>
                            )}
                        </span>
                      </div>
                    </div>

                    <div className={styles.accordionItem}>
                      <div
                        className={styles.accordionHeader}
                        onClick={() => toggleSection("coding")}
                      >
                        <span>
                          Coding Rules (
                          {(selectedSOP.codingRulesCPT?.length || 0) +
                            (selectedSOP.codingRulesICD?.length || 0)}
                          )
                        </span>
                        {expandedSections["coding"] ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                      {expandedSections["coding"] && (
                        <div className={styles.accordionContent}>
                          {cptRules?.length > 0 && (
                            <>
                              <h4 style={{ marginBottom: 8, color: "#0c4a6e" }}>
                                CPT Codes
                              </h4>
                              {cptRules.map((r, i) => (
                                <div
                                  key={`cpt_${i}`}
                                  style={{
                                    marginBottom: "10px",
                                    padding: "12px",
                                    background: "white",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  <strong>{r.cptCode}</strong>
                                  {r.description && (
                                    <span> – {r.description}</span>
                                  )}

                                  <div
                                    style={{ fontSize: "12px", marginTop: 6 }}
                                  >
                                    {r.ndcCode && (
                                      <span>
                                        <b>NDC:</b> {r.ndcCode}{" "}
                                      </span>
                                    )}
                                    {r.units && (
                                      <span>
                                        <b>Units:</b> {r.units}{" "}
                                      </span>
                                    )}
                                    {r.chargePerUnit && (
                                      <span>
                                        <b>Charge:</b> {r.chargePerUnit}{" "}
                                      </span>
                                    )}
                                    {r.modifier && (
                                      <span>
                                        <b>Mod:</b> {r.modifier}{" "}
                                      </span>
                                    )}
                                    {r.replacementCPT && (
                                      <span>
                                        <b>Replace:</b> {r.replacementCPT}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                          {icdRules?.length > 0 && (
                            <>
                              <h4
                                style={{
                                  marginTop: 16,
                                  marginBottom: 8,
                                  color: "#7c2d12",
                                }}
                              >
                                ICD Codes
                              </h4>
                              {icdRules.map((r, i) => (
                                <div
                                  key={`icd_${i}`}
                                  style={{
                                    marginBottom: "10px",
                                    padding: "12px",
                                    background: "white",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  <strong>{r.icdCode}</strong>
                                  {r.description && (
                                    <span> – {r.description}</span>
                                  )}

                                  {r.notes && (
                                    <div
                                      style={{ fontSize: "12px", marginTop: 6 }}
                                    >
                                      <b>Notes:</b> {r.notes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                          {cptRules.length === 0 && icdRules.length === 0 && (
                            <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                              No coding rules.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, sopId: "", action: "activate" })
        }
        onConfirm={confirmToggleStatus}
        title={`${confirmModal.action === "activate" ? "Activate" : "Deactivate"} SOP`}
        message={`Are you sure you want to ${confirmModal.action} this SOP?`}
        confirmText={
          confirmModal.action === "activate" ? "Activate" : "Deactivate"
        }
        type={confirmModal.action === "activate" ? "info" : "warning"}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <CommonPagination
        show={totalSOPs > 0}
        pageCount={Math.ceil(totalSOPs / itemsPerPage)}
        currentPage={currentPage}
        totalItems={totalSOPs}
        itemsPerPage={itemsPerPage}
        onPageChange={(data) => setCurrentPage(data.selected)}
        onItemsPerPageChange={(items) => {
          setItemsPerPage(items);
          setCurrentPage(0);
        }}
      />

      {/* Selection Modals */}
      <ClientSelectionModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSelect={handleClientSelect}
      />

      {selectedClientForCreation && (
        <ProviderSelectionModal
          isOpen={providerModalOpen}
          onClose={() => setProviderModalOpen(false)}
          clientId={selectedClientForCreation?.id || ""}
          clientName={selectedClientForCreation?.name || ""}
          onSelect={handleProviderSelect}
        />
      )}

      {/* Filter Modal */}
      {showFilters &&
        createPortal(
          <div className={styles.filterOverlay} onClick={() => setShowFilters(false)}>
            <div className={styles.filterModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.filterHeader}>
                <h2>
                  <Filter size={18} />
                  Filters
                </h2>
                <button
                  className={styles.closeFilterBtn}
                  onClick={() => setShowFilters(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.filterContent}>
                {/* Date Range */}
                <div className={styles.filterGroup}>
                  <label>Date Range</label>
                  <div className={styles.dateRangeInputs}>
                    <CommonDatePicker
                      selected={filters.fromDate}
                      onChange={(date) =>
                        setFilters((prev) => ({ ...prev, fromDate: date }))
                      }
                      placeholderText="From Date"
                    />
                    <CommonDatePicker
                      selected={filters.toDate}
                      onChange={(date) =>
                        setFilters((prev) => ({ ...prev, toDate: date }))
                      }
                      placeholderText="To Date"
                    />
                  </div>
                </div>

                {/* Organisation Filter - Only for Super Admin */}
                {(currentUser as any)?.role?.name === "SUPER_ADMIN" && (
                  <div className={styles.filterGroup}>
                    <label>Organisation</label>
                    <CommonDropdown
                      options={organisations.map((org) => ({
                        value: org.id,
                        label: org.name,
                      }))}
                      value={filters.organisationId}
                      onChange={handleOrganisationChange}
                      placeholder="Select Organisations"
                      loading={loadingFilterData}
                      isMulti={true}
                      isSearchable={true}
                    />
                  </div>
                )}

                {/* Client Filter */}
                {/* {(currentUser as any)?.role?.name === "SUPER_ADMIN" || (currentUser as any)?.role?.name === "ORGANISATION_ROLE" ? ( */}
                <div className={styles.filterGroup}>
                  <label>Client</label>
                  <CommonDropdown
                    options={clientsForFilter.map((client) => ({
                      value: client.id,
                      label: client.name || client.business_name || `${client.first_name} ${client.last_name}`,
                      // label: client.business_name || `${client.first_name} ${client.last_name}`,
                    }))}
                    value={filters.clientId}
                    onChange={(val) =>
                      setFilters((prev) => ({ ...prev, clientId: val }))
                    }
                    placeholder="Select Clients"
                    loading={loadingFilterData}
                    isMulti={true}
                    isSearchable={true}
                    disabled={
                      (currentUser as any)?.role?.name === "SUPER_ADMIN" &&
                      (!filters.organisationId || filters.organisationId.length === 0)
                    }
                  />
                </div>
                {/* // ) : null} */}

                {/* Created By Filter */}
                {(currentUser as any)?.role?.name === "SUPER_ADMIN" || (currentUser as any)?.role?.name === "ORGANISATION_ROLE" ? (
                  <div className={styles.filterGroup}>
                    <label>Created By</label>
                    <CommonDropdown
                      options={usersForFilter.map((user) => ({
                        value: user.id,
                        label: `${user.first_name} ${user.last_name} (${user.username})`,
                      }))}
                      value={filters.createdBy}
                      onChange={(val) =>
                        setFilters((prev) => ({ ...prev, createdBy: val }))
                      }
                      placeholder="Select Creators"
                      loading={loadingFilterData}
                      isMulti={true}
                      isSearchable={true}
                    />
                  </div>
                ) : null}
              </div>

              <div className={styles.filterFooter}>
                <button
                  className={styles.resetFilterBtn}
                  onClick={handleResetFilters}
                >
                  Reset All
                </button>
                <button
                  className={styles.applyFilterBtn}
                  onClick={handleApplyFilters}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SOPListing;
