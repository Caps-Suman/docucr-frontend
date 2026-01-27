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
    const [preview, setPreview] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = async (file: File) => {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: null 
            });
            
            if (jsonData.length === 0) {
                setPreview([]);
                return;
            }
            
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1).filter((row: any) => 
                row && Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')
            );
            
            const processedData = rows.map((row: any) => {
                const obj: any = {};
                headers.forEach((header: string, index: number) => {
                    if (header && String(header).trim()) {
                        const cleanHeader = String(header).trim().toLowerCase().replace(/\s+/g, '_');
                        obj[cleanHeader] = row[index];
                    }
                });
                return obj;
            });
            
            setPreview(processedData.slice(0, 5));
        } catch (error) {
            console.error('Error parsing file:', error);
            setPreview([]);
        }
    };

    const validateClientData = (data: any): ClientCreateData | null => {
        const client: ClientCreateData = {};
        const type = String(data.type || 'Individual').trim().toLowerCase();
        
        if (type === 'group') {
            if (data.business_name && String(data.business_name).trim()) {
                client.business_name = String(data.business_name).trim();
            }
            if (data.npi && String(data.npi).trim()) {
                client.npi = String(data.npi).trim();
            }
            if (data.description && String(data.description).trim()) {
                client.description = String(data.description).trim();
            }
            client.type = 'Group';
        } else {
            if (data.first_name && String(data.first_name).trim()) {
                client.first_name = String(data.first_name).trim();
            }
            if (data.middle_name && String(data.middle_name).trim()) {
                client.middle_name = String(data.middle_name).trim();
            }
            if (data.last_name && String(data.last_name).trim()) {
                client.last_name = String(data.last_name).trim();
            }
            if (data.npi && String(data.npi).trim()) {
                client.npi = String(data.npi).trim();
            }
            if (data.description && String(data.description).trim()) {
                client.description = String(data.description).trim();
            }
            client.type = 'Individual';
        }

        const hasName = (type === 'group' && client.business_name) || 
                       (type === 'individual' && client.first_name);
        if (!hasName) return null;

        return client;
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadResult(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: null 
            });
            
            if (jsonData.length === 0) {
                setUploadResult({ success: 0, failed: 0, errors: ['No data found in file'] });
                return;
            }
            
            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1).filter((row: any) => 
                row && Array.isArray(row) && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')
            );
            
            const processedData = rows.map((row: any) => {
                const obj: any = {};
                headers.forEach((header: string, index: number) => {
                    if (header && String(header).trim()) {
                        const cleanHeader = String(header).trim().toLowerCase().replace(/\s+/g, '_');
                        obj[cleanHeader] = row[index];
                    }
                });
                return obj;
            });

            const validClients: ClientCreateData[] = [];
            const errors: string[] = [];

            processedData.forEach((row: any, index: number) => {
                const client = validateClientData(row);
                if (client) {
                    validClients.push(client);
                } else {
                    errors.push(`Row ${index + 2}: Missing required name information`);
                }
            });

            if (validClients.length === 0) {
                setUploadResult({ success: 0, failed: 0, errors: ['No valid client data found'] });
                return;
            }

            const result = await clientService.createClientsFromBulk(validClients);
            setUploadResult(result);

            if (result.success > 0) {
                setTimeout(() => {
                    onSuccess();
                    handleClose();
                }, 2000);
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            setUploadResult({ success: 0, failed: 0, errors: [error.message || 'Failed to upload file'] });
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview([]);
        setUploadResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Import Clients from File</h2>
                    <button className={styles.closeButton} onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.body}>
                    {!file ? (
                        <div className={styles.uploadArea}>
                            <div className={styles.uploadContent}>
                                <Upload size={48} className={styles.uploadIcon} />
                                <h3>Upload Excel or CSV file</h3>
                                <p>File should contain columns for client information</p>
                                <div className={styles.columnInfo}>
                                    <p>Required columns:</p>
                                    <ul>
                                        <li><strong>business_name</strong> - Required for Group type</li>
                                        <li><strong>first_name</strong> - Required for Individual type</li>
                                        <li><strong>middle_name</strong> - Optional for Individual type</li>
                                        <li><strong>last_name</strong> - Optional for Individual type</li>
                                        <li><strong>npi</strong> - Optional</li>
                                        <li><strong>type</strong> - Client type (Individual/Group)</li>
                                        <li><strong>description</strong> - Optional</li>
                                    </ul>
                                    <p style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                                        Only applicable columns are used for each client type
                                    </p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileSelect}
                                    className={styles.fileInput}
                                />
                                <button
                                    className={styles.browseButton}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Browse Files
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.previewArea}>
                            <div className={styles.fileInfo}>
                                <FileText size={20} />
                                <span>{file.name}</span>
                                <button onClick={() => fileInputRef.current?.click()}>
                                    Change File
                                </button>
                            </div>

                            {preview.length > 0 && (
                                <div className={styles.preview}>
                                    <h4>Preview (first 5 rows)</h4>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.previewTable}>
                                            <thead>
                                                <tr>
                                                    {Object.keys(preview[0]).map(key => (
                                                        <th key={key}>{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.map((row, index) => (
                                                    <tr key={index}>
                                                        {Object.values(row).map((value, cellIndex) => (
                                                            <td key={cellIndex}>{String(value)}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {uploadResult && (
                                <div className={styles.result}>
                                    <h4>Upload Result</h4>
                                    <div className={styles.resultStats}>
                                        <div className={styles.successStat}>
                                            <CheckCircle size={16} />
                                            <span>{uploadResult.success} clients created successfully</span>
                                        </div>
                                        {uploadResult.failed > 0 && (
                                            <div className={styles.errorStat}>
                                                <AlertCircle size={16} />
                                                <span>{uploadResult.failed} clients failed</span>
                                            </div>
                                        )}
                                    </div>
                                    {uploadResult.errors.length > 0 && (
                                        <div className={styles.errorList}>
                                            <h5>Errors:</h5>
                                            <ul>
                                                {uploadResult.errors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button className={styles.cancelButton} onClick={handleClose}>
                                    Cancel
                                </button>
                                <button
                                    className={styles.uploadButton}
                                    onClick={handleUpload}
                                    disabled={isUploading || uploadResult?.success !== undefined}
                                >
                                    {isUploading ? 'Uploading...' : 'Import Clients'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientImportModal;
