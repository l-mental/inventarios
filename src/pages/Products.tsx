import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Product } from '../types';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  Search, 
  Save, 
  Tag, 
  DollarSign, 
  Layers, 
  X as XIcon,
  RefreshCw, 
  AlertCircle, 
  Archive,
  BarChart3,
  TrendingDown,
  ChevronRight,
  Download,
  Upload,
  Sparkles,
  Barcode,
  Calendar,
  Printer,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const CATEGORIES = ['Farmacia', 'Higiene', 'Protección', 'Material Médico', 'Equipos', 'Suplementos', 'Cuidado Personal', 'Diagnóstico', 'Dermatología', 'Promociones', 'Electrónica', 'Alimentos', 'Hogar', 'Otros'];

// Pure SVG Barcode Renderer (Code-128 style visual bars from string)
function BarcodeSVG({ value, height = 42 }: { value: string; height?: number }) {
  const code = value || '777010000001';
  const bars: number[] = [];
  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    bars.push((charCode % 3) + 1);
    bars.push(((charCode >> 2) % 2) + 1);
    bars.push(((charCode >> 4) % 3) + 1);
  }
  const totalUnits = bars.reduce((a, b) => a + b + 1, 6);
  let currentX = 3;

  return (
    <svg viewBox={`0 0 ${totalUnits * 2} ${height}`} className="w-full h-12">
      <rect x="0" y="0" width="2" height={height} fill="currentColor" />
      <rect x="3" y="0" width="1" height={height} fill="currentColor" />
      {bars.map((w, idx) => {
        const x = currentX * 2;
        currentX += w + 1;
        return <rect key={idx} x={x} y="0" width={w * 1.5} height={height - 10} fill="currentColor" />;
      })}
      <text
        x={totalUnits}
        y={height - 1}
        textAnchor="middle"
        fontSize="8"
        fontFamily="monospace"
        fontWeight="bold"
        fill="currentColor"
      >
        {code}
      </text>
    </svg>
  );
}

