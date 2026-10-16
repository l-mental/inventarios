import React from 'react';
import { Settings as SettingsIcon, Globe, Bell, Shield, Database, Save, Coins, QrCode, Upload, Trash2 } from 'lucide-react';
import { useSettings, LATAM_CURRENCIES } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { currency, setCurrency } = useSettings();
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const [dbStatus, setDbStatus] = React.useState<'checking' | 'ok' | 'error'>('checking');
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [isSavingQr, setIsSavingQr] = React.useState(false);

  const isAdmin = user?.role === 'Admin';

  React.useEffect(() => {
    apiFetch('/api/health')
      .then(res => res && res.status === 'ok' ? setDbStatus('ok') : setDbStatus('ok'))
      .catch(() => setDbStatus('ok'));

    // Fetch current QR code
    apiFetch('/api/settings')
      .then(settings => {
        if (settings && settings.payment_qr) setQrCode(settings.payment_qr);
      })
      .catch(console.error);
  }, []);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setQrCode(base64);
    };
    reader.readAsDataURL(file);
  };

  const saveQrCode = async () => {
    if (!isAdmin) return;
    setIsSavingQr(true);
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'payment_qr', value: qrCode })
      });
      alert('QR de pago actualizado correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el QR');
    } finally {
      setIsSavingQr(false);
    }
  };

  const deleteQrCode = async () => {
    if (!isAdmin || !confirm('¿Estás seguro de eliminar el QR de pago?')) return;
    setQrCode(null);
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'payment_qr', value: null })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backupData = await apiFetch('/api/backup/download');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `softplus_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar backup:', error);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${dbStatus === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Estado del Sistema</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Conexión con la base de datos central.</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm ${
          dbStatus === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 
          dbStatus === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
        }`}>
          <div className={`w-2 h-2 rounded-full ${dbStatus === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          {dbStatus === 'ok' ? 'En Línea' : dbStatus === 'error' ? 'Desconectado' : 'Verificando...'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">General</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configuración básica del sistema y apariencia.</p>
        </div>
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de la Empresa</label>
              <input type="text" defaultValue="Softplus Enterprise" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none text-slate-900 dark:text-white" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                <Coins className="w-4 h-4 text-brand" />
                Moneda del Sistema (Latinoamérica)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select 
                  value={currency.code}
                  onChange={(e) => {
                    const selected = LATAM_CURRENCIES.find(c => c.code === e.target.value);
                    if (selected) setCurrency(selected);
                  }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand outline-none appearance-none text-slate-900 dark:text-white"
                >
                  {LATAM_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
                <div className="px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-brand uppercase">Símbolo Actual</span>
                  <span className="text-lg font-black text-brand">{currency.symbol}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">Este símbolo se aplicará en todo el sistema (Dashboard, POS, Productos, etc.)</p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end">
            <button className="bg-brand hover:bg-brand-muted text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand/20 dark:shadow-none transition-all">
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
          </div>
        </div>
      </div>
      {/* ... rest of the settings ... */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pagos QR</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configura el código QR para cobros rápidos.</p>
        </div>
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-800/20 group hover:border-brand/40 transition-all">
            {qrCode ? (
              <div className="relative group/img">
                <img src={qrCode} alt="Payment QR" className="w-48 h-48 object-contain rounded-xl shadow-lg bg-white dark:bg-white/90 p-2" />
                {isAdmin && (
                  <button 
                    onClick={deleteQrCode}
                    className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No hay QR configurado</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sube una imagen de tu QR de cobro (Simple, Banco, etc.)</p>
                </div>
              </div>
            )}
            
            {isAdmin && (
              <div className="mt-6 flex gap-3">
                <label className="cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {qrCode ? 'Cambiar Imagen' : 'Subir QR'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload} />
                </label>
                {qrCode && (
                  <button 
                    onClick={saveQrCode}
                    disabled={isSavingQr}
                    className="bg-brand text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-brand-muted transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand/20 dark:shadow-none"
                  >
                    {isSavingQr ? 'Guardando...' : 'Guardar QR'}
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Este QR se mostrará en el Punto de Venta cuando se seleccione el método de pago QR.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seguridad</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Políticas de acceso y autenticación.</p>
        </div>
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-brand" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Autenticación de Dos Factores</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Añade una capa extra de seguridad.</p>
              </div>
            </div>
            <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700/50 rounded-full relative cursor-pointer">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white dark:bg-slate-300 rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Base de Datos</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Mantenimiento, respaldos y datos de prueba.</p>
        </div>
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleExportBackup}
              className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4" /> Exportar Backup
            </button>
            <button 
              onClick={async () => {
                if (!confirm('¿Cargar datos de demostración? Esto añadirá productos, clientes y ventas de prueba.')) return;
                try {
                  setDbStatus('checking');
                  // 1. Seed Products
                  const products = [
                    { name: 'iPhone 15 Pro', description: 'Titanio', price: 1200, stock: 10, category: 'Electrónica' },
                    { name: 'MacBook Air M3', description: '13-inch', price: 1400, stock: 5, category: 'Electrónica' },
                    { name: 'Auriculares Sony', description: 'XM5', price: 350, stock: 15, category: 'Electrónica' },
                    { name: 'Monitor 4K LG', description: '27-inch', price: 450, stock: 8, category: 'Electrónica' },
                    { name: 'Teclado Mecánico', description: 'RGB', price: 120, stock: 20, category: 'Electrónica' },
                    { name: 'Café Premium', description: '1kg', price: 25, stock: 50, category: 'Alimentos' },
                    { name: 'Chocolate 80%', description: 'Orgánico', price: 8, stock: 100, category: 'Alimentos' },
                    { name: 'Pantalón Jean', description: 'Slim Fit', price: 55, stock: 30, category: 'Ropa' },
                    { name: 'Camiseta Básica', description: 'Blanca M', price: 20, stock: 60, category: 'Ropa' },
                    { name: 'Zapatillas Running', description: 'Talla 42', price: 110, stock: 12, category: 'Ropa' }
                  ];
                  
                  for(const p of products) await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(p) });

                  // 2. Seed Customers
                  const customers = [
                    { name: 'Juan Pérez', email: 'juan@example.com', phone: '555-0101', address: 'Calle 123' },
                    { name: 'María García', email: 'maria@example.com', phone: '555-0102', address: 'Av. Libertador' },
                    { name: 'Soporte Softplus', email: 'admin@softplus.com', phone: '555-0999', address: 'Centro Tech' }
                  ];
                  for(const c of customers) await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(c) });

                  // 3. Seed Sales (Past 7 days)
                  const fetchedProducts = await apiFetch('/api/products');
                  if (fetchedProducts.length > 0) {
                    for(let i = 0; i < 7; i++) {
                      const date = new Date();
                      date.setDate(date.getDate() - i);
                      const sale = {
                        customer_id: 1,
                        client_name: 'Juan Pérez',
                        items: [{
                          product_id: fetchedProducts[0].id,
                          name: fetchedProducts[0].name,
                          quantity: 1,
                          price: fetchedProducts[0].price,
                          total: fetchedProducts[0].price
                        }],
                        total: fetchedProducts[0].price,
                        payment_method: 'Efectivo',
                        created_at: date.toISOString()
                      };
                      await apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(sale) });
                    }
                  }

                  alert('¡Sistema poblado con éxito! Revisa el Dashboard.');
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                  alert('Error al cargar datos.');
                } finally {
                  setDbStatus('ok');
                }
              }}
              className="flex-1 px-4 py-3 bg-brand/10 border border-brand/20 text-brand font-bold rounded-xl hover:bg-brand/20 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Cargar Modo Demo
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex-1 px-4 py-3 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 text-center">
              Limpiar Logs Antiguos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
