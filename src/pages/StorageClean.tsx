import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, AlertTriangle, RefreshCw, MessageSquare, Image as ImageIcon, Film, Eye, ExternalLink, Search, Database } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'POST' | 'REEL' | 'STORY';
  user_handle: string;
  media_url: string;
  caption?: string;
  created_at: string;
}

export const StorageClean: React.FC = () => {
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [fetchingMedia, setFetchingMedia] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    fetchStorageMedia();
  }, []);

  const fetchStorageMedia = async () => {
    setFetchingMedia(true);
    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, user_handle, media_url, caption, created_at')
        .not('media_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);

      const { data: reelsData } = await supabase
        .from('reels')
        .select('id, user_handle, video_url, caption, created_at')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);

      const items: MediaItem[] = [
        ...(postsData || []).map((p: any) => ({
          id: p.id,
          type: 'POST' as const,
          user_handle: p.user_handle || 'user',
          media_url: p.media_url,
          caption: p.caption,
          created_at: p.created_at
        })),
        ...(reelsData || []).map((r: any) => ({
          id: r.id,
          type: 'REEL' as const,
          user_handle: r.user_handle || 'user',
          media_url: r.video_url,
          caption: r.caption,
          created_at: r.created_at
        }))
      ];

      setMediaItems(items);
    } catch (err) {
      console.error('Failed to fetch storage media items:', err);
    } finally {
      setFetchingMedia(false);
    }
  };

  const handleCleanBrokenMedia = async () => {
    setLoading('media');
    try {
      const { error } = await supabase.rpc('admin_cleanup_broken_posts');
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'Cleaned up broken and orphaned media posts!' });
      fetchStorageMedia();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to clean broken media' });
    } finally {
      setLoading(null);
    }
  };

  const handleClearChatMessages = async () => {
    setLoading('chat');
    try {
      const { error } = await supabase.from('chat_messages').delete().neq('id', '0');
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'All chat messages cleared successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to clear chat messages' });
    } finally {
      setLoading(null);
    }
  };

  const handleClearStories = async () => {
    setLoading('stories');
    try {
      const { error } = await supabase.from('stories').delete().neq('id', '0');
      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'All platform stories cleared successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to clear stories' });
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    if (!confirm(`Permanently delete ${item.type} #${item.id} by @${item.user_handle}?`)) return;
    try {
      const { error } = await supabase.rpc('admin_delete_content', {
        p_content_type: item.type,
        p_content_id: item.id
      });
      if (error) throw error;

      setStatusMsg({ type: 'success', text: `Permanently deleted ${item.type} #${item.id}` });
      fetchStorageMedia();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete file' });
    }
  };

  const filteredItems = mediaItems.filter((item) => {
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.user_handle || '').toLowerCase().includes(q) ||
      (item.caption || '').toLowerCase().includes(q) ||
      (item.id || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Storage & Media Browser <Trash2 className="w-6 h-6 text-red-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Inspect cloud storage objects, browse uploaded images/videos & purge corrupted or illegal media files
        </p>
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
          <button onClick={() => setStatusMsg(null)} className="text-xs underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Clean Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="p-3 bg-purple-500/10 w-fit rounded-xl text-purple-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Clean Broken Media Posts</h3>
          <p className="text-xs text-zinc-400">
            Scans the posts table and removes empty rows or corrupted media URLs that no longer exist in cloud storage.
          </p>
          <button
            onClick={handleCleanBrokenMedia}
            disabled={loading === 'media'}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {loading === 'media' ? 'Cleaning...' : 'Clean Broken Posts'}
          </button>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="p-3 bg-blue-500/10 w-fit rounded-xl text-blue-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Clear Chat Messages History</h3>
          <p className="text-xs text-zinc-400">
            Clears legacy direct chat messages database table to optimize query speeds and reduce database payload.
          </p>
          <button
            onClick={handleClearChatMessages}
            disabled={loading === 'chat'}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {loading === 'chat' ? 'Clearing...' : 'Clear Chat Messages'}
          </button>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="p-3 bg-pink-500/10 w-fit rounded-xl text-pink-400">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Clear Expired Stories</h3>
          <p className="text-xs text-zinc-400">
            Purges expired story records and temporary media files to free up Cloud storage quota.
          </p>
          <button
            onClick={handleClearStories}
            disabled={loading === 'stories'}
            className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {loading === 'stories' ? 'Clearing...' : 'Clear Expired Stories'}
          </button>
        </div>
      </div>

      {/* Storage Media Objects Browser */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" /> Cloud Storage Media Objects ({mediaItems.length})
            </h2>
            <p className="text-xs text-zinc-400">Inspect uploaded media objects across buckets with live preview and instant deletion</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
              {['ALL', 'POST', 'REEL'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTypeFilter(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === tf ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search media ID or handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {fetchingMedia ? (
            <div className="col-span-4 p-8 text-center text-zinc-500">Loading storage media objects...</div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-4 p-8 text-center text-zinc-500">No storage media files found matching query.</div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="relative h-40 bg-zinc-950 flex items-center justify-center overflow-hidden">
                    {item.type === 'REEL' ? (
                      <div className="flex flex-col items-center gap-2 text-pink-400">
                        <Film className="w-10 h-10" />
                        <span className="text-[11px] font-bold">Short Video Reel</span>
                      </div>
                    ) : (
                      <img
                        src={item.media_url}
                        alt="Media Preview"
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                        }}
                      />
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white font-black text-[10px] backdrop-blur-sm border border-white/10">
                      {item.type}
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-purple-400 font-bold">@{item.user_handle}</span>
                      <span className="text-zinc-500 text-[10px]">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-2">{item.caption || 'No caption provided'}</p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-zinc-800/60 mt-2">
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View
                  </a>
                  <button
                    onClick={() => handleDeleteMedia(item)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Purge File
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
