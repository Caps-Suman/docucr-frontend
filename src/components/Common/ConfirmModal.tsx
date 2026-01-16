import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

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
        <div className="confirm-overlay" onClick={onClose}>
            <div className="confirm-content" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-header">
                    <div className={`confirm-icon ${type}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <button className="confirm-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="confirm-body">
                    <h3>{title}</h3>
                    <p>{message}</p>
                </div>
                <div className="confirm-actions">
                    <button className="btn-cancel" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button className={`btn-confirm ${type}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
