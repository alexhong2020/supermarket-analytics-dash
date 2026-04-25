import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  PieChart as PieChartIcon, 
  History, 
  Menu,
  X,
  Store,
  Database,
  Languages,
  Compass
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ProductAnalysis } from './components/ProductAnalysis';
import { StaffingAnalysis } from './components/StaffingAnalysis';
import { YoYComparison } from './components/YoYComparison';
import { DataImport } from './components/DataImport';
import { Language, SaleRecord } from './types';
import { LANGUAGES } from './lib/utils';
import { cn } from './lib/utils';
import { MOCK_SALES_LOG } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'import' | 'analysis' | 'comparison'>('import');
  const [isDataImported, setIsDataImported] = useState(false);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [comparisonData, setComparisonData] = useState<SaleRecord[]>([]);
  const t = LANGUAGES[lang];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'log', label: t.log, icon: ShoppingBag },
    { id: 'analysis', label: t.analysis, icon: Compass },
    { id: 'comparison', label: t.comparison, icon: History },
    { id: 'import', label: t.import, icon: Database },
  ];

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Sidebar */}
      {isDataImported && (
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 80 }}
          className="bg-card text-foreground flex flex-col h-full relative z-50 border-r border-border shadow-card"
        >
          <div className="p-6 flex items-center gap-4 overflow-hidden">
            <div className="flex-shrink-0 relative group">
              {/* Branded Logo Design */}
              <div className="w-14 h-14 bg-brand-red rounded-xl border-2 border-[#D4AF37] flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
                {/* Gold gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent pointer-events-none" />
                
                <div className="text-[8px] font-black text-white leading-none tracking-tighter mb-0.5">KAM MAN</div>
                <div className="text-sm font-black text-[#D4AF37] leading-none drop-shadow-sm">金門</div>
                <div className="text-[6px] font-bold text-white/80 leading-none mt-0.5 uppercase scale-75">Market</div>
              </div>
            </div>
            
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <h1 className="headline-2 tracking-tight text-foreground whitespace-nowrap leading-tight">
                  KAM MAN 
                </h1>
              </motion.div>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-4 p-3 rounded-xl transition-all group",
                  activeTab === item.id 
                    ? "bg-primary-muted text-primary" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-6 h-6" />
                {isSidebarOpen && <span className="body-2 font-semibold">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <button
              onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <Languages className="w-6 h-6" />
              {isSidebarOpen && <span className="body-2 font-semibold">{lang === 'en' ? '中文' : 'English'}</span>}
            </button>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-4 top-1/2 -translate-y-1/2 bg-card text-foreground rounded-full p-1.5 shadow-card border border-border hidden lg:block hover:bg-muted transition-colors"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative h-full">
        {isDataImported && (
          <header className="px-8 py-6 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center">
            <div>
              <h1 className="headline-1 text-foreground">
                {t[activeTab as keyof typeof t]}
              </h1>
              <p className="body-2 font-bold text-muted-foreground uppercase mt-1">KAM MAN SUPERMARKET</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-secondary px-4 py-2 rounded-lg flex items-center gap-2 body-3 font-bold text-secondary-foreground">
                <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                NOW VIEWING: {activeFilename || 'UNSAVED DATA'}
              </div>
            </div>
          </header>
        )}

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'import' && (
                <div className={cn(!isDataImported && "min-h-[80vh] flex items-center justify-center")}>
                   <DataImport 
                    lang={lang} 
                    onImport={(newData, filename) => {
                      const cleanData = newData.filter(s => {
                         const isVoid = s.paymentMethod.toLowerCase().includes('void') || 
                                        s.items.some(i => i.name.toLowerCase().includes('void'));
                         return !isVoid;
                      });
                      setSalesData([...cleanData]);
                      setActiveFilename(filename);
                      setIsDataImported(true);
                      setActiveTab('dashboard'); 
                    }} 
                    title={!isDataImported ? 'Upload POS data to view sales dashboard' : undefined}
              
                  />
                </div>
              )}
              {activeTab === 'dashboard' && <Dashboard lang={lang} salesData={salesData} />}
              {activeTab === 'analysis' && <StaffingAnalysis lang={lang} salesData={salesData} />}
              {activeTab === 'log' && <ProductAnalysis lang={lang} salesData={salesData} />}
              {activeTab === 'comparison' && (
                <YoYComparison 
                  lang={lang} 
                  currentData={salesData} 
                  baselineData={comparisonData} 
                  onBaselineImport={(data) => {
                    const clean = data.filter(s => {
                      const isVoid = s.paymentMethod.toLowerCase().includes('void') || 
                                     s.items.some(i => i.name.toLowerCase().includes('void'));
                      return !isVoid;
                    });
                    setComparisonData(clean);
                  }}
                  onResetBaseline={() => setComparisonData([])}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
