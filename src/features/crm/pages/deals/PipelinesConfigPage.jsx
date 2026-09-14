import React, { useState, useEffect } from 'react';
import { GitFork, Plus, Edit2, Trash2, CheckCircle2, Star } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { pipelinesService } from '../../services/api';

export const PipelinesConfigPage = () => {
  const [pipelines, setPipelines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pipelineName, setPipelineName] = useState('');

  const fetchPipelines = async () => {
    setIsLoading(true);
    try {
      const res = await pipelinesService.getPipelines();
      if (res.success) setPipelines(res.data);
    } catch (err) {
      console.error('Error fetching pipelines', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await pipelinesService.createPipeline({
        name: pipelineName,
        stages: [
          { name: 'Lead In', probability: 10, color: '#94a3b8', order: 1 },
          { name: 'Contacted', probability: 25, color: '#3b82f6', order: 2 },
          { name: 'Qualified', probability: 40, color: '#8b5cf6', order: 3 },
          { name: 'Proposal Sent', probability: 60, color: '#f59e0b', order: 4 },
          { name: 'Negotiation', probability: 80, color: '#06b6d4', order: 5 },
          { name: 'Closed Won', probability: 100, color: '#10b981', order: 6, isWon: true },
          { name: 'Closed Lost', probability: 0, color: '#ef4444', order: 7, isLost: true },
        ],
      });
      setIsModalOpen(false);
      setPipelineName('');
      fetchPipelines();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetDefault = async (pipelineId) => {
    try {
      await pipelinesService.updatePipeline(pipelineId, { isDefault: true });
      fetchPipelines();
    } catch (err) {
      alert(err.message || 'Failed to set default pipeline');
    }
  };

  const handleDelete = async (pipelineId, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await pipelinesService.deletePipeline(pipelineId);
      fetchPipelines();
    } catch (err) {
      alert(err.message || 'Failed to delete pipeline');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Pipelines</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure sales stages, win probabilities, and pipeline workflows.
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Pipeline
        </Button>
      </div>

      <div className="space-y-4">
        {pipelines.map((pipeline) => (
          <Card key={pipeline._id} padding="lg" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">{pipeline.name}</h3>
                {pipeline.isDefault && <Badge variant="indigo" size="sm">Default Pipeline</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">
                  {pipeline.stages?.length || 0} Stages Configured
                </span>
                {!pipeline.isDefault && (
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <button
                      onClick={() => handleSetDefault(pipeline._id)}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Set as Default Pipeline"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>Set as Default</span>
                    </button>
                    <button
                      onClick={() => handleDelete(pipeline._id, pipeline.name)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Pipeline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {(pipeline.stages || []).map((stage, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 text-center space-y-1.5"
                >
                  <div
                    className="w-3 h-3 rounded-full mx-auto"
                    style={{ backgroundColor: stage.color || '#6366f1' }}
                  />
                  <p className="text-xs font-bold text-slate-900 truncate">{stage.name}</p>
                  <p className="text-[11px] font-semibold text-indigo-600">{stage.probability}% win</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Sales Pipeline"
        subtitle="Initialize a new custom sales pipeline with default stages"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Pipeline</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Pipeline Name"
            required
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="e.g. Strategic Enterprise Accounts"
          />
        </form>
      </Modal>
    </div>
  );
};
