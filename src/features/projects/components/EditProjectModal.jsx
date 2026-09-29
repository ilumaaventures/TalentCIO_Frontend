import React, { useState, useEffect, useMemo } from "react";
import { Briefcase, XCircle, Search, X } from "lucide-react";
import api from "@/lib/apiClient";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

const getInitials = (first, last) => {
  const f = (first || "").charAt(0).toUpperCase();
  const l = (last || "").charAt(0).toUpperCase();
  return `${f}${l}` || "U";
};

const toDateInput = (d) => {
  if (!d) return "";
  try { return new Date(d).toISOString().split("T")[0]; } catch { return ""; }
};

const EditProjectModal = ({ project, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ name: "", client: "", businessUnit: "", category: "", estimatedHours: "", description: "", status: "Active", hasModules: true, startDate: "", dueDate: "", members: [] });
  const [clients, setClients] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !project) return;
    setFormData({
      name: project.name || "",
      client: project.client?._id || project.client || "",
      businessUnit: project.businessUnit?._id || project.businessUnit || "",
      category: project.category || "",
      estimatedHours: project.estimatedHours ?? "",
      description: project.description || "",
      status: project.status || "Active",
      hasModules: project.hasModules !== false,
      startDate: toDateInput(project.startDate),
      dueDate: toDateInput(project.dueDate || project.endDate),
      members: (project.members || []).map(m => m._id || m),
    });
    setMemberSearchTerm("");
  }, [isOpen, project]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      api.get("/clients").catch(() => ({ data: [] })),
      api.get("/business-units").catch(() => ({ data: [] })),
      api.get("/projects/employees").catch(() => ({ data: [] })),
    ]).then(([cRes, buRes, empRes]) => {
      setClients(Array.isArray(cRes.data) ? cRes.data : cRes.data?.clients || []);
      setBusinessUnits(Array.isArray(buRes.data) ? buRes.data : buRes.data?.businessUnits || []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : empRes.data?.employees || []);
    });
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    const term = memberSearchTerm.toLowerCase();
    return employees.filter(e => !term || `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) || (e.email || "").toLowerCase().includes(term));
  }, [employees, memberSearchTerm]);

  const toggleMember = (empId) => {
    setFormData(prev => {
      const current = prev.members || [];
      return { ...prev, members: current.includes(empId) ? current.filter(x => x !== empId) : [...current, empId] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.client) payload.client = null;
      if (!payload.businessUnit) payload.businessUnit = null;
      if (!payload.startDate) payload.startDate = null;
      if (!payload.dueDate) payload.dueDate = null;
      payload.category = payload.category ? String(payload.category).trim() : "";
      payload.estimatedHours = (payload.estimatedHours !== "" && !isNaN(payload.estimatedHours)) ? Number(payload.estimatedHours) : 0;
      await api.put(`/projects/${project._id}`, payload);
      toast.success("Project updated successfully");
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-slate-50 focus:bg-white";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
              <Briefcase size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Project</h3>
              <p className="mt-1 text-sm text-gray-500">Update project details and team assignments</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

            {/* Basic Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-blue-600 rounded-full" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Basic Information</h4>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                  <input required placeholder="e.g. Website Redesign Q3" className={inputCls} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                  <input placeholder="e.g. Development, Design" className={inputCls} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Client</label>
                  <select className={inputCls} value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })}>
                    <option value="">Internal / No Client</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Unit</label>
                  <select className={inputCls} value={formData.businessUnit} onChange={e => setFormData({ ...formData, businessUnit: e.target.value })}>
                    <option value="">None / Select Business Unit</option>
                    {businessUnits.map(bu => <option key={bu._id} value={bu._id}>{bu.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select className={inputCls} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea placeholder="Briefly describe the project scope and goals..." className={`${inputCls} resize-none`} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows="3" />
                </div>
                <div className="col-span-2 flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">Contains Modules</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{formData.hasModules ? "Project uses modules for time tracking." : "Team members log time directly to the project."}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                    <input type="checkbox" checked={Boolean(formData.hasModules)} onChange={e => setFormData({ ...formData, hasModules: e.target.checked })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Timeline */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-blue-600 rounded-full" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Timeline &amp; Estimates</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                  <input type="date" className={inputCls} value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                  <input type="date" className={inputCls} value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimate Hours</label>
                  <input type="number" min="0" step="0.5" placeholder="e.g. 100" className={inputCls} value={formData.estimatedHours} onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Team Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Team Members</h4>
                </div>
                <div className="flex items-center gap-2.5">
                  {formData.members?.length > 0 && (
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, members: [] }))} className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors">Deselect all</button>
                  )}
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">{formData.members?.length || 0} selected</span>
                </div>
              </div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={memberSearchTerm} onChange={e => setMemberSearchTerm(e.target.value)} placeholder="Search team members by name or email..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
                {memberSearchTerm && (
                  <button type="button" onClick={() => setMemberSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"><X size={13} /></button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs">
                {filteredEmployees.map(emp => {
                  const isChecked = formData.members?.includes(emp._id);
                  return (
                    <div key={emp._id} onClick={() => toggleMember(emp._id)}
                      className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${isChecked ? "bg-blue-50/70 hover:bg-blue-50" : "hover:bg-slate-50"}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <input type="checkbox" checked={isChecked} onChange={() => {}} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0 pointer-events-none" />
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 border border-blue-200/70">{getInitials(emp.firstName, emp.lastName)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                        </div>
                      </div>
                      {isChecked && <span className="text-[11px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full shrink-0">Selected</span>}
                    </div>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <Briefcase size={24} className="mb-1.5 opacity-30" />
                    <p className="text-xs">{memberSearchTerm ? `No team members matching "${memberSearchTerm}"` : "No employees found"}</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-2 pl-1">Selected members will have visibility access to this project.</p>
            </div>
          </div>

          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
            <p className="text-xs text-slate-400">Changes will be saved immediately.</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
              <Button type="submit" isLoading={submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">Save Changes</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
