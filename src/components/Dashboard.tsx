import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  DollarSign,
  ArrowLeftRight,
  ShoppingBasket,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { Language, SaleRecord } from '../types';
import { LANGUAGES, CATEGORY_MAP } from '../lib/utils';
import { cn } from '../lib/utils';

interface DashboardProps {
  lang: Language;
  salesData: SaleRecord[];
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  '#f59e0b', // Amber 500
  '#8b5cf6', // Violet 500
  '#ec4899', // Pink 500
  '#10b981', // Emerald 500
  '#3b82f6', // Blue 500
];

type TimeFrame = 'month' | 'week1' | 'week2' | 'week3' | 'week4';

export function Dashboard({ lang, salesData }: DashboardProps) {
  const t = LANGUAGES[lang];
  const [timeframe, setTimeframe] = useState<TimeFrame>('month');

  const filteredSales = useMemo(() => {
    if (salesData.length === 0) return [];
    
    // For this prototype, we assume Feb 2026 data based on timestamps
    const raw = timeframe === 'month' ? salesData : salesData.filter(s => {
      const day = new Date(s.timestamp).getUTCDate();
      if (timeframe === 'week1') return day >= 1 && day <= 7;
      if (timeframe === 'week2') return day >= 8 && day <= 14;
      if (timeframe === 'week3') return day >= 15 && day <= 21;
      if (timeframe === 'week4') return day >= 22;
      return true;
    });

    return raw.filter(s => {
      const isVoid = s.paymentMethod.toLowerCase().includes('void') || 
                     s.items.some(i => i.name.toLowerCase().includes('void'));
      return !isVoid;
    });
  }, [salesData, timeframe]);
  
  const stats = useMemo(() => {
    if (filteredSales.length === 0) {
       return [
        { label: t.marketRevenue, value: '$0.00', change: '0%', isUp: true, icon: DollarSign },
        { label: t.transactions, value: '0', change: '0%', isUp: true, icon: ArrowLeftRight },
        { label: t.avgBasketValue, value: '$0.00', change: '0%', isUp: true, icon: ShoppingBasket },
        { label: t.unitsSold, value: '0', change: '0%', isUp: true, icon: Tag },
      ];
    }

    const totalRev = filteredSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalUnits = filteredSales.reduce((acc, sale) => 
        acc + sale.items.filter(i => !i.name.toLowerCase().includes('discount'))
                        .reduce((itemAcc, item) => itemAcc + (item.quantity || 0), 0), 0
      );
    const avgOrder = filteredSales.length > 0 ? totalRev / filteredSales.length : 0;
    
    // Calculate previous period stats for growth math
    const getPreviousPeriodSales = () => {
      if (timeframe === 'month') return []; // No prev month in current dataset
      const prevWeekMap: Record<TimeFrame, TimeFrame | null> = {
        'week1': null,
        'week2': 'week1',
        'week3': 'week2',
        'week4': 'week3',
        'month': null
      };
      const prevTf = prevWeekMap[timeframe];
      if (!prevTf) return [];
      
      return salesData.filter(s => {
        const day = new Date(s.timestamp).getUTCDate();
        if (prevTf === 'week1') return day >= 1 && day <= 7;
        if (prevTf === 'week2') return day >= 8 && day <= 14;
        if (prevTf === 'week3') return day >= 15 && day <= 21;
        return false;
      });
    };

    const prevSales = getPreviousPeriodSales();
    const prevRev = prevSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const prevTrans = prevSales.length;
    const prevUnits = prevSales.reduce((acc, sale) => 
        acc + sale.items.filter(i => !i.name.toLowerCase().includes('discount'))
                        .reduce((itemAcc, item) => itemAcc + (item.quantity || 0), 0), 0
      );
    const prevAvgOrder = prevTrans > 0 ? prevRev / prevTrans : 0;

    const calcGrowth = (current: number, previous: number) => {
      if (previous === 0) return { val: '0%', isUp: true, isBase: true };
      const change = ((current - previous) / previous) * 100;
      return {
        val: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
        isUp: change >= 0,
        isBase: false
      };
    };

    const revGrowth = calcGrowth(totalRev, prevRev);
    const transGrowth = calcGrowth(filteredSales.length, prevTrans);
    const basketGrowth = calcGrowth(avgOrder, prevAvgOrder);
    const unitGrowth = calcGrowth(totalUnits, prevUnits);

    const getGrowthDisplay = (growth: any) => {
      if (timeframe === 'month') return { val: 'STABLE', isUp: true };
      if (growth.isBase) return { val: 'BASE', isUp: true };
      return growth;
    };

    const revDisp = getGrowthDisplay(revGrowth);
    const transDisp = getGrowthDisplay(transGrowth);
    const basketDisp = getGrowthDisplay(basketGrowth);
    const unitDisp = getGrowthDisplay(unitGrowth);

    return [
      { 
        label: t.marketRevenue, 
        value: `$${totalRev.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 
        change: revDisp.val, 
        changeLabel: timeframe === 'month' ? 'Target Reached' : 'vs prev week',
        isUp: revDisp.isUp, 
        icon: DollarSign, 
      },
      { 
        label: t.transactions, 
        value: filteredSales.length.toLocaleString(), 
        change: transDisp.val, 
        changeLabel: timeframe === 'month' ? 'Total Volume' : 'vs prev week',
        isUp: transDisp.isUp, 
        icon: ArrowLeftRight, 
      },
      { 
        label: t.avgBasketValue, 
        value: `$${avgOrder.toFixed(2)}`, 
        change: basketDisp.val, 
        changeLabel: timeframe === 'month' ? 'Period Average' : 'vs prev week',
        isUp: basketDisp.isUp, 
        icon: ShoppingBasket, 
      },
      { 
        label: t.unitsSold, 
        value: totalUnits.toLocaleString(), 
        change: unitDisp.val, 
        changeLabel: timeframe === 'month' ? 'Volume Count' : 'vs prev week',
        isUp: unitDisp.isUp, 
        icon: Tag, 
      },
    ];
  }, [filteredSales, salesData, t, timeframe]);

  const departmentDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const label = CATEGORY_MAP[item.department] || `Dept ${item.department}`;
        counts[label] = (counts[label] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredSales]);

  const trendData = useMemo(() => {
    const dates: Record<string, number> = {};
    
    filteredSales.forEach(sale => {
      const d = new Date(sale.timestamp);
      if (isNaN(d.getTime())) return;
      
      const m = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const dateStr = timeframe === 'month' ? `${m}/${day}` : `${day}`;
      dates[dateStr] = (dates[dateStr] || 0) + (sale.totalAmount || 0);
    });

    return Object.entries(dates)
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => {
        if (timeframe === 'month') {
          const [m1, d1] = a.date.split('/').map(Number);
          const [m2, d2] = b.date.split('/').map(Number);
          return (m1 * 100 + d1) - (m2 * 100 + d2);
        }
        return Number(a.date) - Number(b.date);
      });
  }, [filteredSales, timeframe]);

  const trendingProducts = useMemo(() => {
    const products: Record<string, { name: string, nameZh: string, dept: string, sales: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!products[item.sku]) {
          products[item.sku] = { name: item.name, nameZh: item.nameZh, dept: item.department, sales: 0 };
        }
        products[item.sku].sales += item.quantity;
      });
    });

    return Object.values(products)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [filteredSales]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Timeframe Filter */}
      <div className="flex items-center justify-between">
        <div className="flex bg-secondary p-1 rounded-lg">
          {(['month', 'week1', 'week2', 'week3', 'week4'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-4 py-1.5 rounded-md headline-3 uppercase tracking-widest transition-all",
                timeframe === tf 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tf === 'month' ? 'Aggregated' : `Week ${tf.slice(-1)}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card px-3 py-1.5 rounded-lg border border-border">
          <Calendar className="w-3.5 h-3.5" />
          Feb 2026
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-card p-5 rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="headline-3 text-muted-foreground uppercase">{stat.label}</p>
                <h2 className="headline-1 text-foreground mt-1 tabular-nums">{stat.value}</h2>
              </div>
              <div className="bg-primary-muted p-2 rounded-full text-primary">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={cn(
                "flex items-center gap-0.5 body-3 font-bold px-1.5 py-0.5 rounded-md",
                stat.isUp ? "text-brand-green bg-brand-green/5" : "text-brand-red bg-brand-red/5"
              )}>
                {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
              <span className="body-3 font-medium text-muted-foreground uppercase">{stat.changeLabel}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Daily Trend Area Chart */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-card">
          <div className="flex justify-between items-center mb-8">
            <h2 className="headline-2 text-foreground">{t.dailyTrend}</h2>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#026600" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#026600" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }}
                  tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-card)',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="var(--foreground)" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
