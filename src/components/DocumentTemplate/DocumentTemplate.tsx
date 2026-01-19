import React, { useState } from 'react';
import { Files, Layout } from 'lucide-react';
import DocumentTypeManagement from './DocumentTypeManagement/DocumentTypeManagement';
import TemplateManagement from './TemplateManagement/TemplateManagement';
import styles from './DocumentTemplate.module.css';

const DocumentTemplate: React.FC = () => {
    const [activeTab, setActiveTab] = useState('document-types');

    return (
        <div className={styles['document-template']}>
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'document-types' ? styles.active : ''}`}
                    onClick={() => setActiveTab('document-types')}
                >
                    <Files size={16} />
                    Document Types
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    <Layout size={16} />
                    Templates
                </button>
            </div>

            <div className={styles['tab-content']}>
                {activeTab === 'document-types' ? <DocumentTypeManagement /> : <TemplateManagement />}
            </div>
        </div>
    );
};

export default DocumentTemplate;