import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Building2,
  Users,
  Info,
} from "lucide-react";
import clientService from "../../services/client.service";
import styles from "./ClientImportModal.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "select-type" | "upload";
type ClientType = "Individual" | "Group";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema constants
// ─────────────────────────────────────────────────────────────────────────────

// Only truly required columns — middle_name, business_name, email, phone_* are optional
const NPI1_REQUIRED_HEADERS = ["first_name", "last_name", "npi", "state"];

const NPI2_CLIENT_HEADERS   = ["client_ref", "business_name", "npi", "state_name"];
const NPI2_LOCATION_HEADERS = ["client_ref", "location_ref", "address", "city", "state", "is_primary"];
const NPI2_PROVIDER_HEADERS = [
  "client_ref", "location_ref",
  "first_name", "last_name", "npi",
  "provider_address", "provider_city", "provider_state",
];

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

function normaliseKeys(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((r) => {
    const out: Record<string, any> = {};
    for (const k of Object.keys(r)) out[k.trim().toLowerCase()] = r[k];
    return out;
  });
}

function deriveStateCode(state: string): string {
  if (!state) return "";
  if (state.length === 2) return state.toUpperCase();
  const map: Record<string, string> = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
    california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
    florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
    illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
    kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
    massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
    missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
    "new york": "NY", "north carolina": "NC", "north dakota": "ND",
    ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
    "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
    tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
    virginia: "VA", washington: "WA", "west virginia": "WV",
    wisconsin: "WI", wyoming: "WY",
  };
  return map[state.toLowerCase()] ?? state.slice(0, 2).toUpperCase();
}

function asPrimary(val: any): boolean {
  if (typeof val === "boolean") return val;
  return String(val).toLowerCase() === "true" || String(val) === "1";
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsers
// Both return a `clients` array that goes directly into the POST /bulk body.
// The `type` discriminator field routes processing on the backend.
// ─────────────────────────────────────────────────────────────────────────────

function parseIndividualCSV(
  text: string
): { clients: Record<string, any>[]; rowErrors: string[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2)
    throw new Error("CSV must have a header row and at least one data row.");

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const missing = NPI1_REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length)
    throw new Error(`Missing required columns: ${missing.join(", ")}`);

  const clients: Record<string, any>[] = [];
  const rowErrors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      rowErrors.push(`Row ${i + 1}: column count mismatch (got ${values.length}, expected ${headers.length}).`);
      continue;
    }
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => (row[h] = values[idx]?.trim() || null));
    row["type"] = "Individual"; // always force — backend discriminates on this
    row["address_line_1"] = row["address_line_1"] || null;
    row["address_line_2"] = row["address_line_2"] || null;
    row["city"] = row["city"] || null;
    row["state_code"] = deriveStateCode(row["state"]);
    row["state_name"] = row["state"] || null;
    row["zip_code"] = row["zip_code"] || null;
    row["country"] = "United States";

    row["description"] = row["description"] || null;
    row["specialty"] = row["specialty"] || null;
    row["specialty_code"] = row["specialty_code"] || null;
    clients.push(row);
  }

  return { clients, rowErrors };
}

