@extends('layouts.app')
@section('title', 'POS Mostrador · AgroPartes Tractores')

@section('content')
<div x-data="posPage()" x-init="load()" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Catálogo POS -->
    <div class="lg:col-span-8 space-y-4">
        <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div class="flex flex-wrap gap-2 items-center justify-between">
                <input type="text" x-model="search" placeholder="Buscar por código interno, OEM, nombre o proveedor..."
                       class="flex-1 min-w-[240px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
                <div class="flex items-center gap-2 text-xs">
                    <span class="px-3 py-2 rounded-xl font-black uppercase" :class="cashSession ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'">
                        <span x-text="cashSession ? `Caja Abierta (${money(cashSession.expected_amount)})` : 'Caja Cerrada'"></span>
                    </span>
                    <button @click="cashModal = true" class="px-3 py-2 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px]">Arqueo Caja</button>
                </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
                <button @click="brand = ''" :class="brand === '' ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'" class="px-3 py-1 rounded-lg text-[10px] font-black uppercase">Todas</button>
                <template x-for="b in ['MASSEY FERGUSON','NEW HOLLAND','FIAT','VALMET VALTRA','UNIVERSAL','GENERAL','TODOS']" :key="b">
                    <button @click="brand = b" :class="brand === b ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'" class="px-3 py-1 rounded-lg text-[10px] font-black uppercase" x-text="b"></button>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[68vh] overflow-y-auto pr-1">
            <template x-for="p in filteredProducts()" :key="p.id">
                <div @click="addToCart(p)"
                     class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand cursor-pointer transition shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center text-[10px] font-black uppercase">
                            <span class="font-mono text-brand" x-text="p.barcode"></span>
                            <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800" x-text="p.brand"></span>
                        </div>
                        <h4 class="text-xs font-bold mt-2 line-clamp-2" x-text="p.name"></h4>
                        <p class="text-[10px] text-slate-400 truncate mt-1" x-text="p.oem_codes"></p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span class="text-sm font-black font-mono text-emerald-600" x-text="money(p.price)"></span>
                        <span class="text-[10px] font-bold" :class="p.stock > 0 ? 'text-slate-500' : 'text-rose-600'" x-text="`${p.stock} ${p.unit_type}`"></span>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <!-- Carrito / Checkout -->
    <div class="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4 h-fit sticky top-4">
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <h3 class="font-black uppercase text-sm">Carrito de Despacho</h3>
                <button @click="cart = []" class="text-[10px] font-bold text-rose-500 uppercase">Vaciar</button>
            </div>

            <select x-model="customerId" class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold">
                <option value="">Consumidor Final</option>
                <template x-for="c in customers" :key="c.id">
                    <option :value="c.id" x-text="`${c.name} (${c.points} pts)`"></option>
                </template>
            </select>

            <div class="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                <template x-for="(item, idx) in cart" :key="item.id">
                    <div class="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <div class="min-w-0 flex-1">
                            <p class="font-bold truncate" x-text="item.name"></p>
                            <p class="text-[10px] text-slate-400 font-mono" x-text="`${item.barcode} · ${money(item.price)}`"></p>
                        </div>
                        <div class="flex items-center gap-1">
                            <button @click="changeQty(idx, -1)" class="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 font-black">-</button>
                            <input type="number" min="1" x-model.number="item.quantity" class="w-10 text-center font-mono font-bold bg-transparent">
                            <button @click="changeQty(idx, 1)" class="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 font-black">+</button>
                        </div>
                        <button @click="cart.splice(idx, 1)" class="text-rose-500 font-bold ml-1">✕</button>
                    </div>
                </template>
            </div>
        </div>

        <div class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div class="grid grid-cols-2 gap-2 text-[10px] font-black uppercase">
                <button @click="paymentMethod = 'CASH'" :class="paymentMethod === 'CASH' ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'" class="py-2 rounded-lg">Efectivo</button>
                <button @click="paymentMethod = 'QR'" :class="paymentMethod === 'QR' ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'" class="py-2 rounded-lg">QR / Transf.</button>
                <button @click="paymentMethod = 'MIXED'" :class="paymentMethod === 'MIXED' ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'" class="py-2 rounded-lg">Mixto</button>
                <button @click="paymentMethod = 'CREDIT'" :class="paymentMethod === 'CREDIT' ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'" class="py-2 rounded-lg">Crédito</button>
            </div>

            <div x-show="paymentMethod === 'MIXED'" class="grid grid-cols-2 gap-2 text-xs">
                <input type="number" x-model.number="cashAmount" placeholder="Efectivo" class="px-2.5 py-1.5 border rounded-lg">
                <input type="number" x-model.number="qrAmount" placeholder="QR" class="px-2.5 py-1.5 border rounded-lg">
            </div>
            <div x-show="paymentMethod === 'CREDIT'" class="text-xs">
                <input type="number" x-model.number="paidAmount" placeholder="Anticipo recibido (0 si es todo fiado)" class="w-full px-2.5 py-1.5 border rounded-lg">
            </div>

            <div class="flex justify-between items-center text-lg font-black">
                <span>TOTAL:</span>
                <span class="font-mono text-brand" x-text="money(cartTotal())"></span>
            </div>

            <div x-show="feedback" class="p-2.5 rounded-lg text-xs font-bold" :class="feedbackType === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'" x-text="feedback"></div>

            <div class="grid grid-cols-2 gap-2">
                <button @click="saveQuotation()" :disabled="!cart.length" class="py-3 bg-slate-800 text-white rounded-xl text-xs font-black uppercase disabled:opacity-40">Proforma</button>
                <button @click="checkout()" :disabled="!cart.length" class="py-3 bg-brand hover:bg-brand-muted text-white rounded-xl text-xs font-black uppercase disabled:opacity-40">Cobrar Venta</button>
            </div>
        </div>
    </div>

    <!-- Modal Caja -->
    <div x-show="cashModal" x-cloak class="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div class="flex justify-between items-center">
                <h3 class="font-black uppercase text-sm">Arqueo de Caja</h3>
                <button @click="cashModal = false">✕</button>
            </div>
            <template x-if="!cashSession">
                <div class="space-y-3 text-xs">
                    <label class="block font-bold">Monto Inicial Apertura</label>
                    <input type="number" x-model.number="openAmt" class="w-full px-3 py-2 border rounded-lg font-mono">
                    <button @click="openCash()" class="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-black uppercase">Abrir Caja</button>
                </div>
            </template>
            <template x-if="cashSession">
                <div class="space-y-3 text-xs">
                    <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                        <p>Apertura: <strong x-text="money(cashSession.opening_amount)"></strong></p>
                        <p>Ventas Efectivo: <strong x-text="money(cashSession.cash_sales)"></strong></p>
                        <p>Esperado en Caja: <strong class="text-emerald-600" x-text="money(cashSession.expected_amount)"></strong></p>
                    </div>
                    <label class="block font-bold">Monto Real al Cierre</label>
                    <input type="number" x-model.number="closeAmt" class="w-full px-3 py-2 border rounded-lg font-mono">
                    <button @click="closeCash()" class="w-full py-2.5 bg-rose-600 text-white rounded-lg font-black uppercase">Cerrar Turno de Caja</button>
                </div>
            </template>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function posPage() {
    return {
        products: [],
        customers: [],
        cashSession: null,
        search: '',
        brand: '',
        cart: [],
        customerId: '',
        paymentMethod: 'CASH',
        cashAmount: 0,
        qrAmount: 0,
        paidAmount: 0,
        feedback: '',
        feedbackType: 'ok',
        cashModal: false,
        openAmt: 500,
        closeAmt: 0,
        async load() {
            const [p, c, cash] = await Promise.all([
                window.apiFetch('/api/products'),
                window.apiFetch('/api/customers'),
                window.apiFetch('/api/cash/current'),
            ]);
            this.products = p;
            this.customers = c;
            this.cashSession = cash.session;
            this.closeAmt = cash.session ? cash.session.expected_amount : 0;
        },
        filteredProducts() {
            const q = this.search.toLowerCase();
            return this.products.filter(p => {
                const mBrand = !this.brand || p.brand === this.brand;
                const mQ = !q || [p.barcode, p.oem_codes, p.name, p.supplier_name].some(v => (v || '').toLowerCase().includes(q));
                return mBrand && mQ;
            });
        },
        addToCart(p) {
            if (p.stock <= 0) {
                this.feedbackType = 'err';
                this.feedback = `Sin stock disponible para ${p.name}`;
                return;
            }
            const existing = this.cart.find(i => i.id === p.id);
            if (existing) {
                if (existing.quantity < p.stock) existing.quantity++;
            } else {
                this.cart.push({ id: p.id, barcode: p.barcode, name: p.name, price: p.price, stock: p.stock, quantity: 1 });
            }
        },
        changeQty(idx, delta) {
            const item = this.cart[idx];
            const next = item.quantity + delta;
            if (next <= 0) this.cart.splice(idx, 1);
            else if (next <= item.stock) item.quantity = next;
        },
        cartTotal() {
            return this.cart.reduce((s, i) => s + i.price * i.quantity, 0);
        },
        async checkout() {
            this.feedback = '';
            try {
                const res = await window.apiFetch('/api/sales', {
                    method: 'POST',
                    body: JSON.stringify({
                        items: this.cart,
                        total: this.cartTotal(),
                        customer_id: this.customerId ? Number(this.customerId) : null,
                        payment_method: this.paymentMethod,
                        cash_amount: this.cashAmount,
                        qr_amount: this.qrAmount,
                        paid_amount: this.paidAmount,
                        with_invoice: true
                    })
                });
                this.cart = [];
                this.feedbackType = 'ok';
                this.feedback = `Venta #${res.id} registrada con éxito.`;
                await this.load();
            } catch (e) {
                this.feedbackType = 'err';
                this.feedback = e.message;
            }
        },
        async saveQuotation() {
            try {
                const res = await window.apiFetch('/api/quotations', {
                    method: 'POST',
                    body: JSON.stringify({
                        items: this.cart,
                        total: this.cartTotal(),
                        customer_id: this.customerId ? Number(this.customerId) : null,
                    })
                });
                this.feedbackType = 'ok';
                this.feedback = `Proforma #${res.id} guardada.`;
                this.cart = [];
            } catch (e) {
                this.feedbackType = 'err';
                this.feedback = e.message;
            }
        },
        async openCash() {
            await window.apiFetch('/api/cash/open', { method: 'POST', body: JSON.stringify({ opening_amount: this.openAmt }) });
            this.cashModal = false;
            await this.load();
        },
        async closeCash() {
            await window.apiFetch('/api/cash/close', { method: 'POST', body: JSON.stringify({ closing_amount: this.closeAmt, expected_amount: this.cashSession.expected_amount }) });
            this.cashModal = false;
            await this.load();
        }
    };
}
</script>
@endpush
