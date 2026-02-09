import React, { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import clientService, { Provider } from "../../../services/client.service";
import CommonPagination from "../../Common/CommonPagination";
import Loading from "../../Common/Loading";
import styles from "./SOPListing.module.css";
import Toast, { ToastType } from "../../Common/Toast";

interface ProviderSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (providerIds: string[], providers: Provider[]) => void;
    clientId: string;
    clientName: string;
}

const ProviderSelectionModal: React.FC<ProviderSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    clientId,
    clientName
}) => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedProviderIds, setSelectedProviderIds] = useState<Set<string>>(new Set());
    const itemsPerPage = 10;
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        if (isOpen && clientId) {
            loadProviders();
            setSelectedProviderIds(new Set());
            setSearchTerm("");
            setCurrentPage(0);
        }
    }, [isOpen, clientId]);

    const loadProviders = async () => {
        setLoading(true);
        try {
            // Fetch all providers or handle server-side pagination?
            // For simplicity and multi-select across pages, fetching all is easier if list is small.
            // But API supports pagination.
            // To support "Select All" or keeping selection across pages with server-side pagination is complex.
            // Requirement says "Fetch providers using existing API... Pagination using <common-pagination />".
            // existing API: getClientProviders(clientId, page, pageSize, search).

            // Let's implement Server-Side Pagination + Client-Side Selection Tracking.
            // But wait, if I use server-side pagination, I only have current page data.
            // If I search, I query backend.

            // I'll fetch page 1 initially.
            fetchPage(0);
        } catch (error) {
            console.error("Failed to load providers:", error);
        }
    };

    const fetchPage = async (page: number, search: string = searchTerm) => {
        setLoading(true);
        try {
            // Setting large limit to avoid pagination issues for now as per "reuse existing" 
            // but if we want true pagination we should use the page param.
            // However, keeping track of "selected" items across server pages is standard.
            // I will use client-side pagination for smoother UX if list isn't huge, 
            // OR implement server-side correctly.
            // Let's stick to client-side pagination for consistent "Selection" experience 
            // (fetching all ~100 providers is usually fine, limit=100 in service default).
            // Service: page=1, pageSize=10 default.

            // I'll fetch a larger chunk to allow client side filtering/pagination for better UX on selection
            const data = await clientService.getClientProviders(clientId, 1, 1000, search);
            setProviders(data.providers);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };


    const filteredProviders = useMemo(() => {
        return providers.filter(
            (p) =>
                p.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.npi && p.npi.includes(searchTerm))
        );
    }, [providers, searchTerm]);

    const paginatedProviders = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredProviders.slice(start, start + itemsPerPage);
    }, [filteredProviders, currentPage]);

    const handlePageChange = (selectedItem: { selected: number }) => {
        setCurrentPage(selectedItem.selected);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedProviderIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedProviderIds(newSet);
    };

    const handleContinue = () => {
        if (selectedProviderIds.size === 0) {
            setToast({ message: "Please select at least one provider", type: "error" });
            return;
        }
        const selectedProviders = providers.filter(p => selectedProviderIds.has(p.id));
        onSelect(Array.from(selectedProviderIds), selectedProviders);
    };

    const toggleSelectAll = () => {
        if (selectedProviderIds.size === filteredProviders.length && filteredProviders.length > 0) {
            setSelectedProviderIds(new Set());
        } else {
            const newSet = new Set(selectedProviderIds);
            filteredProviders.forEach(p => newSet.add(p.id));
            setSelectedProviderIds(newSet);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
                <div className={styles.modalHeader}>
                    <h2>Select Providers for {clientName}</h2>
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
                            <Loading message="Loading providers..." />
                        </div>
                    ) : filteredProviders.length === 0 ? (
                        <div className={styles.emptyState}>No providers found for this client.</div>
                    ) : (
                        <>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600, width: "40px" }}>
                                            <input
                                                type="checkbox"
                                                checked={filteredProviders.length > 0 && selectedProviderIds.size === filteredProviders.length}
                                                onChange={toggleSelectAll}
                                                style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                            />
                                        </th>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600 }}>Name</th>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600 }}>NPI</th>
                                        <th style={{ padding: "12px", color: "#64748b", fontWeight: 600 }}>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedProviders.map((provider) => (
                                        <tr
                                            key={provider.id}
                                            style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                                            onClick={() => toggleSelection(provider.id)}
                                            className={selectedProviderIds.has(provider.id) ? "bg-blue-50" : "hover:bg-slate-50"}
                                        >
                                            <td style={{ padding: "12px" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProviderIds.has(provider.id)}
                                                    onChange={() => toggleSelection(provider.id)}
                                                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td style={{ padding: "12px", fontWeight: 500, color: "#1e293b" }}>
                                                {provider.first_name} {provider.middle_name} {provider.last_name}
                                            </td>
                                            <td style={{ padding: "12px", color: "#64748b" }}>{provider.npi || "-"}</td>
                                            <td style={{ padding: "12px" }}>
                                                <span className={styles.badge}>{"Individual"}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ color: "#64748b", fontSize: "14px" }}>
                                    {selectedProviderIds.size} provider(s) selected
                                </div>

                                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                                    {filteredProviders.length > itemsPerPage && (
                                        <CommonPagination
                                            pageCount={Math.ceil(filteredProviders.length / itemsPerPage)}
                                            onPageChange={handlePageChange}
                                            currentPage={currentPage}
                                            show={true}
                                            renderInPlace={true}
                                        />
                                    )}

                                    <button
                                        onClick={handleContinue}
                                        className={styles.createButton}
                                        style={{
                                            backgroundColor: "#0c4a6e",
                                            color: "white",
                                            border: "none",
                                            padding: "10px 24px",
                                            height: "40px"
                                        }}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderSelectionModal;
