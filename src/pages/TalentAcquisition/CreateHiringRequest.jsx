import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Save, Send, Briefcase, Users, FileText, DollarSign, X, Loader, Upload, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import WorkflowSettings from './WorkflowSettings';
import { createNoCacheRequestConfig, invalidateTACaches, refreshTAClientsCache } from '../../utils/taCache';
import UserMultiSelect from '../../components/UserMultiSelect';

const SALARY_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
const NO_TEMPLATE_OPTION = 'STANDARD_3_PHASE_PROCESS';

const parseOptionalNumber = (value) => {
    if (value === '' || value === null || value === undefined) {
        return undefined;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? undefined : numericValue;
};

const Section = ({ title, icon: Icon, children, fullWidth = false }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            {Icon && <Icon className="text-slate-400" size={20} />}
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        <div className={fullWidth ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
            {children}
        </div>
    </div>
);

const Input = ({ label, name, value, onChange, type = "text", required, options, placeholder, error, gridCols = 1, disabled = false }) => (
    <div className={gridCols === 2 ? "md:col-span-2" : ""}>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {options ? (
            <select
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`w-full p-2.5 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all ${error ? 'border-red-500' : 'border-slate-300'}`}
            >
                <option value="">Select an option</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        ) : type === 'textarea' ? (
            <textarea
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                rows={3}
                className={`w-full p-2.5 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all ${error ? 'border-red-500' : 'border-slate-300'}`}
            />
        ) : (
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                step={type === 'number' ? 'any' : undefined}
                className={`w-full p-2.5 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all ${error ? 'border-red-500' : 'border-slate-300'}`}
            />
        )}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const TagInput = ({ label, tags = [], onTagsChange, placeholder, gridCols = 1 }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!tags.includes(inputValue.trim())) {
                onTagsChange([...tags, inputValue.trim()]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={gridCols === 2 ? "md:col-span-2" : ""}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            <div className={`w-full border border-slate-300 rounded-lg p-1.5 min-h-[42px] bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all flex flex-wrap gap-2 items-center`}>
                {tags.map((tag, index) => (
                    <span key={index} className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-200 transition-colors">
                            <X size={14} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? placeholder : ""}
                    className="flex-1 bg-transparent border-none outline-none text-sm p-1 placeholder:text-slate-400 min-w-[120px]"
                />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 italic">Type a skill and press Enter to add</p>
        </div>
    );
};

const CreateHiringRequest = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID for edit mode
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        client: '', // New field
        clientConfidential: false,
        workflowId: '', // Workflow selection
        interviewWorkflowId: '', // Interview Workflow template selection
        previousRequestId: '', // For reopening

        // Role Info
        title: '',
        department: '',
        employmentType: 'Full-time',

        // Purpose
        purpose: '',
        replacedEmployeeName: '',
        replacedEmployeeId: '',

        // Requirements
        mustHaveSkills: {
            technical: [],
            softSkills: []
        },
        niceToHaveSkills: [],
        experienceMin: '',
        experienceMax: '',
        location: 'Onsite',
        shift: 'General',

        // Hiring Details
        openPositions: 1,
        expectedJoiningDate: '',
        budgetMin: '',
        budgetMax: '',
        budgetCurrency: 'INR',
        salaryRangeOpen: false,
        priority: 'Medium',

        // Job Description
        jobDescription: '',
        jobDescriptionFile: '',
        assignedUsers: [],
        analyticsViewers: []
    });

    const [searchParams] = useSearchParams();
    const reopenFrom = searchParams.get('reopenFrom');

    const [workflows, setWorkflows] = useState([]); // Store available workflows
    const [interviewWorkflows, setInterviewWorkflows] = useState([]); // Store interview templates
    const [clients, setClients] = useState([]); // Store available clients
    const [availableUsers, setAvailableUsers] = useState([]);
    const [phaseTemplates, setPhaseTemplates] = useState([]);
    const [selectedPhaseTemplateId, setSelectedPhaseTemplateId] = useState(NO_TEMPLATE_OPTION);
    const [showWorkflowModal, setShowWorkflowModal] = useState(false);

    const fetchWorkflowsData = async () => {
        try {
            const [wfRes, intWfRes, clientRes, phaseTemplateRes, usersRes] = await Promise.all([
                api.get('/workflows', createNoCacheRequestConfig()),
                api.get('/ta/interview-workflows', createNoCacheRequestConfig()),
                api.get('/projects/clients', createNoCacheRequestConfig()),
                api.get('/ta/phase-templates', createNoCacheRequestConfig()),
                api.get('/admin/users', createNoCacheRequestConfig()).catch(() => ({ data: [] }))
            ]);
            setWorkflows(wfRes.data.filter(w => w.isActive));
            setInterviewWorkflows(intWfRes.data.filter(w => w.isActive));
            setClients(clientRes.data);
            const fetchedUsers = Array.isArray(usersRes.data)
                ? usersRes.data
                : Array.isArray(usersRes.data?.data)
                    ? usersRes.data.data
                    : [];
            setAvailableUsers(fetchedUsers.filter((currentUser) => currentUser?.isActive !== false));
            const fetchedTemplates = phaseTemplateRes.data?.templates || [];
            setPhaseTemplates(fetchedTemplates);
            setSelectedPhaseTemplateId((current) => {
                if (current && current !== NO_TEMPLATE_OPTION) {
                    const templateStillExists = fetchedTemplates.some((template) => template._id === current);
                    return templateStillExists ? current : NO_TEMPLATE_OPTION;
                }

                if (current === NO_TEMPLATE_OPTION) {
                    return current;
                }

                return NO_TEMPLATE_OPTION;
            });
        } catch (error) {
            console.error("Failed to fetch workflow data", error);
        }
    };

    useEffect(() => {
        fetchWorkflowsData();
    }, []);

    useEffect(() => {
        if (id || reopenFrom) {
            const fetchRequest = async () => {
                try {
                    setLoading(true);
                    const res = await api.get(`/ta/hiring-request/${id || reopenFrom}`, createNoCacheRequestConfig());
                    const data = res.data;
                    const storedOpenPositions = Math.max(Number(data.hiringDetails?.openPositions) || 0, 0);
                    const storedClosedPositions = Math.max(Number(data.hiringDetails?.closedPositions) || 0, 0);
                    const storedOriginalPositions = Math.max(Number(data.hiringDetails?.originalOpenPositions) || 0, 0);
                    const resolvedRequestedPositions = Math.max(
                        storedOriginalPositions,
                        storedOpenPositions + storedClosedPositions,
                        storedOpenPositions,
                        1
                    );

                    setFormData({
                        client: data.client || '',
                        clientConfidential: Boolean(data.clientConfidential),
                        workflowId: data.workflowId?._id || data.workflowId || '',
                        interviewWorkflowId: data.interviewWorkflowId?._id || data.interviewWorkflowId || '',
                        previousRequestId: reopenFrom ? reopenFrom : '', // Set if reopening
                        title: data.roleDetails.title,

                        department: data.roleDetails.department,
                        employmentType: data.roleDetails.employmentType,
                        purpose: data.purpose,
                        replacedEmployeeName: data.replacementDetails?.employeeName || '',
                        replacedEmployeeId: data.replacementDetails?.employeeId || '',
                        mustHaveSkills: {
                            technical: data.requirements?.mustHaveSkills?.technical || (Array.isArray(data.requirements?.mustHaveSkills) ? data.requirements.mustHaveSkills : []),
                            softSkills: data.requirements?.mustHaveSkills?.softSkills || []
                        },
                        niceToHaveSkills: data.requirements.niceToHaveSkills || [],
                        experienceMin: data.requirements.experienceMin,
                        experienceMax: data.requirements.experienceMax,
                        location: data.requirements.location,
                        shift: data.requirements.shift,
                        openPositions: reopenFrom ? resolvedRequestedPositions : Math.max(storedOpenPositions, 1),
                        expectedJoiningDate: data.hiringDetails.expectedJoiningDate ? data.hiringDetails.expectedJoiningDate.split('T')[0] : '', // Format for date input
                        budgetMin: data.hiringDetails.budgetRange?.min ?? '',
                        budgetMax: data.hiringDetails.budgetRange?.max ?? '',
                        budgetCurrency: data.hiringDetails.budgetRange?.currency || 'INR',
                        salaryRangeOpen: Boolean(data.hiringDetails.budgetRange?.isOpen),
                        priority: data.hiringDetails.priority,
                        jobDescription: data.jobDescription || '',
                        jobDescriptionFile: data.jobDescriptionFile || '',
                        assignedUsers: Array.isArray(data.assignedUsers)
                            ? data.assignedUsers.map((assignedUser) => assignedUser?._id || assignedUser).filter(Boolean)
                            : [],
                        analyticsViewers: Array.isArray(data.analyticsViewers)
                            ? data.analyticsViewers.map((viewer) => viewer?._id || viewer).filter(Boolean)
                            : []
                    });
                    setSelectedPhaseTemplateId(
                        data.useDynamicPhases && data.phaseTemplateId
                            ? (data.phaseTemplateId?._id || data.phaseTemplateId)
                            : NO_TEMPLATE_OPTION
                    );
                } catch (error) {
                    console.error(error);
                    toast.error('Failed to load request details');
                    navigate('/ta');
                } finally {
                    setLoading(false);
                }
            };
            fetchRequest();
        }
    }, [id, reopenFrom, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const [uploadingFile, setUploadingFile] = useState(false);
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append('jdFile', file);

        try {
            setUploadingFile(true);
            const res = await api.post('/ta/hiring-request/upload-jd', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, jobDescriptionFile: res.data.url }));
            toast.success('JD File uploaded successfully');
        } catch (error) {
            console.error('File upload failed', error);
            toast.error('Failed to upload JD file');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSubmit = async (isDraft) => {
        try {
            setLoading(true);

            // 1. Validation Logic
            if (!isDraft) {
                if (!formData.client?.trim()) {
                    toast.error('Client name is required');
                    setLoading(false);
                    return;
                }
                if (!formData.title?.trim()) {
                    toast.error('Job Title is required');
                    setLoading(false);
                    return;
                }
                if (!formData.department?.trim()) {
                    toast.error('Department is required');
                    setLoading(false);
                    return;
                }
                if (!formData.employmentType) {
                    toast.error('Employment Type is required');
                    setLoading(false);
                    return;
                }
                if (!formData.purpose) {
                    toast.error('Hiring Purpose is required');
                    setLoading(false);
                    return;
                }
                if (Number(formData.experienceMin) > Number(formData.experienceMax)) {
                    toast.error('Min Experience cannot be greater than Max Experience');
                    setLoading(false);
                    return;
                }
                if (!formData.salaryRangeOpen && formData.budgetMin !== '' && formData.budgetMax !== '' && Number(formData.budgetMin) > Number(formData.budgetMax)) {
                    toast.error('Min Budget cannot be greater than Max Budget');
                    setLoading(false);
                    return;
                }
                if (formData.priority === 'High' && !formData.expectedJoiningDate) {
                    toast.error('Expected Joining Date is required for High Priority requests');
                    setLoading(false);
                    return;
                }
                if (formData.purpose === 'Replacement' && !formData.replacedEmployeeName) {
                    toast.error('Replaced Employee Name is required for Replacements');
                    setLoading(false);
                    return;
                }
            }

            // Format Data for API
            const payload = {
                client: formData.client,
                clientConfidential: Boolean(formData.clientConfidential),
                workflowId: formData.workflowId, // Send selected workflow ID
                interviewWorkflowId: formData.interviewWorkflowId || undefined, // Send selected interview workflow
                previousRequestId: formData.previousRequestId || undefined,
                roleDetails: {
                    title: formData.title,
                    department: formData.department,
                    employmentType: formData.employmentType
                },
                purpose: formData.purpose,
                replacementDetails: formData.purpose === 'Replacement' ? {
                    employeeName: formData.replacedEmployeeName,
                    employeeId: formData.replacedEmployeeId
                } : {},
                requirements: {
                    mustHaveSkills: {
                        technical: formData.mustHaveSkills.technical,
                        softSkills: formData.mustHaveSkills.softSkills
                    },
                    niceToHaveSkills: formData.niceToHaveSkills,
                    experienceMin: Number(formData.experienceMin),
                    experienceMax: Number(formData.experienceMax),
                    location: formData.location,
                    shift: formData.shift
                },
                hiringDetails: {
                    openPositions: formData.openPositions ? Number(formData.openPositions) : 1, // Default to 1 if empty
                    expectedJoiningDate: formData.expectedJoiningDate,
                    budgetRange: {
                        min: formData.salaryRangeOpen ? undefined : parseOptionalNumber(formData.budgetMin),
                        max: formData.salaryRangeOpen ? undefined : parseOptionalNumber(formData.budgetMax),
                        currency: formData.budgetCurrency || 'INR',
                        isOpen: Boolean(formData.salaryRangeOpen)
                    },
                    priority: formData.priority
                },
                jobDescription: formData.jobDescription,
                jobDescriptionFile: formData.jobDescriptionFile
            };

            if (id) {
                payload.assignedUsers = formData.assignedUsers;
                payload.analyticsViewers = formData.analyticsViewers;
            }

            if (!id && selectedPhaseTemplateId && selectedPhaseTemplateId !== NO_TEMPLATE_OPTION) {
                payload.phaseTemplateId = selectedPhaseTemplateId;
            } else if (!id && selectedPhaseTemplateId === NO_TEMPLATE_OPTION) {
                payload.useDynamicPhases = false;
            }

            let response;

            if (id) {
                // Update existing
                response = await api.put(`/ta/hiring-request/${id}?submit=${!isDraft}`, payload);
                toast.success(isDraft ? 'Draft updated successfully' : 'Request updated and submitted');
            } else {
                // Create new
                response = await api.post(`/ta/hiring-request?submit=${!isDraft}`, payload);
                toast.success(isDraft ? 'Draft saved successfully' : 'Requisition submitted for approval');
            }

            const savedRequest = response?.data;
            invalidateTACaches({
                requestId: savedRequest?._id || id,
                client: savedRequest?.client || formData.client
            });
            try {
                await refreshTAClientsCache();
            } catch (cacheError) {
                console.error('Failed to refresh TA client cache after save:', cacheError);
            }

            navigate('/ta');

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save request');
        } finally {
            setLoading(false);
        }
    };

    const selectedPhaseTemplate = phaseTemplates.find((template) => template._id === selectedPhaseTemplateId);
    const workflowSelectionLocked = Boolean(id);
    const isEditMode = Boolean(id);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{id ? 'Edit Hiring Requisition' : 'Create Hiring Requisition'}</h1>
                        <p className="text-xs text-slate-500">{id ? 'Update Request Details' : 'Step 1: Define Requirement'}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {/* Permission Check for Actions */}
                    {id ? (
                        // Edit Mode
                        (user?.roles?.includes('Admin') || user?.permissions?.includes('ta.edit')) && (
                            <>
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={loading}
                                    className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />} Save Draft
                                </button>
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={loading}
                                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader className="animate-spin" size={16} /> : <Send size={16} />} Submit for Approval
                                </button>
                            </>
                        )
                    ) : (
                        // Create Mode
                        (user?.roles?.includes('Admin') || user?.permissions?.includes('ta.create')) && (
                            <>
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={loading}
                                    className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader className="animate-spin" size={16} /> : <Save size={16} />} Save Draft
                                </button>
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={loading}
                                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader className="animate-spin" size={16} /> : <Send size={16} />} Submit for Approval
                                </button>
                            </>
                        )
                    )}
                </div>
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

                <Section title="1. Role Information" icon={Briefcase}>
                    <div className="md:col-span-1">
                        <div className="flex justify-between items-end gap-2 mb-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Approval Workflow
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowWorkflowModal('APPROVAL')}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
                            >
                                + Add New
                            </button>
                        </div>
                        <select
                            name="workflowId"
                            value={formData.workflowId || ''}
                            onChange={handleChange}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        >
                            <option value="">Select an Approval Workflow</option>
                            {workflows.map(w => (
                                <option key={w._id} value={w._id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <div className="flex justify-between items-end gap-2 mb-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Interview Workflow
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowWorkflowModal('INTERVIEW')}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
                            >
                                + Add New
                            </button>
                        </div>
                        <select
                            name="interviewWorkflowId"
                            value={formData.interviewWorkflowId || ''}
                            onChange={handleChange}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        >
                            <option value="">Select an Interview Template (Optional)</option>
                            {interviewWorkflows.map(w => (
                                <option key={w._id} value={w._id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Client Name" name="client" value={formData.client} onChange={handleChange} required options={clients.map(c => c.name)} />
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Client Visibility
                        </label>
                        <label className="flex items-start gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                name="clientConfidential"
                                checked={formData.clientConfidential}
                                onChange={handleChange}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            <span>
                                <span className="block font-semibold text-slate-800">Keep client name confidential</span>
                                <span className="mt-1 block text-xs text-slate-500">Use this when the client name should be hidden on public job listings.</span>
                            </span>
                        </label>
                    </div>
                    <Input label="Job Title" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Senior Frontend Developer" />
                    <Input label="Department" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g. Engineering" />
                    <Input label="Employment Type" name="employmentType" value={formData.employmentType} onChange={handleChange} required options={['Full-time', 'Intern', 'Contract', 'Freelance']} />
                </Section>

                {!isEditMode && (
                    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        Access assignment and analytics visibility can be configured after creation from requisition edit mode or TA Access Settings.
                    </div>
                )}

                {isEditMode && (
                    <>
                        <Section title="Access Assignment" icon={Users} fullWidth>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Assigned Users
                                </label>
                                <UserMultiSelect
                                    users={availableUsers}
                                    selectedUserIds={formData.assignedUsers}
                                    onChange={(selectedUserIds) => setFormData((prev) => ({ ...prev, assignedUsers: selectedUserIds }))}
                                    placeholder="Select users who can access this requisition"
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    Assigned users receive working access to this requisition and its candidates. Recruiters, hiring managers, and admins can also retain access based on their role.
                                </p>
                            </div>
                        </Section>

                        <Section title="Performance Visibility" icon={Users} fullWidth>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Requisition Performance Viewers
                                </label>
                                <UserMultiSelect
                                    users={availableUsers}
                                    selectedUserIds={formData.analyticsViewers}
                                    onChange={(selectedUserIds) => setFormData((prev) => ({ ...prev, analyticsViewers: selectedUserIds }))}
                                    placeholder="Select users who can view this requisition's analytics"
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    These users can open performance analytics for this requisition. This does not grant candidate access unless they are also assigned through a working access role.
                                </p>
                            </div>
                        </Section>
                    </>
                )}

                <Section title="Recruitment Workflow" icon={Users} fullWidth>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Select Phase Template
                        </label>
                        <select
                            value={selectedPhaseTemplateId}
                            onChange={(event) => setSelectedPhaseTemplateId(event.target.value)}
                            disabled={workflowSelectionLocked}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <option value={NO_TEMPLATE_OPTION}>No Template (Use Standard 3-Phase Process)</option>
                            {phaseTemplates.map((template) => (
                                <option key={template._id} value={template._id}>
                                    {template.name}{template.isDefault ? ' (Default)' : ''}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                            {workflowSelectionLocked
                                ? 'Recruitment workflow selection is locked after a requisition is created.'
                                : 'Templates copy their phase structure into the new requisition without affecting older requests.'}
                        </p>
                    </div>

                    <div className="col-span-1">
                        {selectedPhaseTemplate && selectedPhaseTemplateId !== NO_TEMPLATE_OPTION ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{selectedPhaseTemplate.name}</p>
                                        <p className="text-xs text-slate-500">{selectedPhaseTemplate.description || 'Custom recruitment workflow selected.'}</p>
                                    </div>
                                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                        {selectedPhaseTemplate.phases?.length || 0} phases
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {(selectedPhaseTemplate.phases || [])
                                        .slice()
                                        .sort((left, right) => left.order - right.order)
                                        .map((phase) => {
                                            const tooltipContent = [
                                                phase.description || '',
                                                `Statuses: ${(phase.statusOptions || []).map((status) => status.label).join(', ') || 'None'}`,
                                                `Decisions: ${(phase.decisionOptions || []).map((decision) => decision.label).join(', ') || 'None'}`
                                            ].filter(Boolean).join('\n');

                                            return (
                                                <span
                                                    key={phase._id || phase.phaseId || phase.order}
                                                    title={tooltipContent}
                                                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                                                    style={{
                                                        color: phase.color || '#2563EB',
                                                        borderColor: `${phase.color || '#2563EB'}33`,
                                                        backgroundColor: `${phase.color || '#2563EB'}12`
                                                    }}
                                                >
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[11px] font-bold">
                                                        {phase.order}
                                                    </span>
                                                    {phase.name}
                                                </span>
                                            );
                                        })}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                                Standard 3-phase process will be used.
                            </div>
                        )}
                    </div>
                </Section>

                <Section title="2. Purpose of Hiring" icon={Users}>
                    <Input label="Hiring Purpose" name="purpose" value={formData.purpose} onChange={handleChange} required options={['Replacement', 'New Position', 'Project-based', 'Business Expansion']} />
                    {formData.purpose === 'Replacement' && (
                        <>
                            <Input label="Replaced Employee Name" name="replacedEmployeeName" value={formData.replacedEmployeeName} onChange={handleChange} required placeholder="e.g. John Doe" />
                            <Input label="Replaced Employee ID (Optional)" name="replacedEmployeeId" value={formData.replacedEmployeeId} onChange={handleChange} placeholder="e.g. EMP-123" />
                        </>
                    )}
                </Section>

                <Section title="3. Job Requirements" icon={FileText}>
                    <TagInput
                        label="Must-Have Skills (Technical)"
                        tags={formData.mustHaveSkills.technical}
                        onTagsChange={(tags) => setFormData(prev => ({ 
                            ...prev, 
                            mustHaveSkills: { ...prev.mustHaveSkills, technical: tags } 
                        }))}
                        placeholder="e.g. React, Node.js"
                        gridCols={1}
                    />
                    <TagInput
                        label="Must-Have Skills (Soft Skills)"
                        tags={formData.mustHaveSkills.softSkills}
                        onTagsChange={(tags) => setFormData(prev => ({ 
                            ...prev, 
                            mustHaveSkills: { ...prev.mustHaveSkills, softSkills: tags } 
                        }))}
                        placeholder="e.g. Communication, Leadership"
                        gridCols={1}
                    />
                    <TagInput
                        label="Nice-To-Have Skills"
                        tags={formData.niceToHaveSkills}
                        onTagsChange={(tags) => setFormData(prev => ({ ...prev, niceToHaveSkills: tags }))}
                        placeholder="e.g. Docker, AWS"
                        gridCols={2}
                    />
                    <Input label="Min Experience (Yrs)" name="experienceMin" type="number" value={formData.experienceMin} onChange={handleChange} />
                    <Input label="Max Experience (Yrs)" name="experienceMax" type="number" value={formData.experienceMax} onChange={handleChange} />
                    <Input label="Work Location" name="location" value={formData.location} onChange={handleChange} options={['Onsite', 'Remote', 'Hybrid']} />
                    <Input label="Shift" name="shift" value={formData.shift} onChange={handleChange} placeholder="e.g. General, UK Shift" />
                </Section>

                <Section title="4. Hiring Details" icon={DollarSign}>
                    <Input label="Number of Openings" name="openPositions" type="number" value={formData.openPositions} onChange={handleChange} />
                    <Input label="Expected Joining Date" name="expectedJoiningDate" type="date" value={formData.expectedJoiningDate} onChange={handleChange} />
                    <Input label="Salary Currency" name="budgetCurrency" value={formData.budgetCurrency} onChange={handleChange} options={SALARY_CURRENCIES} />
                    <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Salary Range
                        </label>
                        <label className="flex items-start gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                name="salaryRangeOpen"
                                checked={formData.salaryRangeOpen}
                                onChange={handleChange}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            <span>
                                <span className="block font-semibold text-slate-800">Keep salary range open</span>
                                <span className="mt-1 block text-xs text-slate-500">Use this when the compensation should be shown as Open instead of a fixed range.</span>
                            </span>
                        </label>
                    </div>
                    <Input label="Min Budget (CTC)" name="budgetMin" type="number" value={formData.budgetMin} onChange={handleChange} disabled={formData.salaryRangeOpen} placeholder={formData.salaryRangeOpen ? 'Hidden while range is open' : undefined} />
                    <Input label="Max Budget (CTC)" name="budgetMax" type="number" value={formData.budgetMax} onChange={handleChange} disabled={formData.salaryRangeOpen} placeholder={formData.salaryRangeOpen ? 'Hidden while range is open' : undefined} />
                    <Input label="Priority" name="priority" value={formData.priority} onChange={handleChange} options={['High', 'Medium', 'Low']} />
                </Section>

                <Section title="5. Job Description & Attachments" icon={FileText} fullWidth>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Job Description (JD)
                        </label>
                        <textarea
                            name="jobDescription"
                            value={formData.jobDescription}
                            onChange={handleChange}
                            placeholder="Paste the complete job description here..."
                            rows={8}
                            className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Upload JD File (PDF/Docx)
                        </label>
                        <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center gap-3">
                            {uploadingFile ? (
                                <>
                                    <Loader className="animate-spin text-blue-600" size={32} />
                                    <p className="text-sm font-medium text-slate-600">Uploading file...</p>
                                </>
                            ) : formData.jobDescriptionFile ? (
                                <>
                                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                        <Paperclip size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-800">JD File Attached!</p>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, jobDescriptionFile: '' }))}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium underline mt-1"
                                        >
                                            Remove and upload again
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Upload className="text-slate-400" size={32} />
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-600">Click to upload or drag and drop</p>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">PDF, DOCX (Max 5MB)</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        onChange={handleFileUpload}
                                        accept=".pdf,.doc,.docx"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </>
                            )}
                        </div>
                        {formData.jobDescriptionFile && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="text-blue-600" size={18} />
                                    <span className="text-xs font-medium text-blue-800 truncate max-w-[200px]">JD_Attachment.pdf</span>
                                </div>
                                <a 
                                    href={formData.jobDescriptionFile} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline font-bold"
                                >
                                    View File
                                </a>
                            </div>
                        )}
                    </div>
                </Section>

            </div>

            {/* Workflow Creation Modal */}
            {showWorkflowModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    {showWorkflowModal === 'APPROVAL' ? 'Manage Approval Workflows' : 'Manage Interview Workflows'}
                                </h2>
                                <p className="text-sm text-slate-500">Create or modify sequence templates. Close this window to safely return to your draft.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowWorkflowModal(false);
                                    fetchWorkflowsData(); // Refresh dropdowns with whatever was created
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors bg-white shadow-sm border border-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Modal Body: WorkflowSettings rendered inside */}
                        <div className="flex-1 overflow-y-auto">
                            <WorkflowSettings />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CreateHiringRequest;
