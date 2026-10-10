import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useSettings } from '../context/SettingsContext';
import { Purchase, PurchaseDetail, Product, Supplier } from '../types';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Calendar, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  X,
  PlusCircle,
  Trash2,
  Save,
  Warehouse,
  UserPlus,
  BarChart3,
  CheckCircle2,
  Clock,
  Ban,
  Download,
  Eye,
  Info,
  Keyboard,
  Settings,
  Package as Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOCK_PURCHASES: Purchase[] = [
  { id: 27, number: 'dsad', supplier_id: 1, supplier_name: 'Juan', warehouse: 'Almacén Principal S1', total: 480, status: 'COMPLETED', created_at: '2026-04-17T10:00:00Z', purchase_date: '17/04/2026' },
  { id: 26, number: '21323', supplier_id: 1, supplier_name: 'Juan', warehouse: 'Almacén Principal S1', total: 5800, status: 'COMPLETED', created_at: '2026-04-17T09:00:00Z', purchase_date: '17/04/2026' },
  { id: 25, number: '3211', supplier_id: 1, supplier_name: 'Juan', warehouse: 'Almacén Principal S1', total: 472, status: 'COMPLETED', created_at: '2026-04-16T08:00:00Z', purchase_date: '16/04/2026' },
  { id: 24, number: '2376', supplier_id: 2, supplier_name: 'B4', warehouse: 'Almacén Principal S1', total: 6830, status: 'COMPLETED', created_at: '2026-04-14T07:00:00Z', purchase_date: '14/04/2026' },
  { id: 23, number: '123456', supplier_id: 1, supplier_name: 'Juan', warehouse: 'Almacén Principal S1', total: 10, status: 'COMPLETED', created_at: '2026-04-10T06:00:00Z', purchase_date: '10/04/2026' },
  { id: 22, number: '451578714', supplier_id: 3, supplier_name: 'LUBRAX', warehouse: 'Almacén Principal S1', total: 750, status: 'COMPLETED', created_at: '2026-04-09T05:00:00Z', purchase_date: '09/04/2026' },
];

