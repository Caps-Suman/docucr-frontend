import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronRight, ChevronLeft, Building2, User2, Search } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import styles from "./UserModal.module.css";
import userService from "../../../services/user.service";
import clientService from "../../../services/client.service";
import CommonPagination from "../../Common/CommonPagination"; // Added import
import Loading from "../../Common/Loading";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    password?: string;
    phone_country_code?: string;
    phone_number?: string;
    role_ids: string[];
    supervisor_id?: string;
    client_id?: string | null; // Added | null for explicit unmapping
  }) => void;
  initialData?: {
    id?: string;
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    password?: string;
    phone_country_code?: string;
    phone_number?: string;
    roles: Array<{ id: string; name: string }>;
    supervisor_id?: string;
    client_id?: string;
    client_name?: string;
  };
  title?: string;
  roles?: Array<{ id: string; name: string }>;
  // supervisors?: Array<{ id: string; name: string }>;
  clientName?: string;
  isClientUser?: boolean;
  clientAdminRoleId?: string;
  allowUserTypeSelection?: boolean; // only org role
  canChooseUserType?: boolean;
  isLoading?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  roles = [],
  // supervisors = [],
  clientName,
  isClientUser,
  clientAdminRoleId,
  allowUserTypeSelection,
  canChooseUserType,   // ← add here
  isLoading,
}) => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  // const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  // const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [userRoles, setUserRoles] = useState<
    { value: string; label: string }[]
  >([]);

  const isClientMode = isClientUser;

  const [supervisorRole, setSupervisorRole] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const [supervisorOptions, setSupervisorOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [selectedSupervisor, setSelectedSupervisor] = useState<string | null>(
    null,
  );
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client Selection State
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [userType, setUserType] = useState<"internal" | "client" | null>(null);
  const isEditMode = !!initialData?.id;

  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Search & Pagination for Clients
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    console.log("allowUserTypeSelection in modal:", allowUserTypeSelection);
  }, [allowUserTypeSelection]);

  const goBackToType = () => {
    setUserType(null);
    setSelectedClient(null);
    setStep(0);
  };

  useEffect(() => {
    const initializeData = async () => {
      if (initialData) {
        setEmail(initialData.email);
        setUsername(initialData.username);
        setFirstName(initialData.first_name);
        setMiddleName(initialData.middle_name || "");
        setLastName(initialData.last_name);
        setPhoneCountryCode((initialData as any).phone_country_code || "+91");
        setPhoneNumber((initialData as any).phone_number || "");
        setUserRoles(
          initialData.roles.map((r) => ({ value: r.id, label: r.name })),
        );
        setSelectedSupervisor(initialData.supervisor_id || null);
        setPassword("");

        // CHECK FOR CLIENT MAPPING
        if (initialData.client_id) {
          setUserType("client");
          try {
            // Fetch all clients to find the name, or if there's a specific getClient endpoints
            // Since we have pagination, finding in 'all' might get expensive, but let's try getting all for now 
            // as per existing pattern or use a cached lookup if available.
            // Better: If client_name was available it would be easier. Use placeholder or fetch.
            // Assumption: clientService has getAllClients. 
            const allClients = await clientService.getAllClients();
            const matched = allClients.find((c: any) => c.id === initialData.client_id);
            setSelectedClient({
              id: initialData.client_id,
              name: matched?.name || initialData.client_name || "Unknown Client",
              npi: matched?.npi
            });
          } catch (e) {
            console.error("Error fetching client details", e);
            setSelectedClient({ id: initialData.client_id, name: "Unknown Client" });
          }
        } else {
          setUserType("internal");
          setSelectedClient(null);
        }
      } else {
        setEmail("");
        setUsername("");
        setFirstName("");
        setMiddleName("");
        setLastName("");
        setPassword("");
        setPhoneCountryCode("+91");
        setPhoneNumber("");
        setUserRoles([]);
        setSelectedSupervisor("");
        setUserType(null);
        setSelectedClient(null);
      }

      // Initial Step Logic
      if (allowUserTypeSelection) {
        setStep(0);
      } else {
        // Fallback if type selection not allowed (e.g. non-org user?)
        // If editing, go to form. If creating, go to form (internal default).
        setStep(1);
        if (!initialData?.id) setUserType("internal");
      }

      setErrors({});
    };

    initializeData();
  }, [initialData, isOpen, allowUserTypeSelection]);

  useEffect(() => {
    if (!supervisorRole) {
      setSupervisorOptions([]);
      setSelectedSupervisor(null);
      return;
    }

    let cancelled = false;
    setLoadingSupervisors(true);

    userService
      .getUsersByRole(supervisorRole.value)
      .then(users => {
        if (cancelled) return;

        setSupervisorOptions(
          users.map((u: any) => ({
            value: u.id,
            label: `${u.first_name} ${u.last_name} (${u.username})`
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setSupervisorOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSupervisors(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supervisorRole]);


  // Removed the duplicate useEffect for step logic that was here before, 
  // checking it is now handled in the main initialization useEffect above.

  // Fetch clients when switching to client type
  useEffect(() => {
    if (userType === "client") {
      setLoadingClients(true);
      // Using getAllClients or getClients with large number to support client-side pagination as requested
      clientService.getAllClients()
        .then(data => {
          setClients(data);
        })
        .catch(err => console.error("Failed to load clients", err))
        .finally(() => setLoadingClients(false));
    }
  }, [userType]);

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email format";

    if (!username.trim()) newErrors.username = "Username is required";
    else if (username.length < 3)
      newErrors.username = "Username must be at least 3 characters";
    else if (username.length > 50)
      newErrors.username = "Username cannot exceed 50 characters";

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    else if (firstName.length > 50)
      newErrors.firstName = "First name cannot exceed 50 characters";

    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    else if (lastName.length > 50)
      newErrors.lastName = "Last name cannot exceed 50 characters";

    if (middleName && middleName.length > 50)
      newErrors.middleName = "Middle name cannot exceed 50 characters";

    if (!initialData?.id && !password.trim())
      newErrors.password = "Password is required";
    else if (!initialData?.id && password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    if (phoneNumber && !/^\d{10,15}$/.test(phoneNumber)) {
      newErrors.phoneNumber = "Phone number must be 10-15 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      // Back from Client Selection
      goBackToType();
    } else if (step === 1 && userType === "client") {
      setStep(3); // Go back to client selection if coming from there
    } else if (step === 1 && isEditMode && allowUserTypeSelection) {
      setStep(0); // Allow going back to type selection in Edit Mode too?
      // "User should be able to: Change the client" -> yes
      // "If no client mapping exists: Internal User card must be selected by default."
      // If they want to switch types, they need to go back to step 0.
      // Wait, "User Type UI should be shown only if: allowUserTypeSelection"
      if (allowUserTypeSelection) setStep(0);
    } else {
      setStep(0); // Default back to type selection or close?
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    const payload: any = {
      email: email.trim(),
      username: username.trim(),
      first_name: firstName.trim(),
      middle_name: middleName.trim() || undefined,
      last_name: lastName.trim(),
      phone_country_code: phoneCountryCode,
      phone_number: phoneNumber || undefined,
      supervisor_id: selectedSupervisor || undefined,
    };

    if (!initialData?.id) payload.password = password;

    // 🔥 CLIENT USER
    if (userType === "client") {
      if (!selectedClient) {
        alert("Select client");
        return;
      }

      payload.client_id = selectedClient.id;
    }

    // 🔥 INTERNAL USER
    if (userType === "internal") {
      payload.role_ids = userRoles.map(r => r.value);
      // Explicitly remove client_id if we switched to Internal
      payload.client_id = null;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Logic for Client Selection Step (Step 3)
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.npi && c.npi.includes(searchTerm))
    );
  }, [clients, searchTerm]);

  const paginatedClients = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    // setStep(1); // Removed auto-advance
  };

  const handlePageChange = (selectedItem: { selected: number }) => {
    setCurrentPage(selectedItem.selected);
  };

  if (!isOpen) return null;

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));
  const countryCodeOptions = [
    { value: "+91", label: "+91" },
    { value: "+1", label: "+1" },
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            {title}
            {step === 3 ? " - Select Client" : !isClientMode && !isEditMode && step !== 0 && `- Step ${step} of 2`}
            {clientName && (
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "normal",
                  color: "#6b7280",
                  marginTop: "4px",
                }}
              >
                For client: {clientName}
              </div>
            )}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formContent} style={{ position: 'relative', minHeight: '200px' }}>
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                borderRadius: '8px'
              }}>
                <div className={styles.loader}>Loading form data...</div>
              </div>
            )}

            {step === 0 && allowUserTypeSelection && (
              <div className={styles.typeSelector}>
                <button
                  type="button"
                  className={`${styles.typeCard} ${userType === "internal" ? styles.active : ""}`}
                  onClick={() => {
                    setUserType("internal");
                    setSelectedClient(null);
                    setStep(1); // skip client step
                  }}
                >
                  <div className={styles.cardContent}>
                    <div className={styles.iconWrapper}>
                      <Building2 size={32} className={styles.icon} />
                    </div>
                    <h4>Internal User</h4>
                    <p>For organisation users</p>
                  </div>
                </button>

                <button
                  type="button"
                  className={`${styles.typeCard} ${styles.client} ${userType === "client" ? styles.active : ""}`}
                  onClick={() => {
                    setUserType("client");
                    setStep(3); // Go to updated Client Selection Step
                  }}
                >
                  <div className={styles.cardContent}>
                    <div className={styles.iconWrapper}>
                      <User2 size={32} className={styles.icon} />
                    </div>
                    <h4>Client User</h4>
                    <p>For client-side access & roles</p>
                  </div>
                </button>
              </div>
            )}

            {step === 3 && (
              <div className={styles.clientSelectionContainer}>
                <div className={styles.searchWrapper}>
                  <Search className={styles.searchIcon} size={16} />
                  <input
                    type="text"
                    placeholder="Search by name or NPI..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(0);
                    }}
                    className={styles.searchInput}
                  />
                </div>

                {loadingClients ? (
                  <Loading message="Loading clients..." />
                  // <div className={styles.loader}>Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                  <div className={styles.emptyState}>No clients found.</div>
                ) : (
                  <>
                    <div className={styles.tableWrapper}>
                      <table className={styles.clientTable}>
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>NPI</th>
                            <th>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedClients.map((client) => (
                            <tr
                              key={client.id}
                              onClick={() => handleClientSelect(client)}
                              className={`${styles.clientRow} ${selectedClient?.id === client.id ? styles.selectedRow : ""}`}
                            >
                              <td>{client.name}</td>
                              <td>{client.npi || "-"}</td>
                              <td><span className={styles.badge}>{client.type}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.paginationWrapper}>
                      <CommonPagination
                        pageCount={Math.ceil(filteredClients.length / itemsPerPage)}
                        onPageChange={handlePageChange}
                        currentPage={currentPage}
                        show={true}
                        renderInPlace={true}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={setItemsPerPage}
                        totalItems={filteredClients.length}
                      />
                    </div>
                  </>
                )}

              </div>
            )}

            {step === 1 && (
              <>
                {userType === "client" && selectedClient && (
                  <div className={styles.selectedClientBanner}>
                    <span className={styles.bannerLabel}>Selected Client:</span>
                    <span className={styles.bannerValue}>{selectedClient.name} ({selectedClient.npi || 'No NPI'})</span>
                    <button type="button" className={styles.changeClientBtn} onClick={() => setStep(3)}>Change</button>
                  </div>
                )}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email *</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      style={{
                        borderColor: errors.email ? "#ef4444" : "#d1d5db",
                      }}
                    />
                    {errors.email && (
                      <span className={styles.errorText}>{errors.email}</span>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Username *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      maxLength={50}
                      style={{
                        borderColor: errors.username ? "#ef4444" : "#d1d5db",
                      }}
                    />
                    {errors.username && (
                      <span className={styles.errorText}>
                        {errors.username}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>First Name *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      maxLength={50}
                      style={{
                        borderColor: errors.firstName ? "#ef4444" : "#d1d5db",
                      }}
                    />
                    {errors.firstName && (
                      <span className={styles.errorText}>
                        {errors.firstName}
                      </span>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Middle Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Enter middle name"
                      maxLength={50}
                      style={{
                        borderColor: errors.middleName ? "#ef4444" : "#d1d5db",
                      }}
                    />
                    {errors.middleName && (
                      <span className={styles.errorText}>
                        {errors.middleName}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Last Name *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      maxLength={50}
                      style={{
                        borderColor: errors.lastName ? "#ef4444" : "#d1d5db",
                      }}
                    />
                    {errors.lastName && (
                      <span className={styles.errorText}>
                        {errors.lastName}
                      </span>
                    )}
                  </div>
                  {!initialData?.id && (
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Password *</label>
                      <input
                        type="password"
                        className={styles.input}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        style={{
                          borderColor: errors.password ? "#ef4444" : "#d1d5db",
                        }}
                      />
                      {errors.password && (
                        <span className={styles.errorText}>
                          {errors.password}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone</label>
                  <div className={styles.phoneInputGroup}>
                    <Select
                      value={countryCodeOptions.find(
                        (opt) => opt.value === phoneCountryCode,
                      )}
                      onChange={(selected) =>
                        setPhoneCountryCode(selected?.value || "+91")
                      }
                      options={countryCodeOptions}
                      className={styles.countryCodeSelect}
                      classNamePrefix="select"
                      styles={{
                        ...getCustomSelectStyles(),
                        menu: (base) => ({
                          ...getCustomSelectStyles().menu(base),
                          zIndex: 10000,
                        }),
                        menuPortal: (base) => ({
                          ...base,
                          zIndex: 10000,
                        }),
                      }}
                      isSearchable={false}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        if (value.length <= 15) {
                          setPhoneNumber(value);
                        }
                      }}
                      placeholder="10-15 digits"
                      className={styles.phoneNumberInput}
                      style={{
                        borderColor: errors.phoneNumber ? "#ef4444" : "#d1d5db",
                      }}
                    />
                  </div>
                  {errors.phoneNumber && (
                    <span className={styles.errorText}>
                      {errors.phoneNumber}
                    </span>
                  )}
                </div>
              </>
            )}

            {step === 2 && userType === "internal" && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Roles</label>
                  <Select
                    isMulti
                    value={userRoles}
                    onChange={(selected) =>
                      setUserRoles(
                        selected as { value: string; label: string }[],
                      )
                    }
                    options={roleOptions}
                    placeholder="Assign roles to user"
                    styles={{
                      ...getCustomSelectStyles(),
                      menu: (base) => ({
                        ...getCustomSelectStyles().menu(base),
                        zIndex: 10000,
                      }),
                      menuPortal: (base) => ({
                        ...base,
                        zIndex: 10000,
                      }),
                    }}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Supervisor Role</label>
                  <Select
                    value={supervisorRole}
                    onChange={async (role) => {
                      setSupervisorRole(role);
                      setSelectedSupervisor(null);
                      setSupervisorOptions([]);

                      if (!role) return;

                      try {
                        setLoadingSupervisors(true);
                        const users = await userService.getUsersByRole(
                          role.value,
                        );

                        setSupervisorOptions(
                          users
                            .filter((u: any) => u.id !== initialData?.id)
                            .map((u: any) => ({
                              value: u.id,
                              label: `${u.first_name} ${u.last_name} (${u.username})`,
                            })),
                        );
                      } finally {
                        setLoadingSupervisors(false);
                      }
                    }}
                    options={roleOptions}
                    placeholder="Select role to choose supervisor from"
                    styles={{
                      ...getCustomSelectStyles(),
                      menu: (base) => ({
                        ...getCustomSelectStyles().menu(base),
                        zIndex: 10000,
                      }),
                      menuPortal: (base) => ({
                        ...base,
                        zIndex: 10000,
                      }),
                    }}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Supervisor</label>
                  <Select
                    value={supervisorOptions.find(
                      (o) => o.value === selectedSupervisor,
                    )}
                    onChange={(selected) =>
                      setSelectedSupervisor(selected?.value || null)
                    }
                    options={supervisorOptions}
                    isDisabled={!supervisorRole || loadingSupervisors}
                    placeholder={
                      loadingSupervisors
                        ? "Loading supervisors..."
                        : supervisorRole
                          ? "Select supervisor"
                          : "Select supervisor role first"
                    }
                    styles={{
                      ...getCustomSelectStyles(),
                      menu: (base) => ({
                        ...getCustomSelectStyles().menu(base),
                        zIndex: 10000,
                      }),
                      menuPortal: (base) => ({
                        ...base,
                        zIndex: 10000,
                      }),
                    }}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
              </>
            )}
          </div>
          <div className={styles.actions}>

            {/* BACK BUTTON — visible after step 0, but handle Step 3 separately or encompass it */}
            {/* Showing Back for Create Mode (steps > 0) OR for Edit Mode if in Step 3 */}
            {((!isEditMode && step > 0) || step === 3) && (
              <button type="button" className={styles.backButton} onClick={handleBack}>
                Back
              </button>
            )}

            {/* STEP 3 NEXT BUTTON */}
            {step === 3 && (
              <button
                type="button"
                className={styles.nextButton}
                disabled={!selectedClient}
                onClick={() => setStep(1)}
              >
                Next <ChevronRight size={16} />
              </button>
            )}

            {/* INTERNAL FLOW */}
            {userType === "internal" && step === 1 && (
              <button type="button" className={styles.nextButton} onClick={handleNext}>
                Next
              </button>
            )}

            {/* CREATE BUTTON */}
            {(userType === "client" && step === 1) && (
              <button type="submit" className={styles.submitButton}>
                {isEditMode ? "Update" : "Create"}
              </button>
            )}

            {userType === "internal" && step === 2 && (
              <button type="submit" className={styles.submitButton}>
                {isEditMode ? "Update" : "Create"}
              </button>
            )}

          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
