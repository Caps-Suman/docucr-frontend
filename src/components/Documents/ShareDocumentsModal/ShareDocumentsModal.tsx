import React, { useState, useEffect } from 'react';
import { X, Share, Users } from 'lucide-react';
import { fetchWithAuth } from '../../../utils/api';
import styles from './ShareDocumentsModal.module.css';

interface User {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface ShareDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentIds: string[];
    onShare: () => void;
}

const ShareDocumentsModal: React.FC<ShareDocumentsModalProps> = ({
    isOpen,
    onClose,
    documentIds,
    onShare
}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadUsers();
        }
    }, [isOpen]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/users/');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || data);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserToggle = (userId: string) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleShare = async () => {
        if (selectedUsers.length === 0) return;

        try {
            setSharing(true);
            const response = await fetchWithAuth('/api/documents/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_ids: documentIds,
                    user_ids: selectedUsers
                })
            });

            if (response.ok) {
                onShare();
                onClose();
                setSelectedUsers([]);
            }
        } catch (error) {
            console.error('Failed to share documents:', error);
        } finally {
            setSharing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>
                        <Share size={20} />
                        Share Documents ({documentIds.length})
                    </h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h4>
                            <Users size={16} />
                            Select Users to Share With
                        </h4>
                        
                        {loading ? (
                            <div className={styles.loading}>Loading users...</div>
                        ) : (
                            <div className={styles.userList}>
                                {users.map(user => (
                                    <label key={user.id} className={styles.userItem}>
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => handleUserToggle(user.id)}
                                        />
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>
                                                {user.first_name} {user.last_name}
                                            </span>
                                            <span className={styles.userEmail}>{user.email}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>
                    <button 
                        className={styles.shareButton}
                        onClick={handleShare}
                        disabled={selectedUsers.length === 0 || sharing}
                    >
                        {sharing ? 'Sharing...' : `Share with ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareDocumentsModal;