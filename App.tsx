
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  Zap,
  Menu,
  X,
  Target,
  LogOut,
  Package,
  Activity,
  User as UserIcon,
  BadgeDollarSign,
  TrendingUp,
  Sparkles,
  Database
} from 'lucide-react';
import { Campaign, Stat, Settings, CampaignWithStats, User, MarketingAsset, Deal } from './types';
import { INITIAL_CAMPAIGNS, INITIAL_STATS, INITIAL_SETTINGS, INITIAL_ASSETS, INITIAL_DEALS } from './constants';
import { nativeStorage } from './services/storageService';
import Dashboard from './components/Dashboard';
import Campaigns from './components/Campaigns';
import Assets from './components/Assets';
import Attribution from './components/Attribution';
import AccountSettings from './components/AccountSettings';
import Login from './components/Login';
import Pricing from './components/Pricing';
import Advisor from './components/Advisor';
import DataCenter from './components/DataCenter';
import { checkShouldRunReport, generateWeeklyIntelligence } from './services/schedulerService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('foundry_auth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('foundry_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const userId = currentUser?.id || 'guest';

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => nativeStorage.getCampaigns(userId) || INITIAL_CAMPAIGNS);
  const [assets, setAssets] = useState<MarketingAsset[]>(() => nativeStorage.getAssets(userId) || INITIAL_ASSETS);
  const [stats, setStats] = useState<Stat[]>(() => nativeStorage.getStats(userId) || INITIAL_STATS);
  const [deals, setDeals] = useState<Deal[]>(() => nativeStorage.getDeals(userId) || INITIAL_DEALS);
  const [settings, setSettings] = useState<Settings>(() => nativeStorage.getSettings(userId) || INITIAL_SETTINGS);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Persistence Effects
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      nativeStorage.saveCampaigns(userId, campaigns);
    }
  }, [campaigns, userId, isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      nativeStorage.saveAssets(userId, assets);
    }
  }, [assets, userId, isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      nativeStorage.saveStats(userId, stats);
    }
  }, [stats, userId, isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      nativeStorage.saveDeals(userId, deals);
    }
  }, [deals, userId, isAuthenticated, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      nativeStorage.saveSettings(userId, settings);
    }
  }, [settings, userId, isAuthenticated, currentUser]);

  // Sunday Scheduler Mock
  useEffect(() => {
    if (isAuthenticated && settings.subscription.plan === 'PRO') {
      if (checkShouldRunReport(settings.last_report_generated)) {
        console.log("Sunday detected. Triggering automated ROI audit...");
        // This would normally be handled by the Advisor or a background worker
      }
    }
  }, [isAuthenticated, settings]);

  const handleLogin = (email: string) => {
    const user: User = {
      id: btoa(email), // simple hash for ID
      email,
      name: email.split('@')[0],
      organization: 'Foundry Growth'
    };
    localStorage.setItem('foundry_auth', 'true');
    localStorage.setItem('foundry_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Load that user's specific data
    setCampaigns(nativeStorage.getCampaigns(user.id) || INITIAL_CAMPAIGNS);
    setAssets(nativeStorage.getAssets(user.id) || INITIAL_ASSETS);
    setStats(nativeStorage.getStats(user.id) || INITIAL_STATS);
    setDeals(nativeStorage.getDeals(user.id) || INITIAL_DEALS);
    setSettings(nativeStorage.getSettings(user.id) || INITIAL_SETTINGS);
  };

  const handleLogout = () => {
    localStorage.removeItem('foundry_auth');
    localStorage.removeItem('foundry_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const getCampaignsWithStats = (): CampaignWithStats[] => {
    return campaigns.map(c => {
      const campaignStats = stats.filter(s => s.campaign_id === c.id || s.campaign_id === c.name);
      const totalRevenue = campaignStats.reduce((acc, s) => acc + s.revenue, 0);
      const totalConversions = campaignStats.reduce((acc, s) => acc + s.conversions, 0);
      const totalAdSpend = campaignStats.reduce((acc, s) => acc + s.ad_spend, 0);
      
      const campaignAssets = assets.filter(a => c.asset_ids.includes(a.id));
      const totalProductionCost = campaignAssets.reduce((acc, a) => acc + a.cost_amount, 0);
      
      const totalTrueCost = totalAdSpend + totalProductionCost;
      const trueRoi = totalTrueCost > 0 ? (totalRevenue - totalTrueCost) / totalTrueCost : 0;
      
      return {
        ...c,
        totalRevenue,
        totalConversions,
        totalAdSpend,
        totalProductionCost,
        totalTrueCost,
        trueRoi
      };
    });
  };

  const campaignsWithStats = getCampaignsWithStats();

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-[#0a0f1d] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
        <aside className={`${sidebarOpen ? 'w-64' : 'w-24'} transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900 flex flex-col z-20 shadow-2xl relative`}>
          <div className="p-8 flex items-center gap-4 border-b border-slate-800">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-2.5 rounded-2xl shadow-2xl shadow-blue-500/30 flex-shrink-0">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">Foundry</span>
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Growth Engine</span>
              </div>
            )}
          </div>

          <nav className="flex-1 p-5 space-y-3 mt-8 overflow-y-auto custom-scroll">
            <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" to="/" collapsed={!sidebarOpen} />
            <SidebarItem icon={<Sparkles size={20}/>} label="AI Advisor" to="/advisor" collapsed={!sidebarOpen} />
            <SidebarItem icon={<Database size={20}/>} label="Data Center" to="/data" collapsed={!sidebarOpen} />
            <div className="h-[1px] bg-slate-800 my-4 mx-2"></div>
            <SidebarItem icon={<Package size={20}/>} label="Asset Library" to="/assets" collapsed={!sidebarOpen} />
            <SidebarItem icon={<Target size={20}/>} label="Link Registry" to="/campaigns" collapsed={!sidebarOpen} />
            <SidebarItem icon={<Activity size={20}/>} label="Attribution" to="/feed" collapsed={!sidebarOpen} />
            <SidebarItem icon={<BadgeDollarSign size={20}/>} label="Pricing" to="/pricing" collapsed={!sidebarOpen} />
            <SidebarItem icon={<UserIcon size={20}/>} label="Account" to="/account" collapsed={!sidebarOpen} />
          </nav>

          <div className="p-6 border-t border-slate-800 space-y-4">
            <button onClick={handleLogout} className={`w-full flex items-center ${sidebarOpen ? 'px-4 justify-start' : 'justify-center'} py-4 rounded-2xl text-slate-500 hover:bg-red-500/5 hover:text-red-400 transition-all gap-4 text-[10px] font-black uppercase tracking-widest`}>
              <LogOut size={18} />
              {sidebarOpen && <span>Sign Out</span>}
            </button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-600">
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#0a0f1d] p-6 md:p-12 relative">
          <div className="absolute top-0 right-0 w-[60%] h-[50%] bg-blue-600/5 blur-[150px] -z-10 rounded-full"></div>
          <div className="max-w-7xl mx-auto h-full">
            <Routes>
              <Route path="/" element={<Dashboard data={campaignsWithStats} stats={stats} setStats={setStats} deals={deals} setDeals={setDeals} settings={settings} />} />
              <Route path="/advisor" element={<Advisor campaigns={campaignsWithStats} settings={settings} />} />
              <Route path="/data" element={<DataCenter stats={stats} setStats={setStats} campaigns={campaigns} userId={userId} />} />
              <Route path="/assets" element={<Assets assets={assets} setAssets={setAssets} campaigns={campaigns} stats={stats} settings={settings} />} />
              <Route path="/campaigns" element={<Campaigns campaigns={campaigns} setCampaigns={setCampaigns} assets={assets} stats={stats} settings={settings} userId={userId} />} />
              <Route path="/feed" element={<Attribution deals={deals} campaigns={campaigns} />} />
              <Route path="/pricing" element={<Pricing settings={settings} setSettings={setSettings} />} />
              <Route path="/account" element={<AccountSettings settings={settings} setSettings={setSettings} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, to: string, collapsed: boolean }> = ({ icon, label, to, collapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      className={`flex items-center gap-4 px-4 py-4 rounded-[1.2rem] transition-all duration-300 group ${
        isActive 
          ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20' 
          : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent hover:border-slate-800'
      }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-slate-600 group-hover:text-blue-500'} transition-colors flex-shrink-0`}>
        {icon}
      </span>
      {!collapsed && <span className="font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">{label}</span>}
    </Link>
  );
};

export default App;
