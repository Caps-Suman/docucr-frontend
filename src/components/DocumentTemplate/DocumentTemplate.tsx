import React, { useState, useEffect } from 'react';
import { Files, Layout } from 'lucide-react';
import DocumentTypeManagement from './DocumentTypeManagement/DocumentTypeManagement';
import TemplateManagement from './TemplateManagement/TemplateManagement';
import modulesService, { Module } from '../../services/modules.service';
import authService from '../../services/auth.service';
import Loading from '../Common/Loading';
import styles from './DocumentTemplate.module.css';

const DocumentTemplate: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [hasDocTypesAccess, setHasDocTypesAccess] = useState(false);
    const [hasTemplatesAccess, setHasTemplatesAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const user = authService.getUser();
                if (user?.email) {
                    const modules = await modulesService.getUserModules(user.email);
                    const templateModule = modules.find(m => m.name === 'templates');

                    if (templateModule) {
                        const docTypes = templateModule.submodules.some(s => s.name === 'document_types');
                        const templatesList = templateModule.submodules.some(s => s.name === 'templates_list');

                        setHasDocTypesAccess(docTypes);
                        setHasTemplatesAccess(templatesList);

                        // Set initial active tab
                        if (docTypes) {
                            setActiveTab('document-types');
                        } else if (templatesList) {
                            setActiveTab('templates');
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to check templates sub-modules access:', err);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, []);

    if (loading) return <Loading message="Checking permissions..." />;

    if (!hasDocTypesAccess && !hasTemplatesAccess) {
        return (
            <div className={styles['document-template']} style={{ padding: '40px', textAlign: 'center' }}>
                <h3>Access Denied</h3>
                <p>You do not have permission to access any sub-modules within Templates.</p>
            </div>
        );
    }

    return (
        <div className={styles['document-template']}>
            <div className={styles.tabs}>
                {hasDocTypesAccess && (
                    <button
                        className={`${styles.tab} ${activeTab === 'document-types' ? styles.active : ''}`}
                        onClick={() => setActiveTab('document-types')}
                    >
                        <Files size={16} />
                        Document Types
                    </button>
                )}
                {hasTemplatesAccess && (
                    <button
                        className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
                        onClick={() => setActiveTab('templates')}
                    >
                        <Layout size={16} />
                        Templates
                    </button>
                )}
            </div>

            <div className={styles['tab-content']}>
                {activeTab === 'document-types' && hasDocTypesAccess && <DocumentTypeManagement />}
                {activeTab === 'templates' && hasTemplatesAccess && <TemplateManagement />}
            </div>
        </div>
    );
};

export default DocumentTemplate;