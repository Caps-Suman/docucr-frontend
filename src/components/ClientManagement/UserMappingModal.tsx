import React, { useState, useEffect } from 'react';
import { X, Search, Check, RefreshCw, UserCircle, Hash, Calendar, Mail, Phone, User } from 'lucide-react';
import userService, { User as AppUser } from '../../services/user.service';
import clientService, { Client } from '../../services/client.service';
import Loading from '../Common/Loading';
import Toast, { ToastType } from '../Common/Toast';
import CommonPagination from '../Common/CommonPagination';
import styles from '../UserPermissionManagement/UserManagement/UserModal.module.css';
import '../UserPermissionManagement/UserManagement/ClientMappingModal.css'; // Reuse existing styles

interface UserMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    onUpdate: () => void;
}

const UserMappingModal: React.FC<UserMappingModalProps> = ({ isOpen, onClose, client, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'assigned' | 'unassigned'>('assigned');
    const [assignedUsers, setAssignedUsers] = useState<any[]>([]); // Using any for now as endpoint returns minimal user details
    const [unassignedUsers, setUnassignedUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [mappingLoading, setMappingLoading] = useState(false);
    const [unassignLoading, setUnassignLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectedAssignedIds, setSelectedAssignedIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Pagination State (0-indexed)
    const [assignedPage, setAssignedPage] = useState(0);
    const [unassignedPage, setUnassignedPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    useEffect(() => {
        if (isOpen && client) {
            loadData();
            setSelectedUserIds(new Set());
            setSelectedAssignedIds(new Set());
            setActiveTab('assigned');
            setAssignedPage(0);
            setUnassignedPage(0);
            setSearchTerm('');
            setItemsPerPage(5);
        }
    }, [isOpen, client]);

    const loadData = async () => {
        if (!client) return;
        setLoading(true);
        try {
            // Fetch users assigned to this client
            // NOTE: We need to ensure clientService.getClientUsers returns the format we need
            const assigned = await clientService.getClientUsers(client.id);
            setAssignedUsers(assigned);

            // Fetch all available users to calculate unassigned
            // In a real large-scale app, we might want a specific API for "available users"
            // For now, mirroring ClientMappingModal logic: fetch all and filter
            const allUsersResp = await userService.getUsers(1, 1000); // Fetch mostly all
            const allUsers = allUsersResp.users;

            const assignedIds = new Set(assigned.map((u: any) => u.id));
            // Exclude SUPER_ADMIN from available list if needed, usually handled by API
            const unassigned = allUsers.filter(u => !assignedIds.has(u.id));

            setUnassignedUsers(unassigned);
        } catch (error) {
            console.error('Failed to load user data:', error);
            setToast({ message: 'Failed to load user data', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleMapUsers = async () => {
        if (!client || selectedUserIds.size === 0) return;

        setMappingLoading(true);
        try {
            const storedUser = localStorage.getItem('user');
            const currentUser = storedUser ? JSON.parse(storedUser) : null;
            const assignedBy = currentUser?.id || 'system';

            await clientService.mapClientUsers(client.id, Array.from(selectedUserIds), assignedBy);

            setToast({ message: 'Users mapped successfully', type: 'success' });
            setSelectedUserIds(new Set());
            loadData();
            onUpdate();
            setActiveTab('assigned');
        } catch (error: any) {
            console.error('Failed to map users:', error);
            setToast({ message: error.message || 'Failed to map users', type: 'error' });
        } finally {
            setMappingLoading(false);
        }
    };

    const handleUnassignUsers = async () => {
        if (!client || selectedAssignedIds.size === 0) return;

        setUnassignLoading(true);
        try {
            await clientService.unassignClientUsers(client.id, Array.from(selectedAssignedIds));

            setToast({ message: 'Users unassigned successfully', type: 'success' });
            setSelectedAssignedIds(new Set());
            loadData();
            onUpdate();
        } catch (error: any) {
            console.error('Failed to unassign users:', error);
            setToast({ message: error.message || 'Failed to unassign users', type: 'error' });
        } finally {
            setUnassignLoading(false);
        }
    };

    const toggleSelection = (userId: string) => {
        const newSelection = new Set(selectedUserIds);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedUserIds(newSelection);
    };

    const toggleAssignedSelection = (userId: string) => {
        const newSelection = new Set(selectedAssignedIds);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedAssignedIds(newSelection);
    };

    // Filter Logic
    const filteredUnassigned = unassignedUsers.filter(u => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchLower);
        const emailMatch = u.email?.toLowerCase().includes(searchLower);
        const usernameMatch = u.username?.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || usernameMatch;
    });

    // Reset page on search
    useEffect(() => {
        setUnassignedPage(0);
    }, [searchTerm]);

    // Pagination Logic
    const getPaginatedData = (data: any[], page: number) => {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        return data.slice(start, end);
    };

    const totalAssignedPages = Math.ceil(assignedUsers.length / itemsPerPage);
    const paginatedAssigned = getPaginatedData(assignedUsers, assignedPage);

    const totalUnassignedPages = Math.ceil(filteredUnassigned.length / itemsPerPage);
    const paginatedUnassigned = getPaginatedData(filteredUnassigned, unassignedPage);

    if (!isOpen || !client) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="client-mapping-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Manage User Access</h2>
                        <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                            For client <span style={{ fontWeight: 600, color: '#374151' }}> {client.first_name ? [client.first_name, client.middle_name, client.last_name].filter(Boolean).join(' ') : client.business_name}</span>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
                        onClick={() => setActiveTab('assigned')}
                    >
                        Assigned ({assignedUsers.length})
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
                                    {assignedUsers.length === 0 ? (
                                        <div className="no-data">
                                            <div className="no-data-icon">
                                                <UserCircle size={24} />
                                            </div>
                                            <h3>No users assigned</h3>
                                            <p style={{ fontSize: '13px' }}>Switch to the "Available" tab to assign users.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="table-container">
                                                <table className="mapping-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '40px', paddingLeft: '24px' }}>
                                                                <div style={{ width: '16px' }} />
                                                            </th>
                                                            <th>User Details</th>
                                                            <th>Contact</th>
                                                            <th>Assigned Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedAssigned.map((user: any) => (
                                                            <tr
                                                                key={user.id}
                                                                onClick={() => toggleAssignedSelection(user.id)}
                                                                className={selectedAssignedIds.has(user.id) ? 'selected-row' : ''}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                <td style={{ paddingLeft: '24px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedAssignedIds.has(user.id)}
                                                                            onChange={() => toggleAssignedSelection(user.id)}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        {/* <div className="user-initials" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                                                                            {(user.name || user.username || '?').substring(0, 2).toUpperCase()}
                                                                        </div> */}
                                                                        <div>
                                                                            <span className="client-name">{user.name}</span>
                                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>@{user.username}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px', color: '#4b5563' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <Mail size={12} color="#9ca3af" />
                                                                            {user.email}
                                                                        </div>
                                                                        {user.phone_number && (
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <Phone size={12} color="#9ca3af" />
                                                                                {user.phone_number}
                                                                            </div>
                                                                        )}
                                                                    </div>
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
                                                    show={assignedUsers.length > 0}
                                                    pageCount={totalAssignedPages}
                                                    currentPage={assignedPage}
                                                    totalItems={assignedUsers.length}
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
                                            placeholder="Search by name, email or username..."
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
                                                    <th>Name</th>
                                                    <th>Username</th>
                                                    <th>Contact</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedUnassigned.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3}>
                                                            <div className="no-data" style={{ padding: '40px 0' }}>
                                                                <p>No matching users found.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedUnassigned.map(user => (
                                                        <tr
                                                            key={user.id}
                                                            onClick={() => toggleSelection(user.id)}
                                                            className={selectedUserIds.has(user.id) ? 'selected-row' : ''}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <td style={{ paddingLeft: '24px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedUserIds.has(user.id)}
                                                                        onChange={() => toggleSelection(user.id)}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    <div>
                                                                        <span className="client-name">{user.first_name} {user.last_name}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>@{user.username}</div>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px', color: '#4b5563' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <Mail size={12} color="#9ca3af" />
                                                                        {user.email}
                                                                    </div>
                                                                </div>
                                                            </td>
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
                                {selectedUserIds.size > 0 && (
                                    <span>
                                        <span style={{ fontWeight: 600, color: '#2563eb' }}>{selectedUserIds.size}</span> user{selectedUserIds.size !== 1 ? 's' : ''} selected
                                    </span>
                                )}
                            </div>
                            <button type="submit" className={styles.submitButton} disabled={selectedUserIds.size === 0 || mappingLoading} onClick={handleMapUsers}>
                                {mappingLoading ? 'Mapping...' : 'Map Selected Users'}
                            </button>
                        </>
                    )}
                    {activeTab === 'assigned' && (
                        <>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '13px' }}>
                                {selectedAssignedIds.size > 0 && (
                                    <span>
                                        <span style={{ fontWeight: 600, color: '#2563eb' }}>{selectedAssignedIds.size}</span> user{selectedAssignedIds.size !== 1 ? 's' : ''} selected
                                    </span>
                                )}
                            </div>
                            <button className="submit-btn" style={{ background: '#f3f4f6', color: '#374151', padding: '10px 20px', border: '1px solid #e5e7eb', boxShadow: 'none', marginRight: '10px' }} onClick={onClose}>
                                Close
                            </button>
                            <button
                                type="button"
                                className={styles.submitButton}
                                disabled={selectedAssignedIds.size === 0 || unassignLoading}
                                onClick={handleUnassignUsers}
                                style={selectedAssignedIds.size > 0 ? { background: '#ef4444', borderColor: '#ef4444' } : { background: '#9ca3af', borderColor: '#9ca3af', cursor: 'not-allowed' }}
                            >
                                {unassignLoading ? 'Unassigning...' : 'Unassign'}
                            </button>
                        </>
                    )}
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default UserMappingModal;
