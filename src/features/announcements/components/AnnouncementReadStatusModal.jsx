import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, CheckCircle2, Clock, Users, ArrowUpRight, Loader } from 'lucide-react';
import api from '../../api/axios';
import AnnouncementAvatar from './AnnouncementAvatar';
import { formatAnnouncementDateTime } from './announcementUtils';

const AnnouncementReadStatusModal = ({ announcementId, onClose }) => {
  const [data, setData] = useState({ read: [], unread: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('read'); // 'read' or 'unread'
  const modalRef = useRef(null);

  useEffect(() => {
    const fetchAcknowledgements = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/announcements/${announcementId}/acknowledgements`);
        setData(response.data || { read: [], unread: [] });
      } catch (err) {
        console.error('Failed to fetch acknowledgement report:', err);
        setError(err.response?.data?.message || 'Failed to retrieve read status report.');
      } finally {
        setLoading(false);
      }
    };

    if (announcementId) {
      fetchAcknowledgements();
    }
  }, [announcementId]);

  // Handle click outside to close
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const stats = useMemo(() => {
    const readCount = data.read?.length || 0;
    const unreadCount = data.unread?.length || 0;
    const total = readCount + unreadCount;
    const percentage = total > 0 ? Math.round((readCount / total) * 100) : 0;
    return {
      readCount,
      unreadCount,
      total,
      percentage
    };
  }, [data]);

  const filteredItems = useMemo(() => {
    const list = activeTab === 'read' ? data.read : data.unread;
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter((item) => {
      const u = item.user;
      if (!u) return false;
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      const type = (u.employmentType || '').toLowerCase();
      return (
        fullName.includes(query) ||
        email.includes(query) ||
        dept.includes(query) ||
        type.includes(query)
      );
    });
  }, [data, activeTab, searchQuery]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Read Status Report</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Audit compliance and acknowledgment tracking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="animate-spin text-blue-600 mb-3" size={28} />
              <span className="text-xs font-medium text-slate-500">Generating report...</span>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center sm:px-8">
              <p className="text-xs font-medium text-red-600 bg-red-50 rounded-2xl py-3 px-4 inline-block">{error}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 p-6 sm:p-8 space-y-4">
              {/* Stats Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm">
                <div className="space-y-1 sm:border-r border-slate-100 sm:pr-4">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Targeted</div>
                  <div className="text-xl font-extrabold text-slate-800 flex items-baseline gap-1.5">
                    {stats.total}
                    <span className="text-[11px] font-normal text-slate-500">employees</span>
                  </div>
                </div>
                <div className="space-y-1 sm:border-r border-slate-100 sm:px-4">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acknowledge Status</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} /> {stats.readCount} Read
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <Clock size={13} /> {stats.unreadCount} Unread
                    </span>
                  </div>
                </div>
                <div className="space-y-1 sm:pl-4">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Compliance Rate</div>
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-extrabold text-slate-800">{stats.percentage}%</div>
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls: Tabs & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('read')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'read'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <CheckCircle2 size={14} className={activeTab === 'read' ? 'text-emerald-500' : 'text-slate-400'} />
                    Consented ({stats.readCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('unread')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 'unread'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <Clock size={14} className={activeTab === 'unread' ? 'text-amber-500' : 'text-slate-400'} />
                    Unread ({stats.unreadCount})
                  </button>
                </div>

                <div className="relative flex-1 max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by employee name..."
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Employee List */}
              <div className="flex-1 overflow-y-auto bg-white border border-slate-200/60 rounded-2xl divide-y divide-slate-100 shadow-sm">
                {filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-medium">
                    No employees found matching current filters.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const u = item.user;
                    if (!u) return null;

                    return (
                      <div key={u._id} className="flex items-center justify-between p-3 sm:px-4 hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-3">
                          <AnnouncementAvatar person={u} sizeClassName="h-9 w-9" textClassName="text-[10px]" />
                          <div>
                            <div className="text-xs font-semibold text-slate-800">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span>{u.department || 'No Department'}</span>
                              <span className="text-slate-300">•</span>
                              <span>{u.employmentType || 'Full Time'}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {activeTab === 'read' ? (
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                Consented
                              </span>
                              <div className="text-[9px] text-slate-400 mt-1 font-medium flex items-center gap-1 justify-end">
                                <Clock size={9} />
                                {formatAnnouncementDateTime(item.acknowledgedAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                              Unread
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-white px-6 py-4 flex items-center justify-between sm:px-8">
          <div className="text-[10px] text-slate-400 font-medium">
            Generated at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementReadStatusModal;
