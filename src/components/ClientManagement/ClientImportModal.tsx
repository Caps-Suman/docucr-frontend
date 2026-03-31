import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload, X, FileText, AlertCircle, CheckCircle,
  ChevronRight, ArrowLeft, Building2, Users, Info, Download,
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
// Header validation constants
// ─────────────────────────────────────────────────────────────────────────────

const NPI1_REQUIRED_HEADERS = ["first_name", "last_name", "npi", "state"];

const NPI2_CLIENT_HEADERS = ["client_ref", "business_name", "npi"];

// location_npi is now required – it is the NPI assigned to a specific location
const NPI2_LOCATION_HEADERS = [
  "client_ref", "location_ref", "location_npi",
  "address", "city", "state", "is_primary",
];

// Providers are linked via both location_ref AND location_npi
const NPI2_PROVIDER_HEADERS = [
  "client_ref", "location_ref", "location_npi",
  "first_name", "last_name", "npi",
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
  const trimmed = state.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
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
  return map[trimmed.toLowerCase()] ?? trimmed.slice(0, 2).toUpperCase();
}

function asPrimary(val: any): boolean {
  if (typeof val === "boolean") return val;
  return String(val).toLowerCase() === "true" || String(val) === "1";
}

function str(val: any): string {
  return String(val ?? "").trim();
}

function strOrNull(val: any): string | null {
  const s = str(val);
  return s || null;
}

function readWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "array" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual parsers (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function parseIndividualRows(
  rows: Record<string, any>[]
): { clients: Record<string, any>[]; rowErrors: string[] } {
  const clients: Record<string, any>[] = [];
  const rowErrors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const missingRequired = NPI1_REQUIRED_HEADERS.filter(
      (h) => !row[h] || str(row[h]) === ""
    );
    if (missingRequired.length) {
      rowErrors.push(`Row ${rowNum}: missing required fields: ${missingRequired.join(", ")}`);
      continue;
    }

    const stateRaw = str(row["state"]);

    clients.push({
      type: "Individual",
      first_name: str(row["first_name"]),
      middle_name: strOrNull(row["middle_name"]),
      last_name: str(row["last_name"]),
      business_name: strOrNull(row["business_name"]),
      npi: str(row["npi"]),
      is_user: false,
      providers: [],
      locations: null,
      primary_temp_id: null,
      address_line_1: strOrNull(row["address_line_1"]),
      address_line_2: strOrNull(row["address_line_2"]),
      city: strOrNull(row["city"]),
      state_code: deriveStateCode(stateRaw),
      state_name: stateRaw || null,
      zip_code: strOrNull(row["zip_code"]),
      country: str(row["country"]) || "United States",
      description: strOrNull(row["description"]),
      specialty: strOrNull(row["specialty"]),
      specialty_code: strOrNull(row["specialty_code"]),
    });
  }

  return { clients, rowErrors };
}

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

  const rawRows: Record<string, any>[] = [];
  const earlyErrors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      earlyErrors.push(`Row ${i + 1}: column count mismatch (got ${values.length}, expected ${headers.length}).`);
      continue;
    }
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => (row[h] = values[idx]?.trim() || null));
    rawRows.push(row);
  }

  const { clients, rowErrors } = parseIndividualRows(rawRows);
  return { clients, rowErrors: [...earlyErrors, ...rowErrors] };
}

function parseIndividualXLSX(
  wb: XLSX.WorkBook
): { clients: Record<string, any>[]; rowErrors: string[] } {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook is empty — no sheets found.");

  const rawRows = normaliseKeys(
    XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null })
  );
  if (!rawRows.length) throw new Error("Sheet is empty — no data rows found.");

  const headers = Object.keys(rawRows[0]);
  const missing = NPI1_REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length)
    throw new Error(`Missing required columns: ${missing.join(", ")}`);

  return parseIndividualRows(rawRows);
}

