import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, PlayCircle, StopCircle, UserCheck, UserX, Briefcase } from 'lucide-react';
import Table from '../Table/Table';
import CommonPagination from '../Common/CommonPagination';
import Loading from '../Common/Loading';
import ConfirmModal from '../Common/ConfirmModal';
import Toast, { ToastType } from '../Common/Toast';
import ClientModal from './ClientModal';
import clientService, { Client } from '../../services/client.service';
import statusService, { Status } from '../../services/status.service';
import styles from './ClientManagement.module.css';
import '../Common/Tooltip.css';

const ClientManagement: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [clients, setClients] = useState<Client[]>([]);
    const [totalClients, setTotalClients] = useState(0);
    const [activeClients, setActiveClients] = useState(0);
    const [inactiveClients, setInactiveClients] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [activeStatusId, setActiveStatusId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; client: Client | null; action: 'delete' | 'toggle' }>({ 
        isOpen: false, 
        client: null, 
        action: 'delete' 
    });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        loadStatuses();
    }, []);

    useEffect(() => {
        loadClients();
    }, [currentPage, itemsPerPage, searchTerm]);

    const loadStatuses = async () => {
        try {
            const statusesData = await statusService.getStatuses();
            setStatuses(statusesData);
            const active = statusesData.find(s => s.name === 'ACTIVE');
            if (active) setActiveStatusId(active.id);
        } catch (error) {
            console.error('Failed to load statuses:', error);
        }
    };

    const loadClients = async () => {
        try {
            setLoading(true);
            const data = await clientService.getClients(currentPage + 1, itemsPerPage, searchTerm || undefined);
            setClients(data.clients);
            setTotalClients(data.total);
            
            const active = data.clients.filter(c => c.status_id === activeStatusId).length;
            setActiveClients(active);
            setInactiveClients(data.clients.length - active);
        } catch (error) {
            console.error('Failed to load clients:', error);
            setToast({ message: 'Failed to load clients', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = (client: Client) => {
        setConfirmModal({ isOpen: true, client, action: 'toggle' });
    };

    const handleDelete = (client: Client) => {
        setConfirmModal({ isOpen: true, client, action: 'delete' });
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingClient(null);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleModalSubmit = async (data: any) => {
        try {
            if (editingClient) {
                await clientService.updateClient(editingClient.id, data);
                setToast({ message: 'Client updated successfully', type: 'success' });
            } else {
                await clientService.createClient(data);
                setToast({ message: 'Client created successfully', type: 'success' });
            }
            handleModalClose();
            loadClients();
        } catch (error: any) {
            console.error('Failed to save client:', error);
            setToast({ message: error?.message || 'Failed to save client', type: 'error' });
        }
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.client) return;
        
        setActionLoading(confirmModal.client.id);
        try {
            if (confirmModal.action === 'delete') {
                await clientService.deleteClient(confirmModal.client.id);
                setToast({ message: 'Client deleted successfully', type: 'success' });
            } else {
                const isActive = confirmModal.client.status_id === activeStatusId;
                if (isActive) {
                    await clientService.deactivateClient(confirmModal.client.id);
                    setToast({ message: 'Client deactivated successfully', type: 'success' });
                } else {
                    await clientService.activateClient(confirmModal.client.id);
                    setToast({ message: 'Client activated successfully', type: 'success' });
                }
            }
            loadClients();
        } catch (error: any) {
            console.error('Failed to perform action:', error);
            setToast({ message: error?.message || 'Failed to perform action', type: 'error' });
        } finally {
            setActionLoading(null);
            setConfirmModal({ isOpen: false, client: null, action: 'delete' });
        }
    };

    const clientColumns = [
        { 
            key: 'name', 
            header: 'Name',
            render: (_: any, row: Client) => {
                if (row.business_name) return row.business_name;
                const name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ');
                return name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>;
            }
        },
        { 
            key: 'npi', 
            header: 'NPI',
            render: (value: string | null) => value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>
        },
        { 
            key: 'type', 
            header: 'Type',
            render: (value: string | null) => value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>N/A</span>
        },
        { 
            key: 'status_id', 
            header: 'Status',
            render: (value: string | null) => {
                const isActive = value === activeStatusId;
                return (
                    <span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: Client) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip="Edit">
                        <button className={`${styles.actionBtn} ${styles.edit}`} onClick={() => handleEdit(row)}>
                            <Edit2 size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip={row.status_id === activeStatusId ? 'Deactivate' : 'Activate'}>
                        <button
                            className={`${styles.actionBtn} ${row.status_id === activeStatusId ? styles.deactivate : styles.activate}`}
                            onClick={() => handleToggleStatus(row)}
                        >
                            {row.status_id === activeStatusId ? <StopCircle size={14} /> : <PlayCircle size={14} />}
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip="Delete">
                        <button className={`${styles.actionBtn} ${styles.delete}`} onClick={() => handleDelete(row)}>
                            <Trash2 size={14} />
                        </button>
                    </span>
                </div>
            )
        }
    ];

    if (loading) {
        return <Loading message="Loading clients..." />;
    }

    const clientStats = [
        { title: 'Total Clients', value: totalClients.toString(), icon: Users, color: 'blue' },
        { title: 'Active Clients', value: activeClients.toString(), icon: UserCheck, color: 'green' },
        { title: 'Inactive Clients', value: inactiveClients.toString(), icon: UserX, color: 'red' }
    ];

    return (
        <div className={styles.managementContent}>
            <div className={styles.statsGrid}>
                {clientStats.map((stat, index) => (
                    <div key={index} className={`${styles.statCard} ${styles[stat.color]}`}>
                        <div className={styles.statIcon}>
                            <stat.icon size={16} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{stat.value}</h3>
                            <p>{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.tableSection}>
                <div className={styles.tableHeader}>
                    <h2>
                        <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Clients
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(0);
                            }}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '14px',
                                width: '250px'
                            }}
                        />
                        <button className={styles.addBtn} onClick={handleAddNew}>
                            Add Client
                        </button>
                    </div>
                </div>
                {clients.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#64748b'
                    }}>
                        <Briefcase size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>No clients found</h3>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first client'}
                        </p>
                    </div>
                ) : (
                    <Table columns={clientColumns} data={clients} />
                )}
            </div>
            
            <CommonPagination
                show={totalClients > itemsPerPage}
                pageCount={Math.ceil(totalClients / itemsPerPage)}
                currentPage={currentPage}
                totalItems={totalClients}
                itemsPerPage={itemsPerPage}
                onPageChange={(data) => setCurrentPage(data.selected)}
                onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    setCurrentPage(0);
                }}
            />
            
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, client: null, action: 'delete' })}
                onConfirm={handleConfirmAction}
                title={confirmModal.action === 'delete' ? 'Delete Client' : (confirmModal.client?.status_id === activeStatusId ? 'Deactivate Client' : 'Activate Client')}
                message={confirmModal.action === 'delete' 
                    ? 'Are you sure you want to delete this client? This action cannot be undone.'
                    : `Are you sure you want to ${confirmModal.client?.status_id === activeStatusId ? 'deactivate' : 'activate'} this client?`
                }
                confirmText={confirmModal.action === 'delete' ? 'Delete' : (confirmModal.client?.status_id === activeStatusId ? 'Deactivate' : 'Activate')}
                type={confirmModal.action === 'delete' ? 'danger' : 'warning'}
            />
            
            <ClientModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                initialData={editingClient || undefined}
                title={editingClient ? 'Edit Client' : 'Add New Client'}
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

export default ClientManagement;
