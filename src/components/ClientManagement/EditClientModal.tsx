import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { X, Loader2 } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../styles/selectStyles";
import clientService, { Client } from "../../services/client.service";
import styles from "./ClientModal.module.css";
import Toast, { ToastType } from "../Common/Toast";

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<Client>;
  initialData: Client;
}

const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [businessName, setBusinessName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [npi, setNpi] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [stateName, setStateName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [city, setCity] = useState("");
  
  const [primaryTempId, setPrimaryTempId] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingNpi, setFetchingNpi] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (!initialData || !isOpen) return;

    setBusinessName(initialData.business_name || "");
    setFirstName(initialData.first_name || "");
    setMiddleName(initialData.middle_name || "");
    setLastName(initialData.last_name || "");
    setNpi(initialData.npi || "");
    setDescription(initialData.description || "");

    const t = initialData.type === "Group" ? "Group" : "Individual";
    setType(t);

    if (initialData.locations && initialData.locations.length > 0) {
      const primary = initialData.locations.find((l) => l.is_primary) || initialData.locations[0];
      setAddressLine1(primary.address_line_1 || "");
      setAddressLine2(primary.address_line_2 || "");
      setCity(primary.city || "");
      setStateCode(primary.state_code || "");
      setStateName(primary.state_name || "");
      setZipCode(primary.zip_code || "");
      setCountry(primary.country || "United States");
      setPrimaryTempId(primary.id);
    } else {
      setAddressLine1(initialData.address_line_1 || "");
      setAddressLine2(initialData.address_line_2 || "");
      setCity(initialData.city || "");
      setStateCode(initialData.state_code || "");
      setStateName(initialData.state_name || "");
      setZipCode(initialData.zip_code || "");
      setCountry(initialData.country || "United States");
      setPrimaryTempId(crypto.randomUUID());
    }
    
    setErrors({});
  }, [initialData, isOpen]);

  const npiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!npi || npi.length === 0) {
      if (npiTimeoutRef.current) clearTimeout(npiTimeoutRef.current);
      return;
    }

    if (npi.length === 10) {
      if (initialData && npi === initialData.npi) return;

      if (npiTimeoutRef.current) clearTimeout(npiTimeoutRef.current);

      npiTimeoutRef.current = setTimeout(() => {
        handleFetchNPIDetails();
      }, 400);
    }
  }, [npi, initialData]);

  const handleFetchNPIDetails = async () => {
    if (!npi || npi.length !== 10) {
      setErrors({ npi: "Please enter a valid 10-digit NPI" });
      return;
    }

    setFetchingNpi(true);
    setErrors({});
    try {
      const existing = await clientService.checkExistingNPIs([npi]);
      if (existing.length > 0 && npi !== initialData.npi) {
        setErrors({ npi: "This NPI is already registered in the system" });
        setFetchingNpi(false);
        return;
      }

      const data = await clientService.lookupNPI(npi);
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const basic = result.basic;
        const addresses = result.addresses;

        if (result.enumeration_type === "NPI-1" && type === "Individual") {
            setFirstName(basic.first_name || "");
            setMiddleName(basic.middle_name || "");
            setLastName(basic.last_name || "");
        } else if (result.enumeration_type === "NPI-2" && type === "Group") {
            setBusinessName(
              basic.organization_name ||
              basic.authorized_official_organization_name || ""
            );
        } else {
          const expectedType = type === "Individual" ? "NPI-1 (Individual)" : "NPI-2 (Group)";
          const actualType = result.enumeration_type === "NPI-1" ? "Individual" : "Group";
          setErrors({
            npi: `Found ${actualType} but expected ${expectedType}`,
          });
          setFetchingNpi(false);
          return;
        }

        const practiceAddress =
          addresses.find((addr: any) => addr.address_purpose === "LOCATION") ||
          addresses[0];
          
        if (practiceAddress) {
          const sCode = practiceAddress.state || "";
          let sName = "";
          
          const statesMap: { [key: string]: string } = {
            AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
            CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
            HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
            KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
            MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
            MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
            NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
            ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
            RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
            TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
            WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
          };

          if (statesMap[sCode]) {
            sName = statesMap[sCode];
          }

          const postalCode = practiceAddress.postal_code || "";
          const digits = postalCode.replace(/\D/g, "");
          let zipVal = "";

          if (digits.length >= 9) {
            zipVal = `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
          } else if (digits.length >= 5) {
            zipVal = digits.slice(0, 5);
          }

          setAddressLine1(practiceAddress.address_1 || "");
          setAddressLine2(practiceAddress.address_2 || "");
          setCity(practiceAddress.city || "");
          setStateCode(sCode);
          setStateName(sName);
          if (zipVal) setZipCode(zipVal);
        }
      } else {
        setErrors({ npi: "No provider found for this NPI" });
      }
    } catch (error) {
      console.error("Error fetching NPI details:", error);
      setErrors({ npi: "Failed to fetch NPI details" });
    } finally {
      setFetchingNpi(false);
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    if (type === "Group" && !businessName.trim()) {
      newErrors.businessName = "Business Name is required";
      isValid = false;
    }

    if (type === "Individual" && !firstName.trim()) {
      newErrors.firstName = "First Name is required";
      isValid = false;
    }

    if (!npi) {
      newErrors.npi = "NPI is required";
      isValid = false;
    } else if (!/^\d{10}$/.test(npi)) {
      newErrors.npi = "NPI must be exactly 10 digits";
      isValid = false;
    }

    if (!city.trim()) {
      newErrors.city = "City is required";
      isValid = false;
    }
    
    if (!addressLine1.trim()) {
        newErrors.addressLine1 = "Address Line 1 is required";
        isValid = false;
    }

    if (!zipCode || (!/^\d{5}$/.test(zipCode) && !/^\d{5}-\d{4}$/.test(zipCode))) {
      newErrors.zip_code = "ZIP code must be in format 11111 or 11111-1111";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
       setToast({ message: "Please check form errors before submitting", type: "error" });
       return;
    }

    const payload: any = {
      is_user: false,
      type: type === "Group" ? "Group" : "Individual",
      description,
      
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      city,
      state_code: stateCode,
      state_name: stateName,
      zip_code: zipCode,
      country,
    };

    if (type === "Group") {
      payload.business_name = businessName;
      payload.npi = npi;
    } else {
      payload.first_name = firstName;
      payload.middle_name = middleName;
      payload.last_name = lastName;
      payload.npi = npi;
    }

    // Include primary location in the locations array for differential sync
    const primaryLocation: any = {
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      city,
      state_code: stateCode,
      state_name: stateName,
      zip_code: zipCode,
      country,
      is_primary: true,
      id: primaryTempId || initialData.id // Fallback ID usage mostly for backend logic parity
    };
    
    // We only update the basic info and primary location here
    payload.locations = [primaryLocation];
    
    // The backend `update_client` will diff everything. 
    // We MUST include existing secondary locations and providers so they are NOT deleted.
    const secondaryLocations = (initialData.locations || [])
        .filter(l => !l.is_primary)
        .map(l => ({ ...l, id: l.id })); // Keep their IDs to safely update them back without dropping
        
    payload.locations.push(...secondaryLocations);
    
    if (initialData.providers) {
        payload.providers = initialData.providers.map(p => ({
            ...p,
            id: p.id,
            location_temp_id: p.location_id
        }));
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err: any) {
      console.error("Failed to submit:", err);
      setToast({ message: err?.message || "Failed to update client", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit Client</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formContent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Client Type *</label>
              <input
                 type="text"
                 className={styles.input}
                 value={type === "Group" ? "Group" : "Individual"}
                 disabled
                 style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>NPI *</label>
              <div className={styles.npiInputWrapper}>
                <input
                  className={`${styles.input} ${fetchingNpi ? styles.fetching : ''}`}
                  value={npi}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length > 10) return;
                    setNpi(value);
                  }}
                  style={{ 
                    paddingRight: fetchingNpi ? '40px' : '12px',
                    borderColor: errors.npi ? "#ef4444" : "#d1d5db"
                  }}
                />
                {fetchingNpi && (
                  <div className={styles.inputSpinnerWrapper}>
                    <div className={styles.spinner} />
                  </div>
                )}
              </div>
              {errors.npi && (
                <span className={styles.errorText}>{errors.npi}</span>
              )}
            </div>

            {type === "Group" ? (
              <div className={styles.formGroup}>
                <label className={styles.label}>Business Name *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter business name"
                  style={{
                    borderColor: errors.businessName ? "#ef4444" : "#d1d5db",
                  }}
                />
                  {errors.businessName && (
                    <span className={styles.errorText}>
                      {errors.businessName}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.formRowSplit}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>First Name *</label>
                    <input
                      className={styles.input}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{ borderColor: errors.firstName ? "#ef4444" : undefined }}
                    />
                    {errors.firstName && <span className={styles.errorText}>{errors.firstName}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Middle Name</label>
                    <input
                      className={styles.input}
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input
                    className={styles.input}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Address Line 1 *</label>
              <input
                className={styles.input}
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                style={{ borderColor: errors.addressLine1 ? "#ef4444" : undefined }}
              />
              {errors.addressLine1 && <span className={styles.errorText}>{errors.addressLine1}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Address Line 2</label>
              <input
                className={styles.input}
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>City *</label>
              <input
                className={styles.input}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ borderColor: errors.city ? "#ef4444" : undefined }}
              />
              {errors.city && <span className={styles.errorText}>{errors.city}</span>}
            </div>

            <div className={styles.formRowSplit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>State Code</label>
                <input
                  className={styles.input}
                  value={stateCode}
                  maxLength={2}
                  onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>State Name</label>
                <input
                  className={styles.input}
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formRowSplit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Country *</label>
                <input
                  className={styles.input}
                  value={country}
                  disabled
                  style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>ZIP Code *</label>
                <input
                  className={styles.input}
                  value={zipCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const formatted = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5, 9)}` : val;
                    setZipCode(formatted);
                  }}
                  style={{ borderColor: errors.zip_code ? "#ef4444" : undefined }}
                />
                {errors.zip_code && <span className={styles.errorText}>{errors.zip_code}</span>}
              </div>
            </div>

          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || fetchingNpi}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </button>
          </div>
        </form>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </div>
    </div>,
    document.body
  );
};

export default EditClientModal;
