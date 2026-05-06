import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Mail, Briefcase, Shield, Hash, Users, MapPin, Calendar, ZoomIn, Move, X } from 'lucide-react';
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

const createCroppedProfileImage = async (file, imageMeta, crop, zoom) => {
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

const Profile = () => {
    const { refreshProfile } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [localProfilePictureUrl, setLocalProfilePictureUrl] = useState('');
    const [cropUpload, setCropUpload] = useState(null);
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [dragState, setDragState] = useState(null);
    const requestedTab = searchParams.get('tab') || 'personal';

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

    const handleImageSelection = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        try {
            if (!file.type?.startsWith('image/')) {
                throw new Error('Please select an image file.');
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
        const loadingToast = toast.loading('Processing profile picture...');

        try {
            const croppedFile = await createCroppedProfileImage(
                cropUpload.file,
                cropUpload.imageMeta,
                cropPosition,
                cropZoom
            );
            const optimizedFile = await optimizeProfileImage(croppedFile);
            const formData = new FormData();
            formData.append('image', optimizedFile);

            const res = await api.post('/auth/upload-profile-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            updateLocalProfilePictureUrl(URL.createObjectURL(optimizedFile));
            setProfile(prev => ({ ...prev, profilePicture: res.data.profilePicture }));
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
                        <div className="relative flex justify-between items-end -mt-10 mb-6">
                            <div className="flex items-end">
                                <div className="h-20 w-20 rounded-full bg-white p-1 shadow-lg relative group">
                                    <div className="h-full w-full rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500 overflow-hidden relative">
                                        {displayProfilePicture ? (
                                            <img src={displayProfilePicture} alt="Profile" className="h-full w-full object-cover" />
                                        ) : (
                                            profile.firstName?.charAt(0)
                                        )}

                                        {/* Overlay for Upload */}
                                        <label htmlFor="profile-upload" className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <div className="text-xs text-center font-medium">Change<br />Photo</div>
                                            <input
                                                type="file"
                                                id="profile-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageSelection}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h1 className="text-2xl font-bold mt-10 text-slate-800">{profile.firstName} {profile.lastName}</h1>
                                    <p className="text-slate-500 flex items-center text-sm">
                                        <Mail size={14} className="mr-1" /> {profile.email}
                                    </p>
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${profile.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {profile.isActive ? 'Active Employee' : 'Inactive'}
                                </span>
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
                                        <span>{profile.workLocation || 'Headquarters'}</span>
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
        </div>
    );
};

export default Profile;
