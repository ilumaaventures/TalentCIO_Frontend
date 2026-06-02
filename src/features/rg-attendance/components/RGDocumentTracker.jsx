import React, { useState } from 'react';
import { format } from 'date-fns';
import { ExternalLink, Loader2, RefreshCw, Users, X } from 'lucide-react';
import { useRGDocumentSummary } from '../hooks/useRGDocumentSummary';
import api from '../../../api/axios';

const formatTimestamp = (value) => {
  if (!value) return '-';

  try {
    return format(new Date(value), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '-';
  }
};

const buildEmployeeName = (record) => [record.firstName, record.lastName].filter(Boolean).join(' ').trim() || 'Unnamed User';
const buildSearchableText = (record) => [
  buildEmployeeName(record),
  record.employeeCode
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const RGDocumentTracker = ({ monthValue, onMonthChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeFiles, setEmployeeFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState('');
  const { records, missingRecords, loading, error, refresh } = useRGDocumentSummary({
    month: monthValue,
    enabled: Boolean(monthValue)
  });

  const allRecords = [...records, ...missingRecords]
    .map((record) => ({
      ...record,
      hasDocuments: Number(record.fileCount || 0) > 0,
      documentStatus: Number(record.fileCount || 0) > 0 ? 'Attached' : 'Pending'
    }))
    .sort((left, right) => {
      const leftName = buildEmployeeName(left).toLowerCase();
      const rightName = buildEmployeeName(right).toLowerCase();
      return leftName.localeCompare(rightName);
    });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRecords = allRecords.filter((record) => {
    if (!normalizedSearch) return true;

    return buildSearchableText(record).includes(normalizedSearch);
  });

  const handleViewFiles = async (record) => {
    setSelectedEmployee(record);
    setLoadingFiles(true);
    setFilesError('');
    setEmployeeFiles([]);

    try {
      const response = await api.get(`/attendance/attachments/${record.userId}/${monthValue}`);
      setEmployeeFiles(Array.isArray(response.data?.files) ? response.data.files : []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Failed to load uploaded files.';
      setFilesError(message);
    } finally {
      setLoadingFiles(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">RG Submitted Documents</h3>
          <p className="mt-1 text-sm text-slate-500">
            Track document status for each employee in the selected month.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Month</span>
            <input
              type="month"
              value={monthValue}
              onChange={(event) => onMonthChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search employee or code"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </label>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Users size={16} />
          <span>{filteredRecords.filter((record) => record.hasDocuments).length} employee(s) attached attendance documents for {monthValue || 'the selected month'}.</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <Users size={16} />
          <span>{filteredRecords.filter((record) => !record.hasDocuments).length} employee(s) are pending attendance documents for {monthValue || 'the selected month'}.</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr className="text-[9px] uppercase tracking-wide">
              <th className="px-3 py-3">User Name</th>
              <th className="px-3 py-3">Employee Code</th>
              <th className="px-3 py-3">Document Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-xs text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Loading document summary...
                  </span>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-xs text-slate-500">
                  {normalizedSearch
                    ? 'No users match the current search.'
                    : 'No users were found for this month.'}
                </td>
              </tr>
            ) : filteredRecords.map((record) => (
              <tr key={record.userId} className="align-top">
                <td className="px-3 py-3">
                  <div className="font-semibold leading-5 text-slate-800">{buildEmployeeName(record)}</div>
                </td>
                <td className="px-3 py-3 text-slate-600">{record.employeeCode || '-'}</td>
                <td className="px-3 py-3">
                  {record.hasDocuments ? (
                    <button
                      type="button"
                      onClick={() => handleViewFiles(record)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    >
                      <ExternalLink size={12} />
                      Attached
                    </button>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEmployee ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6"
          onClick={() => {
            setSelectedEmployee(null);
            setEmployeeFiles([]);
            setFilesError('');
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-800">
                  Files for {buildEmployeeName(selectedEmployee)}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {monthValue} attendance documents
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee(null);
                  setEmployeeFiles([]);
                  setFilesError('');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <X size={15} />
                Close
              </button>
            </div>

            {loadingFiles ? (
              <div className="px-2 py-8 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Loading uploaded files...
                </span>
              </div>
            ) : filesError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {filesError}
              </div>
            ) : employeeFiles.length === 0 ? (
              <div className="px-2 py-8 text-sm text-slate-500">
                No files were uploaded for this employee in the selected month.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {employeeFiles.map((file) => (
                  <div
                    key={file._id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">{file.name || 'Document'}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Status: {file.status || 'Pending'}</span>
                        <span>Uploaded: {formatTimestamp(file.uploadedAt)}</span>
                      </div>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <ExternalLink size={15} />
                      Open File
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RGDocumentTracker;
