@extends('layouts.app')
@section('title', 'Historial de Ventas y Anulaciones · AgroPartes')

@section('content')
<div x-data="salesPage()" x-init="load()" class="space-y-5">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 class="text-2xl font-black uppercase italic">Historial de Ventas y Anulación de Facturas</h2>
            <p class="text-xs text-slate-500">Consulta comprobantes, envía por WhatsApp o anula facturas devolviendo stock automáticamente.</p>
        </div>
        <div class="flex gap-2 text-xs font-black uppercase">
            <button @click="status = 'all'" :class="status === 'all' ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900'" class="px-3 py-2 rounded-lg">Todas</button>
            <button @click="status = 'COMPLETED'" :class="status === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900'" class="px-3 py-2 rounded-lg">Completadas</button>
            <button @click="status = 'CANCELLED'" :class="status === 'CANCELLED' ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-900'" class="px-3 py-2 rounded-lg">Anuladas</button>
        </div>
    </div>

    <div x-show="banner" x-cloak class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold" x-text="banner"></div>

    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                <tr>
                    <th class="px-4 py-3">N° Factura</th>
                    <th class="px-4 py-3">Vendedor</th>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3">Pago</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3 text-right">Total</th>
                    <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <template x-for="s in filtered()" :key="s.id">
                    <tr>
                        <td class="px-4 py-3 font-mono font-bold">#SALE-<span x-text="String(s.id).padStart(5, '0')"></span></td>
                        <td class="px-4 py-3" x-text="s.seller_name"></td>
                        <td class="px-4 py-3" x-text="s.customer_name"></td>
                        <td class="px-4 py-3 font-mono text-slate-400" x-text="new Date(s.created_at).toLocaleString()"></td>
                        <td class="px-4 py-3 font-black uppercase" x-text="s.payment_method"></td>
                        <td class="px-4 py-3">
                            <span x-show="s.status === 'COMPLETED'" class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">Completada</span>
                            <span x-show="s.status === 'CANCELLED'" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-black uppercase">Anulada</span>
                        </td>
                        <td class="px-4 py-3 text-right font-mono font-black" :class="s.status === 'CANCELLED' ? 'line-through text-slate-400' : ''" x-text="money(s.total)"></td>
                        <td class="px-4 py-3 text-right space-x-1">
                            <button @click="viewDetail(s.id)" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-bold">Detalle</button>
                            <button x-show="s.status === 'COMPLETED'" @click="openCancel(s)" class="px-2.5 py-1 bg-rose-50 text-rose-600 rounded font-black">Anular</button>
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <!-- Modal Detalle -->
    <div x-show="detail" x-cloak class="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-xl p-6 space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="font-black uppercase text-sm">Comprobante #SALE-<span x-text="detail && String(detail.id).padStart(5, '0')"></span></h3>
                <button @click="detail = null">✕</button>
            </div>
            <div class="border rounded-xl overflow-hidden">
                <table class="w-full text-xs">
                    <thead class="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th class="p-2.5 text-left">Repuesto / Código</th>
                            <th class="p-2.5 text-center">Cant.</th>
                            <th class="p-2.5 text-right">Precio Unit.</th>
                            <th class="p-2.5 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        <template x-for="d in (detail?.details || [])" :key="d.id">
                            <tr>
                                <td class="p-2.5 font-bold" x-text="d.product_name"></td>
                                <td class="p-2.5 text-center font-mono" x-text="`${d.quantity} uds`"></td>
                                <td class="p-2.5 text-right font-mono" x-text="money(d.unit_price)"></td>
                                <td class="p-2.5 text-right font-mono font-black" x-text="money(d.subtotal)"></td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
            <div class="flex justify-between items-center pt-2">
                <button @click="window.print()" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase">Imprimir</button>
                <span class="text-lg font-black font-mono text-brand" x-text="money(detail?.total)"></span>
            </div>
        </div>
    </div>

    <!-- Modal Anular Factura -->
    <div x-show="cancelTarget" x-cloak class="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 space-y-4 border border-rose-200">
            <h3 class="font-black uppercase text-rose-600 text-sm">Anular Factura y Devolver Stock</h3>
            <p class="text-xs text-slate-500">Las unidades vendidas volverán al inventario y se excluirá el total de la recaudación.</p>
            <select x-model="cancelReason" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs font-bold">
                <option>Error en la digitación o productos seleccionados</option>
                <option>Cliente canceló la compra o solicitó devolución</option>
                <option>Cambio de forma de pago o corrección de datos</option>
                <option>Factura / Comprobante duplicado</option>
            </select>
            <textarea x-model="cancelNotes" rows="2" placeholder="Observación adicional..." class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs"></textarea>
            <div class="flex justify-end gap-2">
                <button @click="cancelTarget = null" class="px-4 py-2 border rounded-lg text-xs font-bold">Regresar</button>
                <button @click="confirmCancel()" class="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-black uppercase">Confirmar Anulación</button>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function salesPage() {
    return {
        sales: [],
        status: 'all',
        detail: null,
        cancelTarget: null,
        cancelReason: 'Error en la digitación o productos seleccionados',
        cancelNotes: '',
        banner: '',
        async load() {
            this.sales = await window.apiFetch('/api/sales');
        },
        filtered() {
            return this.status === 'all' ? this.sales : this.sales.filter(s => s.status === this.status);
        },
        async viewDetail(id) {
            this.detail = await window.apiFetch(`/api/sales/${id}`);
        },
        openCancel(s) {
            this.cancelTarget = s;
            this.cancelNotes = '';
        },
        async confirmCancel() {
            const reason = this.cancelNotes ? `${this.cancelReason} - ${this.cancelNotes}` : this.cancelReason;
            await window.apiFetch(`/api/sales/${this.cancelTarget.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
            this.banner = `Factura #SALE-${String(this.cancelTarget.id).padStart(5, '0')} anulada y stock devuelto.`;
            this.cancelTarget = null;
            await this.load();
        }
    };
}
</script>
@endpush
