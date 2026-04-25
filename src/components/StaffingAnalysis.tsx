import React, { useMemo } from 'react';
import { 
  Clock,
  Info
} from 'lucide-react';
import { SaleRecord, Language } from '../types';
import { LANGUAGES } from '../lib/utils';

interface StaffingAnalysisProps {
  lang: Language;
  salesData: SaleRecord[];
}

export function StaffingAnalysis({ lang, salesData }: StaffingAnalysisProps) {
  const t = LANGUAGES[lang];

  // Staffing Heatmap Data (7 Days x Market Hours 08:00-20:00)
  const heatmapData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grid: Record<string, number> = {};
    const dayCounts: Record<string, Set<string>> = {};
    
    // Initialize
    days.forEach(d => {
      for (let h = 8; h <= 20; h++) grid[`${d}-${h}`] = 0;
      dayCounts[d] = new Set();
    });

    salesData.forEach(sale => {
      const d = new Date(sale.timestamp);
      if (isNaN(d.getTime())) return;
      const dayName = days[d.getUTCDay()];
      const hour = d.getUTCHours();
      const dateStr = d.toISOString().split('T')[0];
      
      dayCounts[dayName].add(dateStr);
      
      if (hour >= 8 && hour <= 20) {
        grid[`${dayName}-${hour}`] += 1;
      }
    });

    // Calculate averages
    const averages: Record<string, number> = {};
    days.forEach(d => {
      const count = dayCounts[d].size || 1;
      for (let h = 8; h <= 20; h++) {
        averages[`${d}-${h}`] = Number((grid[`${d}-${h}`] / count).toFixed(1));
      }
    });

    return { days, grid: averages };
  }, [salesData]);

  const maxHeat = Math.max(...Object.values(heatmapData.grid), 1);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="bg-card p-8 rounded-xl border border-border shadow-card">
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary-muted p-2 rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="headline-2 text-foreground">Traffic Analysis & Staffing Baseline</h2>
              <p className="body-3 font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Average transactions per hour (8:00 - 20:00)</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4 bg-secondary/50 p-2 rounded-lg border border-border">
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border border-border" style={{ backgroundColor: '#FFF3F3' }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Low</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#E19F9F' }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Med</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#AD0000' }} />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">High</span>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="min-w-[800px]">
             {/* Day Labels (Columns) */}
             <div className="flex ml-20 mb-6">
                {heatmapData.days.map(day => (
                  <div key={day} className="flex-1 headline-3 text-muted-foreground text-center uppercase">
                    {day}
                  </div>
                ))}
             </div>
             
             {/* Hour Rows */}
             {Array.from({ length: 13 }).map((_, i) => {
                const h = i + 8;
                return (
                  <div key={h} className="flex items-center mb-2 group">
                    <div className="w-20 headline-3 text-muted-foreground uppercase">{h}:00</div>
                    <div className="flex flex-1 gap-2">
                       {heatmapData.days.map(day => {
                        const val = heatmapData.grid[`${day}-${h}`];
                        const normalized = val / maxHeat;
                        // Sharper contrast mapping: square the normalized value to push low values lower and high values higher
                        const intensity = Math.pow(normalized, 1.2); 
                        return (
                          <div 
                            key={day}
                            title={`${day} @ ${h}:00 - ${val} transactions`}
                            className="flex-1 h-12 rounded-lg transition-all hover:scale-[1.02] hover:brightness-90 cursor-help border border-border/20 shadow-sm relative group/cell"
                            style={{ 
                              backgroundColor: val > 0 
                                ? `rgba(173, 0, 0, ${Math.max(0.05, intensity * 0.9 + 0.1)})` 
                                : 'var(--secondary)'
                            }}
                          >
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                                <span className="text-[10px] font-black text-brand-red bg-card px-1.5 py-0.5 rounded shadow-sm border border-brand-red/20">
                                   {val}
                                </span>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}
