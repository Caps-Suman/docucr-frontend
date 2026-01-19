import React, { useState } from 'react';
import { List, Webhook } from 'lucide-react';
import DocumentListingView from './DocumentListingView/DocumentListingView';
import WebhookSettings from './WebhookSettings/WebhookSettings';
import styles from './Settings.module.css';

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('document-listing');

    return (
        <div className={styles.settings}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'document-listing' ? styles.active : ''}`}
                    onClick={() => setActiveTab('document-listing')}
                >
                    <List size={16} />
                    Document List View
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'webhook-settings' ? styles.active : ''}`}
                    onClick={() => setActiveTab('webhook-settings')}
                >
                    <Webhook size={16} />
                    Webhook Settings
                </button>
            </div>

            <div className={styles['tab-content']}>
                {activeTab === 'document-listing' ? <DocumentListingView /> : <WebhookSettings />}
            </div>
        </div>
    );
};

export default Settings;