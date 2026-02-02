import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import Select from 'react-select';
import { getCustomSelectStyles } from '../../styles/selectStyles';
import { Client } from '../../services/client.service';
import clientService from '../../services/client.service';
import styles from './ClientModal.module.css';

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
        country?:string;
    }) => void;

    initialData?: Client;
    title: string;
}

const ClientModal: React.FC<ClientModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title
}) => {
    const [businessName, setBusinessName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [npi, setNpi] = useState('');
    const [type, setType] = useState('Individual');
    const [statusId, setStatusId] = useState<string | number>('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [stateCode, setStateCode] = useState('');
    const [stateName, setStateName] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [country, setCountry] = useState('United States');

    const [fetchingNpi, setFetchingNpi] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const suggestionsRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query: string) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsSearchingAddress(true);
        try {
            const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=50`);
            if (!response.ok) throw new Error('Photon search failed');
            const data = await response.json();

            // Filter for US and India only
            const filteredFeatures = (data.features || []).filter((f: any) =>
                ['US', 'IN'].includes(f.properties?.countrycode)
            ).slice(0, 5);

            setSuggestions(filteredFeatures);
            setShowSuggestions(filteredFeatures.length > 0);
        } catch (error) {
            console.error('Error searching address:', error);
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
        const street = props.street || '';
        const houseNumber = props.housenumber || '';
        const fullAddress = `${houseNumber} ${street}`.trim() || props.name || '';

        setAddressLine1(fullAddress);
        if (props.city) setAddressLine2(props.city);

        if (props.state) {
            setStateName(props.state);

            // Map state name to code for US/India if possible
            const statesMap: { [key: string]: string } = {
                'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
                'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
                'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
                'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
                'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
                'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
                'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
                'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
                'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
                'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
                // India States
                'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS', 'Bihar': 'BR', 'Chhattisgarh': 'CT',
                'Goa': 'GA', 'Gujarat': 'GJ', 'Haryana': 'HR', 'Himachal Pradesh': 'HP', 'Jammu and Kashmir': 'JK',
                'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL', 'Madhya Pradesh': 'MP', 'Maharashtra': 'MH',
                'Manipur': 'MN', 'Meghalaya': 'ML', 'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OR',
                'Punjab': 'PB', 'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN', 'Telangana': 'TG',
                'Tripura': 'TR', 'Uttar Pradesh': 'UP', 'Uttarakhand': 'UT', 'West Bengal': 'WB'
            };
            if (statesMap[props.state]) {
                setStateCode(statesMap[props.state]);
            }
        }

        if (props.postcode) {
  const digits = props.postcode.replace(/\D/g, '');

  if (digits.length >= 9) {
    setZipCode(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
  } else {
    setZipCode('');
  }
}
  setShowSuggestions(false);
    };

    useEffect(() => {
        if (initialData) {
            setBusinessName(initialData.business_name || '');
            setFirstName(initialData.first_name || '');
            setMiddleName(initialData.middle_name || '');
            setLastName(initialData.last_name || '');
            setNpi(initialData.npi || '');
            setType(initialData.type || 'Individual');
            setStatusId(initialData.status_id || '');
            setDescription(initialData.description || '');
            setAddressLine1(initialData.address_line_1 || '');
            setAddressLine2(initialData.address_line_2 || '');
            setStateCode(initialData.state_code || '');
            setStateName(initialData.state_name || '');
            setZipCode(initialData.zip_code || '');
            setCountry(initialData.country || 'United States');
        } else {
            setBusinessName('');
            setFirstName('');
            setMiddleName('');
            setLastName('');
            setNpi('');
            setType('Individual');
            setStatusId('');
            setDescription('');
            setAddressLine1('');
            setAddressLine2('');
            setStateCode('');
            setStateName('');
            setZipCode('');
            setCountry('United States');
        }
        setErrors({});
    }, [initialData, isOpen]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (type === 'Group' && !businessName.trim()) {
            newErrors.businessName = 'Business Name is required for Group type';
        }

        if (type === 'Individual' && !firstName.trim()) {
            newErrors.firstName = 'First Name is required for Individual type';
        }

        if (!npi) {
            newErrors.npi = 'NPI is required';
        } else if (!/^\d{10}$/.test(npi)) {
            newErrors.npi = 'NPI must be exactly 10 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFetchNPIDetails = async () => {
        if (!npi || !/^\d{10}$/.test(npi)) {
            setErrors({ npi: 'Please enter a valid 10-digit NPI' });
            return;
        }

        setFetchingNpi(true);
        setErrors({});
        try {
            // Check if NPI already exists in our system first
            const existing = await clientService.checkExistingNPIs([npi]);
            if (existing.length > 0) {
                // If editing, check if it's the same client
                if (!initialData || initialData.npi !== npi) {
                    setErrors({ npi: 'This NPI is already registered in the system' });
                    setFetchingNpi(false);
                    return;
                }
            }

            const data = await clientService.lookupNPI(npi);
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                const basic = result.basic;
                const addresses = result.addresses;

                if (type === 'Individual' && result.enumeration_type === 'NPI-1') {
                    setFirstName(basic.first_name || '');
                    setLastName(basic.last_name || '');
                    setMiddleName(basic.middle_name || '');
                } else if (type === 'Group' && result.enumeration_type === 'NPI-2') {
                    setBusinessName(basic.organization_name || basic.authorized_official_organization_name || '');
                } else {
                    const expectedType = type === 'Individual' ? 'NPI-1 (Individual)' : 'NPI-2 (Organization)';
                    const actualType = result.enumeration_type === 'NPI-1' ? 'Individual' : 'Organization';
                    setErrors({ npi: `Found ${actualType} but expected ${expectedType}` });
                    setFetchingNpi(false);
                    return;
                }

                // Map address (usually practice location is preferred)
                const practiceAddress = addresses.find((addr: any) => addr.address_purpose === 'LOCATION') || addresses[0];
                if (practiceAddress) {
                    setAddressLine1(practiceAddress.address_1 || '');
                    setAddressLine2(practiceAddress.address_2 || '');

                    const sCode = practiceAddress.state || '';
                    setStateCode(sCode);

                    // State Map for auto-filling State Name
                    const statesMap: { [key: string]: string } = {
                        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
                        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
                        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
                        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
                        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
                        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
                        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
                        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
                        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
                        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
                    };
                    if (statesMap[sCode]) {
                        setStateName(statesMap[sCode]);
                    }

                    const postalCode = practiceAddress.postal_code || '';
const digits = postalCode.replace(/\D/g, '');

if (digits.length >= 9) {
  setZipCode(`${digits.slice(0, 5)}-${digits.slice(5, 9)}`);
} else {
  setZipCode('');
}

                }
            } else {
                setErrors({ npi: 'No provider found for this NPI' });
            }
        } catch (error) {
            console.error('Error fetching NPI details:', error);
            setErrors({ npi: 'Failed to fetch NPI details' });
        } finally {
            setFetchingNpi(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        // Check for existing NPI before submission
        if (npi && (!initialData || initialData.npi !== npi)) {
            try {
                const existing = await clientService.checkExistingNPIs([npi]);
                if (existing.length > 0) {
                    setErrors({ npi: 'This NPI is already registered in the system' });
                    return;
                }
            } catch (error) {
                console.error('Error checking NPI:', error);
            }
        }

        const formData: any = {
            business_name: businessName.trim() || undefined,
            first_name: firstName.trim() || undefined,
            middle_name: middleName.trim() || undefined,
            last_name: lastName.trim() || undefined,
            npi: npi.trim() || undefined,
            type: type.trim() || undefined,
            description: description.trim() || undefined,

            // ✅ ADDRESS
            address_line_1: addressLine1 || undefined,
            address_line_2: addressLine2 || undefined,
            state_code: stateCode || undefined,
            state_name: stateName || undefined,
            zip_code: zipCode || undefined,
            country:country || undefined,
        };


        // Only include status_id for new clients, not updates
        if (!initialData && statusId) {
            formData.status_id = statusId;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const typeOptions = [
        { value: 'Individual', label: 'Individual (NPI-1)' },
        { value: 'Group', label: 'Organization (NPI-2)' }
    ];

    return (
        <div className={styles.overlay} >
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{title}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formContent}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Client Type *</label>
                            <Select
                                value={typeOptions.find(opt => opt.value === type)}
                                onChange={(selected) => setType(selected?.value || 'Individual')}
                                options={typeOptions}
                                placeholder="Select client type"
                                styles={{
                                    ...getCustomSelectStyles(),
                                    menu: (base) => ({
                                        ...getCustomSelectStyles().menu(base),
                                        zIndex: 10000
                                    }),
                                    menuPortal: (base) => ({
                                        ...base,
                                        zIndex: 10000
                                    })
                                }}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>NPI *</label>
                            <div className={styles.npiInputWrapper}>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={npi}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        if (value.length <= 10) {
                                            setNpi(value);
                                        }
                                    }}
                                    placeholder="Enter 10-digit NPI"
                                    style={{ borderColor: errors.npi ? '#ef4444' : '#d1d5db' }}
                                />
                                <button
                                    type="button"
                                    className={styles.lookupButton}
                                    onClick={handleFetchNPIDetails}
                                    disabled={fetchingNpi || npi.length !== 10}
                                    title="Lookup NPI details"
                                >
                                    {fetchingNpi ? (
                                        <div className={styles.spinner} />
                                    ) : (
                                        <Search size={18} />
                                    )}
                                </button>
                            </div>
                            {errors.npi && <span className={styles.errorText}>{errors.npi}</span>}
                        </div>
                        {type === 'Group' ? (
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Business Name *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Enter business name"
                                    style={{ borderColor: errors.businessName ? '#ef4444' : '#d1d5db' }}
                                />
                                {errors.businessName && <span className={styles.errorText}>{errors.businessName}</span>}
                            </div>
                        ) : (
                            <div className={styles.formRowThree}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>First Name *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Enter first name"
                                        style={{ borderColor: errors.firstName ? '#ef4444' : '#d1d5db' }}
                                    />
                                    {errors.firstName && <span className={styles.errorText}>{errors.firstName}</span>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Middle Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={middleName}
                                        onChange={(e) => setMiddleName(e.target.value)}
                                        placeholder="Enter middle name"
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Last Name</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Enter last name"
                                    />
                                </div>
                            </div>
                        )}
                        <div className={styles.formGroup} style={{ position: 'relative' }}>
                            <label className={styles.label}>Address Line 1</label>
                            <input
                                className={styles.input}
                                maxLength={250}
                                value={addressLine1}
                                onChange={handleAddressChange}
                                autoComplete="off"
                            />
                            {isSearchingAddress && <div className={styles.addressLoader} />}

                            {showSuggestions && (
                                <div className={styles.suggestionsContainer} ref={suggestionsRef}>
                                    {suggestions.map((feature, index) => {
                                        const p = feature.properties;
                                        const label = [
                                            p.housenumber,
                                            p.street,
                                            p.city,
                                            p.state,
                                            p.postcode,
                                            p.country
                                        ].filter(Boolean).join(', ');

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
                                value={addressLine2}
                                onChange={(e) => setAddressLine2(e.target.value)}
                            />
                        </div>

                        <div className={styles.formRowThree}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>State Code</label>
                                <input
                                    className={styles.input}
                                    maxLength={2}
                                    value={stateCode}
                                    onChange={(e) =>
                                        setStateCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
                                    }
                                    placeholder="CA"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>State Name</label>
                                <input
                                    className={styles.input}
                                    maxLength={50}
                                    value={stateName}
                                    onChange={(e) => setStateName(e.target.value)}
                                    placeholder="California"
                                />
                            </div>
                            <div className={styles.formGroup}>
  <label className={styles.label}>Country *</label>
  <Select
    value={{ value: country, label: country }}
    onChange={(selected) => setCountry(selected?.value || 'United States')}
    options={[
      { value: 'United States', label: 'United States' },
      { value: 'India', label: 'India' }
      // add more later if needed
    ]}
    styles={{
      ...getCustomSelectStyles(),
      menuPortal: (base) => ({ ...base, zIndex: 10000 }),
      menu: (base) => ({ ...base, zIndex: 10000 })
    }}
    menuPortalTarget={document.body}
    menuPosition="fixed"
  />
</div>

                            <div className={styles.formGroup}>
  <label className={styles.label}>ZIP Code *</label>
  <input
    className={styles.input}
    value={zipCode}
    placeholder="11111-1111"
    maxLength={10}
    onChange={(e) => {
      let value = e.target.value.replace(/[^\d]/g, '');

      if (value.length > 5) {
        value = value.slice(0, 5) + '-' + value.slice(5, 9);
      }

      setZipCode(value);
    }}
    onBlur={() => {
      if (zipCode && !/^\d{5}-\d{4}$/.test(zipCode)) {
        setErrors((prev) => ({
          ...prev,
          zip_code: 'ZIP code must be in format 11111-1111'
        }));
      }
    }}
  />
  {errors.zip_code && (
    <span className={styles.errorText}>{errors.zip_code}</span>
  )}
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
                    </div>
                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;
