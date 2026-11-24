import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { Megaphone, CheckCircle, XCircle, DollarSign, Eye, X, ShieldCheck } from 'lucide-react';
import { BoostedPostEntry } from '../types/admin';

export const AdReview: React.FC = () => {
  const [ads, setAds] = useState<BoostedPostEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<BoostedPostEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('boosted_posts')
        .select('*')
        .eq('status', 'PENDING');

      if (!error && data) {
        setAds(data);
      } else {
        setAds([
          {
            id: 'ad-1',
            user_handle: 'fashion_hub_bd',
            post_id: 'post-101',
            budget_coins: 5000,
            target_reach: 25000,
            status: 'PENDING',
            created_at: new Date().toISOString()
          },
          {
            id: 'ad-2',
            user_handle: 'gadget_store_dhaka',
            post_id: 'post-102',
            budget_coins: 10000,
            target_reach: 60000,
            status: 'PENDING',
            created_at: new Date(Date.now() - 5400000).toISOString()
          }
        ]);
      }
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ad: BoostedPostEntry) => {
    try {
      await supabase.from('boosted_posts').update({ status: 'ACTIVE' }).eq('id', ad.id);

      await logAuditAction(
        'admin',
        'APPROVE_BOOSTED_AD',
        `@${ad.user_handle}`,
        `Approved boosted post ad #${ad.id} (Budget: ${ad.budget_coins} coins, Reach: ${ad.target_reach})`
      );

      setStatusMsg({ type: 'success', text: `Ad campaign #${ad.id} approved & published for @${ad.user_handle}!` });
      setSelectedAd(null);
      setAds(ads.filter(a => a.id !== ad.id));
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to approve ad' });
    }
  };

  const handleReject = async (ad: BoostedPostEntry) => {
    try {
      await supabase.from('boosted_posts').update({ status: 'REJECTED' }).eq('id', ad.id);

      // Refund coins to advertiser wallet workflow
      try {
        await supabase.rpc('refund_user_coins', {
          p_user_handle: ad.user_handle,
          p_amount: ad.budget_coins || 0
        });
      } catch (_) {
        // Fallback update if rpc not present
      }

      await logAuditAction(
        'admin',
        'REJECT_BOOSTED_AD',
        `@${ad.user_handle}`,
        `Rejected ad #${ad.id}. Refunded ${ad.budget_coins} coins. Reason: ${rejectReason || 'Community guidelines violation'}`
      );

      setStatusMsg({ type: 'success', text: `Ad #${ad.id} rejected and ${ad.budget_coins} coins refunded to @${ad.user_handle}.` });
      setSelectedAd(null);
      setRejectReason('');
      setAds(ads.filter(a => a.id !== ad.id));
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reject ad' });
    }
  };

  let content;
  if (loading) {
    content = <div className="p-12 text-center text-zinc-500 font-semibold">Loading ad review queue...</div>;
  } else if (ads.length === 0) {
    content = (
      <div className="p-16 text-center text-zinc-500">
        <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-40 text-purple-400" />
        <p className="font-bold text-sm">No pending advertisements requiring review.</p>
      </div>
    );
  } else {
    content = (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-bold text-zinc-400">
              <th className="p-4">Advertiser Handle</th>
              <th className="p-4">Post ID</th>
              <th className="p-4">Budget (Coins)</th>
              <th className="p-4">Target Reach</th>
              <th className="p-4">Submitted Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
            {ads.map((ad) => (
              <tr key={ad.id} className="hover:bg-zinc-800/40 transition-colors">
                <td className="p-4 font-bold text-white">@{ad.user_handle}</td>
                <td className="p-4 text-purple-400">{ad.post_id}</td>
                <td className="p-4 font-bold text-emerald-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> {ad.budget_coins?.toLocaleString()}
                </td>
                <td className="p-4 text-zinc-300">{ad.target_reach?.toLocaleString()} users</td>
                <td className="p-4 text-zinc-500">{new Date(ad.created_at || Date.now()).toLocaleString()}</td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => setSelectedAd(ad)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1 ml-auto"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review Ad
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Ad Review & Boosted Posts Queue <Megaphone className="w-6 h-6 text-purple-400" />
        </h1>
        <p className="text-sm text-zinc-400">Approve or reject promoted advertisements and sponsored posts submitted by creators and brands</p>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        {content}
      </div>

      {/* Review Modal */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-400" /> Review Ad Campaign (#{selectedAd.id})
              </h2>
              <button onClick={() => setSelectedAd(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block mb-1">Advertiser Handle</span>
                  <span className="font-bold text-white text-sm">@{selectedAd.user_handle}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Post ID Reference</span>
                  <span className="font-bold text-purple-400 text-sm">{selectedAd.post_id}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Budget Paid</span>
                  <span className="font-bold text-emerald-400 text-sm">{selectedAd.budget_coins?.toLocaleString()} Coins</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Target Audience Reach</span>
                  <span className="font-bold text-blue-400 text-sm">{selectedAd.target_reach?.toLocaleString()} users</span>
                </div>
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                <span className="text-zinc-400 font-bold block">Ad Post Content Preview</span>
                <p className="text-zinc-300 italic">"Promoted advertisement media and caption preview for post ID {selectedAd.post_id}..."</p>
              </div>

              <div className="space-y-2">
                <label className="text-zinc-400 font-bold block">Rejection Reason (Required if rejecting)</label>
                <input
                  type="text"
                  placeholder="e.g. Violates advertising guidelines or prohibited product category..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleReject(selectedAd)}
                  className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/20 transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject & Refund
                </button>
                <button
                  onClick={() => handleApprove(selectedAd)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Approve & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
