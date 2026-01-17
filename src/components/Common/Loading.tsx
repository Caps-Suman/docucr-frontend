import React from 'react';
import styles from './Loading.module.css';

interface LoadingProps {
  fullScreen?: boolean;
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ fullScreen = false, message = 'Loading...' }) => {
  return (
    <div className={`${styles.container} ${fullScreen ? styles.fullscreen : ''}`}>
      <div className={styles.content}>
        <div className={styles.spinner}></div>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
};

export default Loading;
