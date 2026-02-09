import React, { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../../styles/selectStyles";
import styles from "./UserModal.module.css";
import userService from "../../../services/user.service";
import clientService from "../../../services/client.service";
import ClientSelectionModal from "../../SOP/SOPListing/ClientSelectionModal";

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
  }) => void;
  initialData?: {
    id?: string;
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    roles: Array<{ id: string; name: string }>;
    supervisor_id?: string;
  };
  title?: string;
  roles?: Array<{ id: string; name: string }>;
  // supervisors?: Array<{ id: string; name: string }>;
  clientName?: string;
  clientAdminRoleId?: string;
  canChooseUserType?: boolean;
  isLoading?: boolean;
}

const UserModal: React.FC<UserModalProps > = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  roles = [],
  // supervisors = [],
  clientName,
  clientAdminRoleId,
  canChooseUserType,   // ← add here
  isLoading,
}) => {
  const [step, setStep] = useState(1);
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
const isClientMode = !!clientAdminRoleId;

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
const [userType, setUserType] = useState<"internal" | "client" | null>(null);
const [selectedClient, setSelectedClient] = useState<any>(null);
const [clients, setClients] = useState<any[]>([]);

const [clientModalOpen, setClientModalOpen] = useState(false);

  useEffect(() => {
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
      setSelectedSupervisor(initialData.supervisor_id || "");
      setPassword("");
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
    }
    setStep(1);
    setErrors({});
  }, [initialData, isOpen]);

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

  useEffect(() => {
  if (userType === "client") {
    clientService.getClients(1, 1000).then(res => {
      setClients(res.clients);
    });
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
    setStep(1);
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

  if (userType === "client") {
    if (!selectedClient) {
      alert("Select client");
      return;
    }

if (!clientAdminRoleId) {
  alert("CLIENT_ADMIN role not found");
  return;
}

payload.role_ids = [clientAdminRoleId];
    payload.client_id = selectedClient.id;
  }

  if (userType === "internal") {
    payload.role_ids = userRoles.map(r => r.value);
  }

  setIsSubmitting(true);
  try {
    await onSubmit(payload);
  } finally {
    setIsSubmitting(false);
  }
};



  if (!isOpen) return null;
const handleClientSelected = (client: any) => {
  setSelectedClient(client);
  setClientModalOpen(false);
};

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
{title} {!isClientMode && `- Step ${step} of 2`}
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
            {!userType && (
  <div className={styles.typeSelector}>
    <button
      onClick={() => setUserType("internal")}
      className={styles.typeBtn}
    >
      Internal User
    </button>

    <button
      onClick={() => setUserType("client")}
      className={styles.typeBtn}
    >
      Client User
    </button>
  </div>
)}
            {step === 1 && (

              
              <>
                <div className={styles.formRow}>

                  {userType === "client" && (
  <div className={styles.formGroup}>
    <label>Client</label>

    <div style={{ display: "flex", gap: 10 }}>
      <input
        value={selectedClient?.name || ""}
        readOnly
        placeholder="Select client"
        className={styles.input}
      />

      <button
        type="button"
        onClick={() => setClientModalOpen(true)}
      >
        Select
      </button>
    </div>
  </div>
)}

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

{step === 2 &&  userType === "internal" &&  (
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
  {userType === "internal" && step === 1 && (
    <button type="button" onClick={handleNext}>
      Next
    </button>
  )}

  {(userType === "client" || step === 2) && (
    <button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Saving..." : "Create"}
    </button>
  )}
</div>

        </form>
      </div>
      <ClientSelectionModal
  isOpen={clientModalOpen}
  onClose={() => setClientModalOpen(false)}
  onSelect={handleClientSelected}
/>

    </div>

    
  );
};

export default UserModal;
