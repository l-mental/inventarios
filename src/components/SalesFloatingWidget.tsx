import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import { SalesPeriod } from '../types';
import { 
  TrendingUp, 
  ShoppingBag, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Calendar, 
  Clock, 
  DollarSign, 
  Receipt,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PeriodData {
  count: number;
  revenue: number;
  avgTicket: number;
}

const PERIOD_LABELS: Record<SalesPeriod, { label: string; short: string; days: number }> = {
  day: { label: 'Hoy (Día)', short: 'Día', days: 1 },
  week: { label: 'Esta Semana', short: 'Semana', days: 7 },
  month: { label: 'Este Mes', short: 'Mes', days: 30 },
  bimonth: { label: 'Bimestre (2 meses)', short: 'Bimestre', days: 60 },
  quarter: { label: 'Trimestre (3 meses)', short: 'Trimestre', days: 90 },
  year: { label: 'Este Año (12 meses)', short: 'Año', days: 365 },
};

export default function SalesFloatingWidget() {
  const { apiFetch } = useApi();
  const { formatPrice } = useSettings();

  const [period, setPeriod] = useState<SalesPeriod>(() => {
    return (localStorage.getItem('softplus_sales_widget_period') as SalesPeriod) || 'day';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [metrics, setMetrics] = useState<Record<SalesPeriod, PeriodData>>({
    day: { count: 0, revenue: 0, avgTicket: 0 },
    week: { count: 0, revenue: 0, avgTicket: 0 },
    month: { count: 0, revenue: 0, avgTicket: 0 },
    bimonth: { count: 0, revenue: 0, avgTicket: 0 },
    quarter: { count: 0, revenue: 0, avgTicket: 0 },
    year: { count: 0, revenue: 0, avgTicket: 0 },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await apiFetch('/api/stats');
      if (data?.periodMetrics) {
        setMetrics(data.periodMetrics);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const handlePeriodChange = (newPeriod: SalesPeriod) => {
    setPeriod(newPeriod);
    localStorage.setItem('softplus_sales_widget_period', newPeriod);
  };

  const currentData = metrics[period] || { count: 0, revenue: 0, avgTicket: 0 };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Floating expanded card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto mb-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/20 text-brand flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Monitor de Ventas</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Período configurado: {PERIOD_LABELS[period].label}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Period Selector Tabs */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Seleccionar Intervalo</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(PERIOD_LABELS) as SalesPeriod[]).map((key) => {
                  const active = period === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePeriodChange(key)}
                      className={`px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all border ${
                        active
                          ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {PERIOD_LABELS[key].short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-brand mb-1">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Cantidad Ventas</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                    {currentData.count} <span className="text-xs font-normal text-slate-400">ops</span>
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Transacciones efectivas</p>
                </div>

                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Monto Total</span>
                  </div>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                    {formatPrice(currentData.revenue)}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Ingresos del período</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Ticket Promedio</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatPrice(currentData.avgTicket)} / venta
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchStats}
                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Docked Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl hover:shadow-2xl border border-slate-700 dark:border-slate-200 transition-all group"
        title="Ver monitor de ventas configurable"
      >
        <div className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center font-black">
          <TrendingUp className="w-3.5 h-3.5" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-600">
              Ventas ({PERIOD_LABELS[period].short})
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-black tabular-nums tracking-tight">
              {currentData.count} ventas
            </span>
            <span className="text-xs font-bold text-emerald-400 dark:text-emerald-600 tabular-nums">
              ({formatPrice(currentData.revenue)})
            </span>
          </div>
        </div>
        <ChevronUp className={`w-4 h-4 ml-1 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>
    </div>
  );
}
