import React, { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import clientService from "../../../services/client.service";
import CommonPagination from "../../Common/CommonPagination";
import Loading from "../../Common/Loading";
import styles from "./SOPListing.module.css";

interface Client {
    id: string;
    name: string;
    npi: string;
    type: string;
}

interface ClientSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (client: Client) => void;
}

const ClientSelectionModal: React.FC<ClientSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
}) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        if (isOpen) {
            loadClients();
        }
    }, [isOpen]);

    const loadClients = async () => {
        setLoading(true);
        try {
            const data = await clientService.getAllClients();
            setClients(data);
        } catch (error) {
            console.error("Failed to load clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = useMemo(() => {
        return clients.filter(
            (c) =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.npi && c.npi.includes(searchTerm))
        );
    }, [clients, searchTerm]);

    const paginatedClients = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredClients.slice(start, start + itemsPerPage);
    }, [filteredClients, currentPage]);

    const handlePageChange = (selectedItem: { selected: number }) => {
        setCurrentPage(selectedItem.selected);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
                <div className={styles.modalHeader}>
                    <h2>Select Client</h2>
                    <button className={styles.modalClose} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.searchWrapper} style={{ width: "100%", marginBottom: "15px" }}>
                        <Search className={styles.searchIcon} size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or NPI..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(0);
                            }}
                            className={styles.searchInput}
                        />
                    </div>

                    {loading ? (
                        <div style={{ padding: "40px 0" }}>
                            <Loading message="Loading clients..." />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className={styles.emptyState}>No clients found.</div>
                    ) : (
                        <>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600 }}>Select</th>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600 }}>Name</th>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600 }}>NPI</th>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600 }}>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedClients.map((client) => (
                                        <tr
                                            key={client.id}
                                            style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                                            onClick={() => onSelect(client)}
                                            className="group hover:bg-slate-50 transition-colors"
                                        >
                                            <td style={{ padding: "12px" }}>
                                                <input
                                                    type="radio"
                                                    name="clientSelection"
                                                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                                    onChange={() => onSelect(client)}
                                                // Checked can be managed if we passed selectedClientId, but simple click select is fine for now
                                                />
                                            </td>
                                            <td style={{ padding: "12px", fontWeight: 500, color: "#1e293b" }}>{client.name}</td>
                                            <td style={{ padding: "12px", color: "#64748b" }}>{client.npi || "-"}</td>
                                            <td style={{ padding: "12px" }}>
                                                <span className={styles.badge}>{client.type}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filteredClients.length > itemsPerPage && (
                                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                                    <CommonPagination
                                        pageCount={Math.ceil(filteredClients.length / itemsPerPage)}
                                        onPageChange={handlePageChange}
                                        currentPage={currentPage}
                                        show={true}
                                        renderInPlace={true}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientSelectionModal;
