@extends('layouts.app')
@section('title', 'Catálogo de Repuestos · AgroPartes Tractores')

@section('content')
<div x-data="productsPage()" x-init="load()" class="space-y-5">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 class="text-2xl font-black uppercase italic">Catálogo de Repuestos de Tractores</h2>
            <p class="text-xs text-slate-500">91 ítems con códigos OEM, proveedor, marca, precios y control de stock mínimo (acepta 0).</p>
        </div>
        <div class="flex flex-wrap gap-2">
            <button @click="exportExcel()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase">
                Exportar Excel (.xlsx)
            </button>
            @if(auth()->user()->isAdmin())
                <button @click="openCreate()" class="px-4 py-2.5 bg-brand hover:bg-brand-muted text-white rounded-xl text-xs font-black uppercase">
                    + Nuevo Repuesto
                </button>
            @endif
        </div>
    </div>

    <!-- Filtros -->
    <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input type="text" x-model="filters.search" placeholder="Buscar código, OEM o nombre..."
               class="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">
        <select x-model="filters.brand" class="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">
            <option value="">Todas las Marcas</option>
            <template x-for="b in uniqueBrands()" :key="b"><option :value="b" x-text="b"></option></template>
        </select>
        <select x-model="filters.category" class="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">
            <option value="">Todas las Categorías</option>
            <template x-for="c in uniqueCategories()" :key="c"><option :value="c" x-text="c"></option></template>
        </select>
        <select x-model="filters.supplier" class="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">
            <option value="">Todos los Proveedores</option>
            <template x-for="s in uniqueSuppliers()" :key="s"><option :value="s" x-text="s"></option></template>
        </select>
        <select x-model="filters.status" class="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">
            <option value="">Todo Estado Stock</option>
            <option value="normal">Normal</option>
            <option value="bajo">Stock Bajo</option>
            <option value="sin_stock">Sin Stock</option>
        </select>
    </div>

    <!-- Tabla Completa con Columnas de Planilla -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                        <th class="px-4 py-3">Código / OEM</th>
                        <th class="px-4 py-3">Nombre</th>
                        <th class="px-4 py-3">Categoría</th>
                        <th class="px-4 py-3">Marca</th>
                        <th class="px-4 py-3">Unidad</th>
                        <th class="px-4 py-3">Proveedor</th>
                        <th class="px-4 py-3 text-right">P. Compra</th>
                        <th class="px-4 py-3 text-right">P. Venta</th>
                        <th class="px-4 py-3 text-center">Stock Total</th>
                        <th class="px-4 py-3 text-center">Stock Mín.</th>
                        <th class="px-4 py-3 text-center">Estado</th>
                        @if(auth()->user()->isAdmin())<th class="px-4 py-3 text-right">Acciones</th>@endif
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <template x-for="p in filtered()" :key="p.id">
                        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td class="px-4 py-3 align-top">
                                <span class="font-mono font-black text-brand" x-text="p.barcode"></span>
                                <p class="text-[10px] text-slate-400 max-w-[180px] truncate" :title="p.oem_codes" x-text="p.oem_codes"></p>
                            </td>
                            <td class="px-4 py-3 font-bold max-w-[260px]" x-text="p.name"></td>
                            <td class="px-4 py-3 text-[11px]" x-text="p.category"></td>
                            <td class="px-4 py-3 font-black text-[10px]" x-text="p.brand"></td>
                            <td class="px-4 py-3 text-[11px]" x-text="p.unit_type"></td>
                            <td class="px-4 py-3 text-[11px]" x-text="p.supplier_name"></td>
                            <td class="px-4 py-3 text-right font-mono" x-text="money(p.cost_price)"></td>
                            <td class="px-4 py-3 text-right font-mono font-black text-emerald-600" x-text="money(p.price)"></td>
                            <td class="px-4 py-3 text-center font-mono font-black" x-text="p.stock"></td>
                            <td class="px-4 py-3 text-center font-mono" x-text="p.min_stock"></td>
                            <td class="px-4 py-3 text-center">
                                <span x-show="p.stock_status === 'sin_stock'" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black uppercase">Sin stock</span>
                                <span x-show="p.stock_status === 'bajo'" class="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase">Bajo</span>
                                <span x-show="p.stock_status === 'normal'" class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">Normal</span>
                            </td>
                            @if(auth()->user()->isAdmin())
                                <td class="px-4 py-3 text-right whitespace-nowrap space-x-1">
                                    <button @click="openEdit(p)" class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold hover:text-brand">Editar</button>
                                    <button @click="remove(p)" class="px-2 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded font-bold">Baja</button>
                                </td>
                            @endif
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal Crear / Editar -->
    <div x-show="modalOpen" x-cloak class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 class="font-black uppercase text-sm" x-text="form.id ? 'Editar Repuesto' : 'Nuevo Repuesto'"></h3>
                <button @click="modalOpen = false" class="text-slate-400 font-bold">✕</button>
            </div>
            <form @submit.prevent="save()" class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs max-h-[80vh] overflow-y-auto">
                <div>
                    <label class="block font-bold mb-1">Código Interno</label>
                    <input type="text" x-model="form.barcode" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div>
                    <label class="block font-bold mb-1">Marca</label>
                    <input type="text" x-model="form.brand" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div class="sm:col-span-2">
                    <label class="block font-bold mb-1">Nombre del Repuesto</label>
                    <input type="text" x-model="form.name" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div class="sm:col-span-2">
                    <label class="block font-bold mb-1">OEM / Equivalencias</label>
                    <input type="text" x-model="form.oem_codes" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div>
                    <label class="block font-bold mb-1">Categoría</label>
                    <input type="text" x-model="form.category" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div>
                    <label class="block font-bold mb-1">Unidad</label>
                    <select x-model="form.unit_type" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                        <option value="UNIDAD">UNIDAD</option>
                        <option value="JUEGO">JUEGO</option>
                        <option value="N/A">N/A</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold mb-1">Proveedor</label>
                    <input type="text" x-model="form.supplier_name" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div>
                    <label class="block font-bold mb-1">Precio Compra</label>
                    <input type="number" step="0.01" min="0" x-model.number="form.cost_price" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div>
                    <label class="block font-bold mb-1">Precio Venta</label>
                    <input type="number" step="0.01" min="0" x-model.number="form.price" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div>
                    <label class="block font-bold mb-1">Stock Total</label>
                    <input type="number" min="0" x-model.number="form.stock" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div>
                    <label class="block font-bold mb-1">Stock Mínimo (acepta 0)</label>
                    <input type="number" min="0" x-model.number="form.min_stock" required class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div class="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" @click="modalOpen = false" class="px-4 py-2 border rounded-lg font-bold">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-brand text-white rounded-lg font-black uppercase">Guardar</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function productsPage() {
    return {
        items: [],
        modalOpen: false,
        filters: { search: '', brand: '', category: '', supplier: '', status: '' },
        form: {},
        async load() {
            this.items = await window.apiFetch('/api/products');
        },
        uniqueBrands() { return [...new Set(this.items.map(i => i.brand).filter(Boolean))].sort(); },
        uniqueCategories() { return [...new Set(this.items.map(i => i.category).filter(Boolean))].sort(); },
        uniqueSuppliers() { return [...new Set(this.items.map(i => i.supplier_name).filter(Boolean))].sort(); },
        filtered() {
            const q = this.filters.search.toLowerCase();
            return this.items.filter(p => {
                const matchSearch = !q || [p.barcode, p.oem_codes, p.name, p.brand, p.supplier_name].some(v => (v || '').toLowerCase().includes(q));
                const matchBrand = !this.filters.brand || p.brand === this.filters.brand;
                const matchCat = !this.filters.category || p.category === this.filters.category;
                const matchSup = !this.filters.supplier || p.supplier_name === this.filters.supplier;
                const matchSt = !this.filters.status || p.stock_status === this.filters.status;
                return matchSearch && matchBrand && matchCat && matchSup && matchSt;
            });
        },
        openCreate() {
            this.form = { barcode: '', oem_codes: '', name: '', category: 'MOTOR', brand: 'GENERAL', unit_type: 'UNIDAD', supplier_name: 'GENERAL', cost_price: 0, price: 0, stock: 0, min_stock: 0 };
            this.modalOpen = true;
        },
        openEdit(p) {
            this.form = { ...p };
            this.modalOpen = true;
        },
        async save() {
            const url = this.form.id ? `/api/products/${this.form.id}` : '/api/products';
            const method = this.form.id ? 'PUT' : 'POST';
            await window.apiFetch(url, { method, body: JSON.stringify(this.form) });
            this.modalOpen = false;
            await this.load();
        },
        async remove(p) {
            if (!confirm(`¿Desactivar repuesto ${p.name}?`)) return;
            await window.apiFetch(`/api/products/${p.id}`, { method: 'DELETE' });
            await this.load();
        },
        exportExcel() {
            const rows = this.filtered().map(p => ({
                Codigo: p.barcode,
                OEM_Equivalencias: p.oem_codes,
                Nombre: p.name,
                Categoria: p.category,
                Marca: p.brand,
                Unidad: p.unit_type,
                Proveedor: p.supplier_name,
                Precio_Compra: p.cost_price,
                Precio_Venta: p.price,
                Stock_Total: p.stock,
                Stock_Minimo: p.min_stock,
                Estado_Stock: p.stock_status
            }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Repuestos');
            XLSX.writeFile(wb, `Catalogo_AgroPartes_${new Date().toISOString().slice(0,10)}.xlsx`);
        }
    };
}
</script>
@endpush
