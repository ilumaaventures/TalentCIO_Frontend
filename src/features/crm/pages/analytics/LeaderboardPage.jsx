import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, DollarSign, CheckCircle2, PhoneCall } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { analyticsService } from '../../services/api';

export const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const res = await analyticsService.getDashboard({});
        if (res.success && res.data.leaderboard) {
          setLeaderboard(res.data.leaderboard);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const hasWonRevenue = leaderboard.some((r) => (r.revenueWon || 0) > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sales Leaderboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Live sales performance ranking based on revenue won, pipeline velocity, and conversion rate.
        </p>
      </div>

      {!hasWonRevenue && (
        <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-xs text-indigo-900 flex items-center gap-3">
          <Award className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <span className="font-bold">Awaiting first closed deals.</span> All registered team representatives are currently at baseline (0 deals won, ₹0 revenue). Rankings, gold trophies, and Top Closer awards will automatically activate as deals move to "Closed Won".
          </div>
        </div>
      )}

      <div className="space-y-4">
        {leaderboard.map((rep, idx) => {
          const isGold = hasWonRevenue && idx === 0 && (rep.revenueWon || 0) > 0;
          const isSilver = hasWonRevenue && idx === 1 && (rep.revenueWon || 0) > 0;
          const isBronze = hasWonRevenue && idx === 2 && (rep.revenueWon || 0) > 0;

          return (
            <Card
              key={rep.id}
              padding="lg"
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                isGold ? 'border-amber-300 bg-amber-50/20 shadow-sm' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                    isGold
                      ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                      : isSilver
                      ? 'bg-slate-300 text-slate-900'
                      : isBronze
                      ? 'bg-amber-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  #{idx + 1}
                </div>

                <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm ring-2 ring-white shadow-xs overflow-hidden shrink-0">
                  {rep.avatar ? (
                    <img
                      src={rep.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{rep.name?.charAt(0) || 'U'}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{rep.name}</h3>
                    {isGold && <Badge variant="amber" size="sm">Top Closer</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{rep.team} • {rep.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-right sm:border-l sm:border-slate-100 sm:pl-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Deals Won</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{rep.dealsWon}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Win Rate</p>
                  <p className="text-sm font-bold text-indigo-600 mt-0.5">{rep.conversionRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Revenue Won</p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    ₹{(rep.revenueWon || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
