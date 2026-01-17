import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
        warning: AlertTriangle
    };

    const Icon = icons[type];

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            <Icon size={20} />
            <span className={styles.message}>{message}</span>
            <button className={styles.closeButton} onClick={onClose}>
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
