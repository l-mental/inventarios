import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { handleLocalAuthLogin, isStaticHostEnvironment } from '../lib/localApi';
import { downloadLaravelZip } from '../lib/downloadLaravel';
import { Loader2, ArrowRight, Wrench, Layers, ShieldCheck, Cog, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingLaravel, setDownloadingLaravel] = useState(false);
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

  const showcaseItems = [
    { brand: 'Massey Ferguson', line: 'Motor Perkins 1104C / Eje Carraro', spec: 'Cojinetes · Anillas · Embrague', accent: 'text-red-400' },
    { brand: 'New Holland', line: 'Serie Motor NEF 4/6 Cilindros', spec: 'Bombas · Culata · Eléctrico', accent: 'text-sky-400' },
    { brand: 'Fiat Agrícola', line: 'Línea GB Ricambi & Transmisión', spec: 'Engranajes · Frenos · Hidráulica', accent: 'text-amber-400' },
    { brand: 'Valmet Valtra', line: 'Filtros · D229 · Implementos Tuzzi', spec: 'Tercer Punto · Discos · Retenes', accent: 'text-emerald-400' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-[#090d16] corrugated-strip flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 font-sans overflow-hidden">
      <div className="w-full max-w-[1120px] flex flex-col md:flex-row relative shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Panel Izquierdo: Exhibición AgroPartes Tractores S.R.L. */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-[#7c2d12] relative overflow-hidden flex-col justify-between p-10 text-white z-10"
        >
          <div className="corrugated-accent-bar absolute top-0 left-0 right-0" />
          <div className="absolute inset-0 opacity-15 corrugated-strip pointer-events-none" />

          <div className="relative z-20 space-y-3 pt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">
              Maquinaria Pesada &amp; Tractores Agrícolas
            </p>
            <h2 className="text-5xl font-display font-black tracking-tighter uppercase italic leading-none text-white">
              Agro<span className="text-orange-500">Partes</span>
            </h2>
            <p className="text-slate-300 text-sm max-w-[380px] leading-relaxed">
              Sistema integral para venta de repuestos originales y OEM, búsqueda por equivalencias, control multi-sucursal y traspasos de almacén.
            </p>
          </div>

          {/* Tarjetas de Líneas de Maquinaria */}
          <div className="relative z-20 grid grid-cols-2 gap-3 my-6">
            {showcaseItems.map((item) => (
              <div
                key={item.brand}
                className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 space-y-1.5 hover:bg-white/15 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <Cog className={`w-4 h-4 ${item.accent}`} />
                  <span className="text-[9px] font-mono text-slate-300 uppercase">OEM</span>
                </div>
                <p className="text-xs font-black text-white uppercase tracking-tight">{item.brand}</p>
                <p className="text-[11px] font-semibold text-slate-200 leading-snug">{item.line}</p>
                <p className="text-[10px] text-slate-300/80 pt-1 border-t border-white/10">{item.spec}</p>
              </div>
            ))}
          </div>

          <div className="relative z-20 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 border-t border-white/10 pt-4">
            <span className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-orange-400" />
              91+ Ítems OEM
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              Multi-Sucursal
            </span>
          </div>
        </motion.div>

        {/* Panel Derecho: Formulario de Login */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full md:w-1/2 p-8 sm:p-14 flex flex-col justify-center bg-white dark:bg-slate-900 relative z-20"
        >
          <div className="md:hidden mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">Repuestos de Tractores</p>
            <h2 className="text-3xl font-display font-black uppercase italic text-slate-900 dark:text-white">
              Agro<span className="text-brand">Partes</span> Pro
            </h2>
          </div>

          <h3 className="text-slate-900 dark:text-white text-3xl font-display font-black mb-2 italic uppercase tracking-tight">
            Acceso al Sistema
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-[360px]">
            Ingresa tus credenciales para gestionar inventario por código OEM, mostrador y facturación.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                Usuario Operador / Admin
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. admin"
                className="tech-input py-3.5 px-4 text-slate-900 dark:text-white font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                Clave de Acceso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="tech-input py-3.5 px-4 text-slate-900 dark:text-white font-bold"
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer hover:text-brand transition-colors">
                <input type="checkbox" className="rounded-sm border-slate-300 text-brand focus:ring-0" />
                Mantener sesión
              </label>
              <span className="text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                Acceso Seguro
              </span>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-rose-600 text-[11px] font-black uppercase tracking-wider text-center bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand hover:bg-brand-muted text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-brand/25 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-3 group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  INGRESAR AL SISTEMA
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <button
              type="button"
              disabled={downloadingLaravel}
              onClick={async () => {
                setDownloadingLaravel(true);
                try {
                  await downloadLaravelZip();
                } catch (e: any) {
                  setError(e.message || 'No se pudo descargar el archivo ZIP.');
                } finally {
                  setDownloadingLaravel(false);
                }
              }}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              {downloadingLaravel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-orange-400" />}
              {downloadingLaravel ? 'Descargando Laravel...' : 'Descargar Proyecto Completo Laravel 11 (.zip)'}
            </button>

            <p className="text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.25em]">
              AgroPartes Tractores S.R.L. · <span className="text-brand">Repuestos Agrícolas &amp; OEM</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}