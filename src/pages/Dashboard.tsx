import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { DashboardStats, Product } from '../types';
import { TRACTOR_BRANDS, getBrandAccent } from '../data/tractorPartsCatalog';
import {
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  ArrowUpRight,
  Clock,
  Users,
  BarChart3,
  Wrench,
  Layers,
  Cog,
  ShoppingCart,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { useApi } from '../hooks/useApi';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { token, user } = useAuth();
  const { formatPrice } = useSettings();
  const { theme } = useTheme();
  const { apiFetch } = useApi();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Sesión no iniciada. Por favor, inicia sesión.');
      return;
    }

    Promise.all([
      apiFetch('/api/stats'),
      apiFetch('/api/products').catch(() => [])
    ])
      .then(([statsData, prodData]) => {
        setStats(statsData);
        if (Array.isArray(prodData)) setProducts(prodData);
      })
      .catch(err => {
        if (err.message !== 'Sesión expirada') {
          console.error(err);
          setError(err.message);
        }
      });
  }, [token]);

  const [salesPeriod, setSalesPeriod] = useState<'day' | 'week' | 'month' | 'bimonth' | 'quarter' | 'year'>('day');

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-3xl border border-red-100 p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-bold text-red-900">Error al cargar el Dashboard</h3>
      <p className="text-red-600 mt-2">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all"
      >
        Reintentar
      </button>
    </div>
  );

  if (!stats) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>;

  const periodMetrics = (stats as any)?.periodMetrics?.[salesPeriod] || {
    count: stats.salesCount,
    revenue: stats.revenue,
    avgTicket: stats.salesCount > 0 ? stats.revenue / stats.salesCount : 0
  };

  const PERIOD_OPTIONS = [
    { key: 'day', label: 'Hoy (Día)' },
    { key: 'week', label: 'Esta Semana' },
    { key: 'month', label: 'Este Mes' },
    { key: 'bimonth', label: 'Bimestre' },
    { key: 'quarter', label: 'Trimestre' },
    { key: 'year', label: 'Este Año' },
  ] as const;

  const totalUnitsStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);

  const cards = [
    { label: 'Ingresos Totales (Histórico)', value: formatPrice(stats.revenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Unidades en Almacén', value: products.length > 0 ? totalUnitsStock.toLocaleString() : stats.salesCount, icon: Layers, color: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Clientes y Talleres', value: stats.customersCount, icon: Users, color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-500/10' },
    { label: 'Repuestos Bajo Mínimo', value: stats.lowStock, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  ];

  const brandCardsList = TRACTOR_BRANDS.slice(0, 6);

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand mb-1">Repuestos Agrícolas &amp; OEM para Tractores</p>
          <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Operaciones AgroPartes</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Control de códigos OEM, stock multi-sucursal y facturación para <span className="text-brand font-bold">{user?.full_name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/pos')}
            className="px-5 py-2.5 bg-brand hover:bg-brand-muted text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md shadow-brand/20 transition-all whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" />
            Vender / Cotizar
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap"
          >
            <Layers className="w-4 h-4" />
            Traspasar Unidades
          </button>
        </div>
      </div>

      {/* Enhanced Sales Performance Card with Period Configurator */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 overflow-hidden relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand text-white rounded-xl shadow-md shadow-brand/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-display font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                Rendimiento de Ventas Configurable
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Monitoreo en tiempo real según período seleccionado
              </p>
            </div>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSalesPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  salesPeriod === opt.key
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics Row for Selected Period */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Cantidad de Ventas ({PERIOD_OPTIONS.find(o => o.key === salesPeriod)?.label})
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                {periodMetrics.count}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase">operaciones</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Transacciones completadas sin anular</p>
          </div>

          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/20">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-1">
              Ingresos del Período ({PERIOD_OPTIONS.find(o => o.key === salesPeriod)?.label})
            </span>
            <span className="text-3xl font-display font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
              {formatPrice(periodMetrics.revenue)}
            </span>
            <p className="text-[10px] text-slate-500 mt-1">Recaudación neta facturada</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Ticket Promedio
            </span>
            <span className="text-3xl font-display font-black text-brand tabular-nums tracking-tight">
              {formatPrice(periodMetrics.avgTicket)}
            </span>
            <p className="text-[10px] text-slate-500 mt-1">Promedio por cada venta realizada</p>
          </div>
        </div>
      </div>

      {/* Inventory by Tractor Brand */}
      <div className="tech-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <p className="text-[9px] font-black text-brand uppercase tracking-[0.25em]">Stock Distribuido por Maquinaria</p>
            <h3 className="font-display font-black text-lg text-slate-900 dark:text-white uppercase italic tracking-tight">
              Inventario por Marca de Tractor
            </h3>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="text-[10px] font-black uppercase tracking-widest text-brand hover:underline underline-offset-4 flex items-center gap-1 whitespace-nowrap"
          >
            Administrar Catálogo Completo ({products.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {brandCardsList.map((brand) => {
            const matching = products.filter(
              (p) => (p.brand || '').toUpperCase() === brand
            );
            const totalUnits = matching.reduce((sum, p) => sum + Number(p.stock || 0), 0);
            const brandAccent = getBrandAccent(brand);

            return (
              <button
                key={brand}
                onClick={() => navigate('/pos')}
                className="group text-left bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 hover:border-brand transition-all hover-lift flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg border ${brandAccent.bg} ${brandAccent.text} ${brandAccent.border}`}>
                    <Cog className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 tabular-nums">
                    {matching.length} ítems
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                    {brand}
                  </p>
                  <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                    {totalUnits.toLocaleString()} uds disp.
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="tech-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <div key={i} className="tech-grid-item group relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} rounded-full -mr-12 -mt-12 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

            <div className="flex items-center justify-between relative z-10">
              <div className={`${card.bg} p-2.5 rounded transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <BarChart3 className="w-4 h-4 text-slate-200 dark:text-slate-800 group-hover:text-brand transition-colors" />
            </div>

            <div className="relative z-10 mt-auto">
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{card.label}</p>
              <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter tabular-nums leading-none">{card.value}</h3>
            </div>

            <div className="absolute bottom-0 left-0 h-0.5 bg-brand w-0 group-hover:w-full transition-all duration-700" />
          </div>
        ))}
      </div>

      {user?.role === 'Admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-brand/5">
          <div className="bg-brand dark:bg-brand/90 p-8 text-white flex flex-col justify-between gap-10">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter leading-none">Equipo &amp; Sucursales</h3>
                <p className="text-white/80 text-xs font-medium max-w-xs leading-relaxed">Control de vendedores de mostrador, encargados de almacén y permisos por sucursal.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/users')}
              className="px-6 py-3 bg-white text-brand font-black text-[10px] uppercase tracking-[0.2em] rounded border-b-4 border-slate-200 hover:border-white hover:translate-y-px transition-all w-fit shadow-xl"
            >
              Gestionar Acceso
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 flex flex-col justify-between gap-10">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                <Wrench className="w-6 h-6 text-rose-500" />
              </div>
              <div className="space-y-2">
                <p className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none">Control de Stock Mínimo</p>
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter leading-none text-slate-900 dark:text-white">Reposición de Repuestos</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-xs leading-relaxed">
                  Se han detectado <span className="text-rose-500 font-bold">{stats.lowStock} repuestos</span> bajo el umbral mínimo configurado en almacén.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] rounded border-b-4 border-slate-700 dark:border-slate-200 hover:translate-y-px transition-all w-fit"
            >
              Verificar Catálogo
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 tech-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-brand uppercase tracking-[0.3em]">Métrica de Rendimiento</p>
              <h3 className="font-display font-black text-lg text-slate-900 dark:text-white uppercase italic tracking-tight">Ingresos Semanales</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ventas Confirmadas</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
              <BarChart data={stats.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: theme === 'dark' ? '#0f172a' : '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid ' + (theme === 'dark' ? '#1e293b' : '#e2e8f0'),
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {stats.salesByDay.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === stats.salesByDay.length - 1 ? '#c2410c' : (theme === 'dark' ? '#1e293b' : '#e2e8f0')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="tech-card flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-display font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Actividad Reciente</h3>
            <ArrowUpRight className="w-4 h-4 text-brand" />
          </div>
          <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/50">
            {stats.recentSales.map((sale, i) => (
              <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase group-hover:border-brand transition-colors">
                    {sale.seller.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{sale.seller}</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                        {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black text-brand tabular-nums">{formatPrice(sale.total)}</span>
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => navigate('/sales')}
              className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] hover:text-brand hover:border-brand transition-all rounded shadow-sm"
            >
              Auditar Todo el Historial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
