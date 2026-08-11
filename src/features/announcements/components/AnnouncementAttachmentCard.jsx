import React from 'react';
import {
  Download,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileText,
  Paperclip,
} from 'lucide-react';
import {
  formatFileSize,
  getAnnouncementAttachmentDownloadUrl,
  getAnnouncementAttachmentKind,
  getAnnouncementAttachmentTypeLabel,
} from './announcementUtils';

const renderAttachmentIcon = (attachment) => {
  const kind = getAnnouncementAttachmentKind(attachment);

  if (kind === 'image') return <FileImage size={18} />;
  if (kind === 'sheet') return <FileSpreadsheet size={18} />;
  if (kind === 'pdf' || kind === 'word') return <FileText size={18} />;
  return <Paperclip size={18} />;
};

const AnnouncementAttachmentCard = ({ attachment, className = '' }) => {
  if (!attachment?.url && !attachment?.name) return null;

  const typeLabel = getAnnouncementAttachmentTypeLabel(attachment);
  const downloadUrl = getAnnouncementAttachmentDownloadUrl(attachment.url || '');
  const sizeLabel = attachment?.size ? formatFileSize(attachment.size) : '';

  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50/90 p-4 ${className}`.trim()}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-inset ring-slate-200">
            {renderAttachmentIcon(attachment)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800" title={attachment?.name || 'Attachment'}>
              {attachment?.name || 'Attachment'}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{typeLabel}</span>
              {sizeLabel ? <span>{sizeLabel}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {attachment?.url ? (
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ExternalLink size={15} />
              Open
            </a>
          ) : null}
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={attachment?.name || 'attachment'}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={15} />
              Download
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementAttachmentCard;
