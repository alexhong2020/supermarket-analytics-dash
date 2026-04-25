import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  History, 
  Calendar,
  Layers,
  ArrowRight,
  RefreshCcw,
  Zap
} from 'lucide-react';
import { SaleRecord, Language } from '../types';
import { DataImport } from './DataImport';
import { cn, CATEGORY_MAP } from '../lib/utils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell,
  LabelList
} from 'recharts';

interface YoYComparisonProps {
  lang: Language;
  currentData: SaleRecord[];
  baselineData: SaleRecord[];
  onBaselineImport: (data: SaleRecord[]) => void;
  onResetBaseline: () => void;
}

export function YoYComparison({ 
  lang, 
  currentData, 
  baselineData, 
  onBaselineImport,
  onResetBaseline
}: YoYComparisonProps) {
  
  const hasBaseline = baselineData.length > 0;

  const dailyComparisonData = useMemo(() => {
    if (!hasBaseline) return [];

    const currentDaily: Record<number, number> = {};
    const baselineDaily: Record<number, number> = {};

    currentData.forEach(s => {
      const day = new Date(s.timestamp).getDate();
      currentDaily[day] = (currentDaily[day] || 0) + (s.totalAmount || 0);
    });

    baselineData.forEach(s => {
      const day = new Date(s.timestamp).getDate();
      baselineDaily[day] = (baselineDaily[day] || 0) + (s.totalAmount || 0);
    });

    // Generate 1-28/29/30/31 days
    const allDays = Array.from({ length: 31 }, (_, i) => i + 1);
    return allDays.map(day => ({
      day,
      current: currentDaily[day] || 0,
      baseline: baselineDaily[day] || 0,
    })).filter(d => d.current > 0 || d.baseline > 0);
  }, [currentData, baselineData, hasBaseline]);

  const comparisonStats = useMemo(() => {
    if (!hasBaseline) return null;

    const currentRev = currentData.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const baselineRev = baselineData.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const revDelta = baselineRev > 0 ? ((currentRev - baselineRev) / baselineRev) * 100 : 0;

    const currentTrans = currentData.length;
    const baselineTrans = baselineData.length;
    const transDelta = baselineTrans > 0 ? ((currentTrans - baselineTrans) / baselineTrans) * 100 : 0;

    const currentItems = currentData.reduce((acc, s) => acc + s.items.reduce((ia, i) => ia + i.quantity, 0), 0);
    const baselineItems = baselineData.reduce((acc, s) => acc + s.items.reduce((ia, i) => ia + i.quantity, 0), 0);
    const itemDelta = baselineItems > 0 ? ((currentItems - baselineItems) / baselineItems) * 100 : 0;

    const avgBasketCurrent = currentTrans > 0 ? currentRev / currentTrans : 0;
    const avgBasketBaseline = baselineTrans > 0 ? baselineRev / baselineTrans : 0;
    const basketDelta = avgBasketBaseline > 0 ? ((avgBasketCurrent - avgBasketBaseline) / avgBasketBaseline) * 100 : 0;

    return {
      rev: { current: currentRev, baseline: baselineRev, delta: revDelta },
      trans: { current: currentTrans, baseline: baselineTrans, delta: transDelta },
      items: { current: currentItems, baseline: baselineItems, delta: itemDelta },
      basket: { current: avgBasketCurrent, baseline: avgBasketBaseline, delta: basketDelta }
    };
  }, [currentData, baselineData, hasBaseline]);

  const departmentComparison = useMemo(() => {
    if (!hasBaseline) return [];

    const depts: Record<string, { current: number, baseline: number }> = {};
    
    currentData.forEach(s => s.items.forEach(i => {
      const name = CATEGORY_MAP[i.department] || `Dept ${i.department}`;
      if (!depts[name]) depts[name] = { current: 0, baseline: 0 };
      depts[name].current += i.quantity;
    }));

    baselineData.forEach(s => s.items.forEach(i => {
      const name = CATEGORY_MAP[i.department] || `Dept ${i.department}`;
      if (!depts[name]) depts[name] = { current: 0, baseline: 0 };
      depts[name].baseline += i.quantity;
    }));

    return Object.entries(depts)
      .map(([name, data]) => ({
        name,
        current: data.current,
        baseline: data.baseline,
        delta: data.baseline > 0 ? ((data.current - data.baseline) / data.baseline) * 100 : 0
      }))
      .sort((a, b) => b.delta - a.delta);
  }, [currentData, baselineData, hasBaseline]);

  if (!hasBaseline) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-500">
        <div className="bg-primary p-12 rounded-xl text-primary-foreground overflow-hidden relative shadow-2xl">
           <div className="relative z-10">
              <div className="bg-white/10 w-16 h-16 rounded-lg flex items-center justify-center mb-8 backdrop-blur-md border border-white/20">
                 <RefreshCcw className="w-8 h-8 text-emerald-100 animate-spin-slow" />
              </div>
              <h2 className="text-3xl font-bold mb-4 leading-tight uppercase tracking-tight">Year-over-Year Analyzer</h2>
           </div>
           <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
              <History className="w-full h-full scale-150 rotate-12" />
           </div>
        </div>

        <DataImport 
          lang={lang} 
          onImport={onBaselineImport} 
          title="Baseline Calibration"
          description="Drop your historical sales reports to enable comparative growth engines."
        />
      </div>
    );
  }

  const stats = [
    { label: 'Total Revenue', key: 'rev', symbol: '$' },
    { label: 'Total Transactions', key: 'trans', symbol: '' },
    { label: 'Avg Basket Value', key: 'basket', symbol: '$' },
    { label: 'Units Sold', key: 'items', symbol: '' },
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const data = (comparisonStats as any)[s.key];
          const isUp = data.delta >= 0;
          return (
            <div key={i} className="bg-card p-6 rounded-xl border border-border shadow-card relative overflow-hidden group hover:shadow-card-hover transition-all">
              <div className="flex justify-between items-start mb-4">
                <span className="headline-3 text-muted-foreground uppercase">{s.label}</span>
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded body-3 font-bold",
                  isUp ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"
                )}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(data.delta).toFixed(1)}%
                </div>
              </div>
              <div className="space-y-1">
                <p className="headline-1 text-foreground">
                   {s.symbol}{data.current.toLocaleString(undefined, { maximumFractionDigits: (s.key === 'rev' || s.key === 'basket') ? 2 : 0 })}
                </p>
                <p className="body-3 text-muted-foreground font-bold uppercase">
                  Baseline: {s.symbol}{data.baseline.toLocaleString(undefined, { maximumFractionDigits: (s.key === 'rev' || s.key === 'basket') ? 2 : 0 })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Revenue Comparison Bar Chart */}
      <div className="bg-card p-8 rounded-xl border border-border shadow-card relative overflow-hidden">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-primary-muted p-2.5 rounded-xl">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="headline-2 text-foreground">Revenue by Day of Month</h2>
            <p className="body-2 font-medium text-muted-foreground uppercase mt-0.5">Comparative daily trajectory (Current vs Baseline)</p>
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyComparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 14, fill: 'var(--muted-foreground)', fontWeight: 600 }}
                label={{ value: 'Day of Month', position: 'insideBottom', offset: -10, fontSize: 14, fontWeight: 700, fill: 'var(--muted-foreground)' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 14, fill: 'var(--muted-foreground)', fontWeight: 600 }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip 
                cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  zIndex: 50
                }}
                formatter={(val: number) => [`$${val.toLocaleString()}`, '']}
              />
              <Legend 
                verticalAlign="top" 
                height={48} 
                iconType="circle" 
                iconSize={12}
                wrapperStyle={{ paddingBottom: '30px', fontSize: '16px', fontWeight: 700 }}
              />
              <Bar 
                dataKey="current" 
                name="2026 (Current)" 
                fill="#AD0000" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
              <Bar 
                dataKey="baseline" 
                name="2025 (Baseline)" 
                fill="#94A3B8" 
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Department Growth Chart - Full Width */}
        <div className="bg-card p-8 rounded-xl shadow-card border border-border">
          <div className="flex justify-between items-center mb-10">
             <div>
                <h2 className="headline-2 text-foreground">Department YoY Growth</h2>
                <p className="body-2 font-bold text-muted-foreground uppercase mt-0.5">Volume change (%) vs baseline</p>
             </div>
             <div className="bg-primary-muted p-2.5 rounded-xl">
                <Layers className="w-6 h-6 text-primary" />
             </div>
          </div>
          
          <div className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentComparison} layout="vertical" margin={{ left: 20, right: 80, top: 20, bottom: 40 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                   <XAxis type="number" hide />
                   <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={140} 
                    axisLine={false} 
                    tickLine={false}
                    interval={0}
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const text = payload.value.length > 18 ? payload.value.substring(0, 15) + '...' : payload.value;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={-5} 
                            y={0} 
                            dy={4} 
                            textAnchor="end" 
                            fill="#1e293b" 
                            fontSize={10} 
                            fontWeight={900} 
                            className="uppercase"
                          >
                            {text}
                          </text>
                        </g>
                      );
                    }}
                   />
                   <Tooltip 
                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-border min-w-[240px] z-[100]">
                            <p className="headline-3 font-bold uppercase mb-4 text-foreground">{d.name}</p>
                            <div className="space-y-2">
                              <p className="body-3 font-bold text-muted-foreground uppercase flex justify-between">Current: <span className="text-foreground">{d.current.toLocaleString()}</span></p>
                              <p className="body-3 font-bold text-muted-foreground uppercase flex justify-between">Baseline: <span className="text-foreground">{d.baseline.toLocaleString()}</span></p>
                              <div className={cn("headline-2 font-bold mt-4 flex items-center gap-2", d.delta >= 0 ? "text-brand-green" : "text-brand-red")}>
                                {d.delta >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                {Math.abs(d.delta).toFixed(1)}% YoY
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                   />
                   <Bar dataKey="delta" radius={[0, 6, 6, 0]} barSize={24}>
                      {departmentComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.delta >= 0 ? '#026600' : '#AD0000'} />
                      ))}
                      <LabelList 
                        dataKey="delta" 
                        position="right" 
                        formatter={(val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`}
                        style={{ fontSize: '10px', fontWeight: 700, fill: 'var(--muted-foreground)' }}
                      />
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Insight Section */}
        <div className="bg-card p-10 rounded-2xl shadow-card border border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-primary" />
              <div>
                <h2 className="headline-2 text-foreground uppercase">Performance Delta Analysis</h2>
                <p className="body-3 font-bold text-muted-foreground uppercase opacity-60 mt-0.5">Comparative growth by department ranking</p>
              </div>
            </div>
            <button 
              onClick={onResetBaseline}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all headline-3 uppercase"
            >
              <RefreshCcw className="w-4 h-4" />
              Reset Historical Baseline
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-10">
             {departmentComparison.map((d, i) => (
                <div key={i} className="flex items-center gap-6 group">
                   <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 headline-2 font-black shadow-sm",
                      d.delta >= 0 ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"
                   )}>
                      {i + 1}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="body-2 font-black text-foreground uppercase truncate leading-tight group-hover:text-primary transition-colors" title={d.name}>{d.name}</p>
                      <p className="body-3 font-bold text-muted-foreground uppercase opacity-60">Volume: {d.current.toLocaleString()}</p>
                   </div>
                   <div className={cn("headline-2 font-black whitespace-nowrap", d.delta >= 0 ? "text-brand-green" : "text-brand-red")}>
                      {d.delta >= 0 ? '+' : ''}{d.delta.toFixed(1)}%
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
