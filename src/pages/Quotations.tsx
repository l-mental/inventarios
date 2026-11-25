import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Customer, Product, Quotation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import {
  MONTANO_DEFAULTS,
  QuotationPdfPayload,
  downloadQuotationPdf,
  numeroALetrasBolivianos,
  openQuotationPdfInNewTab,
  preloadQuotationAssets,
  shareQuotationPdfViaWhatsApp,
} from '../lib/quotationPdf';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  Download,
  ExternalLink,
  FileText,
  History,
  MessageCircle,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';

interface QuoteItem {
  key: string;
  productId: number;
  code: string;
  description: string;
  basePrice: number; // Original catalog price
  unitPrice: number; // Computed or manually edited unit price in Bs
  quantity: number;
  manualPrice: boolean;
}

type CurrencyMode = 'BS_DIRECT' | 'USD_TO_BS' | 'BS_SCALED';

const BASE_REFERENCE_TC = 6.96;

function computeUnitPrice(basePrice: number, tc: number, mode: CurrencyMode): number {
  const safeTc = tc > 0 ? tc : BASE_REFERENCE_TC;
  if (mode === 'USD_TO_BS') {
    return Number((basePrice * safeTc).toFixed(2));
  }
  if (mode === 'BS_SCALED') {
    return Number((basePrice * (safeTc / BASE_REFERENCE_TC)).toFixed(2));
  }
  return Number(basePrice.toFixed(2));
}