function parseGroupXLSX(
  wb: XLSX.WorkBook
): { clients: Record<string, any>[]; validationErrors: string[] } {
  const sheetNames = wb.SheetNames.map((n) => n.toLowerCase());
  const missingSheets = ["clients", "locations", "providers"].filter(
    (s) => !sheetNames.includes(s)
  );
  if (missingSheets.length) {
    throw new Error(
      `Workbook missing sheet(s): ${missingSheets.join(", ")}. ` +
      `Required: clients, locations, providers.`
    );
  }

  const getSheet = (name: string) =>
    wb.Sheets[wb.SheetNames.find((n) => n.toLowerCase() === name)!];

  const clientRows   = normaliseKeys(XLSX.utils.sheet_to_json(getSheet("clients"),   { defval: null }));
  const locationRows = normaliseKeys(XLSX.utils.sheet_to_json(getSheet("locations"), { defval: null }));
  const providerRows = normaliseKeys(XLSX.utils.sheet_to_json(getSheet("providers"), { defval: null }));

  // ── Header validation ───────────────────────────────────────────────────
  const headerErrors: string[] = [];
  const checkHeaders = (rows: Record<string, any>[], required: string[], sheet: string) => {
    if (!rows.length) { headerErrors.push(`[${sheet}] sheet is empty.`); return; }
    const keys = Object.keys(rows[0]);
    const m = required.filter((h) => !keys.includes(h));
    if (m.length) headerErrors.push(`[${sheet}] Missing columns: ${m.join(", ")}`);
  };
  checkHeaders(clientRows,   NPI2_CLIENT_HEADERS,   "clients");
  checkHeaders(locationRows, NPI2_LOCATION_HEADERS, "locations");
  checkHeaders(providerRows, NPI2_PROVIDER_HEADERS, "providers");
  if (headerErrors.length) throw new Error(headerErrors.join("\n"));

  // ── Row-level validation & payload assembly ─────────────────────────────
  const validationErrors: string[] = [];
  const clients: Record<string, any>[] = [];

  for (const clientRow of clientRows) {
    const ref = String(clientRow["client_ref"] ?? "").trim();
    if (!ref) {
      validationErrors.push("A row in [clients] is missing client_ref.");
      continue;
    }

    // Locations for this client
    const locs = locationRows.filter(
      (l) => String(l["client_ref"] ?? "").trim() === ref
    );
    if (!locs.length) {
      validationErrors.push(`Client '${ref}': no rows in [locations] — at least one required.`);
      continue;
    }

    const primaryLocs = locs.filter((l) => asPrimary(l["is_primary"]));
    if (primaryLocs.length === 0) {
      validationErrors.push(`Client '${ref}': no location has is_primary=true.`);
      continue;
    }
    if (primaryLocs.length > 1) {
      validationErrors.push(`Client '${ref}': ${primaryLocs.length} locations marked is_primary=true — only one allowed.`);
      continue;
    }

    // Providers for this client — validate location_ref linkage
    const provs = providerRows.filter(
      (p) => String(p["client_ref"] ?? "").trim() === ref
    );
    const locRefs = new Set(locs.map((l) => String(l["location_ref"] ?? "").trim()));
    for (const p of provs) {
      const locRef = String(p["location_ref"] ?? "").trim();
      if (locRef && !locRefs.has(locRef)) {
        validationErrors.push(
          `Client '${ref}', provider '${p["first_name"]} ${p["last_name"]}': ` +
          `location_ref '${locRef}' does not exist in [locations].`
        );
      }
    }

    // zip_code lives on the clients sheet, not the locations sheet —
    // read it once from clientRow and share it across all locations for this client.
    const clientZip = clientRow["zip_code"] ? String(clientRow["zip_code"]).trim() : null;

    // Build location payload
 const locationPayload = locs.map((l) => ({
  temp_id: String(l["location_ref"] ?? "").trim(),

  address_line_1: String(l["address"] ?? "").trim(),
  address_line_2: String(l["address_2"] ?? "").trim() || null,

  city: String(l["city"] ?? "").trim(),
  state_code: deriveStateCode(String(l["state"] ?? "").trim()),
  state_name: String(l["state"] ?? "").trim(),

  zip_code: String(l["zip_code"] ?? "").trim(),
  country: "United States",

  is_primary: asPrimary(l["is_primary"]),
}));
    // Build provider payload
    const providerPayload = provs.map((p) => ({
  first_name: String(p["first_name"] ?? "").trim(),
  middle_name: String(p["middle_name"] ?? "").trim() || null,
  last_name: String(p["last_name"] ?? "").trim(),
  npi: String(p["npi"] ?? "").trim(),
  ptan_id: String(p["ptan_id"] ?? "").trim() || null,

  address_line_1: String(p["provider_address"] ?? "").trim(),
  address_line_2: String(p["provider_address_2"] ?? "").trim() || null,
  city: String(p["provider_city"] ?? "").trim(),
  state_code: deriveStateCode(String(p["provider_state"] ?? "").trim()),
  state_name: String(p["provider_state"] ?? "").trim(),
  zip_code: String(p["provider_zip"] ?? "").trim(),
  country: "United States",

  specialty: String(p["specialty"] ?? "").trim() || null,
  specialty_code: String(p["specialty_code"] ?? "").trim() || null,

  location_temp_id: String(p["location_ref"] ?? "").trim(),
}));

    const primaryLoc = primaryLocs[0];

clients.push({
  type: "Group",

  business_name: String(clientRow["business_name"] ?? "").trim(),
  npi: String(clientRow["npi"] ?? "").trim(),

  description: String(clientRow["description"] ?? "").trim() || null,
  specialty: String(clientRow["specialty"] ?? "").trim() || null,
  specialty_code: String(clientRow["specialty_code"] ?? "").trim() || null,

  primary_temp_id: String(primaryLoc["location_ref"] ?? "").trim(),

  address_line_1: String(primaryLoc["address"] ?? "").trim(),
  address_line_2: String(primaryLoc["address_2"] ?? "").trim() || null,
  city: String(primaryLoc["city"] ?? "").trim(),
  state_code: deriveStateCode(String(primaryLoc["state_name"] ?? "").trim()),
  state_name: String(primaryLoc["state_name"] ?? "").trim(),
  zip_code: String(primaryLoc["zip_code"] ?? "").trim(),
  country: "United States",

  locations: locationPayload,
  providers: providerPayload,
});
  }

  return { clients, validationErrors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ClientImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep]                 = useState<Step>("select-type");
  const [selectedType, setSelectedType] = useState<ClientType | null>(null);
  const [file, setFile]                 = useState<File | null>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [importing, setImporting]       = useState(false);
  const [result, setResult]             = useState<ImportResult | null>(null);
  const [parseError, setParseError]     = useState<string | null>(null);
  const [validationDone, setValidationDone] = useState(false);
  const [validatedClients, setValidatedClients] = useState<any[]>([]);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("select-type"); setSelectedType(null);
    setFile(null); setResult(null); setParseError(null);
  };
  const handleClose       = () => { reset(); onClose(); };
  const handleBack        = () => reset();
  const handleTypeSelect  = (type: ClientType) => { setSelectedType(type); setStep("upload"); };

  const validateFile = (f: File): string | null => {
    if (selectedType === "Individual" && !f.name.endsWith(".csv"))
      return "Individual imports require a .csv file.";
    if (selectedType === "Group" && !f.name.match(/\.xlsx?$/i))
      return "Group imports require an .xlsx file.";
    if (f.size > 10 * 1024 * 1024) return "File size must be under 10 MB.";
    return null;
  };
