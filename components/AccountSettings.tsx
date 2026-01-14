
import React, { useState } from 'react';
import { 
  Mail, CheckCircle2, Link2, Zap, ArrowRight, ShieldCheck, CreditCard, Star, Code, Copy, Check, Globe, X, RefreshCw, Lock, ChevronRight, Key, Eye, EyeOff, Save
} from 'lucide-react';
import { Settings, IntegrationCredentials } from '../types';

interface SettingsProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const AccountSettings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const [activeTab, setActiveTab] = useState<'account' | 'connectors' | 'setup'>('account');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const isPro = settings.subscription.plan === 'PRO';

  const pixelSnippet = `<!-- Foundry Attribution Pixel -->
<script>
  (function(f,o,u,n,d,r,y){
    f['FoundryObject']=d;f[d]=f[d]||function(){(f[d].q=f[d].q||[]).push(arguments)},
    f[d].l=1*new Date();r=o.createElement(u),y=o.getElementsByTagName(u)[0];
    r.async=1;r.src=n;y.parentNode.insertBefore(r,y)
  })(window,document,'script','https://cdn.foundry.io/pixel.js','fnd');
  fnd('init', '${settings.custom_domain ? settings.custom_domain : Math.random().toString(36).substr(2, 9)}');
</script>`;

  const copyPixel = () => {
    navigator.clipboard.writeText(pixelSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateIntegration = (provider: 'hubspot' | 'ga4', fields: Partial<IntegrationCredentials>) => {
    setSettings(prev => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [provider]: { ...prev.integrations[provider], ...fields }
      }
    }));
  };

  const handleConnect = (type: 'hubspot' | 'ga4') => {
    setConnecting(type);
    setTimeout(() => {
      setSettings(prev => ({
        ...prev,
        [type === 'hubspot' ? 'is_hubspot_connected' : 'is_ga4_connected']: true
      }));
      setConnecting(null);
    }, 1500);
  };

  const handleUpgrade = () => {
    setSettings(prev => ({
      ...prev,
      subscription: { ...prev.subscription, plan: 'PRO' }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-10 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-10">
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase leading-none">Registry Config</h1>
          <p className="text-slate-500 text-lg font-medium">Provision your workspace environment and sync your growth stack.</p>
        </div>
        <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <TabBtn active={activeTab === 'account'} onClick={() => setActiveTab('account')} label="Identity" />
          <TabBtn active={activeTab === 'connectors'} onClick={() => setActiveTab('connectors')} label="Bridges" />
          <TabBtn active={activeTab === 'setup'} onClick={() => setActiveTab('setup')} label="Foundry DNA" />
        </div>
      </div>

      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 space-y-12">
            <div className="space-y-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 flex items-center gap-3 italic">
                <Mail size={14} className="text-blue-500" /> Intelligence Briefing Email
              </label>
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 text-sm font-bold text-white focus:border-blue-500 outline-none transition-all placeholder-slate-700 shadow-inner"
                  value={settings.report_email}
                  onChange={e => setSettings({...settings, report_email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 flex items-center gap-3 italic">
                <CreditCard size={14} className="text-blue-500" /> Subscription Tier
              </label>
              <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex items-center justify-between group shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-transparent"></div>
                 <div className="flex items-center gap-6">
                    <div className={`p-5 rounded-2xl ${isPro ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : 'bg-slate-800 text-slate-500'}`}>
                      <Star size={32} className={isPro ? 'fill-blue-500' : ''} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Foundry {settings.subscription.plan}</h4>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Lifecycle: {settings.subscription.status}</p>
                    </div>
                 </div>
                 {!isPro && (
                   <button onClick={handleUpgrade} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-600/20 group">
                     Upgrade Portfolio <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform inline ml-2" />
                   </button>
                 )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-red-500/5 border border-red-500/10 rounded-[2.5rem] p-10 shadow-xl">
              <label className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.3em] block mb-4 italic">Danger Zone</label>
              <p className="text-[11px] text-slate-500 font-bold italic mb-8 uppercase tracking-widest leading-relaxed">Permanently flush your attribution history and disconnect all active CRM bridges.</p>
              <button className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-red-500/20">Purge Workspace</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'connectors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="space-y-8">
              <ConnectionCard 
                name="HubSpot" 
                connected={settings.is_hubspot_connected} 
                loading={connecting === 'hubspot'}
                onConnect={() => handleConnect('hubspot')}
                icon={<div className="w-16 h-16 bg-[#ff7a59] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-[#ff7a59]/20">H</div>}
                description="Sync Deals, Contacts & Ad Spend data."
              />
              {settings.is_hubspot_connected && (
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">HubSpot Private App Access Token</label>
                    <button onClick={() => setShowKeys(!showKeys)} className="text-slate-500 hover:text-white transition-colors">
                      {showKeys ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <input 
                    type={showKeys ? "text" : "password"} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-mono text-white focus:border-blue-500 outline-none transition-all shadow-inner"
                    placeholder="pat-na1-xxxx-xxxx-xxxx"
                    value={settings.integrations.hubspot.accessToken || ''}
                    onChange={e => updateIntegration('hubspot', { accessToken: e.target.value })}
                  />
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic leading-relaxed">Required scopes: crm.objects.deals.read, analytics.readonly</p>
                </div>
              )}
           </div>

           <div className="space-y-8">
              <ConnectionCard 
                name="GA4" 
                connected={settings.is_ga4_connected} 
                loading={connecting === 'ga4'}
                onConnect={() => handleConnect('ga4')}
                icon={<div className="w-16 h-16 bg-[#f9ab00] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-[#f9ab00]/20">G</div>}
                description="Sync Conversions & Event streams."
              />
              {settings.is_ga4_connected && (
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">GA4 Property ID</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs font-mono text-white focus:border-amber-500 outline-none shadow-inner"
                      placeholder="e.g. 123456789"
                      value={settings.integrations.ga4.propertyId || ''}
                      onChange={e => updateIntegration('ga4', { propertyId: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Measurement ID</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs font-mono text-white focus:border-amber-500 outline-none shadow-inner"
                        placeholder="G-XXXXXXXX"
                        value={settings.integrations.ga4.measurementId || ''}
                        onChange={e => updateIntegration('ga4', { measurementId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">API Secret</label>
                      <input 
                        type="password" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs font-mono text-white focus:border-amber-500 outline-none shadow-inner"
                        placeholder="••••••••"
                        value={settings.integrations.ga4.apiSecret || ''}
                        onChange={e => updateIntegration('ga4', { apiSecret: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="bg-blue-600/5 border border-blue-600/20 p-10 rounded-[2.5rem] space-y-6 shadow-2xl relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Code size={128} />
                </div>
                <div className="flex items-center gap-4 text-blue-400">
                   <Code size={24} />
                   <h3 className="text-xl font-black italic uppercase tracking-tight">Tracking Pixel</h3>
                </div>
                <p className="text-sm text-slate-400 font-medium leading-relaxed italic">The Pixel bridges the 'Attribution Gap' by linking HubSpot form-fills to digital discovery events. <strong>Highly recommended for Pro users.</strong></p>
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-[10px] text-slate-300 relative group shadow-inner">
                  <pre className="whitespace-pre-wrap">{pixelSnippet}</pre>
                  <button 
                    onClick={copyPixel}
                    className="absolute top-4 right-4 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all shadow-xl"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Signal Monitor</span>
                </div>
              </div>
            </div>

            <div className="space-y-12">
               <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] space-y-8 shadow-2xl group relative overflow-hidden border-blue-500/10">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Globe size={128} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-emerald-400">
                       <Globe size={24} />
                       <h3 className="text-xl font-black italic uppercase tracking-tight">Branded Domain</h3>
                    </div>
                    {!isPro && <Lock className="text-slate-600" size={16} />}
                  </div>
                  <div className={`space-y-6 ${!isPro ? 'opacity-40 pointer-events-none' : ''}`}>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed italic">Configure your own domain for tracking redirects (e.g., <code className="text-emerald-400">track.yourbrand.io</code>) to bypass ad-blockers and build trust.</p>
                    <div className="relative">
                      <input 
                        type="text" 
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-emerald-500 outline-none transition-all placeholder-slate-700 shadow-inner"
                        placeholder="track.company.com"
                        value={settings.custom_domain || ''}
                        onChange={e => setSettings({...settings, custom_domain: e.target.value})}
                      />
                    </div>
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                       <div className="flex items-center justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest italic">
                          <span>DNS Registry Status</span>
                          <span className="text-amber-500">Awaiting CNAME Propagation</span>
                       </div>
                       <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                          <span className="uppercase tracking-widest text-[9px]">Target:</span>
                          <span className="font-mono bg-slate-900 px-2 py-1 rounded">dns.foundry.io</span>
                       </div>
                    </div>
                  </div>
                  {!isPro && (
                    <button onClick={handleUpgrade} className="w-full py-4 border border-blue-600/20 bg-blue-600/10 text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl">Unlock Custom Domains</button>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>
    {label}
  </button>
);

const ConnectionCard: React.FC<{ name: string, connected: boolean, loading: boolean, icon: React.ReactNode, onConnect: () => void, description: string }> = ({ name, connected, loading, icon, onConnect, description }) => (
  <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3rem] flex flex-col items-center text-center space-y-8 group hover:border-slate-700 transition-all shadow-2xl relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-1 bg-slate-800 group-hover:bg-blue-500 transition-colors"></div>
    {icon}
    <div className="space-y-2">
      <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">{name}</h4>
      <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[200px] italic">{description}</p>
    </div>
    
    {connected ? (
      <div className="flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase bg-emerald-400/5 px-8 py-4 rounded-2xl border border-emerald-400/10 shadow-inner">
        Signal Bridged <CheckCircle2 size={16} />
      </div>
    ) : (
      <button onClick={onConnect} disabled={loading} className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50">
        {loading ? <RefreshCw size={18} className="animate-spin" /> : <>Bridge Connector <ArrowRight size={18} /></>}
      </button>
    )}
  </div>
);

export default AccountSettings;
