// import React, { useState, useRef, useCallback } from 'react';
// import {
//     X, Upload, Download, ChevronRight, ChevronLeft,
//     Building2, Shield, AlertCircle, CheckCircle2,
//     Loader2, FileText, Users, UserCheck, UserX
// } from 'lucide-react';
// import clientService from '../../../services/client.service';
// import userService from '../../../services/user.service';
// import styles from './BulkUserUploadModal.module.css';

// // ─── Types ─────────────────────────────────────────────────────────────────────
// interface BulkUserUploadModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     onSuccess: (result: { created: number; failed: number }) => void;
//     roles: Array<{ id: string; name: string }>;
//     currentUser: any;
// }

// interface ParsedRow {
//     email: string;
//     username: string;
//     first_name: string;
//     middle_name?: string;
//     last_name: string;
//     phone_country_code?: string;
//     phone_number?: string;
//     password: string;
//     role_names?: string;
//     supervisor_email?: string;
//     _rowIndex: number;
//     _errors: string[];
//     _valid: boolean;
//     [key: string]: any;
// }

// interface ClientOption {
//     id: string;
//     name: string;
//     npi?: string;
//     type?: string;
// }

// // ─── Constants ─────────────────────────────────────────────────────────────────
// const REQUIRED_FIELDS = ['email', 'username', 'first_name', 'last_name', 'password'];

// const INTERNAL_TEMPLATE_HEADERS = 'email,username,first_name,middle_name,last_name,phone_country_code,phone_number,password,role_names,supervisor_email';
// const INTERNAL_TEMPLATE_EXAMPLE = '\njohn.doe@company.com,johndoe,John,,Doe,+1,5551234567,P@ssword1!,,\njane.smith@company.com,janesmith,Jane,M,Smith,+1,5559876543,Secure#99,,';

// const CLIENT_TEMPLATE_HEADERS = 'email,username,first_name,middle_name,last_name,phone_country_code,phone_number,password';
// const CLIENT_TEMPLATE_EXAMPLE = '\nuser1@client.com,user1,Alice,,Walker,+1,5551111111,P@ssword1!\nuser2@client.com,user2,Bob,J,Carter,+1,5552222222,Secure#88';

// // ─── CSV Parser ────────────────────────────────────────────────────────────────
// function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[]; error: string | null } {
//     const lines = text.trim().split(/\r?\n/).filter(Boolean);
//     if (lines.length < 2) {
//         return { headers: [], rows: [], error: 'CSV must have a header row and at least one data row.' };
//     }
//     const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
//     const rows = lines.slice(1).map((line, i) => {
//         // Handle quoted commas
//         const values: string[] = [];
//         let cur = '', inQuote = false;
//         for (const ch of line) {
//             if (ch === '"') { inQuote = !inQuote; continue; }
//             if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; continue; }
//             cur += ch;
//         }
//         values.push(cur.trim());
//         const obj: Record<string, string> = {};
//         headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
//         obj._rowIndex = String(i + 2);
//         return obj;
//     });
//     return { headers, rows, error: null };
// }

// // ─── Validator ─────────────────────────────────────────────────────────────────
// function validateRows(rows: Record<string, string>[]): ParsedRow[] {
//     return rows.map(row => {
//         const errors: string[] = [];
//         REQUIRED_FIELDS.forEach(f => {
//             if (!row[f] || row[f].trim() === '') {
//                 errors.push(`Missing: ${f}`);
//             }
//         });
//         if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email format');
//         if (row.password && row.password.length < 8) errors.push('Password too short (min 8)');
//         if (row.password && !/[A-Z]/.test(row.password)) errors.push('Password needs uppercase');
//         if (row.password && !/[0-9]/.test(row.password)) errors.push('Password needs number');
//         if (row.password && !/[@$!%*?&^#()\[\]{}\-_=+|\\:;"'<>,./~`]/.test(row.password)) errors.push('Password needs special char');
//         return {
//             ...row,
//             _rowIndex: parseInt(row._rowIndex || '0'),
//             _errors: errors,
//             _valid: errors.length === 0
//         } as ParsedRow;
//     });
// }

// // ─── Main Component ────────────────────────────────────────────────────────────
// const BulkUserUploadModal: React.FC<BulkUserUploadModalProps> = ({
//     isOpen, onClose, onSuccess, roles, currentUser
// }) => {
//     // Step: 0 = type select, 1 = client select (if client), 2 = upload, 3 = review, 4 = done
//     const [step, setStep] = useState<number>(0);
//     const [userType, setUserType] = useState<'internal' | 'client' | null>(null);

//     // Client selection
//     const [clients, setClients] = useState<ClientOption[]>([]);
//     const [clientsLoading, setClientsLoading] = useState(false);
//     const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
//     const [clientSearch, setClientSearch] = useState('');

//     // File & parse
//     const [file, setFile] = useState<File | null>(null);
//     const [dragging, setDragging] = useState(false);
//     const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[]; error: string | null } | null>(null);
//     const [validated, setValidated] = useState<ParsedRow[] | null>(null);
//     const fileRef = useRef<HTMLInputElement>(null);

//     // Upload
//     const [uploading, setUploading] = useState(false);
//     const [uploadResult, setUploadResult] = useState<{ created: number; failed: number; failedRows: ParsedRow[]; errors: string[] } | null>(null);

//     const isClientType = userType === 'client';

//     // Steps label list
//     const steps = isClientType
//         ? ['User Type', 'Select Client', 'Upload CSV', 'Review']
//         : ['User Type', 'Upload CSV', 'Review'];

//     // Computed upload step index
//     const uploadStep = isClientType ? 2 : 1;
//     const reviewStep = isClientType ? 3 : 2;
//     const doneStep = isClientType ? 4 : 3;

//     const validCount = validated ? validated.filter(r => r._valid).length : 0;
//     const invalidCount = validated ? validated.filter(r => !r._valid).length : 0;

//     // ── Reset on close ──────────────────────────────────────────────────────────
//     const handleClose = () => {
//         setStep(0);
//         setUserType(null);
//         setSelectedClient(null);
//         setClientSearch('');
//         setClients([]);
//         setFile(null);
//         setParsed(null);
//         setValidated(null);
//         setUploading(false);
//         setUploadResult(null);
//         onClose();
//     };

//     // ── Load clients when entering client-select step ───────────────────────────
//     const loadClients = useCallback(async () => {
//         setClientsLoading(true);
//         try {
//             const data = await clientService.getVisibleClients();
//             setClients(data.map((c: any) => ({
//                 id: c.id,
//                 name: c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed',
//                 npi: c.npi,
//                 type: c.type
//             })));
//         } catch (e) {
//             console.error('Failed to load clients', e);
//         } finally {
//             setClientsLoading(false);
//         }
//     }, []);

//     // ── File handling ───────────────────────────────────────────────────────────
//     const handleFile = useCallback((f: File) => {
//         if (!f.name.endsWith('.csv')) {
//             setParsed({ headers: [], rows: [], error: 'Only .csv files are accepted.' });
//             setValidated(null);
//             return;
//         }
//         setFile(f);
//         const reader = new FileReader();
//         reader.onload = (e) => {
//             const result = parseCSV(e.target?.result as string);
//             setParsed(result);
//             if (!result.error) {
//                 setValidated(validateRows(result.rows));
//             } else {
//                 setValidated(null);
//             }
//         };
//         reader.readAsText(f);
//     }, []);

//     const onDrop = useCallback((e: React.DragEvent) => {
//         e.preventDefault();
//         setDragging(false);
//         const f = e.dataTransfer.files[0];
//         if (f) handleFile(f);
//     }, [handleFile]);

