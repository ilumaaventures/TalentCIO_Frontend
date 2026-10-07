import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { followUpsService, tasksService, dataService } from '../../services/api';
import { ImportDataDetailPage } from '../import/ImportDataDetailPage';

export const CalendarPage = ({ onNavigate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCompanyRecord, setSelectedCompanyRecord] = useState(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    type: 'call',
    priority: 'High',
  });

  const extractCompanyFromTitle = (title = '') => {
    if (!title) return '';
    // Format 1: "Follow-up call with bhk in Gurgaon" -> "bhk in Gurgaon"
    // Format 2: "Call for Asian Paints" -> "Asian Paints"
    const match = title.match(/(?:with|for)\s+([^•\-–|,]+)/i);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length > 1 && !/^(call|meeting|whatsapp|email|task|client|prospect|lead)$/i.test(candidate)) {
        return candidate;
      }
    }
    return '';
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const [fRes, tRes] = await Promise.all([
        followUpsService.getFollowUps({ view: 'all' }),
        tasksService.getTasks({}),
      ]);

      const all = [
        ...(fRes.data || []).map((f) => {
          const comp =
            f.importDataId?.companyName ||
            f.leadId?.companyName ||
            f.accountId?.name ||
            extractCompanyFromTitle(f.title);
          return {
            id: f._id,
            title: f.title,
            date: new Date(f.scheduledDate),
            type: 'followup',
            channel: f.type || 'call',
            priority: f.priority,
            status: f.status,
            companyName: comp,
            importDataId: f.importDataId?._id || (typeof f.importDataId === 'string' ? f.importDataId : null),
            importRecord: typeof f.importDataId === 'object' && f.importDataId?.companyName ? f.importDataId : null,
            leadId: f.leadId?._id || (typeof f.leadId === 'string' ? f.leadId : null),
            leadRecord: typeof f.leadId === 'object' && f.leadId?.companyName ? f.leadId : null,
            raw: f,
          };
        }),
        ...(tRes.data || []).map((t) => {
          const comp = extractCompanyFromTitle(t.title);
          return {
            id: t._id,
            title: t.title,
            date: new Date(t.dueDate),
            type: 'task',
            channel: 'task',
            priority: t.priority,
            status: t.status,
            companyName: comp,
            importDataId: t.relatedEntityId || null,
            importRecord: null,
            leadId: null,
            raw: t,
          };
        }),
      ];

      setEvents(all.sort((a, b) => a.date - b.date));
    } catch (err) {
      console.error('Error fetching calendar events', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCompanyProfile = async (evt) => {
    if (!evt) return;
    setIsLoadingCompany(true);
    try {
      // 1. If event already carries the populated importRecord
      if (evt.importRecord && evt.importRecord.companyName) {
        setSelectedCompanyRecord(evt.importRecord);
        return;
      }

      // 2. Fetch by importDataId if available
      if (evt.importDataId) {
        try {
          const res = await dataService.getImportDataById(evt.importDataId);
          if (res?.data) {
            setSelectedCompanyRecord(res.data);
            return;
          }
        } catch (e) {
          console.warn('Could not fetch importData by id', e);
        }
      }

      // 3. Search import data by company name
      const searchTarget = evt.companyName || extractCompanyFromTitle(evt.title);
      if (searchTarget) {
        try {
          const res = await dataService.getImportData({ search: searchTarget });
          const rows = res?.data || [];
          const found =
            rows.find(
              (r) =>
                r.companyName?.toLowerCase().trim() === searchTarget.toLowerCase().trim() ||
                r.contactPerson?.toLowerCase().trim() === searchTarget.toLowerCase().trim()
            ) || rows[0];

          if (found) {
            setSelectedCompanyRecord(found);
            return;
          }
        } catch (e) {
          console.warn('Could not search import data by target name', e);
        }
      }

      // 4. If leadId is attached and onNavigate exists, navigate to lead
      if (evt.leadId && onNavigate) {
        onNavigate('leads', evt.leadId);
        return;
      }

      // 5. Fallback: synthesize a company record so the profile page still opens cleanly
      if (searchTarget) {
        setSelectedCompanyRecord({
          _id: evt.id,
          id: evt.id,
          companyName: searchTarget,
          contactPerson: searchTarget,
          mobileNo: evt.raw?.phone || '',
          emailId: evt.raw?.email || '',
          industry: 'General',
          status: 'Follow-up Scheduled',
          remarks: `Follow-up event: ${evt.title}`,
        });
        return;
      }

      toast.error('No company record found for this calendar item');
    } catch (err) {
      console.error('Error opening company profile', err);
      toast.error('Could not open company profile');
    } finally {
      setIsLoadingCompany(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const scheduledDateTime = new Date(`${createForm.date}T${createForm.time}`);
      await followUpsService.createFollowUp({
        title: createForm.title,
        scheduledDate: scheduledDateTime,
        type: createForm.type,
        priority: createForm.priority,
      });
      setIsCreateOpen(false);
      setCreateForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '14:00',
        type: 'call',
        priority: 'High',
      });
      fetchEvents();
    } catch (err) {
      alert(err.message);
    }
  };

  // Build calendar day cells
  const calendarCells = [];

  // Prev month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    calendarCells.push({ dayNumber: d, isCurrentMonth: false, date: new Date(year, month - 1, d) });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({ dayNumber: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }

  // Next month padding days to complete grid
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ dayNumber: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
  }

  // Filter events for selected day or upcoming
  const displayedEvents = selectedDay
    ? events.filter(
        (e) =>
          e.date.getFullYear() === selectedDay.getFullYear() &&
          e.date.getMonth() === selectedDay.getMonth() &&
          e.date.getDate() === selectedDay.getDate()
      )
    : events;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (selectedCompanyRecord) {
    return (
      <ImportDataDetailPage
        record={selectedCompanyRecord}
        onBack={() => setSelectedCompanyRecord(null)}
        onNavigate={onNavigate}
        onConvert={() => {
          if (onNavigate) onNavigate('leads');
        }}
        onEdit={() => {}}
        onDelete={() => setSelectedCompanyRecord(null)}
        onUpdateRecord={(updated) => setSelectedCompanyRecord(updated)}
      />
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay when resolving company profile */}
      {isLoadingCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-2xs flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-200">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <span className="text-xs font-bold text-slate-700">Opening company profile...</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Calendar & Agenda</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time schedule of client calls, demos, follow-up deadlines, and meetings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={prevMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-3 min-w-[130px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button size="sm" icon={Plus} onClick={() => setIsCreateOpen(true)}>
            Schedule Event
          </Button>
        </div>
      </div>

      {/* Main Grid: Calendar on Left, Agenda on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View (2 Cols) */}
        <div className="lg:col-span-2">
          <Card padding="md" className="shadow-2xs">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-100 pb-2 mb-2 text-center text-xs font-bold text-slate-500">
              {daysOfWeek.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const dayEvents = events.filter(
                  (e) =>
                    e.date.getFullYear() === cell.date.getFullYear() &&
                    e.date.getMonth() === cell.date.getMonth() &&
                    e.date.getDate() === cell.date.getDate()
                );

                const isToday =
                  new Date().toDateString() === cell.date.toDateString();
                const isSelected =
                  selectedDay && selectedDay.toDateString() === cell.date.toDateString();

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDay(null);
                      } else {
                        setSelectedDay(cell.date);
                      }
                    }}
                    className={`min-h-[88px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                        : isToday
                        ? 'border-indigo-200 bg-indigo-50/20'
                        : cell.isCurrentMonth
                        ? 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        : 'border-slate-50 bg-slate-50/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Mini Event Dots / Badges */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCompanyProfile(evt);
                          }}
                          title={evt.companyName ? `Open company profile: ${evt.companyName}` : evt.title}
                          className={`text-[10px] font-semibold px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition ${
                            evt.type === 'followup'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {evt.companyName ? `🏢 ${evt.companyName}` : evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-medium pl-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Agenda Sidebar (1 Col) */}
        <div className="space-y-4">
          <Card padding="md" className="shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedDay
                    ? `Agenda: ${selectedDay.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                    : 'Upcoming Agenda'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {displayedEvents.length} scheduled item{displayedEvents.length === 1 ? '' : 's'}
                </p>
              </div>
              {selectedDay && (
                <Button size="xs" variant="ghost" onClick={() => setSelectedDay(null)}>
                  View All
                </Button>
              )}
            </div>

            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto pr-1">
              {displayedEvents.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  No scheduled items for this date.
                </div>
              ) : (
                displayedEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="py-3 flex items-start gap-3 hover:bg-slate-50/70 p-2 rounded-xl transition"
                  >
                    <div className="w-11 text-center bg-slate-50 border border-slate-200/60 rounded-lg p-1 shrink-0">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase block">
                        {evt.date.toLocaleDateString([], { month: 'short' })}
                      </span>
                      <span className="text-sm font-black text-slate-900 block leading-tight">
                        {evt.date.getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          onClick={() => handleOpenCompanyProfile(evt)}
                          className="text-xs font-bold text-slate-800 truncate hover:text-indigo-600 cursor-pointer"
                          title="Click to view company profile"
                        >
                          {evt.title}
                        </h4>
                        <Badge
                          variant={evt.type === 'followup' ? 'indigo' : 'amber'}
                          size="xs"
                        >
                          {evt.channel}
                        </Badge>
                      </div>

                      {/* Clickable Company Badge / Link */}
                      {evt.companyName && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCompanyProfile(evt);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 text-indigo-700 hover:text-indigo-900 text-xs font-bold transition cursor-pointer group"
                            title={`Open ${evt.companyName} company profile`}
                          >
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                            <span className="truncate max-w-[190px]">{evt.companyName}</span>
                            <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {evt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            evt.priority === 'High' ? 'text-rose-600' : 'text-slate-600'
                          }`}
                        >
                          {evt.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule Event Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Calendar Event"
        subtitle="Book a demo, follow-up call, or client meeting"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>Save Event</Button>
          </>
        }
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <Input
            label="Event Subject / Description"
            placeholder="e.g. Solution Architecture Review Call"
            required
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              required
              value={createForm.date}
              onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
            />
            <Input
              label="Time"
              type="time"
              required
              value={createForm.time}
              onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type / Medium"
              value={createForm.type}
              onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
              options={[
                { value: 'call', label: 'Phone Call' },
                { value: 'meeting', label: 'Video Demo / Meeting' },
                { value: 'whatsapp', label: 'WhatsApp Follow-up' },
                { value: 'email', label: 'Email Follow-up' },
              ]}
            />
            <Select
              label="Priority"
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              options={[
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Low', label: 'Low' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
