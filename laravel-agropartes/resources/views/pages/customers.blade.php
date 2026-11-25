@extends('layouts.app')
@section('title', 'Clientes y Talleres · AgroPartes Tractores')

@section('content')
<div x-data="customersPage()" x-init="load()" class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-2xl font-black uppercase italic">Clientes, Estancias y Talleres</h2>
            <p class="text-xs text-slate-500">Fidelidad por puntos, contacto WhatsApp y cobranza de créditos.</p>
        </div>
        <button @click="openNew()" class="px-4 py-2.5 bg-brand text-white rounded-xl text-xs font-black uppercase">+ Nuevo Cliente</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <template x-for="c in customers" :key="c.id">
            <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-black text-sm" x-text="c.name"></h4>
                        <p class="text-[11px] font-bold text-amber-600" x-text="`${c.points || 0} puntos acumulados`"></p>
                    </div>
                    <button @click="openEdit(c)" class="text-xs text-slate-400 hover:text-brand font-bold">Editar</button>
                </div>
                <div class="text-xs text-slate-500 space-y-1">
                    <p x-text="c.email || 'Sin correo'"></p>
                    <p class="font-mono" x-text="c.phone || 'Sin teléfono'"></p>
                    <p x-text="c.address || 'Sin dirección'"></p>
                </div>
                <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span class="text-xs font-mono font-black" :class="c.credit_balance > 0 ? 'text-rose-600' : 'text-emerald-600'"
                          x-text="c.credit_balance > 0 ? `Debe: ${money(c.credit_balance)}` : 'Sin Deuda'"></span>
                    <button x-show="c.credit_balance > 0" @click="payFirstCredit(c)" class="px-3 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase">Cobrar</button>
                </div>
            </div>
        </template>
    </div>

    <div x-show="modal" x-cloak class="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
        <form @submit.prevent="save()" class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 space-y-3 text-xs">
            <h3 class="font-black uppercase text-sm" x-text="form.id ? 'Editar Cliente' : 'Nuevo Cliente'"></h3>
            <input type="text" x-model="form.name" required placeholder="Nombre / Estancia / Taller" class="w-full px-3 py-2 border rounded-lg">
            <input type="email" x-model="form.email" placeholder="Correo" class="w-full px-3 py-2 border rounded-lg">
            <input type="text" x-model="form.phone" placeholder="Teléfono WhatsApp" class="w-full px-3 py-2 border rounded-lg">
            <input type="text" x-model="form.address" placeholder="Dirección" class="w-full px-3 py-2 border rounded-lg">
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" @click="modal = false" class="px-4 py-2 border rounded-lg font-bold">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-brand text-white rounded-lg font-black uppercase">Guardar</button>
            </div>
        </form>
    </div>
</div>
@endsection

@push('scripts')
<script>
function customersPage() {
    return {
        customers: [],
        credits: [],
        modal: false,
        form: {},
        async load() {
            const [c, cr] = await Promise.all([window.apiFetch('/api/customers'), window.apiFetch('/api/credits')]);
            this.customers = c;
            this.credits = cr;
        },
        openNew() { this.form = { name: '', email: '', phone: '', address: '' }; this.modal = true; },
        openEdit(c) { this.form = { ...c }; this.modal = true; },
        async save() {
            const url = this.form.id ? `/api/customers/${this.form.id}` : '/api/customers';
            await window.apiFetch(url, { method: this.form.id ? 'PUT' : 'POST', body: JSON.stringify(this.form) });
            this.modal = false;
            await this.load();
        },
        async payFirstCredit(c) {
            const pending = this.credits.find(cr => cr.customer_id === c.id && cr.balance_due > 0);
            if (!pending) return;
            const amount = prompt(`Saldo pendiente ${window.money(pending.balance_due)}. Ingrese abono:`, pending.balance_due);
            if (!amount) return;
            await window.apiFetch('/api/credits/pay', { method: 'POST', body: JSON.stringify({ sale_id: pending.id, amount: Number(amount), payment_method: 'CASH' }) });
            await this.load();
        }
    };
}
</script>
@endpush
