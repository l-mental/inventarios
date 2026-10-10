import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import { Sale } from '../types';
import { History, User, ChevronRight, X, MessageCircle, Printer } from 'lucide-react';

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const { token, user } = useAuth();
  const { apiFetch } = useApi();
  const { formatPrice, settings } = useSettings();

  useEffect(() => {
    fetchSales();
  }, [token]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/sales');
      setSales(data);
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') {
        console.error('Error fetching sales:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleDetails = async (id: number, phone?: string) => {
    try {
      const data = await apiFetch(`/api/sales/${id}`);
      setSelectedSale(data);
      setWhatsappPhone(phone || data.customer_phone || '');
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') console.error(err);
    }
  };

  const handleCancelSale = async (id: number) => {
    try {
      await apiFetch(`/api/sales/${id}/cancel`, { method: 'POST' });
      setBanner('Venta anulada correctamente y stock restituido.');
      fetchSales();
      setSelectedSale(null);
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setBanner(err.message);
    }
  };

  const getWhatsAppReceiptLink = (sale: Sale) => {
    const cleanPhone = whatsappPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 8 ? `591${cleanPhone}` : cleanPhone;
    const company = settings.company_name || 'Softplus';
    const itemsText = (sale.details || [])
      .map(d => `• ${d.quantity}x ${d.product_name} — ${formatPrice(d.subtotal)}`)
      .join('\n');
    const message = [
      `*${company.toUpperCase()} - COMPROBANTE DE VENTA*`,
      `Nro: #SALE-${String(sale.id).padStart(5, '0')}`,
      `Cliente: ${sale.customer_name || 'Consumidor Final'}`,
      `Fecha: ${new Date(sale.created_at).toLocaleString()}`,
      `--------------------------------`,
      itemsText,
      `--------------------------------`,
      `*TOTAL: ${formatPrice(sale.total)}*`,
      `Método: ${sale.payment_method}`,
      `¡Gracias por su compra!`
    ].join('\n');

    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Dashboard <ChevronRight className="w-3 h-3 text-brand" /> Registro <ChevronRight className="w-3 h-3 text-brand" /> Ventas
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand text-white rounded shadow-lg shadow-brand/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Historial Ventas</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Auditoría Transaccional, Pagos Mixtos/Crédito y Envío WhatsApp</p>
            </div>
          </div>
        </div>
      </div>

      {banner && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase flex items-center justify-between rounded">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ID Venta</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Modalidad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando historial...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400 dark:text-slate-500">No hay ventas registradas</td></tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group ${sale.status === 'CANCELLED' ? 'opacity-50 grayscale' : ''}`}>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">#SALE-{sale.id.toString().padStart(5, '0')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{sale.seller_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{sale.customer_name || 'Consumidor Final'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm tabular-nums">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                        {sale.payment_method === 'MIXED' ? 'Mixto (Efec+QR)' : sale.payment_method === 'CREDIT' ? 'Crédito / Fiado' : sale.payment_method || 'CASH'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold uppercase ${sale.status === 'CANCELLED' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {sale.status === 'CANCELLED' ? 'Anulada' : 'Completada'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatPrice(sale.total)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => fetchSaleDetails(sale.id, sale.customer_phone)}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-brand dark:hover:text-brand hover:bg-brand/10 dark:hover:bg-brand/20 rounded-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-all flex flex-col">
            <div className={`p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-white shrink-0 ${selectedSale.status === 'CANCELLED' ? 'bg-red-600' : 'bg-slate-900'}`}>
              <div>
                <h3 className="text-lg sm:text-xl font-bold">Comprobante de Venta {selectedSale.status === 'CANCELLED' && '(ANULADA)'}</h3>
                <p className="text-white/80 text-xs font-mono mt-1">#SALE-{selectedSale.id.toString().padStart(5, '0')}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</p>
                  <p className="text-slate-900 dark:text-white font-semibold text-sm">{selectedSale.seller_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</p>
                  <p className="text-slate-900 dark:text-white font-semibold text-sm">{selectedSale.customer_name || 'Consumidor Final'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Método de Pago</p>
                  <p className="text-slate-900 dark:text-white font-semibold text-sm">{selectedSale.payment_method}</p>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Producto</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Cant.</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase">Precio</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {selectedSale.details?.map((detail, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{detail.product_name}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-500 tabular-nums">{detail.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-500 tabular-nums">{formatPrice(detail.unit_price)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-slate-900 dark:text-white tabular-nums">{formatPrice(detail.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* WhatsApp Receipt Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Teléfono WhatsApp cliente (ej. 78945612)"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                  className="flex-1 w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={getWhatsAppReceiptLink(selectedSale)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar por WhatsApp
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                {selectedSale.status !== 'CANCELLED' && user?.role === 'Admin' && (
                  <button 
                    onClick={() => handleCancelSale(selectedSale.id)}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/20 text-xs uppercase"
                  >
                    Anular Venta
                  </button>
                )}
                <div className="text-right space-y-1 ml-auto">
                  <p className="text-xs text-slate-500 uppercase font-bold">Total de la Venta</p>
                  <p className="text-3xl font-black text-brand tabular-nums">{formatPrice(selectedSale.total)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
