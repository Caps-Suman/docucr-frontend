import React, { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../styles/selectStyles";
import { Client } from "../../services/client.service";
import clientService from "../../services/client.service";
import styles from "./ClientModal.module.css";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    business_name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    npi?: string;
    type?: string;
    status_id?: string | number;
    description?: string;

    // ADDRESS
    address_line_1?: string;
    address_line_2?: string;
    state_code?: string;
    state_name?: string;
    zip_code?: string;
    country?: string;
    city?: string;
  }) =>  Promise<Client>;

  initialData?: Client;
  title: string;
}
export type ProviderForm = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  npi: string;

  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_code: string;
  state_name?: string;
  country: string;
  zip_code: string;
  location_temp_id: string;  // ← IMPORTANT
};

const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const [businessName, setBusinessName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [npi, setNpi] = useState("");
  const [type, setType] = useState("Individual");
  const [statusId, setStatusId] = useState<string | number>("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [stateName, setStateName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [city, setCity] = useState("");
  const [isProviderOrg, setIsProviderOrg] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [primaryTempId, setPrimaryTempId] = useState("");

  const [extraAddresses, setExtraAddresses] = useState<
    Array<{
      temp_id: string;
      address_line_1: string;
      address_line_2?: string;
      city: string;
      state_code: string;
      state_name?: string;
      zip_code: string;
      country: string;
    }>
  >([]);

  const [providers, setProviders] = useState<ProviderForm[]>([
    {
      first_name: "",
      middle_name: "",
      last_name: "",
      npi: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state_code: "",
      state_name: "",
      zip_code: "",
      country: "",
      location_temp_id:"",
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;

    // 🔒 HARD RESET WIZARD STATE
    setStep(1);
    setIsProviderOrg(false);

    // optional but sane
    setProviders([
      {
        first_name: "",
        middle_name: "",
        last_name: "",
        npi: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state_code: "",
        state_name: "",
        zip_code: "",
        country: "",
        location_temp_id:"",
      },
    ]);
  }, [isOpen]);

const handleFinish = async () => {
  const payload: any = {
    type: type === "Group" ? "NPI2" : "NPI1",
    description,
  };

  if (type === "Group") {
    payload.business_name = businessName;
    payload.npi = npi;
    payload.primary_temp_id = primaryTempId;
payload.locations = [
  {
    temp_id: primaryTempId,
    address_line_1: addressLine1,
    address_line_2: addressLine2,
    city,
    state_code: stateCode,
    state_name: stateName,
    zip_code: zipCode,
    country,
    is_primary: true
  },
  ...extraAddresses.map(a => ({
    ...a,
    temp_id: a.temp_id,
    is_primary: false
  }))
];



    // PRIMARY ORG ADDRESS
    payload.address_line_1 = addressLine1;
    payload.address_line_2 = addressLine2;
    payload.city = city;
    payload.state_code = stateCode;
    payload.state_name = stateName;
    payload.zip_code = zipCode;
    payload.country = country;

    if (isProviderOrg) {
      payload.providers = providers; // ✅ providers carry THEIR OWN addresses
    }
  } else {
    payload.first_name = firstName;
    payload.middle_name = middleName;
    payload.last_name = lastName;
    payload.npi = npi;
payload.primary_temp_id = primaryTempId || providers[0].location_temp_id;
    payload.address_line_1 = addressLine1;
    payload.address_line_2 = addressLine2;
    payload.city = city;
    payload.state_code = stateCode;
    payload.state_name = stateName;
    payload.zip_code = zipCode;
    payload.country = country;
  }
  console.log("CREATE CLIENT PAYLOAD:", JSON.stringify(payload, null, 2));

payload.providers?.forEach((p: any) => {
  if (p.zip_code === "") {
    throw new Error("Provider ZIP missing — cannot submit");
  }
});
if (payload.providers) {
  for (const p of payload.providers) {
    if (!p.zip_code || !/^\d{5}-\d{4}$/.test(p.zip_code)) {
      throw new Error("Each provider must have a valid ZIP code");
    }
  }
}
console.log("PROVIDERS FINAL:", providers);
console.log("PRIMARY TEMP:", primaryTempId);
console.log("EXTRA ADDRESSES BEFORE SEND:", extraAddresses);

  return await onSubmit(payload);

};

  const [providerErrors, setProviderErrors] = useState<string | null>(null);

  const [fetchingNpi, setFetchingNpi] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);
  const [activeProviderIndex, setActiveProviderIndex] = useState(0);

  type FormMode = "CLIENT_NPI1" | "PROVIDER_NPI1";
  const isClientTypeLocked = step === 2;

  const isProviderStep = type === "Group" && isProviderOrg && step === 2;
  const uiMode: "ORG" | "INDIVIDUAL" =
    step === 2 ? "INDIVIDUAL" : type === "Group" ? "ORG" : "INDIVIDUAL";

  //   const person = isProviderStep
  //     ? providers[0]
  //     : {
  //         first_name: firstName,
  //         middle_name: middleName,
  //         last_name: lastName,
  //         npi,
  //         address_line_1: addressLine1,
  //         address_line_2: addressLine2,
  //         city,
  //         state_code: stateCode,
  //         state_name: stateName,
  //         zip_code: zipCode,
  //         country,
  //       };
  //   const person = isProviderStep
  //     ? providers[0] // provider data
  //     : {
  //         first_name: firstName,
  //         middle_name: middleName,
  //         last_name: lastName,
  //         npi,
  //         address_line_1: addressLine1,
  //         address_line_2: addressLine2,
  //         city,
  //         state_code: stateCode,
  //         state_name: stateName,
  //         zip_code: zipCode,
  //         country,
  //       };

  const validateProviders = () => {
    for (let i = 0; i < providers.length; i++) {
      const p = providers[i];
      if (
        !p.first_name ||
        !p.last_name ||
        !/^\d{10}$/.test(p.npi) ||
        !p.address_line_1 ||
        !p.city ||
        !/^[A-Z]{2}$/.test(p.state_code) ||
        !/^\d{5}-\d{4}$/.test(p.zip_code)
      ) {
        setProviderErrors(`Invalid provider data at row ${i + 1}`);
        return false;
      }
    }
    setProviderErrors(null);
    return true;
  };
  const activeProvider = providers[activeProviderIndex];

  const person = 
  step===2
    ? activeProvider
    : {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        npi,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city,
        state_code: stateCode,
        state_name: stateName,
        zip_code: zipCode,
        country,
      };

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=50`,
      );
      if (!response.ok) throw new Error("Photon search failed");
      const data = await response.json();

      // Filter for US and India only
      const filteredFeatures = (data.features || [])
        .filter((f: any) => ["US", "IN"].includes(f.properties?.countrycode))
        .slice(0, 5);

      setSuggestions(filteredFeatures);
      setShowSuggestions(filteredFeatures.length > 0);
    } catch (error) {
      console.error("Error searching address:", error);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressLine1(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 500);
  };

  const handleSuggestionClick = (feature: any) => {
    const props = feature.properties;
    const street = props.street || "";
    const houseNumber = props.housenumber || "";
    const fullAddress = `${houseNumber} ${street}`.trim() || props.name || "";
      const digits = (props.postcode || "").replace(/\D/g, "");
  const formattedZip =
    digits.length >= 9 ? `${digits.slice(0, 5)}-${digits.slice(5, 9)}` : "";

    setAddressLine1(fullAddress);
    if (props.city) setCity(props.city);

    if (props.state) {
      setStateName(props.state);

      // Map state name to code for US/India if possible
      const statesMap: { [key: string]: string } = {
        Alabama: "AL",
        Alaska: "AK",
        Arizona: "AZ",
        Arkansas: "AR",
        California: "CA",
        Colorado: "CO",
        Connecticut: "CT",
        Delaware: "DE",
        Florida: "FL",
        Georgia: "GA",
        Hawaii: "HI",
        Idaho: "ID",
        Illinois: "IL",
        Indiana: "IN",
        Iowa: "IA",
        Kansas: "KS",
        Kentucky: "KY",
        Louisiana: "LA",
        Maine: "ME",
        Maryland: "MD",
        Massachusetts: "MA",
        Michigan: "MI",
        Minnesota: "MN",
        Mississippi: "MS",
        Missouri: "MO",
        Montana: "MT",
        Nebraska: "NE",
        Nevada: "NV",
        "New Hampshire": "NH",
        "New Jersey": "NJ",
        "New Mexico": "NM",
        "New York": "NY",
        "North Carolina": "NC",
        "North Dakota": "ND",
        Ohio: "OH",
        Oklahoma: "OK",
        Oregon: "OR",
        Pennsylvania: "PA",
        "Rhode Island": "RI",
        "South Carolina": "SC",
        "South Dakota": "SD",
        Tennessee: "TN",
        Texas: "TX",
        Utah: "UT",
        Vermont: "VT",
        Virginia: "VA",
        Washington: "WA",
        "West Virginia": "WV",
        Wisconsin: "WI",
        Wyoming: "WY",
        // India States
        "Andhra Pradesh": "AP",
        "Arunachal Pradesh": "AR",
        Assam: "AS",
        Bihar: "BR",
        Chhattisgarh: "CT",
        Goa: "GA",
        Gujarat: "GJ",
        Haryana: "HR",
        "Himachal Pradesh": "HP",
        "Jammu and Kashmir": "JK",
        Jharkhand: "JH",
        Karnataka: "KA",
        Kerala: "KL",
        "Madhya Pradesh": "MP",
        Maharashtra: "MH",
        Manipur: "MN",
        Meghalaya: "ML",
        Mizoram: "MZ",
        Nagaland: "NL",
        Odisha: "OR",
        Punjab: "PB",
        Rajasthan: "RJ",
        Sikkim: "SK",
        "Tamil Nadu": "TN",
        Telangana: "TG",
        Tripura: "TR",
        "Uttar Pradesh": "UP",
        Uttarakhand: "UT",
        "West Bengal": "WB",
      };
      if (statesMap[props.state]) {
        setStateCode(statesMap[props.state]);
      }
if (isProviderStep) {
    setProviders((p) => {
      const copy = [...p];
      copy[activeProviderIndex] = {
        ...copy[activeProviderIndex],
        address_line_1: fullAddress,
        city: props.city || "",
        state_code: statesMap[props.state] || "",
        state_name: props.state || "",
        zip_code: formattedZip,     // ALWAYS write ZIP
        country,
      };
      return copy;
    });
  }
else {
    setAddressLine1(fullAddress);
    setCity(props.city || "");
    setStateCode(statesMap[props.state] || "");
    setStateName(props.state || "");
    setZipCode(formattedZip);
  }

  setShowSuggestions(false);
};

    if (props.postcode) {
      const digits = props.postcode.replace(/\D/g, "");

      if (digits.length >= 9) {
        setZipCode(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
      }
    }

    setShowSuggestions(false);
  };

  useEffect(() => {
    if (initialData) {
      setBusinessName(initialData.business_name || "");
      setFirstName(initialData.first_name || "");
      setMiddleName(initialData.middle_name || "");
      setLastName(initialData.last_name || "");
      setNpi(initialData.npi || "");
      setType(initialData.type || "Individual");
      setStatusId(initialData.status_id || "");
      setDescription(initialData.description || "");
      setAddressLine1(initialData.address_line_1 || "");
      setAddressLine2(initialData.address_line_2 || "");
      setStateCode(initialData.state_code || "");
      setStateName(initialData.state_name || "");
      setZipCode(initialData.zip_code || "");
      setCountry(initialData.country || "United States");
      setCity(initialData?.city || "");
    } else {
      setBusinessName("");
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setNpi("");
      setType("Individual");
      setStatusId("");
      setDescription("");
      setAddressLine1("");
      setAddressLine2("");
      setStateCode("");
      setStateName("");
      setZipCode("");
      setCountry("United States");
      setCity("");
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (step === 2) return true;

    if (type === "Group" && !businessName.trim()) {
      newErrors.businessName = "Business Name is required for Group type";
    }

    if (type === "Individual" && !firstName.trim()) {
      newErrors.firstName = "First Name is required for Individual type";
    }

    if (!npi) {
      newErrors.npi = "NPI is required";
    } else if (!/^\d{10}$/.test(npi)) {
      newErrors.npi = "NPI must be exactly 10 digits";
    }
    if (!city.trim()) {
      newErrors.city = "City is required";
    }
    if (!["Individual", "Group"].includes(type)) {
      newErrors.type = "Invalid client type";
    }

    if (!zipCode || !/^\d{5}-\d{4}$/.test(zipCode)) {
      newErrors.zip_code = "ZIP code must be in format 11111-1111";
    }

    if (type === "Group") {
      extraAddresses.forEach((addr, i) => {
        if (
          !addr.address_line_1 ||
          !addr.city ||
          !addr.state_code ||
          !addr.zip_code
        ) {
          newErrors[`address_${i}`] =
            `All fields required for Address ${i + 1}`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCurrentNpi = () =>
    step === 2 ? providers[activeProviderIndex].npi : npi;

  const applyNamesFromNPI = (basic: any) => {
    if (isProviderStep) {
      setProviders((p) => {
        const copy = [...p];
        copy[0] = {
          ...copy[0],
          first_name: basic.first_name || "",
          middle_name: basic.middle_name || "",
          last_name: basic.last_name || "",
        };
        return copy;
      });
    } else {
      setFirstName(basic.first_name || "");
      setMiddleName(basic.middle_name || "");
      setLastName(basic.last_name || "");
    }
  };

  const handleFetchNPIDetails = async () => {
    const currentNpi = getCurrentNpi();

    if (!currentNpi || !/^\d{10}$/.test(currentNpi)) {
      setErrors({ npi: "Please enter a valid 10-digit NPI" });
      return;
    }

    setFetchingNpi(true);
    setErrors({});
    try {
      // Check if NPI already exists in our system first
      const existing = await clientService.checkExistingNPIs([currentNpi]);
      if (existing.length > 0) {
        // If editing, check if it's the same client
        if (!initialData || initialData.npi !== npi) {
          setErrors({ npi: "This NPI is already registered in the system" });
          setFetchingNpi(false);
          return;
        }
      }

      const data = await clientService.lookupNPI(currentNpi);
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const basic = result.basic;
        const addresses = result.addresses;

        // if (type === "Individual" && result.enumeration_type === "NPI-1") {
        //   setFirstName(basic.first_name || "");
        //   setLastName(basic.last_name || "");
        //   setMiddleName(basic.middle_name || "");
        //   setType("Individual");
        // }
        if (result.enumeration_type === "NPI-1") {
          applyNamesFromNPI(basic);
        } else if (result.enumeration_type === "NPI-2") {
          if (step === 1) {
            setType("Group");
            setBusinessName(
              basic.organization_name ||
                basic.authorized_official_organization_name ||
                "",
            );
          }
        } else {
          const expectedType =
            type === "Individual"
              ? "NPI-1 (Individual)"
              : "NPI-2 (Organization)";
          const actualType =
            result.enumeration_type === "NPI-1" ? "Individual" : "Organization";
          setErrors({
            npi: `Found ${actualType} but expected ${expectedType}`,
          });
          setFetchingNpi(false);
          return;
        }

        // Map address (usually practice location is preferred)
        const practiceAddress =
          addresses.find((addr: any) => addr.address_purpose === "LOCATION") ||
          addresses[0];
        if (practiceAddress) {
          setAddressLine1(practiceAddress.address_1 || "");
          setAddressLine2(practiceAddress.address_2 || "");

          const sCode = practiceAddress.state || "";
          setStateCode(sCode);

          // State Map for auto-filling State Name
          const statesMap: { [key: string]: string } = {
            AL: "Alabama",
            AK: "Alaska",
            AZ: "Arizona",
            AR: "Arkansas",
            CA: "California",
            CO: "Colorado",
            CT: "Connecticut",
            DE: "Delaware",
            FL: "Florida",
            GA: "Georgia",
            HI: "Hawaii",
            ID: "Idaho",
            IL: "Illinois",
            IN: "Indiana",
            IA: "Iowa",
            KS: "Kansas",
            KY: "Kentucky",
            LA: "Louisiana",
            ME: "Maine",
            MD: "Maryland",
            MA: "Massachusetts",
            MI: "Michigan",
            MN: "Minnesota",
            MS: "Mississippi",
            MO: "Missouri",
            MT: "Montana",
            NE: "Nebraska",
            NV: "Nevada",
            NH: "New Hampshire",
            NJ: "New Jersey",
            NM: "New Mexico",
            NY: "New York",
            NC: "North Carolina",
            ND: "North Dakota",
            OH: "Ohio",
            OK: "Oklahoma",
            OR: "Oregon",
            PA: "Pennsylvania",
            RI: "Rhode Island",
            SC: "South Carolina",
            SD: "South Dakota",
            TN: "Tennessee",
            TX: "Texas",
            UT: "Utah",
            VT: "Vermont",
            VA: "Virginia",
            WA: "Washington",
            WV: "West Virginia",
            WI: "Wisconsin",
            WY: "Wyoming",
          };
          if (statesMap[sCode]) {
            setStateName(statesMap[sCode]);
          }

          const postalCode = practiceAddress.postal_code || "";
          const digits = postalCode.replace(/\D/g, "");

          if (digits.length >= 9) {
            setZipCode(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
          } 
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
  // const handleStep1Submit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!validate()) return;

  //   const payload = {
  //     business_name: businessName.trim() || undefined,
  //     first_name: firstName.trim() || undefined,
  //     middle_name: middleName.trim() || undefined,
  //     last_name: lastName.trim() || undefined,
  //     npi: npi.trim(),
  //     type: type === "Group" ? "NPA2" : "NPA1",
  //     description: description.trim() || undefined,

  //     address_line_1: addressLine1,
  //     address_line_2: addressLine2,
  //     city,
  //     state_code: stateCode,
  //     state_name: stateName,
  //     zip_code: zipCode,
  //     country,

  //     is_provider: type === "Group" ? isProviderOrg : false,
  //     locations: extraAddresses, // secondary addresses
  //   };

  //   setIsSubmitting(true);
  //   try {
  //     const created = await clientService.createClient(payload);

  //     if (type === "Group" && isProviderOrg) {
  //   setStep(2); // JUST MOVE STEP
  // } else {
  //   await clientService.createClient(payload);
  //   onClose();
  // }
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  //     const formData: any = {
  //       business_name: businessName.trim() || undefined,
  //       first_name: firstName.trim() || undefined,
  //       middle_name: middleName.trim() || undefined,
  //       last_name: lastName.trim() || undefined,
  //       npi: npi.trim() || undefined,
  //       type: type === 'Group' ? 'NPA2' : 'NPA1',
  //       description: description.trim() || undefined,

  //       // ✅ ADDRESS
  //       address_line_1: addressLine1 || undefined,
  //       address_line_2: addressLine2 || undefined,
  //       state_code: stateCode || undefined,
  //       state_name: stateName || undefined,
  //       zip_code: zipCode || undefined,
  //       country: country || undefined,
  //       city: city || undefined,
  //       is_provider: type === "Group" ? isProviderOrg : false,
  //     };

  //     // Only include status_id for new clients, not updates
  //     if (!initialData && statusId) {
  //       formData.status_id = statusId;
  //     }

  //     setIsSubmitting(true);
  //     try {
  //       await onSubmit(formData);
  //     } finally {
  //       setIsSubmitting(false);
  //     }
  //   };'
  const handleBackToStep1 = () => {
  setStep(1);
};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STEP 1 (ORG or INDIVIDUAL)
    if (step === 1) {
      if (!validate()) return;

      if (type === "Group" && isProviderOrg) {
        if (!zipCode) {
    setErrors({ zip_code: "ZIP required" });
    return;
  }   

      const tempId = crypto.randomUUID();
setPrimaryTempId(tempId);

const newProviders = [{
  ...providers[0],
  location_temp_id: tempId,
  address_line_1: addressLine1,
  city,
  state_code: stateCode,
  state_name: stateName,
  zip_code: zipCode,
  country
}];

setProviders(newProviders);

        if (!zipCode || !/^\d{5}-\d{4}$/.test(zipCode)) {
          setErrors({ zip_code: "ZIP is required before adding providers" });
          return;
        }
  
        setStep(2);
        return;
      }

      handleFinish();
      return;
    }

    // STEP 2 (PROVIDERS ONLY)
    if (step === 2) {
      if (!validateProviders()) return;
      handleFinish();
    }
  };


  if (!isOpen) return null;

  const typeOptions = [
    { value: "Individual", label: "Individual (NPI-1)" },
    { value: "Group", label: "Organization (NPI-2)" },
  ];

  return (
    <div className={styles.overlay}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* <form
          className={styles.form}
          onSubmit={step === 1 ? handleStep1Submit : undefined}
        > */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formContent}>
            {step === 1 && !isProviderStep && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Client Type *</label>
                <Select
                  value={typeOptions.find((opt) => opt.value === type)}
                  onChange={(selected) =>
                    setType(selected?.value || "Individual")
                  }
                  options={typeOptions}
                  styles={getCustomSelectStyles()}
                />
              </div>
            )}

            {/* <div className={styles.formGroup}>
              <label className={styles.label}>Client Type *</label>
              <Select
                value={typeOptions.find((opt) => opt.value === type)}
                onChange={(selected) =>
                  setType(selected?.value || "Individual")
                }
                options={typeOptions}
                placeholder="Select client type"
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
            </div> */}
            <div className={styles.formGroup}>
              <label className={styles.label}>NPI *</label>
              <div className={styles.npiInputWrapper}>
                <input
                  className={styles.input}
                  value={step === 2 ? providers[0].npi : npi}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length > 10) return;

                    if (isProviderStep) {
                      setProviders((p) => {
                        const copy = [...p];
                        copy[0] = { ...copy[0], npi: value };
                        return copy;
                      });
                    } else {
                      setNpi(value);
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.lookupButton}
                  onClick={handleFetchNPIDetails}
                  disabled={
                    fetchingNpi ||
                    (step === 2
                      ? providers[0].npi.length !== 10
                      : npi.length !== 10)
                  }
                  title="Lookup NPI details"
                >
                  {fetchingNpi ? (
                    <div className={styles.spinner} />
                  ) : (
                    <Search size={18} />
                  )}
                </button>
              </div>
              {errors.npi && (
                <span className={styles.errorText}>{errors.npi}</span>
              )}
            </div>
            {uiMode === "ORG" ? (
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isProviderOrg}
                    onChange={(e) => setIsProviderOrg(e.target.checked)}
                  />
                  is_provider
                </label>
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
              <div className={styles.formRowThree}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>First Name *</label>
                  {/* <input
                    type="text"
                    className={styles.input}
                    value={step === 2 ? providers[0].first_name : firstName}

                    onChange={(e) => {
                      if (isProviderStep) {
                        setProviders((p) => {
                          const copy = [...p];
                          copy[0] = {
                            ...copy[0],
                            first_name: e.target.value,
                          };
                          return copy;
                        });
                      } else {
                        setFirstName(e.target.value);
                      }
                    }}
                    placeholder="Enter first name"
                    style={{
                      borderColor: errors.firstName ? "#ef4444" : "#d1d5db",
                    }}
                  /> */}
                  <input
                    className={styles.input}
                    value={person.first_name}
                    onChange={(e) => {
                      if (isProviderStep) {
                        setProviders((p) => {
                          const copy = [...p];
                          copy[activeProviderIndex] = {
                            ...copy[activeProviderIndex],
                            first_name: e.target.value,
                          };
                          return copy;
                        });
                      } else {
                        setFirstName(e.target.value);
                      }
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Middle Name</label>
                  <input
                    className={styles.input}
                    value={step === 2 ? providers[0].middle_name : middleName}
                    onChange={(e) => {
                      if (isProviderStep) {
                        setProviders((p) => {
                          const copy = [...p];
                          copy[0] = {
                            ...copy[0],
                            middle_name: e.target.value,
                          };
                          return copy;
                        });
                      } else {
                        setMiddleName(e.target.value);
                      }
                    }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input
                    className={styles.input}
                    value={person.last_name}
                    onChange={(e) => {
                      if (isProviderStep) {
                        setProviders((p) => {
                          const copy = [...p];
                          copy[activeProviderIndex] = {
                            ...copy[activeProviderIndex],
                            last_name: e.target.value,
                          };
                          return copy;
                        });
                      } else {
                        setLastName(e.target.value);
                      }
                    }}
                  />
                </div>
              </div>
            )}
            <div className={styles.formGroup} style={{ position: "relative" }}>
              <label className={styles.label}>Address Line 1</label>
              <input
                className={styles.input}
                maxLength={250}
                value={person.address_line_1}
                onChange={(e) => {
                  const value = e.target.value;

                  if (isProviderStep) {
                    setProviders((p) => {
                      const copy = [...p];
                      copy[activeProviderIndex] = {
                        ...copy[activeProviderIndex],
                        address_line_1: value,
                      };
                      return copy;
                    });
                  } else {
                    setAddressLine1(value);
                    handleAddressChange(e); // keep autocomplete for client
                  }
                }}
                autoComplete="off"
              />
              {isSearchingAddress && <div className={styles.addressLoader} />}

              {showSuggestions && (
                <div
                  className={styles.suggestionsContainer}
                  ref={suggestionsRef}
                >
                  {suggestions.map((feature, index) => {
                    const p = feature.properties;
                    const label = [
                      p.housenumber,
                      p.street,
                      p.city,
                      p.state,
                      p.postcode,
                      p.country,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div
                        key={index}
                        className={styles.suggestionItem}
                        onClick={() => handleSuggestionClick(feature)}
                      >
                        <span className={styles.suggestionText}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Address Line 2</label>
              <input
                className={styles.input}
                maxLength={250}
                value={person.address_line_2 || ""}
                onChange={(e) => {
                  const value = e.target.value;

                  if (step === 2) {
                    setProviders((prev) => {
                      const copy = [...prev];
                      copy[activeProviderIndex] = {
                        ...copy[activeProviderIndex],
                        address_line_2: value,
                      };
                      return copy;
                    });
                  } else {
                    setAddressLine2(value);
                  }
                }}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>City *</label>
              <input
                value={person.city}
                onChange={(e) => {
                  if (step === 2) {
                    setProviders((prev) => {
                      const copy = [...prev];
                      copy[activeProviderIndex] = {
                        ...copy[activeProviderIndex],
                        city: e.target.value,
                      };
                      return copy;
                    });
                  } else {
                    setCity(e.target.value);
                  }
                }}
              />
            </div>

            <div className={styles.formRowThree}>
              <div className={styles.formGroup}>
                <label className={styles.label}>State Code</label>
                <input
                  value={person.state_code}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();

                    if (step === 2) {
                      setProviders((prev) => {
                        const copy = [...prev];
                        copy[activeProviderIndex] = {
                          ...copy[activeProviderIndex],
                          state_code: v,
                        };
                        return copy;
                      });
                    } else {
                      setStateCode(v);
                    }
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>State Name</label>
                <input
                  className={styles.input}
                  maxLength={50}
                  value={person.state_name || ""}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (step === 2) {
                      setProviders((prev) => {
                        const copy = [...prev];
                        copy[activeProviderIndex] = {
                          ...copy[activeProviderIndex],
                          state_name: value,
                        };
                        return copy;
                      });
                    } else {
                      setStateName(value);
                    }
                  }}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Country *</label>
                <Select
                  value={{ value: person.country, label: person.country }}
                  onChange={(selected) => {
                    const value = selected?.value || "United States";

                    if (step === 2) {
                      setProviders((prev) => {
                        const copy = [...prev];
                        copy[activeProviderIndex] = {
                          ...copy[activeProviderIndex],
                          country: value,
                        };
                        return copy;
                      });
                    } else {
                      setCountry(value);
                    }
                  }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>ZIP Code *</label>
                <input
                  value={person.zip_code}
                  onChange={(e) => {
                    let digits = e.target.value.replace(/\D/g, "");
                    let formatted =
                      digits.length > 5
                        ? `${digits.slice(0, 5)}-${digits.slice(5, 9)}`
                        : digits;

                    if (step === 2) {
                      setProviders((prev) => {
                        const copy = [...prev];
                        copy[activeProviderIndex] = {
                          ...copy[activeProviderIndex],
                          zip_code: formatted,
                        };
                        return copy;
                      });
                    } else {
                      setZipCode(formatted);
                    }
                  }}
                />

                {errors.zip_code && (
                  <span className={styles.errorText}>{errors.zip_code}</span>
                )}
              </div>
            </div>
            {uiMode === "ORG" && (
              <button
                type="button"
                className={styles.addAddressBtn}
                onClick={() =>
                 setExtraAddresses((prev) => [
  ...prev,
  {
    temp_id: crypto.randomUUID(),
    address_line_1: "",
    address_line_2: "",
    city: "",
    state_code: "",
    state_name: "",
    zip_code: "",
    country: "United States",
  },
])
                }
              >
                + Add Address
              </button>
            )}
            {step === 2 && (
  <div className={styles.formGroup}>
    <label className={styles.label}>Provider's location *</label>

    <Select
      value={
        [
          { value: primaryTempId, label: `Primary: ${addressLine1}` },
          ...extraAddresses.map(a => ({
            value: a.temp_id,
            label: `${a.address_line_1} (${a.city})`
          }))
        ].find(opt => opt.value === activeProvider.location_temp_id)
      }
      onChange={(selected) => {
        const value = selected?.value || "";

        setProviders(prev => {
          const copy = [...prev];
          copy[activeProviderIndex] = {
            ...copy[activeProviderIndex],
            location_temp_id: value
          };
          return copy;
        });
      }}
      options={[
        { value: primaryTempId, label: `Primary: ${addressLine1}` },
        ...extraAddresses.map(a => ({
          value: a.temp_id,
          label: `${a.address_line_1} (${a.city})`
        }))
      ]}
    />
  </div>
)}

            {uiMode === "ORG" &&
              extraAddresses.map((addr, index) => (
                <div key={index} className={styles.secondaryAddressCard}>
                  <div className={styles.cardHeader}>
                    <strong>Additional Address {index + 1}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraAddresses((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <input
                    className={styles.input}
                    placeholder="Address Line 1"
                    value={addr.address_line_1}
onChange={(e) => {
  setExtraAddresses(prev => {
    const copy = [...prev];
    copy[index] = {
      ...copy[index],
      address_line_1: e.target.value
    };
    return copy;
  });

                    }}
                  />

                  <input
                    className={styles.input}
                    placeholder="Address Line 2"
                    value={addr.address_line_2}
                    onChange={(e) => {
setExtraAddresses(prev => {
  const copy = [...prev];
  copy[index] = {
    ...copy[index],  // PRESERVE temp_id
    address_line_2: e.target.value
  };
  return copy;
});
                    }}
                  />

                  <input
                    className={styles.input}
                    placeholder="City"
                    value={addr.city}
onChange={(e) => {
  setExtraAddresses(prev => {
    const copy = [...prev];
    copy[index] = {
      ...copy[index],
      city: e.target.value
    };
    return copy;
  });
}}

                  />

                  <input
                    className={styles.input}
                    placeholder="State Code"
                    maxLength={2}
                    value={addr.state_code}
                  onChange={(e) => {
  setExtraAddresses(prev => {
    const copy = [...prev];
    copy[index] = {
      ...copy[index],
      state_code: e.target.value.toUpperCase()
    };
    return copy;
  });
}}

                  />
                  <input
                    className={styles.input}
                    placeholder="State name"
                    value={addr.state_name}
                    onChange={(e) => {
                     
setExtraAddresses(prev => {
  const copy = [...prev];
  copy[index] = {
    ...copy[index],  // PRESERVE temp_id
    state_name: e.target.value
  };
  return copy;
});
                    }}
                  />
                  <input
                    className={styles.input}
                    placeholder="Country"
                    value={addr.country}
                    onChange={(e) => {
                      
setExtraAddresses(prev => {
  const copy = [...prev];
  copy[index] = {
    ...copy[index],  // PRESERVE temp_id
    country: e.target.value
  };
  return copy;
});
                    }}
                  />
                  <input
                    className={styles.input}
                    placeholder="ZIP Code"
                    value={addr.zip_code}
                   onChange={(e) => {
  const digits = e.target.value.replace(/\D/g, "");
  const formatted =
    digits.length > 5
      ? `${digits.slice(0,5)}-${digits.slice(5,9)}`
      : digits;

  setExtraAddresses(prev => {
    const copy = [...prev];
    copy[index] = {
      ...copy[index],
      zip_code: formatted
    };
    return copy;
  });
}}

                  />
                </div>
              ))}

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
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>
            {step === 2 && (
    <>
      {/* BACK BUTTON */}
      <button
        type="button"
        className={styles.cancelButton}
        onClick={handleBackToStep1}
      >
        ← Back
      </button>
      </>
            )}
            {step === 2 && (
              <button
                type="button"
                className={styles.addAddressBtn}
                onClick={() => {
                  setProviders((prev) => [
                    ...prev,
                    {
                      ...prev[0], // clone address
                      first_name: "",
                      middle_name: "",
                      last_name: "",
                      npi: "",
                      location_temp_id: primaryTempId,
                    },
                  ]);
                  setActiveProviderIndex(providers.length);
                }}
              >
                + Add Provider
              </button>
            )}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {/* {isSubmitting
                ? "Saving..."
                : initialData
                  ? "Update"
                  : type === "Group" && isProviderOrg
                    ? "Next"
                    : "Create"} */}
              {step === 2
                ? "Create"
                : type === "Group" && isProviderOrg
                  ? "Next"
                  : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;
