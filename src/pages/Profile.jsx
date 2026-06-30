import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Mail, Briefcase, Shield, Hash, Users, MapPin, Calendar, ZoomIn, Move, X, Lock, Eye, EyeOff, CheckCircle, AlertCircle, KeyRound, Camera, RotateCcw, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeDossier from './EmployeeDossier';

const PROFILE_IMAGE_MAX_DIMENSION = 512;
const PROFILE_IMAGE_TARGET_BYTES = 900 * 1024;
const PROFILE_IMAGE_CROP_FRAME_SIZE = 280;
const PROFILE_IMAGE_VISIBLE_CROP_SIZE = 210;
const PROFILE_IMAGE_PREVIEW_SIZE = 84;

const loadImageFromFile = (file) => new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
    };

    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read the selected image.'));
    };

    image.src = objectUrl;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
        if (blob) {
            resolve(blob);
            return;
        }

        reject(new Error('Failed to process the selected image.'));
    }, type, quality);
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getCropBounds = (imageMeta, zoom) => {
    if (!imageMeta) {
        return { maxOffsetX: 0, maxOffsetY: 0 };
    }

    const scaledWidth = imageMeta.width * imageMeta.baseScale * zoom;
    const scaledHeight = imageMeta.height * imageMeta.baseScale * zoom;

    return {
        maxOffsetX: Math.max(0, (scaledWidth - PROFILE_IMAGE_CROP_FRAME_SIZE) / 2),
        maxOffsetY: Math.max(0, (scaledHeight - PROFILE_IMAGE_CROP_FRAME_SIZE) / 2)
    };
};

const clampCropPosition = (crop, imageMeta, zoom) => {
    const { maxOffsetX, maxOffsetY } = getCropBounds(imageMeta, zoom);

    return {
        x: clamp(crop.x, -maxOffsetX, maxOffsetX),
        y: clamp(crop.y, -maxOffsetY, maxOffsetY)
    };
};

const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser.'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => {
                let msg = 'Failed to get your current location.';
                if (error.code === error.PERMISSION_DENIED) {
                    msg = 'Location permission is required to upload a profile picture. Please enable location services.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg = 'Location information is unavailable.';
                } else if (error.code === error.TIMEOUT) {
                    msg = 'Location request timed out.';
                }
                reject(new Error(msg));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
};

const createCroppedProfileImage = async (file, imageMeta, crop, zoom, latitude, longitude, timestamp) => {
    const image = await loadImageFromFile(file);
    const scale = imageMeta.baseScale * zoom;
    const cropWidth = PROFILE_IMAGE_VISIBLE_CROP_SIZE / scale;
    const cropHeight = PROFILE_IMAGE_VISIBLE_CROP_SIZE / scale;
    const sourceX = clamp(
        (image.width / 2) - (cropWidth / 2) - (crop.x / scale),
        0,
        Math.max(0, image.width - cropWidth)
    );
    const sourceY = clamp(
        (image.height / 2) - (cropHeight / 2) - (crop.y / scale),
        0,
        Math.max(0, image.height - cropHeight)
    );
    const canvas = document.createElement('canvas');

    canvas.width = PROFILE_IMAGE_MAX_DIMENSION;
    canvas.height = PROFILE_IMAGE_MAX_DIMENSION;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Image processing is not supported in this browser.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
        image,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Draw Location and Timestamp watermark/stamp
    if (latitude !== undefined && longitude !== undefined && timestamp !== undefined) {
        const barHeight = 55;
        context.fillStyle = 'rgba(0, 0, 0, 0.55)';
        context.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        context.fillStyle = '#ffffff';
        context.font = 'bold 12px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        const date = new Date(timestamp);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

        context.fillText(`Location: Lat ${parseFloat(latitude).toFixed(6)}, Lng ${parseFloat(longitude).toFixed(6)}`, canvas.width / 2, canvas.height - 35);
        context.fillText(`Timestamp: ${formattedDate}`, canvas.width / 2, canvas.height - 15);
    }

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);

    return new File(
        [blob],
        `${file.name.replace(/\.[^/.]+$/, '') || 'profile-picture'}-cropped.jpg`,
        { type: 'image/jpeg' }
    );
};

