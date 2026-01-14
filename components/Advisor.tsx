
import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Zap, Target, ShieldCheck, Lock, RefreshCw, BarChart3, TrendingUp, AlertTriangle, ChevronRight, Download, Calendar, History } from 'lucide-react';
import { CampaignWithStats, Settings, IntelligenceReport } from '../types';
import { getIntelligenceReport } from '../services/geminiService';
import { Link } from 'react-router-dom';

interface AdvisorProps {
  campaigns: CampaignWithStats[];
  settings: Settings;
  onUpdateSettings?: (settings: Settings) => void;
}

const Advisor: React.FC<AdvisorProps> = ({ campaigns, settings, onUpdateSettings }) => {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const isPro = settings.subscription.plan === 'PRO';

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const result = await getIntelligenceReport(campaigns);
      setReport(result);
      
      // Persist the report so we don't have to re-fetch immediately on next visit
      if (onUpdateSettings) {
        onUpdateSettings({
          ...settings,
          last_report_generated: new Date().toISOString()
        });
      }
      
      // Save full report content to a separate local storage for persistence
      localStorage.setItem(`fnd_latest_report_${settings.report_email}`, JSON.stringify(result));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load persisted report on mount
    const savedReport = localStorage.getItem(`fnd_latest_report_${settings.report_email}`);
    if (savedReport) {
      setReport(JSON.parse(savedReport));
    } else if (isPro && !report) {
      fetchInsights();
    }
  }, [isPro, settings.report_email]);

  const reportAgeDays = settings.last_report_generated 
    ? Math.floor((new Date().getTime() - new Date(settings.last_report_generated).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (!isPro) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 py-10 animate-in fade-in duration-700">
        <div className="text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center text-blue-500 border border-blue-500/20 mb-4 shadow-2xl shadow-blue-600/10 group">
            <Brain size={40} className="group-hover:scale-110 transition-transform" />
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter italic uppercase leading-none">Growth Advisor</h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto font-medium leading-relaxed italic">Unlock high-precision ROI intelligence and production creative audits powered by Gemini 3 Pro.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-12">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 space-y-8 relative overflow-hidden group border-blue-500/20 shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Sparkles size={120} />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Intelligence Sample</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] italic">Mock report for unauthorized tiers</p>
            </div>
            
            <div className="space-y-6 opacity-30 grayscale blur-[3px] pointer-events-none select-none">
              <div className="p-8 bg-slate-950 rounded-[2rem] border border-slate-800 space-y-6 shadow-inner">
                <p className="text-sm text-slate-300 font-medium italic leading-relaxed">"Analysis complete. Your Facebook banner costs are out-scaling performance by 22%. Switch to short-form video DNA immediately."</p>
                <div className="space-y-3">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-4 bg-slate-800 rounded-full w-full"></div>
                   ))}
                </div>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]">
               <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-center shadow-2xl space-y-6">
                 <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto border border-blue-500/20">
                    <Lock size={32} />
                 </div>
                 <div>
                    <h4 className="text-white font-black uppercase text-xs tracking-[0.3em] mb-2">Pro Subscription Required</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase italic tracking-widest max-w-[200px] mx-auto">Foundry Intelligence is locked for this workspace.</p>
                 </div>
                 <Link to="/pricing" className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/30 group">
                    Upgrade Portfolio <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                 </Link>
               </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 space-y-12 flex flex-col justify-center shadow-xl">
            <div className="space-y-8">
              <div className="flex items-center gap-6">
                 <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20"><Zap size={24} /></div>
                 <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Strategic Audit Logic</h4>
              </div>
              <ul className="space-y-6">
                <Capability text="Production DNA Audit: Find creative 'Leakage'" />
                <Capability text="Channel Mix Forecast: Shift spend to winners" />
                <Capability text="True ROI Reporting: All-in capital yield analysis" />
                <Capability text="HubSpot Deal Correlation: Deep precision mapping" />
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-black text-white tracking-tighter italic uppercase leading-none flex items-center gap-6">
            Strategic Advisor <Sparkles className="text-blue-500 animate-pulse" size={40} />
          </h1>
          <div className="flex items-center gap-6 mt-4">
            <p className="text-slate-400 font-medium text-lg italic">Monitoring ${campaigns.reduce((a,c)=>a+c.totalRevenue,0).toLocaleString()} in deal value.</p>
            {settings.last_report_generated && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${reportAgeDays > 7 ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'}`}>
                <Calendar size={12} /> Last Audit: {new Date(settings.last_report_generated).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="px-8 py-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-3 transition-all shadow-2xl"
        >
          {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {report ? 'Refresh Portfolio Audit' : 'Generate Growth Briefing'}
        </button>
      </header>

      {loading && (
        <div className="py-32 flex flex-col items-center justify-center space-y-10 animate-pulse">
           <div className="relative">
              <RefreshCw className="text-blue-500 animate-spin" size={80} strokeWidth={1} />
              <Brain className="absolute inset-0 m-auto text-white" size={32} />
           </div>
           <div className="text-center space-y-3">
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Analysing Production DNA</h3>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] italic">Syncing HubSpot Deal velocity with creative committed capital...</p>
           </div>
        </div>
      )}

      {report && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {reportAgeDays > 7 && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-center justify-between gap-4 shadow-xl border-dashed">
                 <div className="flex items-center gap-4">
                    <AlertTriangle className="text-amber-500" size={24} />
                    <div>
                       <h4 className="text-white font-black uppercase text-xs tracking-tighter italic">Stale Intelligence Vector</h4>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Your last audit is over 7 days old. Market conditions may have shifted.</p>
                    </div>
                 </div>
                 <button onClick={fetchInsights} className="px-6 py-2 bg-amber-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl">Recalibrate</button>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden group border-blue-500/10">
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                <BarChart3 size={200} />
              </div>
              <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mb-10 italic">Executive Growth Briefing</h3>
              <p className="text-3xl font-medium text-white leading-relaxed italic">"{report.summary}"</p>
              
              <div className="mt-16 pt-12 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                   <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-3 italic">
                     <TrendingUp size={16} /> Scale Efficiency
                   </h4>
                   <div className="space-y-4">
                     {report.assetStrategy.scale.map((s, i) => (
                       <div key={i} className="flex gap-3">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-slate-300 font-medium leading-relaxed italic">{s}</p>
                       </div>
                     ))}
                   </div>
                </div>
                <div className="space-y-6">
                   <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-3 italic">
                     <AlertTriangle size={16} /> Capital Leakage
                   </h4>
                   <div className="space-y-4">
                     {report.assetStrategy.refresh.map((s, i) => (
                       <div key={i} className="flex gap-3">
                          <div className="w-1 h-1 rounded-full bg-amber-500 mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-slate-300 font-medium leading-relaxed italic">{s}</p>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <InsightCard title="Channel Distribution" content={report.channelInsights} icon={<Zap size={20}/>} color="amber" />
               <InsightCard title="Creative Synergy" content={report.campaignAdvice} icon={<Target size={20}/>} color="blue" />
            </div>
          </div>

          <div className="space-y-12">
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 space-y-12 shadow-2xl border-slate-700/50">
               <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3 italic">
                 <Target size={18} className="text-blue-500" /> Strategic Priorities
               </h3>
               <div className="space-y-8">
                 {report.topPriorities.map((p, i) => (
                   <div key={i} className="flex gap-6 group">
                      <span className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg italic">
                        {i + 1}
                      </span>
                      <p className="text-sm text-slate-200 font-bold leading-relaxed">{p}</p>
                   </div>
                 ))}
               </div>
               <button className="w-full py-6 bg-white text-slate-950 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                 <Download size={16} /> Download Strategic Briefing
               </button>
            </div>

            <div className="bg-blue-600/5 border border-blue-600/10 rounded-[2.5rem] p-10 space-y-6 shadow-xl">
               <ShieldCheck className="text-blue-500" size={32} />
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed italic">
                 Intelligence computed using restricted enterprise logic. Your production DNA and HubSpot deal values are not utilized for model training.
               </p>
            </div>
          </div>
        </div>
      )}
      
      {!report && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center space-y-8 shadow-2xl">
           <div className="w-24 h-24 bg-blue-600/5 rounded-full flex items-center justify-center border border-blue-500/10">
              <History className="text-slate-700" size={48} />
           </div>
           <div className="space-y-2">
              <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Zero Audit History</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto italic">Initiate your first portfolio audit to start tracking capital efficiency vectors.</p>
           </div>
           <button onClick={fetchInsights} className="px-12 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-blue-600/30">Generate First Audit</button>
        </div>
      )}
    </div>
  );
};

const Capability: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex items-center gap-4 group">
    <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)] group-hover:scale-125 transition-transform"></div>
    <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic leading-none">{text}</span>
  </li>
);

const InsightCard: React.FC<{ title: string, content: string, icon: React.ReactNode, color: string }> = ({ title, content, icon, color }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 space-y-8 hover:border-slate-700 transition-all shadow-2xl relative overflow-hidden group">
    <div className={`p-4 rounded-2xl w-fit shadow-inner ${color === 'amber' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
      {icon}
    </div>
    <div className="space-y-4">
      <h4 className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">{title}</h4>
      <p className="text-sm text-slate-400 font-medium leading-relaxed italic">"{content}"</p>
    </div>
  </div>
);

export default Advisor;
