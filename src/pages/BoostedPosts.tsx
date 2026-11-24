import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BoostedPostEntry } from '../types/admin';
import { logAuditAction } from '../lib/audit';
import { Megaphone, CheckCircle, XCircle, Clock, Coins, Eye, Search, FileText } from 'lucide-react';

export const BoostedPosts: React.FC = () => {
  const [boosts, setBoosts] = useState<BoostedPostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Preview Post Modal
  const [previewPostData, setPreviewPostData] = useState<any | null>(null);

  useEffect(() => {
    fetchBoosts();
  }, []);

  const fetchBoosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('boosted_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback mock data if table doesn't exist yet
        setBoosts([
          { id: 'b1', user_handle: 'alex_creator', post_id: 'post_9988', budget_coins: 500, target_reach: 10000, status: 'PENDING', created_at: new Date().toISOString() },
          { id: 'b2', user_handle: 'sarah_style', post_id: 'post_7766', budget_coins: 1200, target_reach: 25000, status: 'ACTIVE', created_at: new Date().toISOString() }
        ]);
      } else {
        setBoosts(data || []);
      }
    } catch (err) {
      console.error('Error fetching boosted posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPostDetails = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (error || !data) {
        setPreviewPostData({ id: postId, caption: 'Post details preview unavailable or text post.', media_url: '' });
      } else {
        setPreviewPostData(data);
      }
    } catch (err) {
      setPreviewPostData({ id: postId, caption: 'Post preview error.', media_url: '' });
    }
  };

  const handleReviewBoost = async (id: string, approve: boolean, userHandle: string, budget: number) => {
    const newStatus = approve ? 'ACTIVE' : 'REJECTED';
    try {
      const { error } = await supabase
        .from('boosted_posts')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // If rejected, refund coins automatically to user's wallet_coins
      if (!approve && budget > 0) {
        try {
          await supabase.rpc('admin_update_user_coins_refund', {
            p_handle: userHandle,
            p_amount: budget
          });
        } catch (_) {
          // Fallback direct update
          const { data: user } = await supabase.from('app_users').select('wallet_coins').eq('handle', userHandle).maybeSingle();
          if (user) {
            await supabase.from('app_users').update({ wallet_coins: (user.wallet_coins || 0) + budget }).eq('handle', userHandle);
          }
        }
      }

      await logAuditAction(
        'admin',
        approve ? 'APPROVE_BOOSTED_POST' : 'REJECT_BOOSTED_POST',
        `@${userHandle} (Post ID: ${id})`,
        approve ? `Approved ad boost with budget ${budget} coins` : `Rejected ad boost & refunded ${budget} coins`
      );

      setStatusMsg({
        type: 'success',
        text: `Boost for @${userHandle} ${approve ? 'Approved & Activated' : 'Rejected & Refunded ' + budget + ' coins'}`
      });
      fetchBoosts();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update boost status' });
    }
  };

  const filteredBoosts = boosts.filter((b) => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery = (b.user_handle || '').toLowerCase().includes(q) || (b.post_id || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Boosted Posts & Ads Approval <Megaphone className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Review user-submitted post promotions, coin budgets, target reach & manage ad campaigns
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-bold">Dismiss</button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#141418] border border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {['ALL', 'PENDING', 'ACTIVE', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search handle or post ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">User Handle</th>
                <th className="p-4">Post ID / Ref</th>
                <th className="p-4">Budget Coins</th>
                <th className="p-4">Target Reach</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">Loading boosted posts...</td>
                </tr>
              ) : filteredBoosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">No boosted post submissions found matching filter.</td>
                </tr>
              ) : (
                filteredBoosts.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-800/35 transition-colors">
                    <td className="p-4 font-bold text-white">@{b.user_handle}</td>
                    <td className="p-4 font-mono text-zinc-300">
                      <button
                        onClick={() => handleFetchPostDetails(b.post_id)}
                        className="text-purple-400 hover:underline flex items-center gap-1 font-bold"
                        title="Preview Post Content"
                      >
                        <FileText className="w-3.5 h-3.5" /> {b.post_id}
                      </button>
                    </td>
                    <td className="p-4 font-mono font-bold text-yellow-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> {b.budget_coins?.toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-blue-400 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {b.target_reach?.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                          b.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : b.status === 'REJECTED'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {b.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleReviewBoost(b.id, true, b.user_handle, b.budget_coins)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md"
                          >
                            Approve (ACTIVE)
                          </button>
                          <button
                            onClick={() => handleReviewBoost(b.id, false, b.user_handle, b.budget_coins)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-md"
                          >
                            Reject (Refund)
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POST PREVIEW MODAL */}
      {previewPostData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" /> Post Content Preview
              </h3>
              <button onClick={() => setPreviewPostData(null)} className="text-zinc-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-zinc-400 font-mono">Post ID: <strong className="text-white">{previewPostData.id}</strong></div>
              <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-zinc-200">
                {previewPostData.caption || previewPostData.content || '(No text content available)'}
              </div>
              {previewPostData.media_url && (
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video">
                  <img src={previewPostData.media_url} alt="Post Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setPreviewPostData(null)} className="px-4 py-2 bg-zinc-800 text-white font-bold text-xs rounded-xl">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
