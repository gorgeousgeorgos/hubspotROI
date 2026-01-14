
import React, { useState } from 'react';
import { 
  Plus, Search, Calendar, Tag, Trash2, ExternalLink, Layers, Copy, Check, Lock, AlertTriangle, Link as LinkIcon, Globe, Sparkles, X
} from 'lucide-react';
import { Campaign, MarketingAsset, Stat, Settings } from '../types';

interface CampaignsProps {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  assets: MarketingAsset[];
  stats: Stat[];
  settings: Settings;
  userId: string;
}

const Campaigns: React.FC<CampaignsProps> = ({ campaigns, setCampaigns, assets, stats, settings, userId }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    destination_url: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    target_roi: 2.0,
    asset_ids: [],
    tags: []
  });

  const isPro = settings.subscription.plan === 'PRO';
  const currentMonth = new Date().getMonth();
  const deploymentsThisMonth = campaigns.filter(c => new Date(c.created_at).getMonth() === currentMonth).length;
  const reachLimit = !isPro && deploymentsThisMonth >= 1;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (reachLimit) return;

    const trackingId = Math.random().toString(36).substr(2, 5);
    const dest = newCampaign.destination_url || 'https://example.com';
    const utmParams = new URLSearchParams();
    utmParams.set('utm_source', newCampaign.utm_source || 'direct');
    utmParams.set('utm_medium', newCampaign.utm_medium || 'social');
    utmParams.set('utm_campaign', newCampaign.utm_campaign || 'launch');
    utmParams.set('fnd', trackingId);
    
    const finalUrl = `${dest}${dest.includes('?') ? '&' : '?'}${utmParams.toString()}`;

    // Added user_id to satisfy the Campaign interface requirements
    const campaign: Campaign = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: userId,
      name: newCampaign.name || 'Untitled Link',
      destination_url: dest,
      generated_utm_url: finalUrl,
      utm_source: newCampaign.utm_source || 'direct',
      utm_medium: newCampaign.utm_medium || 'social',
      utm_campaign: newCampaign.utm_campaign || 'launch',
      tracking_id: trackingId,
      target_roi: Number(newCampaign.target_roi) || 2.0,
      asset_ids: newCampaign.asset_ids || [],
      tags: newCampaign.tags || [],
      created_at: new Date().toISOString()
    };
    
    setCampaigns([...campaigns, campaign]);
    setShowModal(false);
    setNewCampaign({ name: '', destination_url: '', utm_source: '', utm_medium: '', utm_campaign: '', target_roi: 2.0, asset_ids: [], tags: [] });
  };

  const addTag = () => {
    if (!tagInput) return;
    const currentTags = newCampaign.tags || [];
    if (!currentTags.includes(tagInput)) {
      setNewCampaign({ ...newCampaign, tags: [...currentTags, tagInput] });
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setNewCampaign({ ...newCampaign, tags: (newCampaign.tags || []).filter(t => t !== tagToRemove) });
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleAsset = (id: string) => {
    const current = newCampaign.asset_ids || [];
    if (current.includes(id)) {
      setNewCampaign({ ...newCampaign, asset_ids: current.filter(aid => aid !== id) });
    } else {
      setNewCampaign({ ...newCampaign, asset_ids: [...current, id] });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none">Link Registry</h1>
          <p className="text-slate-400 mt-3 font-medium text-sm">Deploy trackable DNA linked directly to production capital.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className={`px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl uppercase tracking-widest text-[10px] ${
            reachLimit 
              ? 'bg-slate-800 text-slate-500 border border-slate-700' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
          }`}
        >
          {reachLimit ? <Lock size={14} /> : <Plus size={14} />} 
          Provision Link DNA
        </button>
      </div>

      {!isPro && reachLimit && (
        <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] flex items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-6">
             <div className="p-4 bg-amber-500/10 rounded-2xl">
               <AlertTriangle className="text-amber-500" size={28} />
             </div>
             <div>
               <h4 className="text-white font-black uppercase text-xs italic tracking-[0.2em] leading-none">Registry Threshold Reached</h4>
               <p className="text-[10px] text-slate-400 font-bold mt-2 max-w-lg uppercase tracking-widest">Hobbyist plans support 1 monthly deployment. Pro unlocks infinite DNA strings.</p>
             </div>
          </div>
          <button className="bg-white text-slate-950 px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Go Pro</button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex gap-4 items-center shadow-inner">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Filter by link name, tag, or UTM string..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors shadow-inner text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {campaigns.filter(c => 
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          c.utm_campaign.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
        ).map(campaign => (
          <div key={campaign.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 group relative overflow-hidden flex flex-col h-full shadow-2xl hover:border-blue-500/40 hover:bg-slate-800/50 transition-all">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-600/10 shadow-inner group-hover:scale-110 transition-transform">
                  <LinkIcon size={24} />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg tracking-tight leading-none italic uppercase">{campaign.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest bg-slate-950 px-2 py-1 rounded-md border border-slate-800">{campaign.utm_source}</span>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest bg-slate-950 px-2 py-1 rounded-md border border-slate-800">{campaign.utm_medium}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 mb-8 space-y-3 shadow-inner group/link relative">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Registry DNA ID</span>
                <span className="text-[8px] font-black text-blue-500/60 uppercase">FID-{campaign.tracking_id}</span>
              </div>
              <div className="truncate text-[10px] text-slate-400 font-mono italic pr-8 overflow-hidden whitespace-nowrap">
                {campaign.generated_utm_url}
              </div>
              <button 
                onClick={() => copyToClipboard(campaign.generated_utm_url, campaign.id)}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all shadow-lg ${
                  copiedId === campaign.id 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                {copiedId === campaign.id ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === campaign.id ? 'DNA CAPTURED' : 'COPY REGISTRY URL'}
              </button>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-blue-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Growth Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.tags && campaign.tags.length > 0 ? campaign.tags.map(t => (
                    <span key={t} className="px-2 py-1 bg-slate-950 text-[8px] font-black uppercase tracking-widest text-slate-400 rounded-md border border-slate-800">#{t}</span>
                  )) : <span className="text-[9px] text-slate-700 italic">No tags associated.</span>}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Layers size={12} className="text-amber-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Attributed Production Assets</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {campaign.asset_ids.length > 0 ? campaign.asset_ids.map(aid => {
                    const asset = assets.find(a => a.id === aid);
                    return asset ? (
                      <span key={aid} className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-[8px] font-black uppercase tracking-[0.1em] rounded-lg border border-slate-700">
                        {asset.name}
                      </span>
                    ) : null;
                  }) : <span className="text-[9px] text-slate-700 italic">Zero capital attribution.</span>}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-800">
              <div className="flex items-center gap-2 text-slate-600 font-black uppercase tracking-widest text-[9px]">
                <Calendar size={12} /> {new Date(campaign.created_at).toLocaleDateString()}
              </div>
              <a href={campaign.destination_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-white font-black uppercase tracking-tighter transition-colors flex items-center gap-1.5 text-[9px]">
                OPEN <Globe size={10} />
              </a>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 relative">
               <button onClick={() => setShowModal(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
               </button>
              <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Link DNA Provisioner</h2>
              <p className="text-[11px] text-slate-400 mt-2 font-black uppercase tracking-widest">Generate trackable growth strings for media deployments.</p>
            </div>
            
            {reachLimit ? (
               <div className="p-16 text-center space-y-8">
                  <Lock className="mx-auto text-blue-500" size={56} />
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Registry Capacity Overload</h3>
                    <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm leading-relaxed">Free plans allow for high-precision testing on a single link. Upgrade to deploy a multi-channel link library.</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/30">Upgrade Registry</button>
               </div>
            ) : (
              <form onSubmit={handleCreate} className="p-10 space-y-8 overflow-y-auto custom-scroll">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Registry Name</label>
                    <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner text-sm" placeholder="Winter Ad - LinkedIn" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Growth Tags</label>
                    <div className="flex gap-2">
                      <input type="text" className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 font-bold text-white outline-none focus:border-blue-500 text-sm shadow-inner" placeholder="Q1, Social, LinkedIn" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                      <button type="button" onClick={addTag} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl text-white transition-all border border-slate-700"><Plus size={18}/></button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {newCampaign.tags?.map(t => (
                    <span key={t} className="flex items-center gap-2 bg-blue-600/10 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">
                      {t} <button type="button" onClick={() => removeTag(t)} className="hover:text-white transition-colors"><X size={12}/></button>
                    </span>
                  ))}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Destination URL</label>
                  <input required type="url" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner text-sm" placeholder="https://foundry.io/demo" value={newCampaign.destination_url} onChange={e => setNewCampaign({...newCampaign, destination_url: e.target.value})} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Source</label>
                    <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-4 font-bold text-white text-xs outline-none focus:border-blue-500" placeholder="linkedin" value={newCampaign.utm_source} onChange={e => setNewCampaign({...newCampaign, utm_source: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Medium</label>
                    <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-4 font-bold text-white text-xs outline-none focus:border-blue-500" placeholder="paid" value={newCampaign.utm_medium} onChange={e => setNewCampaign({...newCampaign, utm_medium: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Campaign</label>
                    <input required type="text" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-4 font-bold text-white text-xs outline-none focus:border-blue-500" placeholder="q1_growth" value={newCampaign.utm_campaign} onChange={e => setNewCampaign({...newCampaign, utm_campaign: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-2 italic">
                    <Layers size={14} className="text-blue-500" />
                    Capital Allocation Attribution
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-40 overflow-y-auto p-1 custom-scroll">
                    {assets.map(asset => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => toggleAsset(asset.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                          newCampaign.asset_ids?.includes(asset.id) 
                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg' 
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-[10px] uppercase tracking-tight italic">{asset.name}</span>
                          <span className="text-[9px] opacity-50 font-bold uppercase tracking-widest">${asset.cost_amount} DNA BASE</span>
                        </div>
                        {newCampaign.asset_ids?.includes(asset.id) && <Check size={14} className="text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-800">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-2xl shadow-blue-600/30">PROVISION DNA STRING</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;