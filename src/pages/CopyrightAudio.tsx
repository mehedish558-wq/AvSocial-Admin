import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AudioLibraryTrack, CopyrightClaim } from '../types/admin';
import { ensureAudioBucketExists } from '../lib/storage';
import { Music, AlertTriangle, Plus, Upload, CheckCircle2, XCircle, Play, RefreshCw, ShieldAlert, FileText } from 'lucide-react';

export const CopyrightAudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AUDIO' | 'CLAIMS'>('AUDIO');
  const [tracks, setTracks] = useState<AudioLibraryTrack[]>([]);
  const [claims, setClaims] = useState<CopyrightClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'AUDIO') {
        const { data, error } = await supabase
          .from('audio_library')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTracks(data || []);
      } else {
        const { data, error } = await supabase
          .from('copyright_claims')
          .select('*, audio_library:track_id(title, artist)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClaims(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching audio/claims:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile || !title.trim() || !artist.trim()) {
      setStatusMsg({ type: 'error', text: 'Please fill in title, artist, and select an audio file.' });
      return;
    }

    setUploading(true);
    try {
      await ensureAudioBucketExists();

      const fileExt = audioFile.name.split('.').pop() || 'mp3';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `tracks/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('audio-tracks')
        .upload(filePath, audioFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: insertErr } = await supabase
        .from('audio_library')
        .insert({
          title: title.trim(),
          artist: artist.trim(),
          audio_url: publicUrl,
          duration_seconds: 30, // default placeholder or estimate
          is_active: true
        });

      if (insertErr) throw insertErr;

      setStatusMsg({ type: 'success', text: `Successfully uploaded audio track "${title}"!` });
      setShowUploadModal(false);
      setTitle('');
      setArtist('');
      setAudioFile(null);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to upload audio track' });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleTrackActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('audio_library')
        .update({ is_active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to toggle track status' });
    }
  };

  const handleUpdateClaim = async (claimId: string, status: 'valid_strike' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('copyright_claims')
        .update({ status })
        .eq('id', claimId);

      if (error) throw error;
      setStatusMsg({ type: 'success', text: `Copyright claim marked as ${status.toUpperCase()}` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update claim' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Music className="w-7 h-7 text-purple-400" />
            Reels Audio & Copyright Manager
          </h1>
          <p className="text-sm text-zinc-400">Manage official background audio tracks, storage bucket uploads, and copyright infringement claims.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'AUDIO' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-900/40"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Audio Track</span>
            </button>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all border border-zinc-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 gap-6">
        <button
          onClick={() => setActiveTab('AUDIO')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'AUDIO' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <Music className="w-4 h-4" />
          <span>Audio Library ({tracks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('CLAIMS')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'CLAIMS' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Copyright Claims ({claims.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500 text-xs font-bold">Loading...</div>
      ) : activeTab === 'AUDIO' ? (
        tracks.length === 0 ? (
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
            <Music className="w-12 h-12 text-purple-400 mx-auto" />
            <h3 className="text-white font-bold text-base">No Audio Tracks Found</h3>
            <p className="text-zinc-400 text-xs">Upload official background audio tracks for creator reels.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tracks.map((track) => (
              <div key={track.id} className="bg-[#141418] border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-purple-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-sm">{track.title}</h3>
                    <p className="text-zinc-400 text-xs">{track.artist}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${track.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {track.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <audio controls src={track.audio_url} className="w-full h-10 accent-purple-500 bg-zinc-900 rounded-lg" />

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-zinc-500">
                  <span>Added: {new Date(track.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleToggleTrackActive(track.id, track.is_active)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all border ${track.is_active ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-purple-600 text-white border-purple-500'}`}
                  >
                    {track.is_active ? 'Disable Track' : 'Enable Track'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        claims.length === 0 ? (
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-white font-bold text-base">No Copyright Claims</h3>
            <p className="text-zinc-400 text-xs">There are no pending copyright infringement disputes at this time.</p>
          </div>
        ) : (
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400 bg-zinc-900/50">
                    <th className="p-4">Claimant</th>
                    <th className="p-4">Track Infringed</th>
                    <th className="p-4">Infringing Content ID</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-xs text-zinc-300">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-zinc-900/30 transition-all">
                      <td className="p-4 font-bold text-white">{claim.claimant_name}</td>
                      <td className="p-4">
                        <div className="text-white font-semibold">{claim.audio_library?.title || 'Unknown Track'}</div>
                        <div className="text-zinc-500 text-[11px]">{claim.audio_library?.artist || ''}</div>
                      </td>
                      <td className="p-4 font-mono text-zinc-400">{claim.infringing_content_id}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          claim.status === 'valid_strike' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          claim.status === 'rejected' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                          'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleUpdateClaim(claim.id, 'valid_strike')}
                          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg font-bold text-xs border border-red-500/30 transition-all"
                        >
                          Valid Strike
                        </button>
                        <button
                          onClick={() => handleUpdateClaim(claim.id, 'rejected')}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-bold text-xs border border-zinc-700 transition-all"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#141418] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                Upload New Audio Track
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUploadTrack} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Track Title</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Sunset Vibes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0f0f11] border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Artist / Creator</label>
                <input
                  type="text"
                  placeholder="e.g. AvSocial Music"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full bg-[#0f0f11] border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Audio File (MP3, WAV, AAC)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#0f0f11] border border-zinc-800 rounded-xl p-2 text-white text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40"
                >
                  {uploading ? 'Uploading to Bucket...' : 'Upload & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
