import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import clientService, { ClientCreateData } from '../../services/client.service';
import styles from './ClientImportModal.module.css';

interface ClientImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ClientImportModal: React.FC<ClientImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: any[]; invalid: { row: any; error: string }[] } | null>(null);
    const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setValidationResult(null);
            setUploadResult(null);
        }
    };

    const normalizeData = (data: any) => {
        const normalized: any = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = data[key];
        });
        return normalized;
    };

    const validateClientData = (rawData: any): { client: ClientCreateData | null; error?: string } => {
        const data = normalizeData(rawData);
        const client: ClientCreateData = {};

        // Header Variations Mapping
        const getVal = (keys: string[]) => {
            for (const k of keys) {
                const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (data[cleanK] !== undefined && data[cleanK] !== null) return String(data[cleanK]).trim();
            }
            return null;
        };

        const typeStr = getVal(['type', 'client_type', 'category'])?.toLowerCase() || 'individual';
        client.type = typeStr.includes('group') || typeStr.includes('org') ? 'Group' : 'Individual';

        const npi = getVal(['npi', 'npi_number', 'provider_id']);
        if (npi) {
            let cleanNpi = npi.replace(/\D/g, '');
            // Handle case where Excel strips leading zero
            if (cleanNpi.length === 9) cleanNpi = '0' + cleanNpi;

            if (!/^\d{10}$/.test(cleanNpi)) return { client: null, error: 'NPI must be exactly 10 digits' };
            client.npi = cleanNpi;
        } else {
            return { client: null, error: 'NPI is required' };
        }

        if (client.type === 'Group') {
            const bName = getVal(['business_name', 'organization', 'company', 'name']);
            if (!bName) return { client: null, error: 'Business Name is required for Group type' };
            client.business_name = bName;
        } else {
            const fName = getVal(['first_name', 'given_name', 'fname']);
            const lName = getVal(['last_name', 'surname', 'lname']);
            if (!fName) return { client: null, error: 'First Name is required for Individual type' };
            client.first_name = fName;
            client.last_name = lName || '';
            client.middle_name = getVal(['middle_name', 'mname']) || '';
        }

        // Address Mapping
        const a1 = getVal(['address_line_1', 'address1', 'street', 'address']);
        if (a1) client.address_line_1 = a1.substring(0, 250);

        const a2 = getVal(['address_line_2', 'address2', 'city', 'suite', 'apt']);
        if (a2) client.address_line_2 = a2.substring(0, 250);

        const sc = getVal(['state_code', 'state', 'province']);
        const sn = getVal(['state_name', 'state_full']);

        if (sc && sc.length === 2) {
            client.state_code = sc.toUpperCase();
            if (sn) client.state_name = sn.substring(0, 50);
        } else if (sc) {
            // If we have a long state name in the 'state' column
            client.state_name = sc.substring(0, 50);
        } else if (sn) {
            client.state_name = sn.substring(0, 50);
        }

        const zc = getVal(['zip_code', 'zip', 'postcode', 'pin']);
        if (zc) {
            // Clean and take first 5 digits
            const cleanZip = zc.replace(/\D/g, '').substring(0, 5);
            if (cleanZip.length === 5) client.zip_code = cleanZip;
        }

        const ze = getVal(['zip_extension', 'zip4']);
        if (ze) {
            const cleanExt = ze.replace(/\D/g, '').substring(0, 4);
            if (cleanExt.length === 4) client.zip_extension = cleanExt;
        }

        const desc = getVal(['description', 'notes', 'memo']);
        if (desc) client.description = desc.substring(0, 1000);

        return { client };
    };

    const handleValidate = async () => {
        if (!file) return;
        setIsValidating(true);
        setUploadResult(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1).filter((row: any) =>
                row && Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')
            );

            const processedData = rows.map((row: any) => {
                const obj: any = {};
                headers.forEach((header: string, index: number) => {
                    if (header) obj[header] = row[index];
                });
                return obj;
            });

            const valid: ClientCreateData[] = [];
            const invalid: { row: any; error: string }[] = [];

            // Preliminary mapping to collect NPIs
            const mappedRows = processedData.map((row: any) => {
                return validateClientData(row);
            });

            const npisToCheck = mappedRows
                .map(r => r.client?.npi)
                .filter((npi): npi is string => !!npi);

            const existingNpis = npisToCheck.length > 0
                ? await clientService.checkExistingNPIs(npisToCheck)
                : [];

            mappedRows.forEach((result, index) => {
                const row = processedData[index];
                if (result.client) {
                    if (result.client.npi && existingNpis.includes(result.client.npi)) {
                        invalid.push({ row, error: 'NPI already exists in system' });
                    } else {
                        valid.push(result.client);
                    }
                } else {
                    invalid.push({ row, error: result.error || 'Invalid data' });
                }
            });

            setValidationResult({ valid, invalid });
        } catch (error) {
            console.error('Validation error:', error);
        } finally {
            setIsValidating(false);
        }
    };

    const handleUpload = async () => {
        if (!validationResult || validationResult.valid.length === 0) return;

        setIsUploading(true);
        try {
            const result = await clientService.createClientsFromBulk(validationResult.valid);
            setUploadResult(result);

            if (result.success > 0) {
                setTimeout(() => {
                    onSuccess();
                    handleClose();
                }, 3000);
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            // If we have a validation error string with commas from our service, split it back into multiple lines
            const errorList = error.message ? error.message.split(', ') : ['Failed to upload'];
            setUploadResult({ success: 0, failed: errorList.length, errors: errorList });
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setValidationResult(null);
        setUploadResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    if (!isOpen) return null;

    const renderStepContent = () => {
        if (uploadResult) {
            return (
                <div className={styles.resultContainer}>
                    <div className={styles.resultHeader}>
                        <CheckCircle size={48} className={styles.successIcon} />
                        <h3>Import Complete</h3>
                        <p>We've finished processing your client list.</p>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{uploadResult.success}</span>
                            <span className={styles.statLabel}>Successfully Created</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{uploadResult.failed}</span>
                            <span className={styles.statLabel}>Failed to Upload</span>
                        </div>
                    </div>

                    {uploadResult.errors.length > 0 && (
                        <div className={styles.errorSection}>
                            <h4>Detailed Errors</h4>
                            <div className={styles.issueListContainer}>
                                <ul className={styles.issueList}>
                                    {uploadResult.errors.map((error, idx) => (
                                        <li key={idx}>
                                            <AlertCircle size={14} className={styles.errorIcon} />
                                            <span>{error}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (validationResult) {
            return (
                <div className={styles.validationArea}>
                    <div className={styles.validationSummary}>
                        <div className={styles.summaryItem}>
                            <CheckCircle size={20} className={styles.successColor} />
                            <div>
                                <strong>{validationResult.valid.length}</strong>
                                <span>Valid Rows</span>
                            </div>
                        </div>
                        <div className={styles.summaryItem}>
                            <AlertCircle size={20} className={styles.errorColor} />
                            <div>
                                <strong>{validationResult.invalid.length}</strong>
                                <span>Invalid Rows</span>
                            </div>
                        </div>
                    </div>


                    {validationResult.invalid.length > 0 && (
                        <div className={styles.invalidSection}>
                            <h4>Fix Required ({validationResult.invalid.length} issues)</h4>
                            <div className={styles.issueListContainer}>
                                <ul className={styles.issueList}>
                                    {validationResult.invalid.map((issue, idx) => (
                                        <li key={idx}>
                                            <strong>Row {idx + 2}:</strong> {issue.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (file) {
            return (
                <div className={styles.fileSelected}>
                    <div className={styles.fileCard}>
                        <FileText size={40} className={styles.fileIcon} />
                        <div className={styles.fileDetails}>
                            <strong>{file.name}</strong>
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button className={styles.removeFile} onClick={() => setFile(null)}>Change</button>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.uploadArea}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                />
                <div className={styles.uploadBox} onClick={() => fileInputRef.current?.click()}>
                    <Upload size={48} className={styles.uploadIcon} />
                    <h3>Drop your file here</h3>
                    <p>or click to browse from your computer</p>
                    <span className={styles.supportedFormats}>Supports .XLSX, .XLS, .CSV</span>
                </div>

                <div className={styles.guidelines}>
                    <div className={styles.guidelinesHeader}>
                        <h4>Guideline for Columns</h4>
                        <a
                            href="/client_import_template.csv"
                            download="client_import_template.csv"
                            className={styles.downloadLink}
                        >
                            Download Sample Template
                        </a>
                    </div>
                    <p>Include headers like <strong>Type, Name, NPI, City, Address, State,Country, ZIP</strong>.</p>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleInfo}>
                        <h2>Bulk Client Import</h2>
                        <p>Import multiple providers at once</p>
                    </div>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {renderStepContent()}
                </div>

                <div className={styles.footer}>
                    {file && !validationResult && !uploadResult && (
                        <button
                            className={styles.primaryButton}
                            onClick={handleValidate}
                            disabled={isValidating}
                        >
                            {isValidating ? 'Validating...' : 'Validate File'}
                        </button>
                    )}

                    {validationResult && !uploadResult && (
                        <>
                            <button className={styles.secondaryButton} onClick={() => setValidationResult(null)}>
                                Back
                            </button>
                            <button
                                className={styles.primaryButton}
                                onClick={handleUpload}
                                disabled={isUploading || validationResult.valid.length === 0}
                            >
                                {isUploading ? 'Importing...' : `Import ${validationResult.valid.length} Clients`}
                            </button>
                        </>
                    )}

                    {uploadResult && (
                        <button className={styles.primaryButton} onClick={handleClose}>
                            Close
                        </button>
                    )}

                    {!file && (
                        <button className={styles.secondaryButton} onClick={handleClose}>
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientImportModal;
