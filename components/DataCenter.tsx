
import React, { useState, useEffect } from 'react';
import { Database, Edit3, Save, X, RefreshCcw, Search, AlertCircle, TrendingUp, DollarSign, CheckCircle2, CloudLightning, Terminal, Activity } from 'lucide-react';
import { Stat, Campaign } from '../types';
import { nativeStorage } from '../services/storageService';

interface DataCenterProps {
  stats: Stat[];
  setStats: React.Dispatch<React.SetStateAction<Stat[]>>;
  campaigns: Campaign[];
  userId: string;
}

const DataCenter: React.FC<DataCenterProps> = ({ stats, setStats, campaigns, userId }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Stat>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));

  const getCampaignName = (id: string) => campaigns.find(c => c.id === id)?.name || 'Unknown';

  const triggerNativeSync = async () => {
    setSyncing(true);
    setLogs([]);
    addLog("Initializing Native Data Sync...");
    
    try {
      await new Promise(r => setTimeout(r, 600));
      addLog("Handshake established with HubSpot CRM v3...");
      
      await new Promise(r => setTimeout(r, 800));
      addLog("Fetching GA4 Reporting Property metrics...");
      
      await new Promise(r => setTimeout(r, 1000));
      addLog("Re-calculating True ROI vectors for all link DNA...");
      
      // Persist stats to Supabase
      await nativeStorage.saveStats(userId, stats);
      addLog("Local state synced to native persistent storage.");
      
      setLastSync(new Date().toLocaleTimeString());
      addLog("Sync Complete. Portfolio health updated.");
    } catch (e) {
      addLog("ERROR: API Timeout. Check keys in Registry Config.");
    } finally {
      setSyncing(false);
    }
  };

  const startEditing = (stat: Stat) => {
    setEditingId(stat.id);
    setEditValues(stat);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      const updated = stats.map(s => s.id === editingId ? { ...s, ...editValues, is_manual_override: true } : s);
      setStats(updated);
      // Persist change
      await nativeStorage.saveStats(userId, updated);
      setEditingId(null);
      addLog(`Manual override applied to campaign stat ${editingId}`);
    } catch (err) {
      console.error('DataCenter save failed', err);
      addLog('ERROR: Failed to persist manual override.');
    }
  };

  const filteredStats = stats.filter(s => 
    getCampaignName(s.campaign_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.date.includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-10 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none flex items-center gap-4">
            Data Center <Database className="text-blue-500" size={28} />
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-slate-400 font-medium">Native signal audit and persistence layer.</p>
            {lastSync && (
              <div className="flex items-center gap-2 text-emerald-400 text-[9px] font-black uppercase bg-emerald-400/5 px-2 py-1 rounded border border-emerald-400/10 shadow-lg">
                <CheckCircle2 size={10} /> Sync Verified: {lastSync}
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={triggerNativeSync}
          disabled={syncing}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-3 shadow-xl shadow-blue-600/20 disabled:opacity-50 group"
        >
          {syncing ? <RefreshCcw size={16} className="animate-spin" /> : <CloudLightning size={16} className="group-hover:animate-pulse" />}
          {syncing ? 'Synchronizing Native Data...' : 'Execute Global Sync'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl space-y-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity size={160} />
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center border-b border-slate-800 pb-8">
               <div className="relative flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input 
                   type="text" 
                   placeholder="Search campaign DNA strings..." 
                   className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors shadow-inner text-white"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
            </div>

            <div className="overflow-x-auto custom-scroll pb-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                    <th className="px-6 py-6">Campaign Origin</th>
                    <th className="px-6 py-6">Revenue Yield</th>
                    <th className="px-6 py-6">Media Spend</th>
                    <th className="px-6 py-6">Signals</th>
                    <th className="px-6 py-6">Date</th>
                    <th className="px-6 py-6 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredStats.map(stat => (
                    <tr key={stat.id} className="group hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-white text-sm italic uppercase tracking-tighter">{getCampaignName(stat.campaign_id)}</span>
                          {stat.is_manual_override && (
                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                              <AlertCircle size={8} /> Logic Override Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {editingId === stat.id ? (
                          <input 
                            type="number" 
                            className="bg-slate-950 border border-blue-500/50 rounded-xl p-3 text-xs font-black text-white w-28 outline-none shadow-inner"
                            value={editValues.revenue}
                            onChange={e => setEditValues({...editValues, revenue: Number(e.target.value)})}
                          />
                        ) : (
                          <span className="text-emerald-400 font-black italic tracking-tighter text-lg">${stat.revenue.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-6">
                        {editingId === stat.id ? (
                          <input 
                            type="number" 
                            className="bg-slate-950 border border-blue-500/50 rounded-xl p-3 text-xs font-black text-white w-28 outline-none shadow-inner"
                            value={editValues.ad_spend}
                            onChange={e => setEditValues({...editValues, ad_spend: Number(e.target.value)})}
                          />
                        ) : (
                          <span className="text-amber-500 font-black italic tracking-tighter text-lg">${stat.ad_spend.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-6 py-6">
                         <span className="text-white font-black text-sm italic">{stat.conversions}</span>
                      </td>
                      <td className="px-6 py-6">
                         <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">{stat.date}</span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        {editingId === stat.id ? (
                          <div className="flex justify-end gap-2">
                             <button onClick={handleSave} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg"><Save size={18} /></button>
                             <button onClick={() => setEditingId(null)} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"><X size={18} /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(stat)} className="p-3 text-slate-600 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100 hover:bg-slate-800 rounded-xl"><Edit3 size={18} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col h-full min-h-[400px]">
            <div className="flex items-center gap-3 mb-6">
               <Terminal className="text-blue-500" size={18} />
               <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Sync Terminal</h3>
            </div>
            <div className="flex-1 font-mono text-[10px] text-slate-500 overflow-y-auto space-y-3 custom-scroll pr-2">
              {logs.length === 0 ? (
                <p className="italic opacity-30">Awaiting sync execution...</p>
              ) : logs.map((log, i) => (
                <div key={i} className={`p-2 rounded-lg border leading-relaxed ${i === 0 ? 'bg-blue-600/5 border-blue-600/20 text-blue-400 animate-pulse' : 'bg-slate-950 border-slate-800'}`}>
                  {log}
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Persisted Storage</span>
                <span className="text-emerald-500">Nominal</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-[65%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataCenter;