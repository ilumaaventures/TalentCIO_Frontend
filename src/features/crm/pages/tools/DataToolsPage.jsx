import React, { useState } from 'react';
import { FileSpreadsheet, Upload, Download, CopyCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { dataService } from '../../services/api';
import { exportDataToCsv } from '../../utils/export';

export const DataToolsPage = () => {
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
      <div>
        <h1 className="text-xl font-bold text-slate-900">Data Management Tools</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Bulk data import wizard, export generator, and duplicate record merge tool.
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'import', label: 'CSV / Excel Import Wizard' },
          { id: 'export', label: 'Bulk Export' },
          { id: 'merge', label: 'Duplicate Resolver & Merge' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
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
              {importStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{importStatus.message}</span>
            </div>
          )}

          <Button icon={Upload} onClick={handleImport}>
            Run Import Wizard
          </Button>
        </Card>
      )}

      {/* Tab 2: Export */}
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

      {/* Tab 3: Duplicate Merge Tool */}
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
