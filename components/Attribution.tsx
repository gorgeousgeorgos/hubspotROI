
import React from 'react';
import { 
  CheckCircle2, 
  Search, 
  ArrowUpRight, 
  BadgeDollarSign,
  Zap,
  RefreshCcw,
  ExternalLink,
  Shield,
  MousePointer2
} from 'lucide-react';
import { Deal, Campaign } from '../types';

interface AttributionProps {
  deals: Deal[];
  campaigns: Campaign[];
}

const Attribution: React.FC<AttributionProps> = ({ deals, campaigns }) => {
  const getCampaignName = (trackingId: string) => {
    return campaigns.find(c => c.tracking_id === trackingId)?.name || 'Organic / Unknown';
  };

  return (
    <div className="space-y-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase">Attribution Feed</h1>
          <p className="text-slate-400 mt-2 font-medium">Real-time conversions synced from HubSpot CRM via Foundry logic.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-500 uppercase">Signal Mode:</span>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                 <span className="text-[9px] font-black text-white uppercase tracking-widest">Hybrid (HS + Pixel)</span>
              </div>
           </div>
           <button className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-tighter text-xs transition-all border border-slate-800 flex items-center gap-2 shadow-2xl">
             <RefreshCcw size={16} /> Force Sync
           </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-800">
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Signal Origin</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Closed Deal</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Foundry Origin</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Value</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">HubSpot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {deals.map(deal => (
              <tr key={deal.id} className="hover:bg-slate-800/40 transition-colors group">
                <td className="px-8 py-6">
                   {deal.id.startsWith('d1') ? (
                     <div className="flex items-center gap-2 text-blue-400 bg-blue-400/5 border border-blue-400/10 px-3 py-1.5 rounded-lg w-fit">
                        <Shield size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Precision Pixel</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-slate-500 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg w-fit">
                        <MousePointer2 size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Native HubSpot</span>
                     </div>
                   )}
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="font-black text-white tracking-tight">{deal.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{new Date(deal.closed_date).toLocaleDateString()}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-white">
                    <Zap size={14} className="text-blue-500" />
                    <span className="text-sm font-black italic">{getCampaignName(deal.fnd_source)}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-lg font-black text-emerald-400 italic">${deal.amount.toLocaleString()}</span>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-slate-500 hover:text-white transition-colors">
                    <ExternalLink size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Attribution;
