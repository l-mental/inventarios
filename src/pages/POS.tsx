import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Customer, Product, CashSession, Quotation } from '../types';
import PosQuotationModal from '../components/PosQuotationModal';
import {
  TRACTOR_CATEGORIES,
  TRACTOR_BRANDS,
  getStockStatus,
  getBrandAccent,
} from '../data/tractorPartsCatalog';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  User as UserIcon,
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
  Wrench,
} from 'lucide-react';

interface CartItem {
  cartKey: string;
  product: Product;
  quantity: number;
}

export default function POS() {
  const { formatPrice, settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos');
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
  const [showPosQuotationModal, setShowPosQuotationModal] = useState(false);
  const [activeQuotationId, setActiveQuotationId] = useState<number | null>(null);

  // Post-Sale WhatsApp / Receipt Modal
  const [lastReceipt, setLastReceipt] = useState<{
    id: number;
    type: 'VENTA' | 'PROFORMA';
    customerName: string;
    phone: string;
    items: { name: string; code?: string; unit?: string; quantity: number; price: number }[];
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
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'Admin';

  const fetchAllData = async () => {
    try {
      const [prods, custs, sysSettings, cashData, quots] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/customers'),
        apiFetch('/api/settings'),
        apiFetch('/api/cash/current'),
        apiFetch('/api/quotations'),
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
    const state = location.state as { loadQuotation?: Quotation } | null;
    if (state?.loadQuotation && products.length > 0) {
      loadQuotationIntoCart(state.loadQuotation);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, products]);

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

  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.oem_codes && p.oem_codes.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesBrand = selectedBrand === 'Todos' || (p.brand || 'GENERAL') === selectedBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  });

  const addProductToCart = (product: Product) => {
    if (product.stock <= 0) {
      setMessage({ type: 'error', text: `El repuesto [${product.barcode || product.id}] ${product.name} no tiene stock disponible.` });
      return;
    }

    const cartKey = String(product.id);
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          setMessage({
            type: 'error',
            text: `Stock máximo alcanzado para ${product.name} (${product.stock} ${product.unit_type || 'UNIDAD'}).`,
          });
          return prev;
        }
        return prev.map(i =>
          i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { cartKey, product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (cartKey: string, nextQty: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.cartKey !== cartKey) return item;
        const clamped = Math.max(1, Math.min(item.product.stock, Math.round(nextQty) || 1));
        if (nextQty > item.product.stock) {
          setMessage({
            type: 'error',
            text: `Stock disponible máximo de ${item.product.name}: ${item.product.stock}.`,
          });
        }
        return { ...item, quantity: clamped };
      })
    );
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const subtotal = Number(cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0).toFixed(2));
  const totalCartUnits = cart.reduce((acc, item) => acc + item.quantity, 0);

  const availablePoints = selectedCustomer?.points || 0;
  const maxRedeemablePoints = Math.min(availablePoints - (availablePoints % 10), Math.floor((subtotal * 0.5) / 5) * 10);
  const pointsToRedeem = redeemPoints && maxRedeemablePoints >= 10 ? maxRedeemablePoints : 0;
  const discountAmount = (pointsToRedeem / 10) * 5;
  const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  const parsedMixedCash = Math.min(total, Math.max(0, parseFloat(mixedCashAmount) || 0));
  const calculatedMixedQr = Math.max(0, Number((total - parsedMixedCash).toFixed(2)));

  const parsedCreditInitial = Math.min(total, Math.max(0, parseFloat(creditInitialPay) || 0));
  const calculatedCreditBalance = Math.max(0, Number((total - parsedCreditInitial).toFixed(2)));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      setMessage({ type: 'error', text: 'Seleccione un cliente o taller registrado para habilitar venta al crédito.' });
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
            price: item.product.price,
            measurement_summary: `${item.quantity} ${item.product.unit_type || 'UNIDAD'} · Cód ${item.product.barcode || item.product.id}`,
          })),
          total,
          customer_id: selectedCustomerId,
          payment_method: paymentMethod,
          cash_amount:
            paymentMethod === 'CASH'
              ? total
              : paymentMethod === 'MIXED'
                ? parsedMixedCash
                : paymentMethod === 'CREDIT'
                  ? parsedCreditInitial
                  : 0,
          qr_amount: paymentMethod === 'QR' ? total : paymentMethod === 'MIXED' ? calculatedMixedQr : 0,
          credit_amount: paymentMethod === 'CREDIT' ? calculatedCreditBalance : 0,
          paid_amount: paymentMethod === 'CREDIT' ? parsedCreditInitial : total,
          discount_amount: discountAmount,
          points_redeemed: pointsToRedeem,
        }),
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
        items: cart.map(i => ({
          name: i.product.name,
          code: i.product.barcode || String(i.product.id),
          unit: i.product.unit_type || 'UNIDAD',
          quantity: i.quantity,
          price: i.product.price,
        })),
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
        creditBalance: paymentMethod === 'CREDIT' ? calculatedCreditBalance : 0,
      });

      setMessage({
        type: 'success',
        text: response.offline
          ? 'Venta guardada localmente. Se sincronizará al recuperar internet.'
          : 'Venta procesada y stock actualizado exitosamente.',
      });
      if (!response.offline) fetchAllData();

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

  const handleOpenQuotationWindow = () => {
    navigate('/quotations', {
      state:
        cart.length > 0
          ? {
              fromPosCart: cart.map(c => ({ product: c.product, quantity: c.quantity })),
              customerId: selectedCustomerId,
            }
          : undefined,
    });
  };

  const loadQuotationIntoCart = (q: Quotation) => {
    if (!q.details || q.details.length === 0) return;
    const loadedCart: CartItem[] = [];
    for (const d of q.details) {
      const prod = products.find(p => p.id === d.product_id);
      if (prod && prod.stock > 0) {
        const qty = Math.min(d.quantity, prod.stock);
        loadedCart.push({
          cartKey: String(prod.id),
          product: prod,
          quantity: qty,
        });
      }
    }
    setCart(loadedCart);
    setSelectedCustomerId(q.customer_id || null);
    setActiveQuotationId(q.id);
    setShowQuotationsModal(false);
    setMessage({ type: 'success', text: `Proforma #${q.id} cargada al terminal lista para facturar.` });
  };

  // Cash Register handlers
  const handleOpenCash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/cash/open', {
        method: 'POST',
        body: JSON.stringify({ opening_amount: parseFloat(openingInput) || 0, notes: 'Apertura desde POS' }),
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
          reason: cashMoveReason || (cashMoveType === 'INCOME' ? 'Ingreso extra en caja' : 'Gasto menor de caja'),
        }),
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
          notes: 'Cierre y arqueo de turno',
        }),
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
            body: JSON.stringify({ key: 'payment_qr', value: base64 }),
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
    const company = settings.company_name || 'AgroPartes Tractores S.R.L.';
    const lines = [
      `*${company.toUpperCase()} - COMPROBANTE DE ${lastReceipt.type}*`,
      `Nro: #${lastReceipt.type === 'VENTA' ? 'VEN' : 'PRO'}-${String(lastReceipt.id).padStart(5, '0')}`,
      `Cliente: ${lastReceipt.customerName}`,
      `Fecha: ${new Date().toLocaleString()}`,
      `--------------------------------`,
      ...lastReceipt.items.map(
        i =>
          `• [${i.code || '-'}] ${i.name}\n  ${i.quantity} ${i.unit || 'UNIDAD'} × ${formatPrice(i.price)} = ${formatPrice(i.quantity * i.price)}`
      ),
      `--------------------------------`,
      lastReceipt.discount > 0
        ? `Subtotal: ${formatPrice(lastReceipt.subtotal)}\nDescuento Fidelidad: -${formatPrice(lastReceipt.discount)}`
        : '',
      `*TOTAL: ${formatPrice(lastReceipt.total)}*`,
      `Modalidad: ${lastReceipt.paymentMethod}`,
      lastReceipt.creditBalance && lastReceipt.creditBalance > 0
        ? `*Saldo Pendiente (Crédito): ${formatPrice(lastReceipt.creditBalance)}*`
        : '',
      `¡Gracias por su preferencia!`,
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className={`w-2.5 h-2.5 rounded-full ${cashSession ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {cashSession ? `Turno de Caja #${cashSession.id} Activo` : 'Caja Cerrada — Requiere Apertura'}
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
              {cashSession ? (
                <>
                  Efectivo Esperado en Caja:{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatPrice(cashSession.expected_amount)}
                  </span>
                </>
              ) : (
                'Abra turno para registrar arqueo de efectivo'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenQuotationWindow}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand hover:text-white text-slate-700 dark:text-slate-200 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap"
          >
            <FileText className="w-4 h-4 text-brand group-hover:text-white" />
            Cotizaciones PDF ({quotations.filter(q => q.status === 'PENDING').length})
          </button>

          <button
            onClick={() => {
              if (cashSession) setClosingInput(String(cashSession.expected_amount));
              setShowCashModal(true);
            }}
            className={`px-4 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm whitespace-nowrap ${
              cashSession
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {cashSession ? 'Arqueo de Caja' : 'Abrir Caja Ahora'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-12.5rem)] lg:overflow-hidden">
        {/* Products Section */}
        <div className="flex-[1.5] flex flex-col gap-4 min-w-0 h-auto lg:h-full">
          {/* Search & Brand/Category Filter Bar */}
          <div className="tech-card p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand/50 group-focus-within:text-brand w-4 h-4 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar por código interno, OEM (ej. EM9532, Perkins), repuesto o proveedor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-brand text-slate-900 dark:text-white font-semibold text-xs placeholder:text-slate-400"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase text-slate-900 dark:text-white outline-none focus:border-brand"
              >
                <option value="Todos">Todas las Categorías</option>
                {TRACTOR_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Brand Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['Todos', ...TRACTOR_BRANDS].map(brand => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setSelectedBrand(brand)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                    selectedBrand === brand
                      ? 'bg-brand text-white border-brand shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand/40'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* Spare Parts Grid */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[400px] lg:min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-4">
              {filteredProducts.map(product => {
                const stockStatus = getStockStatus(product);
                const brandStyle = getBrandAccent(product.brand);

                return (
                  <button
                    key={product.id}
                    onClick={() => addProductToCart(product)}
                    disabled={product.stock <= 0}
                    className={`tech-grid-item group flex flex-col p-4 text-left transition-all relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 ${
                      product.stock <= 0 ? 'opacity-60' : 'hover:border-brand/60 active:scale-[0.99]'
                    }`}
                  >
                    {/* Header: Code + Brand + Stock Status */}
                    <div className="flex items-center justify-between gap-2 w-full mb-2">
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {product.barcode || `REP-${product.id}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${brandStyle.bg} ${brandStyle.text} ${brandStyle.border}`}
                      >
                        {product.brand || 'GENERAL'}
                      </span>
                    </div>

                    {/* Product Name */}
                    <h4 className="font-display font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mb-1.5 line-clamp-2 w-full group-hover:text-brand transition-colors tracking-tight leading-snug">
                      {product.name}
                    </h4>

                    {/* Metadata line: Category · Unit · Supplier */}
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1.5 truncate w-full">
                      <span>{product.category}</span>
                      <span className="mx-1">·</span>
                      <span>{product.unit_type || 'UNIDAD'}</span>
                      <span className="mx-1">·</span>
                      <span>{product.supplier_name || product.batch_number || 'GENERAL'}</span>
                    </div>

                    {/* OEM snippet */}
                    <p
                      className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate w-full mb-3"
                      title={product.oem_codes || ''}
                    >
                      OEM: {product.oem_codes || '-'}
                    </p>

                    {/* Footer: Price & Stock & Add */}
                    <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between w-full gap-2">
                      <div>
                        <p className="text-base font-display font-black text-slate-900 dark:text-white tabular-nums group-hover:text-brand transition-colors tracking-tight leading-none">
                          {formatPrice(product.price)}
                        </p>
                        <p className={`text-[10px] font-mono font-bold mt-1 tabular-nums ${
                          stockStatus === 'sin_stock'
                            ? 'text-rose-500'
                            : stockStatus === 'bajo'
                              ? 'text-amber-600'
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {stockStatus === 'sin_stock' ? 'Sin Stock (0)' : `Stock: ${product.stock}`}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors ${
                        product.stock <= 0
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : 'bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white'
                      }`}>
                        <Plus className="w-3 h-3" />
                        Agregar
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-[440px] tech-card flex flex-col relative overflow-hidden h-auto lg:h-full shrink-0">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand text-white rounded-lg flex items-center justify-center shadow-md shadow-brand/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-slate-900 dark:text-white tracking-tight uppercase text-base">
                  Mostrador de Repuestos
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider tabular-nums">
                  {cart.length} ítems · {totalCartUnits} unidades
                  {activeQuotationId ? ` · Proforma #${activeQuotationId}` : ''}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setShowPosQuotationModal(true)}
                disabled={loading}
                className="px-3 py-2 bg-slate-200/80 dark:bg-slate-800 hover:bg-brand hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                title="Abrir Cotización PDF con Tipo de Cambio en POS Mostrador"
              >
                <FileText className="w-3.5 h-3.5" />
                Cotizar PDF
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            {message && !showQrModal && (
              <div
                className={`p-3.5 rounded-lg border flex items-center gap-3 text-xs font-bold ${
                  message.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                <span className="flex-1">{message.text}</span>
                <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 rounded">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Customer Selector + Loyalty Points Info */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Cliente / Taller / Estancia Agrícola
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand w-4 h-4" />
                <select
                  value={selectedCustomerId || ''}
                  onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                  className="tech-input pl-10 pr-4 py-2.5 appearance-none cursor-pointer text-xs font-bold uppercase"
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
                <div className="p-3 bg-slate-100/80 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      Puntos Acumulados:{' '}
                      <span className="tabular-nums text-amber-600 dark:text-amber-400">
                        {selectedCustomer.points || 0} pts
                      </span>
                    </p>
                    {(selectedCustomer.credit_balance || 0) > 0 && (
                      <p className="text-[10px] font-bold text-rose-500 uppercase">
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
                      {redeemPoints
                        ? `Canjeado (-${formatPrice(discountAmount)})`
                        : `Canjear ${maxRedeemablePoints} pts`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Wrench className="w-9 h-9 opacity-25 text-brand" />
                  <div className="text-center space-y-1 px-4">
                    <p className="text-[11px] font-black uppercase tracking-widest">Pedido Vacío</p>
                    <p className="text-[10px] font-medium text-slate-400">
                      Haz clic en cualquier repuesto con stock disponible para agregarlo al mostrador
                    </p>
                  </div>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.cartKey}
                    className="flex items-start justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800 transition-all hover:border-brand/40"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-mono font-black text-brand">
                          {item.product.barcode || `REP-${item.product.id}`}
                        </span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
                          {item.product.brand || 'GENERAL'}
                        </span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight line-clamp-2 leading-snug">
                        {item.product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                          {item.quantity} {item.product.unit_type || 'UNIDAD'} × {formatPrice(item.product.price)}
                        </span>
                        <span className="text-xs text-slate-900 dark:text-white font-black tabular-nums">
                          = {formatPrice(item.quantity * item.product.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.cartKey, item.quantity - 1)}
                          className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-brand"
                          title="Disminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={e => updateCartQuantity(item.cartKey, parseInt(e.target.value, 10) || 1)}
                          className="w-11 h-7 text-center font-mono font-black text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.cartKey, item.quantity + 1)}
                          className="w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-brand"
                          title="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartKey)}
                          className="p-1 text-slate-400 hover:text-rose-500 ml-0.5"
                          title="Quitar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Totals & Payment Mode Section */}
          <div className="p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtotal ({totalCartUnits} uds)</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatPrice(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-600 dark:text-amber-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Descuento Puntos ({pointsToRedeem} pts)
                  </span>
                  <span className="font-black tabular-nums">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="pt-2 flex justify-between items-end border-t border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
                  Total a Cobrar
                </span>
                <span className="text-3xl font-display font-black text-brand tabular-nums tracking-tight leading-none">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            {/* 4 Payment Modalities */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 px-2 rounded-lg border-b-2 transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'CASH'
                    ? 'bg-brand border-brand-muted text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-wider">Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('QR');
                  setShowQrModal(true);
                }}
                className={`py-2.5 px-2 rounded-lg border-b-2 transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'QR'
                    ? 'bg-brand border-brand-muted text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-wider">Pago QR</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('MIXED');
                  setMixedCashAmount((total / 2).toFixed(2));
                }}
                className={`py-2.5 px-2 rounded-lg border-b-2 transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'MIXED'
                    ? 'bg-brand border-brand-muted text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Split className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-wider">Mixto</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT')}
                className={`py-2.5 px-2 rounded-lg border-b-2 transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'CREDIT'
                    ? 'bg-amber-600 border-amber-700 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-wider">Crédito</span>
              </button>
            </div>

            {paymentMethod === 'MIXED' && total > 0 && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[9px] font-black uppercase text-slate-500">Efectivo Recibido:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={total}
                    value={mixedCashAmount}
                    onChange={e => setMixedCashAmount(e.target.value)}
                    className="w-28 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right font-mono font-bold text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[9px] font-black uppercase text-slate-400">Saldo por QR / Transf.:</span>
                  <span className="font-mono font-black text-brand">{formatPrice(calculatedMixedQr)}</span>
                </div>
              </div>
            )}

            {paymentMethod === 'CREDIT' && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-lg border border-amber-500/30 space-y-2">
                {!selectedCustomerId ? (
                  <p className="text-[10px] font-black text-rose-600 uppercase">
                    Seleccione un cliente arriba para habilitar Crédito.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[9px] font-black uppercase text-amber-800 dark:text-amber-300">
                        Adelanto / Pago Inicial:
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={total}
                        value={creditInitialPay}
                        onChange={e => setCreditInitialPay(e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded text-right font-mono font-bold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                      <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400">
                        Saldo por Cobrar:
                      </span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                        {formatPrice(calculatedCreditBalance)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || loading}
                className="w-full py-3.5 bg-brand hover:bg-brand/90 text-white rounded-lg font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-brand/20 transition-all border-b-4 border-brand-muted flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
                {loading ? 'Procesando...' : 'Confirmar Venta y Facturar'}
              </button>

              <button
                type="button"
                onClick={() => setShowPosQuotationModal(true)}
                disabled={cart.length === 0 || loading}
                className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-black uppercase tracking-[0.14em] text-[10px] border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-45"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                Cotizar en PDF (Tipo de Cambio &amp; WhatsApp)
              </button>
            </div>
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
                  <h3 className="font-display font-black uppercase tracking-wider text-sm">Control y Arqueo de Caja</h3>
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
                    <label className="block text-xs font-black uppercase text-slate-500 mb-2">
                      Monto Inicial en Efectivo (Sencillo / Base)
                    </label>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                      <p className="text-[9px] font-black uppercase text-slate-400">Monto Inicial</p>
                      <p className="text-base font-mono font-black text-slate-900 dark:text-white">
                        {formatPrice(cashSession.opening_amount)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded border border-emerald-500/20">
                      <p className="text-[9px] font-black uppercase text-emerald-600">Ventas en Efectivo</p>
                      <p className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                        +{formatPrice(cashSession.cash_sales || 0)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 rounded border border-blue-500/20">
                      <p className="text-[9px] font-black uppercase text-blue-600">Ventas por QR</p>
                      <p className="text-base font-mono font-black text-blue-600 dark:text-blue-400">
                        {formatPrice(cashSession.qr_sales || 0)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                      <p className="text-[9px] font-black uppercase text-slate-400">Ingresos Extra / Cobros</p>
                      <p className="text-base font-mono font-black text-emerald-500">
                        +{formatPrice((cashSession.extra_income || 0) + (cashSession.credit_collections || 0))}
                      </p>
                    </div>
                    <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 rounded border border-rose-500/20">
                      <p className="text-[9px] font-black uppercase text-rose-500">Salidas / Gastos Caja</p>
                      <p className="text-base font-mono font-black text-rose-500">
                        -{formatPrice(cashSession.extra_expense || 0)}
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-900 text-white rounded border border-slate-700">
                      <p className="text-[9px] font-black uppercase text-emerald-400">Efectivo Esperado</p>
                      <p className="text-lg font-mono font-black text-white">{formatPrice(cashSession.expected_amount)}</p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleCashMovement}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Registrar Entrada o Salida de Efectivo
                    </p>
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
                        placeholder="Motivo (ej. Encomienda, Flete, Cambio)"
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
                              {m.type === 'INCOME' ? (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                              )}
                              {m.reason}
                            </span>
                            <span className={`font-mono font-bold ${m.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {m.type === 'INCOME' ? '+' : '-'}
                              {formatPrice(m.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </form>

                  <form
                    onSubmit={handleCloseCash}
                    className="p-4 bg-rose-50/40 dark:bg-rose-950/10 rounded border border-rose-500/20 space-y-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
                      Cierre de Turno y Cuadre Físico
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Efectivo Físico Contado
                        </label>
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
                            <p
                              className={`text-lg font-mono font-black ${
                                Math.abs(diff) < 0.05
                                  ? 'text-emerald-600'
                                  : diff > 0
                                    ? 'text-blue-600'
                                    : 'text-rose-600'
                              }`}
                            >
                              {Math.abs(diff) < 0.05
                                ? 'CUADRE EXACTO (0.00)'
                                : `${diff > 0 ? 'SOBRANTE +' : 'FALTANTE '}${formatPrice(diff)}`}
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
                  <h3 className="font-display font-black uppercase tracking-wider text-sm">
                    Cotizaciones y Proformas de Repuestos
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Convierta cualquier proforma pendiente en orden de venta
                  </p>
                </div>
              </div>
              <button onClick={() => setShowQuotationsModal(false)} className="p-1.5 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar">
              {quotations.length === 0 ? (
                <p className="text-center py-12 text-xs text-slate-400 uppercase font-bold">
                  No hay proformas registradas
                </p>
              ) : (
                quotations.map(q => (
                  <div
                    key={q.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                          #PRO-{String(q.id).padStart(4, '0')}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          · {q.customer_name || 'Cliente General'}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            q.status === 'CONVERTED'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {q.status === 'CONVERTED' ? 'Facturada' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Vence: {q.valid_until} · {q.details?.length || 0} ítems · {q.notes || q.seller_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-display font-black text-slate-900 dark:text-white tabular-nums">
                        {formatPrice(q.total)}
                      </span>
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
                  <h3 className="font-display font-black uppercase text-sm">
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
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-brand/20">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-brand/20">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-brand" />
                <h3 className="font-display font-black uppercase tracking-widest text-xs">Pasarela de Pago QR</h3>
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
                      <span className="text-4xl font-display font-black text-brand tracking-tighter tabular-nums leading-none">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={e => {
                      e.preventDefault();
                      handleCheckout();
                    }}
                    disabled={loading}
                    className="w-full py-4 bg-brand hover:bg-brand/90 text-white rounded-lg font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-brand/20 transition-all active:scale-95 border-b-4 border-brand-muted flex items-center justify-center gap-3"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {loading ? 'Procesando...' : 'Confirmar Transferencia'}
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
                  {isUploadingQr && <p className="text-[9px] text-brand mt-2 uppercase font-bold">Guardando QR...</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full POS Mostrador Quotation Modal (Paso 1 Tipo de Cambio -> Paso 2 PDF & WhatsApp PDF) */}
      <PosQuotationModal
        isOpen={showPosQuotationModal}
        onClose={() => setShowPosQuotationModal(false)}
        cart={cart.map(c => ({ product: c.product, quantity: c.quantity }))}
        selectedCustomer={selectedCustomer}
        initialDiscount={discountAmount}
        nextQuoteNumber={String(
          quotations.reduce((max, q) => {
            const n = parseInt(String(q.quote_number || q.id || '0'), 10);
            return Number.isFinite(n) ? Math.max(max, n) : max;
          }, 11000) + 1
        )}
        onSuccess={quoteNum => {
          fetchAllData();
          setMessage({
            type: 'success',
            text: `Cotización N° ${quoteNum} guardada y generada en PDF sin descontar stock.`,
          });
        }}
      />
    </div>
  );
}
