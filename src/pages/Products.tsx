import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useApi } from '../hooks/useApi';
import { Product } from '../types';
import CalaminaImage from '../components/CalaminaImage';
import {
  CALAMINA_CATEGORIES,
  CALAMINA_DESIGNS,
  CALAMINA_COLOR_SWATCHES,
  CALAMINA_THICKNESSES,
  CALAMINA_IMAGES,
  formatMeter,
} from '../lib/calaminaCatalog';
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
  Ruler,
  ArrowRightLeft,
  Palette,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import BranchTransferModal from '../components/BranchTransferModal';

function BarcodeSVG({ value, height = 42 }: { value: string; height?: number }) {
  const code = value || 'CAL-000001';
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
  const [comboComponents, setComboComponents] = useState<{ product_id: number; quantity: number }[]>([]);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    color: '',
    stockStatus: 'all', // all, low, out, combos
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
    const dataToExport = products.map(p => ({
      ID: p.id,
      Codigo_SKU: p.barcode || '',
      Nombre: p.name,
      Categoria: p.category,
      Diseno: p.design_type || '',
      Color: p.color_name || '',
      Espesor: p.thickness || '',
      Ancho_Util_m: p.width_m || 0.85,
      Largo_Estandar_m: p.standard_length_m || 3.0,
      Bobina_Lote: p.batch_number || '',
      Costo_Por_Metro: p.cost_price || 0,
      Precio_Por_Metro: p.price,
      Stock_Metros: p.stock,
      Stock_Minimo_Metros: p.min_stock ?? 0,
      Es_Pack: p.is_combo ? 'SI' : 'NO',
      Descripcion: p.description || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalogo_Calaminas');
    XLSX.writeFile(wb, `Catalogo_AcerTecho_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            const productData = {
              name: item.Nombre || item.name || '',
              description: item.Descripcion || item.Descripción || item.description || '',
              price: parseFloat(item.Precio_Por_Metro || item.Precio_Venta || item.Precio || item.price || 0),
              cost_price: parseFloat(item.Costo_Por_Metro || item.Costo_Unitario || item.cost_price || 0),
              stock: parseFloat(item.Stock_Metros || item.Stock || item.stock || 0),
              min_stock: parseFloat(item.Stock_Minimo_Metros || item.min_stock || 0),
              category: item.Categoria || item.Categoría || item.category || CALAMINA_CATEGORIES[0],
              design_type: item.Diseno || item.design_type || CALAMINA_DESIGNS[0],
              color_name: item.Color || item.color_name || 'Zinc Galvanizado',
              thickness: item.Espesor || item.thickness || '0.35 mm',
              width_m: parseFloat(item.Ancho_Util_m || item.width_m || 0.85),
              standard_length_m: parseFloat(item.Largo_Estandar_m || item.standard_length_m || 3.0),
              barcode: item.Codigo_SKU || item.Codigo_Barras || item.barcode || '',
              batch_number: item.Bobina_Lote || item.Lote || item.batch_number || '',
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
      setStatusBanner({ type: 'success', text: 'Material retirado del catálogo activo.' });
      fetchProducts();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const isLowStock = (p: Product) => {
    const minThreshold = p.min_stock !== undefined ? p.min_stock : 0;
    if (minThreshold === 0) {
      return p.stock < 0;
    }
    return p.stock <= minThreshold;
  };

  const openEditModal = (product?: Partial<Product>) => {
    const target: Partial<Product> = product
      ? { ...product }
      : {
          category: CALAMINA_CATEGORIES[0],
          design_type: CALAMINA_DESIGNS[0],
          color_name: CALAMINA_COLOR_SWATCHES[0].name,
          color_hex: CALAMINA_COLOR_SWATCHES[0].hex,
          image_url: CALAMINA_IMAGES.zincOndulada,
          thickness: '0.35 mm',
          width_m: 0.85,
          standard_length_m: 3.0,
          unit_type: 'm',
          barcode: `CAL-${Math.floor(100000 + Math.random() * 900000)}`,
          batch_number: `BOB-26-${Math.floor(100 + Math.random() * 900)}`,
          expiry_date: '2030-12-31',
          is_combo: 0,
          stock: 0,
          min_stock: 0,
        };
    if (target.min_stock === undefined) target.min_stock = 0;
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
      const minStockVal =
        editingProduct?.min_stock !== undefined &&
        editingProduct?.min_stock !== null &&
        String(editingProduct?.min_stock) !== ''
          ? Math.max(0, parseFloat(String(editingProduct.min_stock)) || 0)
          : 0;

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...editingProduct,
          min_stock: minStockVal,
          combo_items: editingProduct?.is_combo ? JSON.stringify(comboComponents) : null,
        }),
      });

      setIsModalOpen(false);
      setEditingProduct(null);
      setStatusBanner({ type: 'success', text: 'Material sincronizado en catálogo.' });
      fetchProducts();
    } catch (err: any) {
      if (err.message !== 'Sesión expirada') setStatusBanner({ type: 'error', text: err.message });
    }
  };

  const filteredProducts = products.filter(p => {
    const q = filters.search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.color_name && p.color_name.toLowerCase().includes(q)) ||
      (p.design_type && p.design_type.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.batch_number && p.batch_number.toLowerCase().includes(q));
    const matchesCategory = filters.category === '' || p.category === filters.category;
    const matchesColor = filters.color === '' || p.color_name === filters.color;
    const matchesStock =
      filters.stockStatus === 'all' ||
      (filters.stockStatus === 'low' && isLowStock(p) && p.stock >= 0) ||
      (filters.stockStatus === 'out' && p.stock <= 0) ||
      (filters.stockStatus === 'combos' && Boolean(p.is_combo));
    return matchesSearch && matchesCategory && matchesColor && matchesStock;
  });

  const stats = {
    total: products.length,
    totalMeters: Number(products.reduce((acc, p) => acc + (p.stock || 0), 0).toFixed(2)),
    lowStock: products.filter(p => isLowStock(p) && p.stock >= 0).length,
    combos: products.filter(p => Boolean(p.is_combo)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
            Dashboard <ChevronRight className="w-3 h-3 text-brand" /> Inventario{' '}
            <ChevronRight className="w-3 h-3 text-brand" /> Catálogo de Calaminas
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand text-white rounded-xl shadow-lg shadow-brand/20">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                Catálogo por Medición
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Perfiles, Colores, Calibres (mm), Ancho Útil y Metraje por Sucursal
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx, .xls, .csv" />
          <button
            onClick={() => setShowBarcodeModal(true)}
            className="p-3 text-brand bg-brand/5 border border-brand/20 rounded-lg hover:bg-brand/10 transition-all shadow-sm flex items-center gap-2"
            title="Generador e Impresión de Etiquetas"
          >
            <Barcode className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Etiquetas</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="p-3 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            title="Importar Excel/CSV"
          >
            <Upload className={`w-5 h-5 ${importing ? 'animate-bounce' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Importar</span>
          </button>
          <button
            onClick={handleExport}
            className="p-3 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
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
            className="p-3 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
            title="Traspaso de Metraje entre Sucursales"
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
              className="bg-brand hover:bg-brand/90 text-white px-5 py-3 rounded-lg font-display font-black uppercase tracking-wider text-xs shadow-lg shadow-brand/20 transition-all active:scale-95 flex items-center gap-2 border-b-4 border-brand-muted"
            >
              <Plus className="w-4 h-4" />
              Nueva Calamina / Pack
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Búsqueda por Diseño, Código o Bobina
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
              <input
                type="text"
                placeholder="Ondulada, Teja, SKU o Bobina..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Perfil / Categoría
            </label>
            <div className="relative">
              <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
              <select
                value={filters.category}
                onChange={e => setFilters({ ...filters, category: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase outline-none focus:border-brand"
              >
                <option value="">TODOS LOS PERFILES</option>
                {CALAMINA_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Estado de Stock (Metros)
            </label>
            <div className="relative">
              <Archive className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand/50" />
              <select
                value={filters.stockStatus}
                onChange={e => setFilters({ ...filters, stockStatus: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase outline-none focus:border-brand"
              >
                <option value="all">TODOS LOS MATERIALES</option>
                <option value="low">ALERTA: BAJO STOCK MÍNIMO</option>
                <option value="out">SIN METRAJE (0 m)</option>
                <option value="combos">SOLO PACKS DE TECHO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Color Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-brand" /> Color:
          </span>
          <button
            type="button"
            onClick={() => setFilters({ ...filters, color: '' })}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase border transition-all ${
              filters.color === ''
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            Todos
          </button>
          {CALAMINA_COLOR_SWATCHES.map(sw => (
            <button
              key={sw.name}
              type="button"
              onClick={() => setFilters({ ...filters, color: filters.color === sw.name ? '' : sw.name })}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1.5 transition-all ${
                filters.color === sw.name
                  ? 'bg-brand/10 border-brand text-brand'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="w-3 h-3 rounded-full border border-black/15" style={{ backgroundColor: sw.hex }} />
              {sw.name}
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Referencias</p>
            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
            <Ruler className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
              Metraje Total en Stock
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
              {formatMeter(stats.totalMeters)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-lg">
            <TrendingDown className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Stock Bajo</p>
            <p className="text-sm font-black text-rose-500 tabular-nums">{stats.lowStock}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Packs Techo</p>
            <p className="text-sm font-black text-amber-600 tabular-nums">{stats.combos}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="tech-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Calamina / Diseño / Color
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Especificaciones de Medición
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Bobina / Categoría
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Costo / Precio (m)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Metraje en Stock
                </th>
                {isAdmin && (
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                        Cargando Catálogo de Calaminas...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <Archive className="w-12 h-12 text-slate-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sin Resultados</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const cost = product.cost_price || Number((product.price * 0.65).toFixed(2));
                  const margin = product.price > 0 ? Math.round(((product.price - cost) / product.price) * 100) : 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-brand/[0.02] dark:hover:bg-brand/5 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <CalaminaImage product={product} aspectClass="w-16 h-12 shrink-0" showColorDot />
                          <div className="min-w-0">
                            <p className="text-xs font-display font-extrabold text-slate-900 dark:text-white truncate tracking-tight leading-snug">
                              {product.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {product.barcode || `CAL-${String(product.id).padStart(4, '0')}`} ·{' '}
                              <span className="text-slate-600 dark:text-slate-300 font-sans font-semibold">
                                {product.color_name || 'Galvanizado'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-slate-700 dark:text-slate-200">
                            {product.design_type || product.category}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            Calibre {product.thickness || '0.35 mm'} · Ancho {product.width_m || 0.85} m · Corte Base{' '}
                            {product.standard_length_m || 3.0} m
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{product.category}</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            Bobina: {product.batch_number || 'BOB-GEN'}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right tabular-nums">
                        <p className="text-sm font-display font-black text-slate-900 dark:text-brand">
                          {formatPrice(product.price)} / m
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Costo: {formatPrice(cost)} · Margen {margin}%
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 w-36">
                          <div className="flex justify-between items-center text-[11px] font-black tabular-nums">
                            <span className={isLowStock(product) ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}>
                              {formatMeter(product.stock)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              Mín: {product.min_stock !== undefined ? product.min_stock : 0} m
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isLowStock(product) ? 'bg-rose-500' : 'bg-brand'
                              }`}
                              style={{ width: `${Math.min((product.stock / 500) * 100, 100)}%` }}
                            />
                          </div>
                          {product.branch_stocks && (
                            <div
                              className="text-[9px] text-slate-400 truncate font-mono"
                              title={`Central: ${product.branch_stocks['Sucursal Central'] ?? 0} m | Norte: ${product.branch_stocks['Sucursal Norte'] ?? 0} m`}
                            >
                              Cent: {product.branch_stocks['Sucursal Central'] ?? 0} m · Nort:{' '}
                              {product.branch_stocks['Sucursal Norte'] ?? 0} m
                            </div>
                          )}
                        </div>
                      </td>

                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setTransferProductId(product.id);
                                setShowTransferModal(true);
                              }}
                              className="p-2 text-slate-500 hover:text-brand bg-slate-50 dark:bg-slate-800 rounded-lg transition-colors"
                              title="Traspasar metros a otra sucursal"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
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

      {/* Modal Crear/Editar Calamina o Pack */}
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
                    <Ruler className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-black tracking-tight uppercase">
                      {editingProduct?.id ? 'Actualizar Calamina' : 'Registrar Nueva Calamina / Pack'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                      Especificaciones Técnicas, Color, Espesor y Metraje
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
                {/* Preview & Color Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CalaminaImage product={editingProduct || {}} aspectClass="h-24 w-full" showColorDot />
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Color y Acabado Visual
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CALAMINA_COLOR_SWATCHES.map(sw => {
                        const active = editingProduct?.color_name === sw.name;
                        return (
                          <button
                            key={sw.name}
                            type="button"
                            onClick={() =>
                              setEditingProduct({
                                ...editingProduct,
                                color_name: sw.name,
                                color_hex: sw.hex,
                                image_url: sw.image,
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 border transition-all ${
                              active
                                ? 'bg-brand/10 border-brand text-brand'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: sw.hex }}
                            />
                            <span className="truncate">{sw.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Toggle Individual vs Pack */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                      ¿Es un Pack de Cubierta Combinado?
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Descuenta automáticamente el metraje de sus materiales componentes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({ ...editingProduct, is_combo: editingProduct?.is_combo ? 0 : 1 })
                    }
                    className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all ${
                      editingProduct?.is_combo
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {editingProduct?.is_combo ? 'Sí, es Pack Techo' : 'Material Individual'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nombre Comercial de la Calamina
                    </label>
                    <input
                      type="text"
                      required
                      value={editingProduct?.name || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      placeholder="Ej. Calamina Trapezoidal TR4 Azul Rey 0.40mm"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Categoría
                    </label>
                    <select
                      required
                      value={editingProduct?.category || CALAMINA_CATEGORIES[0]}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {CALAMINA_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Diseño / Perfil Laminado
                    </label>
                    <select
                      value={editingProduct?.design_type || CALAMINA_DESIGNS[0]}
                      onChange={e => setEditingProduct({ ...editingProduct, design_type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    >
                      {CALAMINA_DESIGNS.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Espesor / Calibre
                    </label>
                    <select
                      value={editingProduct?.thickness || '0.35 mm'}
                      onChange={e => setEditingProduct({ ...editingProduct, thickness: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    >
                      {CALAMINA_THICKNESSES.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Código SKU / Bobina
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editingProduct?.barcode || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                        placeholder="CAL-SKU"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={editingProduct?.batch_number || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, batch_number: e.target.value })}
                        placeholder="BOB-26"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Ancho Útil (m) y Largo Base (m)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        value={editingProduct?.width_m ?? 0.85}
                        onChange={e =>
                          setEditingProduct({ ...editingProduct, width_m: parseFloat(e.target.value) || 0.85 })
                        }
                        placeholder="Ancho (m)"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={editingProduct?.standard_length_m ?? 3.0}
                        onChange={e =>
                          setEditingProduct({
                            ...editingProduct,
                            standard_length_m: parseFloat(e.target.value) || 3.0,
                          })
                        }
                        placeholder="Largo Base (m)"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Costo / Precio Venta por Metro (Bs/m)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingProduct?.cost_price ?? ''}
                        onChange={e =>
                          setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) })
                        }
                        placeholder="Costo/m"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={editingProduct?.price ?? ''}
                        onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                        placeholder="Venta/m"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Stock Disponible Total (Metros)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={editingProduct?.stock !== undefined ? editingProduct.stock : ''}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setEditingProduct({ ...editingProduct, stock: isNaN(val) ? 0 : val });
                      }}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Stock Mínimo (m)
                      </label>
                      <span className="text-[9px] text-brand font-bold">Permite 0 (sin alerta)</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editingProduct?.min_stock !== undefined ? editingProduct.min_stock : 0}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value));
                        setEditingProduct({ ...editingProduct, min_stock: isNaN(val) ? 0 : val });
                      }}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Descripción Técnica
                    </label>
                    <input
                      type="text"
                      value={editingProduct?.description || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Combo Builder */}
                {Boolean(editingProduct?.is_combo) && (
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300">
                        Materiales que integran este Pack de Techo
                      </p>
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
                        + Añadir Material
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
                          {products
                            .filter(p => !p.is_combo)
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={comp.quantity}
                          onChange={e => {
                            const updated = [...comboComponents];
                            updated[idx].quantity = Math.max(0.5, parseFloat(e.target.value) || 1);
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
                    className="flex-1 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-brand text-white font-display font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Calamina
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
                    Etiquetas de Identificación de Bobinas y Planchas
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Seleccione las calaminas e imprima planilla para almacén
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
                      <p className="text-[9px] font-black uppercase tracking-widest text-brand">ACERTECHO PRO</p>
                      <p className="text-[11px] font-black uppercase truncate w-full">{p.name}</p>
                      <p className="text-[9px] font-mono text-slate-500">
                        {p.thickness || '0.35 mm'} · {p.color_name || 'Galv.'}
                      </p>
                      <div className="w-full py-1 text-slate-900">
                        <BarcodeSVG value={p.barcode || `CAL-${String(p.id).padStart(6, '0')}`} />
                      </div>
                      <div className="flex items-center justify-between w-full pt-1 border-t border-slate-100 text-[10px] font-mono">
                        <span className="text-slate-500">{p.batch_number || 'BOB-26'}</span>
                        <span className="font-black text-xs">{formatPrice(p.price)}/m</span>
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