//     // ── Template download ───────────────────────────────────────────────────────
//     const downloadTemplate = () => {
//         const headers = isClientType ? CLIENT_TEMPLATE_HEADERS : INTERNAL_TEMPLATE_HEADERS;
//         const example = isClientType ? CLIENT_TEMPLATE_EXAMPLE : INTERNAL_TEMPLATE_EXAMPLE;
//         const content = headers + example;
//         const blob = new Blob([content], { type: 'text/csv' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `bulk_${userType}_users_template.csv`;
//         a.click();
//         URL.revokeObjectURL(url);
//     };

//     // ── Step navigation ─────────────────────────────────────────────────────────
//     const goNext = async () => {
//         if (step === 0 && isClientType) {
//             // Load clients before showing client step
//             await loadClients();
//         }
//         setStep(s => s + 1);
//     };

//     const goBack = () => {
//         if (step === uploadStep) {
//             // Clear file state when going back from upload
//             setFile(null);
//             setParsed(null);
//             setValidated(null);
//         }
//         setStep(s => s - 1);
//     };

//     // ── Submit ──────────────────────────────────────────────────────────────────
//     const handleSubmit = async () => {
//         if (!validated) return;
//         if (!userType) {
//     throw new Error("User type is required");
// }
//         setUploading(true);
//         try {

//             if (validated.some(r => !r._valid)) {
//                 throw new Error("Fix all invalid rows before uploading");
//                 }
//             const validRows = validated;

//             // Build payload array matching create_user shape
//             const payload = {
//                 user_type: userType,
//                 client_id: isClientType && selectedClient ? selectedClient.id : undefined,
//                 users: validRows.map(row => ({
//                     email: row.email,
//                     username: row.username,
//                     first_name: row.first_name,
//                     middle_name: row.middle_name || undefined,
//                     last_name: row.last_name,
//                     phone_country_code: row.phone_country_code || undefined,
//                     phone_number: row.phone_number || undefined,
//                     password: row.password,
//                     // Only relevant for internal users
//                     role_names: !isClientType && row.role_names
//                         ? row.role_names
//                         : undefined,

//                     supervisor_email: !isClientType && row.supervisor_email
//                         ? row.supervisor_email
//                         : undefined,
//                 }))
//             };

//             const result = await userService.bulkCreateUsers(payload);

//             const uploadRes = {
//                 created: result.created ?? validRows.length,
//                 failed: result.failed ?? 0,
//                 failedRows: result.failed_rows?.map((fr: any) => ({
//                     ...fr,
//                     _errors: [fr.error || 'Unknown error'],
//                     _valid: false,
//                     _rowIndex: fr.row_index ?? 0
//                 })) ?? [],
//                 errors: result.errors ?? []
//             };

//             setUploadResult(uploadRes);
//             setStep(doneStep);
//             onSuccess({ created: uploadRes.created, failed: uploadRes.failed });
//         } catch (err: any) {
//             console.error('Bulk upload failed', err);
//             setUploadResult({
//                 created: 0,
//                 failed: validCount,
//                 failedRows: [],
//                 errors: [err?.message || 'Upload failed. Please try again.']
//             });
//             setStep(doneStep);
//         } finally {
//             setUploading(false);
//         }
//     };

//     const filteredClients = clients.filter(c =>
//         c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
//         (c.npi && c.npi.includes(clientSearch))
//     );

//     if (!isOpen) return null;

//     // ── Render ──────────────────────────────────────────────────────────────────
//     return (
//         <div className={styles.overlay}>
//             <div className={styles.modal}>

//                 {/* Header */}
//                 <div className={styles.header}>
//                     <div className={styles.headerLeft}>
//                         <div className={styles.headerIcon}>
//                             <Upload size={18} />
//                         </div>
//                         <div>
//                             <h2 className={styles.title}>Bulk User Upload</h2>
//                             <p className={styles.subtitle}>Import multiple users via CSV</p>
//                         </div>
//                     </div>
//                     <button className={styles.closeBtn} onClick={handleClose}>
//                         <X size={18} />
//                     </button>
//                 </div>

//                 {/* Step Indicator */}
//                 {step < doneStep && (
//                     <div className={styles.stepBar}>
//                         {steps.map((label, i) => {
//                             const done = i < step;
//                             const active = i === step;
//                             return (
//                                 <React.Fragment key={i}>
//                                     <div className={`${styles.stepItem} ${active ? styles.stepActive : done ? styles.stepDone : ''}`}>
//                                         <div className={`${styles.stepDot} ${active ? styles.stepDotActive : done ? styles.stepDotDone : ''}`}>
//                                             {done ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
//                                         </div>
//                                         <span className={styles.stepLabel}>{label}</span>
//                                     </div>
//                                     {i < steps.length - 1 && (
//                                         <div className={`${styles.stepConnector} ${i < step ? styles.stepConnectorDone : ''}`} />
//                                     )}
//                                 </React.Fragment>
//                             );
//                         })}
//                     </div>
//                 )}

//                 {/* Body */}
//                 <div className={styles.body}>

//                     {/* ── STEP 0: User Type ── */}
//                     {step === 0 && (
//                         <div className={styles.section}>
//                             <p className={styles.sectionDesc}>
//                                 Choose whether you're uploading internal staff users or users linked to a specific client account.
//                             </p>
//                             <div className={styles.typeGrid}>
//                                 <button
//                                     className={`${styles.typeCard} ${userType === 'internal' ? styles.typeCardSelected : ''}`}
//                                     onClick={() => setUserType('internal')}
//                                 >
//                                     <div className={`${styles.typeCardIcon} ${userType === 'internal' ? styles.typeCardIconSelected : ''}`}>
//                                         <Shield size={24} />
//                                     </div>
//                                     <div className={styles.typeCardBody}>
//                                         <h3 className={styles.typeCardTitle}>Internal Users</h3>
//                                         <p className={styles.typeCardDesc}>
//                                             Staff, agents, supervisors or admins within your organisation. Roles and supervisors can be set via CSV columns.
//                                         </p>
//                                     </div>
//                                     <div className={`${styles.typeCardCheck} ${userType === 'internal' ? styles.typeCardCheckVisible : ''}`}>
//                                         <CheckCircle2 size={18} />
//                                     </div>
//                                 </button>

//                                 <button
//                                     className={`${styles.typeCard} ${userType === 'client' ? styles.typeCardSelected : ''}`}
//                                     onClick={() => setUserType('client')}
//                                 >
//                                     <div className={`${styles.typeCardIcon} ${userType === 'client' ? styles.typeCardIconSelected : ''}`}>
//                                         <Building2 size={24} />
//                                     </div>
//                                     <div className={styles.typeCardBody}>
//                                         <h3 className={styles.typeCardTitle}>Client Users</h3>
//                                         <p className={styles.typeCardDesc}>
//                                             Users linked to a specific client account. You'll choose the client next, then upload the CSV. <strong>CLIENT_ADMIN</strong> role is assigned automatically.
//                                         </p>
//                                     </div>
//                                     <div className={`${styles.typeCardCheck} ${userType === 'client' ? styles.typeCardCheckVisible : ''}`}>
//                                         <CheckCircle2 size={18} />
//                                     </div>
//                                 </button>
//                             </div>
//                         </div>
//                     )}

//                     {/* ── STEP 1 (client only): Select Client ── */}
//                     {isClientType && step === 1 && (
//                         <div className={styles.section}>
//                             <p className={styles.sectionDesc}>
//                                 All uploaded users will be linked to the selected client and automatically assigned the <strong>CLIENT_ADMIN</strong> role.
//                             </p>

