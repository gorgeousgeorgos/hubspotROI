import React, { useEffect, useState } from 'react';

interface Run {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  message: string | null;
}

const SchedulerRuns: React.FC = () => {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/scheduler_runs');
      const data = await res.json();
      setRuns(data || []);
    } catch (err) {
      console.warn('Failed to fetch runs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black text-slate-200">Scheduler Runs</h4>
        <button className="text-xs px-3 py-1 bg-slate-800 rounded-xl" onClick={fetchRuns}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      <div className="space-y-2 text-sm text-slate-400">
        {runs.length === 0 && <div className="text-xs">No runs found</div>}
        {runs.map(r => (
          <div key={r.id} className="flex items-center justify-between p-2 bg-slate-950/20 rounded-lg">
            <div className="text-xs">
              <div className="font-mono text-slate-300">{new Date(r.started_at).toLocaleString()}</div>
              <div className="text-[11px] text-slate-400">{r.message || ''}</div>
            </div>
            <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : r.status === 'running' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
              {r.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchedulerRuns;