const handleValidate = async () => {
  if (!file || !selectedType) return;

  setImporting(true);
  setParseError(null);

  try {
    let clients: any[] = [];
    let errors: string[] = [];

    if (selectedType === "Individual") {
      const text = await file.text();
      const { clients: parsed, rowErrors } = parseIndividualCSV(text);

      clients = parsed;
      errors = rowErrors;

    } else {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });

      const { clients: parsed, validationErrors } = parseGroupXLSX(wb);

      clients = parsed;
      errors = validationErrors;
    }

    if (errors.length) {
      setParseError(errors.join("\n"));
      setValidationDone(false);
      return;
    }

    // 🔥 OPTIONAL: call backend validation API (BEST PRACTICE)
    // await clientService.validateBulk(clients)

    setValidatedClients(clients);
    setValidationDone(true);

  } catch (err: any) {
    setParseError(err?.message || "Validation failed");
  } finally {
    setImporting(false);
  }
};
  const processFile = (f: File) => {
    setParseError(null); setResult(null);
    const err = validateFile(f);
    err ? setParseError(err) : setFile(f);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };

  // ── Core import handler ───────────────────────────────────────────────────
  const handleImport = async () => {
  if (!validationDone) {
    setParseError("Please validate before importing.");
    return;
  }

  setImporting(true);

  try {
    const response = await clientService.createClientsFromBulk(validatedClients);

    setResult({
      success: response.success,
      failed: response.failed,
      errors: response.errors || [],
    });

    if (response.success > 0) onSuccess();

  } catch (err: any) {
    setParseError(err?.message || "Import failed");
  } finally {
    setImporting(false);
  }
};
//   const handleImport = async () => {
//     if (!file || !selectedType) return;
//     setImporting(true);
//     setParseError(null);

