import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Briefcase,
    MapPin,
    Users,
    Info,
    Loader2,
    Building2,
    Globe,
    Database,
    UserCheck,
    Calendar,
    Hash,
    Shield,
    BookOpen,
    Plus,
    FileText,
    Pencil
} from "lucide-react";
import clientService, { Client, Provider, ClientLocation } from "../../services/client.service";
import sopService from "../../services/sop.service";
import { SOP } from "../../types/sop";
import SOPReadOnlyView from "../SOP/SOPReadOnlyView/SOPReadOnlyView";
import AddProviderModal from "./AddProviderModal";
import AddLocationModal from "./AddLocationModal";
import styles from "./ClientDetail.module.css";

const ClientDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clientSOP, setClientSOP] = useState<SOP | null>(null);
    const [isSOPModalOpen, setIsSOPModalOpen] = useState(false);
    const [isCheckingSOP, setIsCheckingSOP] = useState(false);
    const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);
    const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
    const [editingLocation, setEditingLocation] = useState<ClientLocation | null>(null);

    useEffect(() => {
        const fetchClientDetails = async () => {
            try {
                if (!id) return;
                setLoading(true);
                const data = await clientService.getClient(id);
                setClient(data);

                // Now fetch SOP if exists
                setIsCheckingSOP(true);
                const response = await sopService.getSOPs({ clientId: id, limit: 1 });
                if (response.sops && response.sops.length > 0) {
                    const fullSOP = await sopService.getSOPById(response.sops[0].id);
                    setClientSOP(fullSOP);
                }
            } catch (err) {
                console.error("Failed to load client details/SOP:", err);
                setError("Failed to load client details. Please try again later.");
            } finally {
                setLoading(false);
                setIsCheckingSOP(false);
            }
        };

        fetchClientDetails();
    }, [id]);

    const refreshClient = async () => {
        try {
            if (!id) return;
            const data = await clientService.getClient(id);
            setClient(data);
        } catch (err) {
            console.error("Failed to refresh client details:", err);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 size={32} className={styles.animateSpin} />
                <p>Loading client details...</p>
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className={styles.loadingContainer}>
                <Info size={32} color="#ef4444" />
                <p>{error || "Client not found"}</p>
                <button
                    className={styles.backButton}
                    onClick={() => navigate("/clients")}
                >
                    <ArrowLeft size={16} />
                    Back to Clients
                </button>
            </div>
        );
    }

    const clientName = client.business_name ||
        [client.first_name, client.middle_name, client.last_name]
            .filter(Boolean)
            .join(" ") || "N/A";

    const isActive = client.status_code === "ACTIVE";

    // Group providers by location_id for easier display
    const providersByLocation = (client.providers || []).reduce((acc, p) => {
        const locId = p.location_id || 'unassigned';
        if (!acc[locId]) acc[locId] = [];
        acc[locId].push(p);
        return acc;
    }, {} as Record<string, Provider[]>);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button
                        className={styles.backButton}
                        onClick={() => navigate("/clients")}
                        title="Back to Clients"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className={styles.title}>{clientName}</h1>
                        <div className={styles.metaRow}>
                            <span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>
                                {isActive ? "Active" : "Inactive"}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Shield size={12} /> {client.type || "NPI1"}
                            </span>
                            {client.npi && (
                                <>
                                    <span>•</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Hash size={12} /> {client.npi}
                                    </span>
                                </>
                            )}
                            {clientSOP && (
                                <>
                                    <span>•</span>
                                    <button
                                        className={styles.sopBadgeButton}
                                        onClick={() => setIsSOPModalOpen(true)}
                                    >
                                        <BookOpen size={12} />
                                        SOP Available
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    {clientSOP && (
                        <button
                            className={styles.secondaryAction}
                            onClick={() => setIsSOPModalOpen(true)}
                        >
                            <BookOpen size={16} />
                            View SOP
                        </button>
                    )}
                    <button
                        className={styles.secondaryAction}
                        onClick={() => setIsAddLocationModalOpen(true)}
                    >
                        <Plus size={16} />
                        Add Location
                    </button>
                    <button
                        className={styles.primaryAction}
                        onClick={() => setIsAddProviderModalOpen(true)}
                    >
                        <Plus size={16} />
                        Add Provider
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.leftPanel}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Info size={14} />
                                Overview
                            </h3>
                        </div>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>NPI Number</span>
                                <span className={styles.value}>{client.npi || "N/A"}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Entity Type</span>
                                <span className={styles.value}>{client.type || "N/A"}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Associated Organisation</span>
                                <span className={styles.value}>{client.organisation_name || "N/A"}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Registration Date</span>
                                <span className={styles.value}>
                                    {client.created_at ? new Date(client.created_at).toLocaleDateString() : "N/A"}
                                </span>
                            </div>
                            {client.assigned_users && client.assigned_users.length > 0 && (
                                <div className={styles.infoItem}>
                                    <span className={styles.label}>Managing Users</span>
                                    <div className={styles.tagGroup}>
                                        {client.assigned_users.map((user, idx) => (
                                            <span key={idx} className={styles.userTag}>
                                                <UserCheck size={10} /> {user}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Globe size={14} />
                                Primary Location
                            </h3>
                        </div>
                        <div className={styles.infoGrid}>
                            {client.address_line_1 ? (
                                <>
                                    <div className={styles.infoItem}>
                                        <span className={styles.label}>Location Address</span>
                                        <span className={styles.value}>
                                            {client.address_line_1}
                                            {client.address_line_2 && <><br />{client.address_line_2}</>}
                                            <br />
                                            {client.city}, {client.state_code} {client.zip_code}
                                        </span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.label}>Region</span>
                                        <span className={styles.value}>{client.country || "United States"}</span>
                                    </div>
                                </>
                            ) : (
                                <p className={styles.emptyMessage}>No contact info recorded.</p>
                            )}
                        </div>
                    </div>

                    {client.description && (
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>
                                    <Database size={14} />
                                    Internal Notes
                                </h3>
                            </div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <span className={styles.value}>{client.description}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.mainPanel}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <MapPin size={14} />
                                Service Locations
                            </h3>
                            <span className={styles.counter}>{(client.locations?.length || 0)}</span>
                        </div>
                        <div className={styles.locationList}>
                            {client.locations && client.locations.length > 0 ? (
                                client.locations.map((loc) => {
                                    const locProviders = providersByLocation[loc.id] || [];
                                    return (
                                        <div
                                            key={loc.id}
                                            className={`${styles.locationItem} ${loc.is_primary ? styles.primary : ""}`}
                                        >
                                            <div className={styles.addressHeader}>
                                                <div className={styles.addressText}>
                                                    <div style={{ fontWeight: 600, color: '#111827' }}>
                                                        {loc.address_line_1}{loc.address_line_2 ? `, ${loc.address_line_2}` : ""}
                                                    </div>
                                                    <div style={{ color: '#6b7280' }}>
                                                        {loc.city}, {loc.state_code} {loc.zip_code}
                                                    </div>
                                                </div>
                                                <div className={styles.itemActions}>
                                                    {loc.is_primary && <span className={styles.primaryBadge}>Primary</span>}
                                                    <button
                                                        className={styles.editItemButton}
                                                        onClick={() => {
                                                            setEditingLocation(loc);
                                                            setIsAddLocationModalOpen(true);
                                                        }}
                                                        title="Edit Location"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {locProviders.length > 0 && (
                                                <div className={styles.locProviders}>
                                                    <span className={styles.labelSmall}>Stationed Providers:</span>
                                                    <div className={styles.providerMiniList}>
                                                        {locProviders.map(p => (
                                                            <span key={p.id} className={styles.providerMiniItem}>
                                                                {p.first_name} {p.last_name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className={styles.emptyMessage}>No secondary locations listed.</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Briefcase size={14} />
                                Professional Roster
                            </h3>
                            <span className={styles.counter}>{(client.providers?.length || 0)}</span>
                        </div>
                        <div className={styles.providerList}>
                            {client.providers && client.providers.length > 0 ? (
                                client.providers.map((provider) => (
                                    <div key={provider.id} className={styles.providerItem}>
                                        <div className={styles.providerHeader}>
                                            <div>
                                                <div className={styles.providerName}>
                                                    {provider.first_name} {provider.middle_name ? `${provider.middle_name} ` : ""}{provider.last_name}
                                                </div>
                                                <div className={styles.npiText}>NPI #{provider.npi}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className={styles.typeBadge}>{provider.type || "Specialist"}</span>
                                                <button
                                                    className={styles.editItemButton}
                                                    onClick={() => {
                                                        setEditingProvider(provider);
                                                        setIsAddProviderModalOpen(true);
                                                    }}
                                                    title="Edit Provider"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {(provider.address_line_1 || provider.city) && (
                                            <div className={styles.providerSubInfo}>
                                                <MapPin size={10} style={{ marginTop: '2px' }} />
                                                <span>
                                                    {provider.address_line_1}, {provider.city}, {provider.state_code} {provider.zip_code}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.emptyMessage}>No active providers found in directory.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isSOPModalOpen && clientSOP && (
                <SOPReadOnlyView
                    sop={clientSOP}
                    onClose={() => setIsSOPModalOpen(false)}
                />
            )}

            {isAddProviderModalOpen && client && (
                <AddProviderModal
                    isOpen={isAddProviderModalOpen}
                    onClose={() => {
                        setIsAddProviderModalOpen(false);
                        setEditingProvider(null);
                    }}
                    clientId={client.id}
                    clientName={clientName}
                    locations={client.locations || []}
                    onSuccess={() => {
                        refreshClient();
                    }}
                    provider={editingProvider || undefined}
                />
            )}

            {isAddLocationModalOpen && client && (
                <AddLocationModal
                    isOpen={isAddLocationModalOpen}
                    onClose={() => {
                        setIsAddLocationModalOpen(false);
                        setEditingLocation(null);
                    }}
                    clientId={client.id}
                    clientName={clientName}
                    onSuccess={() => {
                        refreshClient();
                    }}
                    location={editingLocation || undefined}
                />
            )}
        </div>
    );
};

export default ClientDetail;