// ─────────────────────────────────────────────────────────────────────────────
// Group parser
//
// Each location row now carries a location_npi column.
// Provider → location linkage is validated and sent as a composite key:
//   location_temp_id = location_ref value
//   location_npi     = location_npi value
// The backend uses whichever identifier resolves the location first.
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Header validation ──────────────────────────────────────────────────────
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

  const validationErrors: string[] = [];
  const clients: Record<string, any>[] = [];

  for (const clientRow of clientRows) {
    const ref = str(clientRow["client_ref"]);
    if (!ref) {
      validationErrors.push("A row in [clients] is missing client_ref.");
      continue;
    }

    const locs = locationRows.filter((l) => str(l["client_ref"]) === ref);
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
      validationErrors.push(
        `Client '${ref}': ${primaryLocs.length} locations marked is_primary=true — only one allowed.`
      );
      continue;
    }

    // ── Composite key set: "location_ref|location_npi" ────────────────────
    // A provider row is valid only when BOTH location_ref AND location_npi
    // together match a row in [locations] for this client.
    const locCompositeKeys = new Set(
      locs.map((l) => `${str(l["location_ref"])}|${str(l["location_npi"])}`)
    );

    const provs = providerRows.filter((p) => str(p["client_ref"]) === ref);

    for (const p of provs) {
      const provLocRef = str(p["location_ref"]);
      const provLocNpi = str(p["location_npi"]);
      if (provLocRef || provLocNpi) {
        const compositeKey = `${provLocRef}|${provLocNpi}`;
        if (!locCompositeKeys.has(compositeKey)) {
          validationErrors.push(
            `Client '${ref}', provider '${str(p["first_name"])} ${str(p["last_name"])}': ` +
            `location_ref '${provLocRef}' + location_npi '${provLocNpi}' ` +
            `does not match any location in [locations].`
          );
        }
      }
    }

    const primaryLoc = primaryLocs[0];

    // ── Location payload → BulkLocationCreate ─────────────────────────────
    const locationPayload = locs.map((l) => {
      const stateRaw = str(l["state"]);
      return {
        temp_id:        str(l["location_ref"]) || null,
        location_npi:   strOrNull(l["location_npi"]),   // ← new field
        address_line_1: str(l["address"]),
        address_line_2: strOrNull(l["address_2"]),
        city:           str(l["city"]),
        state_code:     deriveStateCode(stateRaw),
        state_name:     stateRaw || null,
        zip_code:       strOrNull(l["zip_code"]),
        country:        str(l["country"]) || "United States",
        is_primary:     asPrimary(l["is_primary"]),
      };
    });

    // ── Provider payload → BulkProviderCreate ─────────────────────────────
    const providerPayload = provs.map((p) => {
      const provStateRaw = str(p["provider_state"]);
      return {
        first_name:       str(p["first_name"]),
        middle_name:      strOrNull(p["middle_name"]),
        last_name:        str(p["last_name"]),
        npi:              str(p["npi"]),
        ptan_id:          strOrNull(p["ptan_id"]),

        // Composite reference: backend resolves location by temp_id + location_npi
        location_temp_id: str(p["location_ref"]) || null,
        location_npi:     strOrNull(p["location_npi"]),   // ← new field

        address_line_1:   strOrNull(p["provider_address"]),
        address_line_2:   strOrNull(p["provider_address_2"]),
        city:             strOrNull(p["provider_city"]),
        state_code:       provStateRaw ? deriveStateCode(provStateRaw) : null,
        state_name:       provStateRaw || null,
        zip_code:         strOrNull(p["provider_zip"]),
        country:          "United States",
        specialty:        strOrNull(p["specialty"]),
        specialty_code:   strOrNull(p["specialty_code"]),
      };
    });

    const primaryStateRaw = str(primaryLoc["state"]);
    const primaryTempId   = str(primaryLoc["location_ref"]) || null;

    clients.push({
      type: "Group",

      business_name:  str(clientRow["business_name"]),
      npi:            str(clientRow["npi"]),
      description:    strOrNull(clientRow["description"]),
      specialty:      strOrNull(clientRow["specialty"]),
      specialty_code: strOrNull(clientRow["specialty_code"]),

      // Top-level address mirrored from primary location
      address_line_1: str(primaryLoc["address"]),
      address_line_2: strOrNull(primaryLoc["address_2"]),
      city:           str(primaryLoc["city"]),
      state_code:     deriveStateCode(primaryStateRaw),
      state_name:     primaryStateRaw || null,
      zip_code:       strOrNull(primaryLoc["zip_code"]) ?? strOrNull(clientRow["zip_code"]),
      country:        "United States",

      primary_temp_id: primaryTempId,
      locations:       locationPayload,
      providers:       providerPayload,
    });
  }

  return { clients, validationErrors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified file dispatcher
// ─────────────────────────────────────────────────────────────────────────────

async function parseFile(
  file: File,
  selectedType: ClientType
): Promise<{ clients: Record<string, any>[]; errors: string[] }> {
  const isCSV  = file.name.toLowerCase().endsWith(".csv");
  const isXLSX = /\.xlsx?$/i.test(file.name);

  if (!isCSV && !isXLSX)
    throw new Error("Unsupported file format. Please upload a .csv or .xlsx file.");

  if (selectedType === "Individual") {
    if (isCSV) {
      const text = await file.text();
      const { clients, rowErrors } = parseIndividualCSV(text);
      return { clients, errors: rowErrors };
    } else {
      const buffer = await file.arrayBuffer();
      const { clients, rowErrors } = parseIndividualXLSX(readWorkbook(buffer));
      return { clients, errors: rowErrors };
    }
  } else {
    if (isCSV)
      throw new Error(
        "Group imports require an XLSX file with 3 sheets: clients, locations, providers.\n" +
        "A single CSV cannot represent the nested locations and providers structure."
      );
    const buffer = await file.arrayBuffer();
    const { clients, validationErrors } = parseGroupXLSX(readWorkbook(buffer));
    return { clients, errors: validationErrors };
  }
}

function downloadTemplate(type: ClientType) {
  if (type === "Individual") {
    const headers = [
      "first_name *", "last_name *", "npi *", "state *",
      "middle_name", "business_name",
      "address_line_1", "address_line_2", "city", "zip_code", "country",
      "description", "specialty", "specialty_code",
    ];
    const example = [
      "Jane", "Doe", "1234567890", "CA",
      "M", "",
      "123 Main St", "Ste 4", "Los Angeles", "90001", "United States",
      "Primary care", "Internal Medicine", "207Q00000X",
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Individual");
    XLSX.writeFile(wb, "Individual_Import_Template.xlsx");
  } else {
    const clientHeaders = [
      "client_ref *", "business_name *", "npi *",
      "description", "specialty", "specialty_code",
    ];
    const clientExample = ["GRP001", "Sunrise Health Clinic", "1111111111", "", "Family Medicine", "207Q00000X"];

    const locationHeaders = [
      "client_ref *", "location_ref *", "location_npi *",
      "address *", "city *", "state *", "is_primary *",
      "address_2", "zip_code", "country",
    ];
    const locationExample1 = ["GRP001", "LOC001", "3333333333", "100 Sunrise Blvd", "Los Angeles", "CA", "TRUE", "Suite 1", "90001", "United States"];
    const locationExample2 = ["GRP001", "LOC002", "4444444444", "200 Wellness Ave", "San Diego", "CA", "FALSE", "", "92101", "United States"];

    const providerHeaders = [
      "client_ref *", "location_ref *", "location_npi *",
      "first_name *", "last_name *", "npi *",
      "middle_name", "ptan_id",
      "provider_address", "provider_address_2", "provider_city", "provider_state", "provider_zip",
      "specialty", "specialty_code",
    ];
    const providerExample1 = ["GRP001", "LOC001", "3333333333", "Alice", "Johnson", "6666666666", "R", "P12345", "", "", "", "", "", "Internal Medicine", "207R00000X"];
    const providerExample2 = ["GRP001", "LOC002", "4444444444", "Bob", "Williams", "7777777777", "", "", "", "", "", "", "", "Family Medicine", "207Q00000X"];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([clientHeaders,   clientExample]),                    "clients");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([locationHeaders, locationExample1, locationExample2]), "locations");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([providerHeaders, providerExample1, providerExample2]), "providers");
    XLSX.writeFile(wb, "Group_Import_Template.xlsx");
  }
}

const ClientImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep]                     = useState<Step>("select-type");
  const [selectedType, setSelectedType]     = useState<ClientType | null>(null);
  const [file, setFile]                     = useState<File | null>(null);
  const [isDragging, setIsDragging]         = useState(false);
  const [importing, setImporting]           = useState(false);
  const [result, setResult]                 = useState<ImportResult | null>(null);
  const [parseError, setParseError]         = useState<string | null>(null);
  const [validationDone, setValidationDone] = useState(false);
  const [validatedClients, setValidatedClients] = useState<any[]>([]);
  const [previewCount, setPreviewCount]     = useState<number>(0);
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("select-type"); setSelectedType(null);
    setFile(null); setResult(null); setParseError(null);
    setValidationDone(false); setValidatedClients([]); setPreviewCount(0);
  };
  const handleClose      = () => { reset(); onClose(); };
  const handleBack       = () => reset();
  const handleTypeSelect = (type: ClientType) => { setSelectedType(type); setStep("upload"); };

  const validateFile = (f: File): string | null => {
    const isCSV  = f.name.toLowerCase().endsWith(".csv");
    const isXLSX = /\.xlsx?$/i.test(f.name);
    if (!isCSV && !isXLSX)
      return "Please upload a .csv or .xlsx file.";
    if (selectedType === "Group" && isCSV)
      return "Group imports require an XLSX file (3 sheets: clients, locations, providers).";
    if (f.size > 10 * 1024 * 1024)
      return "File size must be under 10 MB.";
    return null;
  };

  const handleValidate = async () => {
    if (!file || !selectedType) return;
    setImporting(true);
    setParseError(null);
    setValidationDone(false);
    setValidatedClients([]);
    setPreviewCount(0);
    try {
      const { clients, errors } = await parseFile(file, selectedType);
      if (errors.length) { setParseError(errors.join("\n")); return; }
      if (!clients.length) { setParseError("No valid rows found in the file."); return; }
      setValidatedClients(clients);
      setPreviewCount(clients.length);
      setValidationDone(true);
    } catch (err: any) {
      setParseError(err?.message || "Validation failed.");
    } finally {
      setImporting(false);
    }
  };

  const processFile = (f: File) => {
    setParseError(null); setResult(null);
    setValidationDone(false); setValidatedClients([]); setPreviewCount(0);
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

  const handleImport = async () => {
    if (!validationDone || !validatedClients.length) {
      setParseError("Please validate the file before importing.");
      return;
    }
    setImporting(true);
    setParseError(null);
    try {
      const response = await clientService.createClientsFromBulk(validatedClients);
      setResult({
        success: response.success ?? 0,
        failed:  response.failed  ?? 0,
        errors:  response.errors  ?? [],
      });
      if ((response.success ?? 0) > 0) onSuccess();
    } catch (err: any) {
      setParseError(err?.message || "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const acceptAttr = selectedType === "Group" ? ".xlsx,.xls" : ".csv,.xlsx,.xls";

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
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
                  ? "Upload a CSV or XLSX file with client data"
                  : "Upload an XLSX file with clients, locations & providers"}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}><X size={20} /></button>
        </div>

        {/* Step indicator */}
        <div className={styles.stepBar}>
          <div className={`${styles.stepDot} ${styles.done}`}>1</div>
          <div className={`${styles.stepLine} ${step === "upload" ? styles.activeLine : ""}`} />
          <div className={`${styles.stepDot} ${step === "upload" ? styles.active : ""}`}>2</div>
          <span className={styles.stepLabel}>
            {step === "select-type" ? "Step 1 of 2 — Select type" : "Step 2 of 2 — Upload file"}
          </span>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* STEP 1 */}
          {step === "select-type" && (
            <div className={styles.typeGrid}>
              <button className={`${styles.typeCard} ${styles.enabled}`}
                onClick={() => handleTypeSelect("Individual")}>
                <div className={styles.typeCardIcon}><Building2 size={28} /></div>
                <div className={styles.typeCardContent}>
                  <h3>Individual</h3>
                  <p>Solo practitioners — physicians, nurses, therapists.</p>
                </div>
                <ChevronRight size={18} className={styles.typeCardArrow} />
              </button>

              <button className={`${styles.typeCard} ${styles.enabled}`}
                onClick={() => handleTypeSelect("Group")}>
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
                    File must include: <code>first_name, last_name, npi, state</code>.
                    Accepts <strong>.csv</strong> or <strong>.xlsx</strong>.
                  </span>
                ) : (
                  <span>
                    XLSX must have <strong>3 sheets</strong>: <code>clients</code>,{" "}
                    <code>locations</code>, <code>providers</code>. Each location needs a{" "}
                    <code>location_npi</code>. Providers link to a location via{" "}
                    <code>location_ref</code> <strong>+</strong> <code>location_npi</code>.
                    Exactly one location per client must have <code>is_primary=true</code>.
                  </span>
                )}
              </div>

              {/* Template download button */}
              <div className={styles.templateRow}>
                <button
                  className={styles.templateBtn}
                  onClick={() => selectedType && downloadTemplate(selectedType)}
                >
                  <Download size={14} />
                  Download {selectedType} template
                </button>
              </div>

              {/* Drop zone */}
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ""} ${file ? styles.hasFile : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept={acceptAttr}
                  style={{ display: "none" }} onChange={handleFileChange} />
                {file ? (
                  <div className={styles.fileReady}>
                    <FileText size={32} className={styles.fileIcon} />
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
                    <button className={styles.removeFile} onClick={(e) => {
                      e.stopPropagation();
                      setFile(null); setValidationDone(false);
                      setValidatedClients([]); setPreviewCount(0); setParseError(null);
                    }}>Remove</button>
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <Upload size={32} className={styles.uploadIcon} />
                    <p>
                      Drag & drop your{" "}
                      {selectedType === "Individual" ? "CSV or XLSX" : "XLSX"} here,
                      or <span>browse</span>
                    </p>
                    <small>
                      Accepts {selectedType === "Individual" ? ".csv, .xlsx" : ".xlsx"} · Max 10 MB
                    </small>
                  </div>
                )}
              </div>

              {validationDone && previewCount > 0 && (
                <div className={styles.successSummary} style={{ marginTop: 12 }}>
                  <CheckCircle size={15} />
                  <span>
                    Validated <strong>{previewCount}</strong>{" "}
                    client{previewCount !== 1 ? "s" : ""} — ready to import.
                  </span>
                </div>
              )}

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
                <button className={styles.importBtn} onClick={handleValidate}
                  disabled={!file || importing}>
                  {importing ? "Validating…" : "Validate"}
                </button>
              ) : (
                <button className={styles.importBtn} onClick={handleImport} disabled={importing}>
                  {importing ? "Importing…" : `Confirm Import (${previewCount})`}
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