//     try {
//       let clients: Record<string, any>[] = [];
//       let preflightFailed = 0;
//       let preflightErrors: string[] = [];

//       if (selectedType === "Individual") {
//         // Parse CSV → flat Individual rows
//         const text = await file.text();
//         const { clients: parsed, rowErrors } = parseIndividualCSV(text);

//         if (!parsed.length) {
//           setParseError(
//             rowErrors.length
//               ? `No valid rows found.\n${rowErrors.join("\n")}`
//               : "No data rows found in the file."
//           );
//           return;
//         }
//         clients         = parsed;
//         preflightFailed = rowErrors.length;
//         preflightErrors = rowErrors;

//       } else {
//         // Parse XLSX → nested Group objects
//         const buffer = await file.arrayBuffer();
//         const wb = XLSX.read(buffer, { type: "array" });
//         const { clients: parsed, validationErrors } = parseGroupXLSX(wb);

//         // Any validation error blocks the whole upload — surface them before any API call
//         if (validationErrors.length) {
//           setParseError(validationErrors.join("\n"));
//           return;
//         }
//         if (!parsed.length) {
//           setParseError("No valid client rows found in the workbook.");
//           return;
//         }
//         clients = parsed;
//       }

//       // ── Single API call for both types ─────────────────────────────────────
//       //    POST /clients/bulk  →  { clients: [ ...IndividualClientImport | GroupClientImport ] }
//       //    The `type` field on each item tells the backend which branch to execute.
//       const response = await clientService.createClientsFromBulk(clients);

//       setResult({
//         success: response.success,
//         failed:  response.failed + preflightFailed,
//         errors:  [...(response.errors ?? []), ...preflightErrors],
//       });

//       if (response.success > 0) onSuccess();

