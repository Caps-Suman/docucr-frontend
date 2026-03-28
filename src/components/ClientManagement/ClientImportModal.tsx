import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Lock,
  Building2,
  User,
  Info,
} from "lucide-react";
import clientService from "../../services/client.service";
import styles from "./ClientImportModal.module.css";

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

const NPI1_HEADERS = [
  "first_name",
  "middle_name",
  "last_name",
  "business_name",
  "email",
  "phone_country_code",
  "phone_number",
  "npi",
  "type",
  "state",
];

const ClientImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>("select-type");
  const [selectedType, setSelectedType] = useState<ClientType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setStep("select-type");
    setSelectedType(null);
    setFile(null);
    setResult(null);
    setParseError(null);
    onClose();
  };

  const handleTypeSelect = (type: ClientType) => {
    if (type === "Group") return; // disabled
    setSelectedType(type);
    setStep("upload");
  };

  const handleBack = () => {
    setStep("select-type");
    setSelectedType(null);
    setFile(null);
    setResult(null);
    setParseError(null);
  };

  const validateFile = (f: File): string | null => {
    if (!f.name.endsWith(".csv")) return "Only .csv files are accepted.";
    if (f.size > 5 * 1024 * 1024) return "File size must be under 5MB.";
    return null;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (chosen) processFile(chosen);
  };

  const processFile = (f: File) => {
    setParseError(null);
    setResult(null);
    const err = validateFile(f);
    if (err) {
      setParseError(err);
      return;
    }
    setFile(f);
  };

  const handleImport = async () => {
    if (!file || !selectedType) return;
    setImporting(true);
    setParseError(null);

    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        setParseError("CSV must have a header row and at least one data row.");
        setImporting(false);
        return;
      }

      // Validate headers
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

      const missingHeaders = NPI1_HEADERS.filter(
        (required) => !headers.includes(required.toLowerCase())
      );
      if (missingHeaders.length > 0) {
        setParseError(
          `Missing required columns: ${missingHeaders.join(", ")}`
        );
        setImporting(false);
        return;
      }

      // Parse rows
      const clients: Record<string, any>[] = [];
      const rowErrors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length !== headers.length) {
            rowErrors.push(`Row ${i + 1}: column count mismatch.`);
            continue;
        }

        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx]?.trim() || null;
        });

        // 🔥 FORCE TYPE (NO VALIDATION AGAINST CSV)
        row["type"] = selectedType;

        clients.push(row);
        }
      if (clients.length === 0) {
        setParseError(
          rowErrors.length > 0
            ? `No valid rows found.\n${rowErrors.join("\n")}`
            : "No data rows found in the file."
        );
        setImporting(false);
        return;
      }

      // Call bulk endpoint
      const response = await clientService.createClientsFromBulk(clients);
      setResult({
        success: response.success,
        failed: response.failed + rowErrors.length,
        errors: [...(response.errors || []), ...rowErrors],
      });

      if (response.success > 0) onSuccess();
    } catch (err: any) {
      setParseError(err?.message || "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  /** Simple CSV line parser that handles quoted fields */
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };

  if (!isOpen) return null;

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
                {step === "select-type"
                  ? "Import Clients"
                  : `Import ${selectedType} Clients`}
              </h2>
              <p className={styles.subtitle}>
                {step === "select-type"
                  ? "Choose the client type to import"
                  : "Upload a CSV file with client data"}
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* ── Step Indicator ── */}
        <div className={styles.stepBar}>
          <div className={`${styles.stepDot} ${styles.done}`}>1</div>
          <div
            className={`${styles.stepLine} ${step === "upload" ? styles.activeLine : ""}`}
          />
          <div
            className={`${styles.stepDot} ${step === "upload" ? styles.active : ""}`}
          >
            2
          </div>
          <span className={styles.stepLabel}>
            {step === "select-type" ? "Step 1 of 2 — Select type" : "Step 2 of 2 — Upload file"}
          </span>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          {/* STEP 1 — Type Selection */}
          {step === "select-type" && (
            <div className={styles.typeGrid}>
              {/* NPI1 Card */}
              <button
                className={`${styles.typeCard} ${styles.enabled}`}
                onClick={() => handleTypeSelect("Individual")}
              >
                <div className={styles.typeCardIcon}>
                  <Building2 size={28} />
                </div>
                <div className={styles.typeCardContent}>
                  <h3>Individual</h3>
                  <p>
                    Individual healthcare providers — physicians, nurses,
                    therapists, and other solo practitioners.
                  </p>
                </div>
                <ChevronRight size={18} className={styles.typeCardArrow} />
              </button>

              {/* NPI2 Card — disabled */}
              <div className={`${styles.typeCard} ${styles.disabled}`}>
                <div className={styles.typeCardIcon}>
                  <User size={28} />
                </div>
                <div className={styles.typeCardContent}>
                  <h3>
                    Group
                    <span className={styles.comingSoonBadge}>Coming soon</span>
                  </h3>
                  <p>
                    Organisational healthcare providers — hospitals, clinics,
                    group practices.
                  </p>
                </div>
                <Lock size={16} className={styles.lockIcon} />
              </div>
            </div>
          )}

          {/* STEP 2 — File Upload */}
          {step === "upload" && !result && (
            <>
              {/* Template hint */}
              <div className={styles.infoBox}>
                <Info size={15} />
                <span>
                  CSV must include these columns:{" "}
                  <code>{NPI1_HEADERS.join(", ")}</code>. The{" "}
                  <code>type</code> column value must be <code>NPI1</code>.
                </span>
              </div>

              {/* Drop zone */}
              <div
                className={`${styles.dropZone} ${isDragging ? styles.dragging : ""} ${file ? styles.hasFile : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className={styles.fileReady}>
                    <FileText size={32} className={styles.fileIcon} />
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      className={styles.removeFile}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <Upload size={32} className={styles.uploadIcon} />
                    <p>
                      Drag & drop your CSV here, or <span>browse</span>
                    </p>
                    <small>Accepts .csv · Max 5 MB</small>
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

          {/* RESULT */}
          {result && (
            <div className={styles.resultSection}>
              {result.success > 0 && (
                <div className={styles.successSummary}>
                  <CheckCircle size={20} />
                  <span>
                    <strong>{result.success}</strong> client
                    {result.success !== 1 ? "s" : ""} imported successfully.
                  </span>
                </div>
              )}
              {result.failed > 0 && (
                <div className={styles.failedSummary}>
                  <AlertCircle size={20} />
                  <span>
                    <strong>{result.failed}</strong> row
                    {result.failed !== 1 ? "s" : ""} failed.
                  </span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className={styles.errorList}>
                  <p className={styles.errorListTitle}>Error details:</p>
                  <ul>
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          {step === "select-type" && (
            <button className={styles.cancelBtn} onClick={handleClose}>
              Cancel
            </button>
          )}

          {step === "upload" && !result && (
            <>
              <button className={styles.cancelBtn} onClick={handleBack}>
                Back
              </button>
              <button
                className={styles.importBtn}
                onClick={handleImport}
                disabled={!file || importing}
              >
                {importing ? (
                  <>
                    <span className={styles.spinner} />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    Import
                  </>
                )}
              </button>
            </>
          )}

          {result && (
            <button className={styles.importBtn} onClick={handleClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientImportModal;