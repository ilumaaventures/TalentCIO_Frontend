import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Trash2, FileText, Image, Loader, Plus, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '@/features/auth/context/AuthContext';
import { submitClaim, getCategories } from '../api/reimbursementApi';
import { formatINR } from '../utils/reimbursementConstants';

const MAX_FILES = 10;
const MAX_FILE_MB = 5;
const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SubmitClaimModal = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);

    // Expense Line Items
    const [items, setItems] = useState([
        {
            expenseDate: new Date().toISOString().split('T')[0],
            description: '',
            category: '',
            amount: '',
            hasReceipt: true,
            receiptAttached: 'Y'
        }
    ]);

    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Load categories on mount
    useEffect(() => {
        getCategories()
            .then(res => {
                const cats = res.data?.categories || [];
                setCategories(cats);
                if (cats.length > 0) {
                    setItems(prev => prev.map(item => item.category ? item : { ...item, category: cats[0].name }));
                }
            })
            .catch(() => { });
    }, []);

    // Generate preview URLs for image files
    useEffect(() => {
        const urls = files.map(f =>
            f.type.startsWith('image/') ? URL.createObjectURL(f) : null
        );
        setPreviews(urls);
        return () => urls.forEach(url => url && URL.revokeObjectURL(url));
    }, [files]);

    const addFiles = useCallback((newFiles) => {
        const valid = [];
        for (const f of newFiles) {
            if (files.length + valid.length >= MAX_FILES) {
                toast.error(`Maximum ${MAX_FILES} receipts allowed.`);
                break;
            }
            if (!ALLOWED_MIME.has(f.type)) {
                toast.error(`${f.name}: Only PDF, Word, or image files are allowed.`);
                continue;
            }
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                toast.error(`${f.name}: File must be under ${MAX_FILE_MB} MB.`);
                continue;
            }
            valid.push(f);
        }
        setFiles(prev => [...prev, ...valid]);
    }, [files.length]);

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        addFiles([...e.dataTransfer.files]);
    };

    // Itemized table actions
    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                expenseDate: new Date().toISOString().split('T')[0],
                description: '',
                category: categories[0]?.name || 'Food & Meals',
                amount: '',
                hasReceipt: true,
                receiptAttached: 'Y'
            }
        ]);
    };

    const handleRemoveItem = (index) => {
        if (items.length <= 1) return toast.error('At least one expense line item is required.');
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    // Calculate total amount
    const totalAmount = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

    const validate = () => {
        if (items.length === 0) {
            toast.error('Please add at least one expense detail.');
            return false;
        }
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            if (!it.expenseDate) {
                toast.error(`Line ${i + 1}: Date of Expense is required.`);
                return false;
            }
            if (!it.description.trim()) {
                toast.error(`Line ${i + 1}: Description is required.`);
                return false;
            }
            if (!it.category) {
                toast.error(`Line ${i + 1}: Category Type is required.`);
                return false;
            }
            if (!it.amount || isNaN(Number(it.amount)) || Number(it.amount) <= 0) {
                toast.error(`Line ${i + 1}: Valid positive amount is required.`);
                return false;
            }
        }
        if (files.length === 0) {
            toast.error('Receipt attachment is mandatory. Please upload at least one receipt or invoice.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        const fd = new FormData();
        fd.append('category', items[0]?.category || 'General');
        fd.append('amount', totalAmount);
        fd.append('expenseDate', items[0]?.expenseDate || new Date().toISOString().split('T')[0]);
        fd.append('description', items.map(i => i.description).join('; '));
        fd.append('department', user?.department || '');
        fd.append('employeeCode', user?.employeeCode || user?.employeeId || '');
        fd.append('items', JSON.stringify(items));

        files.forEach(f => fd.append('receipts', f));

        setSubmitting(true);
        try {
            await submitClaim(fd);
            toast.success('Reimbursement claim submitted successfully.');
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit claim.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
        >
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl my-auto">
                {/* Modal Title Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                    <div>
                        <h2 className="text-base font-bold tracking-tight">Employee Reimbursement / Expense Claim Form</h2>
                        <p className="text-[11px] text-slate-300">Submit official business expense claim for approval & reimbursement</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* SECTION 1: EMPLOYEE INFO */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Employee Information</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Employee Name:</span>
                                <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                                    {user?.firstName} {user?.lastName}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Employee ID:</span>
                                <span className="font-semibold text-slate-800 mt-0.5 block">
                                    {user?.employeeCode || user?.employeeId || '—'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Department:</span>
                                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                                    {user?.department || '—'}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Date Submitted:</span>
                                <span className="font-semibold text-slate-800 mt-0.5 block">
                                    {format(new Date(), 'dd/MM/yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: EXPENSE DETAILS TABLE */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Expense Details</h3>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                <Plus size={14} /> Add Line Item
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                                        <th className="py-2.5 px-3">Date of Expense *</th>
                                        <th className="py-2.5 px-3">Description *</th>
                                        <th className="py-2.5 px-3">Category Type *</th>
                                        <th className="py-2.5 px-3 w-32">Amount (₹) *</th>
                                        <th className="py-2.5 px-3 w-28 text-center">Receipt (Y/N)</th>
                                        <th className="py-2.5 px-2 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50/50">
                                            {/* Date of Expense */}
                                            <td className="p-2.5">
                                                <input
                                                    type="date"
                                                    value={item.expenseDate}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={e => handleItemChange(index, 'expenseDate', e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                                                />
                                            </td>

                                            {/* Description */}
                                            <td className="p-2.5">
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Client Dinner, Taxi fare"
                                                    value={item.description}
                                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                                                />
                                            </td>

                                            {/* Category Type */}
                                            <td className="p-2.5">
                                                <select
                                                    value={item.category}
                                                    onChange={e => handleItemChange(index, 'category', e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 bg-white"
                                                >
                                                    {categories.map(c => (
                                                        <option key={c._id} value={c.name}>{c.name}</option>
                                                    ))}
                                                    {categories.length === 0 && (
                                                        <>
                                                            <option value="Food & Meals">Food & Meals</option>
                                                            <option value="Travel">Travel</option>
                                                            <option value="Accommodation">Accommodation / Stay</option>
                                                            <option value="Other">Other</option>
                                                        </>
                                                    )}
                                                </select>
                                            </td>

                                            {/* Amount */}
                                            <td className="p-2.5">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={item.amount}
                                                    onChange={e => handleItemChange(index, 'amount', e.target.value)}
                                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                                                />
                                            </td>

                                            {/* Receipt Attached Y/N - Fixed to Always Yes (Y) */}
                                            <td className="p-2.5 text-center">
                                                <span className="inline-flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-bold shadow-2xs">
                                                    Yes (Y)
                                                </span>
                                            </td>

                                            {/* Delete row */}
                                            <td className="p-2.5 text-center">
                                                {items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-slate-400 hover:text-red-500 p-1"
                                                        title="Delete row"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Amount Summary */}
                        <div className="flex justify-end mt-3 px-2">
                            <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-2 border border-slate-200">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Amount:</span>
                                <span className="text-base font-black text-slate-900">{formatINR(totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: RECEIPTS ATTACHMENT */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            Receipt Attachments* <span className="font-normal text-slate-400">— Bills, Invoices, Vouchers</span>
                        </label>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors
                                ${dragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                                className="hidden"
                                onChange={e => addFiles([...e.target.files])}
                            />
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-xs text-slate-500 mb-2 border border-slate-200">
                                <Upload size={16} />
                            </div>
                            <p className="text-xs font-semibold text-slate-700">Click to upload receipts or drag & drop</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG or DOC up to 5 MB each (Max {MAX_FILES} files)</p>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-xs relative group">
                                        <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                                            {previews[i] ? (
                                                <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <FileText size={14} className="text-slate-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-slate-800 text-[11px]">{file.name}</p>
                                            <p className="text-[9px] text-slate-400">{formatBytes(file.size)}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(i)}
                                            className="text-slate-400 hover:text-red-500 p-1"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

                {/* Modal Action Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <div className="text-xs text-slate-500">
                        Total Claim: <strong className="text-slate-900 text-sm">{formatINR(totalAmount)}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                            {submitting && <Loader size={13} className="animate-spin" />}
                            Submit Claim
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmitClaimModal;
