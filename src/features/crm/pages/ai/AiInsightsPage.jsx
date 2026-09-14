import React, { useState, useEffect } from 'react';
import { BrainCircuit, AlertTriangle, Sparkles, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { aiService } from '../../services/api';

export const AiInsightsPage = ({ onNavigate }) => {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const res = await aiService.getInsights();
        if (res.success) setInsights(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">AI Risk & Opportunity Scanner</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <BrainCircuit className="w-3 h-3 text-indigo-600" />
            Predictive Analysis
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Algorithmic scanning across opportunity aging, inactive leads, and win probability bottlenecks.
        </p>
      </div>

      <div className="space-y-4">
        {insights.length === 0 ? (
          <Card padding="lg" className="text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No Critical Risks Detected</h3>
            <p className="text-xs text-slate-400 mt-1">All active opportunities and leads are moving on schedule.</p>
          </Card>
        ) : (
          insights.map((item, idx) => {
            const isRisk = item.type === 'deal_risk';

            return (
              <Card
                key={idx}
                padding="lg"
                className={`space-y-3 border-l-4 ${
                  isRisk ? 'border-l-rose-500 bg-rose-50/20' : 'border-l-indigo-500 bg-indigo-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${isRisk ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {isRisk ? <AlertTriangle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        <Badge variant={isRisk ? 'rose' : 'indigo'} size="sm">
                          {item.severity} severity
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                    </div>
                  </div>

                  {item.dealId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigate('deals', item.dealId)}
                    >
                      Open Opportunity
                    </Button>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <span className="text-slate-400 font-semibold">Recommended Action:</span>
                  <span className="text-indigo-700 font-semibold">{item.recommendedAction}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
