import React, { useState, useEffect } from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  FileText,
  CheckCircle,
  Eye as ViewIcon,
  Download,
  Trash2,
} from "lucide-react";
import formService from "../../../services/form.service";
import documentListConfigService, {
  DocumentListConfigRequest,
} from "../../../services/documentListConfig.service";
import Toast, { ToastType } from "../../Common/Toast";
import Loading from "../../Common/Loading";
import styles from "./DocumentListingView.module.css";

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
  width: number;
  type: string;
  required: boolean;
  isSystem: boolean;
  fieldType?: string;
  formName?: string;
}

const DocumentListingView: React.FC = () => {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // Default system columns
  const defaultSystemColumns: ColumnConfig[] = [
    {
      id: "name",
      label: "Document Name",
      visible: true,
      order: 1,
      width: 200,
      type: "text",
      required: false,
      isSystem: true,
    },
    {
      id: "type",
      label: "Type",
      visible: true,
      order: 2,
      width: 120,
      type: "text",
      required: false,
      isSystem: true,
    },
    {
      id: "size",
      label: "Size",
      visible: true,
      order: 3,
      width: 100,
      type: "text",
      required: false,
      isSystem: true,
    },
    {
      id: "pages",
      label: "Pages",
      visible: true,
      order: 4,
      width: 80,
      type: "number",
      required: false,
      isSystem: true,
    },

    {
      id: "uploadedAt",
      label: "Uploaded",
      visible: true,
      order: 5,
      width: 150,
      type: "date",
      required: false,
      isSystem: true,
    },
    {
      id: "status",
      label: "Status",
      visible: true,
      order: 6,
      width: 120,
      type: "text",
      required: true,
      isSystem: true,
    },
    {
      id: "actions",
      label: "Actions",
      visible: true,
      order: 7,
      width: 100,
      type: "text",
      required: true,
      isSystem: true,
    },
  ];
  const ensureSystemColumns = (
    defaults: ColumnConfig[],
    saved: ColumnConfig[],
  ): ColumnConfig[] => {
    const savedIds = new Set(saved.map((c) => c.id));

    const missingSystemColumns = defaults.filter(
      (col) => col.isSystem && !savedIds.has(col.id),
    );

    if (missingSystemColumns.length === 0) {
      return saved;
    }

    // Append missing system columns at the end
    const maxOrder = Math.max(...saved.map((c) => c.order), 0);

    const injected = missingSystemColumns.map((col, index) => ({
      ...col,
      order: maxOrder + index + 1,
      visible: true,
    }));

    return [...saved, ...injected];
  };


const loadColumns = React.useCallback(async () => {
    try {
      setLoading(true);

      // Load system columns
      let allColumns = [...defaultSystemColumns];

      // Try to load form fields to add as additional columns
      try {
        const activeForm = await formService.getActiveForm();
        if (activeForm.fields) {
          const formColumns: ColumnConfig[] = activeForm.fields.map(
            (field, index) => ({
              id: `form_${field.id || field.label.toLowerCase().replace(/\s+/g, "_")}`,
              label: field.label,
              visible: false, // Default to hidden for form fields
              order: defaultSystemColumns.length + index + 1,
              width: 150,
              type: field.field_type || "text",
              required: false,
              isSystem: false,
              fieldType: field.field_type,
              formName: activeForm.name,
            }),
          );
          allColumns = [...allColumns, ...formColumns];
        }
      } catch (error) {
        // No active form or error loading form fields
        console.log("No active form found or error loading form fields");
      }

      // Load saved configuration from backend
      try {
        const response = await documentListConfigService.getUserConfig();
        if (response.configuration) {
          const savedColumns = response.configuration.columns;

          // Merge saved config
          let merged = allColumns.map((col) => {
            const savedCol = savedColumns.find((s) => s.id === col.id);
            return savedCol
              ? {
                  ...col,
                  visible: savedCol.visible,
                  order: savedCol.order,
                  width: savedCol.width,
                }
              : col;
          });

          // 🔥 Inject missing system columns like "pages"
          merged = ensureSystemColumns(allColumns, merged);

          allColumns = merged;
        }
      } catch (error) {
        console.error("Error fetching saved column config:", error);
      }

      // Sort by order
      allColumns.sort((a, b) => a.order - b.order);
      setColumns(allColumns);
    } catch (error) {
      console.error("Error loading columns:", error);
      setToast({
        message: "Failed to load column configuration",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);
    useEffect(() => {
    loadColumns();
  }, [loadColumns]);
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedItem(columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = columns.findIndex((col) => col.id === draggedItem);
    const targetIndex = columns.findIndex((col) => col.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);

    // Update order values
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      order: index + 1,
    }));

    setColumns(updatedColumns);
    setDraggedItem(null);
  };

  const toggleVisibility = (columnId: string) => {
    const visibleCount = columns.filter((col) => col.visible).length;
    const column = columns.find((col) => col.id === columnId);

    if (column?.visible) {
      // Allow hiding if not required column
      if (!column.required) {
        setColumns((prev) =>
          prev.map((col) =>
            col.id === columnId ? { ...col, visible: false } : col,
          ),
        );
      }
    } else {
      setColumns((prev) =>
        prev.map((col) =>
          col.id === columnId ? { ...col, visible: true } : col,
        ),
      );
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);

      const config: DocumentListConfigRequest = {
        columns: columns.map((col) => ({
          id: col.id,
          label: col.label,
          visible: col.visible,
          order: col.order,
          width: col.width,
          type: col.type,
          required: col.required,
          isSystem: col.isSystem,
          formName: col.formName,
        })),
        viewportWidth: window.innerWidth,
      };

      await documentListConfigService.saveUserConfig(config);
      setToast({
        message: "Column configuration saved successfully",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving configuration:", error);
      setToast({ message: "Failed to save configuration", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    const resetColumns = [...defaultSystemColumns];
    setColumns(resetColumns);
    try {
      await documentListConfigService.deleteUserConfig();
      setToast({ message: "Configuration reset to default", type: "success" });
    } catch (error) {
      setToast({ message: "Failed to reset configuration", type: "error" });
    }
  };

  if (loading) return <Loading message="Loading column configuration..." />;

  return (
    <div className={styles.container}>
      <div className={styles.preview}>
        <h3>Preview</h3>
        <div className={styles.previewTable}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns
                  .filter((col) => col.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((col) => (
                    <th key={col.id}>{col.label}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns
                  .filter((col) => col.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((col) => (
                    <td key={col.id}>
                      {col.id === "name" && (
                        <div className={styles.documentName}>
                          <FileText size={16} />
                          <span>Sample Document.pdf</span>
                        </div>
                      )}
                      {col.id === "type" && (
                        <span className={styles.documentType}>PDF</span>
                      )}
                      {col.id === "size" && <span>2.50 MB</span>}
                      {col.id === "pages" && <span>12</span>}
                      {col.id === "uploadedAt" && (
                        <span>{new Date().toLocaleDateString()}</span>
                      )}
                      {col.id === "status" && (
                        <span className={styles.statusBadge}>
                          <CheckCircle size={12} />
                          Completed
                        </span>
                      )}
                      {col.id === "actions" && (
                        <div style={{ display: "flex" }}>
                          <span className={styles.actionBtn}>
                            <ViewIcon size={14} />
                          </span>
                          <span className={styles.actionBtn}>
                            <Download size={14} />
                          </span>
                          <span className={styles.actionBtn}>
                            <Trash2 size={14} />
                          </span>
                        </div>
                      )}
                      {!col.isSystem && (
                        <span style={{ color: "#94a3b8" }}>Sample Value</span>
                      )}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Document Listing View Configuration</h2>
          <p className={styles.description}>
            Configure which columns to display in the document listing page and
            their order. Drag and drop to reorder columns.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.resetButton} onClick={resetToDefault}>
            <RotateCcw size={16} />
            Reset to Default
          </button>
          <button
            className={styles.saveButton}
            onClick={saveConfiguration}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className={styles.columnList}>
        <div className={styles.listHeader}>
          <span>Column</span>
          <span>Type</span>
          <span>Visible</span>
        </div>

        {columns.map((column) => (
          <div
            key={column.id}
            className={`${styles.columnItem} ${draggedItem === column.id ? styles.dragging : ""}`}
            draggable
            onDragStart={(e) => handleDragStart(e, column.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={styles.dragHandle}>
              <GripVertical size={16} />
            </div>

            <div className={styles.columnInfo}>
              <span className={styles.columnLabel}>{column.label}</span>
            </div>

            <div className={styles.columnType}>
              <span
                className={`${styles.typeBadge} ${column.isSystem ? styles.system : styles.form}`}
              >
                {column.isSystem ? "System" : column.formName || "Form"}
              </span>
            </div>

            <div className={styles.visibilityToggle}>
              {column.required ? (
                <span className={styles.requiredLabel}>Required</span>
              ) : (
                <button
                  className={`${styles.toggleButton} ${column.visible ? styles.visible : styles.hidden}`}
                  onClick={() => toggleVisibility(column.id)}
                >
                  {column.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

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

export default DocumentListingView;
