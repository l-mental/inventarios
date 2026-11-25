@extends('layouts.app')
@section('title', 'Tablero Principal · AgroPartes Tractores')

@section('content')
<div x-data="dashboardPage()" x-init="load()" class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 class="text-2xl font-black uppercase italic tracking-tight">Tablero Operativo · Repuestos Agrícolas</h2>
            <p class="text-xs text-slate-500">Resumen de ventas configurables, inventario por marca de tractor y alertas de stock.</p>
        </div>
        <div class="flex gap-2">
            <a href="{{ route('pos') }}" class="px-5 py-2.5 bg-brand hover:bg-brand-muted text-white rounded-xl text-xs font-black uppercase tracking-wider shadow">
                Ir a POS Mostrador
            </a>
            <a href="{{ route('products') }}" class="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                Ver Catálogo (91)
            </a>
        </div>
    </div>

    <!-- KPIs principales -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Recaudación Neta</p>
            <p class="text-2xl font-black font-mono mt-1 text-emerald-600" x-text="money(stats.revenue)"></p>
            <p class="text-[11px] text-slate-400 mt-1" x-text="`${stats.salesCount || 0} facturas completadas`"></p>
        </div>
        <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Unidades en Almacén</p>
            <p class="text-2xl font-black font-mono mt-1" x-text="stats.totalUnits || 0"></p>
            <p class="text-[11px] text-slate-400 mt-1" x-text="`${stats.productsCount || 0} códigos activos`"></p>
        </div>
        <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Clientes y Talleres</p>
            <p class="text-2xl font-black font-mono mt-1 text-sky-600" x-text="stats.customersCount || 0"></p>
            <p class="text-[11px] text-slate-400 mt-1">Estancias, cooperativas y mecánicos</p>
        </div>
        <div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p class="text-[10px] font-black uppercase tracking-widest text-rose-500">Repuestos Bajo Mínimo</p>
            <p class="text-2xl font-black font-mono mt-1 text-rose-600" x-text="stats.lowStock || 0"></p>
            <p class="text-[11px] text-slate-400 mt-1">Excluye ítems con mínimo = 0</p>
        </div>
    </div>

    <!-- Tarjeta de Ventas Mejorada Configurable -->
    <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h3 class="text-sm font-black uppercase tracking-wider">Desempeño de Ventas por Periodo</h3>
                <p class="text-xs text-slate-400">Selecciona día, semana, mes, bimestre, trimestre o año.</p>
            </div>
            <div class="flex flex-wrap gap-1.5">
                <template x-for="p in periods" :key="p.key">
                    <button @click="selectedPeriod = p.key"
                            :class="selectedPeriod === p.key ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'"
                            class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase" x-text="p.label"></button>
                </template>
            </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                <p class="text-[10px] font-black uppercase text-slate-400">Facturas Emitidas</p>
                <p class="text-2xl font-black font-mono mt-1" x-text="activePeriod().count"></p>
            </div>
            <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <p class="text-[10px] font-black uppercase text-emerald-600">Total Vendido</p>
                <p class="text-2xl font-black font-mono text-emerald-600 mt-1" x-text="money(activePeriod().revenue)"></p>
            </div>
            <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                <p class="text-[10px] font-black uppercase text-amber-600">Ticket Promedio</p>
                <p class="text-2xl font-black font-mono text-amber-600 mt-1" x-text="money(activePeriod().avgTicket)"></p>
            </div>
        </div>
    </div>

    <!-- Inventario por Marca de Tractor -->
    <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 class="text-sm font-black uppercase tracking-wider">Inventario por Marca de Tractor</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <template x-for="b in (stats.brandBreakdown || [])" :key="b.brand">
                <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <p class="text-[10px] font-black uppercase text-brand truncate" x-text="b.brand"></p>
                    <p class="text-xl font-black font-mono mt-1" x-text="`${b.parts_count} ítems`"></p>
                    <p class="text-[11px] text-slate-500 font-bold" x-text="`${b.total_units || 0} uds`"></p>
                </div>
            </template>
        </div>
    </div>

    <!-- Últimas Ventas -->
    <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 class="text-sm font-black uppercase tracking-wider mb-3">Últimas Ventas Completadas</h3>
        <div class="divide-y divide-slate-100 dark:divide-slate-800">
            <template x-for="s in (stats.recentSales || [])" :key="s.id">
                <div class="py-2.5 flex items-center justify-between text-xs">
                    <div>
                        <span class="font-mono font-bold">#SALE-<span x-text="String(s.id).padStart(5, '0')"></span></span>
                        <span class="text-slate-400 ml-2" x-text="s.seller"></span>
                    </div>
                    <span class="font-mono font-black text-emerald-600" x-text="money(s.total)"></span>
                </div>
            </template>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
function dashboardPage() {
    return {
        stats: {},
        selectedPeriod: 'month',
        periods: [
            { key: 'day', label: 'Día' },
            { key: 'week', label: 'Semana' },
            { key: 'month', label: 'Mes' },
            { key: 'bimonth', label: 'Bimestre' },
            { key: 'quarter', label: 'Trimestre' },
            { key: 'year', label: 'Año' },
        ],
        async load() {
            this.stats = await window.apiFetch('/api/stats');
        },
        activePeriod() {
            return (this.stats.periodMetrics && this.stats.periodMetrics[this.selectedPeriod]) || { count: 0, revenue: 0, avgTicket: 0 };
        }
    };
}
</script>
@endpush