const optimizeProfileImage = async (file) => {
    if (!file.type?.startsWith('image/')) {
        throw new Error('Please select an image file.');
    }

    if (file.size <= PROFILE_IMAGE_TARGET_BYTES) {
        return file;
    }

    const image = await loadImageFromFile(file);
    const scale = Math.min(
        1,
        PROFILE_IMAGE_MAX_DIMENSION / image.width,
        PROFILE_IMAGE_MAX_DIMENSION / image.height
    );

    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Image processing is not supported in this browser.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    let quality = 0.82;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);

    while (blob.size > PROFILE_IMAGE_TARGET_BYTES && quality > 0.5) {
        quality -= 0.08;
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    return new File(
        [blob],
        `${file.name.replace(/\.[^/.]+$/, '') || 'profile-picture'}.jpg`,
        { type: 'image/jpeg' }
    );
};

/* ─── Password validation rules ─────────────────────────────── */
const PASSWORD_RULES = [
    { id: 'length',    label: 'At least 8 characters',           test: (p) => p.length >= 8 },
    { id: 'upper',     label: 'One uppercase letter (A–Z)',       test: (p) => /[A-Z]/.test(p) },
    { id: 'number',    label: 'One number (0–9)',                 test: (p) => /[0-9]/.test(p) },
    { id: 'special',   label: 'One special character (!@#$…)',    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

const validatePassword = (password) => PASSWORD_RULES.every(r => r.test(password));

/* ─── Password Strength Bar ─────────────────────────────────── */
const PasswordStrength = ({ password }) => {
    if (!password) return null;
    const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
    const levels = [
        { label: 'Weak',    color: 'bg-red-500' },
        { label: 'Fair',    color: 'bg-orange-400' },
        { label: 'Good',    color: 'bg-yellow-400' },
        { label: 'Strong',  color: 'bg-emerald-500' },
    ];
    const level = levels[Math.min(passed - 1, 3)] || levels[0];

    return (
        <div className="mt-2 space-y-2">
            <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < passed ? level.color : 'bg-slate-200'}`} />
                ))}
            </div>
            <p className={`text-xs font-semibold ${passed <= 1 ? 'text-red-500' : passed === 2 ? 'text-orange-400' : passed === 3 ? 'text-yellow-500' : 'text-emerald-600'}`}>
                {level.label}
            </p>
            <ul className="space-y-1">
                {PASSWORD_RULES.map(rule => (
                    <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {rule.test(password)
                            ? <CheckCircle size={12} className="shrink-0" />
                            : <div className="w-3 h-3 rounded-full border border-slate-300 shrink-0" />}
                        {rule.label}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const isMobileDevice = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0);
};

const dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

const Profile = () => {
    const { user: currentUser, refreshProfile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [localProfilePictureUrl, setLocalProfilePictureUrl] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [cropUpload, setCropUpload] = useState(null);
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [dragState, setDragState] = useState(null);
    const hasPhotoUploadPermission = currentUser?.roles?.some(role => {
        const roleName = typeof role === 'string' ? role : role?.name;
        return ['Admin', 'Super Admin', 'System Admin'].includes(roleName);
    }) || currentUser?.hasAllPermissions || currentUser?.permissions?.includes('*') || currentUser?.permissions?.includes('dossier.profile_photo.upload');

    const forceCameraCapture = currentUser?.company?.settings?.profile?.requireCameraCapture || !hasPhotoUploadPermission;

    const requestedTab = searchParams.get('tab') || 'personal';

    /* ── Webcam Capture State & Logic ── */
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [capturedImage, setCapturedImage] = useState('');
    const [cameraError, setCameraError] = useState('');
    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = async () => {
        try {
            setCameraError('');
            setCapturedImage('');
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 640 }, 
                    aspectRatio: 1,
                    facingMode: 'user' 
                },
                audio: false
            });
            
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(err => console.error('Video play error:', err));
                };
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setCameraError('Could not access camera. Please make sure camera permissions are granted.');
        }
    };

    const handleOpenWebcam = () => {
        setShowCameraModal(true);
        setTimeout(() => {
            startCamera();
        }, 100);
    };

    const handleCloseWebcam = () => {
        stopCamera();
        setShowCameraModal(false);
        setCapturedImage('');
        setCameraError('');
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        
        context.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
    };

    const flipCapturedImage = () => {
        if (!capturedImage) return;
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const context = canvas.getContext('2d');
            if (context) {
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(img, 0, 0);
                setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
            }
        };
        img.src = capturedImage;
    };

    const handleUseCapturedPhoto = () => {
        if (!capturedImage) return;
        const file = dataURLtoFile(capturedImage, `camera_capture_${Date.now()}.jpg`);
        const fakeEvent = {
            target: {
                files: [file],
                value: ''
            }
        };
        handleImageSelection(fakeEvent, true);
        handleCloseWebcam();
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    /* ── Password change state ── */
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwErrors, setPwErrors] = useState({});
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    /* ── Password form handlers ── */
    const handlePwChange = (field, value) => {
        setPwForm(prev => ({ ...prev, [field]: value }));
        if (pwErrors[field]) setPwErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validatePwForm = () => {
        const errors = {};
        if (!pwForm.currentPassword) errors.currentPassword = 'Current password is required.';
        if (!pwForm.newPassword) {
            errors.newPassword = 'New password is required.';
        } else if (!validatePassword(pwForm.newPassword)) {
            errors.newPassword = 'Password does not meet the requirements below.';
        }
        if (!pwForm.confirmPassword) {
            errors.confirmPassword = 'Please confirm your new password.';
        } else if (pwForm.newPassword !== pwForm.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match.';
        }
        return errors;
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        const errors = validatePwForm();
        if (Object.keys(errors).length > 0) { setPwErrors(errors); return; }

        setSavingPassword(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword
            });
            toast.success('Password changed successfully!');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPwErrors({});
            setShowPasswordSection(false);
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to change password.';
            toast.error(message);
            if (error.response?.status === 401) {
                setPwErrors({ currentPassword: 'Current password is incorrect.' });
            }
        } finally {
            setSavingPassword(false);
        }
    };

    const handleTabChange = useCallback((tabId) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('tab', tabId);
        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/profile');
                setProfile(res.data);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!dragState) return undefined;

        const handlePointerMove = (event) => {
            const point = 'touches' in event ? event.touches[0] : event;
            if (!point) return;
            if ('touches' in event) {
                event.preventDefault();
            }

            setCropPosition(
                clampCropPosition(
                    {
                        x: dragState.originCrop.x + (point.clientX - dragState.startX),
                        y: dragState.originCrop.y + (point.clientY - dragState.startY)
                    },
                    cropUpload?.imageMeta,
                    cropZoom
                )
            );
        };

        const handlePointerUp = () => {
            setDragState(null);
        };

        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);

        return () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }, [cropUpload?.imageMeta, cropZoom, dragState]);

    useEffect(() => () => {
        if (cropUpload?.objectUrl) {
            URL.revokeObjectURL(cropUpload.objectUrl);
        }
    }, [cropUpload]);

    useEffect(() => () => {
        if (localProfilePictureUrl) {
            URL.revokeObjectURL(localProfilePictureUrl);
        }
    }, [localProfilePictureUrl]);

    const updateLocalProfilePictureUrl = useCallback((nextUrl) => {
        setLocalProfilePictureUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev);
            }
            return nextUrl;
        });
    }, []);

    const closeCropModal = useCallback(() => {
        if (cropUpload?.objectUrl) {
            URL.revokeObjectURL(cropUpload.objectUrl);
        }

        setCropUpload(null);
        setCropPosition({ x: 0, y: 0 });
        setCropZoom(1);
        setDragState(null);
    }, [cropUpload]);

    const handleImageSelection = async (e, isWebcam = false) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        try {
            // Verify if file has content and is readable (prevents 0-byte virtual/cloud file errors)
            if (file.size === 0) {
                throw new Error('The selected file is empty or unreadable. If this is a cloud file (e.g. Google Drive), please download it to your device first.');
            }

            // Support empty mime-type fallback via file extension for robust mobile selection
            let fileType = file.type;
            if ((!fileType || fileType === 'application/octet-stream') && file.name) {
                const ext = file.name.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) {
                    fileType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                }
            }

            if (!fileType?.startsWith('image/')) {
                throw new Error('Please select an image file.');
            }

            if (forceCameraCapture && !isWebcam) {
                if (!isMobileDevice()) {
                    throw new Error('Direct camera capture is required. Please update your profile photo using a mobile or tablet device with a camera.');
                }
                const fileAgeMs = Date.now() - file.lastModified;
                if (fileAgeMs > 25000) {
                    throw new Error('Direct camera capture is required. Please capture the photo directly using your device camera instead of choosing a pre-saved file.');
                }
            }

            const image = await loadImageFromFile(file);
            const objectUrl = URL.createObjectURL(file);
            const baseScale = Math.max(
                PROFILE_IMAGE_CROP_FRAME_SIZE / image.width,
                PROFILE_IMAGE_CROP_FRAME_SIZE / image.height
            );

            closeCropModal();
            setCropUpload({
                file,
                objectUrl,
                imageMeta: {
                    width: image.width,
                    height: image.height,
                    baseScale
                }
            });
            setCropPosition({ x: 0, y: 0 });
            setCropZoom(1);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to prepare image');
        }
    };

    const handleCropUpload = async () => {
        if (!cropUpload?.file || !cropUpload?.imageMeta) return;

        setUploading(true);
        const loadingToast = toast.loading('Getting current location...');

        try {
            const position = await getCurrentLocation();
            const { latitude, longitude } = position.coords;
            const timestamp = new Date().toISOString();

            toast.loading('Resolving location address...', { id: loadingToast });
            let address = '';
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                    headers: { 'Accept-Language': 'en' }
                });
                const geoData = await geoRes.json();
                address = geoData.display_name || '';
            } catch (err) {
                console.warn('Failed to reverse-geocode coordinates:', err);
            }

            toast.loading('Processing profile picture...', { id: loadingToast });

            const croppedFile = await createCroppedProfileImage(
                cropUpload.file,
                cropUpload.imageMeta,
                cropPosition,
                cropZoom,
                latitude,
                longitude,
                timestamp
            );
            const optimizedFile = await optimizeProfileImage(croppedFile);
            const formData = new FormData();
            formData.append('image', optimizedFile);
            formData.append('latitude', latitude.toString());
            formData.append('longitude', longitude.toString());
            formData.append('timestamp', timestamp);
            formData.append('address', address);

            const res = await api.post('/auth/upload-profile-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            updateLocalProfilePictureUrl(URL.createObjectURL(optimizedFile));
            setProfile(prev => ({ 
                ...prev, 
                profilePicture: res.data.profilePicture,
                profilePictureMetadata: res.data.profilePictureMetadata 
            }));
            if (refreshProfile) {
                refreshProfile().catch(() => {});
            }
            closeCropModal();
            toast.success('Profile picture updated!');
        } catch (error) {
            console.error(error);
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;

            if (status === 413) {
                toast.error('Image is too large. Please use a smaller photo.');
            } else {
                toast.error(message || 'Failed to upload image');
            }
        } finally {
            setUploading(false);
            toast.dismiss(loadingToast);
        }
    };

    const handleCropZoomChange = (event) => {
        const nextZoom = Number(event.target.value);
        setCropZoom(nextZoom);
        setCropPosition((prev) => clampCropPosition(prev, cropUpload?.imageMeta, nextZoom));
    };

    const handleCropDragStart = (event) => {
        if (!cropUpload?.imageMeta) return;

        const point = 'touches' in event ? event.touches[0] : event;
        if (!point) return;

        setDragState({
            startX: point.clientX,
            startY: point.clientY,
            originCrop: cropPosition
        });
    };

    const cropImageStyle = useMemo(() => {
        if (!cropUpload?.imageMeta) return {};

        return {
            width: cropUpload.imageMeta.width * cropUpload.imageMeta.baseScale * cropZoom,
            height: cropUpload.imageMeta.height * cropUpload.imageMeta.baseScale * cropZoom,
            transform: `translate(calc(-50% + ${cropPosition.x}px), calc(-50% + ${cropPosition.y}px))`
        };
    }, [cropPosition.x, cropPosition.y, cropUpload?.imageMeta, cropZoom]);

    const avatarPreviewStyle = useMemo(() => {
        if (!cropUpload?.imageMeta) return {};

        const previewRatio = PROFILE_IMAGE_PREVIEW_SIZE / PROFILE_IMAGE_VISIBLE_CROP_SIZE;

        return {
            width: cropUpload.imageMeta.width * cropUpload.imageMeta.baseScale * cropZoom * previewRatio,
            height: cropUpload.imageMeta.height * cropUpload.imageMeta.baseScale * cropZoom * previewRatio,
            transform: `translate(calc(-50% + ${cropPosition.x * previewRatio}px), calc(-50% + ${cropPosition.y * previewRatio}px))`
        };
    }, [cropPosition.x, cropPosition.y, cropUpload?.imageMeta, cropZoom]);

    const profileSectionPreviewStyle = useMemo(() => {
        if (!cropUpload?.imageMeta) return {};

        const previewRatio = 72 / PROFILE_IMAGE_VISIBLE_CROP_SIZE;

        return {
            width: cropUpload.imageMeta.width * cropUpload.imageMeta.baseScale * cropZoom * previewRatio,
            height: cropUpload.imageMeta.height * cropUpload.imageMeta.baseScale * cropZoom * previewRatio,
            transform: `translate(calc(-50% + ${cropPosition.x * previewRatio}px), calc(-50% + ${cropPosition.y * previewRatio}px))`
        };
    }, [cropPosition.x, cropPosition.y, cropUpload?.imageMeta, cropZoom]);

    const displayProfilePicture = localProfilePictureUrl || profile?.profilePicture || '';

    if (loading) return <div className="p-8 text-center text-slate-500">Loading Profile...</div>;
    if (!profile) return <div className="p-8 text-center text-red-500">Profile not found</div>;

    return (
        <div className="min-h-screen bg-slate-100 font-sans p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Card */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                    <div className="px-8 pb-8">
                        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-10 mb-6 gap-4">
                            <div className="flex items-end">
                                <div className="h-20 w-20 rounded-full bg-white p-1 shadow-lg relative group shrink-0">
                                    <div 
                                        onClick={() => {
                                            setShowViewModal(true);
                                        }}
                                        className="h-full w-full rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500 overflow-hidden relative cursor-pointer"
                                    >
                                        {displayProfilePicture ? (
                                            <img src={displayProfilePicture} alt="Profile" className="h-full w-full object-cover hover:brightness-95 transition-all" />
                                        ) : (
                                            <>
                                                {profile.firstName?.charAt(0)}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Upload
                                                </div>
                                            </>
                                        )}
 
                                        <input
                                            type="file"
                                            id="profile-upload"
                                            className="hidden"
                                            accept="image/*"
                                            capture={forceCameraCapture ? "user" : undefined}
                                            onChange={handleImageSelection}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h1 className="text-2xl font-bold mt-10 text-slate-800">{profile.firstName} {profile.lastName}</h1>
                                    <p className="text-slate-500 flex items-center text-sm">
                                        <Mail size={14} className="mr-1" /> {profile.email}
                                    </p>
                                    {profile.profilePictureMetadata && (profile.profilePictureMetadata.latitude !== null && profile.profilePictureMetadata.latitude !== undefined) && (
                                        <div className="flex flex-col gap-1 mt-2 text-slate-500 text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-lg shadow-sm w-fit">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={13} className="text-blue-500 shrink-0" />
                                                <span className="font-semibold">
                                                    Photo Stamp: {parseFloat(profile.profilePictureMetadata.latitude).toFixed(5)}°, {parseFloat(profile.profilePictureMetadata.longitude).toFixed(5)}° at {new Date(profile.profilePictureMetadata.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            {profile.profilePictureMetadata.address && (
                                                <div className="flex items-start gap-1 mt-1 border-t border-slate-200/60 pt-1 text-[11px] text-slate-500">
                                                    <span className="font-bold text-slate-700 shrink-0">Address: </span>
                                                    <span className="leading-relaxed" title={profile.profilePictureMetadata.address}>{profile.profilePictureMetadata.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${profile.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {profile.isActive ? 'Active Employee' : 'Inactive'}
                                </span>
                                <button
                                    type="button"
                                    id="change-password-toggle"
                                    onClick={() => setShowPasswordSection(v => !v)}
                                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                        showPasswordSection
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                >
                                    <KeyRound size={13} />
                                    {showPasswordSection ? 'Cancel' : 'Change Password'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role</label>
                                    <div className="flex items-center mt-1 text-slate-700">
                                        <Shield size={18} className="mr-2 text-blue-500" />
                                        <span className="font-medium">{profile.roles?.map(r => r.name).join(', ') || 'No Role'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee ID</label>
                                    <div className="flex items-center mt-1 text-slate-700">
                                        <Hash size={18} className="mr-2 text-slate-400" />
                                        <span className="font-mono">{profile.employeeCode || 'N/A'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employment Type</label>
                                    <div className="flex items-center mt-1 text-slate-700">
                                        <Briefcase size={18} className="mr-2 text-slate-400" />
                                        <span>{profile.employmentType || 'Full Time'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</label>
                                    <div className="flex items-center mt-1 text-slate-700">
                                        <Briefcase size={18} className="mr-2 text-slate-400" />
                                        <span>{profile.department || 'General'}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</label>
                                    <div className="flex items-center mt-1 text-slate-700">
                                        <MapPin size={18} className="mr-2 text-slate-400" />
                                        <span>{profile.workLocation || ''}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work Email</label>
                                    <div className="flex items-center mt-1 text-slate-700">
                                        <Mail size={18} className="mr-2 text-slate-400" />
                                        <span>{profile.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporting To</label>
                                    {profile.reportingManagers && profile.reportingManagers.length > 0 ? (
                                        <div className="space-y-2 mt-2">
                                            {profile.reportingManagers.map(manager => (
                                                <div key={manager._id} className="flex items-center p-2 bg-blue-50 rounded border border-blue-100">
                                                    <div className="h-8 w-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs mr-2">
                                                        {manager.firstName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{manager.firstName} {manager.lastName}</div>
                                                        <div className="text-xs text-slate-500">{manager.email}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-slate-400 text-sm italic">No Reporting Manager</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date of Joining</label>
                                    <div className="flex items-center mt-1 text-slate-700">
                                        <Calendar size={18} className="mr-2 text-slate-400" />
                                        <span className="font-medium">{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Password Change Section */}
                {showPasswordSection && (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-blue-100">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                                <Lock size={15} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Change Password</h3>
                                <p className="text-[11px] text-slate-500">Update your account security credentials</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Form fields */}
                                <div className="space-y-4">
                                    {/* Current Password */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="current-password"
                                                type={showCurrent ? 'text' : 'password'}
                                                value={pwForm.currentPassword}
                                                onChange={e => handlePwChange('currentPassword', e.target.value)}
                                                placeholder="Enter current password"
                                                className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none transition-all ${pwErrors.currentPassword ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                                            />
                                            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {pwErrors.currentPassword && (
                                            <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                                                <AlertCircle size={10} /> {pwErrors.currentPassword}
                                            </p>
                                        )}
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="new-password"
                                                type={showNew ? 'text' : 'password'}
                                                value={pwForm.newPassword}
                                                onChange={e => handlePwChange('newPassword', e.target.value)}
                                                placeholder="Create a strong password"
                                                className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none transition-all ${pwErrors.newPassword ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                                            />
                                            <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {pwErrors.newPassword && (
                                            <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                                                <AlertCircle size={10} /> {pwErrors.newPassword}
                                            </p>
                                        )}
                                        {pwForm.newPassword && <PasswordStrength password={pwForm.newPassword} />}
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="confirm-password"
                                                type={showConfirm ? 'text' : 'password'}
                                                value={pwForm.confirmPassword}
                                                onChange={e => handlePwChange('confirmPassword', e.target.value)}
                                                placeholder="Re-enter new password"
                                                className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none transition-all ${pwErrors.confirmPassword ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100' : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'}`}
                                            />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {pwErrors.confirmPassword && (
                                            <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                                                <AlertCircle size={10} /> {pwErrors.confirmPassword}
                                            </p>
                                        )}
                                        {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && !pwErrors.confirmPassword && (
                                            <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1">
                                                <CheckCircle size={10} /> Passwords match
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Policy summary */}
                                <div className="lg:pl-6 lg:border-l border-slate-100">
                                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                            <Shield size={12} />
                                            Password Requirements
                                        </h4>
                                        <ul className="space-y-2.5">
                                            {PASSWORD_RULES.map(rule => {
                                                const passed = rule.test(pwForm.newPassword);
                                                return (
                                                    <li key={rule.id} className={`flex items-center gap-2.5 text-xs transition-colors ${passed ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${passed ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                                                            {passed
                                                                ? <CheckCircle size={10} className="text-emerald-600" />
                                                                : <div className="w-1 h-1 rounded-full bg-slate-400" />}
                                                        </div>
                                                        <span className={`${passed ? 'font-medium' : ''}`}>{rule.label}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-700">
                                        <strong>Tip:</strong> Use a mix of letters, numbers, and symbols. Avoid common words or personal info.
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={() => { setShowPasswordSection(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPwErrors({}); }}
                                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                    disabled={savingPassword}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    id="save-password-btn"
                                    disabled={savingPassword || !validatePassword(pwForm.newPassword) || pwForm.newPassword !== pwForm.confirmPassword || !pwForm.currentPassword}
                                    className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    {savingPassword ? (
                                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                                    ) : (
                                        <><Lock size={12} /> Update Password</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Subordinates Section */}
                {profile.directReports && profile.directReports.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center">
                                <Users size={18} className="mr-2 text-blue-600" />
                                My Team (Direct Reports)
                            </h3>
                            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">
                                {profile.directReports.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Employee</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Department</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {profile.directReports.map((report) => (
                                        <tr key={report._id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                                        {report.firstName.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-slate-700">{report.firstName} {report.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600">{report.email}</td>
                                            <td className="px-6 py-3 text-slate-600">{report.department || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Embedded Dossier */}
                <EmployeeDossier
                    userId={profile._id}
                    embedded={true}
                    initialTab={requestedTab}
                    onTabChange={handleTabChange}
                />
            </div>

            {cropUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Adjust Profile Photo</h2>
                                <p className="text-sm text-slate-500">Drag to reposition and zoom to fit your avatar.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCropModal}
                                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close crop modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                            <div>
                                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
                                    <Move size={16} />
                                    <span>Drag the image inside the frame</span>
                                </div>
                                <div
                                    className="relative mx-auto h-[280px] w-[280px] touch-none overflow-hidden rounded-[32px] bg-slate-900 shadow-inner select-none cursor-grab active:cursor-grabbing"
                                    onMouseDown={handleCropDragStart}
                                    onTouchStart={handleCropDragStart}
                                >
                                    <img
                                        src={cropUpload.objectUrl}
                                        alt="Crop preview"
                                        className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                                        style={cropImageStyle}
                                    />
                                    <div className="pointer-events-none absolute inset-0">
                                        <div className="absolute inset-0 bg-slate-950/35" />
                                        <div
                                            className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]"
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <ZoomIn size={16} />
                                        <span>Zoom</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="3"
                                        step="0.01"
                                        value={cropZoom}
                                        onChange={handleCropZoomChange}
                                        className="w-full accent-blue-600"
                                    />
                                    <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
                                        <span>Fit</span>
                                        <span>{Math.round(cropZoom * 100)}%</span>
                                        <span>Close-up</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="rounded-2xl bg-slate-50 p-5">
                                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                                        Profile Preview
                                    </p>
                                    <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                                        <div className="h-16 bg-gradient-to-r from-blue-600 to-indigo-700" />
                                        <div className="px-4 pb-4">
                                            <div className="-mt-8 flex items-end gap-3">
                                                <div className="h-20 w-20 shrink-0 rounded-full bg-white p-1 shadow-lg">
                                                    <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-200">
                                                        <img
                                                            src={cropUpload.objectUrl}
                                                            alt="Profile section preview"
                                                            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                                                            style={profileSectionPreviewStyle}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1 pb-2">
                                                    <p className="truncate text-base font-bold text-slate-900">
                                                        {profile.firstName} {profile.lastName}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-slate-500">
                                                        {profile.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
                                        <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-md">
                                            <img
                                                src={cropUpload.objectUrl}
                                                alt="Avatar preview"
                                                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                                                style={avatarPreviewStyle}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Avatar Preview</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                This cropped result will be used in the profile header, topbar, sidebar, and circular avatar areas.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                    Uploading keeps the circular look from your current avatar UI, while saving a clean square image behind it.
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeCropModal}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCropUpload}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                                disabled={uploading}
                            >
                                {uploading ? 'Processing...' : 'Save Photo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showViewModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
                    onClick={() => setShowViewModal(false)}
                >
                    <div 
                        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl flex flex-col items-center gap-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setShowViewModal(false)}
                            className="absolute top-4 right-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                            aria-label="Close preview"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-base font-bold text-slate-800 self-start">Profile Photo</h3>

                        {/* Image or fallback initials */}
                        <div className="h-64 w-64 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner flex items-center justify-center bg-slate-200 text-7xl font-bold text-slate-500 relative">
                            {displayProfilePicture ? (
                                <img 
                                    src={displayProfilePicture} 
                                    alt="Profile Full View" 
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                profile.firstName?.charAt(0)
                            )}
                        </div>

                        {/* Photo Stamp Info */}
                        {profile.profilePictureMetadata && (profile.profilePictureMetadata.latitude !== null && profile.profilePictureMetadata.latitude !== undefined) && (
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                    <MapPin size={15} className="text-blue-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block text-slate-700">Photo Location Stamp:</span>
                                        <span>Latitude: {parseFloat(profile.profilePictureMetadata.latitude).toFixed(5)}°</span>
                                        <span className="ml-3">Longitude: {parseFloat(profile.profilePictureMetadata.longitude).toFixed(5)}°</span>
                                    </div>
                                </div>
                                {profile.profilePictureMetadata.address && (
                                    <div className="flex items-start gap-2 text-xs text-slate-600">
                                        <MapPin size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block text-slate-700">Resolved Address:</span>
                                            <span className="leading-relaxed">{profile.profilePictureMetadata.address}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                    <Calendar size={15} className="text-indigo-500 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block text-slate-700">Timestamp:</span>
                                        <span>{new Date(profile.profilePictureMetadata.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex w-full gap-3 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (forceCameraCapture) {
                                        handleOpenWebcam();
                                    } else {
                                        document.getElementById('profile-upload')?.click();
                                    }
                                    setShowViewModal(false);
                                }}
                                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <Camera size={14} /> Change Photo
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowViewModal(false)}
                                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCameraModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
                    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl flex flex-col items-center gap-5">
                        <button
                            type="button"
                            onClick={handleCloseWebcam}
                            className="absolute top-4 right-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                            aria-label="Close camera"
                        >
                            <X size={18} />
                        </button>

                        <h3 className="text-base font-bold text-slate-800 self-start">Capture Profile Photo</h3>

                        <div className="relative h-72 w-72 rounded-2xl overflow-hidden bg-slate-950 border-4 border-slate-100 shadow-inner flex items-center justify-center">
                            {cameraError ? (
                                <div className="text-center p-6 text-sm text-slate-400">
                                    <AlertCircle className="mx-auto mb-2 text-red-500" size={32} />
                                    {cameraError}
                                </div>
                            ) : capturedImage ? (
                                <img 
                                    src={capturedImage} 
                                    alt="Captured snapshot" 
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="h-full w-full object-cover scale-x-[-1]"
                                />
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex w-full gap-3 mt-2">
                            {capturedImage ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 flex items-center justify-center gap-1.5"
                                    >
                                        <RotateCcw size={14} /> Recapture
                                    </button>
                                    <button
                                        type="button"
                                        onClick={flipCapturedImage}
                                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw size={14} /> Flip Photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUseCapturedPhoto}
                                        className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <CheckCircle size={14} /> Use Photo
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCloseWebcam}
                                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={capturePhoto}
                                        disabled={!!cameraError}
                                        className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm disabled:bg-blue-300 disabled:cursor-not-allowed"
                                    >
                                        <Camera size={14} /> Snap Photo
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
