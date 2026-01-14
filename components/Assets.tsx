
import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  BadgeDollarSign, 
  Clock, 
  BarChart2,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Lock,
  Star,
  Zap,
  MousePointer2,
  Settings as SettingsIcon,
  X,
  Target,
  Search
} from 'lucide-react';
import { MarketingAsset, AssetType, CostType, AssetPerformance, Campaign, Stat, Settings } from '../types';

interface AssetsProps {
  assets: MarketingAsset[];
  setAssets: React.Dispatch<React.SetStateAction<MarketingAsset[]>>;
  campaigns: Campaign[];
  stats: Stat[];
  settings: Settings;
}

const Assets: React.FC<AssetsProps> = ({ assets, setAssets, campaigns, stats, settings }) => {
  const [showModal, setShowModal] = useState(false);
  const [showMapper, setShowMapper] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newAsset, setNewAsset] = useState<Partial<MarketingAsset>>({
    name: '',
    type: 'EBOOK',
    cost_amount: 0,
    cost_type: 'ONE_OFF'
  });

  const isPro = settings.subscription.plan === 'PRO';
  const reachLimit = !isPro && assets.length >= 5;

  const getAssetPerformance = (asset: MarketingAsset): AssetPerformance => {
    const assetCampaigns = campaigns.filter(c => c.asset_ids.includes(asset.id));
    const attributedRevenue = assetCampaigns.reduce((acc, c) => {
      const cStats = stats.filter(s => s.campaign_id === c.id);
      return acc + cStats.reduce((sum, s) => sum + s.revenue, 0);
    }, 0);
    
    const lifetimeRoi = asset.cost_amount > 0 ? (attributedRevenue - asset.cost_amount) / asset.cost_amount : 0;
    
    return {
      ...asset,
      campaignCount: assetCampaigns.length,
      attributedRevenue,
      lifetimeRoi
    };
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (reachLimit) return;

    const asset: MarketingAsset = {
      id: Math.random().toString(36).substr(2, 9),
      name: newAsset.name || 'Untitled Asset',
      type: (newAsset.type as AssetType) || 'EBOOK',
      cost_amount: Number(newAsset.cost_amount) || 0,
      cost_type: (newAsset.cost_type as CostType) || 'ONE_OFF',
      created_at: new Date().toISOString()
    };
    setAssets([...assets, asset]);
    setShowModal(false);
    setNewAsset({ name: '', type: 'EBOOK', cost_amount: 0, cost_type: 'ONE_OFF' });
  };

  return (
    <div className="space-y-8 py-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">Production Library</h1>
          <p className="text-slate-400 mt-3 font-medium text-sm">Quantify the yield of your production capital investments.</p>
        </div>
        <div className="flex items-center gap-4">
          {!isPro && (
             <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory: {assets.length}/5</span>
               <div className="w-24 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                 <div className="h-full bg-amber-500" style={{width: `${(assets.length/5)*100}%`}}></div>
               </div>
             </div>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl flex items-center gap-2 ${
              reachLimit 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
            }`}
          >
            {reachLimit ? <Lock size={16} /> : <Plus size={16} />} 
            LOG PRODUCTION COST
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex gap-4 items-center shadow-inner">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search by asset name or type..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors shadow-inner text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {assets.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.type.toLowerCase().includes(searchTerm.toLowerCase())).map(asset => {
          const perf = getAssetPerformance(asset);
          return (
            <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 hover:border-amber-500/40 hover:bg-slate-800/50 transition-all group flex flex-col h-full shadow-2xl relative">
              {asset.smart_map?.isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-xl border border-blue-500/20 flex items-center gap-2">
                  <Target size={10} className="animate-pulse" /> Active Smart Map
                </div>
              )}
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-slate-950 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform shadow-inner border border-slate-800">
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-lg tracking-tight leading-tight italic uppercase">{asset.name}</h3>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{asset.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowMapper(asset.id)} className={`p-2 rounded-xl transition-all ${asset.smart_map?.isActive ? 'text-blue-400 bg-blue-400/5' : 'text-slate-600 hover:text-blue-400'}`}>
                    <MousePointer2 size={18} />
                  </button>
                  <button onClick={() => setAssets(assets.filter(a => a.id !== asset.id))} className="text-slate-600 hover:text-red-400 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1">
                <StatBit label="Base Cost" value={`$${asset.cost_amount}`} icon={<BadgeDollarSign size={10} />} />
                <StatBit label="DNA Registry" value={perf.campaignCount.toString()} icon={<Layers size={10} />} />
                <StatBit label="Yield" value={`$${perf.attributedRevenue.toLocaleString()}`} icon={<BarChart2 size={10} />} />
                <StatBit 
                  label="Net ROI" 
                  value={`${(perf.lifetimeRoi * 100).toFixed(0)}%`} 
                  icon={<TrendingUp size={10} />} 
                  highlight={perf.lifetimeRoi > 2}
                />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} /> {asset.cost_type.replace('_', ' ')}
                  </span>
                </div>
                <button className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-white transition-colors">
                  AUDIT HISTORY <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Smart Mapper Modal */}
      {showMapper && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
           <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative">
              <button onClick={() => setShowMapper(null)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              <div className="p-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
                 <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Smart Mapper</h2>
                 <p className="text-[11px] text-slate-400 mt-2 font-black uppercase tracking-widest">Map digital actions to production costs without UTM overhead.</p>
              </div>
              <div className="p-10 space-y-8">
                <div className="bg-blue-600/5 border border-blue-600/10 p-6 rounded-2xl flex items-start gap-4 shadow-inner">
                  <Zap className="text-blue-500 flex-shrink-0" size={20} />
                  <p className="text-[11px] text-slate-400 font-bold leading-relaxed italic uppercase tracking-widest">
                    Zero-Friction attribution: clicks on matching CSS selectors or URL paths will automatically increment this asset's attributed yield.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Target CSS Selector</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-6 font-bold text-white outline-none focus:border-blue-500 text-sm shadow-inner" placeholder=".btn-download-ebook" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">URL Path Restriction</label>
                    <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-6 font-bold text-white outline-none focus:border-blue-500 text-sm shadow-inner" placeholder="/whitepaper/registration" />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const target = assets.find(a => a.id === showMapper);
                    if (target) {
                      setAssets(assets.map(a => a.id === showMapper ? { ...a, smart_map: { isActive: true, selector: '.mapped', path: '/' } } : a));
                    }
                    setShowMapper(null);
                  }} 
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-600/30"
                >
                  DEPOY SMART MAP
                </button>
              </div>
           </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
            <div className="p-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Capital Provisioning</h2>
              <p className="text-[11px] text-slate-400 mt-2 font-black uppercase tracking-widest leading-none">Establish a cost-base for precision ROI lifecycle attribution.</p>
            </div>
            {reachLimit ? (
               <div className="p-16 text-center space-y-8">
                  <Lock className="mx-auto text-amber-500" size={56} />
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Inventory Capacity Exceeded</h3>
                    <p className="text-slate-400 font-medium text-sm max-w-sm mx-auto leading-relaxed mt-4">Growth portfolios are limited to 5 high-precision assets on Free tiers. Upgrade to scale your production audit.</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/30">SCALE INVENTORY</button>
               </div>
            ) : (
              <form onSubmit={handleCreate} className="p-10 space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Asset Descriptor</label>
                  <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 font-black text-white outline-none focus:border-amber-500 transition-all placeholder-slate-800 shadow-inner text-sm" placeholder="e.g. Q1 Content Pack - Freelancer Cost" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Asset DNA Category</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-5 font-black text-white outline-none appearance-none cursor-pointer focus:border-amber-500 text-xs shadow-inner uppercase tracking-widest" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value as AssetType})}>
                      <option value="EBOOK">WHITE PAPER / E-BOOK</option>
                      <option value="BANNER">AD CREATIVE / GRAPHICS</option>
                      <option value="VIDEO">VIDEO PRODUCTION</option>
                      <option value="AD_COPY">COPY / AD TEXT</option>
                      <option value="LANDING_PAGE">CONVERSION PAGE</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Capital Committed ($)</label>
                    <input required type="number" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-5 px-6 font-black text-white outline-none focus:border-amber-500 shadow-inner text-sm" placeholder="1500" value={newAsset.cost_amount} onChange={e => setNewAsset({...newAsset, cost_amount: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-2xl shadow-amber-600/30">COMMIT DNA COST</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatBit: React.FC<{ label: string, value: string, icon: React.ReactNode, highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center shadow-inner group-hover:border-slate-700 transition-colors">
    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
       {icon} {label}
    </span>
    <span className={`text-xl font-black italic tracking-tighter ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
  </div>
);

export default Assets;
