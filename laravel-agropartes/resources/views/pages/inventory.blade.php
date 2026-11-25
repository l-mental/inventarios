@extends('layouts.app')
@section('title', 'Kardex y Traspasos · AgroPartes Tractores')

@section('content')
<div x-data="inventoryPage()" x-init="load()" class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 class="text-2xl font-black uppercase italic">Kardex Valorizado y Traspasos entre Sucursales</h2>
            <p class="text-xs text-slate-500">Mueve unidades fácilmente entre Sucursal Central, Norte y Sur con vista previa inmediata.</p>
        </div>
        <div class="flex gap-2">
            <button @click="openTransferModal()" class="px-4 py-2.5 bg-brand hover:bg-brand-muted text-white rounded-xl text-xs font-black uppercase shadow">
                ⇄ Nuevo Traspaso de Sucursal
            </button>
            <button @click="exportExcel()" class="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase">
                Exportar Kardex (.xlsx)
            </button>
        </div>
    </div>

    <div x-show="message" x-cloak class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 text-emerald-700 text-xs font-bold" x-text="message"></div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-black uppercase">
        <button @click="tab = 'stock'" :class="tab === 'stock' ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900'" class="px-4 py-2 rounded-lg">Stock por Sucursal</button>
        <button @click="tab = 'transfers'" :class="tab === 'transfers' ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900'" class="px-4 py-2 rounded-lg">Historial Traspasos</button>
        <button @click="tab = 'movements'" :class="tab === 'movements' ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900'" class="px-4 py-2 rounded-lg">Movimientos Kardex</button>
    </div>

    <!-- Stock por Sucursal -->
    <div x-show="tab === 'stock'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                <tr>
                    <th class="px-4 py-3">Código</th>
                    <th class="px-4 py-3">Repuesto</th>
                    <th class="px-4 py-3 text-center">Central</th>
                    <th class="px-4 py-3 text-center">Norte</th>
                    <th class="px-4 py-3 text-center">Sur</th>
                    <th class="px-4 py-3 text-center">Total</th>
                    <th class="px-4 py-3 text-right">Valor Inventario</th>
                    <th class="px-4 py-3 text-right">Acción</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <template x-for="p in products" :key="p.id">
                    <tr>
                        <td class="px-4 py-3 font-mono font-bold text-brand" x-text="p.barcode"></td>
                        <td class="px-4 py-3 font-bold" x-text="p.name"></td>
                        <td class="px-4 py-3 text-center font-mono" x-text="branchQty(p, 'Sucursal Central')"></td>
                        <td class="px-4 py-3 text-center font-mono" x-text="branchQty(p, 'Sucursal Norte')"></td>
                        <td class="px-4 py-3 text-center font-mono" x-text="branchQty(p, 'Sucursal Sur')"></td>
                        <td class="px-4 py-3 text-center font-mono font-black" x-text="p.stock"></td>
                        <td class="px-4 py-3 text-right font-mono" x-text="money(p.stock * p.cost_price)"></td>
                        <td class="px-4 py-3 text-right">
                            <button @click="openTransferModal(p)" class="px-2.5 py-1 bg-brand/10 text-brand rounded font-black text-[10px] uppercase">Transferir</button>
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <!-- Traspasos -->
    <div x-show="tab === 'transfers'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                <tr>
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3">Repuesto</th>
                    <th class="px-4 py-3">Origen</th>
                    <th class="px-4 py-3">Destino</th>
                    <th class="px-4 py-3 text-center">Cantidad</th>
                    <th class="px-4 py-3">Responsable</th>
                    <th class="px-4 py-3">Nota</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <template x-for="t in transfers" :key="t.id">
                    <tr>
                        <td class="px-4 py-3 font-mono" x-text="new Date(t.created_at).toLocaleString()"></td>
                        <td class="px-4 py-3 font-bold" x-text="`${t.product_code} · ${t.product_name}`"></td>
                        <td class="px-4 py-3" x-text="t.from_branch"></td>
                        <td class="px-4 py-3 font-bold text-emerald-600" x-text="t.to_branch"></td>
                        <td class="px-4 py-3 text-center font-mono font-black" x-text="`${t.quantity} uds`"></td>
                        <td class="px-4 py-3" x-text="t.user_name"></td>
                        <td class="px-4 py-3 text-slate-400" x-text="t.notes || '-'"></td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <!-- Movimientos Kardex -->
    <div x-show="tab === 'movements'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                <tr>
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Repuesto</th>
                    <th class="px-4 py-3 text-center">Cantidad</th>
                    <th class="px-4 py-3">Motivo</th>
                    <th class="px-4 py-3">Usuario</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <template x-for="m in movements" :key="m.id">
                    <tr>
                        <td class="px-4 py-3 font-mono" x-text="new Date(m.created_at).toLocaleString()"></td>
                        <td class="px-4 py-3 font-black" x-text="m.type"></td>
                        <td class="px-4 py-3 font-bold" x-text="m.product_name"></td>
                        <td class="px-4 py-3 text-center font-mono font-black" x-text="`${m.quantity} uds`"></td>
                        <td class="px-4 py-3" x-text="m.reason"></td>
                        <td class="px-4 py-3" x-text="m.user_name"></td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <!-- Modal Traspaso entre Sucursales -->
    <div x-show="transferOpen" x-cloak class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div class="p-5 bg-slate-900 text-white flex justify-between items-center">
                <h3 class="font-black uppercase text-sm">Traspaso de Unidades entre Sucursales</h3>
                <button @click="transferOpen = false">✕</button>
            </div>
            <form @submit.prevent="submitTransfer()" class="p-6 space-y-4 text-xs">
                <div x-show="error" class="p-3 bg-rose-50 text-rose-700 rounded-lg font-bold" x-text="error"></div>
                <div>
                    <label class="block font-bold mb-1">Repuesto</label>
                    <select x-model.number="tForm.product_id" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold">
                        <template x-for="p in products" :key="p.id">
                            <option :value="p.id" x-text="`${p.barcode} · ${p.name} (Total: ${p.stock} uds)`"></option>
                        </template>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold mb-1">Sucursal Origen</label>
                        <select x-model="tForm.from_branch" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold">
                            <option value="Sucursal Central">Sucursal Central</option>
                            <option value="Sucursal Norte">Sucursal Norte</option>
                            <option value="Sucursal Sur">Sucursal Sur</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Sucursal Destino</label>
                        <select x-model="tForm.to_branch" class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold">
                            <option value="Sucursal Norte">Sucursal Norte</option>
                            <option value="Sucursal Sur">Sucursal Sur</option>
                            <option value="Sucursal Central">Sucursal Central</option>
                        </select>
                    </div>
                </div>
                <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between items-center">
                    <span>Disponible en <strong x-text="tForm.from_branch"></strong>: <strong class="text-brand" x-text="availableOrigin()"></strong> uds</span>
                    <span>Destino quedará con: <strong class="text-emerald-600" x-text="destAfter()"></strong> uds</span>
                </div>
                <div>
                    <label class="block font-bold mb-1">Cantidad a Pasar</label>
                    <div class="flex gap-2">
                        <input type="number" min="1" x-model.number="tForm.quantity" required class="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-mono font-black">
                        <button type="button" @click="tForm.quantity = 5" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold">+5</button>
                        <button type="button" @click="tForm.quantity = 10" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold">+10</button>
                        <button type="button" @click="tForm.quantity = availableOrigin()" class="px-2.5 py-1 bg-brand/10 text-brand rounded font-black">MAX</button>
                    </div>
                </div>
                <div>
                    <label class="block font-bold mb-1">Notas (Opcional)</label>
                    <input type="text" x-model="tForm.notes" placeholder="Ej. Reposición mostrador sucursal" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg">
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" @click="transferOpen = false" class="px-4 py-2 border rounded-lg font-bold">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-brand text-white rounded-lg font-black uppercase">Confirmar Traspaso</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function inventoryPage() {
    return {
        tab: 'stock',
        products: [],
        transfers: [],
        movements: [],
        transferOpen: false,
        message: '',
        error: '',
        tForm: { product_id: 1, from_branch: 'Sucursal Central', to_branch: 'Sucursal Norte', quantity: 1, notes: '' },
        async load() {
            const [p, t, m] = await Promise.all([
                window.apiFetch('/api/products'),
                window.apiFetch('/api/branches/transfers'),
                window.apiFetch('/api/inventory/movements'),
            ]);
            this.products = p;
            this.transfers = t;
            this.movements = m;
            if (p.length && !this.tForm.product_id) this.tForm.product_id = p[0].id;
        },
        branchQty(p, branch) {
            return Number((p.branch_stocks && p.branch_stocks[branch]) || 0);
        },
        selectedProd() {
            return this.products.find(p => p.id === Number(this.tForm.product_id));
        },
        availableOrigin() {
            const p = this.selectedProd();
            return p ? this.branchQty(p, this.tForm.from_branch) : 0;
        },
        destAfter() {
            const p = this.selectedProd();
            return (p ? this.branchQty(p, this.tForm.to_branch) : 0) + Number(this.tForm.quantity || 0);
        },
        openTransferModal(p = null) {
            this.error = '';
            this.tForm.product_id = p ? p.id : (this.products[0]?.id || 1);
            this.tForm.quantity = 1;
            this.tForm.notes = '';
            this.transferOpen = true;
        },
        async submitTransfer() {
            this.error = '';
            try {
                await window.apiFetch('/api/branches/transfer', { method: 'POST', body: JSON.stringify(this.tForm) });
                this.transferOpen = false;
                this.message = 'Traspaso ejecutado correctamente.';
                await this.load();
            } catch (e) {
                this.error = e.message;
            }
        },
        exportExcel() {
            const rows = this.products.map(p => ({
                Codigo: p.barcode,
                Repuesto: p.name,
                Marca: p.brand,
                Sucursal_Central: this.branchQty(p, 'Sucursal Central'),
                Sucursal_Norte: this.branchQty(p, 'Sucursal Norte'),
                Sucursal_Sur: this.branchQty(p, 'Sucursal Sur'),
                Total: p.stock,
                Valor_Costo: p.stock * p.cost_price
            }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Kardex');
            XLSX.writeFile(wb, `Kardex_AgroPartes_${new Date().toISOString().slice(0,10)}.xlsx`);
        }
    };
}
</script>
@endpush
