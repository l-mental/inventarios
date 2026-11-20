import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import { Sale } from '../types';
import { 
  History, 
  User, 
  ChevronRight, 
  X, 
  MessageCircle, 
  Printer, 
  Ban, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowLeftRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CANCEL_REASONS = [
  'Error en la digitación o productos seleccionados',
  'Cliente canceló la compra o solicitó devolución',
  'Cambio de forma de pago o corrección de datos',
  'Factura / Comprobante duplicado',
  'Problema con stock o producto en mal estado',
  'Otro motivo'
];

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { token, user } = useAuth();
  const { apiFetch } = useApi();
  const { formatPrice, settings } = useSettings();

  const isAdmin = user?.role === 'Admin';

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

  const openCancelModal = (sale: Sale) => {
    setCancelModalSale(sale);
    setSelectedReason(CANCEL_REASONS[0]);
    setCustomReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalSale) return;
    const finalReason = selectedReason === 'Otro motivo' 
      ? (customReason.trim() || 'Otro motivo no especificado')
      : (customReason.trim() ? `${selectedReason} - ${customReason}` : selectedReason);

    setCancelling(true);
    try {
      await apiFetch(`/api/sales/${cancelModalSale.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: finalReason })
      });

      setBanner({
        type: 'success',
        message: `Factura #SALE-${String(cancelModalSale.id).padStart(5, '0')} anulada con éxito. Las unidades han sido devueltas al inventario.`
      });
      setCancelModalSale(null);
      if (selectedSale?.id === cancelModalSale.id) {
        setSelectedSale(null);
      }
      fetchSales();
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err.message || 'Error al anular la factura'
      });
    } finally {
      setCancelling(false);
    }
  };

  const getWhatsAppReceiptLink = (sale: Sale) => {
    const cleanPhone = whatsappPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 8 ? `591${cleanPhone}` : cleanPhone;
    const company = settings.company_name || 'AcerTecho Calaminas S.R.L.';
    const isCancelled = sale.status === 'CANCELLED';

    const itemsText = (sale.details || [])
      .map(d => `• ${d.product_name}\n  ${d.measurement_summary ? d.measurement_summary : `${d.quantity} m`} — ${formatPrice(d.subtotal)}`)
      .join('\n');
    const message = [
      `*${company.toUpperCase()} - COMPROBANTE DE VENTA ${isCancelled ? '(ANULADA)' : ''}*`,
      `Nro: #SALE-${String(sale.id).padStart(5, '0')}`,
      `Cliente: ${sale.customer_name || 'Consumidor Final'}`,
      `Fecha: ${new Date(sale.created_at).toLocaleString()}`,
      isCancelled ? `*ESTADO: FACTURA ANULADA*` : '',
      isCancelled && sale.cancel_reason ? `Motivo Anulación: ${sale.cancel_reason}` : '',
      `--------------------------------`,
      itemsText,
      `--------------------------------`,
      `*TOTAL: ${formatPrice(sale.total)}*`,
      `Método: ${sale.payment_method}`,
      isCancelled ? `(Comprobante sin valor comercial)` : `¡Gracias por su compra!`
    ].filter(Boolean).join('\n');

    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
  };

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      `#SALE-${String(s.id).padStart(5, '0')}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.seller_name && s.seller_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'completed' && s.status === 'COMPLETED') ||
      (statusFilter === 'cancelled' && s.status === 'CANCELLED');

    return matchesSearch && matchesStatus;
  });

  const totalCompleted = sales.filter(s => s.status === 'COMPLETED').reduce((sum, s) => sum + s.total, 0);
  const totalCancelled = sales.filter(s => s.status === 'CANCELLED').reduce((sum, s) => sum + s.total, 0);
  const countCancelled = sales.filter(s => s.status === 'CANCELLED').length;

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
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                Historial de Ventas & Facturas
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Auditoría, Anulación de Comprobantes, Reversión de Stock y Envíos
              </p>
            </div>
          </div>
        </div>

        {/* Quick summary cards */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Recaudación Neta</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatPrice(totalCompleted)}
            </span>
          </div>
          <div className="px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 block">Facturas Anuladas</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
              {countCancelled} ({formatPrice(totalCancelled)})
            </span>
          </div>
        </div>
      </div>

      {banner && (
        <div className={`p-4 border text-xs font-bold uppercase flex items-center justify-between rounded-xl shadow-sm ${
          banner.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{banner.message}</span>
          </div>
          <button onClick={() => setBanner(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por N° Factura, Cliente o Vendedor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              statusFilter === 'all'
                ? 'bg-brand text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todas ({sales.length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Completadas ({sales.filter(s => s.status === 'COMPLETED').length})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              statusFilter === 'cancelled'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Anuladas ({countCancelled})
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ID Factura</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Modalidad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400 dark:text-slate-500">Cargando historial de ventas...</td></tr>
              ) : filteredSales.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-slate-400 dark:text-slate-500">No se encontraron ventas con los filtros aplicados</td></tr>
              ) : (
                filteredSales.map((sale) => {
                  const isCancelled = sale.status === 'CANCELLED';
                  const canCancel = !isCancelled && (isAdmin || sale.user_id === user?.id);

                  return (
                    <tr 
                      key={sale.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group ${
                        isCancelled ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          #SALE-{sale.id.toString().padStart(5, '0')}
                        </span>
                      </td>
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
                        {isCancelled ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded w-fit">
                              <Ban className="w-3 h-3" /> Anulada
                            </span>
                            {sale.cancel_reason && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[140px] mt-0.5" title={sale.cancel_reason}>
                                {sale.cancel_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Completada
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold tabular-nums ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {formatPrice(sale.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canCancel && (
                            <button
                              onClick={() => openCancelModal(sale)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-colors border border-rose-200 dark:border-rose-900/40"
                              title="Anular esta factura y devolver stock"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Anular
                            </button>
                          )}
                          <button 
                            onClick={() => fetchSaleDetails(sale.id, sale.customer_phone)}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-brand dark:hover:text-brand hover:bg-brand/10 dark:hover:bg-brand/20 rounded-lg transition-all"
                            title="Ver Comprobante Detallado"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal to Void / Cancel Sale */}
      {cancelModalSale && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-rose-200 dark:border-rose-950/50 overflow-hidden"
          >
            <div className="p-6 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">¿Anular Factura / Venta?</h3>
                  <p className="text-white/80 text-xs font-mono">#SALE-{cancelModalSale.id.toString().padStart(5, '0')}</p>
                </div>
              </div>
              <button 
                onClick={() => setCancelModalSale(null)}
                className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Efectos automáticos de la anulación:
                </div>
                <ul className="text-xs text-rose-700 dark:text-rose-400 space-y-1 list-disc list-inside">
                  <li>Todas las unidades de los productos vendidos serán <strong>devueltas al inventario</strong>.</li>
                  <li>El importe de <strong>{formatPrice(cancelModalSale.total)}</strong> será excluido de la recaudación activa.</li>
                  <li>Si fue venta a crédito, se anulará la deuda registrada al cliente.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Motivo de la Anulación
                </label>
                <select
                  value={selectedReason}
                  onChange={e => setSelectedReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {CANCEL_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Detalles u Observaciones Adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="Explique brevemente el motivo para efectos de auditoría..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCancelModalSale(null)}
                  disabled={cancelling}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelling}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-display font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  {cancelling ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      Sí, Anular Factura
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sale Detail & Receipt Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-all flex flex-col relative">
            
            {/* Header */}
            <div className={`p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-white shrink-0 ${
              selectedSale.status === 'CANCELLED' ? 'bg-rose-600' : 'bg-slate-900'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold">Comprobante de Venta</h3>
                  {selectedSale.status === 'CANCELLED' && (
                    <span className="px-2.5 py-0.5 bg-white text-rose-600 rounded text-[10px] font-black uppercase tracking-wider">
                      ANULADA
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-xs font-mono mt-1">#SALE-{selectedSale.id.toString().padStart(5, '0')}</p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Cancellation Warning Banner if cancelled */}
              {selectedSale.status === 'CANCELLED' && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3">
                  <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-rose-700 dark:text-rose-400">
                      Esta factura fue anulada
                    </p>
                    <p className="text-xs text-rose-600 dark:text-rose-300">
                      <strong>Motivo:</strong> {selectedSale.cancel_reason || 'Anulación solicitada por el usuario'}
                    </p>
                    {selectedSale.cancelled_at && (
                      <p className="text-[10px] text-slate-400">
                        Fecha de anulación: {new Date(selectedSale.cancelled_at).toLocaleString()}
                        {selectedSale.cancelled_by ? ` • Por: ${selectedSale.cancelled_by}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

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

              {/* Items Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Material / Medición</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase">Metraje</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase">Precio / m</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {selectedSale.details?.map((detail, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{detail.product_name}</p>
                          {detail.measurement_summary && (
                            <p className="text-[11px] font-mono text-brand mt-0.5">{detail.measurement_summary}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center font-mono text-slate-600 dark:text-slate-300 tabular-nums">{detail.quantity} m</td>
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

              {/* Total & Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                {selectedSale.status !== 'CANCELLED' && (isAdmin || selectedSale.user_id === user?.id) && (
                  <button 
                    onClick={() => openCancelModal(selectedSale)}
                    className="px-4 py-2.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-black rounded-xl hover:bg-rose-100 transition-all border border-rose-200 dark:border-rose-900/30 text-xs uppercase flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Anular Factura y Devolver Stock
                  </button>
                )}
                <div className="text-right space-y-1 ml-auto">
                  <p className="text-xs text-slate-500 uppercase font-bold">Total Facturado</p>
                  <p className={`text-3xl font-black tabular-nums ${
                    selectedSale.status === 'CANCELLED' ? 'line-through text-slate-400' : 'text-brand'
                  }`}>
                    {formatPrice(selectedSale.total)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
