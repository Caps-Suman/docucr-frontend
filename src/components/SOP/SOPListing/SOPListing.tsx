
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, ClipboardList, Users, FolderOpen, PlayCircle, StopCircle, Eye, ChevronDown, ChevronUp, Download } from 'lucide-react';
import Table from '../../Table/Table';
import styles from './SOPListing.module.css';
import sopService from '../../../services/sop.service';
import statusService, { Status } from '../../../services/status.service';
import { SOP } from '../../../types/sop';
import ConfirmModal from '../../Common/ConfirmModal';
import Toast, { ToastType } from '../../Common/Toast';

const SOPListing: React.FC = () => {
    const navigate = useNavigate();
    const [sops, setSops] = useState<SOP[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null);
    const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; sopId: string; action: 'activate' | 'deactivate' }>({ isOpen: false, sopId: '', action: 'activate' });
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [activeStatusId, setActiveStatusId] = useState<number | null>(null);
    const [inactiveStatusId, setInactiveStatusId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        loadSOPs();
        loadStatuses();
    }, []);

    const loadSOPs = async () => {
        try {
            setLoading(true);
            const data = await sopService.getSOPs();
            setSops(data);
        } catch (error) {
            console.error('Failed to load SOPs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStatuses = async () => {
        try {
            const data = await statusService.getStatuses();
            setStatuses(data);
            const active = data.find(s => s.code === 'ACTIVE');
            const inactive = data.find(s => s.code === 'INACTIVE');
            setActiveStatusId(active ? Number(active.id) : null);
            setInactiveStatusId(inactive ? Number(inactive.id) : null);
        } catch (error) {
            console.error('Failed to load statuses:', error);
        }
    };

    const handleToggleStatus = async (id: string, currentStatusId?: number) => {
        const isActive = currentStatusId === activeStatusId;
        setConfirmModal({ isOpen: true, sopId: id, action: isActive ? 'deactivate' : 'activate' });
    };

    const confirmToggleStatus = async () => {
        try {
            const newStatusId = confirmModal.action === 'activate' ? activeStatusId : inactiveStatusId;
            if (newStatusId) {
                await sopService.toggleSOPStatus(confirmModal.sopId, newStatusId);
                loadSOPs();
                setToast({
                    message: `SOP ${confirmModal.action}d successfully`,
                    type: 'success'
                });
            }
            setConfirmModal({ isOpen: false, sopId: '', action: 'activate' });
        } catch (error) {
            console.error('Failed to update SOP status:', error);
            setToast({
                message: `Failed to ${confirmModal.action} SOP`,
                type: 'error'
            });
        }
    };

    const filteredSOPs = useMemo(() => {
        let filtered = sops;

        if (statusFilter === 'active') {
            filtered = filtered.filter(sop => sop.statusId === activeStatusId);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(sop => sop.statusId === inactiveStatusId);
        }

        if (!searchTerm) return filtered;

        const term = searchTerm.toLowerCase();
        return filtered.filter(sop =>
            sop.title.toLowerCase().includes(term) ||
            sop.category.toLowerCase().includes(term) ||
            sop.providerInfo?.providerName?.toLowerCase().includes(term) ||
            sop.providerInfo?.billingProviderName?.toLowerCase().includes(term) ||
            sop.providerInfo?.billingProviderNPI?.includes(term) ||
            sop.providerInfo?.practiceName?.toLowerCase().includes(term) ||
            sop.providerInfo?.software?.toLowerCase().includes(term)
        );
    }, [sops, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const activeSOPs = sops.filter(sop => sop.statusId === activeStatusId).length;
        const inactiveSOPs = sops.filter(sop => sop.statusId === inactiveStatusId).length;

        return {
            totalSOPs: sops.length,
            activeSOPs,
            inactiveSOPs
        };
    }, [sops, activeStatusId, inactiveStatusId]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleViewSOP = (sop: SOP) => {
        setSelectedSOP(sop);
        setViewModalOpen(true);
        setExpandedSections({});
    };

    const columns = [
        {
            key: 'providerName',
            header: 'Provider',
            width: '32%',
            render: (_: string, row: SOP) => (
                <div>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{row.providerInfo?.providerName || row.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {row.providerInfo?.billingProviderName || row.category}
                    </div>
                </div>
            )
        },
        {
            key: 'category',
            header: 'Category',
            width: '15%',
            render: (value: string) => (
                <span className={styles.badge}>{value}</span>
            )
        },
        {
            key: 'npi',
            header: 'NPI',
            width: '12%',
            render: (_: any, row: SOP) => row.providerInfo?.billingProviderNPI || '-'
        },
        {
            key: 'software',
            header: 'Software',
            width: '12%',
            render: (_: any, row: SOP) => row.providerInfo?.software || '-'
        },
        {
            key: 'updatedAt',
            header: 'Last Updated',
            width: '14%',
            render: (_: any, row: SOP) => row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'
        },
        {
            key: 'actions',
            header: 'Actions',
            width: '130px',
            render: (_: any, row: SOP) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={styles.viewButton}
                        onClick={() => handleViewSOP(row)}
                        title="View SOP"
                    >
                        <Eye size={14} />
                    </button>
                    <button
                        className={styles.downloadButton}
                        onClick={() => console.log(`Download PDF for SOP ${row.id}`)}
                        title="Download PDF"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        className={styles.editButton}
                        onClick={() => navigate(`/sops/edit/${row.id}`)}
                        title="Edit SOP"
                    >
                        <Edit size={14} />
                    </button>
                    <button
                        className={row.statusId === inactiveStatusId ? styles.activateButton : styles.deactivateButton}
                        onClick={() => handleToggleStatus(row.id, row.statusId)}
                        title={row.statusId === inactiveStatusId ? 'Activate SOP' : 'Deactivate SOP'}
                        style={row.statusId === inactiveStatusId ? { backgroundColor: '#dcfce7', color: '#166534' } : { backgroundColor: '#fee2e2', color: '#dc2626' }}
                    >
                        {row.statusId === inactiveStatusId ? <PlayCircle size={14} /> : <StopCircle size={14} />}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={styles.container}>
            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div
                    className={`${styles.statCard} ${statusFilter === 'all' ? styles.statCardActiveBlue : ''}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <div className={styles.statIcon}>
                        <ClipboardList size={16} />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{stats.totalSOPs}</h3>
                        <p>Total SOPs</p>
                    </div>
                </div>
                <div
                    className={`${styles.statCard} ${statusFilter === 'active' ? styles.statCardActiveGreen : ''}`}
                    onClick={() => setStatusFilter('active')}
                >
                    <div className={styles.statIcon} style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                        <Users size={16} />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{stats.activeSOPs}</h3>
                        <p>Active SOPs</p>
                    </div>
                </div>
                <div
                    className={`${styles.statCard} ${statusFilter === 'inactive' ? styles.statCardActiveRed : ''}`}
                    onClick={() => setStatusFilter('inactive')}
                >
                    <div className={styles.statIcon} style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                        <FolderOpen size={16} />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{stats.inactiveSOPs}</h3>
                        <p>Inactive SOPs</p>
                    </div>
                </div>
            </div>

            {/* Header with Title and Actions */}
            <div className={styles.header}>
                <h1>
                    <ClipboardList size={20} style={{ marginRight: '8px' }} />
                    Standard Operating Procedures
                </h1>
                <div className={styles.actions}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={16} />
                        <input
                            type="text"
                            placeholder="Search by Provider, Practice, Category, NPI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                    <button
                        className={styles.createButton}
                        onClick={() => navigate('/sops/create')}
                    >
                        <Plus size={16} />
                        Create New SOP
                    </button>
                </div>
            </div>

            {/* Table */}
            <Table
                data={filteredSOPs}
                columns={columns}
                maxHeight="calc(100vh - 240px)"
            />

            {/* View Modal */}
            {viewModalOpen && selectedSOP && (
                <div className={styles.modalOverlay} onClick={() => setViewModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>SOP Details</h2>
                            <button className={styles.modalClose} onClick={() => setViewModalOpen(false)}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Basic Information */}
                            <div className={styles.infoSection}>
                                <h3>Basic Information</h3>
                                <div className={styles.infoGrid}>
                                    <div><strong>Title:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.title}</span></div>
                                    <div><strong>Category:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.category}</span></div>
                                </div>
                            </div>

                            {/* Provider Information */}
                            <div className={styles.infoSection}>
                                <h3>Provider Information</h3>
                                <div className={styles.infoGrid}>
                                    <div><strong>Provider Name:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.providerName || '-'}</span></div>
                                    <div><strong>Billing Provider:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.billingProviderName || '-'}</span></div>
                                    <div><strong>NPI:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.billingProviderNPI || '-'}</span></div>
                                    <div><strong>Practice Name:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.practiceName || '-'}</span></div>
                                    <div><strong>Software:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.software || '-'}</span></div>
                                    <div><strong>Tax ID:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.providerTaxID || '-'}</span></div>
                                    <div><strong>Address:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.billingAddress || '-'}</span></div>
                                    <div><strong>Clearinghouse:</strong> <span style={{ color: '#1d4ed8' }}>{selectedSOP.providerInfo?.clearinghouse || '-'}</span></div>
                                </div>
                            </div>

                            {/* Workflow Process */}
                            <div className={styles.infoSection}>
                                <h3>Workflow Process</h3>
                                <div style={{ marginBottom: '12px' }}>
                                    <strong style={{ display: 'block', marginBottom: '4px' }}>Description:</strong>
                                    <div style={{ whiteSpace: 'pre-wrap', color: '#1d4ed8', fontSize: '14px' }}>
                                        {selectedSOP.workflowProcess?.description || '-'}
                                    </div>
                                </div>
                                <div>
                                    <strong style={{ display: 'block', marginBottom: '4px' }}>Eligibility Portals:</strong>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {selectedSOP.workflowProcess?.eligibilityPortals?.length ? (
                                            selectedSOP.workflowProcess.eligibilityPortals.map((p, i) => (
                                                <span key={i} className={styles.badge} style={{ background: '#eff6ff', color: '#1d4ed8' }}>{p}</span>
                                            ))
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '14px' }}>No portals listed</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.accordion}>
                                <div className={styles.accordionItem}>
                                    <div
                                        className={styles.accordionHeader}
                                        onClick={() => toggleSection('guidelines')}
                                    >
                                        <span>Billing Guidelines ({selectedSOP.billingGuidelines?.length || 0})</span>
                                        {expandedSections['guidelines'] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    {expandedSections['guidelines'] && (
                                        <div className={styles.accordionContent}>
                                            {selectedSOP.billingGuidelines?.map((g, i) => (
                                                <div key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: i < (selectedSOP.billingGuidelines?.length || 0) - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{g.title}</div>
                                                    <div style={{ color: '#1d4ed8', fontSize: '14px' }}>{g.description}</div>
                                                </div>
                                            ))}
                                            {(!selectedSOP.billingGuidelines || selectedSOP.billingGuidelines.length === 0) && <p style={{ color: '#9ca3af', fontSize: '14px' }}>No guidelines.</p>}
                                        </div>
                                    )}
                                </div>

                                <div className={styles.accordionItem}>
                                    <div
                                        className={styles.accordionHeader}
                                        onClick={() => toggleSection('coding')}
                                    >
                                        <span>Coding Rules ({selectedSOP.codingRules?.length || 0})</span>
                                        {expandedSections['coding'] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    {expandedSections['coding'] && (
                                        <div className={styles.accordionContent}>
                                            {selectedSOP.codingRules?.map((r, i) => (
                                                <div key={i} style={{ marginBottom: '8px', fontSize: '14px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 600, color: '#1d4ed8' }}>{r.cptCode}</span>
                                                        {r.description && <span style={{ marginLeft: '8px', color: '#1d4ed8' }}>- {r.description}</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
                                                        {r.ndcCode && <span><strong>NDC:</strong> <span style={{ color: '#1d4ed8' }}>{r.ndcCode}</span></span>}
                                                        {r.units && <span><strong>Units:</strong> <span style={{ color: '#1d4ed8' }}>{r.units}</span></span>}
                                                        {r.chargePerUnit && <span><strong>Charge:</strong> <span style={{ color: '#1d4ed8' }}>{r.chargePerUnit}</span></span>}
                                                        {r.modifier && <span><strong>Mod:</strong> <span style={{ color: '#1d4ed8' }}>{r.modifier}</span></span>}
                                                        {r.replacementCPT && <span><strong>Replace:</strong> <span style={{ color: '#1d4ed8' }}>{r.replacementCPT}</span></span>}
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedSOP.codingRules || selectedSOP.codingRules.length === 0) && <p style={{ color: '#9ca3af', fontSize: '14px' }}>No coding rules.</p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, sopId: '', action: 'activate' })}
                onConfirm={confirmToggleStatus}
                title={`${confirmModal.action === 'activate' ? 'Activate' : 'Deactivate'} SOP`}
                message={`Are you sure you want to ${confirmModal.action} this SOP?`}
                confirmText={confirmModal.action === 'activate' ? 'Activate' : 'Deactivate'}
                type={confirmModal.action === 'activate' ? 'info' : 'warning'}
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

export default SOPListing;
