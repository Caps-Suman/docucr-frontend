import React, { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import Select from "react-select";
import { getCustomSelectStyles } from "../../styles/selectStyles";
import styles from "./OrganisationModal.module.css";
import organisationService from "../../services/organisation.service";
import { useLocation, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import authService from "../../services/auth.service";

interface OrganisationModalProps {
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
    }) => void;
    initialData?: {
        id?: string;
        name: string; // Added name field
        email: string;
        username: string;
        first_name: string;
        middle_name?: string;
        last_name: string;
        phone_country_code?: string;
        phone_number?: string;
    };
    title: string;
    isLoading?: boolean;
}

const OrganisationModal: React.FC<OrganisationModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title,
    isLoading,
}) => {
    const [name, setName] = useState(""); // Added name state
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
    const [phoneNumber, setPhoneNumber] = useState("");
    const location = useLocation();
    const navigate = useNavigate();

    const state: any = location.state;

    const isSelectionMode = state?.requiresOrgSelection === true;

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName((initialData as any).name || ""); // Initialize name
            setEmail(initialData.email);
            setUsername(initialData.username);
            setFirstName(initialData.first_name);
            setMiddleName(initialData.middle_name || "");
            setLastName(initialData.last_name);
            setPhoneCountryCode(initialData.phone_country_code || "+91");
            setPhoneNumber(initialData.phone_number || "");
            setPassword("");
        } else {
            setName("");
            setEmail("");
            setUsername("");
            setFirstName("");
            setMiddleName("");
            setLastName("");
            setPassword("");
            setPhoneCountryCode("+91");
            setPhoneNumber("");
        }
        setErrors({});
    }, [initialData, isOpen]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!name.trim()) newErrors.name = "Organisation Name is required";
        if (name.length > 100) newErrors.name = "Name cannot exceed 100 characters";

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
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }

        const data: any = {
            name: name.trim(), // Include name
            email: email.trim(),
            username: username.trim(),
            first_name: firstName.trim(),
            middle_name: middleName.trim() || undefined,
            last_name: lastName.trim(),
            phone_country_code: phoneCountryCode,
            phone_number: phoneNumber || undefined,
        };

        if (!initialData?.id) {
            data.password = password;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const countryCodeOptions = [
        { value: "+91", label: "+91" },
        { value: "+1", label: "+1" },
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{title}</h2>
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

                        {/* Name Field */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup} style={{ width: '100%' }}>
                                <label className={styles.label}>Organisation Name *</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter organisation name"
                                    style={{
                                        borderColor: errors.name ? "#ef4444" : "#d1d5db",
                                    }}
                                />
                                {errors.name && (
                                    <span className={styles.errorText}>{errors.name}</span>
                                )}
                            </div>
                        </div>

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
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrganisationModal;
