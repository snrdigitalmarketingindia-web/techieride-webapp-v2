'use client';

import { useEffect, useState } from 'react';
import { gamificationApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const ECO_BADGES: Record<string, { icon: string; color: string }> = {
  SEED:   { icon: '🌱', color: 'bg-gray-100 text-gray-600' },
  SPROUT: { icon: '🌿', color: 'bg-green-100 text-green-700' },
  LEAF:   { icon: '🍃', color: 'bg-emerald-100 text-emerald-700' },
  TREE:   { icon: '🌳', color: 'bg-brand-100 text-brand-700' },
  FOREST: { icon: '🌲', color: 'bg-brand-600 text-white' },
};

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-400 text-white',
  2: 'bg-gray-300 text-gray-800',
  3: 'bg-amber-500 text-white',
};

const RANK_EMOJIS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<'monthly' | 'alltime'>('monthly');
  const [board, setBoard] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      gamificationApi.getLeaderboard(period),
      gamificationApi.getSummary(),
    ]).then(([lb, sum]) => {
      setBoard(lb.data);
      setSummary(sum.data);
    }).finally(() => setLoading(false));
  }, [period]);

  const myRank = board.findIndex(e => e.id === user?.id) + 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🏆 ECO Leaderboard</h1>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['monthly', 'alltime'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${period === p ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              {p === 'monthly' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* My ECO stats */}
      {summary && (
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-100 text-xs font-medium mb-0.5">Your ECO Impact</p>
              <p className="text-2xl font-bold">{summary.totalPoints} pts</p>
              <p className="text-brand-200 text-xs">{summary.co2SavedKg} kg CO₂ saved</p>
            </div>
            <div className="text-right">
              {myRank > 0 && (
                <>
                  <p className="text-3xl font-bold">#{myRank}</p>
                  <p className="text-brand-200 text-xs">Your rank</p>
                </>
              )}
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${ECO_BADGES[summary.ecoLevel]?.color || ''}`}>
                {ECO_BADGES[summary.ecoLevel]?.icon} {summary.ecoLevel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Podium — top 3 */}
      {!loading && board.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-2">
          {[board[1], board[0], board[2]].map((entry, i) => {
            const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const heights = ['h-20', 'h-28', 'h-16'];
            return (
              <div key={entry.id} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-lg font-bold text-brand-700">
                  {entry.fullName?.[0]}
                </div>
                <p className="text-xs font-medium text-gray-700 text-center truncate w-full px-1">
                  {entry.fullName?.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-500">{entry.points} pts</p>
                <div className={`w-full ${heights[i]} ${RANK_STYLES[actualRank] || 'bg-gray-100'} rounded-t-lg flex items-center justify-center text-xl`}>
                  {RANK_EMOJIS[actualRank]}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {board.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <div className="text-4xl mb-2">🌱</div>
              <p className="text-sm">No leaderboard data yet. Complete rides to earn points!</p>
            </div>
          ) : (
            board.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.id === user?.id;
              const badge = ECO_BADGES[entry.ecoLevel] || ECO_BADGES.SEED;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 transition ${isMe ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Rank */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${RANK_STYLES[rank] || 'bg-gray-100 text-gray-600'}`}>
                    {rank <= 3 ? RANK_EMOJIS[rank] : rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center font-semibold text-brand-700 flex-shrink-0">
                    {entry.fullName?.[0]}
                  </div>

                  {/* Name + level */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${isMe ? 'text-brand-700' : 'text-gray-900'}`}>
                        {entry.fullName} {isMe && '(you)'}
                      </p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.color}`}>
                        {badge.icon} {entry.ecoLevel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">🌍 {entry.co2SavedKg} kg CO₂ saved</p>
                  </div>

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">{entry.points}</p>
                    <p className="text-xs text-gray-400">pts</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
