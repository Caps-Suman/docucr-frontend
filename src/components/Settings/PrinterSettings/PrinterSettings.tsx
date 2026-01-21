import React, { useState, useEffect } from 'react';
import { Plus, Printer as PrinterIcon, Edit2, Trash2, Power } from 'lucide-react';
import Table from '../../Table/Table';
import Loading from '../../Common/Loading';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';
import PrinterModal from './PrinterModal';
import printerService, { Printer } from '../../../services/printer.service';
import styles from './PrinterSettings.module.css';

const PrinterSettings: React.FC = () => {
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; printerId: string | null }>({
        isOpen: false,
        printerId: null
    });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        loadPrinters();
    }, []);

    const loadPrinters = async () => {
        try {
            setLoading(true);
            const data = await printerService.getPrinters();
            setPrinters(data);
        } catch (error) {
            setToast({ message: 'Failed to load printers', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (printer: Printer) => {
        setEditingPrinter(printer);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmModal.printerId) return;

        try {
            await printerService.deletePrinter(confirmModal.printerId);
            setToast({ message: 'Printer deleted successfully', type: 'success' });
            loadPrinters();
        } catch (error) {
            setToast({ message: 'Failed to delete printer', type: 'error' });
        } finally {
            setConfirmModal({ isOpen: false, printerId: null });
        }
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (editingPrinter) {
                await printerService.updatePrinter(editingPrinter.id, data);
                setToast({ message: 'Printer updated successfully', type: 'success' });
            } else {
                await printerService.createPrinter(data);
                setToast({ message: 'Printer added successfully', type: 'success' });
            }
            setIsModalOpen(false);
            setEditingPrinter(null);
            loadPrinters();
        } catch (error) {
            setToast({ message: 'Failed to save printer', type: 'error' });
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'Printer Name',
            render: (value: string, row: Printer) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={styles.iconWrapper}>
                        <PrinterIcon size={16} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 500 }}>{row.name}</div>
                        {row.description && <div style={{ fontSize: '12px', color: '#6b7280' }}>{row.description}</div>}
                    </div>
                </div>
            )
        },
        {
            key: 'address',
            header: 'Address',
            render: (_: any, row: Printer) => (
                <span style={{ fontFamily: 'monospace' }}>
                    {row.ip_address}:{row.port}
                </span>
            )
        },
        {
            key: 'protocol',
            header: 'Protocol',
            render: (value: string) => <span className={styles.protocolBadge}>{value}</span>
        },
        {
            key: 'status',
            header: 'Status',
            render: (value: string) => (
                <span className={`${styles.statusBadge} ${value === 'ACTIVE' ? styles.active : styles.inactive}`}>
                    {value === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: Printer) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`${styles.actionBtn} ${styles.edit}`}
                        onClick={() => handleEdit(row)}
                        title="Edit Printer"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        className={`${styles.actionBtn} ${styles.delete}`}
                        onClick={() => setConfirmModal({ isOpen: true, printerId: row.id })}
                        title="Delete Printer"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )
        }
    ];

    if (loading) return <Loading message="Loading printers..." />;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleInfo}>
                    <h2>Physical Printers</h2>
                    <p>Manage network printers for document output.</p>
                </div>
                <button
                    className={styles.addBtn}
                    onClick={() => {
                        setEditingPrinter(null);
                        setIsModalOpen(true);
                    }}
                >
                    <Plus size={16} /> Add Printer
                </button>
            </div>

            {printers.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <PrinterIcon size={32} />
                    </div>
                    <h3>No Printers Configured</h3>
                    <p>Add a printer to start sending print jobs directly to hardware.</p>
                    <button
                        className={styles.addBtnSecondary}
                        onClick={() => {
                            setEditingPrinter(null);
                            setIsModalOpen(true);
                        }}
                    >
                        Add Your First Printer
                    </button>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <Table
                        columns={columns}
                        data={printers}
                        maxHeight="calc(100vh - 340px)"
                    />
                </div>
            )}

            <PrinterModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingPrinter(null);
                }}
                onSubmit={handleModalSubmit}
                title={editingPrinter ? 'Edit Printer' : 'Add New Printer'}
                initialData={editingPrinter || undefined}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, printerId: null })}
                onConfirm={handleDelete}
                title="Delete Printer"
                message="Are you sure you want to delete this printer configuration? This action cannot be undone."
                confirmText="Delete"
                type="danger"
            />

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

export default PrinterSettings;
