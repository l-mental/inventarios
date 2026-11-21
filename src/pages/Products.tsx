import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Product } from '../types';
import {
  TRACTOR_CATEGORIES,
  TRACTOR_BRANDS,
  TRACTOR_UNITS,
  TRACTOR_SUPPLIERS_LIST,
  getStockStatus,
  getBrandAccent,
} from '../data/tractorPartsCatalog';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Save,
  Layers,
  X as XIcon,
  RefreshCw,
  Archive,
  BarChart3,
  TrendingDown,
  ChevronRight,
  Download,
  Upload,
  Barcode,
  Printer,
  Wrench,
  ArrowRightLeft,
  Cog,
  Truck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import BranchTransferModal from '../components/BranchTransferModal';

function BarcodeSVG({ value, height = 42 }: { value: string; height?: number }) {
  const code = value || 'REP-0001';
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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProductId, setTransferProductId] = useState<number | undefined>(undefined);
  const [selectedForLabels, setSelectedForLabels] = useState<number[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: '',
    supplier: '',
    stockStatus: 'all', // all, normal, bajo, sin_stock
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

  const handleExport = () => {
    const dataToExport = products.map(p => {
      const st = getStockStatus(p);
      return {
        Codigo: p.barcode || `REP-${p.id}`,
        OEM_Equivalencias: p.oem_codes || '',
        Nombre: p.name,
        Categoria: p.category,
        Marca: p.brand || 'GENERAL',
        Unidad: p.unit_type || 'UNIDAD',
        Proveedor: p.supplier_name || p.batch_number || 'GENERAL',
        Precio_Compra: p.cost_price || 0,
        Precio_Venta: p.price,
        Stock_Total: p.stock,
        Stock_Minimo: p.min_stock ?? 0,
        Estado_Stock: st === 'sin_stock' ? 'Sin Stock' : st === 'bajo' ? 'Bajo' : 'Normal',
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repuestos_Tractores');
    XLSX.writeFile(wb, `Catalogo_AgroPartes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async evt => {
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
            const rawMin = item.Stock_Minimo ?? item['Stock Mínimo'] ?? item.min_stock ?? 0;
            const parsedMin = Math.max(0, parseInt(String(rawMin), 10) || 0);
            const productData = {
              barcode: String(item.Codigo ?? item.Código ?? item.barcode ?? '').trim(),
              oem_codes: String(item.OEM_Equivalencias ?? item['OEM / Equivalencias'] ?? item.oem_codes ?? '').trim(),
              name: String(item.Nombre ?? item.name ?? '').trim(),
              category: String(item.Categoria ?? item.Categoría ?? item.category ?? TRACTOR_CATEGORIES[0]).trim(),
              brand: String(item.Marca ?? item.brand ?? 'GENERAL').trim(),
              unit_type: String(item.Unidad ?? item.unit_type ?? 'UNIDAD').trim(),
              supplier_name: String(item.Proveedor ?? item.supplier_name ?? 'GENERAL').trim(),
              cost_price: parseFloat(item.Precio_Compra ?? item['Precio Compra'] ?? item.cost_price ?? 0) || 0,
              price: parseFloat(item.Precio_Venta ?? item['Precio Venta'] ?? item.price ?? 0) || 0,
              stock: parseInt(String(item.Stock_Total ?? item['Stock Total'] ?? item.stock ?? 0), 10) || 0,
              min_stock: parsedMin,
              description: String(item.Descripcion ?? item.description ?? '').trim(),
            };

            if (!productData.name) continue;

            await apiFetch('/api/products', {
              method: 'POST',
              body: JSON.stringify(productData),
            });
            successCount++;
          } catch {
            errorCount++;
          }
        }

        setStatusBanner({
          type: 'success',
          text: `Importación completada. Éxito: ${successCount}, Errores: ${errorCount}`,
        });
        fetchProducts();
      } catch {
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
      setStatusBanner({ type: 'success', text: 'Repuesto retirado del catálogo activo.' });
      fetchProducts();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const openEditModal = (product?: Partial<Product>) => {
    const target: Partial<Product> = product
      ? { ...product }
      : {
          barcode: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
          oem_codes: '',
          name: '',
          category: TRACTOR_CATEGORIES[0],
          brand: TRACTOR_BRANDS[0],
          unit_type: 'UNIDAD',
          supplier_name: TRACTOR_SUPPLIERS_LIST[0],
          cost_price: 0,
          price: 0,
          stock: 0,
          min_stock: 0,
          description: '',
        };
    if (target.min_stock === undefined || target.min_stock === null) target.min_stock = 0;
    setEditingProduct(target);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const method = editingProduct.id ? 'PUT' : 'POST';
      const url = editingProduct.id ? `/api/products/${editingProduct.id}` : '/api/products';
      const minStockVal =
        editingProduct.min_stock !== undefined &&
        editingProduct.min_stock !== null &&
        String(editingProduct.min_stock) !== ''
          ? Math.max(0, Number(editingProduct.min_stock) || 0)
          : 0;

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...editingProduct,
          min_stock: minStockVal,
          batch_number: editingProduct.supplier_name || editingProduct.batch_number || 'GENERAL',
          unit_type: editingProduct.unit_type || 'UNIDAD',
        }),
      });

      setIsModalOpen(false);
      setEditingProduct(null);
      setStatusBanner({ type: 'success', text: 'Repuesto guardado en catálogo.' });
      fetchProducts();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const filteredProducts = products.filter(p => {
    const q = filters.search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.oem_codes && p.oem_codes.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q);
    const matchesCategory = filters.category === '' || p.category === filters.category;
    const matchesBrand = filters.brand === '' || (p.brand || 'GENERAL') === filters.brand;
    const matchesSupplier =
      filters.supplier === '' || (p.supplier_name || p.batch_number || '') === filters.supplier;
    const stockState = getStockStatus(p);
    const matchesStock = filters.stockStatus === 'all' || filters.stockStatus === stockState;
    return matchesSearch && matchesCategory && matchesBrand && matchesSupplier && matchesStock;
  });

  const stats = {
    total: products.length,
    totalUnits: products.reduce((acc, p) => acc + Number(p.stock || 0), 0),
    lowStock: products.filter(p => getStockStatus(p) === 'bajo').length,
    outOfStock: products.filter(p => getStockStatus(p) === 'sin_stock').length,
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Dashboard <ChevronRight className="w-3 h-3 text-brand" /> Almacén{' '}
            <ChevronRight className="w-3 h-3 text-brand" /> Catálogo de Repuestos
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand text-white rounded-xl shadow-lg shadow-brand/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                Catálogo de Repuestos de Tractores
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Código Interno, Equivalencias OEM, Marca, Proveedor, Precios y Control Multi-Sucursal
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
          <button
            onClick={() => setShowBarcodeModal(true)}
            className="p-3 text-brand bg-brand/5 border border-brand/20 rounded-lg hover:bg-brand/10 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            title="Generador e Impresión de Etiquetas"
          >
            <Barcode className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Etiquetas</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="p-3 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            title="Importar Excel/CSV"
          >
            <Upload className={`w-5 h-5 ${importing ? 'animate-bounce' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={handleExport}
            className="p-3 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            title="Exportar a Excel"
          >
            <Download className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => {
              setTransferProductId(undefined);
              setShowTransferModal(true);
            }}
            className="p-3 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            title="Traspaso de Unidades entre Sucursales"
          >
            <ArrowRightLeft className="w-5 h-5 text-brand" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Traspaso</span>
          </button>
          <button
            onClick={fetchProducts}
            className="p-3 text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            title="Sincronizar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={() => openEditModal()}
              className="bg-brand hover:bg-brand/90 text-white px-5 py-3 rounded-lg font-display font-black uppercase tracking-wider text-xs shadow-lg shadow-brand/20 transition-all active:scale-95 flex items-center gap-2 border-b-4 border-brand-muted whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nuevo Repuesto
            </button>
          )}
        </div>
      </div>

      {statusBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold uppercase tracking-wider ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button onClick={() => setStatusBanner(null)}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="tech-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Búsqueda por Código, OEM o Nombre
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
              <input
                type="text"
                placeholder="Ej. 4949, EM9532, Perkins, Retén..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:border-brand text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Categoría / Sistema
            </label>
            <div className="relative">
              <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
              <select
                value={filters.category}
                onChange={e => setFilters({ ...filters, category: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase outline-none focus:border-brand text-slate-900 dark:text-white"
              >
                <option value="">TODAS LAS CATEGORÍAS</option>
                {TRACTOR_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Proveedor
            </label>
            <div className="relative">
              <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
              <select
                value={filters.supplier}
                onChange={e => setFilters({ ...filters, supplier: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase outline-none focus:border-brand text-slate-900 dark:text-white"
              >
                <option value="">TODOS LOS PROVEEDORES</option>
                {TRACTOR_SUPPLIERS_LIST.map(sup => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Estado Stock
            </label>
            <div className="relative">
              <Archive className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
              <select
                value={filters.stockStatus}
                onChange={e => setFilters({ ...filters, stockStatus: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase outline-none focus:border-brand text-slate-900 dark:text-white"
              >
                <option value="all">TODOS LOS ESTADOS</option>
                <option value="normal">NORMAL (SOBRE MÍNIMO)</option>
                <option value="bajo">BAJO STOCK MÍNIMO</option>
                <option value="sin_stock">SIN STOCK (0)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tractor Brand Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Cog className="w-3.5 h-3.5 text-brand" /> Marca:
          </span>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, brand: '' })}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
              filters.brand === ''
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            Todas
          </button>
          {TRACTOR_BRANDS.map(brand => (
            <button
              key={brand}
              type="button"
              onClick={() => setFilters({ ...filters, brand: filters.brand === brand ? '' : brand })}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
                filters.brand === brand
                  ? 'bg-brand/10 border-brand text-brand'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand/40'
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-8 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 text-brand rounded-lg">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Repuestos</p>
            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{filteredProducts.length} / {stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Unidades en Stock
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
              {stats.totalUnits.toLocaleString()} uds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-lg">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Stock Bajo</p>
            <p className="text-sm font-black text-amber-600 tabular-nums">{stats.lowStock}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-lg">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sin Stock (0)</p>
            <p className="text-sm font-black text-rose-500 tabular-nums">{stats.outOfStock}</p>
          </div>
        </div>
      </div>

      {/* Table Section with exact Spreadsheet Columns */}
      <div className="tech-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Código / OEM
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Repuesto / Nombre
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Categoría
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Marca
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Unidad
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Proveedor
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  P. Compra
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  P. Venta
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Stock Total
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Stock Mínimo
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Estado Stock
                </th>
                <th className="px-4 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Cargando Catálogo de Repuestos...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Archive className="w-12 h-12 text-slate-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sin Resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const stockStatus = getStockStatus(product);
                  const brandStyle = getBrandAccent(product.brand);
                  const minStockVal = product.min_stock !== undefined ? product.min_stock : 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-brand/[0.02] dark:hover:bg-brand/5 transition-colors group"
                    >
                      <td className="px-4 py-3.5 align-top max-w-[180px]">
                        <p className="text-xs font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {product.barcode || `REP-${product.id}`}
                        </p>
                        <p
                          className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5"
                          title={product.oem_codes || ''}
                        >
                          {product.oem_codes || '-'}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 align-top min-w-[220px] max-w-[280px]">
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {product.name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {product.category}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-black uppercase ${brandStyle.bg} ${brandStyle.text} ${brandStyle.border}`}>
                          {product.brand || 'GENERAL'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                          {product.unit_type || 'UNIDAD'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top max-w-[160px]">
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 block truncate" title={product.supplier_name || product.batch_number || ''}>
                          {product.supplier_name || product.batch_number || 'GENERAL'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top text-right font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {formatPrice(product.cost_price || 0)}
                      </td>

                      <td className="px-4 py-3.5 align-top text-right font-mono font-black text-xs text-slate-900 dark:text-brand tabular-nums whitespace-nowrap">
                        {formatPrice(product.price)}
                      </td>

                      <td className="px-4 py-3.5 align-top text-right tabular-nums whitespace-nowrap">
                        <p className="text-xs font-mono font-black text-slate-900 dark:text-white">
                          {product.stock}
                        </p>
                        {product.branch_stocks && (
                          <p
                            className="text-[9px] font-mono text-slate-400 mt-0.5"
                            title={`Central: ${product.branch_stocks['Sucursal Central'] ?? 0} | Norte: ${product.branch_stocks['Sucursal Norte'] ?? 0} | Sur: ${product.branch_stocks['Sucursal Sur'] ?? 0}`}
                          >
                            C:{product.branch_stocks['Sucursal Central'] ?? 0} · N:{product.branch_stocks['Sucursal Norte'] ?? 0}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top text-center font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                        {minStockVal}
                      </td>

                      <td className="px-4 py-3.5 align-top text-center whitespace-nowrap">
                        {stockStatus === 'sin_stock' ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-[10px] font-black uppercase">
                            Sin Stock
                          </span>
                        ) : stockStatus === 'bajo' ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[10px] font-black uppercase">
                            Bajo
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-black uppercase">
                            Normal
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setTransferProductId(product.id);
                              setShowTransferModal(true);
                            }}
                            className="p-2 text-slate-500 hover:text-brand bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"
                            title="Traspasar unidades entre sucursales"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEditModal(product)}
                                className="p-2 text-slate-500 hover:text-brand bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-slate-500 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"
                                title="Desactivar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar Repuesto */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl overflow-hidden border border-brand/20 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand text-white rounded-xl shadow-xl shadow-brand/20">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-black tracking-tight uppercase">
                      {editingProduct?.id ? 'Actualizar Repuesto' : 'Registrar Nuevo Repuesto'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                      Código Interno, Equivalencias OEM, Marca, Proveedor y Stock Mínimo
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-brand/20 rounded-full transition-all"
                >
                  <XIcon className="w-5 h-5 text-white" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Código Interno / SKU
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct?.barcode || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      placeholder="Ej. EM9532"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Unidad
                    </label>
                    <select
                      value={editingProduct?.unit_type || 'UNIDAD'}
                      onChange={e => setEditingProduct({ ...editingProduct, unit_type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {TRACTOR_UNITS.map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nombre del Repuesto
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct?.name || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      placeholder="Ej. PISTON + ANILLA 100MM Ø P=38MM EMMARK"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      OEM / Equivalencias
                    </label>
                    <input
                      type="text"
                      value={editingProduct?.oem_codes || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, oem_codes: e.target.value })}
                      placeholder="Ej. EM9532 Fiat 450 480 540 640 8770770..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Categoría
                    </label>
                    <select
                      required
                      value={editingProduct?.category || TRACTOR_CATEGORIES[0]}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {TRACTOR_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Marca de Tractor
                    </label>
                    <select
                      value={editingProduct?.brand || TRACTOR_BRANDS[0]}
                      onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {TRACTOR_BRANDS.map(b => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Proveedor
                    </label>
                    <select
                      value={editingProduct?.supplier_name || TRACTOR_SUPPLIERS_LIST[0]}
                      onChange={e => setEditingProduct({ ...editingProduct, supplier_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {TRACTOR_SUPPLIERS_LIST.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Precio Compra
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingProduct?.cost_price ?? 0}
                      onChange={e =>
                        setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Precio Venta
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editingProduct?.price ?? 0}
                      onChange={e =>
                        setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Stock Total
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={editingProduct?.stock !== undefined ? editingProduct.stock : 0}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10));
                        setEditingProduct({ ...editingProduct, stock: isNaN(val) ? 0 : val });
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Stock Mínimo
                      </label>
                      <span className="text-[9px] text-brand font-bold">Permite 0 (sin alerta)</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editingProduct?.min_stock !== undefined ? editingProduct.min_stock : 0}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10));
                        setEditingProduct({ ...editingProduct, min_stock: isNaN(val) ? 0 : val });
                      }}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Observaciones / Descripción Técnica
                    </label>
                    <input
                      type="text"
                      value={editingProduct?.description || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-brand text-white font-display font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Repuesto
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Generador e Impresión de Etiquetas */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Barcode className="w-5 h-5 text-brand" />
                <div>
                  <h3 className="font-display font-black uppercase tracking-wider text-sm">
                    Etiquetas de Identificación de Repuestos
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Seleccione los repuestos e imprima planilla para estantería de almacén
                  </p>
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
                {products.slice(0, 30).map(p => {
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
                      [{p.barcode || p.id}] {p.name.slice(0, 28)}
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
                      <p className="text-[9px] font-black uppercase tracking-widest text-brand">AGROPARTES PRO</p>
                      <p className="text-[11px] font-black uppercase line-clamp-2 w-full leading-tight">{p.name}</p>
                      <p className="text-[9px] font-mono text-slate-500">
                        {p.brand || 'GENERAL'} · {p.category}
                      </p>
                      <div className="w-full py-1 text-slate-900">
                        <BarcodeSVG value={p.barcode || `REP-${String(p.id).padStart(4, '0')}`} />
                      </div>
                      <div className="flex items-center justify-between w-full pt-1 border-t border-slate-100 text-[10px] font-mono">
                        <span className="text-slate-500 truncate max-w-[90px]">{p.supplier_name || 'OEM'}</span>
                        <span className="font-black text-xs">{formatPrice(p.price)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Traspaso entre Sucursales */}
      <BranchTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={fetchProducts}
        initialProductId={transferProductId}
      />
    </div>
  );
}
