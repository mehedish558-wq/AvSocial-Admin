import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FeedAlgorithmConfig, ManagedHashtag } from '../types/admin';
import { Sliders, Flame, Hash, Plus, Trash2, CheckCircle2, AlertTriangle, Save, RefreshCw } from 'lucide-react';

export const FeedAlgorithm: React.FC = () => {
  const [config, setConfig] = useState<FeedAlgorithmConfig>({
    id: 1,
    like_weight: 1.0,
    comment_weight: 2.0,
    share_weight: 3.0,
    watch_time_weight: 1.5,
    recency_decay_hours: 24.0
  });

  const [hashtags, setHashtags] = useState<ManagedHashtag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: configData } = await supabase
        .from('feed_algorithm_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (configData) {
        setConfig(configData);
      } else {
        // Insert default if missing
        await supabase.from('feed_algorithm_config').upsert({ id: 1, like_weight: 1.0, comment_weight: 2.0, share_weight: 3.0, watch_time_weight: 1.5, recency_decay_hours: 24.0 });
      }

      const { data: tagData } = await supabase
        .from('managed_hashtags')
        .select('*')
        .order('usage_count', { ascending: false });

      setHashtags(tagData || []);
    } catch (err: any) {
      console.error('Error fetching feed algorithm data:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load feed algorithm data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from('feed_algorithm_config')
        .upsert({
          id: 1,
          like_weight: Number(config.like_weight),
          comment_weight: Number(config.comment_weight),
          share_weight: Number(config.share_weight),
          watch_time_weight: Number(config.watch_time_weight),
          recency_decay_hours: Number(config.recency_decay_hours),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'Feed algorithm weights and decay parameters updated successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save feed algorithm config' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddHashtag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');

    try {
      const { error } = await supabase
        .from('managed_hashtags')
        .insert({
          tag: cleanTag,
          is_pinned: false,
          is_blacklisted: false,
          usage_count: 0
        });

      if (error) throw error;
      setNewTagInput('');
      setStatusMsg({ type: 'success', text: `Added hashtag #${cleanTag} successfully!` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add hashtag' });
    }
  };

  const handleToggleHashtag = async (id: string, field: 'is_pinned' | 'is_blacklisted', currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('managed_hashtags')
        .update({ [field]: !currentValue })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update hashtag status' });
    }
  };

  const handleDeleteHashtag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('managed_hashtags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'Hashtag deleted successfully' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete hashtag' });
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Sliders className="w-7 h-7 text-purple-400" />
            Feed Algorithm & Hashtag Manager
          </h1>
          <p className="text-sm text-zinc-400">Tune feed ranking formula weights, decay curves, and curate trending/blacklisted hashtags.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all border border-zinc-700 self-start"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Feed Algorithm Weights */}
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
            <Flame className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-bold text-base">Feed Scoring Formula Weights</h2>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300 font-semibold">Like Weight</span>
                <span className="text-purple-400 font-bold">{config.like_weight}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={config.like_weight}
                onChange={(e) => setConfig({ ...config, like_weight: parseFloat(e.target.value) })}
                className="w-full accent-purple-500 bg-zinc-900 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300 font-semibold">Comment Weight</span>
                <span className="text-purple-400 font-bold">{config.comment_weight}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={config.comment_weight}
                onChange={(e) => setConfig({ ...config, comment_weight: parseFloat(e.target.value) })}
                className="w-full accent-purple-500 bg-zinc-900 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300 font-semibold">Share Weight</span>
                <span className="text-purple-400 font-bold">{config.share_weight}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={config.share_weight}
                onChange={(e) => setConfig({ ...config, share_weight: parseFloat(e.target.value) })}
                className="w-full accent-purple-500 bg-zinc-900 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300 font-semibold">Watch Time Weight</span>
                <span className="text-purple-400 font-bold">{config.watch_time_weight}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={config.watch_time_weight}
                onChange={(e) => setConfig({ ...config, watch_time_weight: parseFloat(e.target.value) })}
                className="w-full accent-purple-500 bg-zinc-900 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-300 font-semibold">Recency Decay Half-Life (Hours)</span>
                <span className="text-purple-400 font-bold">{config.recency_decay_hours} hrs</span>
              </div>
              <input
                type="number"
                step="1"
                value={config.recency_decay_hours}
                onChange={(e) => setConfig({ ...config, recency_decay_hours: parseFloat(e.target.value) || 24 })}
                className="w-full bg-[#0f0f11] border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingConfig ? 'Saving Formula...' : 'Save Algorithm Weights'}</span>
            </button>
          </form>
        </div>

        {/* Section 2: Hashtag Manager */}
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
            <Hash className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-bold text-base">Trending & Blacklisted Hashtags</h2>
          </div>

          <form onSubmit={handleAddHashtag} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">#</span>
              <input
                type="text"
                placeholder="Add hashtag (e.g. viral, avsocial)..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="w-full bg-[#0f0f11] border border-zinc-800 rounded-xl pl-7 pr-4 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>

          {loading ? (
            <div className="text-center py-8 text-zinc-500 text-xs">Loading hashtags...</div>
          ) : hashtags.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">No managed hashtags found.</div>
          ) : (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {hashtags.map((item) => (
                <div key={item.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold text-xs flex items-center gap-2">
                      <span>#{item.tag}</span>
                      {item.is_pinned && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold">Pinned</span>
                      )}
                      {item.is_blacklisted && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold">Blacklisted</span>
                      )}
                    </div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">Usage Count: {item.usage_count || 0} posts</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleHashtag(item.id, 'is_pinned', item.is_pinned)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${item.is_pinned ? 'bg-purple-600 text-white border-purple-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                    >
                      {item.is_pinned ? 'Pinned' : 'Pin'}
                    </button>
                    <button
                      onClick={() => handleToggleHashtag(item.id, 'is_blacklisted', item.is_blacklisted)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${item.is_blacklisted ? 'bg-red-600 text-white border-red-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                    >
                      {item.is_blacklisted ? 'Blacklisted' : 'Block'}
                    </button>
                    <button
                      onClick={() => handleDeleteHashtag(item.id)}
                      className="p-1.5 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
