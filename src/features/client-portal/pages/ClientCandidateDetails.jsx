import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/apiClient';
import { 
  ArrowLeft, 
  Download,
  Calendar,
  Star,
  Clock,
  Video,
  Copy,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const ClientCandidateDetails = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/client-portal/candidates/${id}`);
        setCandidate(res.data);
        if (res.data?.phase2InterviewerFeedback) {
          setDecisionNotes(res.data.phase2InterviewerFeedback);
        }
      } catch (err) {
        console.error('Failed to load candidate details:', err);
        toast.error('Failed to load candidate profile');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id]);

  const handleDecision = async (decision) => {
    try {
      setSubmitting(true);
      await api.patch(`/client-portal/candidates/${id}/client-decision`, {
        decision,
        notes: decisionNotes
      });
      toast.success(`Candidate marked as ${decision}`);
      setCandidate(prev => ({
        ...prev,
        phase2Decision: decision,
        phase2InterviewerFeedback: decisionNotes
      }));
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

  if (!candidate) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600">Candidate not found or access not granted.</p>
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
          to={candidate.hiringRequestId ? `/client-portal/requisitions/${candidate.hiringRequestId}` : '/client-portal/requisitions'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Requisition Pipeline
        </Link>
      </div>

      {/* Candidate Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {candidate.candidateName}
            </h1>
            {candidate.phase2Decision && candidate.phase2Decision !== 'None' ? (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                candidate.phase2Decision === 'Shortlisted' || candidate.phase2Decision === 'Selected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                candidate.phase2Decision === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                {candidate.phase2Decision}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                Pending Client Decision
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Requisition: <span className="font-semibold text-slate-700">{candidate.requisition?.title}</span> ({candidate.requisition?.requestId})
          </p>
        </div>

        {candidate.resumeUrl && (
          <a
            href={candidate.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
          >
            <Download className="h-4 w-4" />
            Download Resume
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Candidate Info & Skills */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Candidate Details</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="block text-xs font-medium text-slate-400">Email (Masked)</span>
                <span className="font-semibold text-slate-800 font-mono text-xs">{candidate.email || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Mobile (Masked)</span>
                <span className="font-semibold text-slate-800 font-mono text-xs">{candidate.mobile || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Total Experience</span>
                <span className="font-semibold text-slate-800">{candidate.totalExperience ? `${candidate.totalExperience} years` : '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Notice Period</span>
                <span className="font-semibold text-slate-800">{candidate.noticePeriod || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Current Location</span>
                <span className="font-semibold text-slate-800">{candidate.location || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-slate-400">Source</span>
                <span className="font-semibold text-slate-800">{candidate.source || 'Agency Sourced'}</span>
              </div>
            </div>

            {/* Skill Ratings */}
            {candidate.skillRatings?.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Skill Ratings</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skillRatings.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-medium text-slate-700">{skill.skill}</span>
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star className="h-3 w-3 fill-amber-400" />
                        {skill.rating}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interview Rounds */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4">Interview History & Rounds</h2>

            {(!candidate.interviewRounds || candidate.interviewRounds.length === 0) ? (
              <p className="text-xs text-slate-400">No interview rounds scheduled yet.</p>
            ) : (
              <div className="space-y-3">
                {candidate.interviewRounds.map((round) => (
                  <div key={round._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {round.levelName}
                        </span>
                        {round.isClientInterview && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold">
                            Client Panel
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        round.status === 'Passed' ? 'bg-emerald-50 text-emerald-700' :
                        round.status === 'Failed' ? 'bg-rose-50 text-rose-700' :
                        round.status === 'Scheduled' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {round.status}
                      </span>
                    </div>

                    {round.scheduledDate && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(round.scheduledDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-indigo-500" />
                          {new Date(round.scheduledDate).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </span>

                        {round.meetingLink && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <a
                              href={round.meetingLink.startsWith('http') ? round.meetingLink : `https://${round.meetingLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold"
                            >
                              <Video className="h-3 w-3" />
                              Join
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(round.meetingLink);
                                toast.success('Meeting link copied');
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              title="Copy meeting link"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {round.clientFeedback && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-xs text-slate-700">
                        <strong>Client Feedback:</strong> {round.clientFeedback}
                        {round.clientRating && (
                          <span className="ml-2 text-amber-600 font-bold">
                            (Rating: {round.clientRating}/10)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Decision Action Bar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Your Decision</h2>
            <p className="text-xs text-slate-500">
              Submit your hiring review on this candidate to inform your recruitment agency.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Evaluation Notes / Comments
              </label>
              <textarea
                rows={4}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Candidate feedback, strengths, interview discussion points..."
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                disabled={submitting}
                onClick={() => handleDecision('Shortlisted')}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
              >
                Shortlist Candidate
              </button>

              <button
                disabled={submitting}
                onClick={() => handleDecision('Selected')}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors disabled:opacity-50"
              >
                Select for Next Step / Offer
              </button>

              <button
                disabled={submitting}
                onClick={() => handleDecision('On Hold')}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
              >
                Put On Hold
              </button>

              <button
                disabled={submitting}
                onClick={() => handleDecision('Rejected')}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
              >
                Reject Candidate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCandidateDetails;
