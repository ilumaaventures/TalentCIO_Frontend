import React, { useState, useEffect } from 'react';
import { Building2, Users, User, Plus, Trash2, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const EMPTY_CONTACT = { name: '', email: '', phone: '' };

const INITIAL_FORM = {
    // Company Details
    companyName: '',
    companyUrl: '',
    companyLocation: '',
    // Client Details
    name: '',
    nickname: '',
    email: '',
    businessUnit: '',
    location: '',
    status: 'Active',
};

const ClientForm = ({ isOpen, onClose, clientId, onSuccess }) => {
    const { user } = useAuth();
    const isEditing = Boolean(clientId);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT }]);
    const [businessUnits, setBusinessUnits] = useState([]);
    const [loading, setLoading] = useState(isEditing);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    /* ── Fetch reference data ───────────────────── */
    useEffect(() => {
        const init = async () => {
            if (!isOpen) return;

            try {
                const buRes = await api.get('/projects/business-units');
                setBusinessUnits(buRes.data);
            } catch {
                toast.error('Failed to load business units');
            }

            if (isEditing) {
                setLoading(true);
                try {
                    const res = await api.get(`/projects/clients?_t=${Date.now()}`);
                    const client = res.data.find(c => c._id === clientId);
                    if (client) {
                        setFormData({
                            companyName: client.companyName || '',
                            companyUrl: client.companyUrl || '',
                            companyLocation: client.companyLocation || '',
                            name: client.name || '',
                            nickname: client.nickname || '',
                            email: client.email || '',
                            businessUnit: client.businessUnit?._id || '',
                            location: client.location || '',
                            status: client.status || 'Active',
                        });
                        setContacts(
                            client.contactPersons?.length
                                ? client.contactPersons.map(cp => ({
                                    name: cp.name || '',
                                    email: cp.email || '',
                                    phone: cp.phone || '',
                                }))
                                : [{ ...EMPTY_CONTACT }]
                        );
                    } else {
                        toast.error('Client not found');
                        onClose();
                    }
                } catch {
                    toast.error('Failed to load client');
                    onClose();
                } finally {
                    setLoading(false);
                }
            } else {
                setFormData(INITIAL_FORM);
                setContacts([{ ...EMPTY_CONTACT }]);
                setLoading(false);
            }
        };
        init();
    }, [clientId, isEditing, isOpen, onClose]);

    /* ── Contact person helpers ─────────────────── */
    const addContact = () => setContacts(prev => [...prev, { ...EMPTY_CONTACT }]);

    const removeContact = (idx) =>
        setContacts(prev => prev.filter((_, i) => i !== idx));

    const handleContactChange = (idx, field, value) => {
        setContacts(prev => {
            const updated = [...prev];
            if (field === 'phone') {
                updated[idx] = { ...updated[idx], phone: value.replace(/\D/g, '').slice(0, 10) };
            } else {
                updated[idx] = { ...updated[idx], [field]: value };
            }
            return updated;
        });
        setErrors(prev => {
            const next = { ...prev };
            delete next[`contact_${idx}_${field}`];
            return next;
        });
    };

    /* ── Validation ─────────────────────────────── */
    const validate = () => {
        const errs = {};
        if (!formData.name.trim()) errs.name = 'Client name is required';

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            errs.email = 'Invalid email address';

        if (formData.companyUrl && !/^https?:\/\/.+/.test(formData.companyUrl))
            errs.companyUrl = 'URL must start with http:// or https://';

        contacts.forEach((cp, idx) => {
            if (cp.phone && !/^\d{10}$/.test(cp.phone))
                errs[`contact_${idx}_phone`] = 'Must be exactly 10 digits';
            if (cp.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cp.email))
                errs[`contact_${idx}_email`] = 'Invalid email address';
        });

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    /* ── Form field handler ─────────────────────── */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    /* ── Submit ─────────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);

        const contactPersons = contacts.filter(
            cp => cp.name.trim() || cp.email.trim() || cp.phone.trim()
        );

        const payload = { ...formData, contactPersons };

        try {
            if (isEditing) {
                await api.put(`/projects/clients/${clientId}`, payload);
                toast.success('Client updated successfully');
            } else {
                await api.post('/projects/clients', payload);
                toast.success('Client created successfully');
            }
            sessionStorage.removeItem(`client_data_${user?._id}`);
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error(isEditing ? 'Failed to update client' : 'Failed to create client');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {isEditing ? 'Edit Client' : 'Add New Client'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            {isEditing ? 'Update client information' : 'Fill in the details below to add a new client'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400 flex-1 flex justify-center items-center">
                        <div className="animate-pulse font-medium">Loading client details...</div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Section 1: Company Details */}
                            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Building2 size={16} />
                                    </div>
                                    <h2 className="font-semibold text-slate-700">Company Details</h2>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company Name</label>
                                        <input name="companyName" value={formData.companyName} onChange={handleChange}
                                            placeholder="e.g. Acme Corporation" className="zoho-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company URL</label>
                                        <input name="companyUrl" value={formData.companyUrl} onChange={handleChange}
                                            placeholder="https://example.com"
                                            className={`zoho-input ${errors.companyUrl ? 'border-red-400' : ''}`} />
                                        {errors.companyUrl && <p className="text-red-500 text-xs mt-1">{errors.companyUrl}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Company Location</label>
                                        <input name="companyLocation" value={formData.companyLocation} onChange={handleChange}
                                            placeholder="City, Country" className="zoho-input" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Client Details */}
                            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                <div className="flex items-center space-x-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Users size={16} />
                                    </div>
                                    <h2 className="font-semibold text-slate-700">Client Details</h2>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                            Client Name <span className="text-red-500">*</span>
                                        </label>
                                        <input name="name" value={formData.name} onChange={handleChange}
                                            placeholder="Client name"
                                            className={`zoho-input ${errors.name ? 'border-red-400' : ''}`} />
                                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nickname</label>
                                        <input name="nickname" value={formData.nickname} onChange={handleChange}
                                            placeholder="Nickname" className="zoho-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Client Email</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                                            placeholder="client@example.com"
                                            className={`zoho-input ${errors.email ? 'border-red-400' : ''}`} />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Business Unit</label>
                                        <select name="businessUnit" value={formData.businessUnit} onChange={handleChange} className="zoho-input">
                                            <option value="">Select Business Unit</option>
                                            {businessUnits.map(bu => (
                                                <option key={bu._id} value={bu._id}>{bu.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Location</label>
                                        <input name="location" value={formData.location} onChange={handleChange}
                                            placeholder="City, Country" className="zoho-input" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                                        <select name="status" value={formData.status} onChange={handleChange} className="zoho-input">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Contact Persons */}
                            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <User size={16} />
                                        </div>
                                        <h2 className="font-semibold text-slate-700">Contact Persons</h2>
                                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {contacts.length}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addContact}
                                        className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors"
                                    >
                                        <Plus size={14} />
                                        <span>Add Contact</span>
                                    </button>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {contacts.map((cp, idx) => (
                                        <div key={idx} className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                    Contact {idx + 1}
                                                </span>
                                                {contacts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeContact(idx)}
                                                        className="flex items-center space-x-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Remove</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                                                    <input
                                                        value={cp.name}
                                                        onChange={e => handleContactChange(idx, 'name', e.target.value)}
                                                        placeholder="Full name"
                                                        className="zoho-input"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        value={cp.email}
                                                        onChange={e => handleContactChange(idx, 'email', e.target.value)}
                                                        placeholder="contact@example.com"
                                                        className={`zoho-input ${errors[`contact_${idx}_email`] ? 'border-red-400' : ''}`}
                                                    />
                                                    {errors[`contact_${idx}_email`] && (
                                                        <p className="text-red-500 text-xs mt-1">{errors[`contact_${idx}_email`]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone</label>
                                                    <input
                                                        value={cp.phone}
                                                        onChange={e => handleContactChange(idx, 'phone', e.target.value)}
                                                        placeholder="10-digit number"
                                                        inputMode="numeric"
                                                        maxLength={10}
                                                        className={`zoho-input ${errors[`contact_${idx}_phone`] ? 'border-red-400' : ''}`}
                                                    />
                                                    <p className={`text-xs mt-1 ${errors[`contact_${idx}_phone`] ? 'text-red-500' : 'text-slate-400'}`}>
                                                        {errors[`contact_${idx}_phone`] || `${cp.phone.length}/10 digits`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="zoho-btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="zoho-btn-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {submitting && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                {submitting ? 'Saving...' : isEditing ? 'Update Client' : 'Create Client'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ClientForm;
