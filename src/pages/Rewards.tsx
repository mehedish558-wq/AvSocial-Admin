import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Gift, Save, CheckCircle, CreditCard, ShieldCheck, DollarSign, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

interface GatewayConfig {
  id: string;
  name: string;
  type: string; // 'DEPOSIT' | 'WITHDRAW' | 'BOTH'
  accountNumber: string;
  instructions: string;
  isEnabled: boolean;
}

export const Rewards: React.FC = () => {
  const [usdBdt, setUsdBdt] = useState<number>(120);
  const [creditsPerDollar, setCreditsPerDollar] = useState<number>(2000);
  const [badgeFeeTk, setBadgeFeeTk] = useState<number>(100);
  const [creatorShare, setCreatorShare] = useState<number>(60);
  const [minWithdrawUsd, setMinWithdrawUsd] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gateways List
  const [gateways, setGateways] = useState<GatewayConfig[]>([
    { id: 'bkash', name: 'bKash Merchant / Direct', type: 'BOTH', accountNumber: '01700-000000', instructions: 'Enter bKash TrxID after Cash Out or Merchant Payment', isEnabled: true },
    { id: 'nagad', name: 'Nagad Direct / Personal', type: 'BOTH', accountNumber: '01800-000000', instructions: 'Send money to Nagad and paste the TrxID', isEnabled: true },
    { id: 'rocket', name: 'Rocket (DBBL)', type: 'BOTH', accountNumber: '01500-000000-0', instructions: 'Transfer to Rocket account number', isEnabled: true },
    { id: 'binance', name: 'Binance Pay / USDT TRC20', type: 'BOTH', accountNumber: 'TXYZ1234567890USDTAddress', instructions: 'Send USDT via TRC20 or Binance Pay ID', isEnabled: true },
    { id: 'sslcommerz', name: 'SSLCommerz Cards & Net Banking', type: 'DEPOSIT', accountNumber: 'store_avsocial_prod', instructions: 'Automated card & mobile banking gateway', isEnabled: true },
    { id: 'stripe', name: 'Stripe International Cards', type: 'DEPOSIT', accountNumber: 'pk_live_avsocial_stripe', instructions: 'Visa, MasterCard & AMEX direct deposit', isEnabled: true }
  ]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data && !error) {
        setUsdBdt(data.usd_to_bdt ?? 120);
        setCreditsPerDollar(data.credits_per_dollar ?? 2000);
        setBadgeFeeTk(data.verification_badge_fee_tk ?? 100);
        setCreatorShare(data.monetization_creator_share_pct ?? 60);
        setMinWithdrawUsd(data.monetization_min_withdrawal_usd ?? 10);
      }

      // Fetch payment gateways if table exists
      const { data: gwData } = await supabase.from('payment_gateways').select('*');
      if (gwData && gwData.length > 0) {
        setGateways(
          gwData.map((g: any) => ({
            id: g.id,
            name: g.name || g.id,
            type: g.type || 'BOTH',
            accountNumber: g.account_number || '',
            instructions: g.instructions || '',
            isEnabled: g.is_enabled ?? true
          }))
        );
      }
    } catch (err: any) {
      console.error('Error fetching rewards config from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Update app_settings table directly
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 1,
          usd_to_bdt: usdBdt,
          credits_per_dollar: creditsPerDollar,
          verification_badge_fee_tk: badgeFeeTk,
          monetization_creator_share_pct: creatorShare,
          monetization_min_withdrawal_usd: minWithdrawUsd,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Save payment_gateways
      for (const gw of gateways) {
        const { error: gwError } = await supabase.from('payment_gateways').upsert({
          id: gw.id,
          name: gw.name,
          type: gw.type,
          account_number: gw.accountNumber,
          instructions: gw.instructions,
          is_enabled: gw.isEnabled
        });
        if (gwError) throw gwError;
      }

      setStatusMsg({ type: 'success', text: 'Global Rates, Verification Fee & Payment Gateways saved to Supabase!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const toggleGateway = (id: string) => {
    setGateways(gateways.map(g => g.id === id ? { ...g, isEnabled: !g.isEnabled } : g));
  };

  const updateGatewayAccount = (id: string, val: string) => {
    setGateways(gateways.map(g => g.id === id ? { ...g, accountNumber: val } : g));
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Payment Gateways & Exchange Rates <Gift className="w-6 h-6 text-yellow-400" />
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure live USD/BDT rates, reward conversion ratios, verification badge fees & active payment gateways
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

      <form onSubmit={handleSaveConfig} className="space-y-8">
        {/* Global Rates Card */}
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Live Exchange & Conversion Rates
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                USD to BDT Exchange Rate (৳ Taka per $1 USD)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={usdBdt}
                onChange={(e) => setUsdBdt(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Coins / Credits per $1 USD
              </label>
              <input
                type="number"
                required
                value={creditsPerDollar}
                onChange={(e) => setCreditsPerDollar(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Verification Badge Fee (৳ BDT)
              </label>
              <input
                type="number"
                required
                value={badgeFeeTk}
                onChange={(e) => setBadgeFeeTk(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Creator AdMob Pool Share (%)
              </label>
              <input
                type="number"
                required
                value={creatorShare}
                onChange={(e) => setCreatorShare(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Minimum Cashout USD Limit ($)
              </label>
              <input
                type="number"
                required
                value={minWithdrawUsd}
                onChange={(e) => setMinWithdrawUsd(Number(e.target.value))}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm"
              />
            </div>
          </div>
        </div>

        {/* Gateways Config Card */}
        <div className="bg-[#141418] border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <CreditCard className="w-5 h-5 text-purple-400" /> Active Deposit & Payout Gateways
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gateways.map((gw) => (
              <div key={gw.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">{gw.name}</div>
                  <button
                    type="button"
                    onClick={() => toggleGateway(gw.id)}
                    className="flex items-center gap-1.5 text-xs font-bold"
                  >
                    {gw.isEnabled ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ToggleRight className="w-6 h-6" /> ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-500">
                        <ToggleLeft className="w-6 h-6" /> DISABLED
                      </span>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Merchant Number / Account Address / API Key
                  </label>
                  <input
                    type="text"
                    value={gw.accountNumber}
                    onChange={(e) => updateGatewayAccount(gw.id, e.target.value)}
                    className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-xs"
                  />
                </div>

                <div className="text-[11px] text-zinc-500 italic">{gw.instructions}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Payment & Exchange Rate Settings'}</span>
        </button>
      </form>
    </div>
  );
};
