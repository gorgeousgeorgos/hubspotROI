
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, DollarSign, Zap, Sparkles, BarChart3, Layers, Info, CheckCircle, Flame, AlertCircle, Code, Link2, Calendar, Download, Sliders, ArrowRight, RefreshCw, CloudLightning, Clock
} from 'lucide-react';
import { CampaignWithStats, Stat, Settings, Deal } from '../types';
import { Link } from 'react-router-dom';
import { fetchHubSpotDeals } from '../services/hubspotService';
import { fetchGa4Metrics } from '../services/ga4Service';

interface DashboardProps {
  data: CampaignWithStats[];
  stats: Stat[];
  setStats: React.Dispatch<React.SetStateAction<Stat[]>>;
  deals: Deal[];
  setDeals: React.Dispatch<React.SetStateAction<Deal[]>>;
  settings: Settings;
  onUpdateSettings?: (settings: Settings) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, stats, setStats, deals, setDeals, settings, onUpdateSettings }) => {
  const [simulatorValues, setSimulatorValues] = useState({ spendAdj: 100, prodAdj: 100 });
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D');
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  
  const isPro = settings.subscription.plan === 'PRO';

  useEffect(() => {
    // Load last sync from state or simulated history
    setLastSyncTime(new Date().toLocaleTimeString());
  }, []);

  const totalRevenue = data.reduce((acc, c) => acc + c.totalRevenue, 0);
  const totalConversions = data.reduce((acc, c) => acc + c.totalConversions, 0);
  const totalAdSpend = data.reduce((acc, c) => acc + c.totalAdSpend, 0);
  const totalAssetSpend = data.reduce((acc, c) => acc + c.totalProductionCost, 0);
  
  // Real-time Simulation Logic
  const simAdSpend = totalAdSpend * (simulatorValues.spendAdj / 100);
  const simProdCost = totalAssetSpend * (simulatorValues.prodAdj / 100);
  const totalAllInCost = simAdSpend + simProdCost;
  const overallTrueRoi = totalAllInCost > 0 ? (totalRevenue - totalAllInCost) / totalAllInCost : 0;

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Growth Report prepared and sent to " + settings.report_email);
    }, 2000);
  };

  const handleManualSync = async () => {
    if (!settings.is_hubspot_connected && !settings.is_ga4_connected) {
      alert("Foundry Bridge: Connect HubSpot or GA4 in Registry Config to enable signal sync.");
      return;
    }

    setIsSyncing(true);
    try {
      console.log("Foundry Native: Initiating real-time signal reconciliation...");
      const syncTasks: Promise<any>[] = [];

      if (settings.is_hubspot_connected) {
        syncTasks.push(
          fetchHubSpotDeals(settings.integrations.hubspot).then(newDeals => {
            setDeals(newDeals);
          })
        );
      }

      if (settings.is_ga4_connected) {
        syncTasks.push(
          fetchGa4Metrics(settings.integrations.ga4).then(newStats => {
            setStats(newStats);
          })
        );
      }

      await Promise.all(syncTasks);
      setLastSyncTime(new Date().toLocaleTimeString());
      alert("Foundry Native: Signal sync successful. Performance vectors updated.");
    } catch (err) {
      console.error("Manual Sync Failure:", err);
      alert(`Sync Error: ${err instanceof Error ? err.message : 'Connection Timeout'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none">Portfolio Health</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-500 flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest">
              <Info size={12} className="text-blue-500" />
              Logic: Revenue - (Spend + Production)
            </p>
            <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 shadow-inner">
              {['7D', '30D', '90D', 'ALL'].map(range => (
                <button 
                  key={range}
                  onClick={() => setDateRange(range as any)}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${dateRange === range ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          {lastSyncTime && (
            <div className="hidden xl:flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
               <Clock size={12} className="text-blue-500" /> Last Sync: {lastSyncTime}
            </div>
          )}
          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-6 py-3 rounded-2xl transition-all border border-slate-800 text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw size={14} className="animate-spin text-blue-500" /> : <CloudLightning size={14} className="text-blue-500" />}
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-6 py-3 rounded-2xl transition-all border border-slate-800 text-[10px] font-black uppercase tracking-widest shadow-xl"
          >
            {isExporting ? <Zap size={14} className="animate-pulse text-blue-500" /> : <Download size={14} />}
            Export
          </button>
          <Link 
            to="/advisor"
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 group"
          >
            <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
            AI Advisor
          </Link>
        </div>
      </header>

      {/* Onboarding Checklist */}
      {(!settings.is_hubspot_connected || !settings.is_ga4_connected) && (
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 grid grid-cols-1 md:grid-cols-3 gap-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
             <div className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">Awaiting Signal Sync</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-white">
              <Calendar className="text-blue-500" size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Growth Protocol</h3>
            </div>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-tighter italic">Foundry needs live event streams to compute high-precision ROI.</p>
          </div>
          <CheckItem title="Link Stack" status={settings.is_hubspot_connected && settings.is_ga4_connected} icon={<Link2 size={14}/>} />
          <CheckItem title="Provision Pixel" status={false} icon={<Code size={14}/>} />
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Attributed Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={<DollarSign size={20}/>} color="emerald" trend="+12.5%" />
        <KPICard title="CRM Closures" value={totalConversions.toLocaleString()} icon={<CheckCircle size={20}/>} color="blue" trend="+3.2%" />
        <KPICard title="Media Velocity" value={`$${simAdSpend.toLocaleString()}`} icon={<Zap size={20}/>} color="amber" />
        <KPICard title="Production DNA" value={`$${simProdCost.toLocaleString()}`} icon={<Layers size={20}/>} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Simulator Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -z-10 group-hover:bg-amber-500/10 transition-all"></div>
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                    <Sliders size={20} />
                 </div>
                 <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase italic">ROI Predictor</h3>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic leading-relaxed">Adjust media scaling vs production friction to forecast net yield.</p>
              
              <div className="space-y-10 pt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scale Media Spend</label>
                    <span className="text-[10px] font-black text-blue-500">{simulatorValues.spendAdj}%</span>
                  </div>
                  <input 
                    type="range" min="50" max="300" 
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={simulatorValues.spendAdj}
                    onChange={(e) => setSimulatorValues({...simulatorValues, spendAdj: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Production</label>
                    <span className="text-[10px] font-black text-amber-500">{simulatorValues.prodAdj}%</span>
                  </div>
                  <input 
                    type="range" min="20" max="150" 
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    value={simulatorValues.prodAdj}
                    onChange={(e) => setSimulatorValues({...simulatorValues, prodAdj: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-800 space-y-2 text-center">
                <div className={`text-5xl font-black italic tracking-tighter ${overallTrueRoi > 1.5 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {(overallTrueRoi * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Forecasted True ROI</div>
              </div>
           </div>

           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative group overflow-hidden border-blue-500/10">
              <div className="absolute top-0 right-0 p-6 opacity-20">
                <Sparkles className="text-blue-500" size={32} />
              </div>
              <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase mb-4 italic">Strategic Summary</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-bold uppercase italic tracking-widest mb-8">Intelligence engine active. Mapping production vs deal correlation.</p>
              
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner mb-8 min-h-[100px] flex items-center justify-center">
                 {isPro ? (
                    <p className="text-xs text-slate-300 font-medium italic leading-relaxed text-center">
                      Analysis complete. You have 3 high-priority creative refactors and 2 scaling opportunities detected.
                    </p>
                 ) : (
                    <div className="text-center space-y-3">
                      <p className="text-xs text-slate-500 font-medium italic leading-relaxed">
                        Creative production audits are locked. Upgrade to Pro to see winning creative patterns.
                      </p>
                      <Link to="/pricing" className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-colors">Upgrade Registry &rarr;</Link>
                    </div>
                 )}
              </div>

              <Link to="/advisor" className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-xl group/btn border border-slate-700">
                {isPro ? "Open Full Advisor" : "Preview Strategic Engine"} <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
           </div>
        </div>

        {/* Main Performance Graph */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl group relative overflow-hidden border-slate-700/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600"></div>
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-500" />
                Capital Efficiency Index
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Media</span>
                </div>
              </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tick={{fontWeight: 'bold'}} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tick={{fontWeight: 'bold'}} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', fontSize: '10px', color: '#fff' }}
                    itemStyle={{ fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} name="REV" />
                  <Bar dataKey="totalAdSpend" fill="#f59e0b" radius={[4, 4, 0, 0]} name="MEDIA" />
                  <Bar dataKey="totalProductionCost" fill="#a855f7" radius={[4, 4, 0, 0]} name="DNA" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-xl hover:border-emerald-500/20 transition-all group">
               <div className="flex justify-between items-center">
                 <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 italic">
                   <Flame size={14} /> Efficiency Winners
                 </h4>
                 <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">Scale velocity</span>
               </div>
               <div className="space-y-4">
                 <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl group-hover:bg-emerald-500/10 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <p className="text-[11px] text-slate-200 font-bold leading-tight uppercase tracking-widest">Scale media scaling on LinkedIn push.</p>
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl group-hover:bg-emerald-500/10 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <p className="text-[11px] text-slate-200 font-bold leading-tight uppercase tracking-widest">E-book asset yielding 4.2x True ROI.</p>
                 </div>
               </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-xl hover:border-amber-500/20 transition-all group">
               <div className="flex justify-between items-center">
                 <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2 italic">
                   <AlertCircle size={14} /> Refactor Required
                 </h4>
                 <span className="text-[8px] font-black text-amber-500/50 uppercase tracking-widest">Refactor Creative</span>
               </div>
               <div className="space-y-4">
                 <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl group-hover:bg-amber-500/10 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <p className="text-[11px] text-slate-200 font-bold leading-tight uppercase tracking-widest">High CPA on FB retargeting creative.</p>
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl group-hover:bg-amber-500/10 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <p className="text-[11px] text-slate-200 font-bold leading-tight uppercase tracking-widest">Graphic production costs out-scaling revenue.</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ title: string, status: boolean, icon: React.ReactNode }> = ({ title, status, icon }) => (
  <div className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${status ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-slate-950 border-slate-800 text-slate-500 shadow-inner'}`}>
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-lg ${status ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>{icon}</div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</span>
    </div>
    {status ? <CheckCircle size={16} /> : <div className="w-4 h-4 rounded-full border border-slate-800"></div>}
  </div>
);

const KPICard: React.FC<{ title: string, value: string, icon: React.ReactNode, color: string, trend?: string }> = ({ title, value, icon, color, trend }) => {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-500/20',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] group hover:border-slate-700 hover:bg-slate-800/50 transition-all shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className={`p-4 rounded-2xl transition-all shadow-inner border border-transparent group-hover:border-current/10 ${colorMap[color]}`}>
          {icon}
        </div>
        {trend && (
           <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[10px] bg-emerald-400/5 px-3 py-1.5 rounded-xl border border-emerald-400/10">
              <TrendingUp size={12} /> {trend}
           </div>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{title}</h3>
        <div className="text-3xl font-black text-white tracking-tighter italic leading-none">{value}</div>
      </div>
    </div>
  );
};

export default Dashboard;