export default function Purchases() {
  const [view, setView] = useState<'list' | 'new'>('list');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const { apiFetch } = useApi();
  const { formatPrice, currency } = useSettings();

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    status: 'Todos'
  });

  // Form state for New Purchase
  const [newPurchase, setNewPurchase] = useState<{
    supplier_id: string;
    warehouse: string;
    purchase_date: string;
    number: string;
    observations: string;
    details: Partial<PurchaseDetail>[];
  }>({
    supplier_id: '',
    warehouse: 'Almacén Principal S1',
    purchase_date: new Date().toISOString().split('T')[0],
    number: '',
    observations: '',
    details: []
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pData, prodData, sData] = await Promise.all([
        apiFetch('/api/purchases'),
        apiFetch('/api/products'),
        apiFetch('/api/suppliers')
      ]);
      setPurchases(pData.length > 0 ? pData : MOCK_PURCHASES);
      setProducts(prodData);
      setSuppliers(sData);
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') console.error('Error fetching purchases:', err);
      // Fallback in case of error (e.g. 404 if endpoint not yet implemented)
      setPurchases(MOCK_PURCHASES);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProductToPurchase = () => {
    setNewPurchase(prev => ({
      ...prev,
      details: [...prev.details, { product_id: 0, product_name: '', quantity: 1, unit_price: 0, subtotal: 0 }]
    }));
  };

  const updateDetail = (index: number, field: keyof PurchaseDetail, value: any) => {
    const updatedDetails = [...newPurchase.details];
    const detail = { ...updatedDetails[index] };
    
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(value));
      detail.product_id = Number(value);
      detail.product_name = prod?.name || '';
      detail.unit_price = prod?.price || 0;
    } else if (field === 'quantity') {
      // Enforce positive integer
      const intValue = Math.max(1, Math.floor(Number(value) || 0));
      detail.quantity = intValue;
    } else {
      (detail as any)[field] = value;
    }
    
    detail.subtotal = (detail.quantity || 0) * (detail.unit_price || 0);
    updatedDetails[index] = detail;
    
    setNewPurchase(prev => ({ ...prev, details: updatedDetails }));
  };

  const removeDetail = (index: number) => {
    setNewPurchase(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return newPurchase.details.reduce((sum, d) => sum + (d.subtotal || 0), 0);
  };

  const handleSubmitPurchase = async () => {
    if (!newPurchase.supplier_id || newPurchase.details.length === 0) {
      alert('Por favor complete el proveedor y añada al menos un producto.');
      return;
    }

    // Validación de cantidades
    const MAX_QUANTITY = 10000;
    for (const detail of newPurchase.details) {
      if (!detail.product_id || detail.product_id === 0) {
        alert('Por favor seleccione un producto para todos los ítems.');
        return;
      }
      
      if (!detail.quantity || detail.quantity <= 0) {
        alert(`La cantidad para el producto "${detail.product_name}" debe ser un valor positivo mayor a cero.`);
        return;
      }

      if (detail.quantity > MAX_QUANTITY) {
        alert(`La cantidad ingresada para "${detail.product_name}" (${detail.quantity}) excede el límite razonable de ${MAX_QUANTITY.toLocaleString()} unidades. Por favor, verifique los datos.`);
        return;
      }
    }

    try {
      await apiFetch('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          ...newPurchase,
          total: calculateTotal()
        })
      });
      setView('list');
      fetchData();
      // Reset form
      setNewPurchase({
        supplier_id: '',
        warehouse: 'Almacén Principal S1',
        purchase_date: new Date().toISOString().split('T')[0],
        number: '',
        observations: '',
        details: []
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const stats = {
    total: purchases.length,
    completed: purchases.filter(p => p.status === 'COMPLETED').length,
    pending: purchases.filter(p => p.status === 'PENDING').length,
    cancelled: purchases.filter(p => p.status === 'CANCELLED').length
  };

  if (view === 'new') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-20">
        {/* Header Registration */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-brand text-white rounded-lg shadow-lg shadow-brand/20">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-brand uppercase tracking-[0.3em]">Módulo de Adquisición</span>
              <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse-soft" />
            </div>
            <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Registro de Compra</h2>
          </div>
        </div>
        <button 
          onClick={() => setView('list')}
          className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 border-b-4 border-slate-950 shadow-lg"
        >
          <ChevronLeft className="w-4 h-4" /> Cancelar Transacción
        </button>
      </div>

      {/* Purchase Info Card */}
      <div className="tech-card border-brand/20">
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-[0.2em]">
            <Info className="w-4 h-4 text-brand" />
            Parámetros de Cabecera
          </div>
          <span className="text-[9px] font-bold text-slate-400">REF: P-{new Date().getTime().toString().slice(-6)}</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor Autorizado</label>
            <div className="relative">
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
              <select 
                value={newPurchase.supplier_id}
                onChange={e => setNewPurchase({...newPurchase, supplier_id: e.target.value})}
                className="tech-input pl-11 pr-10 appearance-none cursor-pointer text-xs font-bold"
              >
                <option value="">Seleccionar Proveedor</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                ))}
              </select>
              <PlusCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand cursor-pointer hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Origen / Almacén</label>
            <div className="relative">
              <Warehouse className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
              <select 
                value={newPurchase.warehouse}
                onChange={e => setNewPurchase({...newPurchase, warehouse: e.target.value})}
                className="tech-input pl-11 appearance-none cursor-pointer text-xs font-bold"
              >
                <option value="Almacén Principal S1">Almacén Principal S1</option>
                <option value="Sucursal Norte">Sucursal Norte</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Contable</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
              <input 
                type="date"
                value={newPurchase.purchase_date}
                onChange={e => setNewPurchase({...newPurchase, purchase_date: e.target.value})}
                className="tech-input pl-11 text-xs font-bold uppercase tracking-tighter"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificador Fiscal / N°</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand" />
              <input 
                type="text"
                placeholder="DOC-0000"
                value={newPurchase.number}
                onChange={e => setNewPurchase({...newPurchase, number: e.target.value})}
                className="tech-input pl-11 text-xs font-bold uppercase"
              />
            </div>
          </div>
        </div>
      </div>

        {/* Details Section */}
        <div className="tech-card border-slate-200/60 dark:border-slate-800/60">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 text-brand rounded">
                <Box className="w-5 h-5" />
              </div>
              <h3 className="font-display font-black text-slate-900 dark:text-white text-base uppercase tracking-tighter italic">Detalle Técnico de Suministros</h3>
              <span className="bg-brand text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{newPurchase.details.length} Items</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleAddProductToPurchase}
                className="bg-brand hover:bg-brand/90 text-white px-5 py-2.5 rounded font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 transition-all shadow-lg shadow-brand/20 active:scale-95 border-b-2 border-brand-muted"
              >
                <Plus className="w-4 h-4" /> Añadir Entrada de Inventario
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Especificación Producto</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cantidad</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">V. Unitario ({currency.symbol})</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">V. Subtotal</th>
                  <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Comandos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {newPurchase.details.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-40">
                        <Box className="w-16 h-16 text-slate-300 dark:text-slate-700" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Registro Vacío</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold italic">Inicialize la entrada añadiendo un producto</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  newPurchase.details.map((detail, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4">
                        <select 
                          value={detail.product_id}
                          onChange={e => updateDetail(idx, 'product_id', e.target.value)}
                          className="tech-input text-[11px] font-bold uppercase tracking-tight"
                        >
                          <option value="0">--- SELECCIONAR ARTÍCULO ---</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <input 
                            type="number"
                            min="1"
                            step="1"
                            value={detail.quantity}
                            onChange={e => updateDetail(idx, 'quantity', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === '.' || e.key === ',') e.preventDefault();
                            }}
                            className="tech-input min-w-[100px] md:w-24 text-center tabular-nums text-sm md:text-xs font-bold h-12 md:h-10"
                            placeholder="Cant."
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            value={detail.unit_price}
                            onChange={e => updateDetail(idx, 'unit_price', parseFloat(e.target.value))}
                            className="tech-input min-w-[120px] md:w-32 text-right tabular-nums text-sm md:text-xs font-bold h-12 md:h-10"
                            placeholder="Precio"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-xs font-black text-slate-900 dark:text-white">
                        {formatPrice(detail.subtotal || 0)}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button className="p-2 text-slate-400 hover:text-brand transition-colors"><Settings className="w-4 h-4" /></button>
                        <button 
                          onClick={() => removeDetail(idx)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Registration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <div className="tech-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-4 h-4 text-brand" />
                <h3 className="font-display font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-[0.2em]">Observaciones Técnicas</h3>
              </div>
              <textarea 
                placeholder="Describa irregularidades o condiciones especiales de entrega..."
                value={newPurchase.observations}
                onChange={e => setNewPurchase({...newPurchase, observations: e.target.value})}
                className="tech-input h-32 py-4 resize-none text-xs font-medium leading-relaxed italic"
              />
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-brand/[0.03] dark:bg-brand/5 border border-brand/20 rounded-lg p-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand/20 transition-all" />
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <BarChart3 className="w-4 h-4 text-brand" />
                <h3 className="font-display font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-[0.2em]">Balance de Operación</h3>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Cant. Ítems:</span>
                  <span className="text-slate-900 dark:text-white">{newPurchase.details.length}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Bruta:</span>
                  <div className="flex justify-between items-end">
                    <span className="text-3xl font-display font-black text-brand tabular-nums tracking-tighter">{formatPrice(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setView('list')}
                className="py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-[9px] rounded hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-3 h-3" /> Anular
              </button>
              <button 
                onClick={handleSubmitPurchase}
                className="py-3 bg-brand hover:bg-brand/90 text-white font-black uppercase tracking-[0.2em] text-[9px] rounded shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2 active:scale-95 border-b-4 border-brand-muted"
              >
                <CheckCircle2 className="w-4 h-4" /> Hard-Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header List */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-brand text-white rounded-lg shadow-lg shadow-brand/20">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-brand uppercase tracking-[0.3em]">Registro de Flujo</span>
              <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse-soft" />
            </div>
            <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Adquisiciones</h2>
          </div>
        </div>
        <button 
          onClick={() => setView('new')}
          className="bg-brand hover:bg-brand/90 text-white px-8 py-3.5 rounded font-black text-[10px] uppercase tracking-[0.25em] transition-all shadow-lg shadow-brand/20 active:scale-95 border-b-4 border-brand-muted"
        >
          <PlusCircle className="w-4 h-4" /> Nueva Entrada
        </button>
      </div>

      {/* Filters Search Bar */}
      <div className="tech-card border-brand/20 bg-slate-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-[100px] -mr-32 -mt-32" />
        
        <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between relative z-10 bg-white/5">
          <div className="flex items-center gap-2 text-white font-black text-[9px] uppercase tracking-[0.3em]">
            <Filter className="w-3.5 h-3.5 text-brand" />
            Parámetros de Filtrado Inteligente
          </div>
          <button onClick={fetchData} className="text-[9px] font-black text-brand/60 hover:text-brand flex items-center gap-1 uppercase tracking-widest transition-colors">
            <RefreshCw className="w-3 h-3" /> Resync System
          </button>
        </div>
        
        <div className="p-6 relative z-10">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[300px] space-y-1.5">
              <label className="text-[9px] font-black text-brand/60 uppercase tracking-widest ml-1">Búsqueda por Índice / Alias</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40 transition-colors group-focus-within:text-brand" />
                <input 
                  type="text"
                  placeholder="ID, N° FACTURA, RAZÓN SOCIAL..."
                  value={filters.search}
                  onChange={e => setFilters({...filters, search: e.target.value})}
                  className="tech-input bg-white/5 border-white/10 text-white pl-12 h-12 text-[11px] font-bold tracking-wider placeholder:text-white/20"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-fit">
              <div className="space-y-1.5 w-full md:w-40">
                <label className="text-[9px] font-black text-brand/60 uppercase tracking-widest ml-1">Fecha Inicial</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand/40" />
                  <input 
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters({...filters, startDate: e.target.value})}
                    className="tech-input bg-white/5 border-white/10 text-white pl-10 h-12 text-[10px] font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1.5 w-full md:w-40">
                <label className="text-[9px] font-black text-brand/60 uppercase tracking-widest ml-1">Fecha Final</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand/40" />
                  <input 
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters({...filters, endDate: e.target.value})}
                    className="tech-input bg-white/5 border-white/10 text-white pl-10 h-12 text-[10px] font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1.5 w-full md:w-40">
                <label className="text-[9px] font-black text-brand/60 uppercase tracking-widest ml-1">Estado de Proceso</label>
                <div className="relative">
                  <select 
                    value={filters.status}
                    onChange={e => setFilters({...filters, status: e.target.value})}
                    className="tech-input bg-white/5 border-white/10 text-white appearance-none h-12 text-[10px] font-black uppercase tracking-widest px-4 cursor-pointer"
                  >
                    <option value="Todos">Global(all)</option>
                    <option value="COMPLETED">Comp(OK)</option>
                    <option value="PENDING">Pend(wait)</option>
                    <option value="CANCELLED">Canc(err)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <button className="h-12 px-8 bg-brand hover:bg-brand/90 text-white rounded font-black text-[10px] uppercase tracking-[0.25em] shadow-lg shadow-brand/20 transition-all active:scale-95 border-b-4 border-brand-muted flex items-center gap-2">
              <Filter className="w-4 h-4" /> Ejecutar Filtro
            </button>
          </div>
        </div>
      </div>

      {/* Stats and Export Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-2">
        <div className="flex flex-wrap items-center gap-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Métricas de Control</span>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{stats.total} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight ml-1">REG</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-black text-emerald-600 tabular-nums">{stats.completed} <span className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-tight ml-1">OK</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-xs font-black text-amber-500 tabular-nums">{stats.pending} <span className="text-[10px] text-amber-500/60 font-bold uppercase tracking-tight ml-1">WAI</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-xs font-black text-rose-600 tabular-nums">{stats.cancelled} <span className="text-[10px] text-rose-500/60 font-bold uppercase tracking-tight ml-1">ERR</span></span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded font-black text-[9px] uppercase tracking-widest border-b-2 border-slate-300 dark:border-slate-700 hover:bg-slate-200 transition-all">
            <Download className="w-3.5 h-3.5" /> Data.Export(PDF)
          </button>
          <button className="flex items-center gap-2 text-white bg-emerald-600 px-4 py-2.5 rounded font-black text-[9px] uppercase tracking-widest border-b-2 border-emerald-800 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10">
            <Download className="w-3.5 h-3.5" /> Data.Export(XLS)
          </button>
        </div>
      </div>

      {/* Table List View */}
      <div className="tech-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 bg-white/50 accent-brand" />
                </th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Index</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Razón Social / Proveedor</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Almacén</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Capital Invertido</th>
                <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={9} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Accediendo a base de datos...</p>
                  </div>
                </td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={9} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Box className="w-12 h-12 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sin registros compatibles</p>
                  </div>
                </td></tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="group hover:bg-brand/[0.02] dark:hover:bg-brand/5 transition-colors cursor-default">
                    <td className="px-6 py-4"><input type="checkbox" className="w-4 h-4 rounded border-slate-300 bg-white/50 accent-brand" /></td>
                    <td className="px-4 py-4 text-[10px] font-black text-slate-500 tabular-nums">#{p.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-brand tracking-tighter italic">{p.purchase_date}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{p.number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand/10 text-brand rounded-lg group-hover:rotate-6 transition-transform">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{p.supplier_name}</p>
                          <p className="text-[9px] text-brand font-bold uppercase tracking-widest opacity-60">Vendor Verified</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate uppercase">{p.warehouse}</p>
                        <span className="text-[8px] font-black text-brand uppercase tracking-widest opacity-60">S-Unit 01</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-display font-black text-slate-900 dark:text-brand tabular-nums tracking-tighter">{formatPrice(p.total)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border-l-2 ${
                          p.status === 'COMPLETED' ? 'bg-brand/10 text-brand border-brand' :
                          p.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-500' :
                          'bg-rose-100 text-rose-700 border-rose-500'
                        }`}>
                          {p.status === 'COMPLETED' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {p.status === 'PENDING' && <Clock className="w-2.5 h-2.5" />}
                          {p.status === 'CANCELLED' && <Ban className="w-2.5 h-2.5" />}
                          {p.status === 'COMPLETED' ? 'SYS_OK' : p.status === 'PENDING' ? 'WAITING' : 'LOCKED'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button className="p-2 text-slate-400 hover:text-brand bg-slate-50 dark:bg-slate-800 rounded transition-colors" title="Export PDF"><Download className="w-3.5 h-3.5" /></button>
                        <button className="p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 dark:bg-slate-800 rounded transition-colors" title="Inspect Record"><Eye className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