//                             <div className={styles.searchWrap}>
//                                 <input
//                                     className={styles.searchInput}
//                                     placeholder="Search by client name or NPI..."
//                                     value={clientSearch}
//                                     onChange={e => setClientSearch(e.target.value)}
//                                     autoFocus
//                                 />
//                             </div>

//                             <div className={styles.clientList}>
//                                 {clientsLoading && (
//                                     <div className={styles.loadingRow}>
//                                         <Loader2 size={16} className={styles.spin} />
//                                         <span>Loading clients...</span>
//                                     </div>
//                                 )}
//                                 {!clientsLoading && filteredClients.length === 0 && (
//                                     <div className={styles.emptyRow}>No clients found</div>
//                                 )}
//                                 {!clientsLoading && filteredClients.map(c => (
//                                     <button
//                                         key={c.id}
//                                         className={`${styles.clientItem} ${selectedClient?.id === c.id ? styles.clientItemSelected : ''}`}
//                                         onClick={() => setSelectedClient(c)}
//                                     >
//                                         <div className={styles.clientItemLeft}>
//                                             <div className={styles.clientName}>{c.name}</div>
//                                             {c.npi && <div className={styles.clientNpi}>NPI: {c.npi}</div>}
//                                         </div>
//                                         <div className={styles.clientItemRight}>
//                                             {c.type && (
//                                                 <span className={`${styles.typeBadge} ${c.type === 'NPI2' ? styles.typeBadgeBlue : styles.typeBadgeAmber}`}>
//                                                     {c.type}
//                                                 </span>
//                                             )}
//                                             {selectedClient?.id === c.id && (
//                                                 <CheckCircle2 size={16} className={styles.clientCheckIcon} />
//                                             )}
//                                         </div>
//                                     </button>
//                                 ))}
//                             </div>

//                             {selectedClient && (
//                                 <div className={styles.selectedClientBanner}>
//                                     <CheckCircle2 size={14} />
//                                     <span>Selected: <strong>{selectedClient.name}</strong></span>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {/* ── UPLOAD step ── */}
//                     {step === uploadStep && (
//                         <div className={styles.section}>
//                             <div className={styles.uploadTopRow}>
//                                 <div>
//                                     <p className={styles.sectionDesc}>
//                                         Upload a CSV file with user data.
//                                         Don't worry about column order — just make sure required headers are present. Don't change the header names, but extra columns are fine! See the template for details.
//                                         {isClientType && selectedClient && (
//                                             <span className={styles.clientTag}> Client: <strong>{selectedClient.name}</strong></span>
//                                         )}
//                                     </p>
//                                 </div>
//                                 <button className={styles.templateBtn} onClick={downloadTemplate}>
//                                     <Download size={13} />
//                                     Download Template
//                                 </button>
//                             </div>

//                             <div
//                                 className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${file ? styles.dropzoneHasFile : ''}`}
//                                 onDragOver={e => { e.preventDefault(); setDragging(true); }}
//                                 onDragLeave={() => setDragging(false)}
//                                 onDrop={onDrop}
//                                 onClick={() => fileRef.current?.click()}
//                             >
//                                 <input
//                                     ref={fileRef}
//                                     type="file"
//                                     accept=".csv"
//                                     style={{ display: 'none' }}
//                                     onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
//                                 />
//                                 <div className={styles.dropzoneIcon}>
//                                     {file ? <FileText size={32} /> : <Upload size={32} />}
//                                 </div>
//                                 <div className={styles.dropzoneText}>
//                                     {file ? file.name : 'Drop your CSV here or click to browse'}
//                                 </div>
//                                 <div className={styles.dropzoneHint}>
//                                     {file
//                                         ? `${(file.size / 1024).toFixed(1)} KB · Click to replace`
//                                         : 'Accepts .csv files only'}
//                                 </div>
//                             </div>

//                             {/* Parse error */}
//                             {parsed?.error && (
//                                 <div className={styles.errorBox}>
//                                     <AlertCircle size={14} />
//                                     <span>{parsed.error}</span>
//                                 </div>
//                             )}
//                             {invalidCount > 0 && (
//                             <div className={styles.errorBox}>
//                                 <AlertCircle size={14} />
//                                 <span>
//                                 Fix all invalid rows before proceeding. Upload is blocked.
//                                 </span>
//                             </div>
//                             )}
//                             {/* Preview table */}
//                             {validated && !parsed?.error && (
//                                 <div className={styles.previewSection}>
//                                     <div className={styles.previewHeader}>
//                                         <span className={styles.previewTitle}>
//                                             Preview — {validated.length} row{validated.length !== 1 ? 's' : ''}
//                                         </span>
//                                         <div className={styles.badgeRow}>
//                                             <span className={styles.badgeGreen}>
//                                                 <CheckCircle2 size={11} /> {validCount} valid
//                                             </span>
//                                             {invalidCount > 0 && (
//                                                 <span className={styles.badgeRed}>
//                                                     <AlertCircle size={11} /> {invalidCount} invalid
//                                                 </span>
//                                             )}
//                                         </div>
//                                     </div>
//                                     <div className={styles.tableWrap}>
//                                         <table className={styles.previewTable}>
//                                             <thead>
//                                                 <tr>
//                                                     <th>#</th>
//                                                     {(parsed?.headers ?? []).slice(0, 5).map(h => <th key={h}>{h}</th>)}
//                                                     <th>Status</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody>
//                                                 {validated.slice(0, 10).map((row, i) => (
//                                                     <tr key={i} className={!row._valid ? styles.rowInvalid : ''}>
//                                                         <td>{row._rowIndex}</td>
//                                                         {(parsed?.headers ?? []).slice(0, 5).map(h => (
//                                                             <td key={h} className={!row._valid && !row[h] ? styles.cellMissing : ''}>
//                                                                 {row[h] || <span className={styles.emptyCell}>—</span>}
//                                                             </td>
//                                                         ))}
//                                                         <td>
//                                                             {row._valid
//                                                                 ? <span className={styles.badgeGreen}><CheckCircle2 size={11} /> Valid</span>
//                                                                 : <span className={styles.badgeRed} title={row._errors.join(', ')}><AlertCircle size={11} /> {row._errors[0]}</span>}
//                                                         </td>
//                                                     </tr>
//                                                 ))}
//                                             </tbody>
//                                         </table>
//                                         {validated.length > 10 && (
//                                             <div className={styles.moreRows}>+{validated.length - 10} more rows not shown</div>
//                                         )}
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {/* ── REVIEW step ── */}
//                     {step === reviewStep && validated && (
//                         <div className={styles.section}>
//                             <p className={styles.sectionDesc}>Review the summary below. Only valid rows will be uploaded.</p>

//                             <div className={styles.summaryCards}>
//                                 <div className={styles.summaryCard}>
//                                     <Users size={20} className={styles.summaryIcon} />
//                                     <div className={styles.summaryValue}>{validated.length}</div>
//                                     <div className={styles.summaryLabel}>Total Rows</div>
//                                 </div>
//                                 <div className={`${styles.summaryCard} ${styles.summaryCardGreen}`}>
//                                     <UserCheck size={20} className={styles.summaryIconGreen} />
//                                     <div className={styles.summaryValue}>{validCount}</div>
//                                     <div className={styles.summaryLabel}>Will Upload</div>
//                                 </div>
//                                 <div className={`${styles.summaryCard} ${invalidCount > 0 ? styles.summaryCardRed : ''}`}>
//                                     <UserX size={20} className={invalidCount > 0 ? styles.summaryIconRed : styles.summaryIcon} />
//                                     <div className={styles.summaryValue}>{invalidCount}</div>
//                                     <div className={styles.summaryLabel}>Will Skip</div>
//                                 </div>
//                             </div>

