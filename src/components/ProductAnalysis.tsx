import React, { useMemo, useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  ShoppingBag, 
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  Search,
  Sparkles,
  Package,
  ArrowUpDown
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import { Language, SaleRecord } from '../types';
import { LANGUAGES, CATEGORY_MAP } from '../lib/utils';
import { cn } from '../lib/utils';

interface ProductAnalysisProps {
  lang: Language;
  salesData: SaleRecord[];
}

const COLORS = [
  '#026600', // Brand Green
  '#2563eb', // Blue 600
  '#7c3aed', // Overridden
  '#db2777',
  '#ea580c',
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#10b981', // Emerald 500
  '#3b82f6', // Blue 500
  '#ef4444', // Red 500
];

type SortKey = 'id' | 'date' | 'time' | 'amount' | 'method';
type SortOrder = 'asc' | 'desc';

export function ProductAnalysis({ lang, salesData }: ProductAnalysisProps) {
  const t = LANGUAGES[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Adjust time to ET (+5 hours)
  const adjustTimeToET = (timestamp: string) => {
    const d = new Date(timestamp);
    d.setHours(d.getHours() + 5);
    return d;
  };

  // 1. AI Summary Data
  const aiSummary = useMemo(() => {
    return {
      title: "Strategic Performance TL;DR",
      points: [
        "Grocery and Fresh categories represent significant volume share.",
        "Evening peak (5 PM - 7 PM) continues to drive highest basket conversion.",
        "Performance benchmarks holding steady across primary departments.",
        "Operational focus: Monitor slow-mover inventory rotation weekly."
      ]
    };
  }, []);

  // 2. Category Performance
  const categoryData = useMemo(() => {
    const revenue: Record<string, number> = {};
    const units: Record<string, number> = {};
    
    salesData.forEach(sale => {
      sale.items.forEach(item => {
        const catLabel = CATEGORY_MAP[item.department] || `Dept ${item.department}`;
        revenue[catLabel] = (revenue[catLabel] || 0) + (item.amount || (item.price * item.quantity));
        units[catLabel] = (units[catLabel] || 0) + item.quantity;
      });
    });

    const total = Object.values(revenue).reduce((a, b) => a + b, 0);

    return Object.entries(revenue)
      .map(([name, value]) => ({ 
        name, 
        value, 
        units: units[name],
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [salesData]);

  // 3. Best / Worst Selling SKUs
  const skuStats = useMemo(() => {
    const products: Record<string, { sku: string, name: string, nameZh: string, sales: number, revenue: number }> = {};
    salesData.forEach(sale => {
      sale.items.forEach(item => {
        if (!products[item.sku]) {
          products[item.sku] = { sku: item.sku, name: item.name, nameZh: item.nameZh, sales: 0, revenue: 0 };
        }
        products[item.sku].sales += item.quantity;
        products[item.sku].revenue += (item.amount || (item.price * item.quantity));
      });
    });

    const sorted = Object.values(products).sort((a, b) => b.sales - a.sales);
    return {
      top: sorted.slice(0, 10),
      bottom: sorted.slice(-10).reverse()
    };
  }, [salesData]);

  // 4. Bundle Identification (Common pairs) - Based on SKU correlate but filtered for complements
  const bundles = useMemo(() => {
    const pairs: Record<string, number> = {};
    salesData.forEach(sale => {
      // Exclude items with no item_no and barcode (mapped to sku)
      const validItems = sale.items
        .filter(i => i.sku && i.sku !== 'UNKNOWN' && !i.name.toLowerCase().includes('discount'))
        .map(i => lang === 'zh' ? i.nameZh : i.name);
      
      if (validItems.length < 2) return;
      
      // Look for distinct product IDs that appear together
      for (let i = 0; i < validItems.length; i++) {
        for (let j = i + 1; j < validItems.length; j++) {
          const itemA = validItems[i];
          const itemB = validItems[j];
          
          if (itemA !== itemB) {
            const pair = [itemA, itemB].sort().join(' + ');
            pairs[pair] = (pairs[pair] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(pairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([pair, count]) => ({ pair, count }));
  }, [salesData, lang]);

  // 5. Filtered & Sorted Sales for Log
  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let data = salesData.filter(sale => {
      if (!term) return true;
      return sale.items.some(item => 
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        sale.id.toLowerCase().includes(term)
      );
    });

    // Sort
    data.sort((a, b) => {
      let valA: any, valB: any;
      if (sortKey === 'id') { valA = a.id; valB = b.id; }
      else if (sortKey === 'date') { valA = new Date(a.timestamp).getTime(); valB = new Date(b.timestamp).getTime(); }
      else if (sortKey === 'time') { 
        const dateA = adjustTimeToET(a.timestamp);
        const dateB = adjustTimeToET(b.timestamp);
        valA = dateA.getHours() * 3600 + dateA.getMinutes() * 60 + dateA.getSeconds();
        valB = dateB.getHours() * 3600 + dateB.getMinutes() * 60 + dateB.getSeconds();
      }
      else if (sortKey === 'amount') { valA = a.totalAmount; valB = b.totalAmount; }
      else if (sortKey === 'method') { valA = a.paymentMethod; valB = b.paymentMethod; }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [salesData, searchTerm, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const ReceiptRow = (index: number) => {
    const sale = filteredSales[index];
    if (!sale) return null;

    const etDate = adjustTimeToET(sale.timestamp);

    return (
      <div className="flex border-b border-border hover:bg-muted/30 transition-colors items-center px-6 py-6 bg-card body-3 font-bold">
        <div className="w-[15%] pr-4 font-mono text-muted-foreground break-all">
          {sale.id}
        </div>
        <div className="w-[12%] pr-4">
          {etDate.toLocaleDateString()}
        </div>
        <div className="w-[10%] pr-4">
          {etDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="w-[38%] pr-4">
          <div className="flex flex-col gap-1.5">
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between gap-2 overflow-hidden items-center border-b border-border/10 last:border-0 pb-1.5">
                <span className="text-foreground truncate">
                  {lang === 'zh' ? item.nameZh : item.name}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[12%] pr-4 text-primary">
          ${sale.totalAmount.toFixed(2)}
        </div>
        <div className="w-[13%] text-muted-foreground uppercase">
          {sale.paymentMethod}
        </div>
      </div>
    );
  };

  const SortButton = ({ label, sKey, className }: { label: string, sKey: SortKey, className?: string }) => (
    <button 
      onClick={() => handleSort(sKey)}
      className={cn("flex items-center gap-1.5 hover:text-foreground transition-colors", className)}
    >
      {label}
      <ArrowUpDown className={cn("w-3 h-3", sortKey === sKey ? "text-primary" : "text-muted-foreground/50")} />
    </button>
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-card p-8 rounded-xl border border-border shadow-card relative overflow-hidden">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary-muted p-2 rounded-lg">
              <PieChartIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="headline-2 text-foreground">Revenue Share by Category</h2>
              <p className="body-3 font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Department performance breakdown</p>
            </div>
          </div>
          
          <div className="h-[420px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={140}
                  paddingAngle={5}
                  cornerRadius={6}
                  dataKey="value"
                  labelLine={false}
                  label={false}
                  isAnimationActive={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  animationDuration={100}
                  wrapperStyle={{ zIndex: 100 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card p-6 rounded-2xl border-2 border-border shadow-2xl relative z-[100]">
                          <p className="body-3 font-black text-muted-foreground uppercase leading-none mb-3">{data.name}</p>
                          <p className="headline-2 font-black text-foreground leading-none">${data.value.toLocaleString()}</p>
                          <p className="body-3 font-bold text-muted-foreground mt-3 uppercase">{data.percentage.toFixed(1)}% REVENUE SHARE</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="body-3 font-black text-muted-foreground uppercase block">Store</span>
              <span className="headline-1 font-black text-foreground block leading-none">Total</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-10">
            {categoryData.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-secondary/30 p-3 rounded-xl border border-border/50">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div className="min-w-0">
                  <p className="body-3 font-black text-muted-foreground truncate uppercase">{item.name}</p>
                  <p className="body-2 font-black text-foreground leading-none mt-1">{item.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performing SKUs Table */}
        <div className="lg:col-span-2 bg-card p-8 rounded-xl border border-border shadow-card">
          <div className="flex justify-between items-center mb-8">
             <h2 className="headline-2 text-foreground">Top Performing Products</h2>
             <div className="headline-3 text-muted-foreground bg-secondary px-2 py-1 rounded">Volume Leaderboard</div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
          <thead className="headline-3 text-muted-foreground border-b border-border">
                   <tr>
                      <th className="pb-4 font-bold">Product</th>
                      <th className="pb-4 font-bold">Category</th>
                      <th className="pb-4 font-bold text-right">Units Sold</th>
                      <th className="pb-4 font-bold text-right">Revenue</th>
                      <th className="pb-4 font-bold text-right">-</th>
                   </tr>
                </thead>
                 <tbody className="body-3">
                   {skuStats.top.map((sku, i) => (
                     <tr key={sku.sku} className="group border-b border-border/50 last:border-0">
                        <td className="py-6 font-bold text-foreground uppercase group-hover:text-primary transition-colors">
                           {lang === 'zh' ? sku.nameZh : sku.name}
                           <span className="block body-3 font-medium text-muted-foreground font-mono mt-1">#{sku.sku}</span>
                        </td>
                        <td className="py-6">
                           <span className="bg-secondary px-3 py-1.5 rounded-lg body-3 font-bold text-muted-foreground uppercase">
                              {(() => {
                                 const item = salesData.flatMap(s => s.items).find(it => it.sku === sku.sku);
                                 return item ? (CATEGORY_MAP[item.department] || `Dept ${item.department}`) : 'Misc';
                              })()}
                           </span>
                        </td>
                        <td className="py-6 text-right font-bold tabular-nums">{sku.sales}</td>
                        <td className="py-6 text-right font-bold tabular-nums">${sku.revenue.toLocaleString()}</td>
                        <td className="py-6 text-right">
                           <div className="inline-flex items-center gap-1 text-muted-foreground font-bold body-3">
                              -
                           </div>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      </div>

      {/* 4. BUNDLE ANALYSIS SECTION */}
      <div className="bg-card p-8 rounded-xl border border-border shadow-card">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary-muted p-2 rounded-lg">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="headline-2 text-foreground">Complementary Product Pairings</h2>
            <p className="body-3 font-medium text-muted-foreground uppercase tracking-widest mt-0.5">High affinity bundles detected via SKU correlation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map((bundle, idx) => (
            <div key={idx} className="group p-8 rounded-2xl bg-secondary border border-border hover:border-primary/50 transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-card p-3 rounded-xl shadow-sm">
                   <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="body-3 font-bold bg-card px-3 py-1.5 rounded-lg border border-border shadow-sm text-primary uppercase">
                   {bundle.count}x Pairs
                </div>
              </div>
              <h4 className="body-2 font-bold text-foreground mb-3 leading-relaxed uppercase">
                {bundle.pair}
              </h4>
               <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-6">
                 <div className="h-full bg-primary" style={{ width: `${(bundle.count / bundles[0].count) * 100}%` }} />
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SLOW MOVERS SECTION */}
      <div className="bg-card p-8 rounded-xl border border-border shadow-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="headline-2 text-foreground">Slow Moving Items</h2>
              <p className="headline-3 text-muted-foreground mt-1">
                Note: Does not include items that have not sold at all.
              </p>
            </div>
         </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {skuStats.bottom.map((sku, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-secondary border border-border hover:border-brand-red/50 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-card p-3 rounded-xl shadow-sm group-hover:text-brand-red transition-colors">
                     <Package className="w-5 h-5" />
                  </div>
                  <div className="body-3 font-bold bg-card px-3 py-1.5 rounded-lg border border-border shadow-sm text-brand-red uppercase flex items-center gap-1">
                     <ArrowDownRight className="w-3 h-3" />
                     {sku.sales} Sold
                  </div>
                </div>
                <h4 className="body-2 font-bold text-foreground mb-1 leading-relaxed uppercase truncate" title={lang === 'zh' ? sku.nameZh : sku.name}>
                  {lang === 'zh' ? sku.nameZh : sku.name}
                </h4>
                <p className="body-3 font-black text-muted-foreground font-mono opacity-60 uppercase">#{sku.sku}</p>
              </div>
            ))}
          </div>
      </div>

      {/* 6. TRANSACTIONS SECTION */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden h-[700px] flex flex-col">
        <div className="p-8 border-b border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div>
                <h3 className="text-base font-bold text-foreground uppercase tracking-tight">Transactions</h3>
             </div>
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                <input 
                   type="text"
                   placeholder="Search SKUs, IDs, Names..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
             </div>
          </div>
        </div>
        
        <div className="bg-muted border-b border-border flex px-6 py-4 body-3 font-bold text-muted-foreground uppercase flex-shrink-0">
          <div className="w-[15%]"><SortButton label="Trans ID" sKey="id" /></div>
          <div className="w-[12%]"><SortButton label="Date" sKey="date" /></div>
          <div className="w-[10%]"><SortButton label="Time" sKey="time" /></div>
          <div className="w-[38%]">Item</div>
          <div className="w-[12%]"><SortButton label="Amount" sKey="amount" /></div>
          <div className="w-[13%]"><SortButton label="Method" sKey="method" /></div>
        </div>
        
        <div className="flex-1 w-full min-h-0">
          <Virtuoso
            style={{ height: '100%' }}
            data={filteredSales}
            itemContent={ReceiptRow}
            computeItemKey={(_, item) => item.id}
            className="scrollbar-hide"
          />
        </div>
      </div>

    </div>
  );
}
