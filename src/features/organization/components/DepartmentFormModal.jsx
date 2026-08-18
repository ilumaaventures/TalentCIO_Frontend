import React, { useState, useEffect } from 'react';
import { X, Building } from 'lucide-react';

const DepartmentFormModal = ({
    showModal,
    onClose,
    onSubmit,
    editingDepartment = null,
    departments = [],
    businessUnits = [],
    employees = []
}) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        parentDepartment: '',
        businessUnit: '',
        head: '',
        description: '',
        isActive: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (editingDepartment) {
            setFormData({
                name: editingDepartment.name || '',
                code: editingDepartment.code || '',
                parentDepartment: editingDepartment.parentDepartment?._id || editingDepartment.parentDepartment || '',
                businessUnit: editingDepartment.businessUnit?._id || editingDepartment.businessUnit || '',
                head: editingDepartment.head?._id || editingDepartment.head || '',
                description: editingDepartment.description || '',
                isActive: editingDepartment.isActive !== false
            });
        } else {
            setFormData({
                name: '',
                code: '',
                parentDepartment: '',
                businessUnit: '',
                head: '',
                description: '',
                isActive: true
            });
        }
    }, [editingDepartment, showModal]);

    if (!showModal) return null;

    const availableParents = departments.filter((d) => (
        !editingDepartment || String(d._id) !== String(editingDepartment._id)
    ));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <Building size={18} className="text-blue-600" />
                        <h3 className="font-bold text-sm text-slate-800">
                            {editingDepartment ? 'Edit Department' : 'Create New Department'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Department Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Engineering, Human Resources"
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Department Code
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. ENG, HR"
                                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none uppercase"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Parent Department
                            </label>
                            <select
                                value={formData.parentDepartment}
                                onChange={(e) => setFormData({ ...formData, parentDepartment: e.target.value })}
                                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                            >
                                <option value="">-- None (Top Level) --</option>
                                {availableParents.map((d) => (
                                    <option key={d._id} value={d._id}>
                                        {d.name} {d.code ? `(${d.code})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Business Unit
                            </label>
                            <select
                                value={formData.businessUnit}
                                onChange={(e) => setFormData({ ...formData, businessUnit: e.target.value })}
                                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                            >
                                <option value="">-- None --</option>
                                {businessUnits.map((bu) => (
                                    <option key={bu._id} value={bu._id}>
                                        {bu.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Department Head
                            </label>
                            <select
                                value={formData.head}
                                onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                            >
                                <option value="">-- Select Head --</option>
                                {employees.map((emp) => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.firstName} {emp.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of department scope..."
                            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="dept-active"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="dept-active" className="text-xs font-medium text-slate-700 cursor-pointer">
                            Active Department
                        </label>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : editingDepartment ? 'Save Changes' : 'Create Department'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepartmentFormModal;
