import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={`${styles.icon} ${type === 'warning' ? styles.iconWarning : styles.iconDanger}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.body}>
                    <h3>{title}</h3>
                    <p>{message}</p>
                </div>
                <div className={styles.actions}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        {cancelText}
                    </button>
                    <button 
                        className={`${styles.confirmButton} ${type === 'warning' ? styles.confirmButtonWarning : styles.confirmButtonDanger}`} 
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
