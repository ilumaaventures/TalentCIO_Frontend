import React, { useState, useEffect } from 'react';
import { Globe2, MapPin, Users, Briefcase, Plus, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { adminService } from '../../services/api';

export const TerritoriesPage = () => {
  const [territories, setTerritories] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    leadRep: '',
    regions: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([
        adminService.getTerritories(),
        adminService.getUsers(),
      ]);
      if (tRes.success) setTerritories(tRes.data);
      if (uRes.success) {
        setUsers(uRes.data);
        if (uRes.data.length > 0 && !formData.leadRep) {
          setFormData((prev) => ({ ...prev, leadRep: uRes.data[0].name }));
        }
      }
    } catch (err) {
      console.error('Error loading territories', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminService.createTerritory({
        ...formData,
        leadRep: formData.leadRep || (users[0]?.name || 'Unassigned'),
      });
      setIsModalOpen(false);
      setFormData({ name: '', leadRep: users[0]?.name || '', regions: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create territory');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove territory "${name}"?`)) return;
    try {
      await adminService.deleteTerritory(id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete territory');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Territory Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic sales zoning and regional rep performance attribution.
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add Territory
        </Button>
      </div>

      {territories.length === 0 ? (
        <Card padding="lg" className="text-center py-16 bg-slate-50/50 border-dashed">
          <Globe2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-700">No sales territories configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Partition sales regions by geography, state, or enterprise vertical, and assign dedicated account executives.
          </p>
          <Button size="sm" icon={Plus} className="mt-4" onClick={() => setIsModalOpen(true)}>
            Add First Territory
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {territories.map((t) => (
            <Card key={t._id} padding="lg" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">{t.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="indigo" size="sm">Active Territory</Badge>
                  <button
                    onClick={() => handleDelete(t._id, t.name)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Territory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-xs space-y-2 text-slate-600">
                <div>
                  <p className="text-slate-400 font-medium">Assigned Lead Rep:</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{t.leadRep || 'Unassigned'}</p>
                </div>
                {t.regions && (
                  <div>
                    <p className="text-slate-400 font-medium">Coverage Zones:</p>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{t.regions}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Sales Territory"
        subtitle="Define geographic coverage zones and assign lead sales representatives"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Territory</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Territory Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. North India Commercial & NCR"
          />

          <Select
            label="Lead Representative"
            value={formData.leadRep}
            onChange={(e) => setFormData({ ...formData, leadRep: e.target.value })}
            options={
              users.length > 0
                ? users.map((u) => ({ value: u.name, label: `${u.name} (${u.email})` }))
                : [{ value: 'Aditya Sharma', label: 'Aditya Sharma (admin@salescrm.com)' }]
            }
          />

          <Input
            label="Coverage Zones / States (Optional)"
            value={formData.regions}
            onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
            placeholder="e.g. Delhi NCR, Haryana, Punjab, Uttar Pradesh"
          />
        </form>
      </Modal>
    </div>
  );
};
