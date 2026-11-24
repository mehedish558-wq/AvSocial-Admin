import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { Sparkles, Video, Radio, Trash2, StopCircle, Eye, Flame, ShieldAlert, UserX, Star } from 'lucide-react';

export const ReelsLive: React.FC = () => {
  const [activeLives, setActiveLives] = useState<any[]>([]);
  const [trendingReels, setTrendingReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: lives } = await supabase.from('live_streams').select('*').eq('is_active', true);
      const { data: reels } = await supabase.from('reels').select('*').order('created_at', { ascending: false }).limit(12);

      setActiveLives(lives && lives.length > 0 ? lives : []);
      setTrendingReels(reels && reels.length > 0 ? reels : []);
    } catch (err) {
      console.error('Error fetching reels & live data:', err);
      setActiveLives([]);
      setTrendingReels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardAction = async (targetId: string, handle: string, actionType: 'FEATURE' | 'AGE_RESTRICT' | 'TAKEDOWN' | 'SHADOWBAN') => {
    try {
      if (actionType === 'FEATURE') {
        const target = trendingReels.find(r => r.id === targetId);
        const nextVal = !target?.is_featured;
        const { error } = await supabase.from('reels').update({ is_featured: nextVal }).eq('id', targetId);
        if (error) throw error;
        setTrendingReels(trendingReels.map(r => r.id === targetId ? { ...r, is_featured: nextVal } : r));
      } else if (actionType === 'AGE_RESTRICT') {
        const target = trendingReels.find(r => r.id === targetId);
        const nextVal = !target?.is_age_restricted;
        const { error } = await supabase.from('reels').update({ is_age_restricted: nextVal }).eq('id', targetId);
        if (error) throw error;
        setTrendingReels(trendingReels.map(r => r.id === targetId ? { ...r, is_age_restricted: nextVal } : r));
      } else if (actionType === 'TAKEDOWN') {
        const { error } = await supabase.from('reels').delete().eq('id', targetId);
        if (error) throw error;
        setTrendingReels(trendingReels.filter(r => r.id !== targetId));
      } else if (actionType === 'SHADOWBAN') {
        const { error } = await supabase.from('app_users').update({ is_banned: true, ban_reason: 'Shadowbanned due to reel violation' }).eq('handle', handle);
        if (error) throw error;
      }

      await logAuditAction(
        'admin',
        `REEL_LIVE_${actionType}`,
        `@${handle}`,
        `Executed ${actionType} on content item ${targetId}`
      );

      setStatusMsg({ type: 'success', text: `Successfully applied ${actionType} for @${handle}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to apply action' });
    }
  };

  const handleTerminateLive = async (id: string, handle: string) => {
    try {
      const { error } = await supabase.from('live_streams').update({ is_active: false }).eq('id', id);
      if (error) throw error;

      await logAuditAction('admin', 'KILL_LIVE_STREAM', `@${handle}`, `Terminated live stream ${id}`);
      setActiveLives(activeLives.filter(l => l.id !== id));
      setStatusMsg({ type: 'success', text: `Live stream terminated for @${handle}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to terminate live stream' });
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Reels & Live Streams Real-Time Monitor <Sparkles className="w-6 h-6 text-purple-400" />
        </h1>
        <p className="text-sm text-zinc-400">Grid-based real-time monitoring dashboard with instant moderation & creator control tools</p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* Active Live Streams Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500 animate-pulse" /> Active Live Broadcasts ({activeLives.length})
        </h2>
        {activeLives.length === 0 ? (
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-xs">
            No active live streams currently broadcasting.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLives.map((live) => (
              <div key={live.id} className="bg-[#141418] border border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">@{live.host_handle}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" /> LIVE
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium">{live.title}</p>
                  <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-purple-400" /> {live.viewers_count?.toLocaleString()} active viewers
                  </p>
                </div>
                <button
                  onClick={() => handleTerminateLive(live.id, live.host_handle)}
                  className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl border border-red-500/20 transition-all flex items-center gap-1.5"
                >
                  <StopCircle className="w-4 h-4" /> Kill Stream
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid-Based Reels Monitor & Moderation */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-purple-400" /> Reels Feed Grid & Quick Controls
        </h2>
        {trendingReels.length === 0 ? (
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-xs">
            No reels found in database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {trendingReels.map((reel) => (
              <div key={reel.id} className="bg-[#141418] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">@{reel.user_handle}</span>
                    <div className="flex items-center gap-1.5">
                      {reel.is_featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">Featured</span>}
                      {reel.is_age_restricted && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold">18+</span>}
                      <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {reel.views_count?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">{reel.caption || reel.title || 'Untitled Reel Feed Video'}</p>
                </div>

                {/* Quick Moderation Control Buttons */}
                <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    onClick={() => handleCardAction(reel.id, reel.user_handle, 'FEATURE')}
                    className={`px-3 py-2 font-bold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                      reel.is_featured ? 'bg-purple-600 text-white border-purple-500' : 'bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5" /> {reel.is_featured ? 'Featured' : 'Feature'}
                  </button>
                  <button
                    onClick={() => handleCardAction(reel.id, reel.user_handle, 'AGE_RESTRICT')}
                    className={`px-3 py-2 font-bold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                      reel.is_age_restricted ? 'bg-yellow-600 text-white border-yellow-500' : 'bg-yellow-500/10 hover:bg-yellow-500/25 text-yellow-300 border-yellow-500/30'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> {reel.is_age_restricted ? 'Restricted' : 'Age-Restrict'}
                  </button>
                  <button
                    onClick={() => handleCardAction(reel.id, reel.user_handle, 'TAKEDOWN')}
                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/25 text-red-400 font-bold rounded-xl border border-red-500/20 transition-all flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Takedown
                  </button>
                  <button
                    onClick={() => handleCardAction(reel.id, reel.user_handle, 'SHADOWBAN')}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" /> Shadowban
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
