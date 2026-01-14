
import React, { useState } from 'react';
import { Zap, ShieldCheck, Mail, Lock, ArrowRight, RefreshCw, Database } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setLoading(true);
      setStatus('Validating JWT...');
      
      setTimeout(() => {
        setStatus('Syncing with Growth Foundry Backend...');
        setTimeout(() => {
          setStatus('Ready.');
          onLogin(email);
        }, 800);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/5 rounded-full blur-[150px]"></div>
        <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] h-full w-full">
          {Array.from({ length: 400 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-slate-800/20"></div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-lg space-y-10 relative z-10">
        <div className="text-center">
          <div className="mx-auto bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-3xl w-fit shadow-2xl shadow-blue-500/30 mb-8 transform rotate-3">
            <Zap className="w-10 h-10 text-white" fill="currentColor" />
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter italic uppercase leading-none">The Foundry</h1>
          <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-[0.4em]">Actionable Attribution</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
              <div className="flex flex-col items-center">
                <p className="text-white font-black uppercase tracking-widest text-sm italic">{status}</p>
                <div className="mt-4 flex gap-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-300"></div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Operator Identity</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all font-bold shadow-inner"
                    placeholder="name@foundry.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Access Key</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="password"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-slate-700 focus:border-blue-500 outline-none transition-all font-bold shadow-inner"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-3 group"
              >
                Enter Portfolio
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          <div className="mt-12 pt-8 border-t border-slate-800/50 flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck size={14} className="text-blue-500" />
                Enterprise MFA Required
             </div>
             <div className="flex items-center gap-2 text-slate-600 text-[9px] font-bold">
                <Database size={12} /> Syncing to Growth Foundry CRM Hub
             </div>
          </div>
        </div>
        
        <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
          New deployment? <a href="#" className="text-blue-400 hover:text-blue-300">Request Access Key</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
