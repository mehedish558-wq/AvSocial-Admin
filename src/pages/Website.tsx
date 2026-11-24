import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, Save, Search, Layout, Link as LinkIcon, Sparkles } from 'lucide-react';

export const Website: React.FC = () => {
  const [siteTitle, setSiteTitle] = useState('AvSocial - Next-Gen Social Media & Creator Platform');
  const [siteDescription, setSiteDescription] = useState('Connect with friends, share short reels, stream live and earn creator monetization rewards.');
  const [siteKeywords, setSiteKeywords] = useState('AvSocial, social app, reels, monetization, live call, creator rewards');
  const [ogImageUrl, setOgImageUrl] = useState('https://AvSocial.app/og-banner.png');

  const [heroHeading, setHeroHeading] = useState('Build, Share & Monetize Your Audience');
  const [heroSubheading, setHeroSubheading] = useState('The modern social ecosystem designed for creators and communities in Bangladesh and worldwide.');

  const [supportEmail, setSupportEmail] = useState('support@AvSocial.app');
  const [contactPhone, setContactPhone] = useState('+880 1700-000000');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchWebsiteSettings();
  }, []);

  const fetchWebsiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('website_settings')
        .select('*')
        .eq('id', 'config')
        .maybeSingle();

      if (data && !error) {
        setSiteTitle(data.site_title || siteTitle);
        setSiteDescription(data.site_description || siteDescription);
        setSiteKeywords(data.site_keywords || siteKeywords);
        setOgImageUrl(data.og_image_url || ogImageUrl);
        setHeroHeading(data.hero_heading || heroHeading);
        setHeroSubheading(data.hero_subheading || heroSubheading);
        setSupportEmail(data.support_email || supportEmail);
        setContactPhone(data.contact_phone || contactPhone);
      }
    } catch (err) {
      console.error('Error fetching website settings from Supabase:', err);
    }
  };

  const handleSaveWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('website_settings')
        .upsert({
          id: 'config',
          site_title: siteTitle,
          site_description: siteDescription,
          site_keywords: siteKeywords,
          og_image_url: ogImageUrl,
          hero_heading: heroHeading,
          hero_subheading: heroSubheading,
          support_email: supportEmail,
          contact_phone: contactPhone,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setStatusMsg({ type: 'success', text: 'Website content & SEO settings saved directly to Supabase website_settings!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save website config' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Website & SEO Content Management <Globe className="w-6 h-6 text-purple-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Edit public landing page content, homepage banners, meta tags & contact details via Supabase `website_settings`
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

      <form onSubmit={handleSaveWebsite} className="space-y-6 max-w-4xl">
        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            SEO & OpenGraph Meta Settings <Search className="w-5 h-5 text-blue-400" />
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Website Meta Title</label>
            <input
              type="text"
              required
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Meta Description</label>
            <textarea
              rows={3}
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Keywords (Comma Separated)</label>
            <input
              type="text"
              value={siteKeywords}
              onChange={(e) => setSiteKeywords(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">OpenGraph Banner Image URL</label>
            <input
              type="text"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono text-xs"
            />
          </div>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Landing Page Hero Content <Layout className="w-5 h-5 text-purple-400" />
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Hero Heading Text</label>
            <input
              type="text"
              value={heroHeading}
              onChange={(e) => setHeroHeading(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-bold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Hero Subheading Text</label>
            <textarea
              rows={2}
              value={heroSubheading}
              onChange={(e) => setHeroSubheading(e.target.value)}
              className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
            />
          </div>
        </div>

        <div className="bg-[#141418] border border-zinc-800 rounded-xl p-6 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Footer Contact Details <LinkIcon className="w-5 h-5 text-emerald-400" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="user-btn w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Updating Website...' : 'Save Website & SEO Settings'}</span>
        </button>
      </form>
    </div>
  );
};
