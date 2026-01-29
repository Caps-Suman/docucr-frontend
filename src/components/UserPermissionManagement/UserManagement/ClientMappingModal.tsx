import React, { useState, useEffect } from 'react';
import { X, Search, Check, RefreshCw, Building2, UserCircle, Hash, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import userService, { User } from '../../../services/user.service';
import clientService, { Client } from '../../../services/client.service';
import Loading from '../../Common/Loading';
import Toast, { ToastType } from '../../Common/Toast';
import CommonPagination from '../../Common/CommonPagination';
import styles from './UserModal.module.css';
import './ClientMappingModal.css';

interface ClientMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onUpdate: () => void;
}

const ClientMappingModal: React.FC<ClientMappingModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'assigned' | 'unassigned'>('assigned');
    const [assignedClients, setAssignedClients] = useState<Client[]>([]);
    const [unassignedClients, setUnassignedClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [mappingLoading, setMappingLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Pagination State (0-indexed)
    const [assignedPage, setAssignedPage] = useState(0);
    const [unassignedPage, setUnassignedPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    useEffect(() => {
        if (isOpen && user) {
            loadData();
            setSelectedClientIds(new Set());
            setActiveTab('assigned');
            setAssignedPage(0);
            setUnassignedPage(0);
            setSearchTerm('');
            setItemsPerPage(5);
        }
    }, [isOpen, user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const assigned = await userService.getUserClients(user.id);
            setAssignedClients(assigned);

            const allClients = await clientService.getVisibleClients();
            const assignedIds = new Set(assigned.map((c: any) => c.id));
            const unassigned = allClients.filter(c => !assignedIds.has(c.id));

            setUnassignedClients(unassigned);
        } catch (error) {
            console.error('Failed to load client data:', error);
            setToast({ message: 'Failed to load client data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleMapClients = async () => {
        if (!user || selectedClientIds.size === 0) return;

        setMappingLoading(true);
        try {
            const storedUser = localStorage.getItem('user');
            const currentUser = storedUser ? JSON.parse(storedUser) : null;
            const assignedBy = currentUser?.id || user.id;

            await userService.mapUserClients(user.id, Array.from(selectedClientIds), assignedBy);

            setToast({ message: 'Clients mapped successfully', type: 'success' });
            setSelectedClientIds(new Set());
            loadData();
            onUpdate();
            setActiveTab('assigned');
        } catch (error: any) {
            console.error('Failed to map clients:', error);
            setToast({ message: error.message || 'Failed to map clients', type: 'error' });
        } finally {
            setMappingLoading(false);
        }
    };

    const toggleSelection = (clientId: string) => {
        const newSelection = new Set(selectedClientIds);
        if (newSelection.has(clientId)) {
            newSelection.delete(clientId);
        } else {
            newSelection.add(clientId);
        }
        setSelectedClientIds(newSelection);
    };

    // Filter Logic
    const filteredUnassigned = unassignedClients.filter(c => {
        const searchLower = searchTerm.toLowerCase();
        const businessNameMatch = c.business_name?.toLowerCase().includes(searchLower);
        const firstNameMatch = c.first_name?.toLowerCase().includes(searchLower);
        const lastNameMatch = c.last_name?.toLowerCase().includes(searchLower);
        const npiMatch = c.npi?.includes(searchTerm);

        return businessNameMatch || firstNameMatch || lastNameMatch || npiMatch;
    });

    // Reset page on search
    useEffect(() => {
        setUnassignedPage(0);
    }, [searchTerm]);

    // Pagination Logic
    const getPaginatedData = (data: Client[], page: number) => {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        return data.slice(start, end);
    };

    const totalAssignedPages = Math.ceil(assignedClients.length / itemsPerPage);
    const paginatedAssigned = getPaginatedData(assignedClients, assignedPage);

    const totalUnassignedPages = Math.ceil(filteredUnassigned.length / itemsPerPage);
    const paginatedUnassigned = getPaginatedData(filteredUnassigned, unassignedPage);

    if (!isOpen || !user) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="client-mapping-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Manage Client Access</h2>
                        <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                            For user <span style={{ fontWeight: 600, color: '#374151' }}>{user.first_name} {user.last_name}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
                        onClick={() => setActiveTab('assigned')}
                    >
                        Assigned ({assignedClients.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'unassigned' ? 'active' : ''}`}
                        onClick={() => setActiveTab('unassigned')}
                    >
                        Available to Assign
                    </button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <Loading message="Loading data..." />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'assigned' && (
                                <div className="tab-content">
                                    {assignedClients.length === 0 ? (
                                        <div className="no-data">
                                            <div className="no-data-icon">
                                                <Building2 size={24} />
                                            </div>
                                            <h3>No clients assigned</h3>
                                            <p style={{ fontSize: '13px' }}>Switch to the "Available" tab to assign clients.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="table-container">
                                                <table className="mapping-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Client Details</th>
                                                            <th>NPI Number</th>
                                                            <th>Type</th>
                                                            <th>Assigned Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedAssigned.map((client: any) => (
                                                            <tr key={client.id}>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <span className="client-name">{client.business_name || `${client.first_name} ${client.last_name}`}</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className="client-npi">{client.npi || 'N/A'}</span>
                                                                </td>
                                                                <td>
                                                                    <span className="client-type-badge">{client.type || 'Standard'}</span>
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px' }}>
                                                                        <Calendar size={14} />
                                                                        {new Date().toLocaleDateString()}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                                                <CommonPagination
                                                    show={assignedClients.length > 0}
                                                    pageCount={totalAssignedPages}
                                                    currentPage={assignedPage}
                                                    totalItems={assignedClients.length}
                                                    itemsPerPage={itemsPerPage}
                                                    onPageChange={(data) => setAssignedPage(data.selected)}
                                                    onItemsPerPageChange={(items) => {
                                                        setItemsPerPage(items);
                                                        setAssignedPage(0);
                                                    }}
                                                    renderInPlace={true}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'unassigned' && (
                                <div className="tab-content">
                                    <div className="search-bar">
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search by client name or NPI..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="table-container">
                                        <table className="mapping-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px', paddingLeft: '24px' }}>
                                                        <div style={{ width: '16px' }} />
                                                    </th>
                                                    <th>Client Details</th>
                                                    <th>NPI Number</th>
                                                    <th>Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedUnassigned.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4}>
                                                            <div className="no-data" style={{ padding: '40px 0' }}>
                                                                <p>No matching clients found.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedUnassigned.map(client => (
                                                        <tr
                                                            key={client.id}
                                                            onClick={() => toggleSelection(client.id)}
                                                            className={selectedClientIds.has(client.id) ? 'selected-row' : ''}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <td style={{ paddingLeft: '24px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedClientIds.has(client.id)}
                                                                        onChange={() => toggleSelection(client.id)}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <span className="client-name">{client.business_name || `${client.first_name} ${client.last_name}`}</span>
                                                                </div>
                                                            </td>
                                                            <td><span className="client-npi">{client.npi || 'N/A'}</span></td>
                                                            <td><span className="client-type-badge">{client.type || 'Standard'}</span></td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                                        <CommonPagination
                                            show={filteredUnassigned.length > 0}
                                            pageCount={totalUnassignedPages}
                                            currentPage={unassignedPage}
                                            totalItems={filteredUnassigned.length}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={(data) => setUnassignedPage(data.selected)}
                                            onItemsPerPageChange={(items) => {
                                                setItemsPerPage(items);
                                                setUnassignedPage(0);
                                            }}
                                            renderInPlace={true}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    {activeTab === 'unassigned' && (
                        <>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '13px' }}>
                                {selectedClientIds.size > 0 && (
                                    <span>
                                        <span style={{ fontWeight: 600, color: '#2563eb' }}>{selectedClientIds.size}</span> client{selectedClientIds.size !== 1 ? 's' : ''} selected
                                    </span>
                                )}
                            </div>
                            <button type="submit" className={styles.submitButton} disabled={selectedClientIds.size === 0 || mappingLoading} onClick={handleMapClients}>
                                {mappingLoading ? 'Mapping...' : 'Map Selected Clients'}
                            </button>
                        </>
                    )}
                    {activeTab === 'assigned' && (
                        <button className="submit-btn" style={{ background: '#f3f4f6', color: '#374151', padding: '10px 20px', border: '1px solid #e5e7eb', boxShadow: 'none' }} onClick={onClose}>
                            Close
                        </button>
                    )}
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default ClientMappingModal;