//     } catch (err: any) {
//       setParseError(err?.message ?? "Import failed. Please try again.");
//     } finally {
//       setImporting(false);
//     }
//   };

  if (!isOpen) return null;

  const acceptAttr = selectedType === "Group" ? ".xlsx,.xls" : ".csv";

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {step === "upload" && (
              <button className={styles.backBtn} onClick={handleBack}>
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 className={styles.title}>
                {step === "select-type" ? "Import Clients" : `Import ${selectedType} Clients`}
              </h2>
              <p className={styles.subtitle}>
                {step === "select-type"
                  ? "Choose the client type to import"
                  : selectedType === "Individual"
                  ? "Upload a CSV file with client data"
                  : "Upload an XLSX file with clients, locations & providers"}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* ── Step indicator ── */}
        <div className={styles.stepBar}>
          <div className={`${styles.stepDot} ${styles.done}`}>1</div>
          <div className={`${styles.stepLine} ${step === "upload" ? styles.activeLine : ""}`} />
          <div className={`${styles.stepDot} ${step === "upload" ? styles.active : ""}`}>2</div>
          <span className={styles.stepLabel}>
            {step === "select-type" ? "Step 1 of 2 — Select type" : "Step 2 of 2 — Upload file"}
          </span>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* STEP 1 */}
          {step === "select-type" && (
            <div className={styles.typeGrid}>
              <button
                className={`${styles.typeCard} ${styles.enabled}`}
                onClick={() => handleTypeSelect("Individual")}
              >
                <div className={styles.typeCardIcon}><Building2 size={28} /></div>
                <div className={styles.typeCardContent}>
                  <h3>Individual</h3>
                  <p>Solo practitioners — physicians, nurses, therapists.</p>
                </div>
                <ChevronRight size={18} className={styles.typeCardArrow} />
              </button>

              <button
                className={`${styles.typeCard} ${styles.enabled}`}
                onClick={() => handleTypeSelect("Group")}
              >
                <div className={styles.typeCardIcon}><Users size={28} /></div>
                <div className={styles.typeCardContent}>
                  <h3>Group</h3>
                  <p>Hospitals, clinics and group practices with multiple locations and providers.</p>
                </div>
                <ChevronRight size={18} className={styles.typeCardArrow} />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === "upload" && !result && (
            <>
              <div className={styles.infoBox}>
                <Info size={15} />
                {selectedType === "Individual" ? (
                  <span>
                    CSV must include: <code>first_name, last_name, npi, state</code>.
                    The <code>type</code> column is always forced to <code>Individual</code>.
                  </span>
                ) : (
                  <span>
                    XLSX must have <strong>3 sheets</strong>: <code>clients</code>, <code>locations</code>, <code>providers</code>.
                    Each client needs ≥1 location with exactly one <code>is_primary=true</code>.
                    Each provider must reference a valid <code>location_ref</code>.
                  </span>
                )}
              </div>

              {selectedType === "Group" && (
                <div className={styles.schemaGrid}>
                  <div className={styles.schemaSheet}>
                    <strong>clients</strong>
                    <code>client_ref, business_name, npi, state</code>
                  </div>
                  <div className={styles.schemaSheet}>
                    <strong>locations</strong>
                    <code>client_ref, location_ref, address, city, state, is_primary</code>
                  </div>
                  <div className={styles.schemaSheet}>
                    <strong>providers</strong>
                    <code>client_ref, location_ref, first_name, last_name, npi, provider_address, provider_city, provider_state</code>
                  </div>
                </div>
              )}

              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ""} ${file ? styles.hasFile : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptAttr}
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className={styles.fileReady}>
                    <FileText size={32} className={styles.fileIcon} />
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      className={styles.removeFile}
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >Remove</button>
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <Upload size={32} className={styles.uploadIcon} />
                    <p>
                      Drag & drop your {selectedType === "Individual" ? "CSV" : "XLSX"} here,
                      or <span>browse</span>
                    </p>
                    <small>Accepts {selectedType === "Individual" ? ".csv" : ".xlsx"} · Max 10 MB</small>
                  </div>
                )}
              </div>

              {parseError && (
                <div className={styles.errorBox}>
                  <AlertCircle size={15} />
                  <pre className={styles.errorText}>{parseError}</pre>
                </div>
              )}
            </>
          )}

          {/* Result */}
          {result && (
            <div className={styles.resultSection}>
              {result.success > 0 && (
                <div className={styles.successSummary}>
                  <CheckCircle size={20} />
                  <span>
                    <strong>{result.success}</strong> client{result.success !== 1 ? "s" : ""} imported successfully.
                  </span>
                </div>
              )}
              {result.failed > 0 && (
                <div className={styles.failedSummary}>
                  <AlertCircle size={20} />
                  <span>
                    <strong>{result.failed}</strong> row{result.failed !== 1 ? "s" : ""} failed.
                  </span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className={styles.errorList}>
                  <p className={styles.errorListTitle}>Error details:</p>
                  <ul>{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {step === "select-type" && (
            <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
          )}
          {step === "upload" && !result && (
            <>
              <button className={styles.cancelBtn} onClick={handleBack}>Back</button>
             {!validationDone ? (
                <button onClick={handleValidate} disabled={!file || importing}>
                    Validate
                </button>
                ) : (
                <button onClick={handleImport} disabled={importing}>
                    Confirm Import
                </button>
                )}
            </>
          )}
          {result && (
            <button className={styles.importBtn} onClick={handleClose}>Done</button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ClientImportModal;