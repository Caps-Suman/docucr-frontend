import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, FileText, Download, AlertCircle, Share2, Eye } from 'lucide-react';
import styles from './PublicShare.module.css';

interface ShareMetadata {
    filename: string;
    shared_by: string;
    expires_at: string;
}

const PublicShare: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [documentData, setDocumentData] = useState<any>(null);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    useEffect(() => {
        fetchMetadata();
    }, [token]);

    const fetchMetadata = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/public/shares/${token}`);
            if (response.ok) {
                const data = await response.json();
                setMetadata(data);
            } else {
                const err = await response.json();
                setError(err.detail || 'Invalid or expired share link');
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setVerifying(true);
            setError('');
            const response = await fetch(`${API_URL}/api/public/shares/${token}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (response.ok) {
                const data = await response.json();
                setDocumentData(data);
            } else {
                const err = await response.json();
                setError(err.detail || 'Invalid password');
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingPulse}></div>
                <p>Establishing secure connection...</p>
            </div>
        );
    }

    if (error && !documentData) {
        return (
            <div className={styles.container}>
                <div className={styles.errorBox}>
                    <AlertCircle size={48} color="#ef4444" />
                    <h1>Link Error</h1>
                    <p>{error}</p>
                    <a href="/" className={styles.backHome}>Go to Homepage</a>
                </div>
            </div>
        );
    }

    if (documentData) {
        return (
            <div className={styles.container}>
                <div className={styles.documentHeader}>
                    <div className={styles.docInfo}>
                        <FileText size={32} color="#0ea5e9" />
                        <div>
                            <h1>{documentData.filename}</h1>
                            <p>Securely shared with you via <span className="brand-font">docucr</span></p>
                        </div>
                    </div>
                </div>

                <div className={styles.viewerContainer}>
                    {documentData.preview_url ? (
                        <iframe
                            src={documentData.preview_url}
                            className={styles.pdfViewer}
                            title="Document Preview"
                        />
                    ) : (
                        <div className={styles.viewerPlaceholder}>
                            <Eye size={64} opacity={0.5} />
                            <p>Document Viewer Ready</p>
                            <p className={styles.docDetail}>Status: {documentData.status} | Type: {documentData.content_type}</p>
                            <div className={styles.actions}>
                                <button className={styles.primaryBtn} onClick={() => window.open(documentData.preview_url, '_blank')}>
                                    <Eye size={18} /> View Document
                                </button>
                                {documentData.download_url && (
                                    <button
                                        className={styles.secondaryBtn}
                                        onClick={() => window.location.href = documentData.download_url}
                                    >
                                        <Download size={18} /> Download
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <footer className={styles.publicFooter}>
                    <p>Powered by <strong className="brand-font">docucr</strong> | Secure Artificial Intelligence for Documents</p>
                </footer>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.iconCircle}>
                        <Lock size={32} color="#0ea5e9" />
                    </div>
                    <h1>Password Protected</h1>
                    <p>This document is protected.
                        <br />Please enter the password provided to access
                        <br /><strong>{metadata?.filename}</strong>.</p>
                </div>

                <form onSubmit={handleVerify} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>Document Password</label>
                        <input
                            type="password"
                            autoFocus
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <div className={styles.errorMessage}>{error}</div>}
                    <button type="submit" disabled={verifying} className={styles.submitBtn}>
                        {verifying ? 'Verifying...' : 'Access Document'}
                    </button>
                </form>

                <div className={styles.metaInfo}>
                    <div className={styles.metaItem}>
                        <Share2 size={16} />
                        <span>Shared by <strong>{metadata?.shared_by}</strong></span>
                    </div>
                    <div className={styles.metaItem}>
                        <AlertCircle size={16} />
                        <span>Expires on {new Date(metadata?.expires_at || '').toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicShare;
