import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Customer, CreditSale } from '../types';
import { 
  Plus, 
  Edit2, 
  User, 
  Search, 
  X, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  MessageCircle, 
  DollarSign,
  CheckCircle2
} from 'lucide-react';

export default function Customers() {
  const { formatPrice } = useSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [credits, setCredits] = useState<CreditSale[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [payingCreditCustomer, setPayingCreditCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paySaleId, setPaySaleId] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { token } = useAuth();
  const { apiFetch } = useApi();

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [custData, credData] = await Promise.all([
        apiFetch('/api/customers'),
        apiFetch('/api/credits')
      ]);
      setCustomers(custData);
      setCredits(credData);
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') {
        console.error('Error fetching customers:', err);
      }
    }
  };

  const getLoyaltyTier = (points = 0) => {
    if (points >= 250) return { label: 'Nivel VIP Diamante', discount: '10% Canje', color: 'text-indigo-600 dark:text-indigo-400' };
    if (points >= 100) return { label: 'Nivel Oro', discount: '5% Canje', color: 'text-amber-600 dark:text-amber-400' };
    if (points >= 40) return { label: 'Nivel Plata', discount: 'Puntos Activos', color: 'text-slate-600 dark:text-slate-300' };
    return { label: 'Nivel Bronce', discount: 'Acumulando', color: 'text-amber-800 dark:text-amber-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingCustomer?.id ? 'PUT' : 'POST';
      const url = editingCustomer?.id ? `/api/customers/${editingCustomer.id}` : '/api/customers';

      await apiFetch(url, {
        method,
        body: JSON.stringify(editingCustomer)
      });

      setIsModalOpen(false);
      setEditingCustomer(null);
      setStatusMsg({ type: 'success', text: 'Datos del cliente guardados correctamente.' });
      fetchData();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const openPayCreditModal = (c: Customer) => {
    const customerPendingSales = credits.filter(cr => cr.customer_id === c.id && cr.balance_due > 0);
    setPayingCreditCustomer(c);
    if (customerPendingSales.length > 0) {
      setPaySaleId(customerPendingSales[0].id);
      setPayAmount(String(customerPendingSales[0].balance_due));
    } else {
      setPaySaleId(null);
      setPayAmount('');
    }
  };

  const handlePayCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySaleId || !payAmount) return;
    try {
      await apiFetch('/api/credits/pay', {
        method: 'POST',
        body: JSON.stringify({
          sale_id: paySaleId,
          amount: parseFloat(payAmount),
          payment_method: 'CASH',
          notes: 'Abono registrado desde ficha de cliente'
        })
      });
      setPayingCreditCustomer(null);
      setStatusMsg({ type: 'success', text: 'Abono registrado y saldo actualizado.' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Dashboard · CRM · Fidelización y Cuentas por Cobrar
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand text-white rounded shadow-lg shadow-brand/20">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Base Clientes y Fidelidad</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Puntos Acumulados, Niveles VIP y Control de Créditos</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { setEditingCustomer({}); setIsModalOpen(true); }}
          className="bg-brand hover:bg-brand/90 text-white px-8 py-4 rounded font-display font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-brand/20 transition-all active:scale-95 flex items-center gap-2 border-b-4 border-brand-muted italic"
        >
          <Plus className="w-4 h-4" />
          Vincular Cliente
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded border-l-4 flex items-center justify-between text-xs font-bold uppercase ${statusMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-700 dark:text-rose-300'}`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-brand/5 dark:bg-slate-900/40 rounded border border-brand/20 dark:border-slate-800 shadow-xl overflow-hidden p-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
          <input
            type="text"
            placeholder="BUSCAR CLIENTE POR NOMBRE, TELÉFONO O CORREO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-brand/10 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((c) => {
          const tier = getLoyaltyTier(c.points || 0);
          const hasDebt = (c.credit_balance || 0) > 0;
          const cleanPhone = (c.phone || '').replace(/\D/g, '');
          const waPhone = cleanPhone.length === 8 ? `591${cleanPhone}` : cleanPhone;

          return (
            <div key={c.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-brand/10 dark:bg-brand/20 rounded-xl flex items-center justify-center text-brand font-display font-black text-lg">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{c.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs mt-0.5">
                        <Award className={`w-3.5 h-3.5 ${tier.color}`} />
                        <span className={`font-black text-[10px] uppercase tracking-wider ${tier.color}`}>
                          {tier.label} · {c.points || 0} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.email || 'Sin correo electrónico'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono">{c.phone || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.address || 'Sin dirección'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cuenta por Cobrar</p>
                  <p className={`text-sm font-mono font-black ${hasDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {hasDebt ? formatPrice(c.credit_balance || 0) : 'Sin Deuda (0.00)'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {hasDebt && (
                    <button
                      onClick={() => openPayCreditModal(c)}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                      title="Registrar Abono de Deuda"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Cobrar
                    </button>
                  )}
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ${c.name}, le saludamos de Softplus. Tienes ${c.points || 0} puntos acumulados en tu cuenta.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                      title="Contactar por WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  <button 
                    onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }}
                    className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                    title="Editar Cliente"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Abono de Crédito */}
      {payingCreditCustomer && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-black uppercase text-sm italic">Registrar Abono de Crédito</h3>
                <p className="text-xs text-amber-100">{payingCreditCustomer.name}</p>
              </div>
              <button onClick={() => setPayingCreditCustomer(null)} className="p-1 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePayCredit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Seleccionar Venta al Crédito</label>
                <select
                  value={paySaleId || ''}
                  onChange={e => {
                    const id = Number(e.target.value);
                    setPaySaleId(id);
                    const found = credits.find(cr => cr.id === id);
                    if (found) setPayAmount(String(found.balance_due));
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                >
                  {credits
                    .filter(cr => cr.customer_id === payingCreditCustomer.id && cr.balance_due > 0)
                    .map(cr => (
                      <option key={cr.id} value={cr.id}>
                        Venta #{cr.id} — Saldo: {formatPrice(cr.balance_due)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Monto a Abonar</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-black text-base text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Abono
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editingCustomer?.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editingCustomer?.name || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editingCustomer?.email || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono (Para envío de tickets por WhatsApp)</label>
                <input
                  type="text"
                  value={editingCustomer?.phone || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  placeholder="Ej. 78945612"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
                <textarea
                  value={editingCustomer?.address || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none h-20 resize-none text-slate-900 dark:text-white"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-brand text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
