import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { InventoryMovement, Product, BranchTransfer } from '../types';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Eraser, 
  Calendar,
  Box,
  Info,
  Download,
  DollarSign,
  TrendingUp,
  Layers,
  ChevronRight,
  Package,
  ArrowRightLeft,
  Building2,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import BranchTransferModal from '../components/BranchTransferModal';
import CalaminaImage from '../components/CalaminaImage';
import { formatMeter } from '../lib/calaminaCatalog';

export default function Inventory() {
  const { formatPrice } = useSettings();
  const [activeView, setActiveView] = useState<'movements' | 'valued' | 'transfers'>('valued');
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    productId: '',
    type: ''
  });
  
  const { token } = useAuth();
  const { apiFetch } = useApi();

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [moveData, prodData, transData] = await Promise.all([
        apiFetch('/api/inventory/movements').catch(() => []),
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/branches/transfers').catch(() => [])
      ]);
      setMovements(moveData || []);
      setProducts(prodData || []);
      setTransfers(transData || []);
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') {
        console.error('Error fetching inventory data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      productId: '',
      type: ''
    });
  };

  const filteredMovements = movements.filter(m => {
    if (filters.startDate && new Date(m.created_at) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(m.created_at) > new Date(filters.endDate)) return false;
    if (filters.productId && m.product_id !== Number(filters.productId)) return false;
    if (filters.type && m.type !== filters.type) return false;
    return true;
  });

  // Valued Kardex calculations
  const valuedItems = products.map(p => {
    const cost = p.cost_price && p.cost_price > 0 ? p.cost_price : Number((p.price * 0.62).toFixed(2));
    const totalCostValue = Number((p.stock * cost).toFixed(2));
    const totalSaleValue = Number((p.stock * p.price).toFixed(2));
    const projectedProfit = Number((totalSaleValue - totalCostValue).toFixed(2));
    const marginPct = p.price > 0 ? Number((((p.price - cost) / p.price) * 100).toFixed(1)) : 0;
    return {
      ...p,
      unitCost: cost,
      totalCostValue,
      totalSaleValue,
      projectedProfit,
      marginPct
    };
  });

  const valuedSummary = {
    totalUnits: valuedItems.reduce((a, b) => a + b.stock, 0),
    inventoryCost: valuedItems.reduce((a, b) => a + b.totalCostValue, 0),
    inventorySale: valuedItems.reduce((a, b) => a + b.totalSaleValue, 0),
    projectedGain: valuedItems.reduce((a, b) => a + b.projectedProfit, 0)
  };

  const exportValuedKardex = () => {
    const rows = valuedItems.map(item => ({
      SKU_Codigo: item.barcode || `CAL-${item.id}`,
      Material: item.name,
      Categoria: item.category,
      Color: item.color_name || 'Galvanizado',
      Espesor: item.thickness || '0.35 mm',
      Bobina: item.batch_number || 'BOB-GEN',
      Stock_Metros: item.stock,
      Costo_Por_Metro: item.unitCost,
      Precio_Por_Metro: item.price,
      Valor_Total_Costo: item.totalCostValue,
      Valor_Total_Venta: item.totalSaleValue,
      Utilidad_Proyectada: item.projectedProfit,
      Margen_Porcentaje: `${item.marginPct}%`
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kardex_Valorizado');
    XLSX.writeFile(wb, `Kardex_Valorizado_AcerTecho_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportTransfersExcel = () => {
    const rows = transfers.map(t => ({
      Fecha: new Date(t.created_at).toLocaleString(),
      Producto: t.product_name,
      Origen: t.from_branch,
      Destino: t.to_branch,
      Cantidad: t.quantity,
      Notas_Motivo: t.notes || 'Traspaso de reposición',
      Responsable: t.user_name || 'Admin'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Traspasos_Sucursales');
    XLSX.writeFile(wb, `Traspasos_Sucursales_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totals = {
    count: filteredMovements.length,
    entradas: filteredMovements.filter(m => m.type === 'IN').length,
    salidas: filteredMovements.filter(m => m.type === 'OUT' || m.type === 'SALE').length
  };

  const openTransferModalFor = (productId?: number) => {
    setSelectedProductId(productId);
    setTransferModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Dashboard <ChevronRight className="w-3 h-3 text-brand" /> Inventario <ChevronRight className="w-3 h-3 text-brand" /> {
              activeView === 'valued' ? 'Kardex Valorizado' : activeView === 'transfers' ? 'Traspasos de Sucursal' : 'Historial de Movimientos'
            }
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand text-white rounded shadow-lg shadow-brand/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Kardex e Inventario</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Valorización Contable de Stock, Traspasos y Auditoría</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Interactive Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setActiveView('valued')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                activeView === 'valued'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kardex Valorizado
            </button>
            <button
              onClick={() => setActiveView('transfers')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5 ${
                activeView === 'transfers'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3 text-brand" />
              Traspasos ({transfers.length})
            </button>
            <button
              onClick={() => setActiveView('movements')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                activeView === 'movements'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Movimientos Kardex
            </button>
          </div>

          <button 
            onClick={() => openTransferModalFor(undefined)}
            className="px-4 py-2.5 bg-brand hover:bg-brand/90 text-white rounded font-black uppercase tracking-widest text-[10px] shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Traspasar Sucursal
          </button>

          {activeView === 'valued' && (
            <button 
              onClick={exportValuedKardex}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black uppercase tracking-widest text-[10px] shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar (.xlsx)
            </button>
          )}

          {activeView === 'transfers' && (
            <button 
              onClick={exportTransfersExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-black uppercase tracking-widest text-[10px] shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Descargar Excel
            </button>
          )}

          <button 
            onClick={fetchData}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Sincronizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeView === 'valued' ? (
        <>
          {/* Valued Kardex Financial KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Metraje Total en Planta</span>
                <Layers className="w-4 h-4 text-brand" />
              </div>
              <p className="text-2xl font-display font-black text-slate-900 dark:text-white tabular-nums">
                {formatMeter(valuedSummary.totalUnits)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{products.length} calaminas y remates activos</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor a Precio de Costo</span>
                <DollarSign className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-display font-black text-slate-900 dark:text-white tabular-nums">
                {formatPrice(valuedSummary.inventoryCost)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Capital invertido en mercadería</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor a Precio de Venta</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-display font-black text-blue-600 dark:text-blue-400 tabular-nums">
                {formatPrice(valuedSummary.inventorySale)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Retorno bruto estimado</p>
            </div>

            <div className="p-5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg border border-emerald-500/20 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Utilidad Proyectada</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-display font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatPrice(valuedSummary.projectedGain)}
              </p>
              <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 mt-1">Margen neto sobre inventario</p>
            </div>
          </div>

          {/* Valued Kardex Table */}
          <div className="tech-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Calamina / Código</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Bobina / Calibre</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Metraje Global</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Metros por Sucursal</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Costo / m</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Venta / m</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Costo</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Margen / Ganancia</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Traspasar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {valuedItems.map(item => (
                    <tr key={item.id} className="hover:bg-brand/[0.02] dark:hover:bg-brand/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <CalaminaImage product={item} aspectClass="w-12 h-9 shrink-0" showColorDot />
                          <div>
                            <p className="text-xs font-display font-black text-slate-900 dark:text-white">{item.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.barcode || `CAL-${item.id}`} · {item.color_name || 'Galv.'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">{item.batch_number || 'BOB-GEN'}</p>
                        <p className="text-[10px] text-slate-400">{item.thickness || '0.35 mm'} · Ancho {item.width_m || 0.85} m</p>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-black text-xs text-slate-900 dark:text-white tabular-nums">
                        {formatMeter(item.stock)}
                      </td>
                      <td className="px-6 py-4">
                        {item.branch_stocks && Object.keys(item.branch_stocks).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.branch_stocks).map(([branch, qty]) => (
                              <span 
                                key={branch} 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                <span className="text-[8px] text-slate-400">{branch.replace('Sucursal ', '')}:</span>
                                <span className={qty > 0 ? 'text-brand font-black' : 'text-slate-400'}>{qty} m</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Central: {item.stock} m</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatPrice(item.unitCost)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300">
                        {formatPrice(item.totalCostValue)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">+{formatPrice(item.projectedProfit)}</p>
                        <p className="text-[10px] text-slate-400">{item.marginPct}% margen</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openTransferModalFor(item.id)}
                          className="p-1.5 text-brand hover:text-white hover:bg-brand rounded transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Traspasar unidades entre sucursales"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeView === 'transfers' ? (
        /* Branch Transfers History View */
        <div className="space-y-6">
          <div className="p-5 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent border border-brand/20 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-brand text-white rounded">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Registro de Traspasos Inter-Sucursales</h3>
                <p className="text-[11px] text-slate-500">Historial de movimientos físicos entre tiendas y almacenes con trazabilidad de usuario</p>
              </div>
            </div>
            <button
              onClick={() => openTransferModalFor(undefined)}
              className="px-4 py-2 bg-brand text-white rounded font-black text-[10px] uppercase tracking-wider hover:bg-brand/90 flex items-center gap-2 self-start md:self-auto cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Realizar Nuevo Traspaso
            </button>
          </div>

          <div className="tech-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ruta de Traspaso</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidades</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Motivo / Notas</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <ArrowRightLeft className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-black uppercase text-slate-500">No hay traspasos registrados aún</p>
                        <p className="text-xs text-slate-400 mt-1">Haz clic en &quot;Traspasar Sucursal&quot; para transferir stock entre sucursales.</p>
                        <button
                          onClick={() => openTransferModalFor(undefined)}
                          className="mt-4 px-4 py-2 bg-brand text-white rounded text-xs font-black uppercase tracking-wider"
                        >
                          Hacer primer traspaso
                        </button>
                      </td>
                    </tr>
                  ) : (
                    transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-brand/[0.02] dark:hover:bg-brand/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-brand" />
                            <span className="text-xs font-black uppercase text-slate-900 dark:text-white">{t.product_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-[10px]">
                              <Building2 className="w-3 h-3" />
                              {t.from_branch}
                            </span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                              <Building2 className="w-3 h-3" />
                              {t.to_branch}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded bg-brand/10 text-brand font-mono font-black text-xs">
                            {formatMeter(t.quantity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                          {t.notes || <span className="text-slate-400 italic">Traspaso estándar</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t.user_name || 'Admin'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filters Section */}
          <div className="bg-brand/5 dark:bg-slate-900/40 rounded border border-brand/20 dark:border-slate-800 shadow-xl overflow-hidden p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Periodo Inicial</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
                  <input 
                    type="date" 
                    value={filters.startDate}
                    onChange={e => setFilters({...filters, startDate: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Periodo Final</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
                  <input 
                    type="date" 
                    value={filters.endDate}
                    onChange={e => setFilters({...filters, endDate: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Unidad de Stock</label>
                <div className="relative">
                  <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
                  <select 
                    value={filters.productId}
                    onChange={e => setFilters({...filters, productId: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                  >
                    <option value="">TODAS LAS REFERENCIAS</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría Flujo</label>
                <div className="relative">
                  <History className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
                  <select 
                    value={filters.type}
                    onChange={e => setFilters({...filters, type: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer"
                  >
                    <option value="">TODOS LOS MOVIMIENTOS</option>
                    <option value="IN">ENTRADA (MERCANCÍA)</option>
                    <option value="OUT">SALIDA (MERMA/AJUSTE)</option>
                    <option value="SALE">VENTA POS (SALIDA)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={clearFilters}
                className="px-6 py-2.5 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest text-[9px] rounded hover:bg-slate-100 border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Eraser className="w-3 h-3" /> Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Stats Summary Bar */}
          <div className="flex flex-wrap items-center gap-10 px-8 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 text-brand rounded">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Registros</p>
                <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{totals.count}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ingresos</p>
                <p className="text-sm font-black text-emerald-500 tabular-nums">{totals.entradas}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Egresos / Ventas</p>
                <p className="text-sm font-black text-rose-500 tabular-nums">{totals.salidas}</p>
              </div>
            </div>
          </div>

          {/* Movements Table */}
          <div className="tech-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Cantidad</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Referencia</th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-brand/[0.02] dark:hover:bg-brand/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-black uppercase text-slate-900 dark:text-white">{m.product_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase ${m.type === 'IN' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {m.type === 'IN' ? 'Entrada (+)' : m.type === 'SALE' ? 'Venta POS (-)' : 'Salida (-)'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-black text-sm">
                        <span className={m.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'}>
                          {m.type === 'IN' ? '+' : '-'}{formatMeter(m.quantity)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {m.reason}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300">
                        {m.user_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Inter-branch transfer modal */}
      <BranchTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={fetchData}
        initialProductId={selectedProductId}
      />
    </div>
  );
}