//                             <div className={styles.targetBox}>
//                                 <div className={styles.targetRow}>
//                                     <span className={styles.targetKey}>Type</span>
//                                     <span className={styles.targetVal}>
//                                         {isClientType
//                                             ? <><Building2 size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Client Users</>
//                                             : <><Shield size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Internal Users</>}
//                                     </span>
//                                 </div>
//                                 {isClientType && selectedClient && (
//                                     <div className={styles.targetRow}>
//                                         <span className={styles.targetKey}>Client</span>
//                                         <span className={styles.targetVal}>{selectedClient.name}</span>
//                                     </div>
//                                 )}
//                                 <div className={styles.targetRow}>
//                                     <span className={styles.targetKey}>File</span>
//                                     <span className={styles.targetVal}>{file?.name}</span>
//                                 </div>
//                                 {isClientType && (
//                                     <div className={styles.targetRow}>
//                                         <span className={styles.targetKey}>Auto Role</span>
//                                         <span className={`${styles.targetVal} ${styles.targetValAccent}`}>CLIENT_ADMIN</span>
//                                     </div>
//                                 )}
//                             </div>

//                             {invalidCount > 0 && (
//                                 <div className={styles.warningBox}>
//                                     <AlertCircle size={14} />
//                                     <div>
//                                         <strong>{invalidCount} row{invalidCount !== 1 ? 's' : ''} will be skipped</strong>
//                                         <div className={styles.warningList}>
//                                             {validated.filter(r => !r._valid).slice(0, 4).map((r, i) => (
//                                                 <div key={i} className={styles.warningItem}>
//                                                     Row {r._rowIndex} ({r.email || 'no email'}): {r._errors.join(', ')}
//                                                 </div>
//                                             ))}
//                                             {invalidCount > 4 && <div className={styles.warningItem}>…and {invalidCount - 4} more</div>}
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}

//                             {uploading && (
//                                 <div className={styles.uploadingRow}>
//                                     <Loader2 size={16} className={styles.spin} />
//                                     <span>Uploading {validCount} users, please wait…</span>
//                                 </div>
//                             )}
//                         </div>
//                     )}

//                     {/* ── DONE ── */}
//                     {step === doneStep && uploadResult && (
//                         <div className={styles.doneSection}>
//                             <div className={`${styles.doneIcon} ${uploadResult.failed === 0 ? styles.doneIconSuccess : styles.doneIconWarning}`}>
//                                 {uploadResult.failed === 0 ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
//                             </div>
//                             <h3 className={styles.doneTitle}>
//                                 {uploadResult.failed === 0 ? 'All users uploaded!' : 'Upload complete'}
//                             </h3>
//                             <p className={styles.doneSubtitle}>
//                                 {uploadResult.created} user{uploadResult.created !== 1 ? 's' : ''} created successfully
//                                 {uploadResult.failed > 0 ? `, ${uploadResult.failed} skipped` : ''}.
//                             </p>

//                             <div className={styles.doneSummaryCards}>
//                                 <div className={`${styles.summaryCard} ${styles.summaryCardGreen}`}>
//                                     <UserCheck size={20} className={styles.summaryIconGreen} />
//                                     <div className={styles.summaryValue}>{uploadResult.created}</div>
//                                     <div className={styles.summaryLabel}>Created</div>
//                                 </div>
//                                 {uploadResult.failed > 0 && (
//                                     <div className={`${styles.summaryCard} ${styles.summaryCardRed}`}>
//                                         <UserX size={20} className={styles.summaryIconRed} />
//                                         <div className={styles.summaryValue}>{uploadResult.failed}</div>
//                                         <div className={styles.summaryLabel}>Skipped</div>
//                                     </div>
//                                 )}
//                             </div>

//                             {uploadResult.errors.length > 0 && (
//                                 <div className={styles.errorBox} style={{ marginTop: 16 }}>
//                                     <AlertCircle size={14} />
//                                     <span>{uploadResult.errors[0]}</span>
//                                 </div>
//                             )}

//                             {uploadResult.failedRows.length > 0 && (
//                                 <div className={styles.warningBox} style={{ marginTop: 12 }}>
//                                     <AlertCircle size={14} />
//                                     <div>
//                                         <strong>Skipped rows</strong>
//                                         <div className={styles.warningList}>
//                                             {uploadResult.failedRows.slice(0, 5).map((r, i) => (
//                                                 <div key={i} className={styles.warningItem}>
//                                                     {r.email || `Row ${r._rowIndex}`}: {r._errors.join(', ')}
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                     )}
//                 </div>

//                 {/* Footer */}
//                 <div className={styles.footer}>
//                     <div>
//                         {step === doneStep ? (
//                             <button className={styles.btnSecondary} onClick={handleClose}>Close</button>
//                         ) : step > 0 ? (
//                             <button className={styles.btnSecondary} onClick={goBack} disabled={uploading}>
//                                 <ChevronLeft size={15} /> Back
//                             </button>
//                         ) : (
//                             <button className={styles.btnSecondary} onClick={handleClose}>Cancel</button>
//                         )}
//                     </div>

//                     <div className={styles.footerRight}>
//                         {/* Step 0 → next */}
//                         {step === 0 && (
//                             <button
//                                 className={styles.btnPrimary}
//                                 disabled={!userType}
//                                 onClick={goNext}
//                             >
//                                 Continue <ChevronRight size={15} />
//                             </button>
//                         )}

//                         {/* Client selection → next */}
//                         {isClientType && step === 1 && (
//                             <button
//                                 className={styles.btnPrimary}
//                                 disabled={!selectedClient}
//                                 onClick={goNext}
//                             >
//                                 Continue <ChevronRight size={15} />
//                             </button>
//                         )}

//                         {/* Upload step → review */}
//                         {step === uploadStep && (
//                             <button
//                                 className={styles.btnPrimary}
//                                 disabled={
//                                     !validated ||
//                                     !!parsed?.error ||
//                                     validCount === 0 ||
//                                     invalidCount > 0   // 🔥 THIS LINE
//                                     }
//                                 onClick={goNext}
//                             >
//                                 Review ({validCount}) <ChevronRight size={15} />
//                             </button>
//                         )}

//                         {/* Review → submit */}
//                         {step === reviewStep && (
//                             <button
//                                 className={styles.btnSuccess}
//                                 disabled={uploading || validCount === 0}
//                                 onClick={handleSubmit}
//                             >
//                                 {uploading
//                                     ? <><Loader2 size={14} className={styles.spin} /> Uploading…</>
//                                     : <><Upload size={14} /> Upload {validCount} User{validCount !== 1 ? 's' : ''}</>}
//                             </button>
//                         )}

//                         {/* Done → upload another */}
//                         {step === doneStep && (
//                             <button
//                                 className={styles.btnPrimary}
//                                 onClick={() => {
//                                     setStep(0); setUserType(null); setSelectedClient(null);
//                                     setClientSearch(''); setFile(null); setParsed(null);
//                                     setValidated(null); setUploadResult(null);
//                                 }}
//                             >
//                                 Upload Another
//                             </button>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default BulkUserUploadModal;
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    X, Upload, Download, ChevronRight, ChevronLeft,
    Building2, Shield, AlertCircle, CheckCircle2,
    Loader2, FileText, Users, UserCheck, UserX, Clock, RefreshCw,
} from 'lucide-react';
import clientService from '../../../services/client.service';
import userService from '../../../services/user.service';
import styles from './BulkUserUploadModal.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface BulkUserUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: { created: number; failed: number }) => void;
    roles: Array<{ id: string; name: string }>;
    currentUser: any;
}

