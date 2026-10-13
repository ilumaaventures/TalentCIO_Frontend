import React, { useEffect, useState } from 'react';
import {
  Compass,
  Plus,
  Trash2,
  Edit2,
  Check,
  Star,
  Search,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pmsApi from '../api/pmsApi';

const CATEGORIES = [
  'Core Organizational',
  'Functional & Technical',
  'Leadership & People Management',
  'Behavioral & Interpersonal',
  'Communication & Collaboration',
  'Problem Solving & Innovation',
];

export default function CompetencyFramework() {
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editComp, setEditComp] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Core Organizational',
    description: '',
    expectedProficiency: 3,
    observableBehaviors: '',
    weightage: 10,
  });

  useEffect(() => {
    fetchCompetencies();
  }, [search, selectedCategory]);

  const fetchCompetencies = async () => {
    try {
      setLoading(true);
      const res = await pmsApi.getCompetencies({ search, category: selectedCategory });
      if (res.data?.success) setCompetencies(res.data.data);
    } catch (err) {
      toast.error('Failed to load competencies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Competency name is required');
      return;
    }
    try {
      const payload = {
        ...formData,
        observableBehaviors: typeof formData.observableBehaviors === 'string'
          ? formData.observableBehaviors.split('\n').map((b) => b.trim()).filter(Boolean)
          : formData.observableBehaviors,
      };

      if (editComp) {
        const res = await pmsApi.updateCompetency(editComp._id, payload);
        if (res.data?.success) toast.success('Competency updated');
      } else {
        const res = await pmsApi.createCompetency(payload);
        if (res.data?.success) toast.success('Competency created');
      }
      setShowModal(false);
      setEditComp(null);
      fetchCompetencies();
    } catch (err) {
      toast.error('Failed to save competency');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this competency?')) return;
    try {
      await pmsApi.deleteCompetency(id);
      toast.success('Competency deleted');
      fetchCompetencies();
    } catch (err) {
      toast.error('Failed to delete competency');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search competencies..."
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
            setEditComp(null);
            setFormData({
              name: '',
              code: '',
              category: 'Core Organizational',
              description: '',
              expectedProficiency: 3,
              observableBehaviors: '',
              weightage: 10,
            });
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          <span>Add Competency</span>
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      ) : competencies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Compass size={36} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">No Competencies Configured</h3>
          <p className="mt-1 text-xs text-slate-400">Establish standard competency criteria across organizational roles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competencies.map((comp) => (
            <div key={comp._id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                    {comp.category}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <Star
                        key={lvl}
                        size={12}
                        className={lvl <= comp.expectedProficiency ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                      />
                    ))}
                  </div>
                </div>

                <h4 className="mt-2.5 text-sm font-bold text-slate-900">{comp.name}</h4>
                {comp.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{comp.description}</p>
                )}

                {/* Observable behaviors */}
                {comp.observableBehaviors && comp.observableBehaviors.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observable Behaviors</span>
                    <ul className="space-y-1">
                      {comp.observableBehaviors.slice(0, 3).map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                          <Check size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] font-semibold text-slate-400">
                  Target Proficiency: Level {comp.expectedProficiency}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditComp(comp);
                      setFormData({
                        ...comp,
                        observableBehaviors: (comp.observableBehaviors || []).join('\n'),
                      });
                      setShowModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(comp._id)}
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
              <h3 className="text-base font-bold text-slate-900">{editComp ? 'Edit Competency' : 'Add Competency'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Competency Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Strategic Thinking & Execution"
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
                  <label className="block text-xs font-bold text-slate-700">Expected Proficiency (1–5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.expectedProficiency}
                    onChange={(e) => setFormData({ ...formData, expectedProficiency: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of this competency standard..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Observable Behaviors (1 per line)</label>
                <textarea
                  rows={3}
                  value={formData.observableBehaviors}
                  onChange={(e) => setFormData({ ...formData, observableBehaviors: e.target.value })}
                  placeholder="Demonstrates active listening in team reviews&#10;Proactively communicates project risks early&#10;Aligns daily work with organizational milestones"
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
                  {editComp ? 'Update Competency' : 'Save Competency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
