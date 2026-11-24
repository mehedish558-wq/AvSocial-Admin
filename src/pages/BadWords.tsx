import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BadWordEntry } from '../types/admin';
import { logAuditAction } from '../lib/audit';
import { ShieldAlert, Plus, Trash2, Edit2, AlertTriangle, CheckCircle2, Search } from 'lucide-react';

export const BadWords: React.FC = () => {
  const [words, setWords] = useState<BadWordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BadWordEntry | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const [wordInput, setWordInput] = useState('');
  const [severityInput, setSeverityInput] = useState<'WARN' | 'HIDE' | 'BLOCK'>('BLOCK');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBadWords();
  }, []);

  const fetchBadWords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bad_words_filter')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to localStorage if table doesn't exist
        const saved = localStorage.getItem('avsocial_bad_words');
        if (saved) {
          setWords(JSON.parse(saved));
        } else {
          setWords([
            { id: '1', word_or_pattern: 'spamlink.com', severity: 'BLOCK', created_at: new Date().toISOString(), created_by: 'admin' },
            { id: '2', word_or_pattern: 'offensiveword', severity: 'HIDE', created_at: new Date().toISOString(), created_by: 'admin' }
          ]);
        }
      } else {
        setWords(data || []);
      }
    } catch (err) {
      console.error('Error fetching bad words:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordInput.trim()) return;

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('bad_words_filter')
          .update({ word_or_pattern: wordInput.trim(), severity: severityInput })
          .eq('id', editingItem.id);

        if (error) throw error;
        await logAuditAction('admin', 'UPDATE_BAD_WORD', wordInput.trim(), `Updated bad word severity to ${severityInput}`);
        setStatusMsg({ type: 'success', text: `Updated bad word "${wordInput}" successfully!` });
      } else {
        const newItem = {
          word_or_pattern: wordInput.trim(),
          severity: severityInput,
          created_at: new Date().toISOString(),
          created_by: 'admin'
        };
        const { error } = await supabase.from('bad_words_filter').insert(newItem);
        if (error) throw error;
        await logAuditAction('admin', 'ADD_BAD_WORD', wordInput.trim(), `Added banned word with severity ${severityInput}`);
        setStatusMsg({ type: 'success', text: `Added bad word "${wordInput}" successfully!` });
      }

      setShowModal(false);
      setEditingItem(null);
      setWordInput('');
      setSeverityInput('BLOCK');
      fetchBadWords();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save bad word' });
    }
  };

  const handleDelete = async (item: BadWordEntry) => {
    if (!confirm(`Are you sure you want to delete "${item.word_or_pattern}"?`)) return;
    try {
      const { error } = await supabase.from('bad_words_filter').delete().eq('id', item.id);
      if (error) throw error;
      await logAuditAction('admin', 'DELETE_BAD_WORD', item.word_or_pattern, `Deleted banned word entry`);
      setStatusMsg({ type: 'success', text: `Deleted bad word "${item.word_or_pattern}" successfully!` });
      fetchBadWords();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete bad word' });
    }
  };

  const filteredWords = words.filter((w) => {
    const matchesSev = severityFilter === 'ALL' || w.severity === severityFilter;
    const matchesQuery = (w.word_or_pattern || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesQuery;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Auto-Moderation & Bad Words Filter <ShieldAlert className="w-6 h-6 text-red-400" />
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage banned keywords, spam domains and automatic severity actions (WARN, HIDE, BLOCK)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setWordInput('');
            setSeverityInput('BLOCK');
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-900/40 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Banned Word / Link
        </button>
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
          {['ALL', 'WARN', 'HIDE', 'BLOCK'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                severityFilter === sev
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search word or URL pattern..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      <div className="bg-[#141418] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="p-4">Word or URL Pattern</th>
                <th className="p-4">Severity Action</th>
                <th className="p-4">Added By</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">Loading filters...</td>
                </tr>
              ) : filteredWords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">No bad words found matching filter.</td>
                </tr>
              ) : (
                filteredWords.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/35 transition-colors">
                    <td className="p-4 font-mono font-bold text-white text-sm">{item.word_or_pattern}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                          item.severity === 'BLOCK'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : item.severity === 'HIDE'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400">@{item.created_by || 'admin'}</td>
                    <td className="p-4 text-zinc-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setWordInput(item.word_or_pattern);
                          setSeverityInput(item.severity);
                          setShowModal(true);
                        }}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20"
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

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-white">
              {editingItem ? 'Edit Banned Word / Pattern' : 'Add New Banned Word / Pattern'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Word, Phrase or Domain URL</label>
              <input
                type="text"
                required
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                placeholder="e.g. spamdomain.com or badword"
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Severity Action</label>
              <select
                value={severityInput}
                onChange={(e) => setSeverityInput(e.target.value as any)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-bold"
              >
                <option value="WARN">WARN (Issue Warning to User)</option>
                <option value="HIDE">HIDE (Hide Comment/Post Automatically)</option>
                <option value="BLOCK">BLOCK (Block Publication & Flag Account)</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl"
              >
                {editingItem ? 'Save Changes' : 'Add Banned Word'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
