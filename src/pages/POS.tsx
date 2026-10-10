import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Customer, Product, CashSession, Quotation } from '../types';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  User as UserIcon, 
  Package, 
  QrCode,
  Upload,
  X,
  ShoppingBag,
  RefreshCw,
  Wallet,
  FileText,
  Split,
  Clock,
  Award,
  MessageCircle,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Layers
} from 'lucide-react';

export default function POS() {
  const { formatPrice, settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Payment methods: CASH, QR, MIXED, CREDIT
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QR' | 'MIXED' | 'CREDIT'>('CASH');
  const [mixedCashAmount, setMixedCashAmount] = useState<string>('');
  const [creditInitialPay, setCreditInitialPay] = useState<string>('0');
  const [redeemPoints, setRedeemPoints] = useState(false);

  // QR
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  // Cash Register (Arqueo de Caja)
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [openingInput, setOpeningInput] = useState('500');
  const [closingInput, setClosingInput] = useState('');
  const [cashMoveType, setCashMoveType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [cashMoveAmount, setCashMoveAmount] = useState('');
  const [cashMoveReason, setCashMoveReason] = useState('');

  // Quotations (Proformas)
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showQuotationsModal, setShowQuotationsModal] = useState(false);
  const [activeQuotationId, setActiveQuotationId] = useState<number | null>(null);

  // Post-Sale WhatsApp / Receipt Modal
  const [lastReceipt, setLastReceipt] = useState<{
    id: number;
    type: 'VENTA' | 'PROFORMA';
    customerName: string;
    phone: string;
    items: { name: string; quantity: number; price: number }[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    creditBalance?: number;
  } | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const { token, user } = useAuth();
  const { apiFetch } = useApi();

  const isAdmin = user?.role === 'Admin';

  const fetchAllData = async () => {
    try {
      const [prods, custs, sysSettings, cashData, quots] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/customers'),
        apiFetch('/api/settings'),
        apiFetch('/api/cash/current'),
        apiFetch('/api/quotations')
      ]);

      setProducts(prods);
      setCustomers(custs);
      if (sysSettings.payment_qr) setQrCode(sysSettings.payment_qr);
      setCashSession(cashData.session);
      setQuotations(quots);
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') {
        console.error('POS Fetch Error:', err);
        setMessage({ type: 'error', text: err.message });
      }
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || null;

  useEffect(() => {
    setRedeemPoints(false);
  }, [selectedCustomerId]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      setMessage({ type: 'error', text: `El producto ${product.name} no tiene stock disponible.` });
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setMessage({ type: 'error', text: `No puedes agregar más unidades de ${product.name}. Stock máximo: ${product.stock}` });
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stock) {
          setMessage({ type: 'error', text: `Stock insuficiente para ${item.product.name}. Solo quedan ${item.product.stock} unidades.` });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const availablePoints = selectedCustomer?.points || 0;
  // Every 10 points = 5 Bs discount, up to 50% of subtotal
  const maxRedeemablePoints = Math.min(availablePoints - (availablePoints % 10), Math.floor((subtotal * 0.5) / 5) * 10);
  const pointsToRedeem = redeemPoints && maxRedeemablePoints >= 10 ? maxRedeemablePoints : 0;
  const discountAmount = (pointsToRedeem / 10) * 5;
  const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  // Mixed payment calculations
  const parsedMixedCash = Math.min(total, Math.max(0, parseFloat(mixedCashAmount) || 0));
  const calculatedMixedQr = Math.max(0, Number((total - parsedMixedCash).toFixed(2)));

  // Credit payment calculations
  const parsedCreditInitial = Math.min(total, Math.max(0, parseFloat(creditInitialPay) || 0));
  const calculatedCreditBalance = Math.max(0, Number((total - parsedCreditInitial).toFixed(2)));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      setMessage({ type: 'error', text: 'Seleccione un cliente registrado para habilitar venta al crédito (Fiado).' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.product.id,
            quantity: item.quantity,
            price: item.product.price
          })),
          total,
          customer_id: selectedCustomerId,
          payment_method: paymentMethod,
          cash_amount: paymentMethod === 'CASH' ? total : (paymentMethod === 'MIXED' ? parsedMixedCash : (paymentMethod === 'CREDIT' ? parsedCreditInitial : 0)),
          qr_amount: paymentMethod === 'QR' ? total : (paymentMethod === 'MIXED' ? calculatedMixedQr : 0),
          credit_amount: paymentMethod === 'CREDIT' ? calculatedCreditBalance : 0,
          paid_amount: paymentMethod === 'CREDIT' ? parsedCreditInitial : total,
          discount_amount: discountAmount,
          points_redeemed: pointsToRedeem
        })
      });

      if (activeQuotationId) {
        await apiFetch(`/api/quotations/${activeQuotationId}/convert`, { method: 'POST' });
        setActiveQuotationId(null);
      }

      const custName = selectedCustomer ? selectedCustomer.name : 'Consumidor Final';
      const custPhone = selectedCustomer?.phone || '';
      setWhatsappPhone(custPhone);
      setLastReceipt({
        id: response.id || Math.floor(Math.random() * 9000 + 1000),
        type: 'VENTA',
        customerName: custName,
        phone: custPhone,
        items: cart.map(i => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        creditBalance: paymentMethod === 'CREDIT' ? calculatedCreditBalance : 0
      });

      if (response.offline) {
        setMessage({ type: 'success', text: 'Venta guardada localmente. Se sincronizará al recuperar internet.' });
      } else {
        setMessage({ type: 'success', text: 'Venta procesada exitosamente.' });
        fetchAllData();
      }
      
      setCart([]);
      setSelectedCustomerId(null);
      setPaymentMethod('CASH');
      setMixedCashAmount('');
      setCreditInitialPay('0');
      setRedeemPoints(false);
      setShowQrModal(false);
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuotation = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const res = await apiFetch('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          items: cart.map(i => ({ id: i.product.id, quantity: i.quantity, price: i.product.price })),
          total,
          valid_until: validUntil,
          notes: 'Proforma emitida desde terminal POS (No descuenta stock hasta confirmarse)'
        })
      });

      const custName = selectedCustomer ? selectedCustomer.name : 'Cliente General';
      const custPhone = selectedCustomer?.phone || '';
      setWhatsappPhone(custPhone);
      setLastReceipt({
        id: res.id,
        type: 'PROFORMA',
        customerName: custName,
        phone: custPhone,
        items: cart.map(i => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod: 'COTIZACIÓN (VÁLIDA 7 DÍAS)'
      });

      setCart([]);
      fetchAllData();
      setMessage({ type: 'success', text: `Cotización #PRO-${res.id} guardada sin descontar stock.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadQuotationIntoCart = (q: Quotation) => {
    if (!q.details || q.details.length === 0) return;
    const loadedCart: { product: Product; quantity: number }[] = [];
    for (const d of q.details) {
      const prod = products.find(p => p.id === d.product_id);
      if (prod && prod.stock > 0) {
        loadedCart.push({ product: prod, quantity: Math.min(d.quantity, prod.stock) });
      }
    }
    setCart(loadedCart);
    setSelectedCustomerId(q.customer_id || null);
    setActiveQuotationId(q.id);
    setShowQuotationsModal(false);
    setMessage({ type: 'success', text: `Cotización #${q.id} cargada al carrito lista para facturar.` });
  };

  // Cash Register handlers
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/cash/open', {
        method: 'POST',
        body: JSON.stringify({ opening_amount: parseFloat(openingInput) || 0, notes: 'Apertura desde POS' })
      });
      await fetchAllData();
      setMessage({ type: 'success', text: 'Caja abierta correctamente.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCashMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashMoveAmount || parseFloat(cashMoveAmount) <= 0) return;
    try {
      await apiFetch('/api/cash/movement', {
        method: 'POST',
        body: JSON.stringify({
          type: cashMoveType,
          amount: parseFloat(cashMoveAmount),
          reason: cashMoveReason || (cashMoveType === 'INCOME' ? 'Ingreso extra en caja' : 'Gasto menor de caja')
        })
      });
      setCashMoveAmount('');
      setCashMoveReason('');
      await fetchAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCloseCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashSession) return;
    try {
      await apiFetch('/api/cash/close', {
        method: 'POST',
        body: JSON.stringify({
          closing_amount: parseFloat(closingInput) || cashSession.expected_amount,
          expected_amount: cashSession.expected_amount,
          notes: 'Cierre y arqueo de turno'
        })
      });
      setClosingInput('');
      setShowCashModal(false);
      await fetchAllData();
      setMessage({ type: 'success', text: 'Turno de caja cerrado y auditado correctamente.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setQrCode(base64);
      if (isAdmin) {
        setIsUploadingQr(true);
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ key: 'payment_qr', value: base64 })
          });
        } catch (error) {
          console.error('Error saving QR from POS:', error);
        } finally {
          setIsUploadingQr(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const buildReceiptText = () => {
    if (!lastReceipt) return '';
    const company = settings.company_name || 'Softplus';
    const lines = [
      `*${company.toUpperCase()} - COMPROBANTE DE ${lastReceipt.type}*`,
      `Nro: #${lastReceipt.type === 'VENTA' ? 'VEN' : 'PRO'}-${String(lastReceipt.id).padStart(5, '0')}`,
      `Cliente: ${lastReceipt.customerName}`,
      `Fecha: ${new Date().toLocaleString()}`,
      `--------------------------------`,
      ...lastReceipt.items.map(i => `• ${i.quantity}x ${i.name} — ${formatPrice(i.quantity * i.price)}`),
      `--------------------------------`,
      lastReceipt.discount > 0 ? `Subtotal: ${formatPrice(lastReceipt.subtotal)}\nDescuento Fidelidad: -${formatPrice(lastReceipt.discount)}` : '',
      `*TOTAL: ${formatPrice(lastReceipt.total)}*`,
      `Modalidad: ${lastReceipt.paymentMethod}`,
      lastReceipt.creditBalance && lastReceipt.creditBalance > 0 ? `*Saldo Pendiente (Crédito): ${formatPrice(lastReceipt.creditBalance)}*` : '',
      `¡Gracias por su preferencia!`
    ].filter(Boolean);
    return lines.join('\n');
  };

  const getWhatsAppUrl = () => {
    const cleanPhone = whatsappPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 8 ? `591${cleanPhone}` : cleanPhone;
    const text = encodeURIComponent(buildReceiptText());
    return `https://wa.me/${finalPhone}?text=${text}`;
  };

  const copyReceiptToClipboard = () => {
    navigator.clipboard.writeText(buildReceiptText());
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* Top Operational Bar: Cash Register Status & Quotations */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${cashSession ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {cashSession ? `Turno de Caja #${cashSession.id} Activo` : 'Caja Cerrada — Requiere Apertura'}
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
              {cashSession ? (
                <>Efectivo Esperado en Caja: <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(cashSession.expected_amount)}</span></>
              ) : (
                'Abra turno para registrar arqueo de efectivo'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQuotationsModal(true)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <FileText className="w-4 h-4 text-brand" />
            Proformas / Cotizaciones ({quotations.filter(q => q.status === 'PENDING').length})
          </button>

          <button
            onClick={() => {
              if (cashSession) setClosingInput(String(cashSession.expected_amount));
              setShowCashModal(true);
            }}
            className={`px-4 py-2.5 rounded font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${
              cashSession
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {cashSession ? 'Arqueo / Movimientos de Caja' : 'Abrir Caja Ahora'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-12.5rem)] lg:overflow-hidden">
        {/* Products Section */}
        <div className="flex-[1.5] flex flex-col gap-5 min-w-0 h-auto lg:h-full">
          <div className="tech-card border-brand/20 bg-slate-900/5 overflow-hidden">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand/40 group-focus-within:text-brand w-5 h-5 transition-colors" />
              <input
                type="text"
                placeholder="BUSCAR POR NOMBRE, CATEGORÍA O CÓDIGO DE BARRAS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-transparent border-none outline-none text-slate-900 dark:text-white font-display font-black text-xs uppercase tracking-[0.15em] placeholder:text-slate-400 placeholder:font-sans"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[400px] lg:min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`tech-grid-item group flex flex-col p-5 text-left transition-all relative ${product.stock <= 0 ? 'opacity-50 grayscale' : 'active:scale-[0.98]'}`}
                >
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className={`p-2 rounded transition-all transform group-hover:rotate-3 ${product.is_combo ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-brand group-hover:text-white'}`}>
                      {product.is_combo ? <Layers className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        {product.is_combo ? 'COMBO / KIT' : 'Stock.Aval'}
                      </p>
                      <span className={`text-[11px] font-black tabular-nums ${product.stock < 10 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {product.stock.toString().padStart(3, '0')}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className="font-display font-black text-sm text-slate-900 dark:text-white mb-1 truncate w-full group-hover:text-brand transition-colors uppercase tracking-tight italic relative z-10 leading-none">
                    {product.name}
                  </h4>
                  
                  <div className="flex items-center gap-2 mb-4 relative z-10 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>{product.category}</span>
                    {product.barcode && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{product.barcode}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                    <p className="text-lg font-display font-black text-slate-900 dark:text-white tabular-nums group-hover:text-brand transition-colors tracking-tighter">{formatPrice(product.price)}</p>
                    <Plus className="w-4 h-4 text-brand opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                  </div>
                  
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand w-0 group-hover:w-full transition-all duration-500" />
                  
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-slate-100/5 dark:bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center z-20">
                      <span className="bg-rose-600 text-white text-[8px] font-black uppercase px-3 py-1 rounded tracking-tighter shadow-lg">Agotado</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-[440px] tech-card flex flex-col relative overflow-hidden h-auto lg:h-full shrink-0 border-brand/10">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand text-white rounded flex items-center justify-center shadow-lg shadow-brand/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase text-base italic">Terminal POS</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  {cart.length} Ítems {activeQuotationId ? `· Cotización #${activeQuotationId}` : ''}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleSaveQuotation}
                disabled={loading}
                className="px-3 py-2 bg-slate-200/70 dark:bg-slate-800 hover:bg-brand hover:text-white text-slate-700 dark:text-slate-300 rounded text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                title="Guardar como Cotización sin descontar stock"
              >
                <FileText className="w-3.5 h-3.5" />
                Proforma
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            {message && !showQrModal && (
              <div className={`p-3.5 rounded border-l-2 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-500' : 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 border-rose-500'}`}>
                <span className="flex-1">{message.text}</span>
                <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 rounded"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Customer Selector + Loyalty Points Info */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identidad de Cliente y Fidelización</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-brand w-4 h-4" />
                <select 
                  value={selectedCustomerId || ''} 
                  onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                  className="tech-input pl-11 pr-4 py-3 appearance-none cursor-pointer text-[11px] font-bold uppercase"
                >
                  <option value="">VENTA MOSTRADOR (CONSUMIDOR FINAL)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — ({c.points || 0} pts)
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="p-3 bg-slate-100/80 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      Puntos Acumulados: <span className="tabular-nums text-amber-600 dark:text-amber-400">{selectedCustomer.points || 0} pts</span>
                    </p>
                    {(selectedCustomer.credit_balance || 0) > 0 && (
                      <p className="text-[9px] font-bold text-rose-500 uppercase">
                        Deuda Actual: {formatPrice(selectedCustomer.credit_balance || 0)}
                      </p>
                    )}
                  </div>
                  {maxRedeemablePoints >= 10 && (
                    <button
                      type="button"
                      onClick={() => setRedeemPoints(!redeemPoints)}
                      className={`px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition-all ${
                        redeemPoints
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-amber-600 border border-amber-500/30 hover:bg-amber-50'
                      }`}
                    >
                      {redeemPoints ? `Canjeado (-${formatPrice(discountAmount)})` : `Canjear ${maxRedeemablePoints} pts`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-14 flex flex-col items-center justify-center text-slate-400 gap-3">
                  <Package className="w-10 h-10 opacity-15" />
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Cesta Vacía</p>
                    <p className="text-[9px] font-bold uppercase italic opacity-60">Seleccione productos o cargue una proforma</p>
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800 transition-all hover:border-brand/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate leading-none mb-1">{item.product.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 tabular-nums uppercase">{item.quantity} x {formatPrice(item.product.price)}</span>
                        <span className="text-[10px] text-brand font-black tabular-nums tracking-tighter">= {formatPrice(item.quantity * item.product.price)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-brand"><Minus className="w-3 h-3" /></button>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-brand"><Plus className="w-3 h-3" /></button>
                      <div className="w-px h-3 bg-slate-200 dark:bg-slate-800 mx-1" />
                      <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-slate-300 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals & Payment Mode Section */}
          <div className="p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtotal</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-600 dark:text-amber-400">
                  <span className="text-[9px] font-black uppercase tracking-widest">Descuento por Puntos ({pointsToRedeem} pts)</span>
                  <span className="font-black tabular-nums">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">Neto Total</span>
                <span className="text-3xl font-display font-black text-brand tabular-nums tracking-tighter leading-none">{formatPrice(total)}</span>
              </div>
            </div>

            {/* 4 Payment Modalities */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 px-2 rounded border-b-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'CASH' ? 'bg-brand border-brand-muted text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-wider">Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => { setPaymentMethod('QR'); setShowQrModal(true); }}
                className={`py-2.5 px-2 rounded border-b-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'QR' ? 'bg-brand border-brand-muted text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                <QrCode className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-wider">Pago QR</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('MIXED');
                  setMixedCashAmount((total / 2).toFixed(2));
                }}
                className={`py-2.5 px-2 rounded border-b-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'MIXED' ? 'bg-brand border-brand-muted text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                <Split className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-wider">Mixto</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT')}
                className={`py-2.5 px-2 rounded border-b-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'CREDIT' ? 'bg-amber-600 border-amber-700 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-wider">Crédito</span>
              </button>
            </div>

            {/* Mixed Payment Split Input */}
            {paymentMethod === 'MIXED' && total > 0 && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[9px] font-black uppercase text-slate-500">Efectivo Recibido:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={total}
                    value={mixedCashAmount}
                    onChange={(e) => setMixedCashAmount(e.target.value)}
                    className="w-28 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right font-mono font-bold text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[9px] font-black uppercase text-slate-400">Saldo por QR / Transf.:</span>
                  <span className="font-mono font-black text-brand">{formatPrice(calculatedMixedQr)}</span>
                </div>
              </div>
            )}

            {/* Credit / Fiado Input */}
            {paymentMethod === 'CREDIT' && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded border border-amber-500/30 space-y-2">
                {!selectedCustomerId ? (
                  <p className="text-[10px] font-black text-rose-600 uppercase">
                    ⚠️ Seleccione un cliente arriba para habilitar Crédito.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[9px] font-black uppercase text-amber-800 dark:text-amber-300">Adelanto / Pago Inicial:</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={total}
                        value={creditInitialPay}
                        onChange={(e) => setCreditInitialPay(e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-right font-mono font-bold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                      <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">Saldo por Cobrar (Fiado):</span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">{formatPrice(calculatedCreditBalance)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
              className="w-full py-4 bg-brand hover:bg-brand/90 text-white rounded font-black uppercase tracking-[0.25em] text-xs shadow-xl shadow-brand/20 transition-all border-b-4 border-brand-muted flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
              {loading ? 'Procesando...' : 'Ejecutar Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: Cash Register (Arqueo y Cierre de Caja) */}
      {showCashModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-display font-black uppercase tracking-wider text-sm italic">Control y Arqueo de Caja</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    {cashSession ? `Sesión #${cashSession.id} — Abierta por ${cashSession.user_name}` : 'Apertura de Nuevo Turno'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCashModal(false)} className="p-1.5 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {!cashSession ? (
                <form onSubmit={handleOpenCash} className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-black uppercase text-slate-500 mb-2">Monto Inicial en Efectivo (Sencillo / Base)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={openingInput}
                      onChange={e => setOpeningInput(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-lg font-black text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs rounded shadow-lg"
                  >
                    Confirmar Apertura de Caja
                  </button>
                </form>
              ) : (
                <>
                  {/* Cash Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                      <p className="text-[9px] font-black uppercase text-slate-400">Monto Inicial</p>
                      <p className="text-base font-mono font-black text-slate-900 dark:text-white">{formatPrice(cashSession.opening_amount)}</p>
                    </div>
                    <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded border border-emerald-500/20">
                      <p className="text-[9px] font-black uppercase text-emerald-600">Ventas en Efectivo</p>
                      <p className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">+{formatPrice(cashSession.cash_sales || 0)}</p>
                    </div>
                    <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded border border-blue-500/20">
                      <p className="text-[9px] font-black uppercase text-blue-600">Ventas por QR (Banco)</p>
                      <p className="text-base font-mono font-black text-blue-600 dark:text-blue-400">{formatPrice(cashSession.qr_sales || 0)}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                      <p className="text-[9px] font-black uppercase text-slate-400">Ingresos Extra / Cobros</p>
                      <p className="text-base font-mono font-black text-emerald-500">+{formatPrice((cashSession.extra_income || 0) + (cashSession.credit_collections || 0))}</p>
                    </div>
                    <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 rounded border border-rose-500/20">
                      <p className="text-[9px] font-black uppercase text-rose-500">Salidas / Gastos Caja</p>
                      <p className="text-base font-mono font-black text-rose-500">-{formatPrice(cashSession.extra_expense || 0)}</p>
                    </div>
                    <div className="p-3.5 bg-slate-900 text-white rounded border border-slate-700">
                      <p className="text-[9px] font-black uppercase text-emerald-400">Efectivo Esperado</p>
                      <p className="text-lg font-mono font-black text-white">{formatPrice(cashSession.expected_amount)}</p>
                    </div>
                  </div>

                  {/* Register Cash In / Out (Petty Cash) */}
                  <form onSubmit={handleCashMovement} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registrar Entrada o Salida de Efectivo (Caja Chica)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <select
                        value={cashMoveType}
                        onChange={e => setCashMoveType(e.target.value as 'INCOME' | 'EXPENSE')}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="EXPENSE">Salida / Gasto (-)</option>
                        <option value="INCOME">Ingreso Extra (+)</option>
                      </select>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Monto"
                        value={cashMoveAmount}
                        onChange={e => setCashMoveAmount(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Motivo (ej. Taxi, Agua, Cambio)"
                        value={cashMoveReason}
                        onChange={e => setCashMoveReason(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-brand text-white rounded text-[10px] font-black uppercase tracking-wider hover:opacity-90"
                      >
                        Registrar
                      </button>
                    </div>

                    {cashSession.movements && cashSession.movements.length > 0 && (
                      <div className="max-h-28 overflow-y-auto space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                        {cashSession.movements.map(m => (
                          <div key={m.id} className="flex items-center justify-between text-xs py-1">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              {m.type === 'INCOME' ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />}
                              {m.reason}
                            </span>
                            <span className={`font-mono font-bold ${m.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {m.type === 'INCOME' ? '+' : '-'}{formatPrice(m.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>

                  {/* Close Cash Session Form */}
                  <form onSubmit={handleCloseCash} className="p-4 bg-rose-50/40 dark:bg-rose-950/10 rounded border border-rose-500/20 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Cierre de Turno y Cuadre Físico</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Efectivo Físico Contado en Gaveta</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={closingInput}
                          onChange={e => setClosingInput(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono font-black text-base text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Diferencia de Arqueo</p>
                        {(() => {
                          const diff = (parseFloat(closingInput) || 0) - cashSession.expected_amount;
                          return (
                            <p className={`text-lg font-mono font-black ${Math.abs(diff) < 0.05 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                              {Math.abs(diff) < 0.05 ? 'CUADRE EXACTO (0.00)' : `${diff > 0 ? 'SOBRANTE +' : 'FALTANTE '}${formatPrice(diff)}`}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded font-black uppercase tracking-widest text-xs shadow-md"
                    >
                      Cerrar Turno de Caja y Guardar Arqueo
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Quotations / Proformas List */}
      {showQuotationsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-brand" />
                <div>
                  <h3 className="font-display font-black uppercase tracking-wider text-sm italic">Cotizaciones y Proformas</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Convierta cualquier proforma en venta con 1 clic</p>
                </div>
              </div>
              <button onClick={() => setShowQuotationsModal(false)} className="p-1.5 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar">
              {quotations.length === 0 ? (
                <p className="text-center py-12 text-xs text-slate-400 uppercase font-bold">No hay cotizaciones registradas</p>
              ) : (
                quotations.map(q => (
                  <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">#PRO-{String(q.id).padStart(4, '0')}</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">· {q.customer_name || 'Cliente General'}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${q.status === 'CONVERTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {q.status === 'CONVERTED' ? 'Facturada' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Vence: {q.valid_until} · {q.details?.length || 0} productos · Emitido por {q.seller_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-display font-black text-slate-900 dark:text-white tabular-nums">{formatPrice(q.total)}</span>
                      {q.status === 'PENDING' && (
                        <button
                          onClick={() => loadQuotationIntoCart(q)}
                          className="px-4 py-2 bg-brand text-white rounded text-[10px] font-black uppercase tracking-wider hover:opacity-90"
                        >
                          Cargar al POS
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Post-Sale Receipt & WhatsApp Sender */}
      {lastReceipt && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5" />
                <div>
                  <h3 className="font-display font-black uppercase text-sm italic">
                    {lastReceipt.type === 'VENTA' ? 'Comprobante de Venta' : 'Proforma Generada'}
                  </h3>
                  <p className="text-[10px] text-emerald-100 font-mono">#{lastReceipt.id.toString().padStart(5, '0')}</p>
                </div>
              </div>
              <button onClick={() => setLastReceipt(null)} className="p-1 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <pre className="p-4 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-200 max-h-60 overflow-y-auto">
                {buildReceiptText()}
              </pre>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Enviar Comprobante por WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nro Celular (ej. 78945612)"
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <a
                    href={getWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black text-[10px] uppercase tracking-wider flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={copyReceiptToClipboard}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {copiedReceipt ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedReceipt ? 'Copiado' : 'Copiar Texto'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-brand/20">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-brand/20">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-brand" />
                <h3 className="font-display font-black uppercase tracking-widest text-xs italic">Pasarela de Pago QR</h3>
              </div>
              <button 
                onClick={() => {
                  setShowQrModal(false);
                  if (cart.length > 0) setPaymentMethod('CASH');
                }} 
                className="p-1 hover:bg-brand/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center gap-8">
              {qrCode ? (
                <>
                  <div className="bg-white p-6 rounded-lg shadow-inner border border-slate-100 relative group">
                    <img src={qrCode} alt="Terminal QR" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Total a Recibir</span>
                      <span className="text-4xl font-display font-black text-brand tracking-tighter tabular-nums leading-none">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleCheckout();
                    }}
                    disabled={loading}
                    className="w-full py-5 bg-brand hover:bg-brand/90 text-white rounded font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-brand/20 transition-all active:scale-95 border-b-4 border-brand-muted flex items-center justify-center gap-3"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {loading ? 'Auditando...' : 'Confirmar Transferencia'}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50 w-full">
                  <QrCode className="w-12 h-12 text-brand/20 mb-4" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center max-w-[150px]">
                    QR No Configurado
                  </p>
                  <label className="cursor-pointer px-6 py-3 bg-brand text-white rounded font-black text-[10px] uppercase tracking-widest hover:bg-brand/90 transition-all flex items-center gap-2 border-b-4 border-brand-muted shadow-lg shadow-brand/10">
                    <Upload className="w-4 h-4" />
                    Cargar Imagen QR
                    <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload} />
                  </label>
                  {isUploadingQr && (
                    <p className="mt-4 text-[9px] text-brand font-black animate-pulse uppercase tracking-[0.2em]">Guardando...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
