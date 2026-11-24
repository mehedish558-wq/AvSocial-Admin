import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { logAuditAction } from '../lib/audit';
import { ReportedContent } from '../types/admin';
import { ShieldAlert, Trash2, AlertTriangle, Eye, CheckCircle2, MessageSquare, AlertOctagon, Sparkles, Search, FileText, CheckSquare, Square, UserCheck } from 'lucide-react';

export const Moderation: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [reports, setReports] = useState<ReportedContent[]>([]);

  const [activeTab, setActiveTab] = useState<'REPORTS' | 'POSTS' | 'REELS' | 'STORIES' | 'COMMENTS'>('REPORTS');
  const [loading, setLoading] = useState(true);

  // Search & Advanced Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('ALL');

  // Bulk Selection
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

  // Warning Modal
  const [warnReport, setWarnReport] = useState<ReportedContent | null>(null);
  const [warnReason, setWarnReason] = useState('');

  // Item Preview Modal
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeHandle = localStorage.getItem('admin_handle') || 'admin';

  useEffect(() => {
    fetchContent();

    // Supabase Realtime for Multi-Moderator sync
    const channel = supabase
      .channel('public:reported_content_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reported_content' },
        () => {
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      if (activeTab === 'POSTS') {
        let { data, error } = await supabase.from('posts').select('*').order('timestamp', { ascending: false }).limit(100);
        if (error || !data || data.length === 0) {
          const res = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(100);
          if (res.data && res.data.length > 0) data = res.data;
          else {
            const res2 = await supabase.from('posts').select('*').order('id', { ascending: false }).limit(100);
            data = res2.data;
          }
        }
        setPosts(data || []);
      } else if (activeTab === 'REELS') {
        let { data, error } = await supabase.from('reels').select('*').order('timestamp', { ascending: false }).limit(100);
        if (error || !data || data.length === 0) {
          const res = await supabase.from('reels').select('*').order('created_at', { ascending: false }).limit(100);
          if (res.data && res.data.length > 0) data = res.data;
          else {
            const res2 = await supabase.from('reels').select('*').order('id', { ascending: false }).limit(100);
            data = res2.data;
          }
        }
        setReels(data || []);
      } else if (activeTab === 'STORIES') {
        let { data, error } = await supabase.from('stories').select('*').order('created_at', { ascending: false }).limit(100);
        if (error || !data || data.length === 0) {
          const res = await supabase.from('stories').select('*').order('timestamp', { ascending: false }).limit(100);
          if (res.data && res.data.length > 0) data = res.data;
          else {
            const res2 = await supabase.from('stories').select('*').order('id', { ascending: false }).limit(100);
            data = res2.data;
          }
        }
        setStories(data || []);
      } else if (activeTab === 'COMMENTS') {
        let { data, error } = await supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(100);
        if (error || !data || data.length === 0) {
          const res = await supabase.from('comments').select('*').order('timestamp', { ascending: false }).limit(100);
          if (res.data && res.data.length > 0) data = res.data;
          else {
            const res2 = await supabase.from('comments').select('*').order('id', { ascending: false }).limit(100);
            data = res2.data;
          }
        }
        setComments(data || []);
      } else if (activeTab === 'REPORTS') {
        let { data, error } = await supabase.from('reported_content').select('*').order('created_at', { ascending: false });
        if (error || !data) {
          const { data: pluralData } = await supabase.from('reported_contents').select('*').order('created_at', { ascending: false });
          data = pluralData;
        }
        setReports(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: number | string) => {
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_content', {
        p_content_type: 'POST',
        p_content_id: String(id)
      });
      if (rpcErr) {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;
      }
      await logAuditAction(activeHandle, 'DELETE_POST', `Post #${id}`, `Deleted post #${id}`);
      setStatusMsg({ type: 'success', text: `Deleted post #${id}` });
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete post' });
    }
  };

  const handleDeleteReel = async (id: number | string) => {
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_content', {
        p_content_type: 'REEL',
        p_content_id: String(id)
      });
      if (rpcErr) {
        const { error } = await supabase.from('reels').delete().eq('id', id);
        if (error) throw error;
      }
      await logAuditAction(activeHandle, 'DELETE_REEL', `Reel #${id}`, `Deleted reel #${id}`);
      setStatusMsg({ type: 'success', text: `Deleted reel #${id}` });
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete reel' });
    }
  };

  const handleDeleteStory = async (id: number | string) => {
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_content', {
        p_content_type: 'STORY',
        p_content_id: String(id)
      });
      if (rpcErr) {
        const { error } = await supabase.from('stories').delete().eq('id', id);
        if (error) throw error;
      }
      await logAuditAction(activeHandle, 'DELETE_STORY', `Story #${id}`, `Deleted story #${id}`);
      setStatusMsg({ type: 'success', text: `Deleted story #${id}` });
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete story' });
    }
  };

  const handleDeleteComment = async (id: number | string) => {
    try {
      const { error: rpcErr } = await supabase.rpc('admin_delete_content', {
        p_content_type: 'COMMENT',
        p_content_id: String(id)
      });
      if (rpcErr) {
        const { error } = await supabase.from('comments').delete().eq('id', id);
        if (error) throw error;
      }
      await logAuditAction(activeHandle, 'DELETE_COMMENT', `Comment #${id}`, `Deleted comment #${id}`);
      setStatusMsg({ type: 'success', text: `Deleted comment #${id}` });
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete comment' });
    }
  };

  const handleResolveReport = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      const updatePayload = { status, resolved_by: activeHandle };
      const { error: rpcErr } = await supabase.rpc('admin_update_report_status', {
        p_report_id: reportId,
        p_status: status
      });
      if (rpcErr) {
        const { error } = await supabase.from('reported_content').update(updatePayload).eq('id', reportId);
        if (error) {
          await supabase.from('reported_contents').update(updatePayload).eq('id', reportId);
        }
      } else {
        await supabase.from('reported_content').update({ resolved_by: activeHandle }).eq('id', reportId);
      }
      await logAuditAction(activeHandle, `REPORT_${status}`, `Report #${reportId}`, `Report marked as ${status} by @${activeHandle}`);
      setStatusMsg({ type: 'success', text: `Report #${reportId} marked as ${status}` });
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update report' });
    }
  };

  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNybHJqa3BveGxrYnBqZnFueXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTY5MTQsImV4cCI6MjEwMTY5MjkxNH0.khdA6Dm5RinWa00YdKKrQY9sJ1r553GEMxIll5i6Wdk';

  const encodePathKey = (key: string) => {
    if (!key) return '';
    const clean = key.startsWith('/') ? key.substring(1) : key;
    return clean.split('/').map(segment => encodeURIComponent(segment)).join('/');
  };

  const resolveMediaUrl = (path?: string) => {
    if (!path) return '';
    const p = String(path).trim();
    if (!p || p === 'default' || p === 'none' || p === 'null' || p === 'undefined') return '';
    if (p.startsWith('content://') || p.startsWith('file://')) return '';

    if (p.startsWith('http://') || p.startsWith('https://')) {
      if (p.includes('supabase.co/functions/v1/r2-download')) {
        if (!p.includes('apikey=')) {
          const sep = p.includes('?') ? '&' : '?';
          return `${p}${sep}apikey=${SUPABASE_ANON_KEY}`;
        }
        return p;
      }
      if (p.includes('.r2.cloudflarestorage.com/') || p.includes('.r2.dev/')) {
        const key = p.includes('.r2.cloudflarestorage.com/')
          ? p.substring(p.indexOf('.r2.cloudflarestorage.com/') + 26).split('?')[0]
          : p.substring(p.indexOf('.r2.dev/') + 8).split('?')[0];
        return `https://crlrjkpoxlkbpjfqnyyr.supabase.co/functions/v1/r2-download?path=${encodePathKey(key)}&apikey=${SUPABASE_ANON_KEY}`;
      }
      return p;
    }

    return `https://crlrjkpoxlkbpjfqnyyr.supabase.co/functions/v1/r2-download?path=${encodePathKey(p)}&apikey=${SUPABASE_ANON_KEY}`;
  };

  const checkIsVideo = (cnt: any, contentType: string) => {
    if (!cnt) return false;
    const type = (contentType || '').toUpperCase();

    const checkIsImage = (urlOrPath: string) => {
      const s = urlOrPath.toLowerCase();
      return s.endsWith('.jpg') || s.endsWith('.jpeg') || s.endsWith('.png') || s.endsWith('.webp') || s.endsWith('.gif') || s.includes('/images/') || s.includes('/posts/images/');
    };

    const videoUrl = String(cnt.video_url || '').trim();
    const storagePath = String(cnt.storage_path || '').trim();
    const mediaUrl = String(cnt.media_url || '').trim();
    const postImageRes = String(cnt.post_image_res || '').trim();

    if (videoUrl && checkIsImage(videoUrl)) return false;
    if (storagePath && checkIsImage(storagePath)) return false;
    if (mediaUrl && checkIsImage(mediaUrl)) return false;
    if (postImageRes && checkIsImage(postImageRes)) return false;

    if (type === 'REEL') return true;
    if (cnt.is_reel_post === true) return true;
    if (cnt.mime_type && String(cnt.mime_type).toLowerCase().startsWith('video/')) return true;

    if (videoUrl && (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.mov') || videoUrl.endsWith('.webm') || videoUrl.includes('/reels/'))) return true;
    if (storagePath && (storagePath.endsWith('.mp4') || storagePath.endsWith('.mov') || storagePath.endsWith('.webm') || storagePath.includes('/reels/'))) return true;

    return false;
  };

  const getVideoSources = (key: string) => {
    if (!key) return [];
    const k = key.trim();
    if (k.startsWith('http://') || k.startsWith('https://')) {
      const primary = k.includes('r2-download') && !k.includes('apikey=') ? `${k}${k.includes('?') ? '&' : '?'}apikey=${SUPABASE_ANON_KEY}` : k;
      const list = [primary];
      if (k.includes('.r2.cloudflarestorage.com/') || k.includes('.r2.dev/')) {
        const extracted = k.includes('.r2.cloudflarestorage.com/')
          ? k.substring(k.indexOf('.r2.cloudflarestorage.com/') + 26).split('?')[0]
          : k.substring(k.indexOf('.r2.dev/') + 8).split('?')[0];
        list.push(`https://crlrjkpoxlkbpjfqnyyr.supabase.co/functions/v1/r2-download?path=${encodePathKey(extracted)}&apikey=${SUPABASE_ANON_KEY}`);
      }
      return list;
    }
    return [
      `https://crlrjkpoxlkbpjfqnyyr.supabase.co/functions/v1/r2-download?path=${encodePathKey(k)}&apikey=${SUPABASE_ANON_KEY}`
    ];
  };

  const getImageSources = (key: string) => {
    if (!key) return [];
    const k = key.trim();
    if (k.startsWith('http://') || k.startsWith('https://')) {
      const primary = k.includes('r2-download') && !k.includes('apikey=') ? `${k}${k.includes('?') ? '&' : '?'}apikey=${SUPABASE_ANON_KEY}` : k;
      const list = [primary];
      if (k.includes('.r2.cloudflarestorage.com/') || k.includes('.r2.dev/')) {
        const extracted = k.includes('.r2.cloudflarestorage.com/')
          ? k.substring(k.indexOf('.r2.cloudflarestorage.com/') + 26).split('?')[0]
          : k.substring(k.indexOf('.r2.dev/') + 8).split('?')[0];
        list.push(`https://crlrjkpoxlkbpjfqnyyr.supabase.co/functions/v1/r2-download?path=${encodePathKey(extracted)}&apikey=${SUPABASE_ANON_KEY}`);
      }
      return list;
    }
    return [
      `https://crlrjkpoxlkbpjfqnyyr.supabase.co/functions/v1/r2-download?path=${encodePathKey(k)}&apikey=${SUPABASE_ANON_KEY}`
    ];
  };

  const AuthenticatedVideoPreview: React.FC<{ rawKey: string }> = ({ rawKey }) => {
    const [videoSrc, setVideoSrc] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    useEffect(() => {
      let objectUrl = '';
      let isMounted = true;

      const loadVideo = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
          const sources = getVideoSources(rawKey);
          let blob: Blob | null = null;
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          for (const src of sources) {
            try {
              const res = await fetch(src, {
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
              });
              if (res.ok) {
                blob = await res.blob();
                break;
              }
            } catch (e) {
              // try next source
            }
          }

          if (!blob && sources.length > 0) {
            if (isMounted) {
              setVideoSrc(sources[0]);
              setLoading(false);
            }
            return;
          }

          if (blob && isMounted) {
            objectUrl = URL.createObjectURL(blob);
            setVideoSrc(objectUrl);
            setLoading(false);
          }
        } catch (err: any) {
          if (isMounted) {
            setErrorMsg(err.message || 'Failed to load video stream');
            setLoading(false);
          }
        }
      };

      if (rawKey) {
        loadVideo();
      } else {
        setLoading(false);
      }

      return () => {
        isMounted = false;
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [rawKey]);

    if (loading) {
      return (
        <div className="h-64 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-purple-500/30 flex flex-col items-center justify-center p-6 space-y-3 shadow-inner">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/20" />
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-white tracking-wide">Fetching Secure Video Stream...</p>
            <p className="text-[10px] text-zinc-400 font-mono">Authenticating with R2 Gateway & Loading Blob</p>
          </div>
        </div>
      );
    }

    if (errorMsg && !videoSrc) {
      return (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center space-y-3">
          <p className="font-bold text-sm">Failed to load video stream</p>
          <p className="text-[11px] text-zinc-400">{errorMsg}</p>
          <a
            href={getVideoSources(rawKey)[0] || '#'}
            target="_blank"
            rel="noreferrer"
            className="inline-block px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-500 transition-all shadow-md"
          >
            Open Video Direct in New Tab ↗
          </a>
        </div>
      );
    }

    const primarySource = videoSrc || (getVideoSources(rawKey)[0] ?? '');

    const togglePlay = () => {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    return (
      <div className="space-y-3 bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-purple-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Secure Video Player
          </span>
          <a
            href={primarySource}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-zinc-400 hover:text-white font-bold underline transition-colors"
          >
            Open Original ↗
          </a>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-black border border-zinc-800/80 group flex items-center justify-center shadow-2xl">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            autoPlay
            playsInline
            muted
            className="max-h-[420px] w-full object-contain cursor-pointer"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={(e) => {
              console.error('Video playback error:', e);
              setErrorMsg('Browser failed to decode or play video format.');
            }}
          >
            Your browser does not support HTML5 video playback.
          </video>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md pointer-events-auto hover:bg-purple-500 transition-transform transform hover:scale-110"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AuthenticatedImagePreview: React.FC<{ rawKey: string }> = ({ rawKey }) => {
    const [imageSrc, setImageSrc] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
      let isMounted = true;

      const loadImage = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
          const sources = getImageSources(rawKey);
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          // Try each source until one responds OK
          for (const src of sources) {
            try {
              const res = await fetch(src, {
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
              });
              if (res.ok) {
                // Use this URL directly for  src (crossOrigin allows authenticated fetch)
                if (isMounted) {
                  setImageSrc(src);
                  setLoading(false);
                }
                return;
              }
            } catch (e) {
              // try next source
            }
          }

          if (isMounted && sources.length > 0) {
            setImageSrc(sources[0]);
            setLoading(false);
          }
        } catch (err: any) {
          if (isMounted) {
            setErrorMsg(err.message || 'Failed to load image');
            setLoading(false);
          }
        }
      };

      if (rawKey) {
        loadImage();
      } else {
        setLoading(false);
      }

      return () => { isMounted = false; };
    }, [rawKey]);

    if (loading) {
      return (
        <div className="h-64 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-purple-500/30 flex flex-col items-center justify-center p-6 space-y-3 shadow-inner">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-purple-500/20" />
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-white tracking-wide">Loading Image...</p>
            <p className="text-[10px] text-zinc-400 font-mono">Fetching from R2 Storage</p>
          </div>
        </div>
      );
    }

    if (errorMsg && !imageSrc) {
      return (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center space-y-3">
          <p className="font-bold text-sm">Failed to load image</p>
          <div className="mt-2">
            <a
              href={getImageSources(rawKey)[0] || '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl text-xs hover:text-white transition-all shadow-md"
            >
              View Original ↗
            </a>
            <a
              href={getImageSources(rawKey)[0] || '#'}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-700/50 transition-all"
            >
              Copy Link
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          <span className="text-[11px] text-zinc-400 font-mono truncate max-w-xs">{rawKey}</span>
          <a
            href={imageSrc || getImageSources(rawKey)[0] || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 shrink-0"
          >
            🔗 View Original Media ↗
          </a>
        </div>
        <div className="rounded-xl overflow-hidden bg-black/60 border border-zinc-800 max-h-96 flex items-center justify-center p-1">
          <img
            src={imageSrc}
            alt="Reported Media"
            crossOrigin="anonymous"
            className="max-h-96 w-full object-contain rounded-lg"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
            }}
          />
        </div>
      </div>
    );
  };

  const handlePreviewReportedContent = async (report: ReportedContent) => {
    try {
      const type = (report.content_type || 'POST').toUpperCase();
      const contentId = (report.content_id || '').trim();
      const targetHandle = (report.target_handle || '').trim();
      let fetchedContent: any = null;

      if (type === 'POST') {
        if (/^\d+$/.test(contentId)) {
          const { data } = await supabase.from('posts').select('*').eq('id', Number(contentId)).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && contentId) {
          const { data } = await supabase.from('posts').select('*').eq('remote_id', contentId).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && targetHandle) {
          const { data } = await supabase.from('posts').select('*').eq('user_handle', targetHandle).order('timestamp', { ascending: false }).limit(1).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (fetchedContent) fetchedContent._type = 'POST';
      } else if (type === 'REEL') {
        if (/^\d+$/.test(contentId)) {
          const { data } = await supabase.from('reels').select('*').eq('id', Number(contentId)).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && contentId) {
          const { data } = await supabase.from('reels').select('*').eq('remote_id', contentId).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && targetHandle) {
          const { data } = await supabase.from('reels').select('*').eq('handle', targetHandle).order('timestamp', { ascending: false }).limit(1).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (fetchedContent) fetchedContent._type = 'REEL';
      } else if (type === 'STORY') {
        if (/^\d+$/.test(contentId)) {
          const { data } = await supabase.from('stories').select('*').eq('id', Number(contentId)).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && contentId) {
          const { data } = await supabase.from('stories').select('*').eq('remote_id', contentId).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && targetHandle) {
          const { data } = await supabase.from('stories').select('*').eq('user_handle', targetHandle).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (fetchedContent) fetchedContent._type = 'STORY';
      } else if (type === 'COMMENT') {
        if (/^\d+$/.test(contentId)) {
          const { data } = await supabase.from('comments').select('*').eq('id', Number(contentId)).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && contentId) {
          const { data } = await supabase.from('comments').select('*').eq('id', contentId).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (fetchedContent) fetchedContent._type = 'COMMENT';
      } else if (type === 'USER') {
        if (targetHandle) {
          const { data } = await supabase.from('app_users').select('*').eq('handle', targetHandle).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (!fetchedContent && contentId) {
          const { data } = await supabase.from('app_users').select('*').eq('uid', contentId).maybeSingle();
          if (data) fetchedContent = data;
        }
        if (fetchedContent) fetchedContent._type = 'USER';
      }

      setPreviewItem({
        report: report,
        content: fetchedContent
      });
    } catch (err: any) {
      console.error('Error fetching preview:', err);
      setPreviewItem({
        report: report,
        content: null
      });
    }
  };

  const handleDeleteReportedContent = async (report: ReportedContent) => {
    if (!confirm(`Are you sure you want to delete the reported ${report.content_type} #${report.content_id}?`)) return;
    try {
      const type = (report.content_type || 'POST').toUpperCase();
      const contentId = report.content_id;

      if (type === 'POST') {
        await handleDeletePost(contentId);
      } else if (type === 'REEL') {
        await handleDeleteReel(contentId);
      } else if (type === 'STORY') {
        await handleDeleteStory(contentId);
      } else if (type === 'COMMENT') {
        await handleDeleteComment(contentId);
      } else if (type === 'USER') {
        await supabase.from('app_users').update({ is_banned: true }).eq('handle', report.target_handle);
      }

      await handleResolveReport(report.id, 'RESOLVED');
      setStatusMsg({ type: 'success', text: `Deleted reported ${type} #${contentId} and marked report resolved!` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete reported content' });
    }
  };

  const handleClaimReport = async (reportId: string, currentAssigned: string | undefined) => {
    try {
      const newAssignee = currentAssigned === activeHandle ? null : activeHandle;
      await supabase.from('reported_content').update({ assigned_to: newAssignee }).eq('id', reportId);
      await logAuditAction(activeHandle, 'ASSIGN_REPORT', `Report #${reportId}`, newAssignee ? `Claimed report #${reportId}` : `Unclaimed report #${reportId}`);
      setStatusMsg({ type: 'success', text: newAssignee ? `Claimed report #${reportId}` : `Unassigned report #${reportId}` });
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to assign report' });
    }
  };

  const handleBulkAction = async (status: 'RESOLVED' | 'DISMISSED') => {
    if (selectedReportIds.length === 0) return;
    try {
      for (const id of selectedReportIds) {
        await supabase.from('reported_content').update({ status, resolved_by: activeHandle }).eq('id', id);
      }
      await logAuditAction(activeHandle, `BULK_REPORT_${status}`, `${selectedReportIds.length} reports`, `Bulk updated ${selectedReportIds.length} reports to ${status}`);
      setStatusMsg({ type: 'success', text: `Successfully updated ${selectedReportIds.length} reports to ${status}` });
      setSelectedReportIds([]);
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to execute bulk action' });
    }
  };

  const handleIssueWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warnReport) return;
    try {
      const targetHandle = warnReport.target_handle || warnReport.reporter_handle;
      const { error: rpcErr } = await supabase.rpc('admin_issue_user_warning', {
        p_target_handle: targetHandle,
        p_reason: warnReason,
        p_report_id: warnReport.id
      });

      if (rpcErr) {
        const { error } = await supabase.from('user_warnings').insert({
          target_handle: targetHandle,
          reason: warnReason,
          report_id: warnReport.id,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        await supabase.from('reported_content').update({ status: 'RESOLVED', resolved_by: activeHandle }).eq('id', warnReport.id);
      }

      await logAuditAction(activeHandle, 'ISSUE_WARNING', `@${targetHandle}`, `Warning issued for: ${warnReason}`);
      setStatusMsg({ type: 'success', text: `Warning issued to @${targetHandle} and report resolved!` });
      setWarnReport(null);
      setWarnReason('');
      fetchContent();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to issue warning' });
    }
  };

  // Filtered lists
  const q = searchQuery.toLowerCase();
  const filteredPosts = posts.filter(p => (p.user_handle || p.username || '').toLowerCase().includes(q) || (p.caption || p.content || '').toLowerCase().includes(q));
  const filteredReels = reels.filter(r => (r.handle || r.author || '').toLowerCase().includes(q) || (r.caption || '').toLowerCase().includes(q));
  const filteredStories = stories.filter(s => (s.user_handle || s.author || '').toLowerCase().includes(q) || (s.caption || '').toLowerCase().includes(q));
  const filteredComments = comments.filter(c => (c.user_handle || c.author || '').toLowerCase().includes(q) || (c.comment_text || c.text || '').toLowerCase().includes(q));

  const filteredReports = reports.filter(rep => {
    const matchesSearch = (rep.reporter_handle || '').toLowerCase().includes(q) || (rep.target_handle || '').toLowerCase().includes(q) || (rep.reason || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || (rep.status || 'PENDING').toUpperCase() === statusFilter;
    const matchesAssignment =
      assignmentFilter === 'ALL' ||
      (assignmentFilter === 'UNASSIGNED' && !rep.assigned_to) ||
      (assignmentFilter === 'ASSIGNED_TO_ME' && (rep.assigned_to || '').toLowerCase() === activeHandle.toLowerCase());
    return matchesSearch && matchesStatus && matchesAssignment;
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Content & User Reports Moderation Hub <ShieldAlert className="w-6 h-6 text-purple-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review user report complaints, flag and delete reported posts, reels, stories, comments & manage user warnings with real-time multi-moderator sync
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

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
        <div className="flex space-x-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'REPORTS'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-zinc-900 text-red-400 hover:text-white'
            }`}
          >
            <AlertOctagon className="w-4 h-4" /> User Reports Queue ({reports.filter((r) => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('POSTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'POSTS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('REELS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'REELS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Reels ({reels.length})
          </button>
          <button
            onClick={() => setActiveTab('STORIES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'STORIES'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Stories ({stories.length})
          </button>
          <button
            onClick={() => setActiveTab('COMMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'COMMENTS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Comments ({comments.length})
          </button>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {activeTab === 'REPORTS' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Status: All</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="DISMISSED">Dismissed</option>
              </select>

              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">Assign: All</option>
                <option value="ASSIGNED_TO_ME">Assigned to Me</option>
                <option value="UNASSIGNED">Unassigned</option>
              </select>
            </>
          )}

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search author, caption or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar for Reports */}
      {activeTab === 'REPORTS' && selectedReportIds.length > 0 && (
        <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl flex items-center justify-between">
          <span className="text-xs font-bold text-purple-300">
            Selected {selectedReportIds.length} report(s)
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkAction('RESOLVED')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg"
            >
              Bulk Resolve
            </button>
            <button
              onClick={() => handleBulkAction('DISMISSED')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-lg"
            >
              Bulk Dismiss
            </button>
            <button
              onClick={() => setSelectedReportIds([])}
              className="text-xs text-zinc-400 underline"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Content Table */}
      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {activeTab === 'REPORTS' ? (
            /* REPORTS TABLE */
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4 w-10">
                    <button
                      onClick={() => {
                        if (selectedReportIds.length === filteredReports.length) {
                          setSelectedReportIds([]);
                        } else {
                          setSelectedReportIds(filteredReports.map(r => r.id));
                        }
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      {selectedReportIds.length > 0 && selectedReportIds.length === filteredReports.length ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Report ID / Type</th>
                  <th className="p-4">Reporter</th>
                  <th className="p-4">Reported Target</th>
                  <th className="p-4">Violation Reason</th>
                  <th className="p-4">Status & Assignment</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">Loading user reports queue...</td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">No user reports found matching criteria.</td>
                  </tr>
                ) : (
                  filteredReports.map((r) => {
                    const isSelected = selectedReportIds.includes(r.id);
                    const isClaimedByMe = (r.assigned_to || '').toLowerCase() === activeHandle.toLowerCase();
                    return (
                      <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-4">
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedReportIds(selectedReportIds.filter(id => id !== r.id));
                              } else {
                                setSelectedReportIds([...selectedReportIds, r.id]);
                              }
                            }}
                            className="text-zinc-400 hover:text-white"
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="font-mono font-bold text-white">#{r.id}</div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {r.content_type || 'POST'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-zinc-300">@{r.reporter_handle}</td>
                        <td className="p-4 font-mono text-yellow-400 font-bold">@{r.target_handle || 'N/A'}</td>
                        <td className="p-4 text-zinc-200 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                        <td className="p-4 space-y-1">
                          <div>
                            {r.status === 'RESOLVED' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                RESOLVED {r.resolved_by ? `by @${r.resolved_by}` : ''}
                              </span>
                            ) : r.status === 'DISMISSED' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-700/50 text-zinc-400 border border-zinc-600/30">
                                DISMISSED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                PENDING
                              </span>
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => handleClaimReport(r.id, r.assigned_to)}
                              className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-all ${
                                isClaimedByMe
                                  ? 'bg-purple-600 text-white border-purple-500'
                                  : r.assigned_to
                                  ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
                              }`}
                              title={r.assigned_to ? `Assigned to @${r.assigned_to}` : 'Click to claim'}
                            >
                              {r.assigned_to ? `👤 @${r.assigned_to}` : '📌 Claim'}
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-1.5 flex items-center justify-end">
                          <button
                            onClick={() => handlePreviewReportedContent(r)}
                            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/20 font-bold flex items-center space-x-1"
                            title="Inspect reported post, reel, or content"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Content</span>
                          </button>

                          {r.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleDeleteReportedContent(r)}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/20 font-bold flex items-center space-x-1"
                                title="Delete reported item directly"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                              <button
                                onClick={() => {
                                  setWarnReport(r);
                                  setWarnReason(`Violation of community guidelines regarding: ${r.reason}`);
                                }}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/20 font-bold"
                                title="Issue Warning & Resolve"
                              >
                                Warn User
                              </button>
                              <button
                                onClick={() => handleResolveReport(r.id, 'RESOLVED')}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/20 font-bold"
                                title="Mark Resolved"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 font-bold"
                                title="Dismiss Report"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'POSTS' ? (
            /* POSTS TABLE */
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Post ID</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Caption / Content</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredPosts.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No posts found.</td></tr>
                ) : (
                  filteredPosts.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">#{p.id}</td>
                      <td className="p-4 font-mono text-purple-300">@{p.user_handle || p.username || 'unknown'}</td>
                      <td className="p-4 text-zinc-200 max-w-md truncate">{p.caption || p.content || '[Media Post]'}</td>
                      <td className="p-4 text-zinc-500 font-mono text-[11px]">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleDeletePost(p.id)}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 font-bold"
                        >
                          Delete Post
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'REELS' ? (
            /* REELS TABLE */
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Reel ID</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Caption</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredReels.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No reels found.</td></tr>
                ) : (
                  filteredReels.map(r => (
                    <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">#{r.id}</td>
                      <td className="p-4 font-mono text-purple-300">@{r.handle || r.author || 'unknown'}</td>
                      <td className="p-4 text-zinc-200 max-w-md truncate">{r.caption || '[Reel Video]'}</td>
                      <td className="p-4 text-zinc-500 font-mono text-[11px]">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleDeleteReel(r.id)}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 font-bold"
                        >
                          Delete Reel
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'STORIES' ? (
            /* STORIES TABLE */
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Story ID</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Caption</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredStories.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No stories found.</td></tr>
                ) : (
                  filteredStories.map(s => (
                    <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">#{s.id}</td>
                      <td className="p-4 font-mono text-purple-300">@{s.user_handle || s.author || 'unknown'}</td>
                      <td className="p-4 text-zinc-200 max-w-md truncate">{s.caption || '[Story Media]'}</td>
                      <td className="p-4 text-zinc-500 font-mono text-[11px]">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleDeleteStory(s.id)}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 font-bold"
                        >
                          Delete Story
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* COMMENTS TABLE */
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Comment ID</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Comment Text</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredComments.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No comments found.</td></tr>
                ) : (
                  filteredComments.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">#{c.id}</td>
                      <td className="p-4 font-mono text-purple-300">@{c.user_handle || c.author || 'unknown'}</td>
                      <td className="p-4 text-zinc-200 max-w-md truncate">{c.comment_text || c.text || ''}</td>
                      <td className="p-4 text-zinc-500 font-mono text-[11px]">{new Date(c.created_at).toLocaleString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 font-bold"
                        >
                          Delete Comment
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* WARNING MODAL */}
      {warnReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleIssueWarning} className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Issue Warning to @{warnReport.target_handle || warnReport.reporter_handle}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Reason / Notice Message</label>
              <textarea
                required
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setWarnReport(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                Send Warning & Resolve Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENT PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" /> Reported Content Inspection (#{previewItem.report.id})
              </h2>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-zinc-400 hover:text-white font-mono font-bold text-sm px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            {/* Report Metadata Summary */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500">Reported Type: </span>
                  <span className="font-bold text-purple-400">{previewItem.report.content_type || 'POST'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Report ID: </span>
                  <span className="font-mono text-zinc-300">#{previewItem.report.id}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Reporter: </span>
                  <span className="font-mono text-indigo-300">@{previewItem.report.reporter_handle}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Reported Target: </span>
                  <span className="font-mono text-amber-400">@{previewItem.report.target_handle || 'N/A'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500">Violation Reason: </span>
                <span className="text-white font-medium">{previewItem.report.reason}</span>
              </div>
            </div>

            {/* Actual Content Media & Caption Preview */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Live Content Inspection</h3>
              {previewItem.content ? (() => {
                const cnt = previewItem.content;
                const isVideo = checkIsVideo(cnt, previewItem.report.content_type);

                const validKey = (val?: string) => {
                  if (!val) return '';
                  const s = String(val).trim();
                  if (!s || s === 'null' || s === 'undefined' || s === 'none' || s === 'default') return '';
                  return s;
                };

                const rawKey = isVideo
                  ? (validKey(cnt.video_url) || validKey(cnt.storage_path))
                  : (
                      validKey(cnt.storage_path) ||
                      validKey(cnt.post_image_res) ||
                      validKey(cnt.image_res) ||
                      validKey(cnt.cover_path) ||
                      validKey(cnt.cover_photo_path) ||
                      validKey(cnt.media_url) ||
                      validKey(cnt.thumbnail_path) ||
                      (previewItem.report.content_type === 'USER' ? validKey(cnt.user_avatar_path) : '')
                    );

                const mediaUrl = resolveMediaUrl(rawKey);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">@{cnt.user_handle || cnt.author || cnt.username || previewItem.report.target_handle}</span>
                      <span className="text-zinc-500 text-xs">• {cnt.created_at ? new Date(cnt.created_at).toLocaleString() : ''}</span>
                    </div>

                    {/* Media Rendering */}
                    {rawKey ? (
                      isVideo ? (
                        <AuthenticatedVideoPreview rawKey={rawKey} />
                      ) : (
                        <AuthenticatedImagePreview rawKey={rawKey} />
                      )
                    ) : null}

                    {/* Caption / Text */}
                    {(cnt.caption || cnt.content || cnt.text || cnt.comment_text) && (
                      <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800/60 text-sm text-zinc-100 whitespace-pre-wrap">
                        {cnt.caption || cnt.content || cnt.text || cnt.comment_text}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="p-8 text-center bg-zinc-900/50 rounded-xl border border-zinc-800 text-zinc-400 space-y-2">
                  <AlertOctagon className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-sm font-bold text-white">Content Not Found / Already Removed</p>
                  <p className="text-xs text-zinc-500">
                    The item (#{previewItem.report.content_id}) could not be retrieved. It may have been deleted by the user or previously moderated.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
              >
                Close Inspection
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    handleResolveReport(previewItem.report.id, 'DISMISSED');
                    setPreviewItem(null);
                  }}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl"
                >
                  Dismiss Report
                </button>
                <button
                  onClick={() => {
                    setWarnReport(previewItem.report);
                    setWarnReason(`Violation of community guidelines regarding: ${previewItem.report.reason}`);
                    setPreviewItem(null);
                  }}
                  className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl"
                >
                  Warn Author
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteReportedContent(previewItem.report);
                    setPreviewItem(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Content & Resolve</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
