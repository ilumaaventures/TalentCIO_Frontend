import React, { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  X,
  Building,
  Target,
  Eye,
  Info,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

const CATEGORIES = [
  'Productivity & Delivery',
  'Quality of Work',
  'Customer Satisfaction',
  'Revenue & Sales',
  'Operational Efficiency',
  'Team Collaboration',
  'Leadership & Mentorship',
  'Learning & Development',
  'General',
];

export default function KraManagement({ onNavigateToKpis }) {
  const [kras, setKras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editKra, setEditKra] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Linked KPIs Drawer / Modal state
  const [showLinkedKpiModal, setShowLinkedKpiModal] = useState(false);
  const [selectedKraForKpis, setSelectedKraForKpis] = useState(null);
  const [linkedKpisData, setLinkedKpisData] = useState(null);
  const [loadingLinkedKpis, setLoadingLinkedKpis] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'Productivity & Delivery',
    weightage: 20,
    measurementMethod: '',
    targetDefinition: '',
    isTemplate: true,
    isMandatory: false,
  });

  useEffect(() => {
    fetchKras();
  }, [search, selectedCategory]);

  const fetchKras = async () => {
    try {
      setLoading(true);
      const res = await pmsApi.getKras({ search, category: selectedCategory });
      if (res.data?.success) {
        setKras(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load KRAs');
    } finally {
      setLoading(false);
    }
  };

  const totalWeightage = kras.reduce((sum, k) => sum + (Number(k.weightage) || 0), 0);
  const isWeightageValid = totalWeightage === 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('KRA name is required');
      return;
    }
    try {
      if (editKra) {
        const res = await pmsApi.updateKra(editKra._id, formData);
        if (res.data?.success) toast.success('KRA updated successfully');
      } else {
        const res = await pmsApi.createKra(formData);
        if (res.data?.success) toast.success('KRA created successfully');
      }
      setShowModal(false);
      setEditKra(null);
      fetchKras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save KRA');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this KRA? All linked KPIs will be deleted.')) return;
    try {
      const res = await pmsApi.deleteKra(id);
      if (res.data?.success) {
        toast.success('KRA deleted');
        fetchKras();
      }
    } catch (err) {
      toast.error('Failed to delete KRA');
    }
  };

  const handleOpenLinkedKpis = async (kra) => {
    setSelectedKraForKpis(kra);
    setShowLinkedKpiModal(true);
    try {
      setLoadingLinkedKpis(true);
      const res = await pmsApi.getKpisByKra(kra._id);
      if (res.data?.success) {
        setLinkedKpisData(res.data.data);
      }
    } catch (err) {
      console.error('[Error fetching linked KPIs]:', err);
      toast.error('Failed to load linked KPIs for this KRA');
    } finally {
      setLoadingLinkedKpis(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Weightage Total Validation Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-xs transition ${
        isWeightageValid
          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
          : 'border-amber-200 bg-amber-50/70 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${
            isWeightageValid ? 'bg-emerald-600' : 'bg-amber-600'
          }`}>
            {isWeightageValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {isWeightageValid ? 'KRA Weightage Balanced' : 'KRA Weightage Notice'}
            </div>
            <div className="text-xs font-semibold">
              Current total organizational KRA weightage: <span className="font-extrabold text-sm">{totalWeightage}%</span>
              {isWeightageValid ? ' (100% total satisfied)' : ' — standard appraisal models require organizational KRA weights to total 100%'}
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs sm:w-48">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isWeightageValid ? 'bg-emerald-600' : totalWeightage > 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(100, totalWeightage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Add Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search KRAs..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-hidden"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setEditKra(null);
            setFormData({
              name: '',
              code: '',
              description: '',
              category: 'Productivity & Delivery',
              weightage: 20,
              measurementMethod: '',
              targetDefinition: '',
              isTemplate: true,
              isMandatory: false,
            });
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
        >
          <Plus size={16} />
          <span>Add New KRA</span>
        </button>
      </div>

      {/* KRA List */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : kras.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Layers size={36} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">No KRAs Defined</h3>
          <p className="mt-1 text-xs text-slate-400">Add Key Result Areas (KRAs) to define evaluation pillars.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kras.map((kra) => (
            <div key={kra._id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                    {kra.category}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-900">
                    {kra.weightage}% KRA Weight
                  </span>
                </div>

                <h4 className="mt-2.5 text-sm font-bold text-slate-900">{kra.name}</h4>
                {kra.description && (
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{kra.description}</p>
                )}

                {kra.targetDefinition && (
                  <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-2 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700">Target:</span> {kra.targetDefinition}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleOpenLinkedKpis(kra)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                >
                  <Target size={13} className="text-blue-600" />
                  <span>View Linked KPIs</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditKra(kra);
                      setFormData(kra);
                      setShowModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                    title="Edit KRA"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(kra._id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Delete KRA"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Add / Edit KRA */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editKra ? 'Edit KRA' : 'Add New KRA'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">KRA Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Delivery Quality & Zero Severity-1 Escapes"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Weightage (0–100%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.weightage}
                    onChange={(e) => setFormData({ ...formData, weightage: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Target & Success Definition</label>
                <input
                  type="text"
                  value={formData.targetDefinition}
                  onChange={(e) => setFormData({ ...formData, targetDefinition: e.target.value })}
                  placeholder="e.g. Achieve >= 98% defect-free releases on scheduled date"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Strategic alignment and expectations..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  {editKra ? 'Update KRA' : 'Create KRA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: View Linked KPIs for Selected KRA */}
      {showLinkedKpiModal && selectedKraForKpis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-blue-700">
                    {selectedKraForKpis.category}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {selectedKraForKpis.weightage}% KRA Weight
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">{selectedKraForKpis.name}</h3>
                <p className="text-xs text-slate-500">Associated Department-wise Key Performance Indicators</p>
              </div>
              <button
                onClick={() => setShowLinkedKpiModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {loadingLinkedKpis ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : !linkedKpisData || linkedKpisData.templates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <Target size={36} className="mx-auto text-slate-300" />
                <h4 className="mt-2 text-xs font-bold text-slate-700">No KPIs Linked Yet</h4>
                <p className="mt-1 text-[11px] text-slate-400">
                  Create and associate KPI templates under this KRA in the KPI Management module.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Weightage Summary Bar */}
                <div className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
                  linkedKpisData.weightageSummary?.isOverAllocated
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : linkedKpisData.weightageSummary?.isFull
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-blue-200 bg-blue-50 text-blue-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <Info size={16} />
                    <span>
                      Total KPI Weightage allocated under this KRA: <strong>{linkedKpisData.weightageSummary?.totalWeightage}%</strong>
                      {' • '}
                      Remaining: <strong>{linkedKpisData.weightageSummary?.remainingWeightage}%</strong>
                    </span>
                  </div>
                  <span className="font-extrabold text-[10px] uppercase">
                    {linkedKpisData.weightageSummary?.isFull
                      ? '100% Balanced'
                      : linkedKpisData.weightageSummary?.isOverAllocated
                      ? 'Over-allocated'
                      : 'Weightage Available'}
                  </span>
                </div>

                {/* Table of Linked KPIs */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                        <th className="py-2.5 px-3">KPI Name</th>
                        <th className="py-2.5 px-3">Department / Role</th>
                        <th className="py-2.5 px-3">Target</th>
                        <th className="py-2.5 px-3">Weightage</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linkedKpisData.templates.map((tpl) => (
                        <tr key={tpl._id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{tpl.name}</div>
                            {tpl.code && <span className="font-mono text-[9px] text-slate-400">[{tpl.code}]</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-700">{tpl.department}</div>
                            <div className="text-[10px] text-slate-400">{tpl.designation || 'All Roles'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {tpl.targetValue} {tpl.unitOfMeasurement}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-800">
                              {tpl.weightage}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              tpl.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {tpl.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowLinkedKpiModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
