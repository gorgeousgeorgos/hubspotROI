
import React from 'react';
import { Check, Zap, Sparkles, Shield, Rocket, Target, Star } from 'lucide-react';
import { Settings } from '../types';

interface PricingProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const Pricing: React.FC<PricingProps> = ({ settings, setSettings }) => {
  const currentPlan = settings.subscription.plan;

  const handleUpgrade = (plan: 'PRO') => {
    setSettings(prev => ({
      ...prev,
      subscription: { ...prev.subscription, plan }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto py-12 space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-black text-white tracking-tighter italic uppercase leading-none">Monetize Your Media</h1>
        <p className="text-slate-400 text-xl font-medium max-w-2xl mx-auto">Stop guessing which creative production items are burning cash. Upgrade to actionable intelligence.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Free Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 space-y-10 relative overflow-hidden group">
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-slate-500 italic uppercase tracking-tighter">Hobbyist</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">$0</span>
              <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">/ month</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">For solo-marketers testing the ROI logic on a single campaign.</p>
          </div>

          <div className="space-y-5">
            <FeatureItem text="1 Active Link DNA Registry" check />
            <FeatureItem text="5 Production Assets" check />
            <FeatureItem text="Native HubSpot Sync" check />
            <FeatureItem text="Basic ROI Dashboard" check />
            <FeatureItem text="AI Strategic Advisor" disabled />
            <FeatureItem text="Precision Tracking Pixel" disabled />
          </div>

          <button 
            disabled={currentPlan === 'FREE'}
            className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-800 text-slate-500 cursor-not-allowed"
          >
            {currentPlan === 'FREE' ? 'Current Workspace' : 'Downgrade'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-blue-600/5 border-2 border-blue-600 rounded-[3rem] p-12 space-y-10 relative overflow-hidden group shadow-2xl shadow-blue-600/10">
          <div className="absolute top-0 right-0 p-6">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest rotate-6 shadow-xl">Best Value</div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-500">
              <Star size={24} fill="currentColor" />
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Foundry Pro</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">$99</span>
              <span className="text-slate-500 text-sm font-bold uppercase tracking-widest">/ month</span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">For high-velocity growth teams syncing deep media costs to CRM deals.</p>
          </div>

          <div className="space-y-5">
            <FeatureItem text="Unlimited Link Registries" check highlight />
            <FeatureItem text="Unlimited Asset Portfolio" check highlight />
            <FeatureItem text="Deep AI Strategic Advisor" check highlight />
            <FeatureItem text="Precision Attribution Pixel" check highlight />
            <FeatureItem text="Weighted ROI Simulator" check highlight />
            <FeatureItem text="Priority HubSpot API Sync" check highlight />
          </div>

          <button 
            onClick={() => handleUpgrade('PRO')}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl ${
              currentPlan === 'PRO' 
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 hover:scale-[1.02]'
            }`}
          >
            {currentPlan === 'PRO' ? 'Active Subscription' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
        <TrustBit icon={<Shield size={24}/>} title="Secure Sync" text="AES-256 encrypted HubSpot API handshake." />
        <TrustBit icon={<Rocket size={24}/>} title="Instant Aha!" text="See your True ROI within 60 seconds of sync." />
        <TrustBit icon={<Target size={24}/>} title="Precision" text="99.9% accurate attribution via Pixel mode." />
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ text: string, check?: boolean, disabled?: boolean, highlight?: boolean }> = ({ text, check, disabled, highlight }) => (
  <div className={`flex items-center gap-4 ${disabled ? 'opacity-30' : ''}`}>
    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
      {check && <Check size={12} />}
    </div>
    <span className={`text-[11px] font-bold tracking-tight uppercase ${highlight ? 'text-white' : 'text-slate-400'}`}>{text}</span>
  </div>
);

const TrustBit: React.FC<{ icon: React.ReactNode, title: string, text: string }> = ({ icon, title, text }) => (
  <div className="space-y-4">
    <div className="mx-auto w-12 h-12 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-blue-500">
      {icon}
    </div>
    <div>
      <h4 className="text-xs font-black text-white uppercase tracking-widest">{title}</h4>
      <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tighter leading-none">{text}</p>
    </div>
  </div>
);

export default Pricing;
