import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Customer, Product, CashSession, Quotation } from '../types';
import CalaminaImage from '../components/CalaminaImage';
import {
  CALAMINA_CATEGORIES,
  CALAMINA_COLOR_SWATCHES,
  STANDARD_CUT_LENGTHS,
  formatMeter,
} from '../lib/calaminaCatalog';
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
  Layers,
  Ruler,
  Calculator,
} from 'lucide-react';

interface CartItem {
  cartKey: string;
  product: Product;
  quantity: number; // Metros lineales totales
  sheet_length_m?: number;
  sheet_count?: number;
  measurement_summary?: string;
}

export default function POS() {
  const { formatPrice, settings } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedColor, setSelectedColor] = useState<string>('Todos');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Measurement & Cut Calculator Modal
  const [measureProduct, setMeasureProduct] = useState<Product | null>(null);
  const [editingCartKey, setEditingCartKey] = useState<string | null>(null);
  const [measureMode, setMeasureMode] = useState<'sheets' | 'direct'>('sheets');
  const [sheetLength, setSheetLength] = useState<number>(3.0);
  const [sheetCount, setSheetCount] = useState<number>(1);
  const [directMeters, setDirectMeters] = useState<number>(3.0);
  const [showAreaHelper, setShowAreaHelper] = useState(false);
  const [roofWidth, setRoofWidth] = useState<string>('6');
  const [roofDropLength, setRoofDropLength] = useState<string>('3.6');

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
    items: { name: string; quantity: number; price: number; measurement_summary?: string }[];
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
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.color_name && p.color_name.toLowerCase().includes(q)) ||
      (p.design_type && p.design_type.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesColor = selectedColor === 'Todos' || p.color_name === selectedColor;
    return matchesSearch && matchesCategory && matchesColor;
  });

  const openMeasurementModal = (product: Product, existingItem?: CartItem) => {
    if (product.stock <= 0) {
      setMessage({ type: 'error', text: `El material ${product.name} no tiene stock disponible.` });
      return;
    }
    setMeasureProduct(product);
    setShowAreaHelper(false);
    if (existingItem) {
      setEditingCartKey(existingItem.cartKey);
      if (existingItem.sheet_length_m && existingItem.sheet_count) {
        setMeasureMode('sheets');
        setSheetLength(existingItem.sheet_length_m);
        setSheetCount(existingItem.sheet_count);
        setDirectMeters(existingItem.quantity);
      } else {
        setMeasureMode('direct');
        setDirectMeters(existingItem.quantity);
        setSheetLength(product.standard_length_m || 3.0);
        setSheetCount(1);
      }
    } else {
      setEditingCartKey(null);
      setMeasureMode('sheets');
      const defLen = product.standard_length_m || 3.0;
      setSheetLength(defLen);
      setSheetCount(1);
      setDirectMeters(defLen);
    }
  };

  const applyRoofAreaCalculation = () => {
    if (!measureProduct) return;
    const w = Math.max(0.5, parseFloat(roofWidth) || 1);
    const d = Math.max(0.5, parseFloat(roofDropLength) || 1);
    const usableW = measureProduct.width_m || 0.85;
    const neededSheets = Math.max(1, Math.ceil(w / usableW));
    setMeasureMode('sheets');
    setSheetLength(Number(d.toFixed(2)));
    setSheetCount(neededSheets);
  };

  const computedTotalMeters =
    measureMode === 'sheets'
      ? Number((Math.max(0.1, sheetLength) * Math.max(1, sheetCount)).toFixed(2))
      : Number(Math.max(0.1, directMeters).toFixed(2));

  const computedAreaM2 = measureProduct
    ? Number((computedTotalMeters * (measureProduct.width_m || 0.85)).toFixed(2))
    : 0;

  const confirmMeasurementToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!measureProduct) return;

    const totalMeters = computedTotalMeters;
    const otherCartMeters = cart
      .filter(i => i.product.id === measureProduct.id && i.cartKey !== editingCartKey)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (totalMeters + otherCartMeters > measureProduct.stock + 0.001) {
      setMessage({
        type: 'error',
        text: `Stock insuficiente de ${measureProduct.name}. Disponible: ${formatMeter(measureProduct.stock - otherCartMeters)}.`,
      });
      return;
    }

    const summary =
      measureMode === 'sheets'
        ? `${sheetCount} pl × ${sheetLength.toFixed(2)} m = ${totalMeters.toFixed(2)} m (${computedAreaM2.toFixed(2)} m²)`
        : `Corte directo: ${totalMeters.toFixed(2)} m (${computedAreaM2.toFixed(2)} m²)`;

    const targetKey =
      measureMode === 'sheets'
        ? `${measureProduct.id}-L${sheetLength.toFixed(2)}`
        : `${measureProduct.id}-DIRECT`;

    const newItem: CartItem = {
      cartKey: targetKey,
      product: measureProduct,
      quantity: totalMeters,
      sheet_length_m: measureMode === 'sheets' ? sheetLength : undefined,
      sheet_count: measureMode === 'sheets' ? sheetCount : undefined,
      measurement_summary: summary,
    };

    setCart(prev => {
      if (editingCartKey) {
        return prev.map(item => (item.cartKey === editingCartKey ? newItem : item));
      }
      const existing = prev.find(i => i.cartKey === targetKey);
      if (existing) {
        const mergedMeters = Number((existing.quantity + totalMeters).toFixed(2));
        const mergedCount =
          existing.sheet_count && newItem.sheet_count
            ? existing.sheet_count + newItem.sheet_count
            : undefined;
        const mergedArea = Number((mergedMeters * (measureProduct.width_m || 0.85)).toFixed(2));
        const mergedSummary =
          mergedCount && newItem.sheet_length_m
            ? `${mergedCount} pl × ${newItem.sheet_length_m.toFixed(2)} m = ${mergedMeters.toFixed(2)} m (${mergedArea.toFixed(2)} m²)`
            : `Corte directo: ${mergedMeters.toFixed(2)} m (${mergedArea.toFixed(2)} m²)`;
        return prev.map(i =>
          i.cartKey === targetKey
            ? { ...i, quantity: mergedMeters, sheet_count: mergedCount, measurement_summary: mergedSummary }
            : i
        );
      }
      return [...prev, newItem];
    });

    setMeasureProduct(null);
    setEditingCartKey(null);
  };

  const adjustCartItemBySheet = (cartKey: string, deltaDirection: 1 | -1) => {
    setCart(prev =>
      prev.map(item => {
        if (item.cartKey !== cartKey) return item;
        const step = item.sheet_length_m || 1;
        const newQty = Number((item.quantity + deltaDirection * step).toFixed(2));
        if (newQty <= 0.05) return item;

        const otherMeters = prev
          .filter(i => i.product.id === item.product.id && i.cartKey !== cartKey)
          .reduce((s, i) => s + i.quantity, 0);

        if (newQty + otherMeters > item.product.stock + 0.001) {
          setMessage({
            type: 'error',
            text: `Stock insuficiente para ${item.product.name}. Disponible: ${formatMeter(item.product.stock - otherMeters)}.`,
          });
          return item;
        }

        const newCount = item.sheet_count ? Math.max(1, item.sheet_count + deltaDirection) : undefined;
        const area = Number((newQty * (item.product.width_m || 0.85)).toFixed(2));
        const summary =
          newCount && item.sheet_length_m
            ? `${newCount} pl × ${item.sheet_length_m.toFixed(2)} m = ${newQty.toFixed(2)} m (${area.toFixed(2)} m²)`
            : `Corte directo: ${newQty.toFixed(2)} m (${area.toFixed(2)} m²)`;

        return {
          ...item,
          quantity: newQty,
          sheet_count: newCount,
          measurement_summary: summary,
        };
      })
    );
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const subtotal = Number(cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0).toFixed(2));
  const totalCartMeters = Number(cart.reduce((acc, item) => acc + item.quantity, 0).toFixed(2));
  const totalCartArea = Number(
    cart.reduce((acc, item) => acc + item.quantity * (item.product.width_m || 0.85), 0).toFixed(2)
  );

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
            price: item.product.price,
            sheet_length_m: item.sheet_length_m,
            sheet_count: item.sheet_count,
            measurement_summary: item.measurement_summary,
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
          quantity: i.quantity,
          price: i.product.price,
          measurement_summary: i.measurement_summary,
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
          : 'Orden de corte y venta procesada exitosamente.',
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

  const handleSaveQuotation = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const validUntil = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const res = await apiFetch('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          items: cart.map(i => ({
            id: i.product.id,
            quantity: i.quantity,
            price: i.product.price,
            sheet_length_m: i.sheet_length_m,
            sheet_count: i.sheet_count,
            measurement_summary: i.measurement_summary,
          })),
          total,
          valid_until: validUntil,
          notes: `Proforma por medición (${totalCartMeters.toFixed(2)} m lineales / ${totalCartArea.toFixed(2)} m²)`,
        }),
      });

      const custName = selectedCustomer ? selectedCustomer.name : 'Cliente General';
      const custPhone = selectedCustomer?.phone || '';
      setWhatsappPhone(custPhone);
      setLastReceipt({
        id: res.id,
        type: 'PROFORMA',
        customerName: custName,
        phone: custPhone,
        items: cart.map(i => ({
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
          measurement_summary: i.measurement_summary,
        })),
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod: 'PROFORMA POR MEDICIÓN (VÁLIDA 7 DÍAS)',
      });

      setCart([]);
      fetchAllData();
      setMessage({ type: 'success', text: `Proforma #PRO-${res.id} guardada sin descontar stock.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadQuotationIntoCart = (q: Quotation) => {
    if (!q.details || q.details.length === 0) return;
    const loadedCart: CartItem[] = [];
    for (const d of q.details) {
      const prod = products.find(p => p.id === d.product_id);
      if (prod && prod.stock > 0) {
        const qty = Math.min(d.quantity, prod.stock);
        loadedCart.push({
          cartKey: `${prod.id}-${d.sheet_length_m ? `L${d.sheet_length_m.toFixed(2)}` : 'DIRECT'}`,
          product: prod,
          quantity: qty,
          sheet_length_m: d.sheet_length_m,
          sheet_count: d.sheet_count,
          measurement_summary:
            d.measurement_summary ||
            `${qty.toFixed(2)} m (${(qty * (prod.width_m || 0.85)).toFixed(2)} m²)`,
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
    const company = settings.company_name || 'AcerTecho Calaminas S.R.L.';
    const lines = [
      `*${company.toUpperCase()} - COMPROBANTE DE ${lastReceipt.type}*`,
      `Nro: #${lastReceipt.type === 'VENTA' ? 'VEN' : 'PRO'}-${String(lastReceipt.id).padStart(5, '0')}`,
      `Cliente: ${lastReceipt.customerName}`,
      `Fecha: ${new Date().toLocaleString()}`,
      `--------------------------------`,
      ...lastReceipt.items.map(
        i =>
          `• ${i.name}\n  ${i.measurement_summary ? i.measurement_summary : `${i.quantity} m`} — ${formatPrice(i.quantity * i.price)}`
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
      `¡Gracias por construir con nosotros!`,
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
            onClick={() => setShowQuotationsModal(true)}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <FileText className="w-4 h-4 text-brand" />
            Proformas ({quotations.filter(q => q.status === 'PENDING').length})
          </button>

          <button
            onClick={() => {
              if (cashSession) setClosingInput(String(cashSession.expected_amount));
              setShowCashModal(true);
            }}
            className={`px-4 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${
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
          {/* Search & Color/Category Filter Bar */}
          <div className="tech-card p-3.5 space-y-3">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand/50 group-focus-within:text-brand w-4 h-4 transition-colors" />
              <input
                type="text"
                placeholder="Buscar calamina por diseño, color, espesor o código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-brand text-slate-900 dark:text-white font-semibold text-xs placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Design / Category Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {['Todos', ...CALAMINA_CATEGORIES.slice(0, 6)].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      selectedCategory === cat
                        ? 'bg-brand text-white border-brand shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand/40'
                    }`}
                  >
                    {cat.replace('Calamina ', '')}
                  </button>
                ))}
              </div>

              {/* Color Swatch Filter */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedColor('Todos')}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                    selectedColor === 'Todos'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Todos los colores
                </button>
                {CALAMINA_COLOR_SWATCHES.map(sw => (
                  <button
                    key={sw.name}
                    type="button"
                    onClick={() => setSelectedColor(selectedColor === sw.name ? 'Todos' : sw.name)}
                    title={sw.name}
                    className={`w-6 h-6 rounded-full border-2 transition-transform flex items-center justify-center ${
                      selectedColor === sw.name
                        ? 'scale-110 border-brand ring-2 ring-brand/30'
                        : 'border-white dark:border-slate-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Visual Calamina Grid */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[400px] lg:min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => openMeasurementModal(product)}
                  disabled={product.stock <= 0}
                  className={`tech-grid-item group flex flex-col p-3.5 text-left transition-all relative rounded-xl border border-slate-200/80 dark:border-slate-800 ${
                    product.stock <= 0 ? 'opacity-50 grayscale' : 'hover:border-brand/50 active:scale-[0.99]'
                  }`}
                >
                  <div className="relative mb-3 w-full">
                    <CalaminaImage product={product} aspectClass="h-28 w-full" showColorDot />
                    <div className="absolute top-2 right-2 bg-slate-950/85 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums">
                      {formatMeter(product.stock)}
                    </div>
                    {product.is_combo ? (
                      <div className="absolute bottom-2 left-2 bg-amber-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Pack Techo
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    <span>{product.color_name || 'Galvanizado'}</span>
                    <span>·</span>
                    <span className="font-mono">{product.thickness || '0.35 mm'}</span>
                    <span>·</span>
                    <span className="font-mono">Ancho {product.width_m || 0.85}m</span>
                  </div>

                  <h4 className="font-display font-extrabold text-sm text-slate-900 dark:text-white mb-3 line-clamp-2 w-full group-hover:text-brand transition-colors tracking-tight leading-snug">
                    {product.name}
                  </h4>

                  <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between w-full">
                    <div>
                      <p className="text-lg font-display font-black text-slate-900 dark:text-white tabular-nums group-hover:text-brand transition-colors tracking-tight leading-none">
                        {formatPrice(product.price)}
                        <span className="text-[11px] font-bold text-slate-400 ml-1">/ m</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand rounded-md text-[10px] font-black uppercase tracking-wider group-hover:bg-brand group-hover:text-white transition-colors">
                      <Ruler className="w-3 h-3" />
                      Medir
                    </span>
                  </div>

                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-xl">
                      <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded tracking-wider shadow-lg">
                        Sin Metraje
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-full lg:w-[450px] tech-card flex flex-col relative overflow-hidden h-auto lg:h-full shrink-0">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand text-white rounded-lg flex items-center justify-center shadow-md shadow-brand/20">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-slate-900 dark:text-white tracking-tight uppercase text-base">
                  Orden de Corte & Venta
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider tabular-nums">
                  {cart.length} líneas · {totalCartMeters.toFixed(2)} m · {totalCartArea.toFixed(2)} m²
                  {activeQuotationId ? ` · Proforma #${activeQuotationId}` : ''}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleSaveQuotation}
                disabled={loading}
                className="px-3 py-2 bg-slate-200/80 dark:bg-slate-800 hover:bg-brand hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                title="Guardar como Proforma sin descontar stock"
              >
                <FileText className="w-3.5 h-3.5" />
                Proforma
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
                Cliente / Obra Constructora
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
                  <Ruler className="w-9 h-9 opacity-25 text-brand" />
                  <div className="text-center space-y-1 px-4">
                    <p className="text-[11px] font-black uppercase tracking-widest">Sin Cortes Cargados</p>
                    <p className="text-[10px] font-medium text-slate-400">
                      Selecciona una calamina de la izquierda para ingresar largo y cantidad de planchas
                    </p>
                  </div>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.cartKey}
                    className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800 transition-all hover:border-brand/40"
                  >
                    <CalaminaImage product={item.product} aspectClass="w-12 h-12 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] font-mono font-bold text-brand mt-0.5">
                        {item.measurement_summary || `${item.quantity} m`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                          {item.quantity.toFixed(2)} m × {formatPrice(item.product.price)}
                        </span>
                        <span className="text-xs text-slate-900 dark:text-white font-black tabular-nums">
                          = {formatPrice(item.quantity * item.product.price)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustCartItemBySheet(item.cartKey, -1)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-brand"
                          title="Restar 1 plancha / 1 m"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => adjustCartItemBySheet(item.cartKey, 1)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-brand"
                          title="Sumar 1 plancha / 1 m"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openMeasurementModal(item.product, item)}
                          className="p-1 text-slate-400 hover:text-brand"
                          title="Editar medida"
                        >
                          <Ruler className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.cartKey)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                          title="Quitar"
                        >
                          <Trash2 className="w-3 h-3" />
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Metraje / Superficie Cubierta
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {totalCartMeters.toFixed(2)} m · {totalCartArea.toFixed(2)} m²
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subtotal</span>
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

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
              className="w-full py-3.5 bg-brand hover:bg-brand/90 text-white rounded-lg font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-brand/20 transition-all border-b-4 border-brand-muted flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
              {loading ? 'Procesando...' : 'Confirmar Orden y Facturar'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal 0: Calculadora de Medición y Corte de Calamina */}
      {measureProduct && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[105] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between corrugated-strip">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold uppercase tracking-tight text-base">
                    Calculadora de Medición y Corte
                  </h3>
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest">
                    {measureProduct.design_type || measureProduct.category} · {measureProduct.color_name || 'Estándar'} · {measureProduct.thickness || '0.35 mm'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMeasureProduct(null)}
                className="p-1.5 hover:bg-white/10 rounded-full text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmMeasurementToCart} className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
              {/* Product Quick Banner */}
              <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <CalaminaImage product={measureProduct} aspectClass="w-20 h-16 shrink-0" showColorDot />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {measureProduct.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Ancho útil: {measureProduct.width_m || 0.85} m · Disponible: {formatMeter(measureProduct.stock)}
                  </p>
                  <p className="text-sm font-black text-brand tabular-nums mt-0.5">
                    {formatPrice(measureProduct.price)} / metro lineal
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMeasureMode('sheets')}
                    className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                      measureMode === 'sheets'
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Por Planchas × Largo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeasureMode('direct')}
                    className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                      measureMode === 'direct'
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Metros Lineales Directos
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAreaHelper(!showAreaHelper)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand/10 text-brand rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Calcular Techo (m²)
                </button>
              </div>

              {/* Optional Roof Coverage Calculator */}
              {showAreaHelper && (
                <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-500/30 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Asistente por Dimensiones del Techo
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Ancho a cubrir (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={roofWidth}
                        onChange={e => setRoofWidth(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Largo caída / agua (m)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={roofDropLength}
                        onChange={e => setRoofDropLength(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={applyRoofAreaCalculation}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                  >
                    Aplicar Planchas Sugeridas (Ancho útil {measureProduct.width_m || 0.85} m)
                  </button>
                </div>
              )}

              {measureMode === 'sheets' ? (
                <div className="space-y-4">
                  {/* Standard Length Presets */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Largo por Plancha (metros)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {STANDARD_CUT_LENGTHS.map(len => (
                        <button
                          key={len}
                          type="button"
                          onClick={() => setSheetLength(len)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                            Math.abs(sheetLength - len) < 0.01
                              ? 'bg-brand text-white border-brand shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand/50'
                          }`}
                        >
                          {len.toFixed(1)} m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Largo Exacto (m)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.5"
                        required
                        value={sheetLength}
                        onChange={e => setSheetLength(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-black text-lg text-center text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                        Cantidad de Planchas
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSheetCount(Math.max(1, sheetCount - 1))}
                          className="w-11 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          required
                          value={sheetCount}
                          onChange={e => setSheetCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 w-full px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-black text-lg text-center text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setSheetCount(sheetCount + 1)}
                          className="w-11 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl font-black text-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Metros Lineales Totales a Cortar (m)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    required
                    value={directMeters}
                    onChange={e => setDirectMeters(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-black text-2xl text-center text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Live Calculation Summary */}
              <div className="p-4 bg-slate-900 text-white rounded-xl grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Total Metros</p>
                  <p className="text-lg font-mono font-black tabular-nums">{computedTotalMeters.toFixed(2)} m</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Área Cubierta</p>
                  <p className="text-lg font-mono font-black text-sky-400 tabular-nums">
                    {computedAreaM2.toFixed(2)} m²
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400">Importe Corte</p>
                  <p className="text-lg font-mono font-black text-amber-400 tabular-nums">
                    {formatPrice(computedTotalMeters * measureProduct.price)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMeasureProduct(null)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand hover:bg-brand/90 text-white font-display font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {editingCartKey ? 'Actualizar Medida' : 'Agregar al Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        placeholder="Motivo (ej. Flete, Estibaje, Cambio)"
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
                    Cotizaciones y Proformas de Obra
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Convierta cualquier proforma por medición en orden de venta
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
                        Vence: {q.valid_until} · {q.details?.length || 0} cortes · {q.notes || q.seller_name}
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
                    {lastReceipt.type === 'VENTA' ? 'Comprobante de Corte y Venta' : 'Proforma Generada'}
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
                  {isUploadingQr && (
                    <p className="mt-4 text-[9px] text-brand font-black uppercase tracking-[0.2em]">Guardando...</p>
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
