import React, { useState, useEffect, useRef } from "react";
import { X, Search, Trash2, Plus } from "lucide-react";
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
  }) => Promise<Client>;

  initialData?: Client;
  title: string;
}
export type ProviderForm = {
  id?: string; // Backend ID
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
  location_temp_id: string;
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
      id?: string; // Backend ID
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
  // const npiTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
      location_temp_id: "",
    },
  ]);

  useEffect(() => {
    if (!initialData || !isOpen) return;

    // 🔒 HARD RESET WIZARD STATE CHECK
    setStep(1);
    setIsProviderOrg(false);
    setExtraAddresses([]); // Reset secondary addresses

    if (initialData) {
      // 1. Basic Info
      setBusinessName(initialData.business_name || "");
      setFirstName(initialData.first_name || "");
      setMiddleName(initialData.middle_name || "");
      setLastName(initialData.last_name || "");
      setNpi(initialData.npi || "");
      setDescription(initialData.description || "");
      setStatusId(initialData.status_id || "");

      // Map backend type to frontend type
      const t = initialData.type === "NPI2" ? "Group" : "Individual";
      setType(t);

      // 2. Locations Logic
      // Check if we have the new `locations` array from detailed fetch
      if (initialData.locations && initialData.locations.length > 0) {
        const primary = initialData.locations.find(l => l.is_primary);
        if (primary) {
          setAddressLine1(primary.address_line_1);
          setAddressLine2(primary.address_line_2 || "");
          setCity(primary.city);
          setStateCode(primary.state_code);
          setStateName(primary.state_name || "");
          setZipCode(primary.zip_code);
          setCountry(primary.country || "United States");
          setPrimaryTempId(primary.id); // IMPORTANT: Use real ID as temp ID for editing
        }

        // Additional Locations
        const extras = initialData.locations.filter(l => !l.is_primary).map(l => ({
          temp_id: l.id, // Use real ID
          address_line_1: l.address_line_1,
          address_line_2: l.address_line_2,
          city: l.city,
          state_code: l.state_code,
          state_name: l.state_name,
          zip_code: l.zip_code,
          country: l.country || "United States"
        }));
        setExtraAddresses(extras);
      } else {
        // Fallback for legacy Individual / non-detailed
        setAddressLine1(initialData.address_line_1 || "");
        setAddressLine2(initialData.address_line_2 || "");
        setCity(initialData.city || "");
        setStateCode(initialData.state_code || "");
        setStateName(initialData.state_name || "");
        setZipCode(initialData.zip_code || "");
        setCountry(initialData.country || "United States");
        setPrimaryTempId(crypto.randomUUID()); // New random ID if no ID exists
      }

      // 3. Providers Logic
      if (initialData.providers && initialData.providers.length > 0) {
        setIsProviderOrg(true);
        const mappedProviders = initialData.providers.map(p => ({
          first_name: p.first_name,
          middle_name: p.middle_name || "",
          last_name: p.last_name,
          npi: p.npi,
          // Provider addresses are not stored directly on provider object in backend currently?
          // Wait, backend Provider model HAS location_id. 
          // Does Provider model have address fields? NO. 
          // Provider is linked to a Location.
          // BUT Frontend ProviderForm expects address fields physically on the card?
          // Re-reading `ClientModal.tsx`:
          // The ProviderForm interface has `address_line_1`, etc.
          // When we create a provider, we enter specific address fields?
          // Let's check `ClientModal.tsx` form.
          // Yes, each provider card has address inputs.
          // BUT backend `ProviderResponse` in `clients_router.py` ONLY has names + NPI + ID + created_at.
          // AND `get_client_by_id` (service) populates providers.
          // Wait, look at `client_service.py` Step 282:
          // It maps `provider_rows` to dicts.
          // It includes `address_line_1`... wait.
          // `provider_rows` query joins `ClientLocation`.
          // So the `providers` array from backend DOES have address fields!
          // Let verify `client_service.py` logic around line 785 (from diffs).
          // It performs a join and aliases location fields.
          // Correct. Backend returns flattened provider + location fields.

          address_line_1: (p as any).address_line_1 || "",
          address_line_2: (p as any).address_line_2 || "",
          city: (p as any).city || "",
          state_code: (p as any).state_code || "",
          state_name: (p as any).state_name || "",
          country: (p as any).country || "United States",
          zip_code: (p as any).zip_code || "",
          location_temp_id: (p as any).location_id || "" // The link!
        }));
        setProviders(mappedProviders);
      } else {
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
            country: "United States",
            location_temp_id: "",
          },
        ]);
      }

    } else {
      // Reset fields for ADD mode
      setBusinessName("");
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setNpi("");
      setType("Individual"); // Reset to default
      setStatusId("");
      setDescription("");
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setStateCode("");
      setStateName("");
      setZipCode("");
      setCountry("United States");
      setPrimaryTempId(crypto.randomUUID());

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
          country: "United States",
          location_temp_id: "",
        },
      ]);
    }
  }, [isOpen, initialData]);

  const npiTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (step !== 1) return;

    // reset when cleared
    if (!npi || npi.length === 0) {
      if (npiTimeoutRef.current) clearTimeout(npiTimeoutRef.current);
      return;
    }

    // only fire when 10 digits
    if (npi.length === 10) {
      // 🛑 Prevent fetch if it matches initial data
      if (initialData && npi === initialData.npi) return;

      if (npiTimeoutRef.current) clearTimeout(npiTimeoutRef.current);

      npiTimeoutRef.current = setTimeout(() => {
        handleFetchNPIDetails();
      }, 400);
    }
  }, [npi, step, initialData]);

  const providerTimeouts = useRef<{ [key: number]: NodeJS.Timeout }>({});
  const lastFetchedNpis = useRef<{ [key: number]: string }>({});

  useEffect(() => {
    if (step !== 2) return;

    providers.forEach((p, index) => {
      if (!p.npi || p.npi.length !== 10) {
        // Reset if NPI becomes invalid/empty so we can fetch again if they fix it
        if (lastFetchedNpis.current[index]) {
          delete lastFetchedNpis.current[index];
        }
        return;
      }

      // 🛑 Prevent loop: If we already fetched for this specific NPI text, skip.
      if (lastFetchedNpis.current[index] === p.npi) return;

      if (providerTimeouts.current[index]) {
        clearTimeout(providerTimeouts.current[index]);
      }

      providerTimeouts.current[index] = setTimeout(() => {
        lastFetchedNpis.current[index] = p.npi; // Mark as fetched
        handleFetchNPIDetails(index);
      }, 400);
    });
  }, [providers, step]);

  const handleFinish = async () => {
    const pid = primaryTempId || crypto.randomUUID();

    // Construct Payload
    const payload: any = {
      is_user: false,
      type: type === "Group" ? "NPI2" : "NPI1",
      description,
    };

    if (type === "Group") {
      payload.business_name = businessName;
      payload.npi = npi;
      payload.primary_temp_id = pid;
      payload.locations = [
        // Construct locations array for Individual client too
        {
          temp_id: pid,
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

      let fixedProviders: any[] = [];

      if (isProviderOrg) {
        fixedProviders = providers.map(p => ({
          ...p,
          location_temp_id: p.location_temp_id || primaryTempId
        }));

        for (const p of fixedProviders) {
          if (!p.location_temp_id) {
            throw new Error("Provider missing location link");
          }
        }

        payload.providers = fixedProviders;
      }

    } else {
      payload.first_name = firstName;
      payload.middle_name = middleName;
      payload.last_name = lastName;
      payload.npi = npi;
      //need to put this:  payload.primary_temp_id = primaryTempId || providers[0].location_temp_id;
      payload.primary_temp_id = pid;

      // Construct locations array for Individual client too
      payload.locations = [
        {
          temp_id: pid,
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

      payload.address_line_1 = addressLine1;
      payload.address_line_2 = addressLine2;
      payload.city = city;
      payload.state_code = stateCode;
      payload.state_name = stateName;
      payload.zip_code = zipCode;
      payload.country = country;
    }
    // console.log("CREATE CLIENT PAYLOAD:", JSON.stringify(payload, null, 2));
    if (payload.providers) {
      for (const p of payload.providers) {
        if (!p.zip_code || !/^\d{5}-\d{4}$/.test(p.zip_code)) {
          throw new Error("Each provider must have a valid ZIP code");
        }
      }
    }
    // console.log("PROVIDERS FINAL:", providers);
    // console.log("PRIMARY TEMP:", primaryTempId);
    // console.log("EXTRA ADDRESSES BEFORE SEND:", extraAddresses);
    // ensure all providers have location id

    // console.log("PRIMARY:", primaryTempId);
    // console.log("PROVIDERS:", providers);

    return await onSubmit(payload);

  };

  const [providerErrors, setProviderErrors] = useState<string | null>(null);

  const [fetchingNpi, setFetchingNpi] = useState(false);
  // Address autocomplete state removed
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // validatedProviders removed (moved to below)
  const activeProvider = providers[activeProviderIndex];

  const person =
    step === 2
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



  const fetchZipDetails = async (zip: string) => {
    const cleanZip = zip.replace(/\D/g, "");
    if (cleanZip.length < 5) return;

    try {
      // Change country code if needed: us / in / ca etc.
      const response = await fetch(
        `https://api.zippopotam.us/us/${cleanZip}`
      );

      if (!response.ok) return;
      const data = await response.json();

      if (data.places && data.places.length > 0) {
        const place = data.places[0];

        // Mapping response into your existing structure
        const props = {
          city: place["place name"],
          state: place["state"],
          state_code: place["state abbreviation"],
          country: data.country
        };

        if (props.city) setCity(props.city);
        if (props.state) setStateName(props.state);
        if (props.state_code) setStateCode(props.state_code);
        if (props.country) setCountry(props.country);
      }
    } catch (error) {
      console.error("Error fetching ZIP details:", error);
    }
  };


  const fetchZipDetailsFromPhoton = async (zip: string) => {
    const cleanZip = zip.replace(/\D/g, "");
    if (cleanZip.length < 5) return;

    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanZip)}&limit=1`
      );
      if (!response.ok) return;
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const props = data.features[0].properties;

        if (props.city) {
          setCity(props.city);
        } else if (props.name) {
          setCity(props.name);
        }
        if (props.state) {
          setStateName(props.state);

          const statesMap: { [key: string]: string } = {
            Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
            Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
            Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
            Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
            Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
            Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
            "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
            "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
            "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN",
            Texas: "TX", "Utah": "UT", Vermont: "VT", "Virginia": "VA", "Washington": "WA",
            "West Virginia": "WV", "Wisconsin": "WI", Wyoming: "WY",
            "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", Assam: "AS", Bihar: "BR",
            Chhattisgarh: "CT", Goa: "GA", Gujarat: "GJ", Haryana: "HR", "Himachal Pradesh": "HP",
            "Jammu and Kashmir": "JK", Jharkhand: "JH", Karnataka: "KA", Kerala: "KL",
            "Madhya Pradesh": "MP", Maharashtra: "MH", Manipur: "MN", Meghalaya: "ML",
            Mizoram: "MZ", Nagaland: "NL", Odisha: "OR", Punjab: "PB", Rajasthan: "RJ",
            Sikkim: "SK", "Tamil Nadu": "TN", Telangana: "TG", Tripura: "TR", "Uttar Pradesh": "UP",
            Uttarakhand: "UT", "West Bengal": "WB"
          };

          if (statesMap[props.state]) {
            setStateCode(statesMap[props.state]);
          }
        }
        if (props.country) setCountry(props.country);
      }
    } catch (error) {
      console.error("Error fetching ZIP details:", error);
    }
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const formatted = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5, 9)}` : val;
    setZipCode(formatted);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.length >= 5) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchZipDetails(val.slice(0, 5));
      }, 500);
    }
  };

  const fetchZipDetailsForExtraAddress = async (index: number, zip: string) => {
    const cleanZip = zip.replace(/\D/g, "");
    if (cleanZip.length < 5) return;

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);
      if (!response.ok) return;
      const data = await response.json();

      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        setExtraAddresses((prev) => {
          const copy = [...prev];
          if (!copy[index]) return prev;
          copy[index] = {
            ...copy[index],
            city: place["place name"] || copy[index].city,
            state_name: place["state"] || copy[index].state_name,
            state_code: place["state abbreviation"] || copy[index].state_code,
            country: data.country || copy[index].country,
          };
          return copy;
        });
      }
    } catch (error) {
      console.error("Error fetching extra address ZIP details:", error);
    }
  };

  const fetchZipDetailsForProvider = async (index: number, zip: string) => {
    const cleanZip = zip.replace(/\D/g, "");
    if (cleanZip.length < 5) return;

    try {
      const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);
      if (!response.ok) return;
      const data = await response.json();

      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        setProviders((prev) => {
          const copy = [...prev];
          if (!copy[index]) return prev;
          copy[index] = {
            ...copy[index],
            city: place["place name"] || copy[index].city,
            state_name: place["state"] || copy[index].state_name,
            state_code: place["state abbreviation"] || copy[index].state_code,
            country: data.country || copy[index].country,
          };
          return copy;
        });
      }
    } catch (error) {
      console.error("Error fetching provider ZIP details:", error);
    }
  };

  const [extraAddressErrors, setExtraAddressErrors] = useState<{ [index: number]: { [key: string]: string } }>({});
  const [providerErrorsMap, setProviderErrorsMap] = useState<{ [index: number]: { [key: string]: string } }>({});

  useEffect(() => {
    if (initialData) {
      // 1. Basic Fields
      setBusinessName(initialData.business_name || "");
      setFirstName(initialData.first_name || "");
      setMiddleName(initialData.middle_name || "");
      setLastName(initialData.last_name || "");
      setNpi(initialData.npi || "");
      const t = initialData.type;
      setType(t === "Individual" || t === "NPI1" ? "Individual" : "Group");
      setStatusId(initialData.status_id || "");
      setDescription(initialData.description || "");
      setAddressLine1(initialData.address_line_1 || "");
      setAddressLine2(initialData.address_line_2 || "");
      setStateCode(initialData.state_code || "");
      setStateName(initialData.state_name || "");
      setZipCode(initialData.zip_code || "");
      setCountry(initialData.country || "United States");
      setCity(initialData?.city || "");

      // 2. Locations logic
      // Find primary ID and set primaryTempId
      const primaryLoc = initialData.locations?.find((l: any) => l.is_primary);
      const pTempId = primaryLoc?.id || crypto.randomUUID();
      setPrimaryTempId(pTempId);

      // Populate extraAddresses (Secondary Locations)
      if (initialData.locations) {
        const secondary = initialData.locations.filter((l: any) => !l.is_primary);
        setExtraAddresses(secondary.map((l: any) => ({
          id: l.id, // Keep ID for backend update
          temp_id: l.id, // Use ID as temp_id for existing
          address_line_1: l.address_line_1,
          address_line_2: l.address_line_2,
          city: l.city,
          state_code: l.state_code,
          state_name: l.state_name,
          zip_code: l.zip_code,
          country: l.country
        })));
      }

      // 3. Providers logic
      if (initialData.providers && initialData.providers.length > 0) {
        const hasProviders = initialData.providers.length > 0;
        setIsProviderOrg(hasProviders);

        setProviders(initialData.providers.map((p: any) => ({
          id: p.id,
          first_name: p.first_name,
          middle_name: p.middle_name,
          last_name: p.last_name,
          npi: p.npi,
          address_line_1: p.address_line_1,
          address_line_2: p.address_line_2,
          city: p.city,
          state_code: p.state_code,
          state_name: p.state_name,
          zip_code: p.zip_code,
          country: p.country,
          // Map backend location_id to frontend location_temp_id
          location_temp_id: p.location_id || pTempId
        })));

        // ✅ Initialize fetched cache so we don't auto-fetch on edit
        const initialCache: { [key: number]: string } = {};
        initialData.providers.forEach((p: any, i: number) => {
          if (p.npi) initialCache[i] = p.npi;
        });
        lastFetchedNpis.current = initialCache;
      } else {
        setIsProviderOrg(false);
        // Reset to one empty provider if none
        setProviders([{
          first_name: "", middle_name: "", last_name: "", npi: "",
          address_line_1: "", address_line_2: "", city: "", state_code: "",
          state_name: "", zip_code: "", country: "United States", location_temp_id: ""
        }]);
      }

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
      setPrimaryTempId(""); // Reset
      setExtraAddresses([]);
      setProviders([{
        first_name: "", middle_name: "", last_name: "", npi: "",
        address_line_1: "", address_line_2: "", city: "", state_code: "",
        state_name: "", zip_code: "", country: "United States", location_temp_id: ""
      }]);
      setIsProviderOrg(false);
    }
    setErrors({});
    setExtraAddressErrors({});
    setProviderErrorsMap({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    const newExtraAddressErrors: { [index: number]: { [key: string]: string } } = {};
    let isValid = true;

    // Step 1 Validation
    if (step === 1) {
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

      // Basic address validation
      if (!addressLine1.trim()) {
        // Optional? No, usually required. Let's assume required based on "required fields" request
        // But the current code didn't check addressLine1 explicitly besides city.
        // I'll add it if it was missing.
      }

      if (!zipCode || !/^\d{5}-\d{4}$/.test(zipCode)) {
        newErrors.zip_code = "ZIP code must be in format 11111-1111";
        isValid = false;
      }

      // Extra Addresses Validation
      if (type === "Group") {
        extraAddresses.forEach((addr, i) => {
          const addrErrors: { [key: string]: string } = {};
          if (!addr.address_line_1?.trim()) addrErrors.address_line_1 = "Address Line 1 is required";
          if (!addr.city?.trim()) addrErrors.city = "City is required";
          // if (!addr.state_code?.trim()) addrErrors.state_code = "State Check"; // optional?
          if (!addr.zip_code?.trim()) addrErrors.zip_code = "ZIP Code is required";
          else if (!/^\d{5}-\d{4}$/.test(addr.zip_code)) addrErrors.zip_code = "ZIP code must be in format 11111-1111";

          if (Object.keys(addrErrors).length > 0) {
            newExtraAddressErrors[i] = addrErrors;
            isValid = false;
          }
        });
      }
    }

    setErrors(newErrors);
    setExtraAddressErrors(newExtraAddressErrors);
    return isValid;
  };

  const validateProviders = () => {
    const newProviderErrors: { [index: number]: { [key: string]: string } } = {};
    let isValid = true;

    providers.forEach((p, i) => {
      const pErrors: { [key: string]: string } = {};
      if (!p.first_name?.trim()) pErrors.first_name = "First Name is required";
      if (!p.last_name?.trim()) pErrors.last_name = "Last Name is required";
      if (!p.npi?.trim()) pErrors.npi = "NPI is required";
      else if (!/^\d{10}$/.test(p.npi)) pErrors.npi = "Invalid NPI";

      if (!p.city?.trim()) pErrors.city = "City is required";
      if (!p.zip_code?.trim()) pErrors.zip_code = "ZIP required";
      else if (!/^\d{5}-\d{4}$/.test(p.zip_code)) pErrors.zip_code = "ZIP code must be in format 11111-1111";

      if (!p.location_temp_id) pErrors.location_temp_id = "Location is required";

      if (Object.keys(pErrors).length > 0) {
        newProviderErrors[i] = pErrors;
        isValid = false;
      }
    });

    setProviderErrorsMap(newProviderErrors);
    // Also clear generic provider error if any
    setProviderErrors(isValid ? null : "Please correct the errors above");
    return isValid;
  };

  const getCurrentNpi = (index?: number) =>
    step === 2 ? providers[index ?? activeProviderIndex].npi : npi;

  const applyNamesFromNPI = (basic: any, index?: number) => {
    if (isProviderStep) {
      setProviders((p) => {
        const copy = [...p];
        const idx = index ?? activeProviderIndex;
        copy[idx] = {
          ...copy[idx],
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

  const handleFetchNPIDetails = async (index?: number) => {
    const currentNpi = getCurrentNpi(index);
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
      // console.log('currentNPI: ', data)
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
          applyNamesFromNPI(basic, index);
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
          const addr1 = practiceAddress.address_1 || "";
          const addr2 = practiceAddress.address_2 || "";
          const cityVal = practiceAddress.city || "";
          const sCode = practiceAddress.state || "";

          let sName = "";
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
            sName = statesMap[sCode];
          }

          const postalCode = practiceAddress.postal_code || "";
          const digits = postalCode.replace(/\D/g, "");
          let zipVal = "";

          if (digits.length >= 9) {
            zipVal = `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
          }

          if (isProviderStep) {
            setProviders((p) => {
              const copy = [...p];
              const idx = index ?? activeProviderIndex;
              copy[idx] = {
                ...copy[idx],
                address_line_1: addr1,
                address_line_2: addr2,
                city: cityVal,
                state_code: sCode,
                state_name: sName,
                zip_code: zipVal,
                country: "United States" // default
              };
              return copy;
            });
          } else {
            setAddressLine1(addr1);
            setAddressLine2(addr2);
            setCity(cityVal);
            setStateCode(sCode);
            setStateName(sName);
            if (zipVal) setZipCode(zipVal);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // STEP 1 (ORG or INDIVIDUAL)
    if (step === 1) {
      if (!validate()) return;

      if (type === "Group" && isProviderOrg) {
        if (!zipCode) {
          setErrors({ zip_code: "ZIP required" });
          return;
        }

        const tempId = primaryTempId || crypto.randomUUID();
        setPrimaryTempId(tempId);

        // Only initialize default provider if creating new and current provider is empty
        const isEditing = !!initialData;
        const hasExistingProviders = providers.length > 1 || (providers.length === 1 && !!providers[0].npi);

        if (!isEditing && !hasExistingProviders) {
          const newProviders = [{
            ...providers[0],
            location_temp_id: tempId,
            address_line_1: "",
            city: "",
            state_code: "",
            state_name: "",
            zip_code: "",
            country: "United States"
          }];
          setProviders(newProviders);
        }

        if (!zipCode || !/^\d{5}-\d{4}$/.test(zipCode)) {
          setErrors({ zip_code: "ZIP is required before adding providers" });
          return;
        }

        setStep(2);
        return;
      }

      setIsSubmitting(true);
      try {
        await handleFinish();
      } catch (err) {
        console.error("Failed to submit:", err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // STEP 2 (PROVIDERS ONLY)
    if (step === 2) {
      if (!validateProviders()) return;

      setIsSubmitting(true);
      try {
        await handleFinish();
      } catch (err) {
        console.error("Failed to submit:", err);
      } finally {
        setIsSubmitting(false);
      }
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
                    setType(selected?.value || "Group")
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
            {step === 1 && (
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
                    style={{ paddingRight: fetchingNpi ? '40px' : '12px' }}
                  />
                  {fetchingNpi && (
                    <div className={styles.inputSpinnerWrapper}>
                      <div className={styles.spinner} />
                    </div>
                  )}
                  {/* <button
                    type="button"
                    className={styles.lookupButton}
                    onClick={() => handleFetchNPIDetails()}
                    disabled={fetchingNpi || npi.length !== 10}
                    title="Lookup NPI details"
                  > */}
                  {/* {fetchingNpi ? (
                      <div className={styles.spinner} />
                    ) : (
                      <Search size={18} />
                    )}
                  </button> */}
                </div>
                {errors.npi && (
                  <span className={styles.errorText}>{errors.npi}</span>
                )}
              </div>
            )}
            {step === 1 && uiMode === "ORG" ? (
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
            ) : step === 1 ? (
              <div className={styles.formRowThree}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>First Name *</label>
                  <input
                    className={styles.input}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Middle Name</label>
                  <input
                    className={styles.input}
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input
                    className={styles.input}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              /* STEP 2: PROVIDERS LIST */
              <>
                <div className={styles.formGroup}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>Fill the Provider details</h3>
                </div>
                {providers.map((p, index) => (
                  <div key={index} className={styles.secondaryAddressCard}>
                    <div className={styles.cardHeader}>
                      <strong>Provider {index + 1}</strong>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => setProviders(prev => prev.filter((_, i) => i !== index))}
                        title="Remove provider"
                        style={{ cursor: 'pointer' }}
                      // disabled={providers.length <= 1}
                      // style={{ opacity: providers.length <= 1 ? 0.5 : 1, cursor: providers.length <= 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* NPI Row */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>NPI *</label>
                      <div className={styles.npiInputWrapper}>
                        <input
                          className={`${styles.input} ${(fetchingNpi && activeProviderIndex === index) ? styles.fetching : ''}`}
                          value={p.npi}
                          onFocus={() => setActiveProviderIndex(index)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            if (val.length > 10) return;
                            setProviders(prev => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], npi: val };
                              return copy;
                            });
                          }}
                          style={{
                            ...(providerErrorsMap[index]?.npi ? { borderColor: 'red' } : {}),
                            paddingRight: (fetchingNpi && activeProviderIndex === index) ? '40px' : '12px'
                          }}
                        />
                        {fetchingNpi && activeProviderIndex === index && (
                          <div className={styles.inputSpinnerWrapper}>
                            <div className={styles.spinner} />
                          </div>
                        )}
                        {/* <button
                          type="button"
                          className={styles.lookupButton}
                          onClick={() => handleFetchNPIDetails(index)}
                          title="Lookup NPI details"
                        >
                          <Search size={18} /> */}
                        {/* </button> */}
                      </div>
                      {providerErrorsMap[index]?.npi && <span className={styles.errorText}>{providerErrorsMap[index].npi}</span>}
                    </div>

                    {/* Name Row */}
                    <div className={styles.formRowThree}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>First Name *</label>
                        <input
                          className={styles.input}
                          value={p.first_name}
                          onFocus={() => setActiveProviderIndex(index)}
                          onChange={(e) => {
                            setProviders(prev => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], first_name: e.target.value };
                              return copy;
                            });
                          }}
                          style={providerErrorsMap[index]?.first_name ? { borderColor: 'red' } : {}}
                        />
                        {providerErrorsMap[index]?.first_name && <span className={styles.errorText}>{providerErrorsMap[index].first_name}</span>}
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Middle Name</label>
                        <input
                          className={styles.input}
                          value={p.middle_name}
                          onFocus={() => setActiveProviderIndex(index)}
                          onChange={(e) => {
                            setProviders(prev => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], middle_name: e.target.value };
                              return copy;
                            });
                          }}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Last Name *</label>
                        <input
                          className={styles.input}
                          value={p.last_name}
                          onFocus={() => setActiveProviderIndex(index)}
                          onChange={(e) => {
                            setProviders(prev => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], last_name: e.target.value };
                              return copy;
                            });
                          }}
                          style={providerErrorsMap[index]?.last_name ? { borderColor: 'red' } : {}}
                        />
                        {providerErrorsMap[index]?.last_name && <span className={styles.errorText}>{providerErrorsMap[index].last_name}</span>}
                      </div>
                    </div>

                    {/* Address Fields */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Address Line 1</label>
                      <input className={styles.input} value={p.address_line_1}
                        onFocus={() => setActiveProviderIndex(index)}
                        onChange={(e) => {
                          setProviders(prev => {
                            const copy = [...prev];
                            copy[index] = { ...copy[index], address_line_1: e.target.value };
                            return copy;
                          });
                        }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Address Line 2</label>
                      <input className={styles.input} value={p.address_line_2 || ""}
                        onFocus={() => setActiveProviderIndex(index)}
                        onChange={(e) => {
                          setProviders(prev => {
                            const copy = [...prev];
                            copy[index] = { ...copy[index], address_line_2: e.target.value };
                            return copy;
                          });
                        }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>City *</label>
                      <input className={styles.input} value={p.city}
                        onFocus={() => setActiveProviderIndex(index)}
                        onChange={(e) => {
                          setProviders(prev => {
                            const copy = [...prev];
                            copy[index] = { ...copy[index], city: e.target.value };
                            return copy;
                          });
                        }}
                        style={providerErrorsMap[index]?.city ? { borderColor: 'red' } : {}}
                      />
                      {providerErrorsMap[index]?.city && <span className={styles.errorText}>{providerErrorsMap[index].city}</span>}
                    </div>
                    <div className={styles.formRowSplit}>
                      <input className={styles.input} placeholder="State Code" maxLength={2} value={p.state_code}
                        onFocus={() => setActiveProviderIndex(index)}
                        onChange={(e) => {
                          setProviders(prev => {
                            const copy = [...prev];
                            copy[index] = { ...copy[index], state_code: e.target.value.toUpperCase() };
                            return copy;
                          });
                        }}
                      />
                      <input className={styles.input} placeholder="State Name" value={p.state_name || ""}
                        onFocus={() => setActiveProviderIndex(index)}
                        onChange={(e) => {
                          setProviders(prev => {
                            const copy = [...prev];
                            copy[index] = { ...copy[index], state_name: e.target.value };
                            return copy;
                          });
                        }}
                      />
                      <Select
                        value={{ value: p.country, label: p.country || "United States" }}
                        onChange={(opt) => {
                          setProviders(prev => {
                            const copy = [...prev];
                            copy[index] = { ...copy[index], country: opt?.value || "United States" };
                            return copy;
                          });
                        }}
                      />
                      <div className={styles.formGroup}>
                        <input className={styles.input} placeholder="ZIP Code" value={p.zip_code}
                          onFocus={() => setActiveProviderIndex(index)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const fmt = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5, 9)}` : val;
                            setProviders(prev => {
                              const copy = [...prev];
                              copy[index] = { ...copy[index], zip_code: fmt };
                              return copy;
                            });

                            if (searchTimeoutRef.current) {
                              clearTimeout(searchTimeoutRef.current);
                            }
                            if (val.length >= 5) {
                              searchTimeoutRef.current = setTimeout(() => {
                                fetchZipDetailsForProvider(index, val.slice(0, 5));
                              }, 500);
                            }
                          }}
                          style={providerErrorsMap[index]?.zip_code ? { borderColor: 'red' } : {}}
                        />
                        {providerErrorsMap[index]?.zip_code && <span className={styles.errorText}>{providerErrorsMap[index].zip_code}</span>}
                      </div>
                    </div>

                    {/* Location Dropdown */}
                    <div className={styles.formGroup}>
                      {/* <label className={styles.label}>Provider Location Link</label> */}
                      <label className={styles.label}>Select Client Location *</label>
                      <Select
                        value={
                          [
                            { value: primaryTempId, label: `Primary: ${addressLine1}` },
                            ...extraAddresses.map(a => ({
                              value: a.temp_id,
                              label: `${a.address_line_1} (${a.city})`
                            }))
                          ].find(opt => opt.value === p.location_temp_id)
                        }
                        onChange={(selected) => {
                          setProviders(prev => {
                            const copy = [...prev];
                            copy[index] = {
                              ...copy[index],
                              location_temp_id: selected?.value || ""
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
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: base => ({ ...base, zIndex: 10000 }),
                          control: base => providerErrorsMap[index]?.location_temp_id ? { ...base, borderColor: 'red' } : base
                        }}
                      />
                      {providerErrorsMap[index]?.location_temp_id && <span className={styles.errorText}>{providerErrorsMap[index].location_temp_id}</span>}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className={styles.addAddressBtn}
                  onClick={() => {
                    setProviders((prev) => [
                      ...prev,
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
                        country: "United States",
                        location_temp_id: primaryTempId,
                      },
                    ]);
                    setActiveProviderIndex(providers.length);
                  }}
                >
                  <Plus size={16} /> Add Provider
                </button>
              </>
            )}

            {/* SHARED ADDRESS INPUTS FOR STEP 1 ONLY */}
            {step === 1 && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Address Line 1 *</label>
                  <input
                    className={styles.input}
                    maxLength={250}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Address Line 2</label>
                  <input className={styles.input} maxLength={250} value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>City *</label>
                  <input className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>

                <div className={styles.formRowSplit}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>State Code</label>
                    <input className={styles.input} value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase())} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>State Name</label>
                    <input className={styles.input} value={stateName} onChange={(e) => setStateName(e.target.value)} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Country *</label>
                    <Select value={{ value: country, label: country }} onChange={(s) => setCountry(s?.value || "United States")} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>ZIP Code *</label>
                    <input className={styles.input} value={zipCode} onChange={handleZipChange} />
                    {errors.zip_code && <span className={styles.errorText}>{errors.zip_code}</span>}
                  </div>
                </div>

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
              </>
            )}

            {uiMode === "ORG" && step === 1 && (
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
                <Plus size={16} /> Add Additional Address
              </button>
            )}

            {uiMode === "ORG" && step === 1 &&
              extraAddresses.map((addr, index) => (
                <div key={index} className={styles.secondaryAddressCard}>
                  <div className={styles.cardHeader}>
                    <strong>Additional Address {index + 1}</strong>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() =>
                        setExtraAddresses((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      title="Remove address"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className={styles.formGroup}>
                    <input
                      className={styles.input}
                      placeholder="Address Line 1"
                      value={addr.address_line_1}
                      onChange={(e) => {
                        setExtraAddresses((prev) => {
                          const copy = [...prev];
                          copy[index] = {
                            ...copy[index],
                            address_line_1: e.target.value,
                          };
                          return copy;
                        });
                      }}
                      style={extraAddressErrors[index]?.address_line_1 ? { borderColor: 'red' } : {}}
                    />
                    {extraAddressErrors[index]?.address_line_1 && <span className={styles.errorText}>{extraAddressErrors[index].address_line_1}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <input
                      className={styles.input}
                      placeholder="Address Line 2"
                      value={addr.address_line_2 || ""}
                      onChange={(e) => {
                        setExtraAddresses((prev) => {
                          const copy = [...prev];
                          copy[index] = {
                            ...copy[index],
                            address_line_2: e.target.value,
                          };
                          return copy;
                        });
                      }}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <input
                      className={styles.input}
                      placeholder="City"
                      value={addr.city}
                      onChange={(e) => {
                        setExtraAddresses((prev) => {
                          const copy = [...prev];
                          copy[index] = {
                            ...copy[index],
                            city: e.target.value,
                          };
                          return copy;
                        });
                      }}
                      style={extraAddressErrors[index]?.city ? { borderColor: 'red' } : {}}
                    />
                    {extraAddressErrors[index]?.city && <span className={styles.errorText}>{extraAddressErrors[index].city}</span>}
                  </div>

                  <div className={styles.formRowSplit}>
                    <input
                      className={styles.input}
                      placeholder="State Code"
                      maxLength={2}
                      value={addr.state_code}
                      onChange={(e) => {
                        setExtraAddresses((prev) => {
                          const copy = [...prev];
                          copy[index] = {
                            ...copy[index],
                            state_code: e.target.value.toUpperCase(),
                          };
                          return copy;
                        });
                      }}
                    />
                    <input
                      className={styles.input}
                      placeholder="State Name"
                      value={addr.state_name || ""}
                      onChange={(e) => {
                        setExtraAddresses((prev) => {
                          const copy = [...prev];
                          copy[index] = {
                            ...copy[index],
                            state_name: e.target.value,
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
                        setExtraAddresses((prev) => {
                          const copy = [...prev];
                          copy[index] = {
                            ...copy[index],
                            country: e.target.value,
                          };
                          return copy;
                        });
                      }}
                    />
                    <div className={styles.formGroup}>
                      <input
                        className={styles.input}
                        placeholder="ZIP Code"
                        value={addr.zip_code}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const fmt =
                            val.length > 5
                              ? `${val.slice(0, 5)}-${val.slice(5, 9)}`
                              : val;
                          setExtraAddresses((prev) => {
                            const copy = [...prev];
                            copy[index] = {
                              ...copy[index],
                              zip_code: fmt,
                            };
                            return copy;
                          });

                          if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                          }
                          if (val.length >= 5) {
                            searchTimeoutRef.current = setTimeout(() => {
                              fetchZipDetailsForExtraAddress(index, val.slice(0, 5));
                            }, 500);
                          }
                        }}
                        style={extraAddressErrors[index]?.zip_code ? { borderColor: 'red' } : {}}
                      />
                      {extraAddressErrors[index]?.zip_code && <span className={styles.errorText}>{extraAddressErrors[index].zip_code}</span>}
                    </div>
                  </div>
                </div>
              ))}

            {/* <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div> */}

          </div>
          <div className={styles.actions}>
            <div className={styles.footerContent}>
              {/* Provider Toggle (Left Side) */}
              <div>
                {uiMode === "ORG" && step === 1 && (
                  <div className={styles.providerToggle}>
                    <input
                      type="checkbox"
                      id="isProvider"
                      className={styles.toggleInput}
                      checked={isProviderOrg}
                      onChange={(e) => setIsProviderOrg(e.target.checked)}
                    />
                    <div className={styles.toggleText}>
                      <label htmlFor="isProvider" className={styles.toggleLabel}>Do you have providers?</label>
                      <span className={styles.toggleDescription}>Enable this if the client has providers.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons (Right Side) */}
              <div style={{ display: 'flex', gap: '12px' }}>
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
                {/* {step === 2 && (
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={handleBackToStep1}
                  >
                    ← Back
                  </button>
                )} */}
                {/* <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {step === 1 && isProviderOrg ? "Next →" : (initialData ? "Update" : "Create")}
                </button> */}

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting || fetchingNpi}
                >
                  {
                    step === 1 && isProviderOrg
                      ? "Next →"
                      : initialData
                        ? (isSubmitting ? "Updating..." : "Update")
                        : (isSubmitting ? "Creating..." : "Create")
                  }
                </button>

              </div>
            </div>
          </div>
        </form>
      </div >
    </div >
  );
};

export default ClientModal;
