import React, { useState, useEffect } from 'react';
import { Eye, Download, Trash2, FileText, Upload, CheckCircle, Clock, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../../Table/Table';
import Loading from '../../Common/Loading';
import styles from './DocumentList.module.css';

interface Document {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    status: 'processing' | 'completed' | 'failed' | 'uploading';
}

const DocumentList: React.FC = () => {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading documents
        const loadDocuments = () => {
            setLoading(true);
            setTimeout(() => {
                setDocuments([
                    {
                        id: '1',
                        name: 'Invoice_2024_001.pdf',
                        type: 'PDF',
                        size: 2.5,
                        uploadedAt: '2024-01-15T10:30:00Z',
                        status: 'completed'
                    },
                    {
                        id: '2',
                        name: 'Contract_Agreement.pdf',
                        type: 'PDF',
                        size: 1.8,
                        uploadedAt: '2024-01-14T14:20:00Z',
                        status: 'processing'
                    }
                ]);
                setLoading(false);
            }, 1000);
        };
        loadDocuments();
    }, []);

    const columns = [
        {
            key: 'name',
            header: 'Document Name',
            render: (value: string, row: Document) => (
                <div className={styles.documentName}>
                    <FileText size={16} />
                    <span>{value}</span>
                </div>
            )
        },
        {
            key: 'type',
            header: 'Type',
            render: (value: string) => <span className={styles.documentType}>{value}</span>
        },
        {
            key: 'size',
            header: 'Size',
            render: (value: number) => <span>{value} MB</span>
        },
        {
            key: 'uploadedAt',
            header: 'Uploaded',
            render: (value: string) => new Date(value).toLocaleDateString()
        },
        {
            key: 'status',
            header: 'Status',
            render: (value: string) => (
                <span className={`status-badge ${value === 'completed' ? 'active' : value === 'processing' ? 'inactive' : 'error'}`}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, row: Document) => (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="tooltip-wrapper" data-tooltip="View Details">
                        <button
                            className="action-btn edit"
                            onClick={() => navigate(`/documents/${row.id}`)}
                        >
                            <Eye size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip="Download">
                        <button
                            className="action-btn activate"
                        >
                            <Download size={14} />
                        </button>
                    </span>
                    <span className="tooltip-wrapper" data-tooltip="Delete">
                        <button
                            className="action-btn delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </span>
                </div>
            )
        }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Documents</h1>
                <button
                    className={styles.uploadButton}
                    onClick={() => navigate('/documents/upload')}
                >
                    <Upload size={16} />
                    Upload Document
                </button>
            </div>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconTotal}`}>
                        <FileText size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>{documents.length}</span>
                        <span className={styles.statLabel}>Total Documents</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconProcessed}`}>
                        <CheckCircle size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {documents.filter(d => d.status === 'completed').length}
                        </span>
                        <span className={styles.statLabel}>Processed</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconProcessing}`}>
                        <Clock size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {documents.filter(d => d.status === 'processing').length}
                        </span>
                        <span className={styles.statLabel}>Processing</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.iconUploading}`}>
                        <UploadCloud size={16} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statValue}>
                            {documents.filter(d => d.status === 'uploading').length}
                        </span>
                        <span className={styles.statLabel}>Uploading</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <Loading message="Loading documents..." />
            ) : documents.length === 0 ? (
                <div className={styles.emptyState}>
                    <FileText size={48} />
                    <p>No documents uploaded yet</p>
                    <button
                        className={styles.uploadButton}
                        onClick={() => navigate('/documents/upload')}
                    >
                        <Upload size={16} />
                        Upload Your First Document
                    </button>
                </div>
            ) : (
                <Table columns={columns} data={documents} />
            )}
        </div>
    );
};

export default DocumentList;