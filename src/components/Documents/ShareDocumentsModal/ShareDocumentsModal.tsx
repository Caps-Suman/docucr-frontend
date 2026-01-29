// import React, { useState, useEffect } from 'react';
// import { X, Share, Users, Mail, Lock } from 'lucide-react';
// import { fetchWithAuth } from '../../../utils/api';
// import styles from './ShareDocumentsModal.module.css';

// interface User {
//     id: string;
//     username: string;
//     first_name: string;
//     last_name: string;
//     email: string;
// }

// interface ShareDocumentsModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     documentIds: string[];
//     onShare: () => void;
// }

// const ShareDocumentsModal: React.FC<ShareDocumentsModalProps> = ({
//     isOpen,
//     onClose,
//     documentIds,
//     onShare
// }) => {
//     const [activeTab, setActiveTab] = useState<'internal' | 'email'>('internal');
//     const [users, setUsers] = useState<User[]>([]);
//     const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
//     const [emailConfig, setEmailConfig] = useState({ email: '', password: '' });
//     const [loading, setLoading] = useState(false);
//     const [sharing, setSharing] = useState(false);

//     useEffect(() => {
//         if (isOpen) {
//             console.log('ShareDocumentsModal opened with IDs:', documentIds);
//         }
//     }, [isOpen, documentIds]);

//     useEffect(() => {
//         if (isOpen && activeTab === 'internal') {
//             loadUsers();
//         }
//     }, [isOpen, activeTab]);

//     const loadUsers = async () => {
//         try {
//             setLoading(true);
//             const response = await fetchWithAuth('/api/users/');
//             if (response.ok) {
//                 const data = await response.json();
//                 setUsers(data.users || data);
//             }
//         } catch (error) {
//             console.error('Failed to load users:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleUserToggle = (userId: string) => {
//         setSelectedUsers(prev =>
//             prev.includes(userId)
//                 ? prev.filter(id => id !== userId)
//                 : [...prev, userId]
//         );
//     };

//     const handleShare = async () => {
//         if (activeTab === 'internal' && selectedUsers.length === 0) return;
//         if (activeTab === 'email' && (!emailConfig.email || !emailConfig.password)) return;

//         try {
//             setSharing(true);

//             if (activeTab === 'internal') {
//                 const response = await fetchWithAuth('/api/documents/share', {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({
//                         document_ids: documentIds,
//                         user_ids: selectedUsers
//                     })
//                 });

//                 if (response.ok) {
//                     onShare();
//                     onClose();
//                     setSelectedUsers([]);
//                 }
//             } else {
//                 // Consolidated Email Sharing for multiple documents
//                 await fetchWithAuth('/api/documents/share/external/batch', {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json' },
//                     body: JSON.stringify({
//                         document_ids: documentIds,
//                         email: emailConfig.email,
//                         password: emailConfig.password
//                     })
//                 });
//                 onShare();
//                 onClose();
//                 setEmailConfig({ email: '', password: '' });
//             }
//         } catch (error) {
//             console.error('Failed to share documents:', error);
//         } finally {
//             setSharing(false);
//         }
//     };

//     if (!isOpen) return null;

//     const isShareDisabled = sharing ||
//         (activeTab === 'internal' && selectedUsers.length === 0) ||
//         (activeTab === 'email' && (!emailConfig.email || !emailConfig.password));

//     return (
//         <div className={styles.overlay}>
//             <div className={styles.modal}>
//                 <div className={styles.header}>
//                     <h3>
//                         <Share size={20} />
//                         Share Documents ({documentIds.length})
//                     </h3>
//                     <button className={styles.closeButton} onClick={onClose}>
//                         <X size={20} />
//                     </button>
//                 </div>

//                 <div className={styles.tabs}>
//                     <button
//                         className={`${styles.tab} ${activeTab === 'internal' ? styles.activeTab : ''}`}
//                         onClick={() => setActiveTab('internal')}
//                     >
//                         <Users size={16} />
//                         Internal Team
//                     </button>
//                     <button
//                         className={`${styles.tab} ${activeTab === 'email' ? styles.activeTab : ''}`}
//                         onClick={() => setActiveTab('email')}
//                     >
//                         <Mail size={16} />
//                         External Email
//                     </button>
//                 </div>

//                 <div className={styles.content}>
//                     {activeTab === 'internal' ? (
//                         <div className={styles.section}>
//                             <h4>Select Users to Share With</h4>
//                             {loading ? (
//                                 <div className={styles.loading}>Loading users...</div>
//                             ) : (
//                                 <div className={styles.userList}>
//                                     {users.map(user => (
//                                         <label key={user.id} className={styles.userItem}>
//                                             <input
//                                                 type="checkbox"
//                                                 checked={selectedUsers.includes(user.id)}
//                                                 onChange={() => handleUserToggle(user.id)}
//                                             />
//                                             <div className={styles.userInfo}>
//                                                 <span className={styles.userName}>
//                                                     {user.first_name} {user.last_name}
//                                                 </span>
//                                                 <span className={styles.userEmail}>{user.email}</span>
//                                             </div>
//                                         </label>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     ) : (
//                         <div className={styles.section}>
//                             <h4>Share via Email</h4>
//                             <div className={styles.formGroup}>
//                                 <label>Recipient Email</label>
//                                 <input
//                                     type="email"
//                                     placeholder="Enter email address"
//                                     value={emailConfig.email}
//                                     onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
//                                 />
//                             </div>
//                             <div className={styles.formGroup}>
//                                 <label>Access Password</label>
//                                 <input
//                                     type="password"
//                                     placeholder="Set a password for link access"
//                                     value={emailConfig.password}
//                                     onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
//                                 />
//                                 <span className={styles.hint}>The recipient will need this password to view the document.</span>
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 <div className={styles.footer}>
//                     <button className={styles.cancelButton} onClick={onClose}>
//                         Cancel
//                     </button>
//                     <button
//                         className={styles.shareButton}
//                         onClick={handleShare}
//                         disabled={isShareDisabled}
//                     >
//                         {sharing ? 'Sharing...' : 'Share Documents'}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default ShareDocumentsModal;

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
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data.users || data);
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

            if (!response.ok) {
                throw new Error('Failed to share documents');
            }

            onShare();
            onClose();
            setSelectedUsers([]);
        } catch (error) {
            console.error('Failed to share documents:', error);
        } finally {
            setSharing(false);
        }
    };

    if (!isOpen) return null;

    const isShareDisabled = sharing || selectedUsers.length === 0;

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
                            Select Users
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
                                            <span className={styles.userEmail}>
                                                {user.email}
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <button
                        className={styles.cancelButton}
                        onClick={onClose}
                        disabled={sharing}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.shareButton}
                        onClick={handleShare}
                        disabled={isShareDisabled}
                    >
                        {sharing ? 'Sharing...' : 'Share Documents'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareDocumentsModal;
