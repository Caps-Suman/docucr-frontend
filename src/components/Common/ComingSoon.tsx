import React from 'react';
import { Clock } from 'lucide-react';
import styles from './ComingSoon.module.css';

interface ComingSoonProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ 
  title = 'Coming Soon', 
  description = 'This feature is currently under development and will be available soon.',
  icon = <Clock size={48} />
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>
          {icon}
        </div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
    </div>
  );
};

export default ComingSoon;