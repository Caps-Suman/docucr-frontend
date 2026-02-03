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
} from "lucide-react";
import Table from "../../Table/Table";
import Loading from "../../Common/Loading";
import CommonPagination from "../../Common/CommonPagination";
import styles from "./SOPListing.module.css";
import sopService, { normalizeSOP } from "../../../services/sop.service";
import statusService, { Status } from "../../../services/status.service";
import { BillingGuideline, SOP } from "../../../types/sop";
import ConfirmModal from "../../Common/ConfirmModal";
import Toast, { ToastType } from "../../Common/Toast";
import { usePermission } from "../../../context/PermissionContext";

const SOPListing: React.FC = () => {
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
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalSOPs, setTotalSOPs] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { can } = usePermission();

  const canReadSOP = can("SOPS", "READ");
  const canCreateSOP = can("SOPS", "CREATE");
  const canUpdateSOP = can("SOPS", "UPDATE");
  const [stats, setStats] = useState({
    totalSOPs: 0,
    activeSOPs: 0,
    inactiveSOPs: 0,
  });
  const getCategoryLabel = (category: SOP["category"]): string => {
    if (typeof category === "string") return category;
    if (category && typeof category === "object") return category.title ?? "—";
    return "—";
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadSOPs(debouncedSearchTerm, statusFilter);
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    statusFilter,
    activeStatusId,
    inactiveStatusId,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

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

      const data = await sopService.getSOPs(
        currentPage * itemsPerPage,
        itemsPerPage,
        search,
        statusCode,
      );
      // setSops(
      //   data.sops.map((sop: SOP) => ({
      //     ...sop,
      //     category:
      //       typeof sop.category === "string"
      //         ? sop.category
      //         : (sop.category?.title ?? "—"),
      //   })),
      // );
      setSops(
        data.sops.map((sop: any) => ({
          ...sop,

          // 🔥 FIX 1: normalize provider info
          providerInfo: sop.providerInfo ?? sop.provider_info ?? {},

          // 🔥 FIX 2: normalize updatedAt
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
  useEffect(() => {
    loadStatuses();
    loadStats();
  }, []);

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

  const columns = [
    {
      key: "providerName",
      header: "Provider",
      width: "32%",
      render: (_: string, row: SOP) => (
        <div>
          <div style={{ fontWeight: 500, color: "#111827" }}>
            {row.providerInfo?.providerName || row.title}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {typeof row.providerInfo?.billingProviderName === "string"
              ? row.providerInfo.billingProviderName
              : getCategoryLabel(row.category)}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      width: "15%",
      render: (_: any, row: SOP) => (
        <span className={styles.badge}>{getCategoryLabel(row.category)}</span>
      ),
    },
    {
      key: "npi",
      header: "NPI",
      width: "12%",
      render: (_: any, row: SOP) => row.providerInfo?.billingProviderNPI || "-",
    },
    {
      key: "software",
      header: "Software",
      width: "12%",
      render: (_: any, row: SOP) => row.providerInfo?.software || "-",
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      width: "14%",
      render: (_: any, row: SOP) =>
        row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "-",
    },
    {
      key: "actions",
      header: "Actions",
      width: "130px",
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
              className={`${isActive ? styles.deactivateButton : styles.activateButton} ${
                !canUpdateSOP ? styles.disabled : ""
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
  if (!canReadSOP) {
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
            className={`${styles.createButton} ${!canCreateSOP ? styles.disabled : ""}`}
            disabled={!canCreateSOP}
            onClick={() => canCreateSOP && navigate("/sops/create")}
            title={
              canCreateSOP
                ? "Create new SOP"
                : "You do not have permission to create SOPs"
            }
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

                  {/* Provider Information */}
                  <div className={styles.infoSection}>
                    <h3>Provider Information</h3>
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
    </div>
  );
};

export default SOPListing;
