import React from 'react';
import { Lock } from 'lucide-react';
import styles from './NoAccess.module.css';

interface NoAccessProps {
    title?: string;
    description?: string;
}

const NoAccess: React.FC<NoAccessProps> = ({
    title = "Access Restricted",
    description = "You do not have access to any modules in this role. Please contact your administrator."
}) => {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    <Lock size={48} className={styles.icon} />
                </div>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.description}>{description}</p>
            </div>
        </div>
    );
};

export default NoAccess;
