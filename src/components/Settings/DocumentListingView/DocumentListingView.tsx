import React, { useState, useEffect } from 'react';
import { GripVertical, Eye, EyeOff, Save, RotateCcw, FileText, CheckCircle, Eye as ViewIcon, Download, Trash2 } from 'lucide-react';
import formService, { FormField } from '../../../services/form.service';
import documentListConfigService, { ColumnConfig as ServiceColumnConfig, DocumentListConfigRequest } from '../../../services/documentListConfig.service';
import Toast, { ToastType } from '../../Common/Toast';
import Loading from '../../Common/Loading';
import styles from './DocumentListingView.module.css';

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
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const tablePreviewRef = React.useRef<HTMLDivElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // Default system columns
    const defaultSystemColumns: ColumnConfig[] = [
        { id: 'name', label: 'Document Name', visible: true, order: 1, width: 200, type: 'text', required: false, isSystem: true },
        { id: 'type', label: 'Type', visible: true, order: 2, width: 120, type: 'text', required: false, isSystem: true },
        { id: 'size', label: 'Size', visible: true, order: 3, width: 100, type: 'text', required: false, isSystem: true },
        { id: 'pages', label: 'Pages', visible: true, order: 4, width: 80, type: 'number', required: false, isSystem: true },
        { id: 'uploadedAt', label: 'Uploaded', visible: true, order: 5, width: 150, type: 'date', required: false, isSystem: true },
        { id: 'status', label: 'Status', visible: true, order: 6, width: 120, type: 'text', required: true, isSystem: true },
        { id: 'actions', label: 'Actions', visible: true, order: 7, width: 100, type: 'text', required: true, isSystem: true }
    ];

    useEffect(() => {
        loadColumns();
    }, []);

    const checkScroll = () => {
        if (tablePreviewRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tablePreviewRef.current;
            const hasOverflow = scrollWidth > clientWidth;
            const atTheEnd = scrollLeft + clientWidth >= scrollWidth - 5;
            setIsScrolled(hasOverflow && !atTheEnd);
        }
    };

    useEffect(() => {
        checkScroll();
        const container = tablePreviewRef.current;
        if (container) {
            container.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', checkScroll);
            }
            window.removeEventListener('resize', checkScroll);
        };
    }, [columns, loading]);


    const loadColumns = async () => {
        try {
            setLoading(true);

            // Load system columns
            let allColumns = [...defaultSystemColumns];
            let activeFormName = '';

            // Try to load form fields to add as additional columns
            try {
                const activeForm = await formService.getActiveForm();
                activeFormName = activeForm.name;
                if (activeForm.fields) {
                    const formColumns: ColumnConfig[] = activeForm.fields.map((field, index) => ({
                        id: `form_${field.id}`,
                        label: field.label,
                        visible: false, // Default to hidden for form fields
                        order: defaultSystemColumns.length + index + 1,
                        width: 150,
                        type: field.field_type || 'text',
                        required: false,
                        isSystem: false,
                        fieldType: field.field_type,
                        formName: activeForm.name
                    }));
                    allColumns = [...allColumns, ...formColumns];
                }
            } catch (error) {
                // No active form or error loading form fields
                console.log('No active form found or error loading form fields');
            }

            // Load saved configuration from backend
            try {
                const response = await documentListConfigService.getUserConfig();
                if (response.configuration && response.configuration.columns) {
                    const savedColumns = response.configuration.columns;

                    // Create a map of available columns for quick lookup
                    const availableColumnsMap = new Map(allColumns.map(col => [col.id, col]));

                    // Use saved columns and enrich with metadata, filter out columns that no longer exist
                    const mergedColumns: ColumnConfig[] = savedColumns
                        .map(savedCol => {
                            const existingCol = availableColumnsMap.get(savedCol.id);
                            // If column exists in available columns, use it
                            if (existingCol) {
                                return {
                                    ...savedCol,
                                    isSystem: existingCol.isSystem,
                                    formName: existingCol.formName,
                                    fieldType: existingCol.fieldType
                                };
                            }
                            // For columns not in available list, infer isSystem from ID
                            return {
                                ...savedCol,
                                isSystem: !savedCol.id.startsWith('form_'),
                                formName: savedCol.id.startsWith('form_') ? activeFormName : undefined,
                                fieldType: undefined
                            };
                        });

                    // Add any new columns that weren't in saved config
                    allColumns.forEach(col => {
                        if (!savedColumns.find(s => s.id === col.id)) {
                            mergedColumns.push(col);
                        }
                    });

                    allColumns = mergedColumns;
                }
            } catch (error) {
                console.error('Error fetching saved column config:', error);
            }

            // Ensure status and actions are always at the end
            const fixedIds = ['status', 'actions'];
            const normalColumns = allColumns.filter(col => !fixedIds.includes(col.id));
            const fixedColumns = allColumns.filter(col => fixedIds.includes(col.id));

            // Sort fixed columns by their preferred order if both present
            fixedColumns.sort((a, b) => {
                if (a.id === 'status') return -1;
                return 1;
            });

            allColumns = [...normalColumns, ...fixedColumns].map((col, index) => ({
                ...col,
                order: index + 1
            }));

            setColumns(allColumns);
        } catch (error) {
            console.error('Error loading columns:', error);
            setToast({ message: 'Failed to load column configuration', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, columnId: string) => {
        if (columnId === 'status' || columnId === 'actions') {
            e.preventDefault();
            return;
        }
        setDraggedItem(columnId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();

        if (!draggedItem || draggedItem === targetId) {
            setDraggedItem(null);
            return;
        }

        // Prevent dropping on fixed columns
        if (targetId === 'status' || targetId === 'actions') {
            setDraggedItem(null);
            return;
        }

        const draggedIndex = columns.findIndex(col => col.id === draggedItem);
        const targetIndex = columns.findIndex(col => col.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedItem(null);
            return;
        }

        const newColumns = [...columns];
        const [draggedColumn] = newColumns.splice(draggedIndex, 1);
        newColumns.splice(targetIndex, 0, draggedColumn);

        // Ensure status and actions remain at the end even after reorder logic if somehow compromised
        const fixedIds = ['status', 'actions'];
        const normalColumns = newColumns.filter(col => !fixedIds.includes(col.id));
        const fixedColumns = newColumns.filter(col => fixedIds.includes(col.id));

        // Update order values
        const finalColumns = [...normalColumns, ...fixedColumns].map((col, index) => ({
            ...col,
            order: index + 1
        }));

        setColumns(finalColumns);
        setDraggedItem(null);
    };

    const toggleVisibility = (columnId: string) => {
        const column = columns.find(col => col.id === columnId);

        if (column?.visible) {
            // Allow hiding if not required column
            if (!column.required) {
                setColumns(prev => prev.map(col =>
                    col.id === columnId ? { ...col, visible: false } : col
                ));
            }
        } else {
            setColumns(prev => prev.map(col =>
                col.id === columnId ? { ...col, visible: true } : col
            ));
        }
    };

    const saveConfiguration = async () => {
        try {
            setSaving(true);

            const config: DocumentListConfigRequest = {
                columns: columns.map(col => ({
                    id: col.id,
                    label: col.label,
                    visible: col.visible,
                    order: col.order,
                    width: col.width,
                    type: col.type,
                    required: col.required,
                    isSystem: col.isSystem,
                    formName: col.formName
                })),
                viewportWidth: window.innerWidth
            };

            await documentListConfigService.saveUserConfig(config);
            setToast({ message: 'Column configuration saved successfully', type: 'success' });
        } catch (error) {
            console.error('Error saving configuration:', error);
            setToast({ message: 'Failed to save configuration', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const resetToDefault = async () => {
        const resetColumns = [...defaultSystemColumns];
        setColumns(resetColumns);
        try {
            await documentListConfigService.deleteUserConfig();
            setToast({ message: 'Configuration reset to default', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to reset configuration', type: 'error' });
        }
    };

    if (loading) return <Loading message="Loading column configuration..." />;

    return (
        <div className={styles.container}>
            <div className={styles.preview}>
                <h3>Preview</h3>
                <div
                    ref={tablePreviewRef}
                    className={`${styles.previewTable} ${isScrolled ? styles.hasScrollShadow : ''}`}
                >
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input type="checkbox" className={styles.checkbox} readOnly />
                                </th>
                                {columns
                                    .filter(col => col.visible)
                                    .map(col => (
                                        <th
                                            key={col.id}
                                            className={
                                                col.id === 'status'
                                                    ? `${styles.stickyCol} ${styles.stickyStatus}`
                                                    : col.id === 'actions'
                                                        ? `${styles.stickyCol} ${styles.stickyActions}`
                                                        : ''
                                            }
                                        >
                                            {col.label}
                                        </th>
                                    ))
                                }
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ width: '40px' }}>
                                    <input type="checkbox" className={styles.checkbox} readOnly />
                                </td>
                                {columns
                                    .filter(col => col.visible)
                                    .map(col => (
                                        <td
                                            key={col.id}
                                            className={
                                                col.id === 'status'
                                                    ? `${styles.stickyCol} ${styles.stickyStatus}`
                                                    : col.id === 'actions'
                                                        ? `${styles.stickyCol} ${styles.stickyActions}`
                                                        : ''
                                            }
                                        >
                                            {col.id === 'name' && (
                                                <div className={styles.documentName}>
                                                    <FileText size={16} />
                                                    <span>Sample Document.pdf</span>
                                                </div>
                                            )}
                                            {col.id === 'type' && <span className={styles.documentType}>PDF</span>}
                                            {col.id === 'size' && <span>2.50 MB</span>}
                                            {col.id === 'pages' && <span>12</span>}
                                            {col.id === 'uploadedAt' && <span>{new Date().toLocaleDateString()}</span>}
                                            {col.id === 'status' && (
                                                <span className={styles.statusBadge}>
                                                    <CheckCircle size={12} />
                                                    Completed
                                                </span>
                                            )}
                                            {col.id === 'actions' && (
                                                <div style={{ display: 'flex' }}>
                                                    <span className={styles.actionBtn}><ViewIcon size={14} /></span>
                                                    <span className={styles.actionBtn}><Download size={14} /></span>
                                                    <span className={styles.actionBtn}><Trash2 size={14} /></span>
                                                </div>
                                            )}
                                            {!col.isSystem && <span style={{ color: '#94a3b8' }}>Sample Value</span>}
                                        </td>
                                    ))
                                }
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Document Listing View Configuration</h2>
                    <p className={styles.description}>
                        Configure which columns to display in the document listing page and their order.
                        Drag and drop to reorder columns.
                    </p>
                </div>
                <div className={styles.actions}>
                    <button
                        className={styles.resetButton}
                        onClick={resetToDefault}
                    >
                        <RotateCcw size={16} />
                        Reset to Default
                    </button>
                    <button
                        className={styles.saveButton}
                        onClick={saveConfiguration}
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className={styles.columnList}>
                <div className={styles.listHeader}>
                    <span></span>
                    <span>Column</span>
                    <span>Source</span>
                    <span>Visibility</span>
                </div>

                {columns.map((column) => {
                    const isFixed = column.id === 'status' || column.id === 'actions';
                    return (
                        <div
                            key={column.id}
                            className={`${styles.columnItem} ${draggedItem === column.id ? styles.dragging : ''} ${isFixed ? styles.fixedItem : ''}`}
                            draggable={!isFixed}
                            onDragStart={(e) => handleDragStart(e, column.id)}
                            onDragOver={isFixed ? undefined : handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className={styles.dragHandle} style={{ cursor: isFixed ? 'default' : 'grab', opacity: isFixed ? 0.3 : 1 }}>
                                <GripVertical size={16} />
                            </div>

                            <div className={styles.columnInfo}>
                                <span className={styles.columnLabel}>
                                    {column.label}
                                    {isFixed && <span className={styles.fixedBadge}>Fixed</span>}
                                </span>
                            </div>

                            <div className={styles.columnType}>
                                <span className={`${styles.typeBadge} ${column.isSystem ? styles.system : styles.form}`}>
                                    {column.isSystem ? 'System' : (column.formName || 'Form')}
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
                    );
                })}
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