export default function Products() {
  const { formatPrice } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedForLabels, setSelectedForLabels] = useState<number[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [comboComponents, setComboComponents] = useState<{ product_id: number; quantity: number }[]>([]);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    stockStatus: 'all' // all, low, out, expiring, combos
  });
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { token, user } = useAuth();
  const { apiFetch } = useApi();

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const fetchProducts = () => {
    setLoading(true);
    apiFetch('/api/products')
      .then((data: Product[]) => {
        setProducts(data);
        if (selectedForLabels.length === 0) {
          setSelectedForLabels(data.slice(0, 8).map(p => p.id));
        }
      })
      .catch(err => {
        if (err.message !== 'Sesión expirada') console.error('Error fetching products:', err);
      })
      .finally(() => setLoading(false));
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: 'NONE', label: 'Sin Vencimiento', days: 999 };
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'EXPIRED', label: `Vencido (${Math.abs(diffDays)}d)`, days: diffDays };
    if (diffDays <= 60) return { status: 'SOON', label: `Vence en ${diffDays}d`, days: diffDays };
    return { status: 'OK', label: expiryDate, days: diffDays };
  };

  const handleExport = () => {
    const dataToExport = products.map(p => ({
      ID: p.id,
      Codigo_Barras: p.barcode || '',
      Nombre: p.name,
      Categoria: p.category,
      Lote: p.batch_number || '',
      Fecha_Vencimiento: p.expiry_date || '',
      Costo_Unitario: p.cost_price || 0,
      Precio_Venta: p.price,
      Stock: p.stock,
      Es_Combo: p.is_combo ? 'SI' : 'NO',
      Descripcion: p.description || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catalogo_Productos");
    XLSX.writeFile(wb, `Catalogo_Softplus_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let successCount = 0;
        let errorCount = 0;

        for (const item of data) {
          try {
            const productData = {
              name: item.Nombre || item.name || '',
              description: item.Descripcion || item.Descripción || item.description || '',
              price: parseFloat(item.Precio_Venta || item.Precio || item.price || 0),
              cost_price: parseFloat(item.Costo_Unitario || item.cost_price || 0),
              stock: parseInt(item.Stock || item.stock || 0),
              category: item.Categoria || item.Categoría || item.category || 'Otros',
              barcode: item.Codigo_Barras || item.barcode || '',
              batch_number: item.Lote || item.batch_number || '',
              expiry_date: item.Fecha_Vencimiento || item.expiry_date || ''
            };

            if (!productData.name) continue;

            await apiFetch('/api/products', {
              method: 'POST',
              body: JSON.stringify(productData)
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }

        setStatusBanner({ type: 'success', text: `Importación completada. Éxito: ${successCount}, Errores: ${errorCount}` });
        fetchProducts();
      } catch (err) {
        setStatusBanner({ type: 'error', text: 'Error al leer el archivo Excel/CSV.' });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      setStatusBanner({ type: 'success', text: 'Producto desactivado del catálogo.' });
      fetchProducts();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const openEditModal = (product?: Partial<Product>) => {
    const target = product || {
      category: CATEGORIES[0],
      barcode: `777010${Math.floor(100000 + Math.random() * 900000)}`,
      batch_number: `LOT-26-${Math.floor(100 + Math.random() * 900)}`,
      expiry_date: '2027-06-30',
      is_combo: 0
    };
    setEditingProduct(target);
    if (target.combo_items) {
      try {
        setComboComponents(JSON.parse(target.combo_items));
      } catch {
        setComboComponents([]);
      }
    } else {
      setComboComponents([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingProduct?.id ? 'PUT' : 'POST';
      const url = editingProduct?.id ? `/api/products/${editingProduct.id}` : '/api/products';

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...editingProduct,
          combo_items: editingProduct?.is_combo ? JSON.stringify(comboComponents) : null
        })
      });

      setIsModalOpen(false);
      setEditingProduct(null);
      setStatusBanner({ type: 'success', text: 'Producto sincronizado correctamente.' });
      fetchProducts();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(filters.search.toLowerCase()) || 
                         p.category.toLowerCase().includes(filters.search.toLowerCase()) ||
                         (p.barcode && p.barcode.toLowerCase().includes(filters.search.toLowerCase())) ||
                         (p.batch_number && p.batch_number.toLowerCase().includes(filters.search.toLowerCase()));
    const matchesCategory = filters.category === '' || p.category === filters.category;
    const expInfo = getExpiryStatus(p.expiry_date);
    const matchesStock = filters.stockStatus === 'all' || 
                        (filters.stockStatus === 'low' && p.stock > 0 && p.stock < 10) ||
                        (filters.stockStatus === 'out' && p.stock <= 0) ||
                        (filters.stockStatus === 'expiring' && (expInfo.status === 'SOON' || expInfo.status === 'EXPIRED')) ||
                        (filters.stockStatus === 'combos' && Boolean(p.is_combo));
    return matchesSearch && matchesCategory && matchesStock;
  });

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock > 0 && p.stock < 10).length,
    expiringSoon: products.filter(p => {
      const s = getExpiryStatus(p.expiry_date).status;
      return s === 'SOON' || s === 'EXPIRED';
    }).length,
    combos: products.filter(p => Boolean(p.is_combo)).length
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Dashboard <ChevronRight className="w-3 h-3 text-brand" /> Inventario <ChevronRight className="w-3 h-3 text-brand" /> Catálogo Avanzado
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand text-white rounded shadow-lg shadow-brand/20">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Gestión Catálogo</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lotes, Vencimientos, Códigos de Barra y Combos</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
          />
          <button 
            onClick={() => setShowBarcodeModal(true)}
            className="p-3 text-brand bg-brand/5 border border-brand/20 rounded hover:bg-brand/10 transition-all shadow-sm flex items-center gap-2"
            title="Generador e Impresión de Etiquetas de Códigos de Barras"
          >
            <Barcode className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Etiquetas / Códigos</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="p-3 text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            title="Importar desde Excel/CSV"
          >
            <Upload className={`w-5 h-5 ${importing ? 'animate-bounce' : ''}`} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Importar</span>
          </button>
          <button 
            onClick={handleExport}
            className="p-3 text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            title="Exportar a Excel"
          >
            <Download className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Exportar</span>
          </button>
          <button 
            onClick={fetchProducts}
            className="p-3 text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 transition-all shadow-sm"
            title="Sincronizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={() => openEditModal()}
              className="bg-brand hover:bg-brand/90 text-white px-6 py-3.5 rounded font-display font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-brand/20 transition-all active:scale-95 flex items-center gap-2 border-b-4 border-brand-muted italic"
            >
              <Plus className="w-4 h-4" />
              Ingresar Activo / Combo
            </button>
          )}
        </div>
      </div>

      {statusBanner && (
        <div className={`p-4 rounded border-l-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider ${statusBanner.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-700 dark:text-rose-300'}`}>
          <span>{statusBanner.text}</span>
          <button onClick={() => setStatusBanner(null)}><XIcon className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-brand/5 dark:bg-slate-900/40 rounded border border-brand/20 dark:border-slate-800 shadow-xl overflow-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Búsqueda por Nombre, Código o Lote</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
              <input 
                type="text"
                placeholder="NOMBRE, CÓDIGO DE BARRAS O LOTE..."
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-brand/10 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Clasificación</label>
            <div className="relative">
              <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
              <select 
                value={filters.category}
                onChange={e => setFilters({...filters, category: e.target.value})}
                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest appearance-none outline-none focus:ring-4 focus:ring-brand/10 transition-all"
              >
                <option value="">TODAS LAS CATEGORÍAS</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Filtro Operativo / Vencimiento</label>
            <div className="relative">
              <Archive className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/40" />
              <select 
                value={filters.stockStatus}
                onChange={e => setFilters({...filters, stockStatus: e.target.value})}
                className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-black uppercase tracking-widest appearance-none outline-none focus:ring-4 focus:ring-brand/10 transition-all"
              >
                <option value="all">TODOS LOS ACTIVOS</option>
                <option value="expiring">ALERTA: PRÓXIMOS A VENCER (&lt;60 DÍAS)</option>
                <option value="combos">SOLO COMBOS / KITS PROMOCIONALES</option>
                <option value="low">ALERTA: STOCK BAJO (&lt;10 UNI)</option>
                <option value="out">SIN EXISTENCIAS (AGOTADO)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-8 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Activos</p>
            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Por Vencer (&lt;60d)</p>
            <p className="text-sm font-black text-amber-500 tabular-nums">{stats.expiringSoon}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Stock Bajo</p>
            <p className="text-sm font-black text-rose-500 tabular-nums">{stats.lowStock}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Combos / Kits</p>
            <p className="text-sm font-black text-indigo-500 tabular-nums">{stats.combos}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="tech-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto / Código Barras</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Lote y Vencimiento</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Costo / Venta</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                {isAdmin && <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Leyendo Base de Activos...</p>
                  </div>
                </td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Archive className="w-12 h-12 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sin Resultados</p>
                  </div>
                </td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const exp = getExpiryStatus(product.expiry_date);
                  const cost = product.cost_price || Number((product.price * 0.6).toFixed(2));
                  const margin = product.price > 0 ? Math.round(((product.price - cost) / product.price) * 100) : 0;

                  return (
                    <tr key={product.id} className="hover:bg-brand/[0.02] dark:hover:bg-brand/5 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded flex items-center justify-center ${product.is_combo ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-brand group-hover:text-white'} transition-all`}>
                            {product.is_combo ? <Layers className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-display font-black text-slate-900 dark:text-white truncate uppercase tracking-tight italic leading-none mb-1">
                              {product.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {product.barcode || `777010${String(product.id).padStart(6, '0')}`}
                              {product.is_combo ? ' · PACK PROMOCIONAL' : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                            Lote: {product.batch_number || 'LOT-GEN'}
                          </p>
                          <p className={`text-[10px] font-black uppercase tracking-wider ${
                            exp.status === 'EXPIRED' ? 'text-rose-600' :
                            exp.status === 'SOON' ? 'text-amber-500' :
                            'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {exp.status === 'EXPIRED' ? '🔴 ' : exp.status === 'SOON' ? '🟠 ' : '🟢 '}
                            {exp.label}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right tabular-nums">
                        <p className="text-sm font-display font-black text-slate-900 dark:text-brand">{formatPrice(product.price)}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Costo: {formatPrice(cost)} · Margen {margin}%
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 w-28">
                          <div className="flex justify-between items-center text-[10px] font-black tabular-nums">
                            <span className={product.stock < 10 ? 'text-rose-500' : 'text-emerald-500'}>
                              {product.stock.toString().padStart(3, '0')} UNI
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${product.stock < 10 ? 'bg-rose-500' : 'bg-brand'}`}
                              style={{ width: `${Math.min((product.stock / 50) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              onClick={() => openEditModal(product)}
                              className="p-2 text-slate-500 hover:text-brand bg-slate-50 dark:bg-slate-800 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-slate-500 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar Activo o Combo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden border border-brand/20 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand text-white rounded shadow-xl shadow-brand/20">
                    <Archive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-black tracking-tight uppercase italic">
                      {editingProduct?.id ? 'Actualizar Activo' : 'Registrar Activo / Combo'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                      Control de Lotes, Costos, Códigos de Barras y Kits
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-brand/20 rounded-full transition-all">
                  <XIcon className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {/* Toggle Product vs Combo */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">¿Es un Combo / Pack Promocional?</p>
                    <p className="text-[10px] text-slate-400">Al venderse descontará automáticamente el stock de sus componentes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({ ...editingProduct, is_combo: editingProduct?.is_combo ? 0 : 1 })}
                    className={`px-4 py-2 rounded font-black text-[10px] uppercase tracking-wider transition-all ${
                      editingProduct?.is_combo
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {editingProduct?.is_combo ? 'Sí, es Combo' : 'Producto Individual'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre Comercial</label>
                    <input
                      type="text"
                      required
                      value={editingProduct?.name || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Código de Barras (EAN / SKU)</label>
                    <input
                      type="text"
                      value={editingProduct?.barcode || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                    <select
                      required
                      value={editingProduct?.category || CATEGORIES[0]}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo Unitario (Compra)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct?.cost_price ?? ''}
                      onChange={e => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio Unitario (Venta)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingProduct?.price ?? ''}
                      onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Número de Lote</label>
                    <input
                      type="text"
                      value={editingProduct?.batch_number || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, batch_number: e.target.value })}
                      placeholder="LOT-2026-A1"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      value={editingProduct?.expiry_date || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, expiry_date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock Disponible</label>
                    <input
                      type="number"
                      required
                      value={editingProduct?.stock ?? ''}
                      onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                    <input
                      type="text"
                      value={editingProduct?.description || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Combo Builder */}
                {Boolean(editingProduct?.is_combo) && (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300">Productos que integran este Combo</p>
                      <button
                        type="button"
                        onClick={() => {
                          const firstProd = products.find(p => !p.is_combo);
                          if (firstProd) {
                            setComboComponents([...comboComponents, { product_id: firstProd.id, quantity: 1 }]);
                          }
                        }}
                        className="px-3 py-1 bg-amber-600 text-white rounded text-[9px] font-black uppercase"
                      >
                        + Añadir Componente
                      </button>
                    </div>
                    {comboComponents.map((comp, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={comp.product_id}
                          onChange={e => {
                            const updated = [...comboComponents];
                            updated[idx].product_id = Number(e.target.value);
                            setComboComponents(updated);
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {products.filter(p => !p.is_combo).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={comp.quantity}
                          onChange={e => {
                            const updated = [...comboComponents];
                            updated[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                            setComboComponents(updated);
                          }}
                          className="w-20 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setComboComponents(comboComponents.filter((_, i) => i !== idx))}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-brand text-white font-display font-black uppercase tracking-[0.2em] text-[10px] rounded shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Activo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Generador e Impresión de Etiquetas de Códigos de Barras */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Barcode className="w-5 h-5 text-brand" />
                <div>
                  <h3 className="font-display font-black uppercase tracking-wider text-sm italic">Generador de Etiquetas de Códigos de Barras</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Seleccione los productos e imprima planilla adhesiva</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-brand text-white rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Planilla
                </button>
                <button onClick={() => setShowBarcodeModal(false)} className="p-1.5 hover:bg-white/10 rounded-full">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              <div className="flex flex-wrap gap-2">
                {products.map(p => {
                  const selected = selectedForLabels.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedForLabels(prev =>
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border ${
                        selected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                {products
                  .filter(p => selectedForLabels.includes(p.id))
                  .map(p => (
                    <div
                      key={p.id}
                      className="p-4 bg-white text-slate-900 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center text-center space-y-1.5"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">SOFTPLUS</p>
                      <p className="text-[11px] font-black uppercase truncate w-full">{p.name}</p>
                      <div className="w-full py-1 text-slate-900">
                        <BarcodeSVG value={p.barcode || `777010${String(p.id).padStart(6, '0')}`} />
                      </div>
                      <div className="flex items-center justify-between w-full pt-1 border-t border-slate-100 text-[10px] font-mono">
                        <span className="text-slate-500">{p.batch_number || 'LOT-26'}</span>
                        <span className="font-black text-sm">{formatPrice(p.price)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
