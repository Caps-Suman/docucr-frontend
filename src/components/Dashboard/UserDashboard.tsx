import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, Share, Archive, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import documentService from '../../services/document.service';
import Loading from '../Common/Loading';
import styles from './Dashboard.module.css';

const UserDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        processed: 0,
        processing: 0,
        sharedWithMe: 0,
        archived: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const statsRes = await documentService.getStats();
                setStats(statsRes);
            } catch (error) {
                console.error('Failed to load stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <Loading />;

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.titleSection}>
                <h1>Document Dashboard</h1>
                <p>Overview of your document processing</p>
            </div>

            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard} onClick={() => navigate('/documents')}>
                    <div className={`${styles.kpiIcon}`} style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                        <FileText size={16} />
                    </div>
                    <div className={styles.kpiInfo}>
                        <span className={styles.kpiValue}>{stats.total}</span>
                        <span className={styles.kpiLabel}>Total Documents</span>
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon}`} style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                        <CheckCircle size={16} />
                    </div>
                    <div className={styles.kpiInfo}>
                        <span className={styles.kpiValue}>{stats.processed}</span>
                        <span className={styles.kpiLabel}>Processed</span>
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon}`} style={{ backgroundColor: '#fed7aa', color: '#c2410c' }}>
                        <Clock size={16} />
                    </div>
                    <div className={styles.kpiInfo}>
                        <span className={styles.kpiValue}>{stats.processing}</span>
                        <span className={styles.kpiLabel}>Processing</span>
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon}`} style={{ backgroundColor: '#f0f9ff', color: '#0ea5e9' }}>
                        <Share size={16} />
                    </div>
                    <div className={styles.kpiInfo}>
                        <span className={styles.kpiValue}>{stats.sharedWithMe}</span>
                        <span className={styles.kpiLabel}>Shared with Me</span>
                    </div>
                </div>

                <div className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon}`} style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                        <Archive size={16} />
                    </div>
                    <div className={styles.kpiInfo}>
                        <span className={styles.kpiValue}>{stats.archived}</span>
                        <span className={styles.kpiLabel}>Archived</span>
                    </div>
                </div>
            </div>

            <div className={styles.actionsCard}>
                <h3>Quick Actions</h3>
                <div className={styles.actionButtons}>
                    <button 
                        className={styles.actionBtn}
                        onClick={() => navigate('/documents/upload')}
                    >
                        <Upload size={16} />
                        Upload Document
                    </button>
                    <button 
                        className={styles.actionBtn}
                        onClick={() => navigate('/documents')}
                    >
                        <FileText size={16} />
                        View All Documents
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
