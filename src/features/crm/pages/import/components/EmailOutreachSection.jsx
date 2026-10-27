import React from 'react';
import { Maximize2, Paperclip, Trash2, Send } from 'lucide-react';

export const EmailOutreachSection = ({
  row,
  setIsFullComposerOpen,
  senders,
  selectedSenderId,
  setSelectedSenderId,
  templates,
  selectedTemplateId,
  handleTemplateChange,
  emailSubject,
  setEmailSubject,
  insertPlaceholder,
  emailNotes,
  setEmailNotes,
  emailFileInputRef,
  emailAttachments,
  setEmailAttachments,
  handleEmailFileSelect,
  sendViaPlatform,
  setSendViaPlatform,
}) => {
  return (
    <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Sales Email Composer</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
            To: {row.emailId || row.email || 'No email available'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsFullComposerOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
        >
          <span>Full Composer & Live Preview</span>
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>

      {/* Sender Account and Template Selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Sender Account</label>
          <select
            value={selectedSenderId}
            onChange={(e) => setSelectedSenderId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            {senders.map((s) => (
              <option key={s._id} value={s._id}>
                {s.label || s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Email Template</label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Choose Sales Template --</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Email Subject Line</label>
        <input
          type="text"
          required
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-semibold text-slate-700">Email Message Body</label>
          <div className="flex items-center gap-1">
            {['companyName', 'contactPerson', 'senderCompany'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => insertPlaceholder(p)}
                className="rounded text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 px-1.5 py-0.5 cursor-pointer"
              >
                +{p}
              </button>
            ))}
          </div>
        </div>
        <textarea
          rows={4}
          required
          value={emailNotes}
          onChange={(e) => setEmailNotes(e.target.value)}
          placeholder="Compose outreach email message..."
          className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans leading-relaxed"
        />

        {/* Attachment controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => emailFileInputRef.current?.click()}
            disabled={emailAttachments.length >= 5}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer disabled:opacity-50 transition"
          >
            <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
            <span>Attach File (Photos, PDF, Docs, PPT, ZIP - Max 5MB)</span>
          </button>
          {emailAttachments.length > 0 && (
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              {emailAttachments.length} file{emailAttachments.length > 1 ? 's' : ''} attached
            </span>
          )}
        </div>

        <input
          ref={emailFileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.zip,.rar,.7z"
          onChange={handleEmailFileSelect}
          className="hidden"
        />

        {emailAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {emailAttachments.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700">
                <Paperclip className="w-3 h-3 text-slate-500" />
                <span className="truncate max-w-[140px] font-medium">{f.name}</span>
                <span className="text-[10px] text-slate-400">({(f.size / (1024 * 1024)).toFixed(1)}MB)</span>
                <button
                  type="button"
                  onClick={() => setEmailAttachments(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={sendViaPlatform}
          onChange={(e) => setSendViaPlatform(e.target.checked)}
          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
        />
        <span className="font-semibold text-slate-800 flex items-center gap-1">
          <Send className="w-3 h-3 text-indigo-600" />
          Send real email immediately via selected sender account
        </span>
      </label>
    </div>
  );
};
