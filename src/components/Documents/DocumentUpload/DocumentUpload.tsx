import React, { useState, useEffect } from "react";
import { Upload, X, FileText, ArrowLeft, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import formService, { Form, FormField } from "../../../services/form.service";
import clientService from "../../../services/client.service";
import documentTypeService from "../../../services/documentType.service";
import documentService from "../../../services/document.service";
import { uploadStore } from "../../../store/uploadStore";
import CommonDropdown from "../../Common/CommonDropdown";
import CommonDatePicker from "../../Common/CommonDatePicker";
import Toast, { ToastType } from "../../Common/Toast";
import styles from "./DocumentUpload.module.css";
import authService from "../../../services/auth.service";

const DocumentUpload: React.FC = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(true);
  const [enableAI, setEnableAI] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const currentUser = authService.getUser();
  const isClientUser = currentUser?.is_client === true || !!currentUser?.client_id;


  // const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const isClientSystemField = (field: FormField) =>
    field.is_system && field.label.toLowerCase() === 'client';

  const isDocumentTypeSystemField = (field: FormField) =>
    field.is_system && field.label.toLowerCase() === 'document type';


  useEffect(() => {
    fetchActiveForm();
  }, []);

  useEffect(() => {
    if (selectedForm?.fields) {
      fetchSystemFieldData(selectedForm.fields);
    }
  }, [selectedForm]);

  useEffect(() => {
    if (!isClientUser) return;
    if (!currentUser?.client_id) return;
    if (!selectedForm?.fields?.length) return;
    if (!clients.length) return;

    const clientField = selectedForm.fields.find(
      f => f.is_system && f.label.toLowerCase() === "client"
    );
    if (!clientField?.id) return;

    const clientFieldId = clientField.id;

    setFormData(prev => {
      // ✅ only block if value is a REAL id
      if (prev[clientFieldId] && prev[clientFieldId] !== "") {
        return prev;
      }

      return {
        ...prev,
        [clientFieldId]: currentUser.client_id
      };
    });
  }, [
    isClientUser,
    currentUser?.client_id,
    selectedForm,
    clients
  ]);



  const visibleFields = selectedForm?.fields?.filter(field => {
    if (!isClientUser) return true;

    const label = field.label.toLowerCase();

    // hide provider fields
    if (label.includes("Provider Document")) return false;

    return true;
  });


  const fetchActiveForm = async () => {
    try {
      setFormLoading(true);

      const res = await formService.getActiveForm();

      // 🔴 NO ACTIVE FORM
      if (!res || !res.has_active_form || !res.form) {
        setSelectedForm(null);
        return;
      }

      // 🟢 SET REAL FORM
      setSelectedForm(res.form);
      initializeFormData(res.form);

    } catch (error) {
      console.error("Failed to fetch active form:", error);
      setSelectedForm(null);
    } finally {
      setFormLoading(false);
    }
  };


  const fetchSystemFieldData = async (fields: FormField[]) => {
    const hasClientField = fields.some(isClientSystemField);
    const hasDocTypeField = fields.some(isDocumentTypeSystemField);

    try {

      if (hasClientField) {
        if (isClientUser) {
          const client = await clientService.getMyClient();

          setClients([
            {
              id: client.id,
              name:
                client.business_name ||
                `${client.first_name} ${client.last_name}`.trim()
            }
          ]);
        } else {
          const res = await clientService.getAllClients();

          setClients(
            res.map(c => ({
              id: c.id,
              name: c.name.trim()
            }))
          );

          // setClients(
          //   res.map(c => ({
          //     id: c.id,
          //     name:
          //       c.business_name ||
          //       `${c.first_name} ${c.last_name}`.trim()
          //   }))
          // );
        }
      }

      /* =========================
         DOCUMENT TYPE DROPDOWN
         ========================= */
      if (hasDocTypeField) {
        const types = await documentTypeService.getActiveDocumentTypes();
        setDocumentTypes(
          types.map(t => ({
            id: t.id,
            name: t.name
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch system field data", err);
    }
  };

  const initializeFormData = (form: Form) => {
    setFormData(prev => {
      const next = { ...prev };

      form.fields?.forEach(field => {
        if (
          isClientUser &&
          field.is_system &&
          field.label.toLowerCase() === "client"
        ) {
          return; // keep auto-filled client
        }

        if (field.field_type === "checkbox") {
          next[field.id!] = field.default_value ?? [];
        }

        else if (field.field_type === "date") {
          const today = new Date();

          const formatted =
            today.getFullYear() +
            "-" +
            String(today.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(today.getDate()).padStart(2, "0");

          next[field.id!] = field.default_value ?? formatted;
        }

        else {
          next[field.id!] = field.default_value ?? "";
        }

      });

      return next;
    });
  };




  const handleFormFieldChange = async (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));

    // Check if this field is Document Type
    const field = selectedForm?.fields?.find((f) => f.id === fieldId);
    if (field && isDocumentTypeSystemField(field)) {
      // Fetch templates for this doc type
      try {
        if (value) {
          // const response = await apiClient...
          // For safety, I will verify services if this fails.
        }
      } catch (e) {
        console.error("Failed to fetch templates", e);
      }
    }

    if (formErrors[fieldId]) {
      setFormErrors((prev) => ({ ...prev, [fieldId]: "" }));
    }
  };

  const validateForm = (): boolean => {
    if (!selectedForm?.fields) return true;

    const newErrors: Record<string, string> = {};

    selectedForm.fields.forEach((field) => {
      // 🔥 SKIP CLIENT VALIDATION FOR CLIENT USERS
      if (
        isClientUser &&
        field.is_system &&
        field.label.toLowerCase() === "client"
      ) {
        return;
      }

      if (field.required && !formData[field.id || ""]) {
        newErrors[field.id || ""] = `${field.label} is required`;
      }
    });

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setToast({ message: "Please select at least one file", type: "warning" });
      return;
    }
    if (!isClientUser && selectedForm && !validateForm()) {
      return;
    }


    const activeForm = selectedForm; // Alias for closure clarity if needed
    const clientField = selectedForm?.fields?.find(
      f => f.is_system && f.label.toLowerCase() === "client"
    );

    setUploading(true);

    try {
      const { addUpload } = uploadStore.getState();

      // Keep track of tempIds to map back to results
      const tempIds: string[] = [];

      // Add files to upload store immediately
      files.forEach((file) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        tempIds.push(tempId);
        addUpload({
          tempId,
          filename: file.name,
          fileSize: file.size,
          status: "queued",
          progress: 0,
          createdAt: new Date().toISOString(),
        });
      });

      // Find Document Type ID from formData
      let documentTypeId: string | undefined;
      if (selectedForm && selectedForm.fields) {
        const docTypeField = selectedForm.fields.find(
          (f: FormField) =>
            (f as any).is_system &&
            f.label.toLowerCase().includes("document type"),
        );
        if (docTypeField && docTypeField.id) {
          documentTypeId = formData[docTypeField.id];
        }
      }
      const payloadFormData = { ...formData };
      // console.log("isClientUser", isClientUser);
      // console.log("fields", selectedForm?.fields);

      if (isClientUser && clientField?.id) {
        payloadFormData[clientField.id] = currentUser.client_id;
      }


      // Start upload process (returns immediately with queued documents)
      const uploadResults = await documentService.uploadDocuments(files, {
        enableAI,
        documentTypeId,
        formId: selectedForm?.id,
        customFormData: payloadFormData,
      });
      // console.log("Upload initiated:", uploadResults);

      // Update upload store with document IDs
      const { updateUpload } = uploadStore.getState();
      uploadResults.forEach((result, index) => {
        const tempId = tempIds[index];
        if (tempId) {
          updateUpload(tempId, {
            documentId: result.id,
            status: "uploading",
          });
        }
      });

      // Show success message
      // Show success message
      // console.log(`${uploadResults.length} document(s) queued for upload.`);

      // Navigate immediately to documents list to show queued documents
      navigate("/documents");
    } catch (error) {
      console.error("Upload failed:", error);
      setToast({ message: "Upload failed. Please try again.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const fieldId = field.id || "";
    const hasError = !!formErrors[fieldId];

    // 🔒 CLIENT USERS: HIDE CLIENT FIELD COMPLETELY
    let value = formData[fieldId] || "";

    if (isClientSystemField(field)) {

      const value = isClientUser
        ? currentUser?.client_id ?? ""
        : formData[field.id!] ?? "";
      // console.log("CLIENT DROPDOWN DEBUG", {
      //   value,
      //   options: clients,
      //   userClientId: currentUser?.client_id
      // });

      return (
        <CommonDropdown
          key={`${field.id}-${clients.length}`}   // 🔥 FORCE REMOUNT
          value={value}
          options={clients.map(c => ({
            value: c.id,
            label: c.name
          }))}
          onChange={val => handleFormFieldChange(field.id!, val)}
          disabled={isClientUser}
          size="md"
        />
      );
    }



    if (isDocumentTypeSystemField(field)) {
      return (
        <CommonDropdown
          value={value}
          onChange={val => handleFormFieldChange(fieldId, val)}
          options={[
            { value: '', label: 'Select document type' },
            ...documentTypes.map(t => ({ value: t.id, label: t.name }))
          ]}
          size="md"
        />
      );
    }

    switch (field.field_type) {
      case "textarea":
        return (
          <textarea
            className={`${styles.formInput} ${hasError ? styles.error : ""}`}
            value={value}
            onChange={(e) => handleFormFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case "select":
        return (
          <CommonDropdown
            value={value}
            onChange={(val) => handleFormFieldChange(fieldId, val)}
            options={[
              { value: "", label: field.placeholder || "Select an option" },
              ...(field.options?.map((opt) => ({ value: opt, label: opt })) ||
                []),
            ]}
            size="md"
          />
        );

      case "checkbox":
        return (
          <div className={styles.checkboxGroup}>
            {field.options?.map((option, index) => (
              <label key={index} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option);
                    handleFormFieldChange(fieldId, newValues);
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case "radio":
        return (
          <div className={styles.radioGroup}>
            {field.options?.map((option, index) => (
              <label key={index} className={styles.radioLabel}>
                <input
                  type="radio"
                  name={fieldId}
                  value={option}
                  checked={value === option}
                  onChange={(e) =>
                    handleFormFieldChange(fieldId, e.target.value)
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case "date":
        return (
          <CommonDatePicker
            selected={value ? new Date(value) : null}
            onChange={(date: Date | null) =>
              handleFormFieldChange(
                fieldId,
                date
                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                  : "",
              )
            }
            className={`${styles.formInput} ${hasError ? styles.error : ""}`}
            placeholderText={field.placeholder || "Select date"}
          />
        );

      default:
        return (
          <input
            type={field.field_type}
            className={`${styles.formInput} ${hasError ? styles.error : ""}`}
            value={value}
            onChange={(e) => handleFormFieldChange(fieldId, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate("/documents")}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className={styles.title}>Upload Documents</h1>
        </div>
        {files.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label
                className={styles.checkboxLabel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  padding: 0,
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={enableAI}
                  onChange={(e) => setEnableAI(e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>Enable AI Analysis</span>
              </label>
              <span
                className="tooltip-wrapper tooltip-bottom"
                data-tooltip="AI will automatically identify document types, extract data using all active templates (handling mixed documents), and generate a detailed Excel analysis report with confidence scores."
              >
                <Info size={16} style={{ color: "#64748b", cursor: "help" }} />
              </span>
            </div>

            <button
              className={styles.uploadButtonTop}
              onClick={handleUpload}
              disabled={uploading}
            >
              <Upload size={14} />
              {uploading ? "Queuing Documents..." : "Upload selected"}
            </button>
          </div>
        )}
      </div>

      <div className={!isClientUser ? styles.mainLayout : styles.mainLayoutClient} >
        {/* Left Section (60%) - Document Handling */}
        <div className={styles.leftSection}>
          <div className={styles.section}>
            <div
              className={`${styles.dropZone} ${dragActive ? styles.active : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload size={48} className={styles.uploadIcon} />
              <p className={styles.dropText}>Drag and drop files here</p>
              <p className={styles.orText}>or</p>
              <label className={styles.browseButton}>
                Browse Files
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.txt"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                />
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Selected Files</h3>
              <div className={styles.fileList}>
                {files.map((file, index) => (
                  <div key={index} className={styles.fileItem}>
                    <FileText size={20} />
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      className={styles.removeButton}
                      onClick={() => removeFile(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Section (40%) - Dynamic Form */}
        {!isClientUser && (
          <div className={styles.rightSection}>
            {formLoading ? (
              <div className={styles.section}>
                <div className={styles.loadingState}>
                  <p>Loading form...</p>
                </div>
              </div>
            ) : !selectedForm ? (
              <div className={styles.section}>
                <div className={styles.noFormState}>
                  <p>No active form configured</p>
                </div>
              </div>
            ) : (
              <div className={styles.formContainer}>
                <div className={styles.formHeader}>
                  <h3 className={styles.formTitle}>{selectedForm.name}</h3>
                  {selectedForm.description && (
                    <p className={styles.formDescription}>
                      {selectedForm.description}
                    </p>
                  )}
                </div>

                <div className={styles.formFields}>
                  {selectedForm.fields?.map((field) => (
                    <div key={field.id} className={styles.formGroup}>
                      <label className={styles.label}>
                        {field.label}
                        {field.required && (
                          <span className={styles.required}>*</span>
                        )}
                      </label>
                      {renderFormField(field)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* <div className={styles.rightSection}>
  {formLoading ? (
    <div className={styles.section}>
      <div className={styles.loadingState}>
        <p>Loading form...</p>
      </div>
    </div>
  ) : !selectedForm ? (
    <div className={styles.section}>
      <div className={styles.noFormState}>
        <p>No active form configured</p>
      </div>
    </div>
  ) : (
    <div className={styles.formContainer}>
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>{selectedForm.name}</h3>
        {selectedForm.description && (
          <p className={styles.formDescription}>
            {selectedForm.description}
          </p>
        )}
      </div>

      <div className={styles.formFields}>
        {selectedForm.fields?.map((field) => (
          <div key={field.id} className={styles.formGroup}>
            <label className={styles.label}>
              {field.label}
              {field.required && (
                <span className={styles.required}>*</span>
              )}
            </label>
            {renderFormField(field)}
          </div>
        ))}
      </div>
    </div>
  )} */}
      </div>
      {/* AI Processing Options */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default DocumentUpload;
