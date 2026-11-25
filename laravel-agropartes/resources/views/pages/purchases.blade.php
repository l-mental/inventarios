@extends('layouts.app')
@section('title', 'Compras a Proveedores · AgroPartes Tractores')

@section('content')
<div x-data="purchasesPage()" x-init="load()" class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-2xl font-black uppercase italic">Compras a Proveedores</h2>
            <p class="text-xs text-slate-500">Ingreso de mercadería con actualización automática de stock y costo.</p>
        </div>
        <button @click="modal = true" class="px-4 py-2.5 bg-brand text-white rounded-xl text-xs font-black uppercase">+ Registrar Compra</button>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                <tr>
                    <th class="px-4 py-3">N° Documento</th>
                    <th class="px-4 py-3">Proveedor</th>
                    <th class="px-4 py-3">Almacén</th>
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3 text-right">Total</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <template x-for="p in purchases" :key="p.id">
                    <tr>
                        <td class="px-4 py-3 font-mono font-bold" x-text="p.number"></td>
                        <td class="px-4 py-3 font-bold" x-text="p.supplier_name"></td>
                        <td class="px-4 py-3" x-text="p.warehouse"></td>
                        <td class="px-4 py-3 font-mono" x-text="p.purchase_date"></td>
                        <td class="px-4 py-3 text-right font-mono font-black text-emerald-600" x-text="money(p.total)"></td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <div x-show="modal" x-cloak class="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
        <form @submit.prevent="submit()" class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 space-y-4 text-xs">
            <h3 class="font-black uppercase text-sm">Registrar Ingreso de Compra</h3>
            <div class="grid grid-cols-2 gap-3">
                <input type="text" x-model="form.number" required placeholder="N° Factura" class="px-3 py-2 border rounded-lg">
                <input type="date" x-model="form.purchase_date" required class="px-3 py-2 border rounded-lg">
                <select x-model.number="form.supplier_id" class="px-3 py-2 border rounded-lg">
                    <template x-for="s in suppliers" :key="s.id"><option :value="s.id" x-text="s.name"></option></template>
                </select>
                <select x-model="form.warehouse" class="px-3 py-2 border rounded-lg">
                    <option value="Sucursal Central">Sucursal Central</option>
                    <option value="Sucursal Norte">Sucursal Norte</option>
                    <option value="Sucursal Sur">Sucursal Sur</option>
                </select>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <select x-model.number="line.product_id" class="col-span-2 px-3 py-2 border rounded-lg">
                    <template x-for="pr in products" :key="pr.id"><option :value="pr.id" x-text="`${pr.barcode} · ${pr.name}`"></option></template>
                </select>
                <input type="number" min="1" x-model.number="line.quantity" placeholder="Cant" class="px-3 py-2 border rounded-lg">
            </div>
            <input type="number" step="0.01" min="0" x-model.number="line.unit_price" placeholder="Costo Unitario" class="w-full px-3 py-2 border rounded-lg">
            <div class="flex justify-end gap-2">
                <button type="button" @click="modal = false" class="px-4 py-2 border rounded-lg font-bold">Cancelar</button>
                <button type="submit" class="px-5 py-2 bg-brand text-white rounded-lg font-black uppercase">Guardar Compra</button>
            </div>
        </form>
    </div>
</div>
@endsection

@push('scripts')
<script>
function purchasesPage() {
    return {
        purchases: [],
        suppliers: [],
        products: [],
        modal: false,
        form: { number: 'COMP-001', supplier_id: 1, warehouse: 'Sucursal Central', purchase_date: new Date().toISOString().slice(0,10) },
        line: { product_id: 1, quantity: 5, unit_price: 50 },
        async load() {
            const [pu, su, pr] = await Promise.all([
                window.apiFetch('/api/purchases'),
                window.apiFetch('/api/suppliers'),
                window.apiFetch('/api/products'),
            ]);
            this.purchases = pu;
            this.suppliers = su;
            this.products = pr;
            if (su.length) this.form.supplier_id = su[0].id;
            if (pr.length) this.line.product_id = pr[0].id;
        },
        async submit() {
            const subtotal = this.line.quantity * this.line.unit_price;
            await window.apiFetch('/api/purchases', {
                method: 'POST',
                body: JSON.stringify({ ...this.form, total: subtotal, details: [{ ...this.line, subtotal }] })
            });
            this.modal = false;
            await this.load();
        }
    };
}
</script>
@endpush
