import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { handleLocalAuthLogin, isStaticHostEnvironment } from '../lib/localApi';
import { LogIn, User, Lock, Loader2, Sparkles, PieChart, ShoppingBag, Zap, ArrowRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let authData: { token: string; user: any } | null = null;

      if (isStaticHostEnvironment() || !navigator.onLine) {
        authData = handleLocalAuthLogin(username, password);
      } else {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          const contentType = res.headers.get('content-type') || '';
          if (
            res.status === 404 ||
            res.status === 405 ||
            res.status >= 500 ||
            !contentType.includes('application/json')
          ) {
            authData = handleLocalAuthLogin(username, password);
          } else {
            const data = await res.json();
            if (!res.ok) {
              if (res.status === 401 && data?.error === 'Credenciales inválidas') {
                throw new Error('Credenciales inválidas');
              }
              authData = handleLocalAuthLogin(username, password);
            } else {
              authData = data;
            }
          }
        } catch (fetchErr: any) {
          if (fetchErr.message === 'Credenciales inválidas') {
            throw fetchErr;
          }
          authData = handleLocalAuthLogin(username, password);
        }
      }

      if (authData) {
        login(authData.token, authData.user);
      }
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6ff] flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 font-sans overflow-hidden">
      <div className="w-full max-w-[1100px] flex flex-col md:flex-row relative">
        {/* Panel Izquierdo: Decorativo Tecnológico con Animación de Entrada */}
        <motion.div 
          initial={{ x: '-50%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#00d1ff] via-[#00b8e6] to-[#0099cc] relative overflow-hidden items-center justify-center p-12 text-white rounded-l-[40px] shadow-2xl z-10"
        >
          {/* Fondo de Rejilla Animada */}
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          {/* Partículas de Datos Flotantes */}
          <div className="absolute inset-0 z-0">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * 100 + "%", 
                  y: Math.random() * 100 + "%",
                  opacity: 0.1 + Math.random() * 0.3,
                }}
                animate={{ 
                  y: [null, "-10%", "110%"],
                  opacity: [null, 0.5, 0]
                }}
                transition={{ 
                  duration: 8 + Math.random() * 10,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * 5
                }}
                className="absolute w-1 h-1 bg-white rounded-full"
              />
            ))}
          </div>

          <div className="relative z-30 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <p className="text-xl font-bold mb-2 text-white tracking-wide italic">¡Qué gusto verte de nuevo!</p>
              <h2 className="text-6xl font-black tracking-tighter uppercase mb-6 italic leading-none text-white">
                Soft<span className="text-white">plus</span>
              </h2>
              <div className="w-24 h-2 bg-white/20 mx-auto mb-10 rounded-full relative overflow-hidden border border-white/30">
                <motion.div 
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 bg-white shadow-[0_0_10px_rgba(255,255,255,1)]"
                />
              </div>
            </motion.div>
            
            <p className="text-base text-white font-medium max-w-[340px] mx-auto leading-relaxed drop-shadow-sm">
              Estamos listos para ayudarte a gestionar tus ventas hoy. Accede a tu ecosistema de inteligencia comercial.
            </p>
          </div>

          {/* Logo Flotante Inferior */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute bottom-12 left-12 flex items-center gap-3 bg-white/10 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/20"
          >
            <Zap className="w-4 h-4 fill-white animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] italic">Sistema Inteligente</span>
          </motion.div>
        </motion.div>

        {/* Panel Derecho: Formulario de Login con Animación de Entrada opuesta */}
        <motion.div 
          initial={{ x: '50%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full md:w-1/2 p-8 sm:p-16 flex flex-col justify-center bg-white rounded-[40px] md:rounded-l-none md:rounded-r-[40px] shadow-2xl relative z-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-slate-800 text-3xl font-bold mb-2 italic">Ingresar a la plataforma</h3>
            <p className="text-slate-400 text-sm mb-10 max-w-[320px]">Bienvenido de vuelta. Por favor, introduce tus datos para comenzar.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#00d1ff] ml-1">Usuario Maestro</label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00d1ff] rounded-l-md" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ID de Usuario"
                    className="w-full bg-[#f8fbff] border-none py-4 px-6 focus:ring-0 text-[#2b3674] placeholder:text-slate-300 font-bold transition-all rounded-r-md outline-none italic"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#00d1ff] ml-1">Clave de Acceso</label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00d1ff] rounded-l-md" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full bg-[#f8fbff] border-none py-4 px-6 focus:ring-0 text-[#2b3674] placeholder:text-slate-300 font-bold transition-all rounded-r-md outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-[#00d1ff] transition-colors">
                  <input type="checkbox" className="rounded-sm border-slate-300 text-[#00d1ff] focus:ring-0" />
                  Mantener sesión
                </label>
                <button type="button" className="text-[#00d1ff] hover:underline underline-offset-4">
                  ¿Olvidó su contraseña?
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-rose-500 text-[11px] font-black uppercase tracking-wider text-center bg-rose-50 p-2 rounded-lg"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#00d1ff] text-white rounded-full font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-cyan-500/30 hover:bg-[#00b8e6] hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 group"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    INICIAR SESIÓN AHORA
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 text-center border-t border-slate-50 pt-8">
              <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">
                Powering <span className="text-[#00d1ff]">Softplus Ecosystem</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}