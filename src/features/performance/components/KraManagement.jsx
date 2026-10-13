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

export default function KraManagement() {
  const [kras, setKras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editKra, setEditKra] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

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
              {isWeightageValid ? 'Weightage Balanced' : 'Weightage Validation Notice'}
            </div>
            <div className="text-xs font-semibold">
              Current total weightage: <span className="font-extrabold text-sm">{totalWeightage}%</span>
              {isWeightageValid ? ' (100% total satisfied)' : ' — standard evaluation requires KRA weights to total 100%'}
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
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
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
                    {kra.weightage}% Weight
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
                <span className="text-[11px] text-slate-400 font-semibold">
                  {kra.kpiCount || 0} linked KPIs
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditKra(kra);
                      setFormData(kra);
                      setShowModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(kra._id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
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
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                >
                  {editKra ? 'Update KRA' : 'Create KRA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
