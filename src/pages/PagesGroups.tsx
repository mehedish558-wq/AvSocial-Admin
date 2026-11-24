import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageItem, GroupItem } from '../types/admin';
import { Layers, Users, CheckCircle, Trash2, ShieldAlert, Search } from 'lucide-react';

export const PagesGroups: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PAGES' | 'GROUPS'>('PAGES');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const typeFilter = activeTab === 'PAGES' ? 'PAGE' : 'GROUP';
      const { data, error } = await supabase
        .from('pages_groups')
        .select('*')
        .eq('type', typeFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (activeTab === 'PAGES') {
        setPages(data || []);
      } else {
        setGroups(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching pages_groups:', err);
      try {
        if (activeTab === 'PAGES') {
          const { data } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
          setPages(data || []);
        } else {
          const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
          setGroups(data || []);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePageVerification = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('pages_groups').update({ is_verified: !current }).eq('id', id);
      if (error) {
        await supabase.from('pages').update({ is_verified: !current }).eq('id', id);
      }
      setStatusMsg({ type: 'success', text: 'Updated page verification badge' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update page' });
    }
  };

  const handleDeletePage = async (id: string) => {
    try {
      const { error } = await supabase.from('pages_groups').delete().eq('id', id);
      if (error) {
        await supabase.from('pages').delete().eq('id', id);
      }
      setStatusMsg({ type: 'success', text: 'Page deleted successfully' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete page' });
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      const { error } = await supabase.from('pages_groups').delete().eq('id', id);
      if (error) {
        await supabase.from('groups').delete().eq('id', id);
      }
      setStatusMsg({ type: 'success', text: 'Group deleted successfully' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete group' });
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredPages = pages.filter(p => (p.name || '').toLowerCase().includes(q) || (p.owner_handle || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
  const filteredGroups = groups.filter(g => (g.name || '').toLowerCase().includes(q) || (g.owner_handle || '').toLowerCase().includes(q));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Pages & Groups Management <Layers className="w-6 h-6 text-purple-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review user pages, verify brand pages & moderate community groups via Supabase `pages_groups`
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
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('PAGES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PAGES'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Brand Pages ({pages.length})
          </button>
          <button
            onClick={() => setActiveTab('GROUPS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'GROUPS'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            Community Groups ({groups.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search name or owner handle..."
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
                <th className="p-4">{activeTab === 'PAGES' ? 'Page Name' : 'Group Name'}</th>
                <th className="p-4">Owner Handle</th>
                <th className="p-4">{activeTab === 'PAGES' ? 'Category' : 'Privacy Mode'}</th>
                <th className="p-4">{activeTab === 'PAGES' ? 'Followers' : 'Members'}</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    Loading data from Supabase...
                  </td>
                </tr>
              ) : activeTab === 'PAGES' ? (
                filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No brand pages found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white flex items-center gap-1.5">
                        {p.name}
                        {p.is_verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                      </td>
                      <td className="p-4 text-purple-400 font-mono">@{p.owner_handle}</td>
                      <td className="p-4 text-zinc-300">{p.category || 'General'}</td>
                      <td className="p-4 font-mono font-bold text-white">{p.followers || 0}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleTogglePageVerification(p.id, p.is_verified)}
                          className={`px-3 py-1.5 font-bold text-xs rounded-lg ${
                            p.is_verified
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-blue-600 text-white hover:bg-blue-500'
                          }`}
                        >
                          {p.is_verified ? 'Unverify Page' : 'Verify Page'}
                        </button>
                        <button
                          onClick={() => handleDeletePage(p.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">
                    No community groups found matching filter.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g) => (
                  <tr key={g.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-bold text-white">{g.name}</td>
                    <td className="p-4 text-purple-400 font-mono">@{g.owner_handle}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                        {g.privacy || 'PUBLIC'}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">{g.members || 0}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg"
                      >
                        Delete Group
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
