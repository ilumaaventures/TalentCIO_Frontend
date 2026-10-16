import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CopyCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Trash2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Database,
  User,
  ArrowRight,
  HardDrive,
  FileCheck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { dataService } from '../../services/api';
import { exportDataToCsv } from '../../utils/export';
import toast from 'react-hot-toast';

const LOCAL_STORAGE_EXCEL_KEY = 'crm_stored_excel_files';

export const DataToolsPage = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('import');
  const [importEntity, setImportEntity] = useState('leads');
  const [importStatus, setImportStatus] = useState(null);

  // Sample CSV text for demonstration
  const [csvText, setCsvText] = useState(
    `firstName,lastName,email,phone,companyName,source\nVikram,Malhotra,vikram@malhotra.in,+91 98111 88990,Malhotra Logistics,Website\nSiddharth,Rao,siddharth@raotech.in,+91 98222 99001,Rao Technologies,LinkedIn`
  );

  // Merge state
  const [mergeEntity, setMergeEntity] = useState('lead');
  const [primaryId, setPrimaryId] = useState('');
  const [secondaryId, setSecondaryId] = useState('');
  const [mergeStatus, setMergeStatus] = useState(null);

  // Stored Excel Files state
  const [storedFiles, setStoredFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filePage, setFilePage] = useState(1);
  const [fileLimit, setFileLimit] = useState(10);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalFilePages, setTotalFilePages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  // Cleanup any old local dummy records from localStorage on initial render
  useEffect(() => {
    try {
      const localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXCEL_KEY) || '[]');
      if (Array.isArray(localSaved)) {
        const cleaned = localSaved.filter((lf) => !String(lf._id || '').startsWith('local_'));
        if (cleaned.length !== localSaved.length) {
          localStorage.setItem(LOCAL_STORAGE_EXCEL_KEY, JSON.stringify(cleaned));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch stored Excel files from backend API with automatic deduplication
  const fetchStoredFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      // 1. Fetch from server API
      const res = await dataService.getExcelFiles({
        page: filePage,
        limit: fileLimit,
        search: searchQuery,
      });

      if (res && res.success && Array.isArray(res.data)) {
        // De-duplicate server files by ID and (fileName + creation minute)
        const seen = new Set();
        const uniqueServerFiles = [];
        for (const f of res.data) {
          const id = String(f._id || f.id);
          const timeSlice = f.createdAt ? new Date(f.createdAt).toISOString().slice(0, 16) : '';
          const nameKey = `${(f.fileName || '').trim()}|${timeSlice}`;
          if (!seen.has(id) && (!timeSlice || !seen.has(nameKey))) {
            seen.add(id);
            if (timeSlice) seen.add(nameKey);
            uniqueServerFiles.push(f);
          }
        }

        // Clean up any stale dummy local_ items from localStorage so they never conflict
        try {
          const localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXCEL_KEY) || '[]');
          if (Array.isArray(localSaved) && localSaved.length > 0) {
            const serverNames = new Set(uniqueServerFiles.map((f) => (f.fileName || '').trim()));
            const cleaned = localSaved.filter((lf) => {
              const isLocalPrefix = String(lf._id || '').startsWith('local_');
              return !isLocalPrefix && !serverNames.has((lf.fileName || '').trim());
            });
            localStorage.setItem(LOCAL_STORAGE_EXCEL_KEY, JSON.stringify(cleaned));
          }
        } catch {
          // ignore
        }

        setStoredFiles(uniqueServerFiles);
        setTotalFiles(res.pagination?.total ? Math.min(res.pagination.total, uniqueServerFiles.length + (res.pagination.total - res.data.length)) : uniqueServerFiles.length);
        setTotalFilePages(res.pagination?.totalPages || Math.ceil((res.pagination?.total || uniqueServerFiles.length) / fileLimit) || 1);
      } else {
        // Fallback to localStorage directly if server route has issues
        loadFromLocalStorage();
      }
    } catch (err) {
      console.warn('Could not load Excel files from backend, loading local cache:', err);
      loadFromLocalStorage();
    } finally {
      setLoadingFiles(false);
    }
  }, [filePage, fileLimit, searchQuery]);

  const loadFromLocalStorage = () => {
    try {
      const localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXCEL_KEY) || '[]');
      let filtered = Array.isArray(localSaved) ? localSaved : [];
      if (searchQuery) {
        filtered = filtered.filter(
          (f) =>
            (f.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.importedBy || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setTotalFiles(filtered.length);
      setTotalFilePages(Math.ceil(filtered.length / fileLimit) || 1);
      const startIndex = (filePage - 1) * fileLimit;
      setStoredFiles(filtered.slice(startIndex, startIndex + fileLimit));
    } catch {
      setStoredFiles([]);
      setTotalFiles(0);
      setTotalFilePages(1);
    }
  };

  useEffect(() => {
    fetchStoredFiles();
  }, [fetchStoredFiles]);

  // Download Excel file handler
  const handleDownloadFile = async (file) => {
    if (!file) return;
    setDownloadingId(file._id || file.id);

    try {
      let fileData = file.fileData;

      // If fileData was not in the projected list, fetch the full record
      if (!fileData && (file._id || file.id)) {
        try {
          const detailRes = await dataService.getExcelFileById(file._id || file.id);
          if (detailRes && detailRes.data && detailRes.data.fileData) {
            fileData = detailRes.data.fileData;
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch full file data from server:', fetchErr);
        }
      }

      // Check localStorage for the raw base64 data if not on server
      if (!fileData) {
        try {
          const localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXCEL_KEY) || '[]');
          const match = localSaved.find((lf) => String(lf._id || lf.id) === String(file._id || file.id));
          if (match && match.fileData) {
            fileData = match.fileData;
          }
        } catch {
          // ignore
        }
      }

      if (!fileData) {
        toast.error('The file content is no longer available in cache for this record.');
        return;
      }

      // Trigger browser download via anchor element
      const link = document.createElement('a');
      link.href = fileData;
      link.download = file.fileName || `import_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloaded "${file.fileName}" successfully.`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download Excel file.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Delete stored Excel file record
  const handleDeleteFile = async (file) => {
    const fileId = file._id || file.id;
    if (!window.confirm(`Are you sure you want to delete the file history record for "${file.fileName}"?`)) {
      return;
    }

    try {
      // 1. Remove from backend if ID is MongoDB format
      if (fileId && !String(fileId).startsWith('local_')) {
        await dataService.deleteExcelFile(fileId).catch((err) => {
          console.warn('Backend delete failed, continuing with local cleanup:', err);
        });
      }

      // 2. Remove from localStorage
      try {
        const localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_EXCEL_KEY) || '[]');
        const updated = localSaved.filter((lf) => String(lf._id || lf.id) !== String(fileId));
        localStorage.setItem(LOCAL_STORAGE_EXCEL_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      toast.success('Excel file record deleted.');
      fetchStoredFiles();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete file record.');
    }
  };

  // Format date and timestamp
  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: '—', time: '—' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: String(dateStr), time: '' };

    const dateFormatted = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }); // e.g. "16 Oct 2026"

    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }); // e.g. "12:45:30 PM"

    return { date: dateFormatted, time: timeFormatted };
  };

  const handleImport = async () => {
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }

      const res = await dataService.importData({
        entityType: importEntity,
        rows,
      });

      if (res.success) {
        setImportStatus({
          success: true,
          message: res.message,
        });
      }
    } catch (err) {
      setImportStatus({
        success: false,
        message: err.message,
      });
    }
  };

  const handleMerge = async () => {
    if (!primaryId || !secondaryId) {
      alert('Please enter both Primary and Secondary Record IDs');
      return;
    }

    try {
      const res = await dataService.mergeDuplicates({
        entityType: mergeEntity,
        primaryId,
        secondaryId,
        resolvedFields: { notes: 'Merged duplicate record history preserved.' },
      });

      if (res.success) {
        setMergeStatus({ success: true, message: res.message });
      }
    } catch (err) {
      setMergeStatus({ success: false, message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data Management Tools</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk data import wizard, export generator, duplicate record merge tool, and stored Excel history.
          </p>
        </div>

        {activeTab === 'excel-files' && onNavigate && (
          <Button
            size="sm"
            variant="outline"
            icon={ArrowRight}
            onClick={() => onNavigate('import')}
            className="self-start sm:self-auto"
          >
            Go to Import Data
          </Button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: 'import', label: 'CSV / Excel Import Wizard' },
          { id: 'excel-files', label: 'Stored Excel Files', count: totalFiles > 0 ? totalFiles : undefined },
          { id: 'export', label: 'Bulk Export' },
          { id: 'merge', label: 'Duplicate Resolver & Merge' },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => {
          setActiveTab(tabId);
          if (tabId === 'excel-files') {
            fetchStoredFiles();
          }
        }}
      />

      {/* Tab 1: Import Wizard */}
      {activeTab === 'import' && (
        <Card padding="lg" className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">CSV Data Import Wizard</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select destination entity, verify columns, and import records directly into MongoDB.
            </p>
          </div>

          <div className="w-60">
            <Select
              label="Select Destination Entity"
              value={importEntity}
              onChange={(e) => setImportEntity(e.target.value)}
              options={[
                { value: 'leads', label: 'Leads' },
                { value: 'contacts', label: 'Contacts' },
                { value: 'companies', label: 'Companies' },
                { value: 'deals', label: 'Opportunities' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              CSV Data Rows (Header + Comma Separated Values)
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {importStatus && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                importStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {importStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button icon={Upload} onClick={handleImport}>
              Run Import Wizard
            </Button>
            {onNavigate && (
              <Button
                variant="outline"
                icon={FileSpreadsheet}
                onClick={() => onNavigate('import')}
              >
                Open Full Excel Importer
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Tab 2: Stored Excel Files (New Tab requested by User) */}
      {activeTab === 'excel-files' && (
        <Card padding="lg" className="space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Stored Excel Files</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Excel files automatically stored when confirming imports. Includes date, timestamp, and row analytics.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search files or user..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFilePage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Rows per page */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="text-[11px] text-slate-500">Rows:</span>
                <select
                  value={fileLimit}
                  onChange={(e) => {
                    setFileLimit(Number(e.target.value));
                    setFilePage(1);
                  }}
                  className="py-1 px-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Refresh button */}
              <Button
                size="sm"
                variant="outline"
                icon={RefreshCw}
                onClick={fetchStoredFiles}
                disabled={loadingFiles}
                title="Refresh stored files list"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Date & Timestamp</th>
                  <th className="py-3 px-4 text-center">Rows Fetched</th>
                  <th className="py-3 px-4 text-center">Companies</th>
                  <th className="py-3 px-4">Import Breakdown</th>
                  <th className="py-3 px-4">Imported By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loadingFiles ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-xs font-medium">Loading stored Excel files...</span>
                      </div>
                    </td>
                  </tr>
                ) : storedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                        <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl">
                          <HardDrive className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">No stored Excel files found</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {searchQuery
                              ? 'No records match your search criteria.'
                              : 'When you import an Excel spreadsheet in the Import Wizard and click "Confirm Import", it will be saved and listed here with its timestamp.'}
                          </p>
                        </div>
                        {onNavigate && !searchQuery && (
                          <Button
                            size="sm"
                            variant="primary"
                            icon={Upload}
                            onClick={() => onNavigate('import')}
                          >
                            Import an Excel File Now
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  storedFiles.map((file, idx) => {
                    const rowIdx = (filePage - 1) * fileLimit + idx + 1;
                    const { date, time } = formatDateTime(file.createdAt);
                    const isDownloading = downloadingId === (file._id || file.id);

                    return (
                      <tr key={file._id || file.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        {/* S.No */}
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {rowIdx}
                        </td>

                        {/* File Name & Size */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5 min-w-[200px]">
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="font-semibold text-slate-900 truncate" title={file.fileName}>
                                {file.fileName || 'Unnamed Sheet.xlsx'}
                              </p>
                              <span className="text-[11px] text-slate-400">
                                {file.fileSize || (file.fileSizeBytes ? `${(file.fileSizeBytes / 1024).toFixed(1)} KB` : 'Excel Workbook')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date & Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              {date}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              {time}
                            </span>
                          </div>
                        </td>

                        {/* Rows Fetched */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {file.totalRowsFetched || 0} rows
                          </span>
                        </td>

                        {/* Total Companies */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {file.totalCompanies || file.totalRowsFetched || 0}
                          </span>
                        </td>

                        {/* Breakdown */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(file.newCount > 0 || (!file.newCount && !file.updateCount)) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                +{file.newCount || 0} new
                              </span>
                            )}
                            {file.updateCount > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                ~{file.updateCount} updated
                              </span>
                            )}
                            {file.duplicateCount > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                !{file.duplicateCount} skipped
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Imported By */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[130px]">
                              {file.importedBy || 'Admin'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge variant="success" size="sm" icon={FileCheck}>
                            {file.status || 'Imported'}
                          </Badge>
                        </td>

                        {/* Actions: Download & Delete */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              icon={Download}
                              disabled={isDownloading}
                              onClick={() => handleDownloadFile(file)}
                              title="Download original Excel file"
                              className="text-xs py-1 px-2.5"
                            >
                              {isDownloading ? 'Downloading...' : 'Download'}
                            </Button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file)}
                              title="Delete file history record"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalFiles > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min((filePage - 1) * fileLimit + 1, totalFiles)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(filePage * fileLimit, totalFiles)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalFiles}</span> stored files
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  icon={ChevronLeft}
                  disabled={filePage <= 1 || loadingFiles}
                  onClick={() => setFilePage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1"
                >
                  Prev
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalFilePages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalFilePages > 5) {
                      if (filePage > 3) {
                        pageNum = filePage - 2 + i;
                      }
                      if (pageNum > totalFilePages) {
                        pageNum = totalFilePages - 4 + i;
                      }
                    }
                    if (pageNum < 1 || pageNum > totalFilePages) return null;

                    const isActive = pageNum === filePage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setFilePage(pageNum)}
                        disabled={loadingFiles}
                        className={`w-7 h-7 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={filePage >= totalFilePages || loadingFiles}
                  onClick={() => setFilePage((p) => Math.min(totalFilePages, p + 1))}
                  className="px-2 py-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Export */}
      {activeTab === 'export' && (
        <Card padding="lg" className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Direct Data Export</h3>
          <p className="text-xs text-slate-500">
            Download real-time database records in JSON/CSV export formats.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {['leads', 'deals', 'contacts', 'companies'].map((ent) => (
              <div key={ent} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center space-y-2">
                <p className="text-xs font-bold text-slate-900 capitalize">{ent}</p>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Download}
                  className="w-full"
                  onClick={() => exportDataToCsv(ent)}
                >
                  Export {ent}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Duplicate Merge Tool */}
      {activeTab === 'merge' && (
        <Card padding="lg" className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Duplicate Record Merge Tool</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidate duplicate prospects without losing interaction timeline activities or notes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Entity Type"
              value={mergeEntity}
              onChange={(e) => setMergeEntity(e.target.value)}
              options={[
                { value: 'lead', label: 'Lead' },
                { value: 'contact', label: 'Contact' },
                { value: 'company', label: 'Company' },
              ]}
            />
            <Input
              label="Winning Record ID (Primary)"
              placeholder="e.g. 66a..."
              value={primaryId}
              onChange={(e) => setPrimaryId(e.target.value)}
            />
            <Input
              label="Duplicate Record ID (Will be deleted)"
              placeholder="e.g. 66b..."
              value={secondaryId}
              onChange={(e) => setSecondaryId(e.target.value)}
            />
          </div>

          {mergeStatus && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mergeStatus.message}</span>
            </div>
          )}

          <Button icon={CopyCheck} onClick={handleMerge}>
            Merge Records & Re-link Activities
          </Button>
        </Card>
      )}
    </div>
  );
};
