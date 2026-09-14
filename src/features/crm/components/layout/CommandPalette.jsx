import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  Briefcase,
  Building2,
  CheckSquare,
  Bot,
  Plus,
  ArrowRight,
  X,
} from 'lucide-react';
import { leadsService, dealsService, companiesService } from '../../services/api';

export const CommandPalette = ({ isOpen, onClose, onNavigate, onOpenQuickCreate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ leads: [], deals: [], companies: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard shortcut listener to close on Escape or Ctrl+K when open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setResults({ leads: [], deals: [], companies: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [leadsRes, dealsRes, companiesRes] = await Promise.all([
          leadsService.getLeads({ search: query, limit: 3 }),
          dealsService.getDeals({ search: query, limit: 3 }),
          companiesService.getCompanies({ search: query, limit: 3 }),
        ]);

        setResults({
          leads: leadsRes.data || [],
          deals: dealsRes.data || [],
          companies: companiesRes.data || [],
        });
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search leads, deals, companies..."
            className="w-full text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results / Navigation Suggestions */}
        <div className="max-h-80 overflow-y-auto p-2">
          {/* Quick Actions if query is empty */}
          {!query && (
            <div className="py-2">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Quick Actions
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenQuickCreate('lead');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <div className="p-1.5 rounded bg-indigo-50 text-indigo-600">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Create New Lead</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenQuickCreate('deal');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <div className="p-1.5 rounded bg-indigo-50 text-indigo-600">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <span>Create New Opportunity</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigate('ai-assistant');
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left"
              >
                <div className="p-1.5 rounded bg-indigo-50 text-indigo-600">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span>Ask AI Sales Assistant</span>
              </button>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="space-y-3 py-1">
              {/* Leads */}
              {results.leads.length > 0 && (
                <div>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Leads
                  </p>
                  {results.leads.map((lead) => (
                    <button
                      key={lead._id}
                      onClick={() => {
                        onClose();
                        onNavigate('leads', lead._id);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{lead.fullName}</span>
                        {lead.companyName && <span className="text-slate-400">• {lead.companyName}</span>}
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {lead.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Deals */}
              {results.deals.length > 0 && (
                <div>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Opportunities
                  </p>
                  {results.deals.map((deal) => (
                    <button
                      key={deal._id}
                      onClick={() => {
                        onClose();
                        onNavigate('deals', deal._id);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{deal.title}</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₹{(deal.value || 0).toLocaleString('en-IN')}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Companies */}
              {results.companies.length > 0 && (
                <div>
                  <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Companies
                  </p>
                  {results.companies.map((comp) => (
                    <button
                      key={comp._id}
                      onClick={() => {
                        onClose();
                        onNavigate('companies', comp._id);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{comp.name}</span>
                        {comp.industry && <span className="text-slate-400">({comp.industry})</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">{comp.healthScore}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.leads.length === 0 && results.deals.length === 0 && results.companies.length === 0 && !isLoading && (
                <p className="text-center text-xs text-slate-400 py-6">
                  No records matching "{query}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with arrows</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
};
