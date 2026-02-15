import React from 'react';
import ReactDOM from 'react-dom';
import { X, Loader2, MapPin, Hash, Pencil } from 'lucide-react';
import styles from './AddLocationModal.module.css';
import clientService, { ClientLocation } from '../../services/client.service';
import locationService from '../../services/location.service';
import Toast, { ToastType } from '../Common/Toast';

interface AddLocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName: string;
    onSuccess: () => void;
    location?: ClientLocation;
}

const AddLocationModal: React.FC<AddLocationModalProps> = ({ isOpen, onClose, clientId, clientName, onSuccess, location }) => {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFetchingZip, setIsFetchingZip] = React.useState(false);
    const [toast, setToast] = React.useState<{ message: string; type: ToastType } | null>(null);
    const [formData, setFormData] = React.useState({
        address_line_1: '',
        address_line_2: '',
        city: '',
        state_code: '',
        zip_code: '',
        country: 'United States',
        is_primary: false
    });

    React.useEffect(() => {
        if (location) {
            setFormData({
                address_line_1: location.address_line_1 || '',
                address_line_2: location.address_line_2 || '',
                city: location.city || '',
                state_code: location.state_code || '',
                zip_code: location.zip_code || '',
                country: location.country || 'United States',
                is_primary: !!location.is_primary
            });
        } else {
            setFormData({
                address_line_1: '',
                address_line_2: '',
                city: '',
                state_code: '',
                zip_code: '',
                country: 'United States',
                is_primary: false
            });
        }
    }, [location, isOpen]);

    React.useEffect(() => {
        const fetchZipDetails = async () => {
            if (formData.zip_code.length === 5) {
                try {
                    setIsFetchingZip(true);
                    const details = await locationService.lookupZipCode(formData.zip_code);
                    if (details) {
                        setFormData(prev => ({
                            ...prev,
                            city: details.city,
                            state_code: details.stateCode,
                            country: details.country
                        }));
                    }
                } catch (error) {
                    console.error("Failed to fetch zip details:", error);
                } finally {
                    setIsFetchingZip(false);
                }
            }
        };

        fetchZipDetails();
    }, [formData.zip_code]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;

        if (name === 'zip_code' && value && !/^\d+$/.test(value)) return;
        if (name === 'zip_code' && value.length > 5) return;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.address_line_1 || !formData.city || !formData.state_code || !formData.zip_code) {
            setToast({ message: "Please fill in all required fields", type: "error" });
            return;
        }

        try {
            setIsSubmitting(true);
            if (location) {
                await clientService.updateLocation(clientId, location.id, formData);
                setToast({ message: "Location updated successfully", type: "success" });
            } else {
                await clientService.addLocation(clientId, formData);
                setToast({ message: "Location added successfully", type: "success" });
            }
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (error: any) {
            console.error(location ? "Failed to update location:" : "Failed to add location:", error);
            setToast({ message: error.message || (location ? "Failed to update location" : "Failed to add location"), type: "error" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{location ? 'Edit Location' : 'Add New Location'}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.body}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Zip Code *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    name="zip_code"
                                    value={formData.zip_code}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    style={{ width: '100%' }}
                                    placeholder="Enter Zip"
                                    maxLength={5}
                                    required
                                />
                                {isFetchingZip && (
                                    <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#83cee4' }} />
                                )}
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Country</label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Country"
                                disabled
                            />
                        </div>
                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label className={styles.label}>Address Line 1 *</label>
                            <input
                                type="text"
                                name="address_line_1"
                                value={formData.address_line_1}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Street address, P.O. box, company name"
                                required
                            />
                        </div>
                        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                            <label className={styles.label}>Address Line 2</label>
                            <input
                                type="text"
                                name="address_line_2"
                                value={formData.address_line_2}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="Apartment, suite, unit, building, floor, etc."
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>City *</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="City"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>State Code *</label>
                            <input
                                type="text"
                                name="state_code"
                                value={formData.state_code}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="e.g. CA"
                                maxLength={2}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkboxGroup}>
                            <input
                                type="checkbox"
                                name="is_primary"
                                checked={formData.is_primary}
                                onChange={handleInputChange}
                                className={styles.checkbox}
                            />
                            <div>
                                <span className={styles.label}>Set as Primary Location</span>
                                <p className={styles.subtitle}>This will be the default address for this client</p>
                            </div>
                        </label>
                    </div>
                </form>

                <div className={styles.footer}>
                    <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" onClick={handleSubmit} className={styles.submitButton} disabled={isSubmitting || isFetchingZip}>
                        {isSubmitting ? (
                            <><Loader2 size={18} className="animate-spin" /> {location ? 'Updating...' : 'Adding...'}</>
                        ) : (
                            <>{location ? <Pencil size={18} /> : <MapPin size={18} />} {location ? 'Update Location' : 'Add Location'}</>
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

export default AddLocationModal;
