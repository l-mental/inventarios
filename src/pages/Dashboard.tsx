import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { DashboardStats } from '../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShoppingBag,
  ArrowUpRight,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { useApi } from '../hooks/useApi';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

    apiFetch('/api/stats')
      .then(setStats)
      .catch(err => {
        if (err.message !== 'Sesión expirada') {
          console.error(err);
          setError(err.message);
        }
      });
  }, [token]);

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

  const cards = [
    { label: 'Ingresos Totales', value: formatPrice(stats.revenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Volumen Ventas', value: stats.salesCount, icon: ShoppingBag, color: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Crecimiento Clientes', value: stats.customersCount, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
    { label: 'Alertas Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Operaciones</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Supervisión estratégica del sistema para <span className="text-brand font-bold">{user?.full_name}</span>
          </p>
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
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter leading-none">Equipo & Staff</h3>
                <p className="text-white/80 text-xs font-medium max-w-xs leading-relaxed">Infraestructura de control para la administración de accesos y roles jerárquicos.</p>
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
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase rounded tracking-widest leading-none">Crítico</span>
                  <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter leading-none text-slate-900 dark:text-white">Inventario Bajo</h3>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-xs leading-relaxed">
                  Se han detectado <span className="text-rose-500 font-bold">{stats.lowStock} productos</span> bajo el umbral de seguridad operativa.
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
                <div className="w-2 h-2 bg-brand rounded-full"></div>
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
                <Bar dataKey="total" radius={[2, 2, 0, 0]}>
                  {stats.salesByDay.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === stats.salesByDay.length - 1 ? '#00d1ff' : (theme === 'dark' ? '#1e293b' : '#f1f5f9')} />
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
                    {sale.seller.split(' ').map(n=>n[0]).join('')}
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
