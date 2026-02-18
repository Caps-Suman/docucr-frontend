import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Search, Loader2, Briefcase } from 'lucide-react';
import styles from './ClientModal.module.css'; // Reusing styles
import clientService, { Provider } from '../../services/client.service';
import CommonPagination from '../Common/CommonPagination';
import Table from '../Table/Table';
import { debounce } from '../../utils/debounce';

interface ClientProvidersModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string | null;
    clientName: string;
}

const ClientProvidersModal: React.FC<ClientProvidersModalProps> = ({ isOpen, onClose, clientId, clientName }) => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (isOpen && clientId) {
            loadProviders();
        } else {
            // Reset state when closed
            setProviders([]);
            setSearchTerm('');
            setDebouncedSearchTerm('');
            setCurrentPage(0);
            setTotalItems(0);
        }
    }, [isOpen, clientId, currentPage, itemsPerPage, debouncedSearchTerm]);

    useEffect(() => {
        const debouncedHandler = debounce((term: string) => {
            setDebouncedSearchTerm(term);
            setCurrentPage(0);
        }, 500);

        debouncedHandler(searchTerm);
    }, [searchTerm]);

    const loadProviders = async () => {
        if (!clientId) return;
        try {
            setLoading(true);
            const data = await clientService.getClientProviders(
                clientId,
                currentPage + 1,
                itemsPerPage,
                debouncedSearchTerm
            );
            setProviders(data.providers);
            setTotalItems(data.total);
        } catch (error) {
            console.error("Failed to load providers:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const columns = [
        {
            key: 'name',
            header: 'Name',
            render: (_: any, row: Provider) => {
                const name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ');
                return name;
            }
        },
        {
            key: 'npi',
            header: 'NPI',
            render: (value: string) => value || '-'
        },
        {
            key: 'type',
            header: 'Type',
            render: (_: any, row: any) => row.type || 'Individual'
        }
    ];

    return ReactDOM.createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', padding: '0' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 }}>
                        <span style={{ color: '#6b7280', fontWeight: 500 }}>Providers for -</span> {clientName}
                    </h2>
                    <button className={styles.closeButton} onClick={onClose} style={{ position: 'static' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px' }}>
                    {/* Search */}
                    <div style={{ marginBottom: '20px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search providers by name or NPI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.input}
                            style={{ paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Content */}
                    <div style={{ minHeight: '300px' }}>
                        {loading && providers.length === 0 ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                                <Loader2 className="animate-spin" size={32} color="#0052cc" />
                            </div>
                        ) : providers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
                                <Briefcase size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                <p style={{ fontSize: '16px', fontWeight: 500 }}>No providers found</p>
                                {searchTerm && <p style={{ fontSize: '14px' }}>Try adjusting your search</p>}
                            </div>
                        ) : (
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                <Table
                                    columns={columns}
                                    data={providers}
                                    maxHeight="400px"
                                />
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div style={{ marginTop: '20px' }}>
                        <CommonPagination
                            show={totalItems > 0}
                            pageCount={Math.ceil(totalItems / itemsPerPage)}
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={(data) => setCurrentPage(data.selected)}
                            onItemsPerPageChange={(items) => {
                                setItemsPerPage(items);
                                setCurrentPage(0);
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ClientProvidersModal;
