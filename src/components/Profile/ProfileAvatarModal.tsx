import React from 'react';
import { X, Camera, User } from 'lucide-react';
import styles from './ProfileAvatarModal.module.css';

interface ProfileAvatarModalProps {
    currentImage: string | null;
    firstName: string;
    onClose: () => void;
    onUploadClick: () => void;
}

const ProfileAvatarModal: React.FC<ProfileAvatarModalProps> = ({
    currentImage,
    firstName,
    onClose,
    onUploadClick
}) => {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3>Profile Photo</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.avatarPreviewContainer}>
                    <div className={styles.avatarPreviewLarge} style={currentImage ? { backgroundImage: `url(${currentImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                        {!currentImage && (firstName ? firstName.charAt(0).toUpperCase() : <User size={80} />)}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.uploadBtn} onClick={onUploadClick}>
                        <Camera size={18} />
                        Update Photo
                    </button>
                    {currentImage && (
                        <button className={styles.removeBtn} onClick={() => {/* Optional: Add remove logic */ }}>
                            Remove Photo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileAvatarModal;
