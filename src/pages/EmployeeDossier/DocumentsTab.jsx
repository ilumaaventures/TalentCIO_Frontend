import React, { useState, useEffect, useRef } from 'react';
import { 
    FileText, CheckCircle, AlertCircle, Shield, X, Eye, Download, RotateCcw, Upload, Trash2 
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Button from '../../components/Button';
import { 
    documentCategories, 
    DOSSIER_ALLOWED_FILE_TYPES, 
    DOSSIER_FILE_MAX_SIZE_BYTES 
} from './DossierHelpers';

export const DocumentsTab = ({
    profile,
    setProfile,
    userId,
    currentUser,
    isSelf,
    activeTab,
    fetchDossier,
    fetchHistory,
    canEdit,
    isCurrentUserAdmin
}) => {
    // Local State
    const [uploadingDocTitle, setUploadingDocTitle] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);
    
    // Preview State
    const [previewFile, setPreviewFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDocumentDeclared, setIsDocumentDeclared] = useState(false);
    const [showUploadPreview, setShowUploadPreview] = useState(false);
    const [uploadCategory, setUploadCategory] = useState(null);
    const [replaceDocumentContext, setReplaceDocumentContext] = useState(null);
    
    // New state for custom document titles
    const [showTitleModal, setShowTitleModal] = useState(false);
    const [customDocTitle, setCustomDocTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [documentReviewModal, setDocumentReviewModal] = useState(null);
    const [documentReviewReason, setDocumentReviewReason] = useState('');
    const [processingDocumentReview, setProcessingDocumentReview] = useState(false);

    const fileInputRef = useRef(null);

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Verify if file has content and is readable (prevents 0-byte virtual/cloud file errors)
        if (file.size === 0) {
            toast.error('The selected file is empty or unreadable. If this is a cloud file (e.g. Google Drive), please download it to your device first.');
            e.target.value = '';
            return;
        }

        // Support empty mime-type fallback via file extension for robust mobile selection
        let fileType = file.type;
        if ((!fileType || fileType === 'application/octet-stream') && file.name) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'pdf') fileType = 'application/pdf';
            else if (ext === 'jpg' || ext === 'jpeg') fileType = 'image/jpeg';
            else if (ext === 'png') fileType = 'image/png';
            else if (ext === 'webp') fileType = 'image/webp';
        }

        if (!DOSSIER_ALLOWED_FILE_TYPES.has(fileType)) {
            toast.error('Only PDF and image files are allowed.');
            e.target.value = '';
            return;
        }

        if (file.size > DOSSIER_FILE_MAX_SIZE_BYTES) {
            toast.error('File size must be 5MB or less.');
            e.target.value = '';
            return;
        }

        // If we have a fixed title (from old flow), use it
        if (uploadingDocTitle) {
            let category = 'Other';
            const titleLower = uploadingDocTitle.toLowerCase();

            // Allow dynamic resolution from config
            const foundCat = documentCategories.find(cat =>
                cat.fixedDocs?.some(doc => doc.toLowerCase() === titleLower)
            );
            if (foundCat) category = foundCat.category;

            // Fallback heuristics for legacy/undefined
            if (category === 'Other') {
                if (titleLower.includes('resume')) category = 'Resume';
                else if (titleLower.includes('offer letter')) category = 'Offer Letter';
                else if (titleLower.includes('appointment')) category = 'Appointment Letter';
                else if (titleLower.includes('experience')) category = 'Employment';
            }

            setPreviewFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setUploadCategory(category);
            setShowUploadPreview(true);
        }
        // If we have a selected category (new flow), show title modal
        else if (selectedCategory) {
            setPreviewFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setShowTitleModal(true);
        }
    };

    const handleCancelUpload = () => {
        setPreviewFile(null);
        setPreviewUrl(null);
        setUploadCategory(null);
        setShowUploadPreview(false);
        setUploadingDocTitle(null);
        setShowTitleModal(false);
        setCustomDocTitle('');
        setSelectedCategory(null);
        setReplaceDocumentContext(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmUpload = async () => {
        if (!previewFile) return;

        const title = uploadingDocTitle || customDocTitle;
        const category = uploadCategory || selectedCategory;

        if (!title || !category) {
            toast.error('Please provide document title');
            return;
        }

        const formData = new FormData();
        formData.append('file', previewFile);
        formData.append('title', title);
        formData.append('category', category);
        if (replaceDocumentContext?.docId) {
            formData.append('replaceDocId', replaceDocumentContext.docId);
        }

        try {
            setIsUploading(true);
            const toastId = toast.loading(replaceDocumentContext ? 'Uploading corrected version...' : 'Uploading document...');
            const response = await api.post(`/dossier/${userId}/documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.dismiss(toastId);
            toast.success(replaceDocumentContext ? 'Corrected version uploaded successfully' : 'Document uploaded successfully');
            setIsDocumentDeclared(false);
            setProfile((prev) => ({
                ...prev,
                documents: response.data?.documents || prev?.documents || [],
                documentSubmissionStatus: response.data?.submissionStatus || prev?.documentSubmissionStatus
            }));
            fetchDossier(); // Refresh
            if (activeTab === 'history') fetchHistory(); // Refresh history if needed
            handleCancelUpload(); // Close and reset
        } catch (error) {
            console.error('Upload failed', error);
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const triggerUpload = (docTitle) => {
        setUploadingDocTitle(docTitle);
        setTimeout(() => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }, 0);
    };

    const triggerReplaceUpload = (doc) => {
        setReplaceDocumentContext({
            docId: doc._id,
            title: doc.title,
            category: doc.category
        });
        setUploadingDocTitle(doc.title);
        setSelectedCategory(doc.category);
        setUploadCategory(doc.category);

        setTimeout(() => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }, 0);
    };

    const triggerCategoryUpload = (categoryName, categoryType) => {
        setSelectedCategory(categoryType);
        setTimeout(() => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
            }
        }, 0);
    };

    const handleDeleteDocument = async (docId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;

        try {
            setDeletingDocId(docId);
            const toastId = toast.loading('Deleting document...');
            const response = await api.delete(`/dossier/${userId}/documents/${docId}`);
            toast.dismiss(toastId);
            toast.success('Document deleted successfully');
            setIsDocumentDeclared(false);
            setProfile((prev) => ({
                ...prev,
                documents: response.data?.documents || prev?.documents || [],
                documentSubmissionStatus: response.data?.submissionStatus || prev?.documentSubmissionStatus
            }));
            fetchDossier(); // Refresh
            if (activeTab === 'history') fetchHistory();
        } catch (error) {
            console.error('Delete failed', error);
            toast.error(error.response?.data?.message || 'Failed to delete document');
        } finally {
            setDeletingDocId(null);
        }
    };

    const normalizeDocumentStatus = (status) => (status === 'Pending' || !status ? 'Pending Review' : status);
    const getActorName = (person) => {
        if (!person) return '';
        if (typeof person === 'string') return person;
        return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.email || '';
    };
    const formatAuditDateTime = (value) => (value ? format(new Date(value), 'dd MMM yyyy, hh:mm a') : '');
    
    const canVerify = isCurrentUserAdmin
        || currentUser?.permissions?.includes('dossier.verify_documents')
        || currentUser?.permissions?.includes('dossier.approve');
        
    const hasPendingDocs = profile.documents?.some((doc) => normalizeDocumentStatus(doc.verificationStatus) === 'Pending Review');
    const onboardingCustomFiles = Array.isArray(profile.onboardingCustomFiles) ? profile.onboardingCustomFiles : [];
    const visibleDocuments = Array.isArray(profile.documents) ? profile.documents : [];
    
    const getDocumentStatusClasses = (status) => {
        if (status === 'Verified') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (status === 'Rejected') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-orange-100 text-orange-700 border-orange-200';
    };

    const openDocumentReviewModal = (mode, doc) => {
        setDocumentReviewModal({ mode, doc });
        setDocumentReviewReason('');
    };

    const closeDocumentReviewModal = () => {
        if (processingDocumentReview) return;
        setDocumentReviewModal(null);
        setDocumentReviewReason('');
    };

    const handleVerifyAllDocuments = async () => {
        try {
            const targetUserId = userId || currentUser?._id;
            const response = await api.patch(`/dossier/${targetUserId}/documents/verify-all`, { status: 'Verified' });
            if (response.status === 200) {
                toast.success(`All pending documents verified`);
                setProfile(prev => ({
                    ...prev,
                    documentSubmissionStatus: response.data.submissionStatus,
                    documents: response.data.documents || prev.documents
                }));
                fetchDossier();
                if (activeTab === 'history') fetchHistory();
            }
        } catch (error) {
            console.error('Verify All Documents Error:', error);
            toast.error(error.response?.data?.message || 'Failed to verify documents');
        }
    };

    const handleSubmitDocuments = async () => {
        // Validation: Check for mandatory documents
        const uploadedTitles = visibleDocuments.map(d => d.title.toLowerCase()) || [];

        // 1. Mandatory Identity Docs (Except Passport)
        const identityCategory = documentCategories.find(c => c.name === 'Identity Documents');
        const requiredIdentityDocs = identityCategory?.fixedDocs.filter(doc => doc !== 'Passport') || [];

        const missingIdentityDocs = requiredIdentityDocs.filter(reqDoc =>
            !uploadedTitles.includes(reqDoc.toLowerCase())
        );

        // 2. Mandatory Qualification Docs
        const qualificationCategory = documentCategories.find(c => c.name === 'Qualification Certificates');
        const requiredQualificationDocs = qualificationCategory?.fixedDocs || [];

        const missingQualificationDocs = requiredQualificationDocs.filter(reqDoc =>
            !uploadedTitles.includes(reqDoc.toLowerCase())
        );

        const allMissing = [...missingIdentityDocs, ...missingQualificationDocs];

        if (allMissing.length > 0) {
            toast.error(`Missing mandatory documents: ${allMissing.join(', ')}`);
            return;
        }

        try {
            const targetUserId = userId || currentUser?._id;
            const response = await api.patch(`/dossier/${targetUserId}/documents/submit`);
            if (response.status === 200) {
                toast.success('Documents submitted for approval');
                setProfile(prev => ({
                    ...prev,
                    documentSubmissionStatus: response.data.submissionStatus
                }));
                fetchDossier();
                if (activeTab === 'history') fetchHistory();
            }
        } catch (error) {
            console.error('Submit Documents Error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit documents');
        }
    };

    const handleVerifyDocument = async (docId, status) => {
        try {
            const targetUserId = userId || currentUser?._id;
            const response = await api.patch(`/dossier/${targetUserId}/documents/${docId}/verify`, { status });
            if (response.status === 200) {
                toast.success(`Document marked as ${status}`);
                setProfile(prev => ({
                    ...prev,
                    documentSubmissionStatus: response.data.submissionStatus,
                    documents: response.data.documents
                }));
                fetchDossier();
                if (activeTab === 'history') fetchHistory();
            }
        } catch (error) {
            console.error('Verify Document Error:', error);
            toast.error(error.response?.data?.message || 'Failed to verify document');
        }
    };

    const handleRejectDocument = async (docId, reason) => {
        try {
            const targetUserId = userId || currentUser?._id;
            const response = await api.patch(`/dossier/${targetUserId}/documents/${docId}/verify`, { status: 'Rejected', reason });
            if (response.status === 200) {
                toast.success('Document rejected');
                setProfile(prev => ({
                    ...prev,
                    documentSubmissionStatus: response.data.submissionStatus,
                    documents: response.data.documents
                }));
                fetchDossier();
                if (activeTab === 'history') fetchHistory();
            }
        } catch (error) {
            console.error('Reject Document Error:', error);
            toast.error(error.response?.data?.message || 'Failed to reject document');
            throw error;
        }
    };

    const handleRevokeVerification = async (docId, reason) => {
        try {
            const targetUserId = userId || currentUser?._id;
            const response = await api.patch(`/dossier/${targetUserId}/documents/${docId}/revoke`, { reason });
            if (response.status === 200) {
                toast.success('Verification revoked');
                setProfile(prev => ({
                    ...prev,
                    documentSubmissionStatus: response.data.submissionStatus,
                    documents: response.data.documents
                }));
                fetchDossier();
                if (activeTab === 'history') fetchHistory();
            }
        } catch (error) {
            console.error('Revoke Verification Error:', error);
            toast.error(error.response?.data?.message || 'Failed to revoke verification');
            throw error;
        }
    };

    const submitDocumentReviewAction = async () => {
        if (!documentReviewModal?.doc?._id) return;

        const trimmedReason = documentReviewReason.trim();
        if (!trimmedReason) {
            toast.error(documentReviewModal.mode === 'reject' ? 'Rejection reason is required' : 'Revocation reason is required');
            return;
        }

        try {
            setProcessingDocumentReview(true);
            if (documentReviewModal.mode === 'reject') {
                await handleRejectDocument(documentReviewModal.doc._id, trimmedReason);
            } else {
                await handleRevokeVerification(documentReviewModal.doc._id, trimmedReason);
            }
            closeDocumentReviewModal();
        } finally {
            setProcessingDocumentReview(false);
        }
    };

    const handleView = async (doc) => {
        try {
            const toastId = toast.loading('Preparing preview...');
            const response = await api.get('/dossier/proxy-pdf', {
                params: { url: doc.url, download: false },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            toast.dismiss(toastId);
        } catch (error) {
            console.error('Preview Error:', error);
            toast.error('Failed to preview document');
        }
    };

    const handleDownload = async (doc) => {
        try {
            const toastId = toast.loading('Preparing download...');
            const response = await api.get('/dossier/proxy-pdf', {
                params: { url: doc.url, download: true },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.fileName || `${doc.title}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.dismiss(toastId);
            toast.success('Download started');
        } catch (error) {
            console.error('Download Error:', error);
            toast.error('Failed to download document');
        }
    };

    const DocumentActionButton = ({ icon: Icon, label, onClick, tone = 'slate', disabled = false }) => {
        const toneClasses = {
            slate: 'border-slate-200 text-slate-700 hover:bg-slate-50',
            blue: 'border-blue-200 text-blue-700 hover:bg-blue-50',
            green: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
            red: 'border-red-200 text-red-700 hover:bg-red-50',
            amber: 'border-amber-200 text-amber-700 hover:bg-amber-50'
        };

        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition-colors ${toneClasses[tone]} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
                <Icon size={14} />
                <span>{label}</span>
            </button>
        );
    };

    // Render a single document card
    const DocumentCard = ({ doc, isSharedOnboardingFile = false }) => {
        const docStatus = isSharedOnboardingFile ? 'Shared' : normalizeDocumentStatus(doc.verificationStatus);
        const isDocsSubmitted = ['Submitted', 'Approved'].includes(profile?.documentSubmissionStatus);
        const canDeleteDocument = !isSharedOnboardingFile
            && docStatus !== 'Verified'
            && (!isDocsSubmitted || !isSelf)
            && (isSelf || canVerify || canEdit);
        const canCorrectRejectedDocument = !isSharedOnboardingFile && isSelf && docStatus === 'Rejected';
        const canApprovePendingDocument = canVerify && !isSharedOnboardingFile && docStatus === 'Pending Review';
        const canRevokeVerifiedDocument = canVerify && !isSharedOnboardingFile && docStatus === 'Verified';

        return (
            <div className="group relative flex min-h-[280px] min-w-[320px] max-w-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-100">
                            <FileText size={20} />
                        </div>
                        <div>
                            <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isSharedOnboardingFile ? 'border-blue-200 bg-blue-100 text-blue-700' : getDocumentStatusClasses(docStatus)}`}>
                                {docStatus}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <h4 className="line-clamp-2 text-sm font-semibold text-slate-900" title={doc.title}>{doc.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{isSharedOnboardingFile ? (doc.sourceLabel || 'Shared during onboarding') : (doc.category || 'Document')}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <span>{format(new Date(doc.uploadDate), 'MMM dd, yyyy')}</span>
                    </div>
                </div>

                {docStatus === 'Rejected' && doc.rejectionReason ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                        <div className="font-semibold uppercase tracking-wide">Rejection Reason</div>
                        <div className="mt-1 leading-relaxed">{doc.rejectionReason}</div>
                    </div>
                ) : null}

                {doc.revocationReason && docStatus === 'Pending Review' ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                        <div className="font-semibold uppercase tracking-wide">Verification Revoked</div>
                        <div className="mt-1 leading-relaxed">{doc.revocationReason}</div>
                    </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <DocumentActionButton
                        icon={Eye}
                        label="View"
                        tone="blue"
                        onClick={() => handleView(doc)}
                    />
                    <DocumentActionButton
                        icon={Download}
                        label="Download"
                        tone="blue"
                        onClick={() => handleDownload(doc)}
                    />

                    {canApprovePendingDocument ? (
                        <>
                            <DocumentActionButton
                                icon={CheckCircle}
                                label="Approve"
                                tone="green"
                                onClick={() => handleVerifyDocument(doc._id, 'Verified')}
                            />
                            <DocumentActionButton
                                icon={X}
                                label="Reject"
                                tone="red"
                                onClick={() => openDocumentReviewModal('reject', doc)}
                            />
                        </>
                    ) : null}

                    {canRevokeVerifiedDocument ? (
                        <DocumentActionButton
                            icon={RotateCcw}
                            label="Revoke"
                            tone="amber"
                            onClick={() => openDocumentReviewModal('revoke', doc)}
                        />
                    ) : null}

                    {canCorrectRejectedDocument ? (
                        <DocumentActionButton
                            icon={Upload}
                            label="Upload Corrected"
                            tone="amber"
                            onClick={() => triggerReplaceUpload(doc)}
                        />
                    ) : null}

                    {canDeleteDocument ? (
                        <DocumentActionButton
                            icon={Trash2}
                            label="Delete"
                            tone="red"
                            disabled={deletingDocId === doc._id}
                            onClick={() => handleDeleteDocument(doc._id)}
                        />
                    ) : null}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-bold text-slate-800">Documents</h3>

                {/* Approve All Button for Admins - Always Visible */}
                {canVerify && (
                    <Button
                        onClick={handleVerifyAllDocuments}
                        disabled={!hasPendingDocs}
                        className={`flex items-center gap-2 shadow-sm ${!hasPendingDocs
                            ? 'bg-emerald-900 text-emerald-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                    >
                        <CheckCircle size={18} />
                        Approve All Pending
                    </Button>
                )}
            </div>
            <p className="text-xs text-red-500 italic mb-6">* fields are mandatory</p>

            {/* Submission Status Banner */}
            {profile.documentSubmissionStatus && profile.documentSubmissionStatus !== 'Draft' && (
                <div className={`mb-4 p-3 rounded-lg border flex items-center gap-3 shadow-sm transition-all duration-300 ${profile.documentSubmissionStatus === 'Approved' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' :
                    profile.documentSubmissionStatus === 'Changes Requested' ? 'bg-amber-50/80 border-amber-200 text-amber-900' :
                        'bg-blue-50/80 border-blue-200 text-blue-900'
                    }`}>
                    <div className={`p-1.5 rounded-full shrink-0 ${profile.documentSubmissionStatus === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                        profile.documentSubmissionStatus === 'Changes Requested' ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        {profile.documentSubmissionStatus === 'Approved' ? <CheckCircle size={18} /> :
                            profile.documentSubmissionStatus === 'Changes Requested' ? <AlertCircle size={18} /> :
                                <Shield size={18} />}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm tracking-tight flex items-center gap-2">
                            Submission Status: {profile.documentSubmissionStatus}
                            {profile.documentSubmissionStatus === 'Approved' && <span className="text-xs font-normal opacity-80">(All documents verified)</span>}
                        </h4>
                        {profile.documentSubmissionStatus !== 'Approved' && (
                            <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
                                {profile.documentSubmissionStatus === 'Submitted' && "Documents submitted for review."}
                                {profile.documentSubmissionStatus === 'Changes Requested' && "Action Required: Please review feedback."}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
            />

            {/* Document Categories */}
            <div className="space-y-8">
                {documentCategories.map((catConfig) => {
                    const categoryDocs = visibleDocuments.filter(d => d.category === catConfig.category) || [];
                    const mergedCategoryDocs = catConfig.category === 'Other'
                        ? [...categoryDocs, ...onboardingCustomFiles]
                        : categoryDocs;

                    return (
                        <div key={catConfig.name} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                    {catConfig.icon && <span className="text-xl">{catConfig.icon}</span>}
                                    {catConfig.name}
                                    <span className="text-xs font-normal text-slate-500">({mergedCategoryDocs.length})</span>
                                </h4>
                                {catConfig.allowMultiple && (
                                    <button
                                        onClick={() => triggerCategoryUpload(catConfig.name, catConfig.category)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors shadow-sm"
                                    >
                                        <Upload size={14} />
                                        Add Document
                                    </button>
                                )}
                            </div>

                            {/* Document Row - Horizontal Scroll */}
                            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                {/* Fixed documents (Identity, Education, Bank etc.) */}
                                {catConfig.fixedDocs?.map((docTitle) => {
                                    const doc = categoryDocs.find(d => d.title.toLowerCase() === docTitle.toLowerCase());
                                    const isMandatory = (catConfig.name === 'Identity Documents' && docTitle !== 'Passport') || (catConfig.name === 'Qualification Certificates');

                                    if (doc) {
                                        return <DocumentCard key={doc._id} doc={doc} />;
                                    }

                                    // Empty state for fixed docs
                                    return (
                                        <div
                                            key={docTitle}
                                            onClick={() => triggerUpload(docTitle)}
                                            className="group cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white hover:bg-blue-50/30 hover:border-blue-300 hover:shadow-md transition-all duration-300 min-w-[280px] max-w-[280px] min-h-[180px]"
                                        >
                                            <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3 group-hover:text-blue-500 group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                                                <Upload size={20} />
                                            </div>
                                            <h4 className="font-semibold text-slate-700 text-sm mb-1 group-hover:text-blue-700 transition-colors">
                                                {docTitle} {isMandatory && <span className="text-red-500">*</span>}
                                            </h4>
                                            <p className="text-xs text-slate-400">Click to upload</p>
                                        </div>
                                    );
                                })}

                                {/* Dynamic documents */}
                                {catConfig.allowMultiple && mergedCategoryDocs
                                    .filter(doc => !catConfig.fixedDocs?.some(fixedTitle => fixedTitle.toLowerCase() === doc.title.toLowerCase()))
                                    .map(doc => (
                                        <DocumentCard
                                            key={doc._id || doc.url || doc.title}
                                            doc={doc}
                                            isSharedOnboardingFile={Boolean(doc.isOnboardingShared)}
                                        />
                                    ))}

                                {/* Show empty state if no documents */}
                                {catConfig.allowMultiple && mergedCategoryDocs.length === 0 && (!catConfig.fixedDocs || catConfig.fixedDocs.length === 0) && (
                                    <div className="flex items-center justify-center min-w-[280px] h-[180px] border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-400 text-sm">
                                        No documents uploaded yet
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Document Final Declaration */}
            {(!canVerify || isSelf) && profile.documentSubmissionStatus !== 'Approved' && (
                <div className="mt-10 pt-10 border-t border-slate-200">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center text-center">
                        <h3 className="font-bold text-slate-800 text-lg mb-2">Final Declaration</h3>
                        <p className="text-sm text-slate-600 max-w-2xl mb-6">
                            I hereby declare that all the documents provided above are true and accurate to the best of my knowledge.
                            I understand that any false information or forged documents may lead to disciplinary action or termination of employment.
                        </p>

                        {profile.documentSubmissionStatus === 'Submitted' ? (
                            <div className="space-y-4 flex flex-col items-center">
                                <div className="flex items-center text-emerald-600 space-x-2 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                                    <CheckCircle size={20} />
                                    <span>Submitted for review on {profile.updatedAt ? format(new Date(profile.updatedAt), 'dd MMM yyyy') : 'Recently'}</span>
                                </div>
                                <p className="text-xs text-slate-500">Your documents are in the HR verification queue. You can still review statuses here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 flex flex-col items-center">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isDocumentDeclared}
                                        onChange={(e) => setIsDocumentDeclared(e.target.checked)}
                                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 group-hover:border-blue-400 transition"
                                    />
                                    <span className="text-sm font-semibold text-slate-700 select-none">I agree to the declaration</span>
                                </label>
                                {isDocumentDeclared && (
                                    <p className="text-xs text-blue-600 font-medium animate-pulse">
                                        Ready to submit! Click "Submit for Approval" below to finish.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Submit for Approval Button - Bottom */}
            {(!canVerify || isSelf) && !(profile.documentSubmissionStatus === 'Approved' && !hasPendingDocs) && (
                <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                    <button
                        onClick={handleSubmitDocuments}
                        disabled={!profile.documents?.length || profile.documentSubmissionStatus === 'Submitted' || !isDocumentDeclared}
                        className={`flex items-center gap-2 shadow-sm px-6 py-2.5 rounded-xl font-semibold outline-none ${!profile.documents?.length || profile.documentSubmissionStatus === 'Submitted' || !isDocumentDeclared
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        <Shield size={18} />
                        {profile.documentSubmissionStatus === 'Submitted' ? 'Submitted for Approval' :
                            profile.documentSubmissionStatus === 'Approved' && hasPendingDocs ? 'Submit New Documents' :
                                'Submit for Approval'}
                    </button>
                </div>
            )}

            {documentReviewModal?.doc ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeDocumentReviewModal}>
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="border-b border-slate-100 px-6 py-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Document Review</div>
                            <h3 className="mt-2 text-xl font-semibold text-slate-900">
                                {documentReviewModal.mode === 'reject' ? 'Reject Document' : 'Revoke Verification'}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{documentReviewModal.doc.title}</p>
                        </div>
                        <div className="px-6 py-5">
                            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {documentReviewModal.mode === 'reject' ? 'Rejection Reason' : 'Revocation Reason'}
                            </label>
                            <textarea
                                value={documentReviewReason}
                                onChange={(event) => setDocumentReviewReason(event.target.value)}
                                rows={5}
                                autoFocus
                                className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                placeholder={documentReviewModal.mode === 'reject'
                                    ? 'Explain what needs to be corrected before this document can be verified.'
                                    : 'Explain why this verified document is being moved back to pending review.'}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                            <Button
                                variant="ghost"
                                onClick={closeDocumentReviewModal}
                                disabled={processingDocumentReview}
                                className="border border-slate-200"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={submitDocumentReviewAction}
                                isLoading={processingDocumentReview}
                                className={documentReviewModal.mode === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
                            >
                                {documentReviewModal.mode === 'reject' ? 'Reject Document' : 'Revoke Verification'}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Fixed Document Upload Preview */}
            {showUploadPreview && previewFile && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelUpload}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-slate-800">{replaceDocumentContext ? 'Confirm Corrected Version' : 'Confirm Upload'}</h3>
                                <button onClick={handleCancelUpload} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                                    <FileText size={24} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-700 text-sm truncate" title={uploadingDocTitle || previewFile.name}>{uploadingDocTitle || previewFile.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {(previewFile.size / 1024 / 1024).toFixed(2)} MB • {previewFile.name.split('.').pop().toUpperCase()}
                                    </p>
                                </div>
                                {previewUrl ? (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <Eye size={16} />
                                        <span>Preview</span>
                                    </a>
                                ) : (
                                    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
                                        <Eye size={16} />
                                        <span>Preview</span>
                                    </span>
                                )}
                            </div>

                            <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Before Upload</div>
                                <p className="mt-2">Use the eye button to review the selected file in a separate preview tab before you upload it to the dossier.</p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleConfirmUpload}
                                    isLoading={isUploading}
                                    className="flex-1 shadow-lg shadow-blue-100"
                                >
                                    {replaceDocumentContext ? 'Upload Corrected Version' : 'Upload Now'}
                                </Button>
                                <Button
                                    variants="ghost"
                                    onClick={handleCancelUpload}
                                    disabled={isUploading}
                                    className="flex-1 border border-slate-200"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Title Modal */}
            {showTitleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleCancelUpload}>
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-800">Preview Before Upload</h3>
                        <p className="mt-1 text-sm text-slate-500">Confirm the document and set the title that should appear in the dossier.</p>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                                    <FileText size={24} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-700 text-sm truncate" title={previewFile?.name}>{previewFile?.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {previewFile ? `${(previewFile.size / 1024 / 1024).toFixed(2)} MB` : '-'} • {previewFile?.name?.split('.').pop()?.toUpperCase()}
                                    </p>
                                </div>
                                {previewUrl ? (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        <Eye size={16} />
                                        <span>Preview</span>
                                    </a>
                                ) : (
                                    <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-400">
                                        <Eye size={16} />
                                        <span>Preview</span>
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                                <div><span className="font-semibold text-slate-700">Category:</span> {selectedCategory || 'Document'}</div>
                            </div>
                        </div>

                        <div className="mt-5">
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Enter Document Title</h4>
                            <input
                                type="text"
                                value={customDocTitle}
                                onChange={(e) => setCustomDocTitle(e.target.value)}
                                placeholder="e.g., B.Tech Degree Certificate"
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customDocTitle.trim()) {
                                        handleConfirmUpload();
                                    }
                                }}
                            />
                        </div>

                        <div className="mt-5 flex gap-3">
                            <Button
                                onClick={handleConfirmUpload}
                                disabled={!customDocTitle.trim()}
                                isLoading={isUploading}
                                className="flex-1"
                            >
                                Upload
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={handleCancelUpload}
                                disabled={isUploading}
                                className="flex-1 border border-slate-200"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