function formatDateLatam(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function Quotations() {
  const { user } = useAuth();
  const { settings, updateSetting } = useSettings();
  const { apiFetch } = useApi();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<'builder' | 'history'>('builder');
  const [step, setStep] = useState<'exchange_rate' | 'editor'>('exchange_rate');

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingRate, setSavingRate] = useState(false);

  // Step 1: Exchange Rate state BEFORE creating a quotation
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(
    settings.exchange_rate || '6.96'
  );
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('BS_DIRECT');

  const exchangeRate = useMemo(() => {
    const parsed = parseFloat(exchangeRateInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : BASE_REFERENCE_TC;
  }, [exchangeRateInput]);

  // Step 2: Quotation Editor state
  const [quoteNumber, setQuoteNumber] = useState<string>('11001');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerCode, setCustomerCode] = useState<string>('S/N');
  const [customerNit, setCustomerNit] = useState<string>('S/N');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('SANTA CRUZ / BOLIVIA');
  const [customerEmail, setCustomerEmail] = useState<string>('S/N');
  const [sellerName, setSellerName] = useState<string>(user?.full_name || 'Vendedor');

  const [tractorModel, setTractorModel] = useState<string>('REPUESTOS');
  const [saleCondition, setSaleCondition] = useState<string>('Stock');
  const [validityDays, setValidityDays] = useState<number>(7);
  const [validityLabel, setValidityLabel] = useState<string>('7 días');
  const [observations, setObservations] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [paidInput, setPaidInput] = useState<string>('0');

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todos');
  const [historySearch, setHistorySearch] = useState('');

  // WhatsApp & Status feedback
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [savedQuotationInfo, setSavedQuotationInfo] = useState<{
    id: number;
    quoteNumber: string;
    payload: QuotationPdfPayload;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLiveSheetMobile, setShowLiveSheetMobile] = useState(false);

  const fetchData = async () => {
    try {
      const [prods, custs, sysSettings, quots] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/customers'),
        apiFetch('/api/settings'),
        apiFetch('/api/quotations'),
      ]);
      setProducts(prods);
      setCustomers(custs);
      setQuotations(quots);

      if (sysSettings?.exchange_rate) {
        setExchangeRateInput(String(sysSettings.exchange_rate));
      }
      if (sysSettings?.company_name) updateSetting('company_name', sysSettings.company_name);
      if (sysSettings?.address) updateSetting('address', sysSettings.address);
      if (sysSettings?.phone) updateSetting('phone', sysSettings.phone);
      if (sysSettings?.company_website) updateSetting('company_website', sysSettings.company_website);

      const maxNum = (quots as Quotation[]).reduce((max, q) => {
        const numeric = parseInt(String(q.quote_number || q.id || '0'), 10);
        return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
      }, 11000);
      setQuoteNumber(String(maxNum + 1));
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') {
        setFeedback({ type: 'error', text: err.message });
      }
    }
  };

  useEffect(() => {
    preloadQuotationAssets();
    fetchData();
  }, []);

  // Pre-load cart items if coming from POS
  useEffect(() => {
    const state = location.state as {
      fromPosCart?: { product: Product; quantity: number }[];
      customerId?: number | null;
    } | null;

    if (state?.fromPosCart && state.fromPosCart.length > 0) {
      const mapped: QuoteItem[] = state.fromPosCart.map((ci, idx) => ({
        key: `${ci.product.id}-${idx}`,
        productId: ci.product.id,
        code: ci.product.barcode || String(ci.product.id).padStart(4, '0'),
        description: ci.product.name,
        basePrice: Number(ci.product.price),
        unitPrice: computeUnitPrice(Number(ci.product.price), exchangeRate, currencyMode),
        quantity: ci.quantity,
        manualPrice: false,
      }));
      setItems(mapped);
      if (state.customerId) {
        setSelectedCustomerId(state.customerId);
      }
      // Show Step 1 (Exchange Rate) first before finalizing quote so user always sees/sets TC before quoting!
      setStep('exchange_rate');
    }
  }, [location.state]);

  // Sync customer fields when selecting from dropdown
  useEffect(() => {
    if (!selectedCustomerId) return;
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (cust) {
      setCustomerName(cust.name || '');
      setCustomerCode(String(cust.id).padStart(3, '0'));
      setCustomerPhone(cust.phone || '');
      setCustomerAddress(cust.address || 'SANTA CRUZ / BOLIVIA');
      setCustomerEmail(cust.email || 'S/N');
      setWhatsappPhone(cust.phone || '');
    }
  }, [selectedCustomerId, customers]);

  // Recalculate non-manual item prices whenever exchangeRate or currencyMode changes
  useEffect(() => {
    setItems(prev =>
      prev.map(it =>
        it.manualPrice
          ? it
          : {
              ...it,
              unitPrice: computeUnitPrice(it.basePrice, exchangeRate, currencyMode),
            }
      )
    );
  }, [exchangeRate, currencyMode]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const handleSaveDefaultExchangeRate = async () => {
    setSavingRate(true);
    try {
      const val = exchangeRate.toFixed(2);
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'exchange_rate', value: val }),
      });
      updateSetting('exchange_rate', val);
      setExchangeRateInput(val);
      setFeedback({ type: 'success', text: `Tipo de cambio predeterminado guardado: 1 USD = ${val} Bs` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSavingRate(false);
    }
  };

  const handleConfirmRateAndContinue = async () => {
    const val = exchangeRate.toFixed(2);
    updateSetting('exchange_rate', val);
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'exchange_rate', value: val }),
      });
    } catch {
      // ignore if offline
    }
    setStep('editor');
  };

  const brands = useMemo(() => {
    const set = new Set(products.map(p => p.brand || 'GENERAL'));
    return ['Todos', ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter(p => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.oem_codes && p.oem_codes.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q);
      const matchBrand = selectedBrand === 'Todos' || (p.brand || 'GENERAL') === selectedBrand;
      return matchSearch && matchBrand;
    });
  }, [products, productSearch, selectedBrand]);

  const addProduct = (product: Product) => {
    setSavedQuotationInfo(null);
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id && !i.manualPrice);
      if (existing) {
        return prev.map(i =>
          i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          key: `${product.id}-${Date.now()}`,
          productId: product.id,
          code: product.barcode || String(product.id).padStart(4, '0'),
          description: product.name,
          basePrice: Number(product.price),
          unitPrice: computeUnitPrice(Number(product.price), exchangeRate, currencyMode),
          quantity: 1,
          manualPrice: false,
        },
      ];
    });
  };

  const updateItemQty = (key: string, qty: number) => {
    setSavedQuotationInfo(null);
    const safeQty = Math.max(0.01, Number.isFinite(qty) ? qty : 1);
    setItems(prev => prev.map(i => (i.key === key ? { ...i, quantity: safeQty } : i)));
  };

  const updateItemPrice = (key: string, price: number) => {
    setSavedQuotationInfo(null);
    const safePrice = Math.max(0, Number.isFinite(price) ? price : 0);
    setItems(prev =>
      prev.map(i => (i.key === key ? { ...i, unitPrice: safePrice, manualPrice: true } : i))
    );
  };

  const removeItem = (key: string) => {
    setSavedQuotationInfo(null);
    setItems(prev => prev.filter(i => i.key !== key));
  };

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [items]
  );
  const discount = Math.max(0, Math.min(subtotal, parseFloat(discountInput) || 0));
  const total = Math.max(0, Number((subtotal - discount).toFixed(2)));
  const paidAmount = Math.max(0, Math.min(total, parseFloat(paidInput) || 0));
  const balanceAmount = Math.max(0, Number((total - paidAmount).toFixed(2)));

  const currentPdfPayload: QuotationPdfPayload = useMemo(
    () => ({
      quoteNumber: quoteNumber || '11001',
      dateFormatted: formatDateLatam(new Date()),
      customerName: customerName.trim() || 'CLIENTE GENERAL',
      customerCode: customerCode.trim() || 'S/N',
      customerNit: customerNit.trim() || 'S/N',
      customerPhone: customerPhone.trim() || whatsappPhone.trim() || 'S/N',
      customerAddress: customerAddress.trim() || 'SANTA CRUZ / BOLIVIA',
      customerEmail: customerEmail.trim() || 'S/N',
      sellerName: sellerName.trim() || user?.full_name || 'Vendedor',
      items: items.map(i => ({
        code: i.code,
        quantity: i.quantity,
        description: i.description,
        unitPrice: i.unitPrice,
        subtotal: Number((i.quantity * i.unitPrice).toFixed(2)),
      })),
      observations: observations.trim(),
      exchangeRate,
      currencyMode,
      tractorModel: tractorModel.trim() || 'REPUESTOS',
      saleCondition: saleCondition.trim() || 'Stock',
      validityLabel: validityLabel.trim() || `${validityDays} días`,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      total,
      paidAmount: Number(paidAmount.toFixed(2)),
      balanceAmount,
      companyName: MONTANO_DEFAULTS.companyName,
      companyAddress: MONTANO_DEFAULTS.address,
      companyPhone: MONTANO_DEFAULTS.phone,
      companyWebsite: MONTANO_DEFAULTS.website,
    }),
    [
      quoteNumber,
      customerName,
      customerCode,
      customerNit,
      customerPhone,
      whatsappPhone,
      customerAddress,
      customerEmail,
      sellerName,
      user,
      items,
      observations,
      exchangeRate,
      currencyMode,
      tractorModel,
      saleCondition,
      validityLabel,
      validityDays,
      subtotal,
      discount,
      total,
      paidAmount,
      balanceAmount,
      settings,
    ]
  );

  const buildPayloadFromSavedQuotation = (q: Quotation): QuotationPdfPayload => {
    const qTotal = Number(q.total || 0);
    const qDiscount = Number(q.discount_amount || 0);
    const qSub = Number(q.subtotal ?? qTotal + qDiscount);
    const qPaid = Number(q.paid_amount || 0);
    const qBal = Math.max(0, Number((qTotal - qPaid).toFixed(2)));
    const qDate = q.created_at ? formatDateLatam(new Date(q.created_at)) : formatDateLatam(new Date());

    return {
      quoteNumber: q.quote_number || String(11000 + q.id),
      dateFormatted: qDate,
      customerName: q.customer_name || 'CLIENTE GENERAL',
      customerCode: q.customer_code || (q.customer_id ? String(q.customer_id).padStart(3, '0') : 'S/N'),
      customerNit: q.customer_nit || 'S/N',
      customerPhone: q.customer_phone || 'S/N',
      customerAddress: q.customer_city || 'SANTA CRUZ / BOLIVIA',
      customerEmail: q.customer_email || 'S/N',
      sellerName: q.seller_name || 'Vendedor',
      items: (q.details || []).map(d => ({
        code: d.product_code || String(d.product_id),
        quantity: Number(d.quantity || 1),
        description: d.product_name || 'REPUESTO',
        unitPrice: Number(d.unit_price || 0),
        subtotal: Number(d.subtotal || 0),
      })),
      observations: q.observations || q.notes || '',
      exchangeRate: Number(q.exchange_rate || exchangeRate || 6.96),
      currencyMode: q.currency_mode || 'BS_DIRECT',
      tractorModel: q.tractor_model || 'REPUESTOS',
      saleCondition: q.sale_condition || 'Stock',
      validityLabel: q.validity_label || '7 días',
      subtotal: qSub,
      discount: qDiscount,
      total: qTotal,
      paidAmount: qPaid,
      balanceAmount: qBal,
      companyName: MONTANO_DEFAULTS.companyName,
      companyAddress: MONTANO_DEFAULTS.address,
      companyPhone: MONTANO_DEFAULTS.phone,
      companyWebsite: MONTANO_DEFAULTS.website,
    };
  };

  const handleSaveAndGeneratePdf = async () => {
    if (items.length === 0) {
      setFeedback({ type: 'error', text: 'Agrega al menos un repuesto a la cotización antes de generar el PDF.' });
      return;
    }
    setLoading(true);
    try {
      const validUntil = new Date(Date.now() + Math.max(1, validityDays) * 86400000)
        .toISOString()
        .split('T')[0];

      const res = await apiFetch('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          customer_name: currentPdfPayload.customerName,
          customer_code: currentPdfPayload.customerCode,
          customer_nit: currentPdfPayload.customerNit,
          customer_phone: currentPdfPayload.customerPhone,
          customer_city: currentPdfPayload.customerAddress,
          customer_email: currentPdfPayload.customerEmail,
          quote_number: currentPdfPayload.quoteNumber,
          exchange_rate: exchangeRate,
          currency_mode: currencyMode,
          tractor_model: currentPdfPayload.tractorModel,
          sale_condition: currentPdfPayload.saleCondition,
          validity_label: currentPdfPayload.validityLabel,
          observations: currentPdfPayload.observations,
          subtotal: currentPdfPayload.subtotal,
          discount_amount: currentPdfPayload.discount,
          paid_amount: currentPdfPayload.paidAmount,
          total: currentPdfPayload.total,
          valid_until: validUntil,
          notes: currentPdfPayload.observations || `Cotización N° ${currentPdfPayload.quoteNumber}`,
          items: items.map(i => ({
            id: i.productId,
            code: i.code,
            name: i.description,
            quantity: i.quantity,
            price: i.unitPrice,
            measurement_summary: `${i.quantity} UND`,
          })),
        }),
      });

      const finalNumber = res.quote_number || currentPdfPayload.quoteNumber;
      const finalPayload: QuotationPdfPayload = {
        ...currentPdfPayload,
        quoteNumber: finalNumber,
      };

      await downloadQuotationPdf(finalPayload);
      setSavedQuotationInfo({
        id: res.id,
        quoteNumber: finalNumber,
        payload: finalPayload,
      });

      setFeedback({
        type: 'success',
        text: `Cotización N° ${finalNumber} guardada y PDF descargado correctamente.`,
      });
      await fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPdfWhatsApp = async (payload: QuotationPdfPayload, phoneOverride?: string) => {
    const phone = (phoneOverride ?? whatsappPhone ?? payload.customerPhone ?? '').trim();
    const res = await shareQuotationPdfViaWhatsApp(payload, phone);
    if (res.mode === 'native_share') {
      setFeedback({
        type: 'success',
        text: `Compartiendo ${res.filename} directamente por WhatsApp / Compartir.`,
      });
    } else {
      setFeedback({
        type: 'success',
        text: `PDF "${res.filename}" descargado y WhatsApp abierto. Adjunta el archivo PDF en el chat.`,
      });
    }
  };

  const handleLoadIntoEditor = (q: Quotation) => {
    setExchangeRateInput(String(q.exchange_rate || settings.exchange_rate || '6.96'));
    setCurrencyMode(q.currency_mode || 'BS_DIRECT');
    setSelectedCustomerId(q.customer_id || null);
    setCustomerName(q.customer_name || '');
    setCustomerCode(q.customer_code || (q.customer_id ? String(q.customer_id).padStart(3, '0') : 'S/N'));
    setCustomerNit(q.customer_nit || 'S/N');
    setCustomerPhone(q.customer_phone || '');
    setWhatsappPhone(q.customer_phone || '');
    setCustomerAddress(q.customer_city || 'SANTA CRUZ / BOLIVIA');
    setCustomerEmail(q.customer_email || 'S/N');
    setTractorModel(q.tractor_model || 'REPUESTOS');
    setSaleCondition(q.sale_condition || 'Stock');
    setValidityLabel(q.validity_label || '7 días');
    setObservations(q.observations || q.notes || '');
    setDiscountInput(String(q.discount_amount || 0));
    setPaidInput(String(q.paid_amount || 0));

    const loadedItems: QuoteItem[] = (q.details || []).map((d, i) => ({
      key: `${d.product_id}-${i}-${Date.now()}`,
      productId: d.product_id,
      code: d.product_code || String(d.product_id),
      description: d.product_name,
      basePrice: Number(d.unit_price),
      unitPrice: Number(d.unit_price),
      quantity: Number(d.quantity),
      manualPrice: true,
    }));
    setItems(loadedItems);
    setSavedQuotationInfo(null);
    setActiveView('builder');
    setStep('exchange_rate');
  };

  const handleNewBlankQuotation = () => {
    setSavedQuotationInfo(null);
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerCode('S/N');
    setCustomerNit('S/N');
    setCustomerPhone('');
    setWhatsappPhone('');
    setCustomerAddress('SANTA CRUZ / BOLIVIA');
    setCustomerEmail('S/N');
    setTractorModel('REPUESTOS');
    setSaleCondition('Stock');
    setValidityDays(7);
    setValidityLabel('7 días');
    setObservations('');
    setDiscountInput('0');
    setPaidInput('0');
    setItems([]);
    setActiveView('builder');
    setStep('exchange_rate');
  };

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return quotations.filter(item => {
      if (!q) return true;
      return (
        String(item.quote_number || item.id).toLowerCase().includes(q) ||
        (item.customer_name || '').toLowerCase().includes(q) ||
        (item.tractor_model || '').toLowerCase().includes(q) ||
        (item.observations || item.notes || '').toLowerCase().includes(q)
      );
    });
  }, [quotations, historySearch]);

  const previewRows = useMemo(() => {
    const padded = [...items];
    while (padded.length < 5) {
      padded.push({
        key: `empty-${padded.length}`,
        productId: 0,
        code: '',
        description: '',
        basePrice: 0,
        unitPrice: 0,
        quantity: 0,
        manualPrice: false,
      });
    }
    return padded;
  }, [items]);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Window Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Ventana de Cotizaciones PDF
              </h1>
              <span className="px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider tabular-nums">
                T.C. 1 USD = {exchangeRate.toFixed(2)} Bs
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Configura el tipo de cambio, genera cotizaciones en PDF oficial y envíalas directo por WhatsApp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ir al POS
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('builder');
            }}
            className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeView === 'builder'
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            Nueva Cotización
          </button>

          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeView === 'history'
                ? 'bg-brand text-white shadow-md shadow-brand/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            Guardadas ({quotations.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeView === 'history' ? (
        /* SAVED QUOTATIONS HISTORY TABLE */
        <div className="tech-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-display font-black uppercase text-slate-900 dark:text-white">
                Historial de Cotizaciones Emitidas
              </h2>
              <p className="text-xs text-slate-500">
                Descarga el PDF oficial, compártelo por WhatsApp o cárgalo al mostrador POS para facturar.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar N°, cliente, tractor..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="tech-input pl-9 py-2 text-xs"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-black uppercase tracking-widest">No hay cotizaciones registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(q => {
                const qPayload = buildPayloadFromSavedQuotation(q);
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-slate-900 dark:bg-slate-700 text-white font-mono font-black text-xs">
                          N° {qPayload.quoteNumber}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {qPayload.customerName}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            q.status === 'CONVERTED'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {q.status === 'CONVERTED' ? 'Facturada' : 'Pendiente'}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          T.C. {qPayload.exchangeRate.toFixed(2)} Bs
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Fecha: {qPayload.dateFormatted} · Tractor: {qPayload.tractorModel} · Condición: {qPayload.saleCondition} · {qPayload.items.length} ítems
                      </p>
                      {qPayload.observations && (
                        <p className="text-[11px] text-slate-400 italic">Obs: {qPayload.observations}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="mr-3 text-right">
                        <p className="text-[9px] font-black uppercase text-slate-400">Total Cotizado</p>
                        <p className="text-lg font-display font-black text-slate-900 dark:text-white tabular-nums">
                          Bs {qPayload.total.toFixed(2)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => openQuotationPdfInNewTab(qPayload)}
                        className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadQuotationPdf(qPayload)}
                        className="px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendPdfWhatsApp(qPayload, q.customer_phone)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadIntoEditor(q)}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-[10px] font-black uppercase tracking-wider"
                      >
                        Editar / Clonar
                      </button>

                      {q.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => navigate('/pos', { state: { loadQuotation: q } })}
                          className="px-3 py-2 bg-brand text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Facturar en POS
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : step === 'exchange_rate' ? (
        /* STEP 1: MANDATORY EXCHANGE RATE CONFIGURATION BEFORE QUOTING */
        <div className="max-w-3xl mx-auto">
          <div className="tech-card p-6 sm:p-8 space-y-6 border-2 border-brand/25">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                    Paso 1 · Antes de Cotizar
                  </span>
                  <h2 className="text-xl sm:text-2xl font-display font-black uppercase text-slate-900 dark:text-white">
                    Tipo de Cambio para la Cotización
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Verifica o modifica el tipo de cambio vigente antes de armar tu cotización. Este valor se aplicará a los precios y aparecerá reflejado en el PDF.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Tipo de Cambio (1 USD en Bs)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Base ref: 6.96</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-3 rounded-lg bg-slate-900 dark:bg-slate-950 text-white font-mono font-black text-sm">
                    1 USD =
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={exchangeRateInput}
                    onChange={e => setExchangeRateInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg bg-white dark:bg-slate-900 border-2 border-brand/40 focus:border-brand outline-none font-mono font-black text-2xl text-slate-900 dark:text-white text-right tabular-nums"
                  />
                  <div className="px-3.5 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-mono font-black text-sm">
                    Bs
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['6.96', '7.00', '7.50', '8.50', '9.50', '10.50'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setExchangeRateInput(preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black border transition-all ${
                        Number(exchangeRateInput).toFixed(2) === preset
                          ? 'bg-brand text-white border-brand shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand/50'
                      }`}
                    >
                      {preset} Bs
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSaveDefaultExchangeRate}
                  disabled={savingRate}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingRate ? 'Guardando...' : 'Guardar como T.C. Predeterminado del Sistema'}
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  ¿Cómo aplicar este Tipo de Cambio a los repuestos?
                </label>

                <button
                  type="button"
                  onClick={() => setCurrencyMode('BS_DIRECT')}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                    currencyMode === 'BS_DIRECT'
                      ? 'border-brand bg-brand/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    1. Catálogo ya en Bolivianos (mostrar T.C. en PDF)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Usa el precio exacto del catálogo en Bs y registra T.C. {exchangeRate.toFixed(2)} Bs en el PDF.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrencyMode('BS_SCALED')}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                    currencyMode === 'BS_SCALED'
                      ? 'border-brand bg-brand/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    2. Ajustar precios proporcionalmente (vs base 6.96)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Escala automáticamente los precios según la variación respecto a 6.96 (×{(exchangeRate / BASE_REFERENCE_TC).toFixed(3)}).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrencyMode('USD_TO_BS')}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                    currencyMode === 'USD_TO_BS'
                      ? 'border-brand bg-brand/5'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    3. Multiplicar precio de lista (USD) × {exchangeRate.toFixed(2)} Bs
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Convierte cada precio multiplicándolo directo por {exchangeRate.toFixed(2)} para mostrarlo en Bs.
                  </p>
                </button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 text-xs font-bold text-amber-800 dark:text-amber-300">
                Tienes {items.length} repuesto(s) precargados desde el POS. Al continuar se calcularán con T.C. {exchangeRate.toFixed(2)} Bs.
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveView('history')}
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Ver Cotizaciones Guardadas
              </button>

              <button
                type="button"
                onClick={handleConfirmRateAndContinue}
                className="px-6 py-3.5 bg-brand hover:bg-brand/90 text-white rounded-xl font-black uppercase tracking-[0.15em] text-xs shadow-lg shadow-brand/25 flex items-center gap-2.5 border-b-4 border-brand-muted active:scale-95 transition-all"
              >
                <span>Confirmar T.C. ({exchangeRate.toFixed(2)} Bs) y Realizar Cotización</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 2: FULL DEDICATED QUOTATION BUILDER + EXACT PDF PREVIEW */
        <div className="space-y-5">
          {/* Active Exchange Rate Banner (Editable anytime during quoting) */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-md">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Tipo de Cambio Activo para esta Cotización
                  </p>
                  <p className="text-sm font-black font-mono text-amber-300">
                    1 USD = {exchangeRate.toFixed(2)} Bs ·{' '}
                    <span className="text-slate-300 font-sans text-xs font-bold">
                      {currencyMode === 'USD_TO_BS'
                        ? 'Multiplicando lista × T.C.'
                        : currencyMode === 'BS_SCALED'
                          ? `Ajuste proporcional vs ${BASE_REFERENCE_TC}`
                          : 'Precios directos en Bs'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-[10px] font-black uppercase text-slate-400">Cambiar T.C.:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={exchangeRateInput}
                  onChange={e => setExchangeRateInput(e.target.value)}
                  className="w-20 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-right font-mono font-black text-xs text-white"
                />
                <select
                  value={currencyMode}
                  onChange={e => setCurrencyMode(e.target.value as CurrencyMode)}
                  className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-[10px] font-bold text-slate-200"
                >
                  <option value="BS_DIRECT">Directo Bs</option>
                  <option value="BS_SCALED">Escala T.C.</option>
                  <option value="USD_TO_BS">USD × T.C.</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('exchange_rate')}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-200 border border-slate-700"
              >
                Pantalla T.C.
              </button>
              <button
                type="button"
                onClick={handleNewBlankQuotation}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-200 border border-slate-700"
              >
                Limpiar / Nueva
              </button>
              <button
                type="button"
                onClick={() => setShowLiveSheetMobile(!showLiveSheetMobile)}
                className="xl:hidden px-3 py-2 rounded-lg bg-brand text-white text-[10px] font-black uppercase tracking-wider"
              >
                {showLiveSheetMobile ? 'Ver Editor' : 'Ver Vista PDF'}
              </button>
            </div>
          </div>

          {/* Saved Confirmation + Direct PDF & WhatsApp Bar */}
          {savedQuotationInfo && (
            <div className="bg-emerald-600 text-white rounded-xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <h3 className="font-display font-black uppercase text-base">
                    Cotización N° {savedQuotationInfo.quoteNumber} Generada en PDF
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Total: Bs {savedQuotationInfo.payload.total.toFixed(2)} · T.C. {savedQuotationInfo.payload.exchangeRate.toFixed(2)} Bs · El archivo PDF con formato oficial está listo para descargar o enviar por WhatsApp.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="text"
                  placeholder="Celular WhatsApp (ej. 67200573)"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white text-slate-900 font-mono font-bold text-xs w-48"
                />
                <button
                  type="button"
                  onClick={() => handleSendPdfWhatsApp(savedQuotationInfo.payload)}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Enviar PDF por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => downloadQuotationPdf(savedQuotationInfo.payload)}
                  className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => openQuotationPdfInNewTab(savedQuotationInfo.payload)}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Abrir / Imprimir PDF
                </button>
              </div>
            </div>
          )}

          {/* Main 2-Column Workspace: Builder Left + Formatted PDF Sheet Preview Right */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT: Client, Quote Metadata, Parts Picker, Items Table */}
            <div className={`xl:col-span-6 space-y-5 ${showLiveSheetMobile ? 'hidden xl:block' : 'block'}`}>
              {/* Customer & Quote Fields Card */}
              <div className="tech-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-brand" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                      Datos del Cliente y Condiciones
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">N° Cotización:</span>
                    <input
                      type="text"
                      value={quoteNumber}
                      onChange={e => setQuoteNumber(e.target.value)}
                      className="w-24 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-black text-xs text-slate-900 dark:text-white text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Seleccionar Cliente Registrado (opcional)
                  </label>
                  <select
                    value={selectedCustomerId || ''}
                    onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                    className="tech-input py-2 text-xs font-bold uppercase"
                  >
                    <option value="">-- Escribir Cliente Manualmente --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} · Tel: {c.phone || 'S/N'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cliente / Razón Social</label>
                    <input
                      type="text"
                      placeholder="Nombre completo o taller"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="tech-input py-2 text-xs uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cód. Cliente</label>
                      <input
                        type="text"
                        value={customerCode}
                        onChange={e => setCustomerCode(e.target.value)}
                        className="tech-input py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">NIT / C.I.</label>
                      <input
                        type="text"
                        value={customerNit}
                        onChange={e => setCustomerNit(e.target.value)}
                        className="tech-input py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cel - Tel / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ej. +591 67200573"
                      value={customerPhone}
                      onChange={e => {
                        setCustomerPhone(e.target.value);
                        setWhatsappPhone(e.target.value);
                      }}
                      className="tech-input py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Dirección / Ciudad</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="tech-input py-2 text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Correo</label>
                    <input
                      type="text"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="tech-input py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Vendedor</label>
                    <input
                      type="text"
                      value={sellerName}
                      onChange={e => setSellerName(e.target.value)}
                      className="tech-input py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Modelo del Tractor</label>
                    <input
                      type="text"
                      value={tractorModel}
                      onChange={e => setTractorModel(e.target.value)}
                      placeholder="Ej. REPUESTOS / FIAT 110-90"
                      className="tech-input py-2 text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Condiciones Venta</label>
                    <select
                      value={saleCondition}
                      onChange={e => setSaleCondition(e.target.value)}
                      className="tech-input py-2 text-xs font-bold"
                    >
                      <option value="Stock">Stock</option>
                      <option value="Pedido">Pedido</option>
                      <option value="Stock y Pedido">Stock y Pedido</option>
                      <option value="Contado contra entrega">Contado contra entrega</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-rose-500 mb-1">Tiempo de Validez</label>
                    <input
                      type="text"
                      value={validityLabel}
                      onChange={e => {
                        setValidityLabel(e.target.value);
                        const d = parseInt(e.target.value, 10);
                        if (Number.isFinite(d) && d > 0) setValidityDays(d);
                      }}
                      placeholder="Ej. 1 día / 7 días"
                      className="tech-input py-2 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descuento (Bs)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={discountInput}
                      onChange={e => setDiscountInput(e.target.value)}
                      className="tech-input py-2 text-xs font-mono font-bold text-right"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Pagado / Adelanto (Bs)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={paidInput}
                      onChange={e => setPaidInput(e.target.value)}
                      className="tech-input py-2 text-xs font-mono font-bold text-right"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Saldo Restante</label>
                    <div className="px-3 py-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 font-mono font-black text-xs text-cyan-700 dark:text-cyan-300 text-right">
                      Bs {balanceAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Observaciones (Obs:)</label>
                  <input
                    type="text"
                    placeholder="Ej. PEDIDO DE BUJE CI6504 / ENTREGA INMEDIATA"
                    value={observations}
                    onChange={e => setObservations(e.target.value)}
                    className="tech-input py-2 text-xs uppercase"
                  />
                </div>
              </div>

              {/* Catalog Search Picker */}
              <div className="tech-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-brand" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
                      Agregar Repuestos del Catálogo
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {filteredProducts.length} repuestos
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por código, OEM, nombre o marca..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="tech-input pl-9 py-2 text-xs"
                    />
                  </div>
                  <select
                    value={selectedBrand}
                    onChange={e => setSelectedBrand(e.target.value)}
                    className="tech-input sm:w-44 py-2 text-xs font-bold uppercase"
                  >
                    {brands.map(b => (
                      <option key={b} value={b}>
                        Marca: {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  {filteredProducts.slice(0, 40).map(p => {
                    const priceBs = computeUnitPrice(Number(p.price), exchangeRate, currencyMode);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full p-2.5 hover:bg-brand/5 flex items-center justify-between gap-3 text-left transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-brand">
                              {p.barcode || p.id}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{p.brand || 'GENERAL'}</span>
                            <span className="text-[10px] text-slate-400">Stock: {p.stock}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                            {p.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                            Bs {priceBs.toFixed(2)}
                          </span>
                          <span className="w-7 h-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                            <Plus className="w-4 h-4" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Items Editable Table */}
              <div className="tech-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-brand" />
                    Detalle Cotizado ({items.length} ítems)
                  </h3>
                  <span className="font-mono font-black text-sm text-brand">
                    Total: Bs {total.toFixed(2)}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    <p className="text-xs font-bold uppercase">Haz clic en los repuestos arriba para agregarlos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={item.key}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-[180px]">
                          <p className="text-[10px] font-mono font-black text-brand">
                            #{index + 1} · CÓD {item.code}
                          </p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div>
                            <span className="block text-[9px] font-black uppercase text-slate-400">Cant.</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={e => updateItemQty(item.key, parseFloat(e.target.value))}
                              className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-xs text-center"
                            />
                          </div>
                          <div>
                            <span className="block text-[9px] font-black uppercase text-slate-400">Precio Bs</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e => updateItemPrice(item.key, parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-xs text-right"
                            />
                          </div>
                          <div className="text-right min-w-[74px]">
                            <span className="block text-[9px] font-black uppercase text-slate-400">Total</span>
                            <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                              {(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 mt-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveAndGeneratePdf}
                    disabled={loading || items.length === 0}
                    className="flex-1 py-3.5 px-5 bg-brand hover:bg-brand/90 text-white rounded-xl font-black uppercase tracking-[0.15em] text-xs shadow-lg shadow-brand/25 border-b-4 border-brand-muted flex items-center justify-center gap-2.5 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {loading ? 'Generando PDF...' : 'Guardar Cotización y Generar PDF'}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE DOCUMENT PREVIEW (EXACT REFERENCE PDF SHEET) + DIRECT WHATSAPP PDF */}
            <div className={`xl:col-span-6 space-y-4 ${showLiveSheetMobile ? 'block' : 'hidden xl:block'}`}>
              {/* Quick PDF & WhatsApp Toolbar */}
              <div className="tech-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Vista Previa Formato PDF Oficial
                  </p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    N° {currentPdfPayload.quoteNumber} · T.C. {exchangeRate.toFixed(2)} Bs
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="WhatsApp (ej. 67200573)"
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                    className="w-36 px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                  />
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => handleSendPdfWhatsApp(currentPdfPayload)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar PDF WhatsApp
                  </button>
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => downloadQuotationPdf(currentPdfPayload)}
                    className="px-3.5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar PDF
                  </button>
                </div>
              </div>

              {/* A4 / Letter White Document Sheet Preview */}
              <div className="bg-white text-slate-900 rounded-xl shadow-xl border border-slate-300 p-6 sm:p-8 text-[11px] leading-snug select-text">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex-1 text-center pt-2">
                    <h2 className="text-3xl font-black tracking-tight text-black">COTIZACIÓN</h2>
                  </div>
                  <div className="border border-slate-700 rounded-lg px-4 py-3 text-center shrink-0">
                    <p className="font-bold text-xs text-black">
                      N° COTIZACIÓN : {currentPdfPayload.quoteNumber}
                    </p>
                  </div>
                </div>

                {/* Customer Box & Company Emblem */}
                <div className="grid grid-cols-12 gap-4 items-center mb-4">
                  <div className="col-span-9 border border-slate-700 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                    <div className="space-y-1">
                      <p><span className="font-bold">Cliente:</span> {currentPdfPayload.customerName}</p>
                      <p><span className="font-bold">Código Cliente:</span> {currentPdfPayload.customerCode}</p>
                      <p><span className="font-bold">NIT/C.I. R.S.:</span> {currentPdfPayload.customerNit}</p>
                      <p><span className="font-bold">Cel-Tel:</span> {currentPdfPayload.customerPhone}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="font-bold">Fecha:</span> {currentPdfPayload.dateFormatted}</p>
                      <p><span className="font-bold">Dirección / Ciudad:</span> {currentPdfPayload.customerAddress}</p>
                      <p><span className="font-bold">Correo:</span> {currentPdfPayload.customerEmail}</p>
                      <p><span className="font-bold">Vendedor:</span> {currentPdfPayload.sellerName}</p>
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center justify-center">
                    <img
                      src="/assets/aistudio/image_a7848fea.png"
                      alt="Montaño Tractor Partes y Servicios"
                      className="w-24 sm:w-28 h-auto object-contain"
                    />
                  </div>
                </div>

                {/* Salutation Banner */}
                <div className="border border-slate-700 rounded-md px-3 py-1.5 mb-3 text-[10px]">
                  <p className="font-bold">De nuestras consideraciones:</p>
                  <p>A continuación presentamos nuestra oferta para la provisión de los siguientes repuestos:</p>
                </div>

                {/* Detail Table */}
                <div className="border border-slate-800 overflow-hidden mb-3">
                  <div className="bg-[#4b4b4b] text-white font-bold text-center py-1 text-[10px] tracking-wide">
                    DETALLE DE COTIZACIÓN
                  </div>
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-[#cdcdcd] font-bold text-black">
                        <th className="border border-slate-700 py-1 px-1.5 text-center w-10">ITEM</th>
                        <th className="border border-slate-700 py-1 px-1.5 text-center w-16">CÓDIGO</th>
                        <th className="border border-slate-700 py-1 px-1.5 text-center w-16">CANTIDAD</th>
                        <th className="border border-slate-700 py-1 px-2 text-center">DESCRIPCIÓN</th>
                        <th className="border border-slate-700 py-1 px-1.5 text-right w-16">PRECIO</th>
                        <th className="border border-slate-700 py-1 px-1.5 text-right w-20">TOTAL BS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => {
                        const isFilled = Boolean(r.description);
                        return (
                          <tr key={r.key} className="h-6">
                            <td className="border border-slate-700 px-1.5 text-center">{i + 1}</td>
                            <td className="border border-slate-700 px-1.5 text-center font-mono">{isFilled ? r.code : ''}</td>
                            <td className="border border-slate-700 px-1.5 text-center">{isFilled ? r.quantity : ''}</td>
                            <td className="border border-slate-700 px-2 text-left uppercase">{isFilled ? r.description : ''}</td>
                            <td className="border border-slate-700 px-1.5 text-right font-mono">
                              {isFilled ? r.unitPrice.toFixed(2) : ''}
                            </td>
                            <td className="border border-slate-700 px-1.5 text-right font-mono font-bold">
                              {isFilled ? (r.quantity * r.unitPrice).toFixed(2) : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Lower Split: Obs + Exchange Rate + SON + Conditions | Totals + Address */}
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-7 space-y-2.5 text-[9.5px]">
                    <div>
                      <p>Obs: {currentPdfPayload.observations || 'SIN OBSERVACIONES'}</p>
                      <p className="font-bold text-blue-700 mt-0.5">
                        Tipo de Cambio Aplicado: 1 USD = {exchangeRate.toFixed(2)} Bs
                      </p>
                    </div>

                    <p className="font-bold uppercase pt-2">
                      SON: {numeroALetrasBolivianos(currentPdfPayload.total)}
                    </p>

                    <div className="border-b border-slate-700 pb-0.5 w-60">
                      <p className="font-bold">MODELO DEL TRACTOR</p>
                      <p className="uppercase">{currentPdfPayload.tractorModel}</p>
                    </div>

                    <div className="border-b border-slate-700 pb-0.5 w-60">
                      <p className="font-bold">CONDICIONES DE VENTA (STOCK O PEDIDO)</p>
                      <p>{currentPdfPayload.saleCondition}</p>
                    </div>

                    <div className="border-b border-red-700 pb-0.5 w-60 text-red-700">
                      <p className="font-bold">TIEMPO DE VALIDEZ</p>
                      <p>{currentPdfPayload.validityLabel}</p>
                    </div>

                    <p className="font-bold text-[8.5px] pt-1">*PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO*</p>
                  </div>

                  <div className="col-span-5 space-y-4">
                    <div className="border border-slate-700 text-[10px]">
                      <div className="flex justify-between px-2.5 py-1 bg-[#e8e8e8] border-b border-slate-700 font-bold">
                        <span>SUBTOTAL BS</span>
                        <span className="font-mono">{currentPdfPayload.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between px-2.5 py-1 bg-[#e0e0e0] border-b border-slate-700 font-bold">
                        <span>DESCUENTO</span>
                        <span className="font-mono">{currentPdfPayload.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between px-2.5 py-1 bg-[#cccccc] border-b border-slate-700 font-bold">
                        <span>TOTAL BS</span>
                        <span className="font-mono">{currentPdfPayload.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between px-2.5 py-1 bg-[#fcf0cc] border-b border-slate-700 font-bold">
                        <span>PAGADO BS</span>
                        <span className="font-mono">{currentPdfPayload.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between px-2.5 py-1 bg-[#cfecf4] font-bold">
                        <span>SALDO BS</span>
                        <span className="font-mono">{currentPdfPayload.balanceAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-center space-y-1 text-[8.5px] text-slate-800 pt-2">
                      <img
                        src="/assets/fiatagri_logo.png"
                        alt="FIATAGRI"
                        className="w-20 h-auto object-contain mx-auto mb-1.5"
                      />
                      <p className="uppercase font-medium">{currentPdfPayload.companyAddress}</p>
                      <p className="font-medium">{currentPdfPayload.companyPhone}</p>
                      <p className="font-medium">{currentPdfPayload.companyWebsite}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Tractor Brands Strip */}
                <div className="mt-5 pt-2">
                  <img
                    src="/assets/brands_strip.png"
                    alt="Marcas de Tractores"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
