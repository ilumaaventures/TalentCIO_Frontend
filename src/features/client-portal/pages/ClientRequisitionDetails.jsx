import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/apiClient';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  Check, 
  X, 
  Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';

const ClientRequisitionDetails = () => {
  const { id } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decisionModal, setDecisionModal] = useState({ open: false, candidate: null, decision: '' });
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reqRes, candRes] = await Promise.all([
          api.get(`/client-portal/requisitions/${id}`),
          api.get(`/client-portal/requisitions/${id}/candidates`)
        ]);
        setRequisition(reqRes.data);
        setCandidates(candRes.data || []);
      } catch (err) {
        console.error('Failed to load requisition details:', err);
        toast.error('Failed to load requisition data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDecisionSubmit = async () => {
    if (!decisionModal.candidate || !decisionModal.decision) return;

    try {
      setSubmitting(true);
      await api.patch(`/client-portal/candidates/${decisionModal.candidate._id}/client-decision`, {
        decision: decisionModal.decision,
        notes: decisionNotes
      });

      toast.success(`Candidate marked as ${decisionModal.decision}`);

      // Update state locally
      setCandidates(prev => prev.map(c => 
        c._id === decisionModal.candidate._id 
          ? { ...c, phase2Decision: decisionModal.decision }
          : c
      ));

      setDecisionModal({ open: false, candidate: null, decision: '' });
      setDecisionNotes('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600">Requisition not found.</p>
        <Link to="/client-portal/requisitions" className="text-sm text-indigo-600 mt-2 inline-block font-semibold">
          Return to Requisitions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Back button */}
      <div>
        <Link
          to="/client-portal/requisitions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Requisitions
        </Link>
      </div>

      {/* Requisition Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {requisition.roleDetails?.title || 'Untitled Role'}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {requisition.requestId}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                {requisition.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requisition.roleDetails?.department} • {requisition.roleDetails?.employmentType} • Open Positions: {requisition.hiringDetails?.openPositions ?? 1}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
              Total Visible Candidates: <strong className="text-slate-900 font-bold">{candidates.length}</strong>
            </span>
          </div>
        </div>

        {/* Requirements Summary */}
        {requisition.requirements?.mustHaveSkills?.technical?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">Required Skills:</span>
            {requisition.requirements.mustHaveSkills.technical.map((skill, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Pipeline Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">Presented Candidates</h2>
          <span className="text-xs text-slate-400">Gated by recruitment pipeline visibility</span>
        </div>

        {candidates.length === 0 ? (
          <div className="p-12 text-center">
            <User className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No candidates currently presented</p>
            <p className="text-xs text-slate-400 mt-1">
              Candidates will appear here as the recruitment team moves them through the pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Contact (Masked)</th>
                  <th className="px-6 py-3">Experience</th>
                  <th className="px-6 py-3">Notice</th>
                  <th className="px-6 py-3">Client Decision</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {candidates.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/client-portal/candidates/${c._id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-600"
                      >
                        {c.candidateName}
                      </Link>
                      {c.source && (
                        <div className="text-[11px] text-slate-400">{c.source}</div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      <div>{c.email || '—'}</div>
                      <div className="text-[11px] text-slate-400">{c.mobile || '—'}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {c.totalExperience ? `${c.totalExperience} yrs` : '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {c.noticePeriod || '—'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.phase2Decision && c.phase2Decision !== 'None' ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.phase2Decision === 'Shortlisted' || c.phase2Decision === 'Selected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          c.phase2Decision === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {c.phase2Decision}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pending Review</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <Link
                        to={`/client-portal/candidates/${c._id}`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        <FileText className="h-4 w-4" />
                        Profile
                      </Link>

                      {/* Quick decision triggers */}
                      <button
                        onClick={() => setDecisionModal({ open: true, candidate: c, decision: 'Shortlisted' })}
                        title="Shortlist"
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDecisionModal({ open: true, candidate: c, decision: 'Rejected' })}
                        title="Reject"
                        className="p-1 rounded-md text-rose-600 hover:bg-rose-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDecisionModal({ open: true, candidate: c, decision: 'On Hold' })}
                        title="Put On Hold"
                        className="p-1 rounded-md text-amber-600 hover:bg-amber-50"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {decisionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Submit Decision: {decisionModal.decision}
            </h3>
            <p className="text-xs text-slate-500">
              Candidate: <strong className="text-slate-800">{decisionModal.candidate?.candidateName}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Client Notes / Feedback (Optional)
              </label>
              <textarea
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Add any feedback for the agency team..."
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal({ open: false, candidate: null, decision: '' })}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDecisionSubmit}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientRequisitionDetails;
