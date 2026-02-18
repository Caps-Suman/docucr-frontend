import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import styles from './UserModal.module.css'; // Reusing UserModal styles for consistency

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (password: string) => Promise<void>;
    username: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    username
}) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(password);
            // Reset form on success
            setPassword('');
            setConfirmPassword('');
            onClose();
        } catch (err) {
            // Error handling usually done in parent, but safety here
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className={styles.header}>
                    <h2>
                        <Lock size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        Change Password
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '24px 24px 16px', color: '#6b7280', fontSize: '14px' }}>
                    Set a new password for - <strong>{username}</strong>.
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.formContent}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>New Password</label>
                            <input
                                type="password"
                                className={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Confirm Password</label>
                            <input
                                type="password"
                                className={styles.input}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                style={{ borderColor: error ? '#ef4444' : '#d1d5db' }}
                            />
                            {error && <span className={styles.errorText}>{error}</span>}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting || !password || !confirmPassword}
                        >
                            {isSubmitting ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