interface ParsedRow {
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    phone_country_code?: string;
    phone_number?: string;
    password: string;
    role_names?: string;
    supervisor_email?: string;
    _rowIndex: number;
    _errors: string[];
    _valid: boolean;
    [key: string]: any;
}

interface ClientOption {
    id: string;
    name: string;
    npi?: string;
    type?: string;
}

interface HistoryItem {
    id: string;
    created_at: string;
    original_filename: string;
    file_size_bytes: number | null;
    user_type: string;
    client_id: string | null;
    client_name: string | null;
    s3_key: string | null;
    status: 'pending' | 'uploaded' | 'processing' | 'completed' | 'failed';
    total_rows: number | null;
    success_count: number | null;
    failed_count: number | null;
    errors: string[] | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = ['email', 'username', 'first_name', 'last_name', 'password'];

const INTERNAL_TEMPLATE_HEADERS = 'email,username,first_name,middle_name,last_name,phone_country_code,phone_number,password,role_names,supervisor_email';
const INTERNAL_TEMPLATE_EXAMPLE = '\njohn.doe@company.com,johndoe,John,,Doe,+1,5551234567,P@ssword1!,,\njane.smith@company.com,janesmith,Jane,M,Smith,+1,5559876543,Secure#99,,';

const CLIENT_TEMPLATE_HEADERS = 'email,username,first_name,middle_name,last_name,phone_country_code,phone_number,password';
const CLIENT_TEMPLATE_EXAMPLE = '\nuser1@client.com,user1,Alice,,Walker,+1,5551111111,P@ssword1!\nuser2@client.com,user2,Bob,J,Carter,+1,5552222222,Secure#88';

// ─── History helpers ────────────────────────────────────────────────────────────
const STATUS_META: Record<HistoryItem['status'], { label: string; color: string }> = {
    pending:    { label: 'Pending',    color: '#888' },
    uploaded:   { label: 'Uploaded',   color: '#3B82F6' },
    processing: { label: 'Processing', color: '#F59E0B' },
    completed:  { label: 'Completed',  color: '#10B981' },
    failed:     { label: 'Failed',     color: '#EF4444' },
};

function fmtBytes(b: number | null) {
    if (!b) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ─── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[]; error: string | null } {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
        return { headers: [], rows: [], error: 'CSV must have a header row and at least one data row.' };
    }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line, i) => {
        const values: string[] = [];
        let cur = '', inQuote = false;
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; continue; }
            if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; continue; }
            cur += ch;
        }
        values.push(cur.trim());
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
        obj._rowIndex = String(i + 2);
        return obj;
    });
    return { headers, rows, error: null };
}

// ─── Validator ─────────────────────────────────────────────────────────────────
function validateRows(rows: Record<string, string>[]): ParsedRow[] {
    return rows.map(row => {
        const errors: string[] = [];
        REQUIRED_FIELDS.forEach(f => {
            if (!row[f] || row[f].trim() === '') errors.push(`Missing: ${f}`);
        });
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email format');
        if (row.password && row.password.length < 8) errors.push('Password too short (min 8)');
        if (row.password && !/[A-Z]/.test(row.password)) errors.push('Password needs uppercase');
        if (row.password && !/[0-9]/.test(row.password)) errors.push('Password needs number');
        if (row.password && !/[@$!%*?&^#()\[\]{}\-_=+|\\:;"'<>,./~`]/.test(row.password)) errors.push('Password needs special char');
        return { ...row, _rowIndex: parseInt(row._rowIndex || '0'), _errors: errors, _valid: errors.length === 0 } as ParsedRow;
    });
}

// ─── Main Component ────────────────────────────────────────────────────────────
const BulkUserUploadModal: React.FC<BulkUserUploadModalProps> = ({
    isOpen, onClose, onSuccess, roles, currentUser
}) => {
    // ── Tab ───────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

    // ── Upload flow ───────────────────────────────────────────────────────────
    const [step, setStep]               = useState<number>(0);
    const [userType, setUserType]       = useState<'internal' | 'client' | null>(null);
    const [clients, setClients]         = useState<ClientOption[]>([]);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
    const [clientSearch, setClientSearch]     = useState('');
    const [file, setFile]               = useState<File | null>(null);
    const [dragging, setDragging]       = useState(false);
    const [parsed, setParsed]           = useState<{ headers: string[]; rows: Record<string, string>[]; error: string | null } | null>(null);
    const [validated, setValidated]     = useState<ParsedRow[] | null>(null);
    const [uploading, setUploading]     = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [uploadResult, setUploadResult] = useState<{ created: number; failed: number; failedRows: ParsedRow[]; errors: string[] } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // ── History ───────────────────────────────────────────────────────────────
    const [history, setHistory]           = useState<HistoryItem[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [expandedId, setExpandedId]     = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const isClientType = userType === 'client';

    const steps = isClientType
        ? ['User Type', 'Select Client', 'Upload CSV', 'Review']
        : ['User Type', 'Upload CSV', 'Review'];

    const uploadStep = isClientType ? 2 : 1;
    const reviewStep = isClientType ? 3 : 2;
    const doneStep   = isClientType ? 4 : 3;

    const validCount   = validated ? validated.filter(r => r._valid).length : 0;
    const invalidCount = validated ? validated.filter(r => !r._valid).length : 0;

    // ── Load history ──────────────────────────────────────────────────────────
    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const data = await userService.getUserImportHistory();
            setHistory(data.items ?? []);
            setHistoryTotal(data.total ?? 0);
        } catch (e: any) {
            setHistoryError(e?.message ?? 'Failed to load history.');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen && activeTab === 'history') loadHistory();
    }, [isOpen, activeTab, loadHistory]);

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetUpload = () => {
        setStep(0); setUserType(null); setSelectedClient(null); setClientSearch('');
        setClients([]); setFile(null); setParsed(null); setValidated(null);
        setUploading(false); setUploadProgress(null); setUploadResult(null);
    };

    const handleClose = () => { resetUpload(); setActiveTab('upload'); onClose(); };

    // ── Load clients ──────────────────────────────────────────────────────────
    const loadClients = useCallback(async () => {
        setClientsLoading(true);
        try {
            const data = await clientService.getVisibleClients();
            setClients(data.map((c: any) => ({
                id: c.id,
                name: c.business_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed',
                npi: c.npi, type: c.type,
            })));
        } catch (e) { console.error('Failed to load clients', e); }
        finally { setClientsLoading(false); }
    }, []);

    // ── File handling ─────────────────────────────────────────────────────────
    const handleFile = useCallback((f: File) => {
        if (!f.name.endsWith('.csv')) {
            setParsed({ headers: [], rows: [], error: 'Only .csv files are accepted.' });
            setValidated(null); return;
        }
        setFile(f);
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = parseCSV(e.target?.result as string);
            setParsed(result);
            setValidated(result.error ? null : validateRows(result.rows));
        };
        reader.readAsText(f);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0]; if (f) handleFile(f);
    }, [handleFile]);

    // ── Template download ─────────────────────────────────────────────────────
    const downloadTemplate = () => {
        const headers = isClientType ? CLIENT_TEMPLATE_HEADERS : INTERNAL_TEMPLATE_HEADERS;
        const example = isClientType ? CLIENT_TEMPLATE_EXAMPLE : INTERNAL_TEMPLATE_EXAMPLE;
        const blob = new Blob([headers + example], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `bulk_${userType}_users_template.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // ── Navigation ────────────────────────────────────────────────────────────
    const goNext = async () => {
        if (step === 0 && isClientType) await loadClients();
        setStep(s => s + 1);
    };
    const goBack = () => {
        if (step === uploadStep) { setFile(null); setParsed(null); setValidated(null); }
        setStep(s => s - 1);
    };

    // ── Submit: S3 upload first, then bulk create ─────────────────────────────
    const handleSubmit = async () => {
        if (!validated || !userType) return;
        if (validated.some(r => !r._valid)) return;

        setUploading(true);
        setUploadProgress('Uploading file to S3…');
        let historyId: string | null = null;

        try {
            // Step 1 – upload file to S3 via backend
            if (file) {
                const uploadResp = await userService.uploadUserImportFile(
                    file,
                    userType,
                    isClientType && selectedClient ? selectedClient.id   : undefined,
                    isClientType && selectedClient ? selectedClient.name : undefined,
                );
                historyId = uploadResp.history_id;
            }

            setUploadProgress('Creating users…');

            // Step 2 – bulk create
            const payload = {
                user_type: userType,
                client_id: isClientType && selectedClient ? selectedClient.id : undefined,
                users: validated.map(row => ({
                    email: row.email, username: row.username,
                    first_name: row.first_name, middle_name: row.middle_name || undefined,
                    last_name: row.last_name,
                    phone_country_code: row.phone_country_code || undefined,
                    phone_number: row.phone_number || undefined,
                    password: row.password,
                    role_names:       !isClientType && row.role_names       ? row.role_names       : undefined,
                    supervisor_email: !isClientType && row.supervisor_email ? row.supervisor_email : undefined,
                })),
            };

            const result = await userService.bulkCreateUsers(payload);

            const uploadRes = {
                created:    result.created ?? validated.length,
                failed:     result.failed  ?? 0,
                failedRows: result.failed_rows?.map((fr: any) => ({
                    ...fr,
                    _errors: [fr.error || 'Unknown error'],
                    _valid: false,
                    _rowIndex: fr.row_index ?? 0,
                })) ?? [],
                errors: result.errors ?? [],
            };

            // Step 3 – patch history record
            if (historyId) {
                await userService.patchUserImportOutcome(historyId, {
                    status:        uploadRes.failed > 0 && uploadRes.created === 0 ? 'failed' : 'completed',
                    total_rows:    uploadRes.created + uploadRes.failed,
                    success_count: uploadRes.created,
                    failed_count:  uploadRes.failed,
                    errors:        uploadRes.errors,
                });
            }

            setUploadResult(uploadRes);
            setStep(doneStep);
            onSuccess({ created: uploadRes.created, failed: uploadRes.failed });

        } catch (err: any) {
            console.error('Bulk upload failed', err);
            if (historyId) {
                userService.patchUserImportOutcome(historyId, {
                    status: 'failed', total_rows: 0,
                    success_count: 0, failed_count: validCount,
                    errors: [err?.message ?? 'Unknown error'],
                }).catch(() => {});
            }
            setUploadResult({ created: 0, failed: validCount, failedRows: [], errors: [err?.message || 'Upload failed.'] });
            setStep(doneStep);
        } finally {
            setUploading(false); setUploadProgress(null);
        }
    };

    // ── History: download ─────────────────────────────────────────────────────
    // const handleDownload = async (id: string) => {
    //     setDownloadingId(id);
    //     try {
    //         const data = await userService.getUserImportDownloadUrl(id);
    //         window.open(data.download_url, '_blank');
    //     } catch { alert('Could not generate download link.'); }
    //     finally { setDownloadingId(null); }
    // };
const handleDownload = async (id: string) => {
  try {
    setDownloadingId(id);

    const res = await userService.getUserImportDownloadUrl(id);

    const link = document.createElement("a");
    link.href = res.download_url;
    link.download = "";
    link.click();

  } catch (err) {
    console.error("Download failed", err);
  } finally {
    setDownloadingId(null);
  }
};

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.npi && c.npi.includes(clientSearch))
    );

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.headerIcon}><Upload size={18} /></div>
                        <div>
                            <h2 className={styles.title}>Bulk User Upload</h2>
                            <p className={styles.subtitle}>Import multiple users via CSV</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={handleClose}><X size={18} /></button>
                </div>

                {/* ── Tab bar ────────────────────────────────────────────── */}
                <div className={styles.tabBar}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('upload')}
                    >
                        <Upload size={13} /> Upload
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : ''}`}
                        onClick={() => { setActiveTab('history'); loadHistory(); }}
                    >
                        <Clock size={13} /> History
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className={styles.body}>

                    {/* ══════════ UPLOAD TAB ══════════ */}
                    {activeTab === 'upload' && (
                        <>
                            {/* Step indicator */}
                            {step < doneStep && (
                                <div className={styles.stepBar}>
                                    {steps.map((label, i) => {
                                        const done = i < step, active = i === step;
                                        return (
                                            <React.Fragment key={i}>
                                                <div className={`${styles.stepItem} ${active ? styles.stepActive : done ? styles.stepDone : ''}`}>
                                                    <div className={`${styles.stepDot} ${active ? styles.stepDotActive : done ? styles.stepDotDone : ''}`}>
                                                        {done ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                                                    </div>
                                                    <span className={styles.stepLabel}>{label}</span>
                                                </div>
                                                {i < steps.length - 1 && (
                                                    <div className={`${styles.stepConnector} ${i < step ? styles.stepConnectorDone : ''}`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}

                            {/* STEP 0 – user type */}
                            {step === 0 && (
                                <div className={styles.section}>
                                    <p className={styles.sectionDesc}>Choose whether you're uploading internal staff users or users linked to a specific client account.</p>
                                    <div className={styles.typeGrid}>
                                        <button className={`${styles.typeCard} ${userType === 'internal' ? styles.typeCardSelected : ''}`} onClick={() => setUserType('internal')}>
                                            <div className={`${styles.typeCardIcon} ${userType === 'internal' ? styles.typeCardIconSelected : ''}`}><Shield size={24} /></div>
                                            <div className={styles.typeCardBody}>
                                                <h3 className={styles.typeCardTitle}>Internal Users</h3>
                                                <p className={styles.typeCardDesc}>Staff, agents, supervisors or admins within your organisation. Roles and supervisors can be set via CSV columns.</p>
                                            </div>
                                            <div className={`${styles.typeCardCheck} ${userType === 'internal' ? styles.typeCardCheckVisible : ''}`}><CheckCircle2 size={18} /></div>
                                        </button>
                                        <button className={`${styles.typeCard} ${userType === 'client' ? styles.typeCardSelected : ''}`} onClick={() => setUserType('client')}>
                                            <div className={`${styles.typeCardIcon} ${userType === 'client' ? styles.typeCardIconSelected : ''}`}><Building2 size={24} /></div>
                                            <div className={styles.typeCardBody}>
                                                <h3 className={styles.typeCardTitle}>Client Users</h3>
                                                <p className={styles.typeCardDesc}>Users linked to a specific client account. You'll choose the client next. <strong>CLIENT_ADMIN</strong> role is assigned automatically.</p>
                                            </div>
                                            <div className={`${styles.typeCardCheck} ${userType === 'client' ? styles.typeCardCheckVisible : ''}`}><CheckCircle2 size={18} /></div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 1 (client only) – select client */}
                            {isClientType && step === 1 && (
                                <div className={styles.section}>
                                    <p className={styles.sectionDesc}>All uploaded users will be linked to the selected client and automatically assigned the <strong>CLIENT_ADMIN</strong> role.</p>
                                    <div className={styles.searchWrap}>
                                        <input className={styles.searchInput} placeholder="Search by client name or NPI..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} autoFocus />
                                    </div>
                                    <div className={styles.clientList}>
                                        {clientsLoading && <div className={styles.loadingRow}><Loader2 size={16} className={styles.spin} /><span>Loading clients...</span></div>}
                                        {!clientsLoading && filteredClients.length === 0 && <div className={styles.emptyRow}>No clients found</div>}
                                        {!clientsLoading && filteredClients.map(c => (
                                            <button key={c.id} className={`${styles.clientItem} ${selectedClient?.id === c.id ? styles.clientItemSelected : ''}`} onClick={() => setSelectedClient(c)}>
                                                <div className={styles.clientItemLeft}>
                                                    <div className={styles.clientName}>{c.name}</div>
                                                    {c.npi && <div className={styles.clientNpi}>NPI: {c.npi}</div>}
                                                </div>
                                                <div className={styles.clientItemRight}>
                                                    {c.type && <span className={`${styles.typeBadge} ${c.type === 'NPI2' ? styles.typeBadgeBlue : styles.typeBadgeAmber}`}>{c.type}</span>}
                                                    {selectedClient?.id === c.id && <CheckCircle2 size={16} className={styles.clientCheckIcon} />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {selectedClient && (
                                        <div className={styles.selectedClientBanner}><CheckCircle2 size={14} /><span>Selected: <strong>{selectedClient.name}</strong></span></div>
                                    )}
                                </div>
                            )}

                            {/* UPLOAD step */}
                            {step === uploadStep && (
                                <div className={styles.section}>
                                    <div className={styles.uploadTopRow}>
                                        <p className={styles.sectionDesc}>
                                            Upload a CSV file with user data. Required headers must be present; extra columns are fine.
                                            {isClientType && selectedClient && <span className={styles.clientTag}> Client: <strong>{selectedClient.name}</strong></span>}
                                        </p>
                                        <button className={styles.templateBtn} onClick={downloadTemplate}><Download size={13} /> Download Template</button>
                                    </div>
                                    <div
                                        className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''} ${file ? styles.dropzoneHasFile : ''}`}
                                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={onDrop}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                                        <div className={styles.dropzoneIcon}>{file ? <FileText size={32} /> : <Upload size={32} />}</div>
                                        <div className={styles.dropzoneText}>{file ? file.name : 'Drop your CSV here or click to browse'}</div>
                                        <div className={styles.dropzoneHint}>{file ? `${(file.size / 1024).toFixed(1)} KB · Click to replace` : 'Accepts .csv files only'}</div>
                                    </div>
                                    {parsed?.error && <div className={styles.errorBox}><AlertCircle size={14} /><span>{parsed.error}</span></div>}
                                    {invalidCount > 0 && <div className={styles.errorBox}><AlertCircle size={14} /><span>Fix all invalid rows before proceeding. Upload is blocked.</span></div>}
                                    {validated && !parsed?.error && (
                                        <div className={styles.previewSection}>
                                            <div className={styles.previewHeader}>
                                                <span className={styles.previewTitle}>Preview — {validated.length} row{validated.length !== 1 ? 's' : ''}</span>
                                                <div className={styles.badgeRow}>
                                                    <span className={styles.badgeGreen}><CheckCircle2 size={11} /> {validCount} valid</span>
                                                    {invalidCount > 0 && <span className={styles.badgeRed}><AlertCircle size={11} /> {invalidCount} invalid</span>}
                                                </div>
                                            </div>
                                            <div className={styles.tableWrap}>
                                                <table className={styles.previewTable}>
                                                    <thead><tr><th>#</th>{(parsed?.headers ?? []).slice(0, 5).map(h => <th key={h}>{h}</th>)}<th>Status</th></tr></thead>
                                                    <tbody>
                                                        {validated.slice(0, 10).map((row, i) => (
                                                            <tr key={i} className={!row._valid ? styles.rowInvalid : ''}>
                                                                <td>{row._rowIndex}</td>
                                                                {(parsed?.headers ?? []).slice(0, 5).map(h => (
                                                                    <td key={h} className={!row._valid && !row[h] ? styles.cellMissing : ''}>{row[h] || <span className={styles.emptyCell}>—</span>}</td>
                                                                ))}
                                                                <td>{row._valid ? <span className={styles.badgeGreen}><CheckCircle2 size={11} /> Valid</span> : <span className={styles.badgeRed} title={row._errors.join(', ')}><AlertCircle size={11} /> {row._errors[0]}</span>}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {validated.length > 10 && <div className={styles.moreRows}>+{validated.length - 10} more rows not shown</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* REVIEW step */}
                            {step === reviewStep && validated && (
                                <div className={styles.section}>
                                    <p className={styles.sectionDesc}>Review the summary below. Only valid rows will be uploaded.</p>
                                    <div className={styles.summaryCards}>
                                        <div className={styles.summaryCard}><Users size={20} className={styles.summaryIcon} /><div className={styles.summaryValue}>{validated.length}</div><div className={styles.summaryLabel}>Total Rows</div></div>
                                        <div className={`${styles.summaryCard} ${styles.summaryCardGreen}`}><UserCheck size={20} className={styles.summaryIconGreen} /><div className={styles.summaryValue}>{validCount}</div><div className={styles.summaryLabel}>Will Upload</div></div>
                                        <div className={`${styles.summaryCard} ${invalidCount > 0 ? styles.summaryCardRed : ''}`}><UserX size={20} className={invalidCount > 0 ? styles.summaryIconRed : styles.summaryIcon} /><div className={styles.summaryValue}>{invalidCount}</div><div className={styles.summaryLabel}>Will Skip</div></div>
                                    </div>
                                    <div className={styles.targetBox}>
                                        <div className={styles.targetRow}><span className={styles.targetKey}>Type</span><span className={styles.targetVal}>{isClientType ? <><Building2 size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Client Users</> : <><Shield size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Internal Users</>}</span></div>
                                        {isClientType && selectedClient && <div className={styles.targetRow}><span className={styles.targetKey}>Client</span><span className={styles.targetVal}>{selectedClient.name}</span></div>}
                                        <div className={styles.targetRow}><span className={styles.targetKey}>File</span><span className={styles.targetVal}>{file?.name}</span></div>
                                        {isClientType && <div className={styles.targetRow}><span className={styles.targetKey}>Auto Role</span><span className={`${styles.targetVal} ${styles.targetValAccent}`}>CLIENT_ADMIN</span></div>}
                                    </div>
                                    {invalidCount > 0 && (
                                        <div className={styles.warningBox}><AlertCircle size={14} /><div><strong>{invalidCount} row{invalidCount !== 1 ? 's' : ''} will be skipped</strong><div className={styles.warningList}>{validated.filter(r => !r._valid).slice(0, 4).map((r, i) => <div key={i} className={styles.warningItem}>Row {r._rowIndex} ({r.email || 'no email'}): {r._errors.join(', ')}</div>)}{invalidCount > 4 && <div className={styles.warningItem}>…and {invalidCount - 4} more</div>}</div></div></div>
                                    )}
                                    {uploading && (
                                        <div className={styles.uploadingRow}>
                                            <Loader2 size={16} className={styles.spin} />
                                            <span>{uploadProgress ?? `Uploading ${validCount} users…`}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DONE step */}
                            {step === doneStep && uploadResult && (
                                <div className={styles.doneSection}>
                                    <div className={`${styles.doneIcon} ${uploadResult.failed === 0 ? styles.doneIconSuccess : styles.doneIconWarning}`}>
                                        {uploadResult.failed === 0 ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
                                    </div>
                                    <h3 className={styles.doneTitle}>{uploadResult.failed === 0 ? 'All users uploaded!' : 'Upload complete'}</h3>
                                    <p className={styles.doneSubtitle}>{uploadResult.created} user{uploadResult.created !== 1 ? 's' : ''} created successfully{uploadResult.failed > 0 ? `, ${uploadResult.failed} skipped` : ''}.</p>
                                    <div className={styles.doneSummaryCards}>
                                        <div className={`${styles.summaryCard} ${styles.summaryCardGreen}`}><UserCheck size={20} className={styles.summaryIconGreen} /><div className={styles.summaryValue}>{uploadResult.created}</div><div className={styles.summaryLabel}>Created</div></div>
                                        {uploadResult.failed > 0 && <div className={`${styles.summaryCard} ${styles.summaryCardRed}`}><UserX size={20} className={styles.summaryIconRed} /><div className={styles.summaryValue}>{uploadResult.failed}</div><div className={styles.summaryLabel}>Skipped</div></div>}
                                    </div>
                                    {uploadResult.errors.length > 0 && <div className={styles.errorBox} style={{ marginTop: 16 }}><AlertCircle size={14} /><span>{uploadResult.errors[0]}</span></div>}
                                    {uploadResult.failedRows.length > 0 && (
                                        <div className={styles.warningBox} style={{ marginTop: 12 }}><AlertCircle size={14} /><div><strong>Skipped rows</strong><div className={styles.warningList}>{uploadResult.failedRows.slice(0, 5).map((r, i) => <div key={i} className={styles.warningItem}>{r.email || `Row ${r._rowIndex}`}: {r._errors.join(', ')}</div>)}</div></div></div>
                                    )}
                                    <button className={styles.viewHistoryBtn} onClick={() => { setActiveTab('history'); loadHistory(); }}>
                                        <Clock size={14} /> View in history
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* ══════════ HISTORY TAB ══════════ */}
                    {activeTab === 'history' && (
                        <div className={styles.historyPanel}>
                            <div className={styles.historyToolbar}>
                                <span className={styles.historyCount}>{historyTotal} import{historyTotal !== 1 ? 's' : ''}</span>
                                <button className={styles.refreshBtn} onClick={loadHistory} disabled={historyLoading}>
                                    <RefreshCw size={14} className={historyLoading ? styles.spinning : ''} /> Refresh
                                </button>
                            </div>
                            {historyError && <div className={styles.errorBox} style={{ marginBottom: 12 }}><AlertCircle size={15} /><span>{historyError}</span></div>}
                            {historyLoading && !history.length ? (
                                <div className={styles.historyEmpty}>Loading…</div>
                            ) : !history.length ? (
                                <div className={styles.historyEmpty}>
                                    <Clock size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                                    <p>No imports yet. Start your first upload from the Upload tab.</p>
                                </div>
                            ) : (
                                <div className={styles.historyList}>
                                    {history.map(item => {
                                        const meta = STATUS_META[item.status] ?? STATUS_META.pending;
                                        const isExpanded = expandedId === item.id;
                                        return (
                                            <div key={item.id} className={styles.historyCard}>
                                                <div className={styles.historyCardHeader} onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                                                    <div className={styles.historyCardLeft}>
                                                        <FileText size={16} className={styles.historyFileIcon} />
                                                        <div>
                                                            <span
  style={{
    color: "#2563eb",
    cursor: "pointer",
    textDecoration: "underline"
  }}
  onClick={() => handleDownload(item.id)}
>
  {item.original_filename}
</span>
                                                            <div className={styles.historyMeta}>
                                                                {item.user_type === 'client' ? 'Client' : 'Internal'}
                                                                {item.client_name ? ` · ${item.client_name}` : ''}
                                                                {' · '}{fmtBytes(item.file_size_bytes)}
                                                                {' · '}{fmtDate(item.created_at)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.historyCardRight}>
                                                        <span className={styles.statusBadge} style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
                                                        {item.s3_key && (
                                                            // <button
                                                            //     className={styles.downloadBtn}
                                                            //     disabled={downloadingId === item.id}
                                                            //     onClick={e => { e.stopPropagation(); handleDownload(item.id); }}
                                                            //     title="Download original file"
                                                            // >
                                                            //     <Download size={14} />
                                                            // </button>
                                                                 <button
                                                              onClick={() => handleDownload(item.id)}
                                                              disabled={downloadingId === item.id}
                                                              style={{
                                                                marginLeft: "8px",
                                                                cursor: "pointer",
                                                                border: "none",
                                                                background: "transparent"
                                                              }}
                                                            >
                                                              <Download size={16} />
                                                            </button>
                                                        )}
                                                        <ChevronRight size={14} className={`${styles.expandChevron} ${isExpanded ? styles.expanded : ''}`} />
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className={styles.historyCardBody}>
                                                        {item.total_rows != null && (
                                                            <div className={styles.outcomeSummary}>
                                                                <span className={styles.outcomeSuccess}>✓ {item.success_count ?? 0} succeeded</span>
                                                                <span className={styles.outcomeFailed}>✗ {item.failed_count ?? 0} failed</span>
                                                                <span className={styles.outcomeTotal}>of {item.total_rows} total</span>
                                                            </div>
                                                        )}
                                                        {item.errors && item.errors.length > 0 && (
                                                            <div className={styles.historyErrorList}>
                                                                <p className={styles.errorListTitle}>Errors / warnings:</p>
                                                                <ul>
                                                                    {item.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                                                                    {item.errors.length > 20 && <li className={styles.moreErrors}>… and {item.errors.length - 20} more</li>}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────── */}
                <div className={styles.footer}>
                    <div>
                        {activeTab === 'history' ? (
                            <button className={styles.btnSecondary} onClick={handleClose}>Close</button>
                        ) : step === doneStep ? (
                            <button className={styles.btnSecondary} onClick={handleClose}>Close</button>
                        ) : step > 0 ? (
                            <button className={styles.btnSecondary} onClick={goBack} disabled={uploading}><ChevronLeft size={15} /> Back</button>
                        ) : (
                            <button className={styles.btnSecondary} onClick={handleClose}>Cancel</button>
                        )}
                    </div>
                    <div className={styles.footerRight}>
                        {activeTab === 'upload' && (
                            <>
                                {step === 0 && <button className={styles.btnPrimary} disabled={!userType} onClick={goNext}>Continue <ChevronRight size={15} /></button>}
                                {isClientType && step === 1 && <button className={styles.btnPrimary} disabled={!selectedClient} onClick={goNext}>Continue <ChevronRight size={15} /></button>}
                                {step === uploadStep && (
                                    <button className={styles.btnPrimary} disabled={!validated || !!parsed?.error || validCount === 0 || invalidCount > 0} onClick={goNext}>
                                        Review ({validCount}) <ChevronRight size={15} />
                                    </button>
                                )}
                                {step === reviewStep && (
                                    <button className={styles.btnSuccess} disabled={uploading || validCount === 0} onClick={handleSubmit}>
                                        {uploading ? <><Loader2 size={14} className={styles.spin} /> {uploadProgress ?? 'Uploading…'}</> : <><Upload size={14} /> Upload {validCount} User{validCount !== 1 ? 's' : ''}</>}
                                    </button>
                                )}
                                {step === doneStep && (
                                    <button className={styles.btnPrimary} onClick={() => { resetUpload(); }}>Upload Another</button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkUserUploadModal;