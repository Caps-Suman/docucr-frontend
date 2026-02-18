import React, { useState, useEffect } from 'react';
import modulesService from '../../services/modules.service';
import authService from '../../services/auth.service';
import NoAccess from '../Common/NoAccess';
import Loading from '../Common/Loading';
import { List, Webhook, Printer } from 'lucide-react';
import DocumentListingView from './DocumentListingView/DocumentListingView';
import WebhookSettings from './WebhookSettings/WebhookSettings';
import PrinterSettings from './PrinterSettings/PrinterSettings';
import styles from './Settings.module.css';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [canViewDocList, setCanViewDocList] = useState(false);
    const [canViewWebhooks, setCanViewWebhooks] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkPermissions = async () => {
            try {
                const user = authService.getUser();
                if (!user?.email) return;

                const modules = await modulesService.getUserModules(user.email);
                const settingsModule = modules.find(m => m.name === 'settings');

                if (settingsModule) {
                    const submodules = settingsModule.submodules || [];

                    const hasDocListAccess = submodules.some(s => s.name === 'document_list_view_config');
                    const hasWebhookAccess = submodules.some(s => s.name === 'webhook_management');

                    setCanViewDocList(hasDocListAccess);
                    setCanViewWebhooks(hasWebhookAccess);

                    // Set default tab
                    if (hasDocListAccess) setActiveTab('document-listing');
                    else if (hasWebhookAccess) setActiveTab('webhook-settings');
                }
            } catch (error) {
                console.error('Failed to load settings permissions:', error);
            } finally {
                setLoading(false);
            }
        };

        checkPermissions();
    }, []);

    if (loading) {
        return <Loading message="Loading settings..." />;
    }

    if (!canViewDocList && !canViewWebhooks) {
        return (
            <NoAccess
                title="Settings Access Restricted"
                description="You do not have permission to view any settings modules. Please contact your administrator."
            />
        );
    }

    return (
        <div className={styles.settings}>
            <div className={styles.tabs}>
                {canViewDocList && (
                    <button
                        className={`${styles.tab} ${activeTab === 'document-listing' ? styles.active : ''}`}
                        onClick={() => setActiveTab('document-listing')}
                    >
                        <List size={16} />
                        Document List View
                    </button>
                )}
                {canViewWebhooks && (
                    <button
                        className={`${styles.tab} ${activeTab === 'webhook-settings' ? styles.active : ''}`}
                        onClick={() => setActiveTab('webhook-settings')}
                    >
                        <Webhook size={16} />
                        Webhook Settings
                    </button>
                )}
                {/* <button
                    className={`${styles.tab} ${activeTab === 'printer-settings' ? styles.active : ''}`}
                    onClick={() => setActiveTab('printer-settings')}
                >
                    <Printer size={16} />
                    Printer Configuration
                </button> */}
            </div>

            <div className={styles['tab-content']}>
                {activeTab === 'document-listing' && canViewDocList && <DocumentListingView />}
                {activeTab === 'webhook-settings' && canViewWebhooks && <WebhookSettings />}
                {activeTab === 'printer-settings' && <PrinterSettings />}
            </div>
        </div>
    );
};

export default Settings;