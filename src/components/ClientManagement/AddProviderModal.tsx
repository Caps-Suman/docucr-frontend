import React from 'react';
import ReactDOM from 'react-dom';
import { X, Loader2, UserPlus, MapPin, Hash, User, Search, Pencil } from 'lucide-react';
import styles from './AddProviderModal.module.css';
import clientService, { ClientLocation, Provider } from '../../services/client.service';
import CommonDropdown from '../Common/CommonDropdown';
import Toast, { ToastType } from '../Common/Toast';

interface AddProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName: string;
    locations: ClientLocation[];
    onSuccess: () => void;
    provider?: Provider;
}

const AddProviderModal: React.FC<AddProviderModalProps> = ({ isOpen, onClose, clientId, clientName, locations, onSuccess, provider }) => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFetchingNpi, setIsFetchingNpi] = React.useState(false);
    const [toast, setToast] = React.useState<{ message: string; type: ToastType } | null>(null);
    const [npiError, setNpiError] = React.useState<string | null>(null);

    const [formData, setFormData] = React.useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        npi: '',
        location_id: ''
    });

    React.useEffect(() => {
        if (provider) {
            setFormData({
                first_name: provider.first_name || '',
                middle_name: provider.middle_name || '',
                last_name: provider.last_name || '',
                npi: provider.npi || '',
                location_id: provider.location_id || ''
            });
        } else {
            setFormData({
                first_name: '',
                middle_name: '',
                last_name: '',
                npi: '',
                location_id: ''
            });
        }
    }, [provider, isOpen]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'npi') {
            if (value && !/^\d+$/.test(value)) return;
            if (value.length > 10) return;

            if (value.length > 0 && value.length < 10) {
                setNpiError("NPI must be 10 digits");
            } else if (value.length === 10) {
                setNpiError(null);
            } else {
                setNpiError(null);
            }
        }
    };

    const handleDropdownChange = (value: string) => {
        setFormData(prev => ({ ...prev, location_id: value }));
    };

    const handleLookupNpi = async () => {
        if (!formData.npi || formData.npi.length !== 10) {
            setNpiError("Please enter a valid 10-digit NPI");
            return;
        }

        try {
            setIsFetchingNpi(true);
            setNpiError(null);

            const data = await clientService.lookupNPI(formData.npi);

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                const basic = result.basic;

                if (result.enumeration_type !== "NPI-1") {
                    setNpiError("Found an Organization NPI. Please use an Individual NPI.");
                    return;
                }

                setFormData(prev => ({
                    ...prev,
                    first_name: basic.first_name || '',
                    middle_name: basic.middle_name || '',
                    last_name: basic.last_name || ''
                }));

                setToast({ message: "Provider details fetched successfully", type: "success" });
            } else {
                setNpiError("No records found for this NPI");
            }
        } catch (error: any) {
            console.error("NPI Lookup failed:", error);
            setNpiError("Failed to fetch NPI details. Please enter manually.");
        } finally {
            setIsFetchingNpi(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.first_name || !formData.last_name || !formData.npi || !formData.location_id) {
            setToast({ message: "Please fill in all required fields", type: "error" });
            return;
        }

        if (formData.npi.length !== 10) {
            setNpiError("NPI must be 10 digits");
            return;
        }

        try {
            setIsSubmitting(true);

            const selectedLocation = locations.find(l => l.id === formData.location_id);
            if (!selectedLocation) throw new Error("Selected location not found");

            const providerData = {
                first_name: formData.first_name,
                middle_name: formData.middle_name,
                last_name: formData.last_name,
                npi: formData.npi,
                location_id: formData.location_id,
                address_line_1: selectedLocation.address_line_1,
                address_line_2: selectedLocation.address_line_2,
                city: selectedLocation.city,
                state_code: selectedLocation.state_code,
                zip_code: selectedLocation.zip_code,
                country: selectedLocation.country || 'United States'
            };

            if (provider) {
                await clientService.updateProvider(clientId, provider.id, providerData);
                setToast({ message: "Provider updated successfully", type: "success" });
            } else {
                await clientService.addProviders(clientId, [providerData]);
                setToast({ message: "Provider added successfully", type: "success" });
            }

            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (error: any) {
            console.error(provider ? "Failed to update provider:" : "Failed to add provider:", error);
            setToast({ message: error.message || (provider ? "Failed to update provider" : "Failed to add provider"), type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const locationOptions = locations.map(loc => ({
        value: loc.id,
        label: `${loc.address_line_1}, ${loc.city} (${loc.is_primary ? 'Primary' : 'Secondary'})`
    }));

    return ReactDOM.createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{provider ? 'Edit Provider' : 'Add New Provider'}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>NPI Number *</label>
                        <div className={styles.inputGroup}>
                            <input
                                type="text"
                                name="npi"
                                value={formData.npi}
                                onChange={handleInputChange}
                                className={styles.input}
                                style={{ flex: 1, borderColor: npiError ? '#ef4444' : undefined }}
                                placeholder="Enter 10-digit NPI"
                                maxLength={10}
                                required
                            />
                            <button
                                type="button"
                                className={styles.lookupButton}
                                onClick={handleLookupNpi}
                                disabled={isFetchingNpi || formData.npi.length !== 10}
                            >
                                {isFetchingNpi ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                Lookup
                            </button>
                        </div>
                        {npiError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{npiError}</p>}
                    </div>

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>First Name *</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="First Name"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Middle Name</label>
                            <input
                                type="text"
                                name="middle_name"
                                value={formData.middle_name}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Optional"
                            />
                        </div>
                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label className={styles.label}>Last Name *</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Last Name"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Select Office Location *</label>
                        <CommonDropdown
                            value={formData.location_id}
                            onChange={handleDropdownChange}
                            options={locationOptions}
                            placeholder="Select a registered location..."
                            isSearchable={true}
                            size="md"
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" onClick={handleSubmit} className={styles.submitButton} disabled={isSubmitting || isFetchingNpi}>
                        {isSubmitting ? (
                            <><Loader2 size={18} className="animate-spin" /> {provider ? 'Updating...' : 'Adding...'}</>
                        ) : (
                            <>{provider ? <Pencil size={18} /> : <UserPlus size={18} />} {provider ? 'Update Provider' : 'Add Provider'}</>
                        )}
                    </button>
                </div>

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </div>,
        document.body
    );
};

export default AddProviderModal;
