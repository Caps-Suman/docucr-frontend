import React, { useState, useEffect } from 'react';
import { X, Save, Wifi, Loader2 } from 'lucide-react';
import Select from 'react-select';
import { getCustomSelectStyles } from '../../../styles/selectStyles';
import printerService, { Printer } from '../../../services/printer.service';
import styles from './PrinterModal.module.css';

interface PrinterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: Printer;
    title: string;
}

const PrinterModal: React.FC<PrinterModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title
}) => {
    const [name, setName] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [port, setPort] = useState('9100');
    const [protocol, setProtocol] = useState('RAW');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('ACTIVE');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
    const [discoveredPrinters, setDiscoveredPrinters] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setIpAddress(initialData.ip_address);
            setPort(initialData.port.toString());
            setProtocol(initialData.protocol);
            setDescription(initialData.description || '');
            setStatus(initialData.status);
            setActiveTab('manual');
        } else {
            resetForm();
            setActiveTab('manual'); // Default to manual for new
        }
        setTestResult(null);
        setErrors({});
        setDiscoveredPrinters([]);
    }, [initialData, isOpen]);

    const resetForm = () => {
        setName('');
        setIpAddress('');
        setPort('9100');
        setProtocol('RAW');
        setDescription('');
        setStatus('ACTIVE');
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) newErrors.name = 'Name is required';
        if (!ipAddress.trim()) newErrors.ipAddress = 'IP Address is required';
        if (!port || isNaN(Number(port))) newErrors.port = 'Valid port is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleTestConnection = async () => {
        if (!ipAddress || !port) {
            setErrors(prev => ({ ...prev, connection: 'IP and Port required for testing' }));
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await printerService.testConnection(ipAddress, parseInt(port));
            setTestResult(result);
        } catch (error) {
            setTestResult({ success: false, message: 'Connection failed' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const printers = await printerService.discoverPrinters();
            setDiscoveredPrinters(printers);
        } catch (error) {
            setErrors(prev => ({ ...prev, scan: 'Failed to scan network' }));
        } finally {
            setIsScanning(false);
        }
    };

    const handleSelectDiscovered = (printer: any) => {
        setName(printer.name);
        setIpAddress(printer.ip_address);
        setPort(printer.port.toString());
        setProtocol(printer.protocol);
        setDescription(printer.description);
        setActiveTab('manual');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                name,
                ip_address: ipAddress,
                port: parseInt(port),
                protocol,
                description,
                status
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const protocolOptions = [
        { value: 'RAW', label: 'RAW (Port 9100)' },
        { value: 'IPP', label: 'IPP' },
        { value: 'LPD', label: 'LPD' }
    ];

    const statusOptions = [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' }
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    {!initialData ? (
                        <div className={styles.tabs}>
                            <button
                                className={`${styles.tab} ${activeTab === 'manual' ? styles.active : ''}`}
                                onClick={() => setActiveTab('manual')}
                            >
                                Manual Setup
                            </button>
                            <button
                                className={`${styles.tab} ${activeTab === 'auto' ? styles.active : ''}`}
                                onClick={() => setActiveTab('auto')}
                            >
                                Auto Configure
                            </button>
                        </div>
                    ) : (
                        <h2>{title}</h2>
                    )}
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.contentBody}>

                    {activeTab === 'auto' ? (
                        <div className={styles.autoConfig}>
                            <div className={styles.scanSection}>
                                <p>Scan your local network for available printers.</p>
                                <button
                                    className={styles.scanButton}
                                    onClick={handleScan}
                                    disabled={isScanning}
                                >
                                    {isScanning ? <Loader2 className="spin" size={16} /> : <Wifi size={16} />}
                                    {isScanning ? 'Scanning...' : 'Scan Network'}
                                </button>
                            </div>

                            {errors.scan && <div className={styles.errorText}>{errors.scan}</div>}

                            <div className={styles.discoveredList}>
                                {discoveredPrinters.length === 0 && !isScanning && (
                                    <div className={styles.emptyScan}>
                                        No printers found. Make sure devices are on the same network.
                                    </div>
                                )}
                                {discoveredPrinters.map((p, idx) => (
                                    <div key={idx} className={styles.discoveredItem}>
                                        <div className={styles.discoveredInfo}>
                                            <strong>{p.name}</strong>
                                            <span>{p.ip_address}:{p.port} ({p.protocol})</span>
                                        </div>
                                        <button
                                            className={styles.selectButton}
                                            onClick={() => handleSelectDiscovered(p)}
                                        >
                                            Configure
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Printer Name *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Office Main Printer"
                                        style={errors.name ? { borderColor: '#ef4444' } : {}}
                                    />
                                    {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>IP Address / Hostname *</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={ipAddress}
                                        onChange={e => setIpAddress(e.target.value)}
                                        placeholder="192.168.1.100"
                                        style={errors.ipAddress ? { borderColor: '#ef4444' } : {}}
                                    />
                                    {errors.ipAddress && <span className={styles.errorText}>{errors.ipAddress}</span>}
                                </div>
                                <div className={styles.formGroup} style={{ flex: '0 0 120px' }}>
                                    <label className={styles.label}>Port *</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={port}
                                        onChange={e => setPort(e.target.value)}
                                        placeholder="9100"
                                        style={errors.port ? { borderColor: '#ef4444' } : {}}
                                    />
                                    {errors.port && <span className={styles.errorText}>{errors.port}</span>}
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Protocol</label>
                                    <Select
                                        value={protocolOptions.find(opt => opt.value === protocol)}
                                        onChange={(selected) => setProtocol(selected?.value || 'RAW')}
                                        options={protocolOptions}
                                        styles={getCustomSelectStyles()}
                                        isSearchable={false}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Status</label>
                                    <Select
                                        value={statusOptions.find(opt => opt.value === status)}
                                        onChange={(selected) => setStatus(selected?.value || 'ACTIVE')}
                                        options={statusOptions}
                                        styles={getCustomSelectStyles()}
                                        isSearchable={false}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Description</label>
                                <textarea
                                    className={styles.textarea}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Location, model, etc."
                                    rows={3}
                                />
                            </div>

                            {testResult && (
                                <div className={`${styles.testResult} ${testResult.success ? styles.success : styles.error}`}>
                                    {testResult.success ? 'Connection Successful' : `Connection Failed: ${testResult.message}`}
                                </div>
                            )}
                            {errors.connection && <span className={styles.errorText}>{errors.connection}</span>}

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.testButton}
                                    onClick={handleTestConnection}
                                    disabled={isTesting || !ipAddress || !port}
                                >
                                    {isTesting ? <Loader2 className="spin" size={16} /> : <Wifi size={16} />}
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                </button>

                                <div style={{ flex: 1 }}></div>

                                <button type="button" className={styles.cancelButton} onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                                    {isSubmitting ? 'Saving...' : 'Save Printer'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrinterModal;
