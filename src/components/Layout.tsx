import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users as UsersIcon, 
  History, 
  LogOut,
  ChevronRight,
  ChevronDown,
  Shield,
  Activity,
  Settings,
  ShoppingBag,
  Menu,
  X,
  Sun,
  Moon,
  Database,
  Truck,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AIChat from './AIChat';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);
  const [showSystemInfo, setShowSystemInfo] = useState(true);

  // Derive active tab from pathname
  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);

  const menuItems = [
    { id: 'dashboard', label: 'Tablero Principal', icon: LayoutDashboard, roles: ['Admin', 'Vendedor'] },
    { id: 'pos', label: 'Venta Directa', icon: ShoppingCart, roles: ['Admin', 'Vendedor'] },
    { id: 'purchases', label: 'Compras', icon: Truck, roles: ['Admin', 'Vendedor'] },
    { 
      id: 'inventario-group', 
      label: 'Inventario', 
      icon: Database, 
      roles: ['Admin', 'Vendedor'],
      isGroup: true,
      subItems: [
        { id: 'products', label: 'Gestión Catálogo', icon: Package },
        { id: 'inventory', label: 'Stock e Insumos', icon: History },
      ]
    },
    { id: 'sales', label: 'Historial Ventas', icon: ShoppingBag, roles: ['Admin', 'Vendedor'] },
    { id: 'finance', label: 'Finanzas y Reportes', icon: TrendingUp, roles: ['Admin', 'Vendedor'] },
    { id: 'customers', label: 'Base Clientes', icon: UsersIcon, roles: ['Admin', 'Vendedor'] },
    { id: 'users', label: 'Equipo / Staff', icon: Shield, roles: ['Admin'] },
    { id: 'audit', label: 'Seguridad / Aud.', icon: Activity, roles: ['Admin'] },
    { id: 'settings', label: 'Panel Control', icon: Settings, roles: ['Admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const handleNavigate = (id: string) => {
    navigate(`/${id}`);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-[#020617] overflow-hidden selection:bg-brand/10 custom-scrollbar">
      <div className="noise-overlay" />
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col z-[70] transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0
      `}>
        <div className="h-20 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded flex items-center justify-center shadow-lg shadow-brand/20">
            <ShoppingCart className="text-white w-5 h-5" />
          </div>
          <div className="cursor-pointer" onClick={() => handleNavigate('dashboard')}>
            <h1 className="font-display font-black text-slate-900 dark:text-white tracking-tight text-lg uppercase italic">Softplus</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.25em] -mt-1 leading-none">Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenu.map((item) => {
            if (item.isGroup) {
              const isSubItemActive = item.subItems?.some(si => si.id === activeTab);
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all group ${
                      isSubItemActive 
                      ? 'bg-brand/10 text-brand' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-bold text-[11px] uppercase tracking-wider">{item.label}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isInventoryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isInventoryOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-1 pl-4"
                      >
                        {item.subItems?.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => handleNavigate(sub.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all group relative ${
                              activeTab === sub.id 
                                ? 'bg-brand/10 text-brand' 
                                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <sub.icon className={`w-4 h-4 ${activeTab === sub.id ? 'text-brand' : ''}`} />
                              <span className="font-semibold text-xs tracking-tight">{sub.label}</span>
                            </div>
                            {activeTab === sub.id && (
                              <div className="w-1 h-3 bg-brand rounded-full" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all group relative ${
                  activeTab === item.id 
                    ? 'bg-brand/10 text-brand' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110 ${
                    activeTab === item.id ? 'text-brand' : 'text-slate-400 dark:text-slate-500'
                  }`} />
                  <span className="font-bold text-[11px] uppercase tracking-wider">{item.label}</span>
                </div>
                {activeTab === item.id && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="bg-slate-100 dark:bg-slate-800/40 p-3 rounded flex items-center gap-3 border border-slate-200 dark:border-slate-700/50 shadow-inner">
            <div className="w-9 h-9 bg-brand/10 rounded flex items-center justify-center text-brand font-black text-xs">
              {user?.full_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-tight truncate">{user?.full_name}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-transparent hover:border-red-200 dark:hover:border-red-900/50 justify-center"
          >
            <LogOut className="w-4 h-4" />
            <span>Desconectar</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] dark:bg-[#020617] relative">
        <header className="h-20 px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-between sticky top-0 z-[40]">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded lg:hidden transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="space-y-0.5">
              {/* Se eliminó la etiqueta de contexto redundante */}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <AnimatePresence>
              {showSystemInfo && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="hidden md:block text-right"
                >
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] -mt-1">Santa Cruz, Bolivia</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            {(showSystemInfo) && <div className="h-10 w-[1px] bg-slate-200 dark:border-slate-800 hidden md:block" />}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSystemInfo(!showSystemInfo)}
                className={`p-2.5 rounded-lg transition-all border shadow-sm flex items-center justify-center active:scale-95 group ${
                  showSystemInfo 
                  ? 'bg-brand/10 border-brand/20 text-brand' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
                title={showSystemInfo ? "Ocultar Info de Sistema" : "Mostrar Info de Sistema"}
              >
                <Calendar className="w-4 h-4" />
              </button>

              <button
                onClick={toggleTheme}
                className={`relative px-4 py-2.5 rounded-lg transition-all border shadow-sm flex items-center gap-2.5 active:scale-95 group ${
                  theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700 text-brand hover:bg-slate-750' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Nocturno</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 transition-transform group-hover:rotate-45" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Diurno</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="max-w-[1600px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>

        <AIChat />
      </div>
    </div>
  );
}
