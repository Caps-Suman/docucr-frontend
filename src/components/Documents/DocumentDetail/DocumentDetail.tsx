import React, { useState } from 'react';
import { ArrowLeft, Download, FileText, Calendar, User, Building } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './DocumentDetail.module.css';

interface ExtractedData {
    [key: string]: string | number | boolean;
}

const DocumentDetail: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    
    const [document] = useState({
        id: '1',
        name: 'Invoice_2024_001.pdf',
        type: 'PDF',
        size: 2.5,
        uploadedAt: '2024-01-15T10:30:00Z',
        status: 'completed',
        extractedData: {
            'Invoice Number': 'INV-2024-001',
            'Date': '2024-01-15',
            'Client': 'ABC Corporation',
            'Amount': '$1,250.00',
            'Due Date': '2024-02-15',
            'Description': 'Web development services'
        } as ExtractedData
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button 
                        className={styles.backButton}
                        onClick={() => navigate('/documents')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className={styles.title}>{document.name}</h1>
                        <div className={styles.metadata}>
                            <span className={styles.metaItem}>
                                <FileText size={14} />
                                {document.type} • {document.size} MB
                            </span>
                            <span className={styles.metaItem}>
                                <Calendar size={14} />
                                {new Date(document.uploadedAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
                <button className={styles.downloadButton}>
                    <Download size={16} />
                    Download
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.leftPanel}>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Document Preview</h2>
                        <div className={styles.preview}>
                            <div className={styles.previewPlaceholder}>
                                <FileText size={64} />
                                <p>Document preview will appear here</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.rightPanel}>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Processing Status</h2>
                        <div className={`${styles.status} ${styles[document.status]}`}>
                            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Extracted Data</h2>
                        <div className={styles.extractedData}>
                            {Object.entries(document.extractedData).map(([key, value]) => (
                                <div key={key} className={styles.dataItem}>
                                    <span className={styles.dataLabel}>{key}</span>
                                    <span className={styles.dataValue}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Actions</h2>
                        <div className={styles.actions}>
                            <button className={styles.actionButton}>
                                Export Data
                            </button>
                            <button className={styles.actionButton}>
                                Reprocess
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentDetail;