import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import SalesHistory from './pages/SalesHistory';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Finance from './pages/Finance';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import SyncManager from './components/SyncManager';

import { ShoppingCart, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-8 relative"
        >
          <ShoppingCart className="text-white w-10 h-10" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-3xl border-2 border-dashed border-white/20 scale-125"
          />
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase flex items-center gap-2">
            Softplus <span className="text-indigo-500 not-italic lowercase font-bold tracking-normal text-sm bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">intelligence</span>
          </h1>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Sincronizando Sistema</p>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-600">
        <Sparkles className="w-4 h-4" />
        <span className="text-[10px] uppercase font-black tracking-widest">Optimizado para Negocios Reales</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SplashScreen />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SplashScreen />;

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      
      {/* Rutas con Layout Principal */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pos" element={<ProtectedRoute allowedRoles={['Admin', 'Vendedor']}><POS /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={['Admin', 'Vendedor']}><Products /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['Admin', 'Vendedor']}><Inventory /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute allowedRoles={['Admin', 'Vendedor']}><Purchases /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute allowedRoles={['Admin', 'Vendedor']}><SalesHistory /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute allowedRoles={['Admin', 'Vendedor']}><Finance /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute allowedRoles={['Admin', 'Vendedor']}><Customers /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={['Admin']}><Users /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute allowedRoles={['Admin']}><Audit /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['Admin']}><Settings /></ProtectedRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <AppRouter />
            <SyncManager />
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
