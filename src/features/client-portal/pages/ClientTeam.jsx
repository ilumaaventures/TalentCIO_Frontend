import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import { useClientAuth } from '../context/ClientAuthContext';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader,
  X,
  Copy,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_DESCRIPTIONS = {
  ClientAdmin: 'Full access to manage client team, interview panel, and submit decisions.',
  ClientInterviewer: 'Evaluates candidates in assigned interview rounds and submits feedback.',
  ClientViewer: 'Read-only access to view phase-gated candidates and requisitions.'
};

const ClientTeam = () => {
  const { clientUser } = useClientAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'ClientInterviewer'
  });
  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState(null);

  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/client-portal/team');
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteData.firstName || !inviteData.email) {
      toast.error('First name and email are required');
      return;
    }

    try {
      setInviting(true);
      const res = await api.post('/client-portal/team/invite', inviteData);
      toast.success('Invitation generated');
      
      const token = res.data.inviteToken;
      if (token) {
        const link = `${window.location.origin}/client-portal/accept-invite?token=${token}`;
        setLastInviteLink(link);
      } else {
        setShowInviteModal(false);
      }

      setInviteData({ firstName: '', lastName: '', email: '', phone: '', role: 'ClientInterviewer' });
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.patch(`/client-portal/team/${userId}`, { role: newRole });
      toast.success('Role updated');
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.patch(`/client-portal/team/${userId}`, { status: nextStatus });
      toast.success(`Account ${nextStatus.toLowerCase()}`);
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleRemove = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name || 'this member'}?`)) return;
    try {
      await api.delete(`/client-portal/team/${userId}`);
      toast.success('Member removed');
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Invitation link copied');
  };

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (
      (m.firstName || '').toLowerCase().includes(q) ||
      (m.lastName || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Team & Interviewers</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {members.length} Members
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your internal hiring stakeholders, panel interviewers, and viewer permissions.
          </p>
        </div>

        <button
          onClick={() => { setShowInviteModal(true); setLastInviteLink(null); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Search className="h-4 w-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members by name, email, or role..."
          className="w-full text-sm outline-hidden text-slate-900 placeholder-slate-400"
        />
      </div>

      {/* Team List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">No team members found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {search ? 'No members match your search criteria.' : 'Invite your colleagues to begin evaluating candidates together.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((member) => {
            const isSelf = String(member._id) === String(clientUser?._id);

            return (
              <div
                key={member._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  {/* Top Bar: Role & Status */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                        member.role === 'ClientAdmin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : member.role === 'ClientInterviewer'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {member.role}
                    </span>

                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        member.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : member.status === 'Invited'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>

                  {/* Name & Contact */}
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    {member.firstName} {member.lastName}
                    {isSelf && (
                      <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-md">
                        You
                      </span>
                    )}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500 line-clamp-2">
                    {ROLE_DESCRIPTIONS[member.role] || ''}
                  </p>
                </div>

                {/* Footer Controls */}
                {!isSelf && (
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                      className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="ClientInterviewer">Interviewer</option>
                      <option value="ClientViewer">Viewer</option>
                      <option value="ClientAdmin">Admin</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(member._id, member.status)}
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                          member.status === 'Active'
                            ? 'text-slate-600 hover:bg-slate-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {member.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleRemove(member._id, `${member.firstName} ${member.lastName}`)}
                        title="Remove member"
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Invite Colleague</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {lastInviteLink ? (
              <div className="space-y-4 py-2">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Invitation Created!</span>
                    <p className="mt-0.5 text-emerald-700">
                      Share this setup link directly with your colleague to let them configure their portal account:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={lastInviteLink}
                    className="w-full text-xs font-mono bg-transparent outline-hidden text-slate-700"
                  />
                  <button
                    onClick={() => copyToClipboard(lastInviteLink)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>

                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={inviteData.firstName}
                      onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                      placeholder="Jane"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={inviteData.lastName}
                      onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                      placeholder="Doe"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={inviteData.phone}
                    onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                    placeholder="+1 555-0199"
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Portal Role *</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
                  >
                    <option value="ClientInterviewer">Client Interviewer (Evaluates rounds & submits notes)</option>
                    <option value="ClientViewer">Client Viewer (Read-only candidate pipeline)</option>
                    <option value="ClientAdmin">Client Admin (Manages team, panels & hiring decisions)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {inviting && <Loader className="h-3.5 w-3.5 animate-spin" />}
                    Generate Invite Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientTeam;
