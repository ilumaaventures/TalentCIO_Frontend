import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  Clock,
  Send,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { dataService } from '../../services/api';

export const LogOutreachModal = ({
  isOpen,
  onClose,
  row,
  initialType = 'call',
  onSuccess,
}) => {
  const [activeType, setActiveType] = useState(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Call form state
  const [callType, setCallType] = useState('Cold Call');
  const [customCallType, setCustomCallType] = useState('');
  const [callOutcome, setCallOutcome] = useState('Connected - Interested');
  const [durationMinutes, setDurationMinutes] = useState('2');
  const [callNotes, setCallNotes] = useState('');

  // WhatsApp form state
  const [whatsappOutcome, setWhatsappOutcome] = useState('Sent');
  const [whatsappNotes, setWhatsappNotes] = useState('');

  // Email form state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailNotes, setEmailNotes] = useState('');

  // Follow-up scheduling
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('call');
  const [followUpPriority, setFollowUpPriority] = useState('Medium');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    if (initialType) setActiveType(initialType);
    if (row) {
      setEmailSubject(`TalentCIO Solution Overview for ${row.companyName || 'your team'}`);
      // Default follow-up date to tomorrow 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setFollowUpDate(tomorrow.toISOString().slice(0, 16));
    }
  }, [initialType, row, isOpen]);

  if (!isOpen || !row) return null;

  const cleanPhone = (row.mobileNo || '').replace(/\D/g, '').slice(-10);

  const handleLaunchWhatsApp = () => {
    if (!cleanPhone) {
      toast.error('No valid phone number for this prospect');
      return;
    }
    const text = encodeURIComponent(
      `Hello ${row.contactPerson || 'Sir/Madam'}, this is regarding TalentCIO's HRMS and Workforce Solutions for ${row.companyName || 'your organization'}.`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
  };

  const handleLaunchCall = () => {
    if (!cleanPhone) {
      toast.error('No valid phone number for this prospect');
      return;
    }
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleAddToGoogleCalendar = () => {
    if (!followUpDate) {
      toast.error('Please pick a date and time first');
      return;
    }
    try {
      const start = new Date(followUpDate);
      const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration
      const pad = (n) => String(n).padStart(2, '0');
      const formatGCal = (d) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
      const title = encodeURIComponent(
        `CRM ${followUpType.toUpperCase()}: ${row.companyName || 'Prospect'} (${row.contactPerson || 'Contact'})`
      );
      const details = encodeURIComponent(
        `Company: ${row.companyName || 'N/A'}\nContact: ${row.contactPerson || 'N/A'}\nPhone: ${row.mobileNo || row.phone || 'N/A'}\nType: ${followUpType}\nNotes: ${followUpNotes || callNotes || ''}`
      );
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGCal(start)}/${formatGCal(end)}&details=${details}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      toast.error('Unable to generate Google Calendar link');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const recordId = row._id || row.id;

      if (activeType === 'call') {
        const resolvedCallType =
          callType === 'Other' ? (customCallType.trim() || 'Other') : callType;
        const payload = {
          type: 'call',
          callType: resolvedCallType,
          outcome: callOutcome,
          durationMinutes: Number(durationMinutes) || 0,
          subject: `${resolvedCallType} with ${row.contactPerson || row.companyName || 'Prospect'}`,
          description: callNotes,
        };
        const res = await dataService.logActivity(recordId, payload);
        if (res?.record && onSuccess) onSuccess(res.record);
      } else if (activeType === 'whatsapp') {
        const payload = {
          type: 'whatsapp',
          outcome: whatsappOutcome,
          subject: `WhatsApp outreach to ${row.contactPerson || row.companyName}`,
          description: whatsappNotes,
        };
        const res = await dataService.logActivity(recordId, payload);
        if (res?.record && onSuccess) onSuccess(res.record);
      } else if (activeType === 'email') {
        const payload = {
          type: 'email',
          outcome: 'Sent',
          subject: emailSubject || `Email to ${row.contactPerson || row.companyName}`,
          description: emailNotes,
        };
        const res = await dataService.logActivity(recordId, payload);
        if (res?.record && onSuccess) onSuccess(res.record);
      }

      // Schedule follow-up if toggled or if in follow-up tab
      if (scheduleFollowUp || activeType === 'followup') {
        if (followUpDate) {
          await dataService.scheduleFollowUp(recordId, {
            title: `Follow-up ${followUpType} with ${row.contactPerson || row.companyName}`,
            scheduledDate: new Date(followUpDate),
            type: followUpType,
            priority: followUpPriority,
            notes: followUpNotes || (activeType === 'call' ? callNotes : ''),
          });
        }
      }

      toast.success(`${activeType.toUpperCase()} interaction logged successfully!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to log interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Sales Outreach & Activity"
      subtitle={`Prospect: ${row.companyName || 'Company'} • ${row.contactPerson || 'Contact'} (${row.mobileNo || 'No phone'})`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 pt-1">
        {/* Contact Info Header Pill */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <p className="font-bold text-slate-800">{row.companyName || '—'}</p>
              <p className="text-[11px] text-slate-500">
                {row.contactPerson ? `${row.contactPerson} (${row.designation || 'Contact'})` : 'No contact specified'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {row.mobileNo && (
              <button
                type="button"
                onClick={handleLaunchCall}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold shadow-2xs transition"
                title="Dial phone"
              >
                <Phone className="w-3 h-3 text-indigo-600" />
                <span>{row.mobileNo}</span>
              </button>
            )}

            {cleanPhone && (
              <button
                type="button"
                onClick={handleLaunchWhatsApp}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold shadow-2xs transition"
                title="Chat on WhatsApp"
              >
                <MessageSquare className="w-3 h-3 text-emerald-600" />
                <span>WhatsApp</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </button>
            )}
          </div>
        </div>

        {/* Outreach Channel Tabs */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveType('call')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
              activeType === 'call'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('whatsapp')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
              activeType === 'whatsapp'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('email')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
              activeType === 'email'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('followup')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
              activeType === 'followup'
                ? 'bg-white text-amber-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Follow-up</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Form: CALL */}
          {activeType === 'call' && (
            <div className="space-y-3.5 bg-white p-3.5 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Call Type</label>
                  <select
                    value={callType}
                    onChange={(e) => setCallType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Cold Call">Cold Call</option>
                    <option value="Discovery / Pitch">Discovery / Pitch</option>
                    <option value="Follow-up Call">Follow-up Call</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Commercial Negotiation">Commercial Negotiation</option>
                    <option value="Closing Call">Closing Call</option>
                    <option value="Account Check-in">Account Check-in</option>
                    <option value="Gatekeeper Inquiry">Gatekeeper Inquiry</option>
                    <option value="Payment Follow-up">Payment Follow-up</option>
                    <option value="Other">Other (Custom Type)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 3"
                  />
                </div>
              </div>

              {/* If "Other" selected, show custom text input */}
              {callType === 'Other' && (
                <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-200/80 animate-in fade-in duration-150">
                  <label className="block font-semibold text-indigo-950 mb-1 text-xs">
                    Specify Custom Call Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={customCallType}
                    onChange={(e) => setCustomCallType(e.target.value)}
                    placeholder="e.g. Requirement Gathering, Client Introduction, Partner Discussion..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-white text-slate-900 font-medium text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Call Outcome</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Connected - Interested', variant: 'emerald' },
                    { label: 'Callback Requested', variant: 'amber' },
                    { label: 'No Answer / Ringing', variant: 'slate' },
                    { label: 'Busy', variant: 'slate' },
                    { label: 'Connected - Not Interested', variant: 'rose' },
                    { label: 'Wrong Number', variant: 'rose' },
                    { label: 'Other', variant: 'slate' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setCallOutcome(item.label)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left font-medium transition flex items-center justify-between ${
                        callOutcome === item.label
                          ? item.variant === 'emerald'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold ring-1 ring-emerald-400'
                            : item.variant === 'amber'
                            ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold ring-1 ring-amber-400'
                            : item.variant === 'rose'
                            ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold ring-1 ring-rose-400'
                            : 'bg-slate-100 border-slate-400 text-slate-900 font-bold ring-1 ring-slate-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {callOutcome === item.label && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1 text-current" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Call Notes & Remarks</label>
                <textarea
                  rows={2}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Summarize key talking points, prospect objections, or next steps..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Checkbox: Schedule Follow-up */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs">
                <input
                  type="checkbox"
                  checked={scheduleFollowUp}
                  onChange={(e) => setScheduleFollowUp(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Schedule a follow-up for this call
                </span>
              </label>
            </div>
          )}

          {/* Channel Form: WHATSAPP */}
          {activeType === 'whatsapp' && (
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Quick WhatsApp Message</span>
                {cleanPhone && (
                  <button
                    type="button"
                    onClick={handleLaunchWhatsApp}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <span>Launch WhatsApp Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">WhatsApp Status</label>
                <select
                  value={whatsappOutcome}
                  onChange={(e) => setWhatsappOutcome(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Sent">Message Sent</option>
                  <option value="Replied">Client Replied</option>
                  <option value="Shared Proposal">Shared Company Profile / Brochure</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Message Summary</label>
                <textarea
                  rows={3}
                  value={whatsappNotes}
                  onChange={(e) => setWhatsappNotes(e.target.value)}
                  placeholder="Sent intro deck and asked for callback time..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Channel Form: EMAIL */}
          {activeType === 'email' && (
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Compose & Log Email</span>
                {(row.emailId || row.email) && (
                  <a
                    href={`mailto:${row.emailId || row.email}?subject=${encodeURIComponent(
                      emailSubject
                    )}&body=${encodeURIComponent(emailNotes || 'Hi,\n\nPlease find details attached.')}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Launch Email Client</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Summary / Body Notes</label>
                <textarea
                  rows={3}
                  value={emailNotes}
                  onChange={(e) => setEmailNotes(e.target.value)}
                  placeholder="Sent quotation and feature comparison chart..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Channel Form: DEDICATED FOLLOW-UP OR CHECKED FOLLOW-UP */}
          {(scheduleFollowUp || activeType === 'followup') && (
            <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/80 text-xs">
              <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200/60 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Next Scheduled Follow-up / Call</span>
                </div>
                {followUpDate && (
                  <button
                    type="button"
                    onClick={handleAddToGoogleCalendar}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-2xs cursor-pointer transition"
                    title="Add this scheduled call to Google Calendar"
                  >
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    <span>Add to Google Calendar</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required={scheduleFollowUp || activeType === 'followup'}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Follow-up Type</label>
                  <select
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp Check-in</option>
                    <option value="meeting">Online Demo / Meeting</option>
                    <option value="email">Email Proposal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <div className="flex items-center gap-2">
                  {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFollowUpPriority(p)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                        followUpPriority === p
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {activeType === 'followup' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Follow-up Goal / Notes</label>
                  <textarea
                    rows={2}
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Specific agenda for callback..."
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              icon={CheckCircle2}
              isLoading={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              Log & Save Interaction
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
