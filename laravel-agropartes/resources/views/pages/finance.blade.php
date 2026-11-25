@extends('layouts.app')
@section('title', 'Finanzas y Reportes · AgroPartes Tractores')

@section('content')
<div x-data="financePage()" x-init="load()" class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-2xl font-black uppercase italic">Finanzas, Rentabilidad y Gastos</h2>
            <p class="text-xs text-slate-500">Utilidad bruta, costos de mercadería vendida, gastos operativos y exportación contable.</p>
        </div>
        <button @click="exportExcel()" class="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase">Exportar Contabilidad (.xlsx)</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border"><p class="text-[10px] uppercase font-bold text-slate-400">Ventas Brutas</p><p class="text-xl font-black font-mono" x-text="money(summary.revenue)"></p></div>
        <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border"><p class="text-[10px] uppercase font-bold text-slate-400">Ganancia Bruta</p><p class="text-xl font-black font-mono text-sky-600" x-text="money(summary.grossProfit)"></p></div>
        <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border"><p class="text-[10px] uppercase font-bold text-rose-500">Gastos Operativos</p><p class="text-xl font-black font-mono text-rose-600" x-text="`-${money(summary.totalExpenses)}`"></p></div>
        <div class="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-300"><p class="text-[10px] uppercase font-bold text-emerald-700">Utilidad Neta Real</p><p class="text-xl font-black font-mono text-emerald-600" x-text="money(summary.netProfit)"></p></div>
        <div class="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300"><p class="text-[10px] uppercase font-bold text-amber-700">Cuentas por Cobrar</p><p class="text-xl font-black font-mono text-amber-600" x-text="money(summary.pendingCredits)"></p></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form @submit.prevent="addExpense()" class="p-5 bg-white dark:bg-slate-900 rounded-2xl border space-y-3 text-xs h-fit">
            <h3 class="font-black uppercase text-sm">Registrar Gasto</h3>
            <select x-model="newExp.category" class="w-full px-3 py-2 border rounded-lg">
                <option>Alquiler</option>
                <option>Servicios Básicos</option>
                <option>Sueldos y Comisiones</option>
                <option>Logística y Transporte</option>
                <option>Otros Gastos</option>
            </select>
            <input type="text" x-model="newExp.description" required placeholder="Concepto" class="w-full px-3 py-2 border rounded-lg">
            <input type="number" step="0.01" min="0.01" x-model.number="newExp.amount" required placeholder="Monto" class="w-full px-3 py-2 border rounded-lg font-mono">
            <input type="date" x-model="newExp.expense_date" required class="w-full px-3 py-2 border rounded-lg">
            <button type="submit" class="w-full py-2.5 bg-brand text-white rounded-lg font-black uppercase">Guardar Gasto</button>
        </form>

        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                    <tr><th class="p-3">Fecha</th><th class="p-3">Categoría</th><th class="p-3">Descripción</th><th class="p-3 text-right">Monto</th></tr>
                </thead>
                <tbody class="divide-y">
                    <template x-for="e in expenses" :key="e.id">
                        <tr>
                            <td class="p-3 font-mono" x-text="e.expense_date"></td>
                            <td class="p-3 font-bold" x-text="e.category"></td>
                            <td class="p-3" x-text="e.description"></td>
                            <td class="p-3 text-right font-mono font-black text-rose-600" x-text="`-${money(e.amount)}`"></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function financePage() {
    return {
        summary: {},
        expenses: [],
        newExp: { category: 'Alquiler', description: '', amount: '', expense_date: new Date().toISOString().slice(0,10) },
        async load() {
            const [s, e] = await Promise.all([window.apiFetch('/api/finance/summary'), window.apiFetch('/api/expenses')]);
            this.summary = s;
            this.expenses = e;
        },
        async addExpense() {
            await window.apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(this.newExp) });
            this.newExp.description = '';
            this.newExp.amount = '';
            await this.load();
        },
        exportExcel() {
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.summary.productProfitability || []), 'Rentabilidad');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(this.expenses), 'Gastos');
            XLSX.writeFile(wb, `Reporte_Contable_AgroPartes_${new Date().toISOString().slice(0,10)}.xlsx`);
        }
    };
}
</script>
@endpush
