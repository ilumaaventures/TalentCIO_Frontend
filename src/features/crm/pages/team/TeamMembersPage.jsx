import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { adminService } from '../../services/api';

export const TeamMembersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'sales_executive',
    team: 'Direct Sales',
    territory: 'North India',
    phone: '',
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminService.createUser(formData);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', role: 'sales_executive', team: 'Direct Sales', territory: 'North India', phone: '' });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to remove team member "${name}"?`)) return;
    try {
      await adminService.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to remove user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Team & Representatives</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage sales directors, account managers, and field sales executives.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add Team Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((member) => (
          <Card key={member._id} padding="lg" className="space-y-4">
            <div className="flex items-start gap-3.5">
              <img
                src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                alt=""
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 shadow-2xs"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 truncate">{member.name}</h3>
                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <Badge variant="indigo" size="sm">
                    {member.role ? member.role.replace('_', ' ') : 'Sales Rep'}
                  </Badge>
                  {member.email !== 'admin@salescrm.com' && (
                    <button
                      onClick={() => handleDelete(member._id, member.name)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove Team Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Team:</span>
                <span className="font-semibold text-slate-800">{member.team || 'Direct Sales'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Territory:</span>
                <span className="font-semibold text-slate-800">{member.territory || 'Pan India'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="text-slate-700">{member.phone || '—'}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Team Member"
        subtitle="Invite a new sales user with assigned role & territory"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Member</Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Varun Kapoor"
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="varun@salescrm.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'sales_executive', label: 'Sales Executive' },
                { value: 'sales_manager', label: 'Sales Manager' },
                { value: 'sales_director', label: 'Sales Director' },
                { value: 'marketing', label: 'Marketing' },
                { value: 'customer_success', label: 'Customer Success' },
              ]}
            />
            <Input
              label="Territory"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              placeholder="North India"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
