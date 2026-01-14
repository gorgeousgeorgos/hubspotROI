
import React, { useState } from 'react';
import { 
  Mail, CheckCircle2, ExternalLink, Link2, Zap, ArrowRight, ShieldCheck, Database, RefreshCw
} from 'lucide-react';
import { Settings } from '../types';

interface SettingsProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const AppSettings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = (type: 'hubspot' | 'ga4') => {
    setConnecting(type);
    // Simulate connection process
    setTimeout(() => {
      setSettings(prev => ({
        ...prev,
        [type === 'hubspot' ? 'is_hubspot_connected' : 'is_ga4_connected']: true
      }));
      setConnecting(null);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16 py-10">
      <div className="text-center md:text-left">
        <h1 className="text-5xl font-black text-white tracking-tighter italic uppercase leading-none">Connectors</h1>
        <p className="text-slate-400 mt-4 text-lg font-medium max-w-xl">Link your growth stack to enable real-time "True ROI" calculations and AI strategic advising.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-10">
          <div className="space-y-6">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 flex items-center gap-3">
              <Mail size={14} className="text-blue-500" /> Intelligence Recipient
            </label>
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
              <input 
                type="email" 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 text-sm font-bold text-white focus:border-blue-500 outline-none transition-all placeholder-slate-700 shadow-inner"
                placeholder="growth@company.com"
                value={settings.report_email}
                onChange={e => setSettings({...settings, report_email: e.target.value})}
              />
              <div className="mt-8 flex items-center gap-3 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  Weekly ROI briefings active
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-1 flex items-center gap-3">
            <Link2 size={14} className="text-blue-500" /> Pipeline Control
          </label>
          <div className="space-y-6">
            <ConnectionButton 
              name="HubSpot" 
              connected={settings.is_hubspot_connected} 
              loading={connecting === 'hubspot'}
              onConnect={() => handleConnect('hubspot')}
              icon={<div className="w-10 h-10 bg-[#ff7a59] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#ff7a59]/20">H</div>}
              description="Sync Deals & Ad Spend"
            />
            <ConnectionButton 
              name="GA4" 
              connected={settings.is_ga4_connected} 
              loading={connecting === 'ga4'}
              onConnect={() => handleConnect('ga4')}
              icon={<div className="w-10 h-10 bg-[#f9ab00] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#f9ab00]/20">G</div>}
              description="Sync Conversion Events"
            />
          </div>

          <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] flex items-start gap-4">
            <ShieldCheck className="text-blue-400 flex-shrink-0 mt-1" size={20} />
            <p className="text-xs text-slate-400 font-medium leading-relaxed italic">
              Foundry uses restricted OAuth scopes. We only request read-access to deals and attribution signals. No customer data is stored outside of active sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectionButton: React.FC<{ 
  name: string, 
  connected: boolean, 
  loading: boolean,
  icon: React.ReactNode, 
  onConnect: () => void,
  description: string 
}> = ({ name, connected, loading, icon, onConnect, description }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex items-center justify-between group hover:border-slate-700 transition-all shadow-xl">
    <div className="flex items-center gap-5">
      {icon}
      <div>
        <h4 className="text-lg font-black text-white tracking-tight">{name}</h4>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{description}</p>
      </div>
    </div>
    
    {connected ? (
      <div className="flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase bg-emerald-400/5 px-4 py-2 rounded-xl border border-emerald-400/10">
        Connected <CheckCircle2 size={14} />
      </div>
    ) : (
      <button 
        onClick={onConnect}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <>Connect <ArrowRight size={14} /></>}
      </button>
    )}
  </div>
);

export default AppSettings;