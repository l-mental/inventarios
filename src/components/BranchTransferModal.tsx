import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Product } from '../types';
import { getBrandAccent } from '../data/tractorPartsCatalog';
import {
  ArrowRightLeft,
  X,
  Building2,
  Package,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';

interface BranchTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProductId?: number;
}

const DEFAULT_BRANCHES = ['Sucursal Central', 'Sucursal Norte', 'Sucursal Sur'];

export default function BranchTransferModal({
  isOpen,
  onClose,
  onSuccess,
  initialProductId,
}: BranchTransferModalProps) {
  const { apiFetch } = useApi();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>(initialProductId || '');
  const [fromBranch, setFromBranch] = useState<string>('Sucursal Central');
  const [toBranch, setToBranch] = useState<string>('Sucursal Norte');
  const [quantity, setQuantity] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      fetchProducts();
      if (initialProductId) {
        setSelectedProductId(initialProductId);
      }
    }
  }, [isOpen, initialProductId]);

  const fetchProducts = async () => {
    try {
      const data = await apiFetch('/api/products');
      setProducts(data);
      if (!selectedProductId && data.length > 0) {
        const defaultWithStock = data.find((p: Product) => (p.stock || 0) > 0);
        setSelectedProductId(defaultWithStock ? defaultWithStock.id : data[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const selectedProduct = products.find(p => p.id === Number(selectedProductId));
  const unitLabel = selectedProduct?.unit_type === 'JUEGO' ? 'jgos' : 'uds';

  const branchStocks: Record<string, number> = selectedProduct?.branch_stocks || {
    'Sucursal Central': Math.ceil((selectedProduct?.stock || 0) * 0.7),
    'Sucursal Norte': Math.floor((selectedProduct?.stock || 0) * 0.3),
    'Sucursal Sur': 0,
  };

  const availableInOrigin = Number(branchStocks[fromBranch] ?? 0);
  const currentInDest = Number(branchStocks[toBranch] ?? 0);

  const handleFromBranchChange = (branch: string) => {
    setFromBranch(branch);
    if (branch === toBranch) {
      const other = DEFAULT_BRANCHES.find(b => b !== branch);
      if (other) setToBranch(other);
    }
  };

  const handleToBranchChange = (branch: string) => {
    setToBranch(branch);
    if (branch === fromBranch) {
      const other = DEFAULT_BRANCHES.find(b => b !== branch);
      if (other) setFromBranch(other);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProductId) {
      setError('Por favor selecciona un repuesto.');
      return;
    }
    if (fromBranch === toBranch) {
      setError('La sucursal de origen y la de destino no pueden ser iguales.');
      return;
    }
    if (quantity <= 0) {
      setError('La cantidad a transferir debe ser mayor a 0.');
      return;
    }
    if (quantity > availableInOrigin) {
      setError(`Stock insuficiente en ${fromBranch}. Máximo disponible para transferir: ${availableInOrigin} ${unitLabel}.`);
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/api/branches/transfer', {
        method: 'POST',
        body: JSON.stringify({
          product_id: Number(selectedProductId),
          from_branch: fromBranch,
          to_branch: toBranch,
          quantity: Math.round(quantity),
          notes,
        }),
      });

      setSuccessMsg(
        `Traspaso exitoso: ${Math.round(quantity)} ${unitLabel} de ${selectedProduct?.name} movidas de ${fromBranch} a ${toBranch}.`
      );
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar el traspaso');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const newOriginStock = Math.max(0, Math.round(availableInOrigin - quantity));
  const newDestStock = Math.round(currentInDest + quantity);
  const brandStyle = getBrandAccent(selectedProduct?.brand);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg uppercase tracking-tight">
                Traspaso de Unidades entre Sucursales
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Movimiento y balance de repuestos entre almacenes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleExecuteTransfer} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Product Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-brand" />
              Repuesto a Transferir
            </label>
            <select
              value={selectedProductId}
              onChange={e => {
                setSelectedProductId(Number(e.target.value));
                setQuantity(1);
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.barcode || p.id}] {p.name} ({p.brand || 'GENERAL'} · Stock: {p.stock})
                </option>
              ))}
            </select>

            {selectedProduct && (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                    Cód: {selectedProduct.barcode || selectedProduct.id}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className={`font-bold uppercase ${brandStyle.text}`}>
                    {selectedProduct.brand || 'GENERAL'}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-500 shrink-0">
                  Unidad: {selectedProduct.unit_type || 'UNIDAD'}
                </span>
              </div>
            )}
          </div>

          {/* Branch Origin & Destination Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-rose-500" />
                  Origen (Sale)
                </span>
                <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase rounded tabular-nums">
                  {availableInOrigin} {unitLabel}
                </span>
              </div>
              <select
                value={fromBranch}
                onChange={e => handleFromBranchChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
              >
                {DEFAULT_BRANCHES.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-emerald-500" />
                  Destino (Entra)
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded tabular-nums">
                  Actual: {currentInDest} {unitLabel}
                </span>
              </div>
              <select
                value={toBranch}
                onChange={e => handleToBranchChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
              >
                {DEFAULT_BRANCHES.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Cantidad a Transferir ({selectedProduct?.unit_type || 'UNIDAD'})
              </label>
              <div className="flex items-center gap-1">
                {[5, 10, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuantity(Math.min(availableInOrigin, amt))}
                    disabled={availableInOrigin < amt}
                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand/10 hover:text-brand disabled:opacity-40 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold uppercase transition-colors"
                  >
                    {amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(availableInOrigin)}
                  disabled={availableInOrigin <= 0}
                  className="px-2 py-0.5 bg-brand text-white rounded text-[9px] font-black uppercase hover:opacity-90"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, Math.round(quantity - 1)))}
                className="w-11 h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-xl hover:bg-slate-200 flex items-center justify-center text-lg"
              >
                -
              </button>
              <input
                type="number"
                step="1"
                min="1"
                max={availableInOrigin || 1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-lg font-mono font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand tabular-nums"
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(availableInOrigin, Math.round(quantity + 1)))}
                className="w-11 h-11 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black rounded-xl hover:bg-slate-200 flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Real-time visual comparison */}
          <div className="p-4 bg-gradient-to-r from-rose-50/50 via-slate-50 to-emerald-50/50 dark:from-rose-950/20 dark:via-slate-900 dark:to-emerald-950/20 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{fromBranch}</span>
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <span className="text-base font-black text-slate-400 line-through tabular-nums">
                  {availableInOrigin} {unitLabel}
                </span>
                <span className="text-sm font-bold text-slate-400">→</span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                  {newOriginStock} {unitLabel}
                </span>
              </div>
              <span className="text-[9px] font-bold text-rose-500">(-{quantity} {unitLabel})</span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="p-2 bg-brand text-white rounded-full shadow-md shadow-brand/20">
                <ArrowRight className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-brand mt-1">
                Pasando {quantity} {unitLabel}
              </span>
            </div>

            <div className="text-center sm:text-right">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{toBranch}</span>
              <div className="flex items-center gap-1.5 justify-center sm:justify-end">
                <span className="text-base font-black text-slate-400 line-through tabular-nums">
                  {currentInDest} {unitLabel}
                </span>
                <span className="text-sm font-bold text-slate-400">→</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {newDestStock} {unitLabel}
                </span>
              </div>
              <span className="text-[9px] font-bold text-emerald-500">(+{quantity} {unitLabel})</span>
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Motivo u Observación del Traspaso (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Reposición de cojinetes Perkins y filtros para sucursal Norte"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || availableInOrigin < quantity || availableInOrigin <= 0}
              className="flex-1 py-3 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white font-display font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-brand/20 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  Confirmar Traspaso
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
