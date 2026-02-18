import React, { useState, useEffect } from 'react';
import { X, Printer as PrinterIcon, Loader2, Check } from 'lucide-react';
import printerService, { Printer } from '../../../services/printer.service';
import styles from './PrintModal.module.css';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: number;
    documentName: string;
    onSuccess?: () => void;
}

const PrintModal: React.FC<PrintModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentName,
    onSuccess
}) => {
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null);
    const [printing, setPrinting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Print Options
    const [copies, setCopies] = useState(1);
    const [colorMode, setColorMode] = useState<'COLOR' | 'MONO'>('MONO');
    const [duplex, setDuplex] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchPrinters();
            setSelectedPrinterId(null);
            setError(null);
            setPrinting(false);
            // Reset options
            setCopies(1);
            setColorMode('MONO');
            setDuplex(false);
        }
    }, [isOpen]);

    const fetchPrinters = async () => {
        try {
            setLoading(true);
            const data = await printerService.getPrinters(0, 100);
            const activePrinters = data.filter(p => p.status === 'ACTIVE');
            setPrinters(activePrinters);
            if (activePrinters.length > 0) {
                setSelectedPrinterId(activePrinters[0].id);
            }
        } catch (err) {
            setError("Failed to load printers");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!selectedPrinterId) return;

        setPrinting(true);
        setError(null);
        try {
            await printerService.printDocument(selectedPrinterId, documentId, {
                copies,
                colorMode,
                duplex
            });
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to print document");
            setPrinting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Print Document</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    <p className={styles.docName}>Document: <strong>{documentName}</strong></p>

                    <div className={styles.optionsGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Color Mode</label>
                            <div className={styles.toggleGroup}>
                                <div
                                    className={`${styles.toggleOption} ${colorMode === 'MONO' ? styles.active : ''}`}
                                    onClick={() => setColorMode('MONO')}
                                >
                                    B&W
                                </div>
                                <div
                                    className={`${styles.toggleOption} ${colorMode === 'COLOR' ? styles.active : ''}`}
                                    onClick={() => setColorMode('COLOR')}
                                >
                                    Color
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Copies</label>
                            <input
                                type="number"
                                min="1"
                                max="99"
                                value={copies}
                                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                                className={styles.input}
                            />
                        </div>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={duplex}
                                onChange={(e) => setDuplex(e.target.checked)}
                            />
                            Two-sided (Duplex)
                        </label>
                    </div>

                    <h4 className={styles.sectionTitle}>Select Printer</h4>

                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <Loader2 className="spin" size={24} />
                            <span>Loading printers...</span>
                        </div>
                    ) : printers.length === 0 ? (
                        <div className={styles.emptyState}>
                            <PrinterIcon size={32} />
                            <p>No active printers found.</p>
                            <span className={styles.hint}>Configure printers in Settings.</span>
                        </div>
                    ) : (
                        <div className={styles.printerList}>
                            {printers.map(printer => (
                                <div
                                    key={printer.id}
                                    className={`${styles.printerItem} ${selectedPrinterId === printer.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedPrinterId(printer.id)}
                                >
                                    <div className={styles.printerIcon}>
                                        <PrinterIcon size={20} />
                                    </div>
                                    <div className={styles.printerInfo}>
                                        <div className={styles.printerName}>{printer.name}</div>
                                        <div className={styles.printerMeta}>
                                            {printer.ip_address}:{printer.port} • {printer.protocol}
                                        </div>
                                    </div>
                                    <div className={styles.selectionIndicator}>
                                        {selectedPrinterId === printer.id && <Check size={16} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <div className={styles.errorText}>{error}</div>}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
                    <button
                        className={styles.printButton}
                        onClick={handlePrint}
                        disabled={!selectedPrinterId || printing || loading || printers.length === 0}
                    >
                        {printing ? (
                            <>
                                <Loader2 className="spin" size={16} /> Printing...
                            </>
                        ) : (
                            <>
                                <PrinterIcon size={16} /> Print
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintModal;
