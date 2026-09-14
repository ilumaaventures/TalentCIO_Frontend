import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Columns,
  List,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  MoreVertical,
  GripVertical,
  Sparkles,
  Check,
  GitFork,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { dealsService, pipelinesService } from '../../services/api';
import { exportDataToCsv } from '../../utils/export';

export const DealsListPage = ({ onOpenDealDetail, onNavigate }) => {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [boardData, setBoardData] = useState(null);
  const [dealsList, setDealsList] = useState([]);
  const [pipelinesList, setPipelinesList] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Drag and Drop state
  const [draggedDeal, setDraggedDeal] = useState(null); // { deal, sourceStage }
  const [dragOverStage, setDragOverStage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [moveNotification, setMoveNotification] = useState(null);

  // New Deal Form
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stage: 'Qualified',
    expectedCloseDate: '',
    priority: 'Medium',
  });

  // Fetch available pipelines for switcher
  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const res = await pipelinesService.getPipelines();
        if (res.success && res.data.length > 0) {
          setPipelinesList(res.data);
          const defaultPipe = res.data.find((p) => p.isDefault) || res.data[0];
          setSelectedPipelineId((prev) => prev || defaultPipe._id);
        }
      } catch (err) {
        console.error('Error fetching pipelines', err);
      }
    };
    loadPipelines();
  }, []);

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      if (viewMode === 'kanban') {
        const params = selectedPipelineId ? { pipelineId: selectedPipelineId } : {};
        const res = await dealsService.getPipelineBoard(params);
        if (res.success) setBoardData(res);
      } else {
        const params = { search, limit: 50 };
        if (selectedPipelineId) params.pipelineId = selectedPipelineId;
        const res = await dealsService.getDeals(params);
        if (res.success) setDealsList(res.data);
      }
    } catch (err) {
      console.error('Error fetching deals', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [viewMode, search, selectedPipelineId]);

  const handleStageMove = async (dealId, nextStage) => {
    try {
      await dealsService.updateDealStage(dealId, { stage: nextStage });
      fetchDeals();
    } catch (err) {
      alert(err.message);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, deal, sourceStage) => {
    e.dataTransfer.setData('text/plain', deal._id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDeal({ deal, sourceStage });
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDragOverStage(null);
    setTimeout(() => {
      setIsDragging(false);
    }, 120);
  };

  const handleDragOver = (e, stageName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageName) {
      setDragOverStage(stageName);
    }
  };

  const handleDragLeave = (e, stageName) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (dragOverStage === stageName) {
        setDragOverStage(null);
      }
    }
  };

  const handleDrop = async (e, destinationStage) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedDeal) return;
    const { deal, sourceStage } = draggedDeal;

    if (sourceStage === destinationStage) {
      setDraggedDeal(null);
      return;
    }

    // Optimistic UI Update for instant 60fps responsiveness
    setBoardData((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const targetCol = prevBoard.columns.find((c) => c.name === destinationStage);
      const targetProb = targetCol?.probability !== undefined ? targetCol.probability : deal.probability;

      const columns = prevBoard.columns.map((col) => {
        if (col.name === sourceStage) {
          const deals = col.deals.filter((d) => d._id !== deal._id);
          const totalValue = deals.reduce((acc, d) => acc + (d.value || 0), 0);
          return { ...col, deals, count: deals.length, totalValue };
        }
        if (col.name === destinationStage) {
          const updatedDeal = { ...deal, stage: destinationStage, probability: targetProb };
          const deals = [updatedDeal, ...col.deals];
          const totalValue = deals.reduce((acc, d) => acc + (d.value || 0), 0);
          return { ...col, deals, count: deals.length, totalValue };
        }
        return col;
      });

      const totalDeals = columns.reduce((acc, c) => acc + c.count, 0);
      const totalPipelineValue = columns.reduce((acc, c) => acc + (c.totalValue || 0), 0);
      const totalWeightedValue = columns.reduce(
        (acc, c) => acc + Math.round(((c.totalValue || 0) * (c.probability || 0)) / 100),
        0
      );

      return {
        ...prevBoard,
        columns,
        summary: {
          ...prevBoard.summary,
          totalDeals,
          totalPipelineValue,
          totalWeightedValue,
        },
      };
    });

    setMoveNotification({
      title: deal.title,
      destination: destinationStage,
    });
    setTimeout(() => {
      setMoveNotification(null);
    }, 3500);

    setDraggedDeal(null);

    // Persist to backend
    try {
      await dealsService.updateDealStage(deal._id, { stage: destinationStage });
    } catch (err) {
      console.error('Failed to move stage via drag-and-drop', err);
      fetchDeals(); // Revert on failure
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    try {
      await dealsService.createDeal({
        ...formData,
        pipelineId: selectedPipelineId || boardData?.pipeline?.id,
        value: Number(formData.value) || 100000,
        expectedCloseDate: formData.expectedCloseDate || new Date(Date.now() + 30 * 86400000),
      });
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        value: '',
        stage: boardData?.columns?.[0]?.name || 'Qualified',
        expectedCloseDate: '',
        priority: 'Medium',
      });
      fetchDeals();
    } catch (err) {
      alert(err.message);
    }
  };

  const tableColumns = [
    {
      title: 'Opportunity Name',
      key: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
            {val}
          </div>
          {row.companyId?.name && <div className="text-xs text-slate-400">{row.companyId.name}</div>}
        </div>
      ),
    },
    {
      title: 'Value',
      key: 'value',
      sortable: true,
      render: (val) => (
        <span className="font-bold text-slate-900">₹{(val || 0).toLocaleString('en-IN')}</span>
      ),
    },
    {
      title: 'Stage',
      key: 'stage',
      sortable: true,
      render: (val) => <Badge variant="indigo" size="sm">{val}</Badge>,
    },
    {
      title: 'Win Probability',
      key: 'probability',
      sortable: true,
      render: (val) => <span className="text-xs font-semibold text-slate-700">{val}%</span>,
    },
    {
      title: 'Expected Close',
      key: 'expectedCloseDate',
      sortable: true,
      render: (val) => val ? new Date(val).toLocaleDateString() : '—',
    },
    {
      title: 'Risk Level',
      key: 'riskLevel',
      render: (val) => (
        <Badge variant={val === 'High' ? 'rose' : val === 'Medium' ? 'amber' : 'neutral'} size="sm">
          {val || 'Low'}
        </Badge>
      ),
    },
    {
      title: 'Owner',
      key: 'ownerId',
      render: (val) => val?.name || 'Unassigned',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Sales Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Interactive drag-and-drop pipeline stages with weighted forecast calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pipeline Selector */}
          {pipelinesList.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-2xs">
              <GitFork className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={selectedPipelineId || ''}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                className="font-semibold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer pr-1 text-xs"
              >
                {pipelinesList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={() => exportDataToCsv('deals')}
          >
            Export
          </Button>

          <Button
            size="sm"
            icon={Plus}
            onClick={() => {
              if (boardData?.columns?.length > 0) {
                setFormData((prev) => ({
                  ...prev,
                  stage: boardData.columns[0].name,
                }));
              }
              setIsCreateModalOpen(true);
            }}
          >
            Add Opportunity
          </Button>
        </div>
      </div>

      {/* Pipeline Summary Bar */}
      {boardData?.summary && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400">Total Deals:</span>{' '}
              <span className="font-bold text-slate-900">{boardData.summary.totalDeals}</span>
            </div>
            <div>
              <span className="text-slate-400">Pipeline Value:</span>{' '}
              <span className="font-bold text-slate-900">
                ₹{(boardData.summary.totalPipelineValue || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Weighted Forecast:</span>{' '}
              <span className="font-bold text-emerald-600">
                ₹{(boardData.summary.totalWeightedValue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Pipeline:</span>
            <span className="font-bold text-slate-700">{boardData.pipeline?.name}</span>
          </div>
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-6">
          <div className="flex items-start gap-4 min-w-[1200px]">
            {(boardData?.columns || []).map((col, idx) => {
              const stages = boardData.columns.map((c) => c.name);
              const nextStage = stages[idx + 1];
              const isDropTarget = dragOverStage === col.name && draggedDeal?.sourceStage !== col.name;

              return (
                <div
                  key={col.id || col.name}
                  onDragOver={(e) => handleDragOver(e, col.name)}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (draggedDeal && draggedDeal.sourceStage !== col.name) {
                      setDragOverStage(col.name);
                    }
                  }}
                  onDragLeave={(e) => handleDragLeave(e, col.name)}
                  onDrop={(e) => handleDrop(e, col.name)}
                  className={`w-72 shrink-0 rounded-2xl p-3 border flex flex-col max-h-[calc(100vh-230px)] transition-all duration-150 ${
                    isDropTarget
                      ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/30 shadow-md'
                      : 'bg-slate-100/70 border-slate-200/70'
                  }`}
                >
                  {/* Column Header */}
                  <div className="pb-3 border-b border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: col.color || '#6366f1' }}
                        />
                        <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                          {col.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-3xs">
                        {col.count}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                      <span>₹{((col.totalValue || 0) / 100000).toFixed(1)}L total</span>
                      <span className="text-indigo-600 font-semibold">{col.probability}% win</span>
                    </div>
                  </div>

                  {/* Deals Stack */}
                  <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-0.5 min-h-[140px]">
                    {/* Visual Drop Target Placeholder */}
                    {isDropTarget && (
                      <div className="border-2 border-dashed border-indigo-400 bg-indigo-50/90 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 animate-in fade-in zoom-in-95 duration-150 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        <span>Drop to move into {col.name}</span>
                      </div>
                    )}

                    {col.deals.length === 0 ? (
                      isDropTarget ? null : (
                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[11px] text-slate-400">
                          No opportunities
                        </div>
                      )
                    ) : (
                      col.deals.map((deal) => {
                        const isThisDealDragging = draggedDeal?.deal._id === deal._id;

                        return (
                          <div
                            key={deal._id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, deal, col.name)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                              if (!isDragging) {
                                onOpenDealDetail(deal._id);
                              }
                            }}
                            className={`bg-white p-3.5 rounded-xl border shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative space-y-2.5 select-none ${
                              isThisDealDragging
                                ? 'opacity-40 border-dashed border-indigo-400 scale-[0.98] ring-2 ring-indigo-300'
                                : 'border-slate-200/90 hover:border-indigo-300 hover:translate-y-[-1px]'
                            }`}
                          >
                            {/* Header: Title & Drag Handle */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                  {deal.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  {deal.companyId?.name || 'Individual Account'}
                                </p>
                              </div>
                              <div
                                title="Drag to move stage"
                                className="p-1 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            {/* Value & Probability */}
                            <div className="flex items-center justify-between text-xs bg-slate-50/70 px-2.5 py-1.5 rounded-lg border border-slate-100">
                              <span className="font-bold text-slate-900">
                                ₹{(deal.value || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200/60 shadow-3xs">
                                {deal.probability}% Prob
                              </span>
                            </div>

                            {/* Risk Badges */}
                            {deal.riskReasons?.length > 0 && (
                              <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 flex items-center gap-1.5 text-[10px] text-rose-700 font-medium">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span className="truncate">{deal.riskReasons[0]}</span>
                              </div>
                            )}

                            {/* Footer: Owner & Advance Action */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                              <div className="flex items-center gap-1.5 truncate">
                                {deal.ownerId?.avatar ? (
                                  <img
                                    src={deal.ownerId.avatar}
                                    alt=""
                                    className="w-4 h-4 rounded-full object-cover shrink-0"
                                  />
                                ) : null}
                                <span className="truncate font-medium">{deal.ownerId?.name || 'Rep'}</span>
                              </div>

                              {nextStage && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStageMove(deal._id, nextStage);
                                  }}
                                  title={`Advance to ${nextStage}`}
                                  className="inline-flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 font-semibold p-1 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                >
                                  <span>Advance</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Move Notification Toast */}
      {moveNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-white">"{moveNotification.title}"</span>{' '}
            <span className="text-slate-300">moved to</span>{' '}
            <span className="font-bold text-indigo-300">{moveNotification.destination}</span>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <DataTable
          columns={tableColumns}
          data={dealsList}
          isLoading={isLoading}
          onRowClick={(row) => onOpenDealDetail(row._id)}
        />
      )}

      {/* Create Deal Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New Sales Opportunity"
        subtitle="Place a qualified deal into the active sales pipeline"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeal}>Create Opportunity</Button>
          </>
        }
      >
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <Input
            label="Opportunity Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Enterprise Cloud Migration (100 seats)"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Deal Value (₹)"
              type="number"
              required
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="750000"
            />
            <Select
              label="Stage"
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              options={
                boardData?.columns?.length > 0
                  ? boardData.columns.map((c) => ({
                      value: c.name,
                      label: `${c.name} (${c.probability}% win)`,
                    }))
                  : [
                      { value: 'New Lead', label: 'New Lead (10%)' },
                      { value: 'Contacted', label: 'Contacted (25%)' },
                      { value: 'Qualified', label: 'Qualified (40%)' },
                      { value: 'Discovery & Demo', label: 'Discovery & Demo (60%)' },
                      { value: 'Negotiation', label: 'Negotiation (80%)' },
                    ]
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expected Close Date"
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
            />
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
                { value: 'Urgent', label: 'Urgent' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
