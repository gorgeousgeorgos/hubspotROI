
import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  ArrowUpRight, 
  BadgeDollarSign,
  UserPlus
} from 'lucide-react';
import { Customer, Campaign } from '../types';

interface CRMProps {
  customers: Customer[];
  campaigns: Campaign[];
}

const CRM: React.FC<CRMProps> = ({ customers, campaigns }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getCampaignName = (id: string) => {
    return campaigns.find(c => c.id === id)?.name || 'Direct / Unknown';
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">CRM & Attribution</h1>
          <p className="text-slate-400 mt-1">Tracing revenue back to the origin of discovery</p>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border border-slate-700">
          <UserPlus size={20} /> Export Segment
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Find customers by name or email..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-slate-300 px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors text-sm">
            <Filter size={16} /> All Statuses
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-800">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Attributed Campaign</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Revenue</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">{customer.name}</p>
                      <p className="text-xs text-slate-500">{customer.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-blue-400 font-medium">{getCampaignName(customer.campaign_id)}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-mono text-emerald-400 font-bold">${customer.revenue_generated.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    customer.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                    customer.status === 'CHURNED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-500 hover:text-white transition-colors">
                    <Mail size={16} />
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

export default CRM;
