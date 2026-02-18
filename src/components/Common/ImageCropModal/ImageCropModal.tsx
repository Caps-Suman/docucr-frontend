import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, RotateCcw } from 'lucide-react';
import getCroppedImg from '../../../utils/canvasUtils';
import styles from './ImageCropModal.module.css';

interface ImageCropModalProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onClose: () => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ image, onCropComplete, onClose }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onRotationChange = (rotation: number) => {
        setRotation(rotation);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteCallback = useCallback((_croppedArea: any, pixelCrop: any) => {
        setCroppedAreaPixels(pixelCrop);
    }, []);

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h3>Crop Profile Photo</h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.cropperContainer}>
                    <Cropper
                        image={image}
                        crop={crop}
                        rotation={rotation}
                        zoom={zoom}
                        aspect={1 / 1}
                        onCropChange={onCropChange}
                        onRotationChange={onRotationChange}
                        onCropComplete={onCropCompleteCallback}
                        onZoomChange={onZoomChange}
                        cropShape="round"
                        showGrid={false}
                    />
                </div>

                <div className={styles.modalFooter}>
                    <div className={styles.controls}>
                        <div className={styles.controlGroup}>
                            <ZoomIn size={18} />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className={styles.rangeInput}
                            />
                        </div>
                        <div className={styles.controlGroup}>
                            <RotateCcw size={18} />
                            <input
                                type="range"
                                value={rotation}
                                min={0}
                                max={360}
                                step={1}
                                aria-labelledby="Rotation"
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className={styles.rangeInput}
                            />
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.cancelBtn} onClick={onClose}>
                            Cancel
                        </button>
                        <button className={styles.saveBtn} onClick={handleSave}>
                            Apply & Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropModal;
