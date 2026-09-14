import React, { useState, useEffect } from 'react';
import {
  Building2,
  Globe,
  Phone,
  UserCheck,
  Briefcase,
  Clock,
  Plus,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Drawer } from '../../components/ui/Drawer';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { companiesService, contactsService, dealsService, activitiesService } from '../../services/api';

export const CompanyDetailDrawer = ({
  companyId,
  isOpen,
  onClose,
  onNavigate,
  onOpenContact,
  onUpdated,
}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Quick Action Forms
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);

  const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '' });
  const [dealForm, setDealForm] = useState({ title: '', value: '', stage: 'discovery_demo', winProbability: 30 });

  const fetchCompany = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const res = await companiesService.getCompanyById(companyId);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching company details', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      fetchCompany();
    }
  }, [isOpen, companyId]);

  const handleCreateContact = async (e) => {
    e.preventDefault();
    try {
      await contactsService.createContact({
        ...contactForm,
        companyId,
      });
      setIsAddContactOpen(false);
      setContactForm({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '' });
      fetchCompany();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    try {
      await dealsService.createDeal({
        ...dealForm,
        companyId,
        value: Number(dealForm.value) || 500000,
        expectedCloseDate: new Date(Date.now() + 45 * 86400000),
      });
      setIsAddDealOpen(false);
      setDealForm({ title: '', value: '', stage: 'discovery_demo', winProbability: 30 });
      fetchCompany();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const company = data?.company;
  const contacts = data?.contacts || [];
  const deals = data?.deals || [];
  const activities = data?.activities || [];

  const totalPipelineValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: `Contacts (${contacts.length})` },
    { id: 'deals', label: `Deals (${deals.length})` },
    { id: 'timeline', label: `Timeline (${activities.length})` },
  ];

  const healthScoreVariants = {
    healthy: 'emerald',
    attention_needed: 'amber',
    at_risk: 'rose',
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">{company?.name || 'Company Profile'}</span>
              <Badge variant={healthScoreVariants[company?.healthScore] || 'neutral'} size="xs" dot>
                {company?.healthScore ? company.healthScore.replace('_', ' ') : 'Healthy'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {company?.industry || 'Enterprise'} • {company?.companySize || '51-200'} employees
            </p>
          </div>
        </div>
      }
    >
      {isLoading && !data ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading company profile...</div>
      ) : !company ? (
        <div className="py-12 text-center text-xs text-slate-400">Company record not found.</div>
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div className="text-center p-2 rounded-lg bg-white border border-slate-200/50 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Pipeline</span>
              <span className="text-xs font-bold text-indigo-600">
                ₹{totalPipelineValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-center p-2 rounded-lg bg-white border border-slate-200/50 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Deals</span>
              <span className="text-xs font-bold text-slate-800">{deals.length}</span>
            </div>
            <div className="text-center p-2 rounded-lg bg-white border border-slate-200/50 shadow-2xs">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stakeholders</span>
              <span className="text-xs font-bold text-slate-800">{contacts.length}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={UserCheck}
              className="flex-1"
              onClick={() => setIsAddContactOpen(true)}
            >
              Add Contact
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Briefcase}
              className="flex-1"
              onClick={() => setIsAddDealOpen(true)}
            >
              New Opportunity
            </Button>
          </div>

          {/* Inline Add Contact */}
          {isAddContactOpen && (
            <Card padding="md" className="border-indigo-200 bg-indigo-50/40 animate-in fade-in duration-150">
              <form onSubmit={handleCreateContact} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900">Add New Contact for {company.name}</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddContactOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="First Name"
                    required
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                  />
                  <Input
                    label="Last Name"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                  <Input
                    label="Job Title"
                    value={contactForm.jobTitle}
                    onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })}
                  />
                </div>
                <Button size="sm" type="submit" className="w-full">
                  Save Contact
                </Button>
              </form>
            </Card>
          )}

          {/* Inline Add Opportunity */}
          {isAddDealOpen && (
            <Card padding="md" className="border-indigo-200 bg-indigo-50/40 animate-in fade-in duration-150">
              <form onSubmit={handleCreateDeal} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-900">Create Opportunity</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddDealOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
                <Input
                  label="Deal Title"
                  placeholder="e.g. Enterprise Security License Expansion"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Deal Value (₹)"
                    type="number"
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    required
                  />
                  <Select
                    label="Initial Stage"
                    value={dealForm.stage}
                    onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value })}
                    options={[
                      { value: 'discovery_demo', label: 'Discovery / Demo' },
                      { value: 'proposal_quote', label: 'Proposal Submitted' },
                      { value: 'negotiation', label: 'Negotiation' },
                    ]}
                  />
                </div>
                <Button size="sm" type="submit" className="w-full">
                  Create Opportunity
                </Button>
              </form>
            </Card>
          )}

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <Card padding="md" className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Website</span>
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{company.website.replace('https://', '')}</span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Phone</span>
                    <span className="font-semibold text-slate-800">{company.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Annual Revenue</span>
                    <span className="font-semibold text-slate-800">{company.annualRevenue || '₹50Cr - ₹100Cr'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Account Owner</span>
                    <span className="font-semibold text-slate-800">{company.ownerId?.name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Location</span>
                    <span className="font-semibold text-slate-800">
                      {company.billingAddress?.city || 'Bengaluru'}, {company.billingAddress?.state || 'Karnataka'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Account Tier</span>
                    <Badge variant="indigo" size="xs">
                      Tier 1 Strategic
                    </Badge>
                  </div>
                </div>
              </Card>

              {company.description && (
                <Card padding="md">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{company.description}</p>
                </Card>
              )}
            </div>
          )}

          {/* Tab 2: Contacts */}
          {activeTab === 'contacts' && (
            <div className="space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No contacts found under this company.
                </div>
              ) : (
                contacts.map((c) => (
                  <Card
                    key={c._id}
                    padding="sm"
                    className="flex items-center justify-between hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {c.firstName?.[0] || ''}
                        {c.lastName?.[0] || ''}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {c.fullName || `${c.firstName} ${c.lastName}`}
                        </span>
                        <span className="text-[11px] text-slate-500">{c.jobTitle || 'Stakeholder'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onOpenContact && (
                        <button
                          onClick={() => onOpenContact(c._id)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Deals */}
          {activeTab === 'deals' && (
            <div className="space-y-3">
              {deals.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No opportunities linked to this account.
                </div>
              ) : (
                deals.map((deal) => (
                  <Card key={deal._id} padding="md" className="hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{deal.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Value:{' '}
                          <span className="font-bold text-slate-800">
                            ₹{Number(deal.value || 0).toLocaleString('en-IN')}
                          </span>{' '}
                          • Stage: <span className="font-medium capitalize">{deal.stage?.replace('_', ' ')}</span>
                        </p>
                      </div>
                      <Badge variant="indigo" size="xs">
                        {deal.winProbability}%
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No company activity logged yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activities.map((act) => (
                    <div key={act._id} className="relative">
                      <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{act.subject}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.performedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {act.description && <p className="text-xs text-slate-600 mt-1">{act.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};
