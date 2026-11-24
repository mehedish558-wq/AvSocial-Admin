import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SystemAnnouncement } from '../types/admin';
import { Bell, Send, Megaphone, Plus, Trash2, CheckCircle2, XCircle, Smartphone, Search } from 'lucide-react';

export const Notifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BROADCAST' | 'ANNOUNCEMENTS'>('BROADCAST');
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Broadcast Form
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'USER'>('ALL');
  const [targetHandle, setTargetHandle] = useState('');
  const [sendingPush, setSendingPush] = useState(false);

  // New Announcement Modal
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annUrl, setAnnUrl] = useState('');
  const [isPopupModal, setIsPopupModal] = useState(false);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('system_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      setAnnouncements(data || []);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingPush(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        title: pushTitle,
        message: pushBody,
        recipient_handle: targetType === 'ALL' ? 'ALL_USERS' : targetHandle,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      setStatusMsg({
        type: 'success',
        text: `Broadcast notification successfully queued for ${targetType === 'ALL' ? 'All Users' : '@' + targetHandle}!`
      });
      setPushTitle('');
      setPushBody('');
      setTargetHandle('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to send broadcast notification' });
    } finally {
      setSendingPush(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('system_announcements').insert({
        title: annTitle,
        message: annMessage,
        action_url: annUrl,
        is_active: true,
        is_popup_modal: isPopupModal,
        created_at: new Date().toISOString()
      });

      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'System announcement banner published!' });
      setShowAnnModal(false);
      setAnnTitle('');
      setAnnMessage('');
      setAnnUrl('');
      setIsPopupModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to publish announcement' });
    }
  };

  const handleToggleAnnouncement = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('system_announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchAnnouncements();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase.from('system_announcements').delete().eq('id', id);
      if (error) throw error;
      fetchAnnouncements();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete announcement' });
    }
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    const q = searchQuery.toLowerCase();
    return (ann.title || '').toLowerCase().includes(q) || (ann.message || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Notification & Broadcast Management <Bell className="w-6 h-6 text-purple-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Send global push notifications, target individual users & manage in-app popup modal announcements
          </p>
        </div>

        {activeTab === 'ANNOUNCEMENTS' && (
          <button
            onClick={() => setShowAnnModal(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New System Announcement
          </button>
        )}
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
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('BROADCAST')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'BROADCAST'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" /> Send Broadcast Push
          </button>
          <button
            onClick={() => setActiveTab('ANNOUNCEMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ANNOUNCEMENTS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" /> In-App Announcements ({announcements.length})
          </button>
        </div>

        {activeTab === 'ANNOUNCEMENTS' && (
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        )}
      </div>

      {activeTab === 'BROADCAST' ? (
        /* BROADCAST PUSH FORM */
        <form
          onSubmit={handleSendBroadcast}
          className="bg-[#141418] border border-zinc-800 rounded-xl p-6 max-w-xl space-y-5 shadow-xl"
        >
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Target Recipients
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer ${
                  targetType === 'ALL'
                    ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <input
                  type="radio"
                  name="target"
                  checked={targetType === 'ALL'}
                  onChange={() => setTargetType('ALL')}
                  className="accent-purple-600"
                />
                <span className="text-xs">All Registered Users</span>
              </label>

              <label
                className={`flex items-center space-x-2 p-3 rounded-xl border cursor-pointer ${
                  targetType === 'USER'
                    ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <input
                  type="radio"
                  name="target"
                  checked={targetType === 'USER'}
                  onChange={() => setTargetType('USER')}
                  className="accent-purple-600"
                />
                <span className="text-xs">Specific User Handle</span>
              </label>
            </div>
          </div>

          {targetType === 'USER' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Recipient @Handle
              </label>
              <input
                type="text"
                required
                value={targetHandle}
                onChange={(e) => setTargetHandle(e.target.value)}
                placeholder="e.g. john_doe"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Push Notification Title
            </label>
            <input
              type="text"
              required
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder="e.g. 🔥 New Creator Rewards Released!"
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Push Notification Body Text
            </label>
            <textarea
              required
              rows={4}
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder="Write message details to display on mobile lockscreen..."
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={sendingPush}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>{sendingPush ? 'Sending Push Notification...' : 'Send Broadcast Push Now'}</span>
          </button>
        </form>
      ) : (
        /* ANNOUNCEMENTS TABLE */
        <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-4">Banner Title</th>
                  <th className="p-4">Message Content</th>
                  <th className="p-4">Display Mode</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Loading announcements...
                    </td>
                  </tr>
                ) : filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No system announcements found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((ann) => (
                    <tr key={ann.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white">{ann.title}</td>
                      <td className="p-4 text-zinc-300 max-w-xs truncate">{ann.message}</td>
                      <td className="p-4 font-mono text-[11px]">
                        {ann.is_popup_modal ? (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 w-fit">
                            <Smartphone className="w-3 h-3" /> Full Popup
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 w-fit">
                            Top Banner
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {ann.is_active ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> Disabled
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleAnnouncement(ann.id, ann.is_active)}
                          className={`px-3 py-1.5 font-bold text-xs rounded-lg ${
                            ann.is_active
                              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          {ann.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showAnnModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateAnnouncement}
            className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="font-bold text-lg text-white">Create System Announcement Banner</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Banner Title</label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. 📢 Scheduled Maintenance Notice"
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Message Content</label>
              <textarea
                required
                rows={3}
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                placeholder="Details displayed to mobile app users..."
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Optional Action URL / Deep Link</label>
              <input
                type="text"
                value={annUrl}
                onChange={(e) => setAnnUrl(e.target.value)}
                placeholder="https://AvSocial.app/update or app://rewards"
                className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-mono"
              />
            </div>

            <label className="flex items-center space-x-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isPopupModal}
                onChange={(e) => setIsPopupModal(e.target.checked)}
                className="accent-purple-600"
              />
              <span className="text-xs font-bold text-white">Show as Full-Screen App Launch Popup</span>
            </label>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAnnModal(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl"
              >
                Publish Announcement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
