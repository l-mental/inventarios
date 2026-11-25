import React, { useEffect, useMemo, useState } from 'react';
import { Customer, Product } from '../types';
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
  FileText,
  MessageCircle,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';

type CurrencyMode = 'BS_DIRECT' | 'USD_TO_BS' | 'BS_SCALED';

const BASE_REFERENCE_TC = 6.96;

interface QuoteItem {
  key: string;
  productId: number;
  code: string;
  description: string;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  manualPrice: boolean;
}

interface PosQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { product: Product; quantity: number }[];
  selectedCustomer: Customer | null;
  initialDiscount?: number;
  nextQuoteNumber?: string;
  onSuccess?: (quoteNumber: string) => void;
}

function computeUnitPrice(basePrice: number, tc: number, mode: CurrencyMode): number {
  const safeTc = tc > 0 ? tc : BASE_REFERENCE_TC;
  if (mode === 'USD_TO_BS') return Number((basePrice * safeTc).toFixed(2));
  if (mode === 'BS_SCALED') return Number((basePrice * (safeTc / BASE_REFERENCE_TC)).toFixed(2));
  return Number(basePrice.toFixed(2));
}

function formatDateLatam(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function PosQuotationModal({
  isOpen,
  onClose,
  cart,
  selectedCustomer,
  initialDiscount = 0,
  nextQuoteNumber = '11001',
  onSuccess,
}: PosQuotationModalProps) {
  const { user } = useAuth();
  const { settings, updateSetting } = useSettings();
  const { apiFetch } = useApi();

  const [step, setStep] = useState<'exchange_rate' | 'editor'>('exchange_rate');
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(settings.exchange_rate || '6.96');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('BS_DIRECT');
  const [savingRate, setSavingRate] = useState(false);

  const exchangeRate = useMemo(() => {
    const parsed = parseFloat(exchangeRateInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : BASE_REFERENCE_TC;
  }, [exchangeRateInput]);

  const [quoteNumber, setQuoteNumber] = useState(nextQuoteNumber);
  const [customerName, setCustomerName] = useState('');
  const [customerCode, setCustomerCode] = useState('S/N');
  const [customerNit, setCustomerNit] = useState('S/N');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('SANTA CRUZ / BOLIVIA');
  const [customerEmail, setCustomerEmail] = useState('S/N');
  const [sellerName, setSellerName] = useState(user?.full_name || 'Vendedor');

  const [tractorModel, setTractorModel] = useState('REPUESTOS');
  const [saleCondition, setSaleCondition] = useState('Stock');
  const [validityLabel, setValidityLabel] = useState('7 días');
  const [validityDays, setValidityDays] = useState(7);
  const [observations, setObservations] = useState('');
  const [discountInput, setDiscountInput] = useState(String(initialDiscount || 0));
  const [paidInput, setPaidInput] = useState('0');
  const [whatsappPhone, setWhatsappPhone] = useState('');

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedPayload, setSavedPayload] = useState<QuotationPdfPayload | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize modal state whenever opened
  useEffect(() => {
    if (!isOpen) return;
    preloadQuotationAssets();
    setStep('exchange_rate');
    setSavedPayload(null);
    setFeedback(null);
    setQuoteNumber(nextQuoteNumber);
    setExchangeRateInput(settings.exchange_rate || '6.96');
    setSellerName(user?.full_name || 'Vendedor');

    if (selectedCustomer) {
      setCustomerName(selectedCustomer.name || '');
      setCustomerCode(String(selectedCustomer.id).padStart(3, '0'));
      setCustomerPhone(selectedCustomer.phone || '');
      setWhatsappPhone(selectedCustomer.phone || '');
      setCustomerAddress(selectedCustomer.address || 'SANTA CRUZ / BOLIVIA');
      setCustomerEmail(selectedCustomer.email || 'S/N');
    } else {
      setCustomerName('CLIENTE GENERAL');
      setCustomerCode('S/N');
      setCustomerPhone('');
      setWhatsappPhone('');
      setCustomerAddress('SANTA CRUZ / BOLIVIA');
      setCustomerEmail('S/N');
    }

    setCustomerNit('S/N');
    setTractorModel('REPUESTOS');
    setSaleCondition('Stock');
    setValidityLabel('7 días');
    setValidityDays(7);
    setObservations('');
    setDiscountInput(String(initialDiscount || 0));
    setPaidInput('0');

    const rate = parseFloat(settings.exchange_rate || '6.96') || BASE_REFERENCE_TC;
    setItems(
      cart.map((ci, idx) => ({
        key: `${ci.product.id}-${idx}`,
        productId: ci.product.id,
        code: ci.product.barcode || String(ci.product.id).padStart(4, '0'),
        description: ci.product.name,
        basePrice: Number(ci.product.price),
        unitPrice: computeUnitPrice(Number(ci.product.price), rate, currencyMode),
        quantity: ci.quantity,
        manualPrice: false,
      }))
    );
  }, [isOpen]);

  // Recalculate non-manual prices on exchangeRate/mode change
  useEffect(() => {
    setItems(prev =>
      prev.map(it =>
        it.manualPrice
          ? it
          : { ...it, unitPrice: computeUnitPrice(it.basePrice, exchangeRate, currencyMode) }
      )
    );
  }, [exchangeRate, currencyMode]);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
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

  if (!isOpen) return null;

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
      setFeedback({ type: 'success', text: `Tipo de cambio guardado: 1 USD = ${val} Bs` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setSavingRate(false);
    }
  };

  const handleConfirmRateAndProceed = async () => {
    const val = exchangeRate.toFixed(2);
    updateSetting('exchange_rate', val);
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'exchange_rate', value: val }),
      });
    } catch {
      // keep local value if offline
    }
    setStep('editor');
  };

  const handleSaveAndDownloadPdf = async () => {
    if (items.length === 0) {
      setFeedback({ type: 'error', text: 'Debe haber al menos un repuesto en la cotización.' });
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
          customer_id: selectedCustomer?.id || null,
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

      const finalNum = res.quote_number || currentPdfPayload.quoteNumber;
      const finalPayload: QuotationPdfPayload = { ...currentPdfPayload, quoteNumber: finalNum };
      await downloadQuotationPdf(finalPayload);
      setSavedPayload(finalPayload);
      setFeedback({
        type: 'success',
        text: `Cotización N° ${finalNum} guardada y PDF generado correctamente.`,
      });
      onSuccess?.(finalNum);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppPdf = async () => {
    const payload = savedPayload || currentPdfPayload;
    const phone = (whatsappPhone || payload.customerPhone || '').trim();
    const res = await shareQuotationPdfViaWhatsApp(payload, phone);
    setFeedback({
      type: 'success',
      text:
        res.mode === 'native_share'
          ? `Compartiendo ${res.filename} por WhatsApp.`
          : `PDF "${res.filename}" descargado y WhatsApp abierto. Adjunta el archivo PDF en el chat.`,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[120] flex items-center justify-center p-2 sm:p-5">
      <div className="bg-slate-100 dark:bg-slate-950 w-full max-w-7xl h-[94vh] rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display font-black uppercase tracking-wide text-base">
                  Cotización en PDF · POS Mostrador
                </h2>
                <span className="px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 text-amber-300 font-mono font-black text-[11px]">
                  T.C. 1 USD = {exchangeRate.toFixed(2)} Bs
                </span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                {step === 'exchange_rate'
                  ? 'Paso 1: Verifica o cambia el Tipo de Cambio antes de generar el PDF'
                  : 'Paso 2: Completa datos del documento, genera el PDF y envíalo por WhatsApp'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          {feedback && (
            <div
              className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {feedback.text}
              </span>
              <button onClick={() => setFeedback(null)} className="p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'exchange_rate' ? (
            /* STEP 1: TIPO DE CAMBIO ANTES DE COTIZAR */
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand/25 p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                    Paso 1 · Tipo de Cambio Vigente
                  </span>
                  <h3 className="text-xl font-display font-black uppercase text-slate-900 dark:text-white">
                    ¿Con qué Tipo de Cambio harás esta cotización?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Revisa o modifica el Tipo de Cambio antes de abrir el formulario PDF. El valor elegido quedará visible en el documento.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Tipo de Cambio (1 USD en Bolivianos)
                  </label>

                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-3 rounded-lg bg-slate-900 text-white font-mono font-black text-xs">
                      1 USD =
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={exchangeRateInput}
                      onChange={e => setExchangeRateInput(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border-2 border-brand/40 focus:border-brand outline-none font-mono font-black text-2xl text-right text-slate-900 dark:text-white"
                    />
                    <span className="px-3 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 font-mono font-black text-xs text-slate-800 dark:text-white">
                      Bs
                    </span>
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
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingRate ? 'Guardando...' : 'Guardar como T.C. Predeterminado'}
                  </button>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Conversión de Precios del Mostrador
                  </label>

                  <button
                    type="button"
                    onClick={() => setCurrencyMode('BS_DIRECT')}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      currencyMode === 'BS_DIRECT' ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      1. Mantener precios en Bs (registrar T.C. en PDF)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Conserva el precio actual del carrito e imprime T.C. {exchangeRate.toFixed(2)} Bs en el documento.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrencyMode('BS_SCALED')}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      currencyMode === 'BS_SCALED' ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      2. Ajustar precios proporcionalmente (vs 6.96)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Multiplica precios por ({exchangeRate.toFixed(2)} / 6.96 = {(exchangeRate / BASE_REFERENCE_TC).toFixed(3)}).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrencyMode('USD_TO_BS')}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      currencyMode === 'USD_TO_BS' ? 'border-brand bg-brand/5' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      3. Multiplicar precios (USD) × {exchangeRate.toFixed(2)} Bs
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Convierte cada precio multiplicándolo directo por {exchangeRate.toFixed(2)}.
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-500">
                  {items.length} repuesto(s) del mostrador listos para cotizar.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmRateAndProceed}
                  className="px-6 py-3.5 bg-brand hover:bg-brand/90 text-white rounded-xl font-black uppercase tracking-[0.15em] text-xs shadow-lg shadow-brand/25 border-b-4 border-brand-muted flex items-center gap-2.5"
                >
                  <span>Confirmar T.C. ({exchangeRate.toFixed(2)} Bs) y Abrir Cotización PDF</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: EDITOR + FORMATO PDF OFICIAL + WHATSAPP PDF */
            <div className="space-y-5">
              {/* Top Quick Bar inside Editor */}
              <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('exchange_rate')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Cambiar T.C.
                  </button>
                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-black uppercase text-slate-300">T.C.:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={exchangeRateInput}
                      onChange={e => setExchangeRateInput(e.target.value)}
                      className="w-20 bg-slate-950 border border-slate-600 rounded px-2 py-0.5 text-right font-mono font-black text-xs text-white"
                    />
                    <select
                      value={currencyMode}
                      onChange={e => setCurrencyMode(e.target.value as CurrencyMode)}
                      className="bg-slate-950 border border-slate-600 rounded px-2 py-0.5 text-[10px] font-bold text-slate-200"
                    >
                      <option value="BS_DIRECT">Directo Bs</option>
                      <option value="BS_SCALED">Escala T.C.</option>
                      <option value="USD_TO_BS">USD × T.C.</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="WhatsApp (ej. 67200573)"
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                    className="w-44 px-3 py-2 rounded-lg bg-white text-slate-900 font-mono font-bold text-xs"
                  />
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={handleWhatsAppPdf}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar PDF por WhatsApp
                  </button>
                  <button
                    type="button"
                    disabled={loading || items.length === 0}
                    onClick={handleSaveAndDownloadPdf}
                    className="px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {loading ? 'Guardando...' : 'Guardar y Descargar PDF'}
                  </button>
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => openQuotationPdfInNewTab(savedPayload || currentPdfPayload)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                {/* Left: Customer, Metadata, Editable Items */}
                <div className="xl:col-span-6 space-y-4">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-brand" />
                        Datos del Cliente y Condiciones del PDF
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400">N°:</span>
                        <input
                          type="text"
                          value={quoteNumber}
                          onChange={e => setQuoteNumber(e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-black text-xs text-center"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Cliente</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          className="tech-input py-1.5 text-xs uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Cód. Cliente</label>
                          <input
                            type="text"
                            value={customerCode}
                            onChange={e => setCustomerCode(e.target.value)}
                            className="tech-input py-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">NIT / C.I.</label>
                          <input
                            type="text"
                            value={customerNit}
                            onChange={e => setCustomerNit(e.target.value)}
                            className="tech-input py-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Cel - Tel</label>
                        <input
                          type="text"
                          value={customerPhone}
                          onChange={e => {
                            setCustomerPhone(e.target.value);
                            setWhatsappPhone(e.target.value);
                          }}
                          className="tech-input py-1.5 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Dirección / Ciudad</label>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={e => setCustomerAddress(e.target.value)}
                          className="tech-input py-1.5 text-xs uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Correo</label>
                        <input
                          type="text"
                          value={customerEmail}
                          onChange={e => setCustomerEmail(e.target.value)}
                          className="tech-input py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Vendedor</label>
                        <input
                          type="text"
                          value={sellerName}
                          onChange={e => setSellerName(e.target.value)}
                          className="tech-input py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Modelo del Tractor</label>
                        <input
                          type="text"
                          value={tractorModel}
                          onChange={e => setTractorModel(e.target.value)}
                          className="tech-input py-1.5 text-xs uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Condición</label>
                          <select
                            value={saleCondition}
                            onChange={e => setSaleCondition(e.target.value)}
                            className="tech-input py-1.5 text-xs font-bold"
                          >
                            <option value="Stock">Stock</option>
                            <option value="Pedido">Pedido</option>
                            <option value="Stock y Pedido">Stock y Pedido</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-rose-500 mb-0.5">Validez</label>
                          <input
                            type="text"
                            value={validityLabel}
                            onChange={e => {
                              setValidityLabel(e.target.value);
                              const d = parseInt(e.target.value, 10);
                              if (Number.isFinite(d) && d > 0) setValidityDays(d);
                            }}
                            className="tech-input py-1.5 text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Descuento Bs</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={discountInput}
                          onChange={e => setDiscountInput(e.target.value)}
                          className="tech-input py-1.5 text-xs font-mono text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Pagado Bs</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={paidInput}
                          onChange={e => setPaidInput(e.target.value)}
                          className="tech-input py-1.5 text-xs font-mono text-right"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Saldo Bs</label>
                        <div className="px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 font-mono font-black text-xs text-right text-cyan-700 dark:text-cyan-300">
                          {balanceAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">Observaciones (Obs:)</label>
                      <input
                        type="text"
                        placeholder="Ej. PEDIDO DE BUJE CI6504"
                        value={observations}
                        onChange={e => setObservations(e.target.value)}
                        className="tech-input py-1.5 text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-800 dark:text-white">
                        Repuestos en esta Cotización ({items.length})
                      </span>
                      <span className="font-mono font-black text-sm text-brand">
                        TOTAL: Bs {total.toFixed(2)}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar">
                      {items.map((item, idx) => (
                        <div
                          key={item.key}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-mono font-black text-brand">
                              #{idx + 1} · {item.code}
                            </p>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {item.description}
                            </p>
                          </div>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={e =>
                              setItems(prev =>
                                prev.map(it =>
                                  it.key === item.key
                                    ? { ...it, quantity: Math.max(0.01, parseFloat(e.target.value) || 1) }
                                    : it
                                )
                              )
                            }
                            className="w-14 px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono text-xs text-center font-bold"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e =>
                              setItems(prev =>
                                prev.map(it =>
                                  it.key === item.key
                                    ? {
                                        ...it,
                                        unitPrice: Math.max(0, parseFloat(e.target.value) || 0),
                                        manualPrice: true,
                                      }
                                    : it
                                )
                              )
                            }
                            className="w-20 px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono text-xs text-right font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => setItems(prev => prev.filter(it => it.key !== item.key))}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Live Official PDF Sheet Preview */}
                <div className="xl:col-span-6 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 p-5 sm:p-7 text-[10px] leading-snug">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 text-center pt-1">
                      <h2 className="text-2xl font-black tracking-tight text-black">COTIZACIÓN</h2>
                    </div>
                    <div className="border border-slate-700 rounded-lg px-3.5 py-2.5 text-center shrink-0">
                      <p className="font-bold text-[11px] text-black">
                        N° COTIZACIÓN : {currentPdfPayload.quoteNumber}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center mb-3">
                    <div className="col-span-9 border border-slate-700 rounded-lg p-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px]">
                      <div className="space-y-0.5">
                        <p><span className="font-bold">Cliente:</span> {currentPdfPayload.customerName}</p>
                        <p><span className="font-bold">Código Cliente:</span> {currentPdfPayload.customerCode}</p>
                        <p><span className="font-bold">NIT/C.I. R.S.:</span> {currentPdfPayload.customerNit}</p>
                        <p><span className="font-bold">Cel-Tel:</span> {currentPdfPayload.customerPhone}</p>
                      </div>
                      <div className="space-y-0.5">
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

                  <div className="border border-slate-700 rounded px-2.5 py-1.5 mb-2.5 text-[9.5px]">
                    <p className="font-bold">De nuestras consideraciones:</p>
                    <p>A continuación presentamos nuestra oferta para la provisión de los siguientes repuestos:</p>
                  </div>

                  <div className="border border-slate-800 overflow-hidden mb-3">
                    <div className="bg-[#4b4b4b] text-white font-bold text-center py-1 text-[9.5px]">
                      DETALLE DE COTIZACIÓN
                    </div>
                    <table className="w-full border-collapse text-[9.5px]">
                      <thead>
                        <tr className="bg-[#cdcdcd] font-bold text-black">
                          <th className="border border-slate-700 py-1 px-1 text-center w-9">ITEM</th>
                          <th className="border border-slate-700 py-1 px-1 text-center w-14">CÓDIGO</th>
                          <th className="border border-slate-700 py-1 px-1 text-center w-14">CANTIDAD</th>
                          <th className="border border-slate-700 py-1 px-2 text-center">DESCRIPCIÓN</th>
                          <th className="border border-slate-700 py-1 px-1 text-right w-14">PRECIO</th>
                          <th className="border border-slate-700 py-1 px-1 text-right w-16">TOTAL BS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((r, i) => {
                          const isFilled = Boolean(r.description);
                          return (
                            <tr key={r.key} className="h-5">
                              <td className="border border-slate-700 px-1 text-center">{i + 1}</td>
                              <td className="border border-slate-700 px-1 text-center font-mono">{isFilled ? r.code : ''}</td>
                              <td className="border border-slate-700 px-1 text-center">{isFilled ? r.quantity : ''}</td>
                              <td className="border border-slate-700 px-1.5 text-left uppercase">{isFilled ? r.description : ''}</td>
                              <td className="border border-slate-700 px-1 text-right font-mono">
                                {isFilled ? r.unitPrice.toFixed(2) : ''}
                              </td>
                              <td className="border border-slate-700 px-1 text-right font-mono font-bold">
                                {isFilled ? (r.quantity * r.unitPrice).toFixed(2) : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-7 space-y-2 text-[9px]">
                      <div>
                        <p>Obs: {currentPdfPayload.observations || 'SIN OBSERVACIONES'}</p>
                        <p className="font-bold text-blue-700 mt-0.5">
                          Tipo de Cambio Aplicado: 1 USD = {exchangeRate.toFixed(2)} Bs
                        </p>
                      </div>
                      <p className="font-bold uppercase pt-1">
                        SON: {numeroALetrasBolivianos(currentPdfPayload.total)}
                      </p>
                      <div className="border-b border-slate-700 pb-0.5 w-52">
                        <p className="font-bold">MODELO DEL TRACTOR</p>
                        <p className="uppercase">{currentPdfPayload.tractorModel}</p>
                      </div>
                      <div className="border-b border-slate-700 pb-0.5 w-52">
                        <p className="font-bold">CONDICIONES DE VENTA (STOCK O PEDIDO)</p>
                        <p>{currentPdfPayload.saleCondition}</p>
                      </div>
                      <div className="border-b border-red-700 pb-0.5 w-52 text-red-700">
                        <p className="font-bold">TIEMPO DE VALIDEZ</p>
                        <p>{currentPdfPayload.validityLabel}</p>
                      </div>
                      <p className="font-bold text-[8px]">*PRECIOS SUJETOS A CAMBIO SIN PREVIO AVISO*</p>
                    </div>

                    <div className="col-span-5 space-y-3">
                      <div className="border border-slate-700 text-[9.5px]">
                        <div className="flex justify-between px-2 py-1 bg-[#e8e8e8] border-b border-slate-700 font-bold">
                          <span>SUBTOTAL BS</span>
                          <span className="font-mono">{currentPdfPayload.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between px-2 py-1 bg-[#e0e0e0] border-b border-slate-700 font-bold">
                          <span>DESCUENTO</span>
                          <span className="font-mono">{currentPdfPayload.discount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between px-2 py-1 bg-[#cccccc] border-b border-slate-700 font-bold">
                          <span>TOTAL BS</span>
                          <span className="font-mono">{currentPdfPayload.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between px-2 py-1 bg-[#fcf0cc] border-b border-slate-700 font-bold">
                          <span>PAGADO BS</span>
                          <span className="font-mono">{currentPdfPayload.paidAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between px-2 py-1 bg-[#cfecf4] font-bold">
                          <span>SALDO BS</span>
                          <span className="font-mono">{currentPdfPayload.balanceAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-center space-y-1 text-[8px] text-slate-800 pt-2">
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

                  <div className="mt-4 pt-2">
                    <img
                      src="/assets/brands_strip.png"
                      alt="Marcas de Tractores"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
