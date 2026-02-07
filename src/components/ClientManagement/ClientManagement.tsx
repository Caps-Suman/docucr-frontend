import React, { useState, useEffect } from "react";
import {
  Users,
  Edit2,
  PlayCircle,
  StopCircle,
  UserCheck,
  UserX,
  UserMinus,
  Briefcase,
  Upload,
  Loader2,
  Info,
} from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../styles/selectStyles";
import Table from "../Table/Table";
import CommonPagination from "../Common/CommonPagination";
import Loading from "../Common/Loading";
import ConfirmModal from "../Common/ConfirmModal";
import Toast, { ToastType } from "../Common/Toast";
import ClientModal from "./ClientModal";
import ClientImportModal from "./ClientImportModal";
import UserMappingModal from "./UserMappingModal";
import ClientProvidersModal from "./ClientProvidersModal"; // Imported
import clientService, {
  Client,
  ClientStats,
} from "../../services/client.service";
import statusService, { Status } from "../../services/status.service";
import UserModal from "../UserPermissionManagement/UserManagement/UserModal";
import userService from "../../services/user.service";
import roleService from "../../services/role.service";
import styles from "./ClientManagement.module.css";
import { debounce } from "../../utils/debounce";
import authService from "../../services/auth.service";

const ClientManagement: React.FC = () => {
  const currentUser = authService.getUser();
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [clients, setClients] = useState<Client[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [users, setUsers] = useState<
    Array<{ id: string; name: string; roles: string }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const [usersLoading, setUsersLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    client: Client | null;
    action: "toggle";
  }>({
    isOpen: false,
    client: null,
    action: "toggle",
  });
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // Cross-creation state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [crossCreationData, setCrossCreationData] = useState<any>(null);
  const [showCrossCreationConfirm, setShowCrossCreationConfirm] =
    useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  // const [supervisors, setSupervisors] = useState<Array<{ id: string; name: string }>>([]);

  const openAssignModal = () => {
    setShowAssignModal(true);
    if (users.length === 0 && !usersLoading) {
      loadUserFormData();
    }
  };

  const loadUserFormData = async () => {
    try {
      setUsersLoading(true);

      const [rolesData, usersData] = await Promise.all([
        roleService.getAssignableRoles(1, 100),
        userService.getUsers(1, 1000),
      ]);

      setRoles(rolesData.roles.map((r) => ({ id: r.id, name: r.name })));

      // setSupervisors(usersData.users.map(u => ({
      //     id: u.id,
      //     name: `${u.first_name} ${u.last_name} (${u.username})`
      // })));

      setUsers(
        usersData.users.map((u) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name} (${u.username})`,
          roles: u.roles.map((r) => r.name).join(", ") || "No roles",
        })),
      );
    } catch (error) {
      console.error("Failed to load user form data:", error);
      setToast({ message: "Failed to load users", type: "error" });
    } finally {
      setUsersLoading(false);
    }
  };

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, statusFilter]);

  useEffect(() => {
    const debouncedHandler = debounce((term: string) => {
      setDebouncedSearchTerm(term);
      setCurrentPage(0);
    }, 500);

    debouncedHandler(searchTerm);
  }, [searchTerm]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        clientService.getClients(
          currentPage + 1,
          itemsPerPage,
          debouncedSearchTerm || undefined,
          statusFilter || undefined,
        ),
        clientService.getClientStats(),
      ]);
      setClients(data.clients);
      setTotalClients(data.total);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load clients:", error);
      setToast({ message: "Failed to load clients", type: "error" });
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  };

  const handleToggleStatus = (client: Client) => {
    setConfirmModal({ isOpen: true, client, action: "toggle" });
  };

  const handleEdit = async (client: Client) => {
    try {
      if (client.type !== "Individual" && client.type !== "NPI1") {
        setLoading(true);
        const fullClient = await clientService.getClient(client.id);
        setEditingClient(fullClient);
      } else {
        setEditingClient(client);
      }
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch client details:", error);
      setToast({ message: "Failed to load client details", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleImport = () => {
    setShowImportModal(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleImportSuccess = () => {
    loadClients();
    setToast({ message: "Clients imported successfully", type: "success" });
  };

  const handleCrossCreationConfirm = async () => {
    setShowCrossCreationConfirm(false);
    loadUserFormData();

    const clientRole = roles.find((r) => r.name.toUpperCase() === "CLIENT");

    setCrossCreationData((prev: any) => ({
      ...prev,
      roles: clientRole ? [{ id: clientRole.id, name: clientRole.name }] : [],
    }));

    setIsUserModalOpen(true);
  };

  const handleUserModalSubmit = async (data: any) => {
    try {
      const payload = { ...data, client_id: crossCreationData?.client_id };
      await userService.createUser(payload);
      setToast({ message: "User created successfully", type: "success" });
      setIsUserModalOpen(false);
      setCrossCreationData(null);
    } catch (error: any) {
      console.error("Failed to create user:", error);
      setToast({
        message: error?.message || "Failed to create user",
        type: "error",
      });
    }
  };

  const handleModalSubmit = async (data: any): Promise<Client> => {
    console.log("ClientManagement received data:", JSON.stringify(data, null, 2));
    try {
      if (editingClient) {
        const updated = await clientService.updateClient(editingClient.id, data);
        setToast({ message: "Client updated successfully", type: "success" });
        handleModalClose();
        loadClients();
        return updated; // ✅ RETURN
      } else {
        const newClient = await clientService.createClient(data);
        setToast({ message: "Client created successfully", type: "success" });
        handleModalClose();
        loadClients();

        setCrossCreationData({
          client_id: newClient.id,
          email: "",
          username: "",
          first_name: data.first_name || "",
          middle_name: data.middle_name || "",
          last_name: data.last_name || "",
          roles: [],
          supervisor_id: undefined,
        });
        setShowCrossCreationConfirm(true);

        return newClient; // ✅ RETURN
      }
    } catch (error: any) {
      console.error("Failed to save client:", error);
      setToast({
        message: error?.message || "Failed to save client",
        type: "error",
      });
      throw error; // ✅ important for Promise<Client>
    }
  };

  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssignClients = async (userId: string) => {
    try {
      setIsAssigning(true);
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const assignedBy = currentUser.id || "system";
      await clientService.assignClientsToUser(
        userId,
        selectedClients,
        assignedBy,
      );
      setToast({ message: "Clients assigned successfully", type: "success" });
      setSelectedClients([]);
      setSelectedUserId("");
      setShowAssignModal(false);
      loadClients();
    } catch (error: any) {
      console.error("Failed to assign clients:", error);
      setToast({
        message: error?.message || "Failed to assign clients",
        type: "error",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(clients.map((c) => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients((prev) => [...prev, clientId]);
    } else {
      setSelectedClients((prev) => prev.filter((id) => id !== clientId));
    }
  };

  const [showUserMappingModal, setShowUserMappingModal] = useState(false);
  const [selectedMappingClient, setSelectedMappingClient] = useState<Client | null>(null);

  const handleShowClientUsers = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedMappingClient(client);
      setShowUserMappingModal(true);
    }
  };

  const [showProvidersModal, setShowProvidersModal] = useState(false);
  const [selectedProviderClient, setSelectedProviderClient] = useState<{ id: string, name: string } | null>(null);

  const handleShowClientProviders = (clientId: string, clientName: string) => {
    setSelectedProviderClient({ id: clientId, name: clientName });
    setShowProvidersModal(true);
  };



  const handleConfirmAction = async () => {
    if (!confirmModal.client) return;

    setActionLoading(confirmModal.client.id);
    try {
      const isActive = confirmModal.client.status_code === "ACTIVE";
      if (isActive) {
        await clientService.deactivateClient(confirmModal.client.id);
        setToast({
          message: "Client deactivated successfully",
          type: "success",
        });
      } else {
        await clientService.activateClient(confirmModal.client.id);
        setToast({ message: "Client activated successfully", type: "success" });
      }
      loadClients();
    } catch (error: any) {
      console.error("Failed to perform action:", error);
      setToast({
        message: error?.message || "Failed to perform action",
        type: "error",
      });
    } finally {
      setActionLoading(null);
      setConfirmModal({ isOpen: false, client: null, action: "toggle" });
    }
  };

  const clientColumns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={
            selectedClients.length === clients.length && clients.length > 0
          }
          onChange={(e) => handleSelectAll(e.target.checked)}
          style={{ margin: 0 }}
        />
      ),
      render: (_: any, row: Client) => (
        <input
          type="checkbox"
          checked={selectedClients.includes(row.id)}
          onChange={(e) => handleSelectClient(row.id, e.target.checked)}
          style={{ margin: 0 }}
        />
      ),
      width: "40px",
    },
    {
      key: "name",
      header: "Name",
      render: (_: any, row: Client) => {
        if (row.business_name) return row.business_name;
        const name = [row.first_name, row.middle_name, row.last_name]
          .filter(Boolean)
          .join(" ");
        return (
          name || (
            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>N/A</span>
          )
        );
      },
    },
    {
      key: "npi",
      header: "NPI",
      render: (value: string | null) =>
        value || (
          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>N/A</span>
        ),
    },
    {
      key: "type",
      header: "Type",
      render: (value: string | null) =>
        value || (
          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>N/A</span>
        ),
    },
    {
      key: "state_name",
      header: "State",
      render: (value: string | null) =>
        value ? (
          value
        ) : (
          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>N/A</span>
        ),
    },
    {
      key: "status_code",
      header: "Status",
      render: (value: string | null) => {
        const isActive = value === "ACTIVE";
        return (
          <span
            className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      key: 'users',
      header: 'Users',
      render: (_: any, row: Client) => {
        const count = row.user_count ?? 0;
        let text = 'No users';

        // Default styles for "No users" (Gray/Neutral)
        let style = {
          bg: '#f3f4f6',
          color: '#6b7280',
          hoverBg: '#e5e7eb'
        };

        if (count > 0) {
          text = count === 1 ? '1 User' : `${count} Users`;
          // Styles for Active Users (Blue)
          style = {
            bg: '#e0f2fe',
            color: '#0369a1',
            hoverBg: '#bae6fd'
          };
        }

        return (
          <div
            onClick={() => handleShowClientUsers(row.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 12px',
              background: style.bg,
              color: style.color,
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = style.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = style.bg}
          >
            {text}
          </div>
        );
      }
    },
    {
      key: 'providers',
      header: 'Providers',
      render: (_: any, row: Client) => {
        if (row.type === 'Individual') {
          return <span style={{ color: '#9ca3af' }}>.....</span>;
        }
        const count = row.provider_count ?? 0;
        let text = 'No Providers';
        let isClickable = false;

        // Default styles for "No Providers" (Gray/Neutral)
        let style = {
          bg: '#f3f4f6',
          color: '#9ca3af', // Gray text
          hoverBg: '#f3f4f6',
          cursor: 'default'
        };

        if (count > 0) {
          text = count === 1 ? '1 Provider' : `${count} Providers`;
          isClickable = true;
          // Styles for Active Providers (Blue) - Matching Users column style
          style = {
            bg: '#e0f2fe',
            color: '#0369a1',
            hoverBg: '#bae6fd',
            cursor: 'pointer'
          };
        }

        return (
          <div
            onClick={() => isClickable && handleShowClientProviders(row.id, row.business_name || `${row.first_name} ${row.last_name}`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 12px',
              background: style.bg,
              color: style.color,
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: style.cursor,
              transition: 'background 0.2s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.background = style.hoverBg; }}
            onMouseLeave={(e) => { if (isClickable) e.currentTarget.style.background = style.bg; }}
          >
            {text}
          </div>
        );
      }
    },
    {
      key: "created_at",
      header: "Created Date",
      render: (value: string | null) => {
        if (!value)
          return (
            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>N/A</span>
          );
        return new Date(value).toLocaleDateString();
      },
    },
    ...(currentUser?.role?.name === 'SUPER_ADMIN' ? [{
      key: 'organisation_name',
      header: 'Organisation',
      render: (_: any, row: Client) => row.organisation_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>
    }] : []),
    {
      key: "actions",
      header: "Actions",
      render: (_: any, row: Client) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <span className="tooltip-wrapper" data-tooltip="Edit">
            <button
              className={`${styles.actionBtn} ${styles.edit}`}
              onClick={() => handleEdit(row)}
            >
              <Edit2 size={14} />
            </button>
          </span>
          {/* {!row.is_user && (
            <span className="tooltip-wrapper" data-tooltip="Create User">
              <button
                className={`${styles.actionBtn} ${styles.createUser}`}
                onClick={() => {
                  loadUserFormData();

                  const clientRole = roles.find(
                    (r) => r.name.toUpperCase() === "CLIENT",
                  );

                  setCrossCreationData({
                    client_id: row.id,
                    email: "",
                    username: "",
                    first_name: row.first_name || "",
                    middle_name: row.middle_name || "",
                    last_name: row.last_name || "",
                    roles: clientRole
                      ? [{ id: clientRole.id, name: clientRole.name }]
                      : [],
                    supervisor_id: undefined,
                  });

                  setIsUserModalOpen(true);
                }}
              >
                <UserCheck size={14} />
              </button>
            </span>
          )} */}
          <span
            className="tooltip-wrapper"
            data-tooltip={
              row.status_code === "ACTIVE" ? "Deactivate" : "Activate"
            }
          >
            <button
              className={`${styles.actionBtn} ${row.status_code === "ACTIVE" ? styles.deactivate : styles.activate}`}
              onClick={() => handleToggleStatus(row)}
            >
              {row.status_code === "ACTIVE" ? (
                <StopCircle size={14} />
              ) : (
                <PlayCircle size={14} />
              )}
            </button>
          </span>
        </div>
      ),
    },
  ];

  const handleStatClick = (type: "total" | "active" | "inactive") => {
    if (type === "total") {
      setStatusFilter(null);
    } else if (type === "active") {
      setStatusFilter("ACTIVE");
    } else if (type === "inactive") {
      setStatusFilter("INACTIVE");
    }
    setCurrentPage(0);
  };

  const clientStats = [
    {
      title: "Total Clients",
      value: stats?.total_clients.toString() || "0",
      icon: Users,
      color: "blue",
      onClick: () => handleStatClick("total"),
      active: statusFilter === null,
    },
    {
      title: "Active Clients",
      value: stats?.active_clients.toString() || "0",
      icon: UserCheck,
      color: "green",
      onClick: () => handleStatClick("active"),
      active: statusFilter === "ACTIVE",
    },
    {
      title: "Inactive Clients",
      value: stats?.inactive_clients.toString() || "0",
      icon: UserX,
      color: "red",
      onClick: () => handleStatClick("inactive"),
      active: statusFilter === "INACTIVE",
    },
  ];

  if (isInitialLoading) {
    return (
      <div className={styles.managementContent}>
        <div className={styles.statsGrid}>
          {clientStats.map((stat, index) => (
            <div
              key={index}
              className={`${styles.statCard} ${styles[stat.color]} ${stat.active ? styles.selected : ""}`}
              onClick={stat.onClick}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.statIcon}>
                <stat.icon size={16} />
              </div>
              <div className={styles.statContent}>
                <h3>{stat.value}</h3>
                <p>{stat.title}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h2>
              <Users
                size={18}
                style={{ marginRight: "8px", verticalAlign: "middle" }}
              />
              Clients
            </h2>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {selectedClients.length > 0 && (
                <button className={styles.assignBtn} onClick={openAssignModal}>
                  Assign ({selectedClients.length}) to User
                </button>
              )}
              <input
                type="text"
                placeholder="Search by name, business name, or NPI..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                className={styles.searchInput}
              />
              <button className={styles.addBtn} onClick={handleAddNew}>
                Add Client
              </button>
            </div>
          </div>
          <Loading message="Loading clients..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.managementContent}>
      <div className={styles.statsGrid}>
        {clientStats.map((stat, index) => (
          <div
            key={index}
            className={`${styles.statCard} ${styles[stat.color]} ${stat.active ? styles.selected : ""}`}
            onClick={stat.onClick}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.statIcon}>
              <stat.icon size={16} />
            </div>
            <div className={styles.statContent}>
              <h3>{stat.value}</h3>
              <p>{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <h2>
            <Users
              size={18}
              style={{ marginRight: "8px", verticalAlign: "middle" }}
            />
            Clients
          </h2>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {selectedClients.length > 0 && (
              <div className={styles.selectionInfo}>
                <span className={styles.selectionCount}>
                  <Users size={16} />
                  <strong>{selectedClients.length}</strong> clients selected
                </span>

                <button className={styles.assignBtn} onClick={openAssignModal}>
                  Click to Assign
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder="Search by name, business name, or NPI..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
              }}
              className={styles.searchInput}
            />
            <button className={styles.addBtn} onClick={handleAddNew}>
              Add Client
            </button>
            <button className={styles.addBtn} onClick={handleImport}>
              <Upload size={14} style={{ marginRight: "6px" }} />
              Import Client
            </button>
          </div>
        </div>
        {clients.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#64748b",
            }}
          >
            <Briefcase
              size={48}
              style={{ marginBottom: "16px", opacity: 0.3 }}
            />
            <h3
              style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 600 }}
            >
              No clients found
            </h3>
            <p style={{ margin: 0, fontSize: "14px" }}>
              {searchTerm
                ? "Try adjusting your search criteria"
                : "Get started by adding your first client"}
            </p>
          </div>
        ) : (
          <Table
            columns={clientColumns}
            data={clients}
            maxHeight="calc(100vh - 300px)"
          />
        )}
        {loading && !isInitialLoading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(255, 255, 255, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <Loading message="Updating..." />
          </div>
        )}
      </div>

      <CommonPagination
        show={totalClients > 0}
        pageCount={Math.ceil(totalClients / itemsPerPage)}
        currentPage={currentPage}
        totalItems={totalClients}
        itemsPerPage={itemsPerPage}
        onPageChange={(data) => setCurrentPage(data.selected)}
        onItemsPerPageChange={(items) => {
          setItemsPerPage(items);
          setCurrentPage(0);
        }}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, client: null, action: "toggle" })
        }
        onConfirm={handleConfirmAction}
        title={
          confirmModal.client?.status_code === "ACTIVE"
            ? "Deactivate Client"
            : "Activate Client"
        }
        message={`Are you sure you want to ${confirmModal.client?.status_code === "ACTIVE" ? "deactivate" : "activate"} this client?`}
        confirmText={
          confirmModal.client?.status_code === "ACTIVE"
            ? "Deactivate"
            : "Activate"
        }
        type="warning"
      />

      <ClientModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={editingClient || undefined}
        title={editingClient ? "Edit Client" : "Add New Client"}
      />

      <ClientProvidersModal
        isOpen={showProvidersModal}
        onClose={() => setShowProvidersModal(false)}
        clientId={selectedProviderClient?.id || null}
        clientName={selectedProviderClient?.name || ''}
      />

      <ClientImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />

      <ConfirmModal
        isOpen={showCrossCreationConfirm}
        onClose={() => setShowCrossCreationConfirm(false)}
        onConfirm={handleCrossCreationConfirm}
        title="Create Linked User"
        message="Client created successfully. Do you want to create a linked User account for this client?"
        confirmText="Yes, Create User"
        type="info"
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleUserModalSubmit}
        initialData={crossCreationData}
        title="Create Linked User"
        roles={roles}
        isLoading={usersLoading}
        // supervisors={supervisors}
        clientName={
          crossCreationData
            ? clients.find((c) => c.id === crossCreationData.client_id)
              ?.business_name ||
            [
              crossCreationData.first_name,
              crossCreationData.middle_name,
              crossCreationData.last_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            "Unknown Client"
            : undefined
        }
        isClientUser={true}
      />

      {showAssignModal && (
        <div
          className={styles.overlay}
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className={styles.assignModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.assignModalHeader}>
              <h3>Assign Clients to User</h3>
              <button onClick={() => setShowAssignModal(false)}>×</button>
            </div>

            {/* BODY — ALWAYS PRESENT */}
            <div className={styles.assignModalBody} style={{ minHeight: 140 }}>
              {usersLoading ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: "#64748b",
                  }}
                >
                  <Loading message="Loading users..." />
                  <span style={{ fontSize: "13px" }}>
                    Fetching assignable users
                  </span>
                </div>
              ) : (
                <>
                  <label>Select User:</label>

                  <Select
                    options={users.map((user) => ({
                      value: user.id,
                      label: `${user.name} - ${user.roles}`,
                    }))}
                    onChange={(selected) =>
                      setSelectedUserId(selected?.value || "")
                    }
                    placeholder="Select a user..."
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    styles={{
                      ...getCustomSelectStyles(),
                      menuPortal: (base) => ({
                        ...base,
                        zIndex: 9999, // 🔴 THIS IS THE KEY
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                    }}
                  />

                  <p style={{ marginTop: 8, color: "#475569" }}>
                    {selectedClients.length} client(s) will be assigned to the
                    selected user.
                  </p>
                </>
              )}
            </div>

            {/* FOOTER — ALWAYS PRESENT */}
            <div className={styles.assignModalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.assignButton}
                onClick={() => handleAssignClients(selectedUserId)}
                disabled={usersLoading || !selectedUserId || isAssigning}
              >
                {isAssigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserMappingModal && (
        <UserMappingModal
          isOpen={showUserMappingModal}
          onClose={() => setShowUserMappingModal(false)}
          client={selectedMappingClient}
          onUpdate={loadClients}
        />
      )}

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

export default ClientManagement;
