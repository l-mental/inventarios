<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'AgroPartes Tractores S.R.L. | Sistema POS e Inventario')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: { DEFAULT: '#ea580c', muted: '#c2410c' }
                    }
                }
            }
        };
    </script>
    <style>
        [x-cloak] { display: none !important; }
        .corrugated-bar {
            height: 4px;
            background: repeating-linear-gradient(90deg, #ea580c 0 18px, #0f172a 18px 24px);
        }
    </style>
</head>
<body class="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased"
      x-data="globalLayout()" x-init="init()">
<div class="flex h-screen overflow-hidden">
    <!-- Mobile backdrop -->
    <div x-show="sidebarOpen" x-cloak @click="sidebarOpen = false"
         class="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 lg:hidden"></div>

    <!-- Sidebar -->
    <aside :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
           class="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-transform lg:static lg:translate-x-0">
        <div class="corrugated-bar w-full shrink-0"></div>
        <div class="h-16 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div class="w-9 h-9 bg-brand rounded-lg flex items-center justify-center text-white font-black shadow">A</div>
            <div>
                <h1 class="font-black text-base tracking-tight uppercase italic leading-none">AgroPartes</h1>
                <p class="text-[10px] text-brand font-black uppercase tracking-widest mt-0.5">Pro · Laravel 11</p>
            </div>
        </div>

        <nav class="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-bold uppercase tracking-wider">
            <a href="{{ route('dashboard') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('dashboard') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Tablero Principal</span>
            </a>
            <a href="{{ route('pos') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('pos') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Cotizar / POS Mostrador</span>
            </a>
            <a href="{{ route('purchases') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('purchases') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Compras Proveedores</span>
            </a>
            <div class="pt-2 pb-1 px-3 text-[10px] text-slate-400">Almacén y Stock</div>
            <a href="{{ route('products') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('products') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Catálogo Repuestos (91)</span>
            </a>
            <a href="{{ route('inventory') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('inventory') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Kardex y Traspasos</span>
            </a>
            <a href="{{ route('sales') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('sales') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Historial Ventas / Anular</span>
            </a>
            <a href="{{ route('finance') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('finance') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Finanzas y Reportes</span>
            </a>
            <a href="{{ route('customers') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('customers') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                <span>Clientes y Talleres</span>
            </a>

            @if(auth()->user()->isAdmin())
                <div class="pt-2 pb-1 px-3 text-[10px] text-slate-400">Administración</div>
                <a href="{{ route('users') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('users') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                    <span>Equipo / Staff</span>
                </a>
                <a href="{{ route('audit') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('audit') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                    <span>Seguridad / Auditoría</span>
                </a>
                <a href="{{ route('settings') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-lg {{ request()->routeIs('settings') ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800' }}">
                    <span>Configuración</span>
                </a>
            @endif
        </nav>

        <div class="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div class="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center gap-2.5">
                <div class="w-8 h-8 rounded bg-brand/15 text-brand flex items-center justify-center font-black">
                    {{ substr(auth()->user()->full_name, 0, 1) }}
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-bold truncate">{{ auth()->user()->full_name }}</p>
                    <p class="text-[10px] uppercase text-slate-400 font-bold">{{ auth()->user()->role_name }}</p>
                </div>
            </div>
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button type="submit" class="w-full py-2 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg">
                    Cerrar Sesión
                </button>
            </form>
        </div>
    </aside>

    <!-- Main Container -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div class="corrugated-bar w-full shrink-0"></div>
        <header class="h-16 px-6 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
                <button @click="sidebarOpen = true" class="lg:hidden px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    Menú
                </button>
                <div class="text-[11px] font-black uppercase tracking-widest text-slate-400">
                    <span class="text-brand">{{ $settings['company_name'] ?? 'AgroPartes Tractores S.R.L.' }}</span>
                    <span class="hidden sm:inline"> · Repuestos Agrícolas & OEM</span>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button @click="toggleTheme()" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase">
                    <span x-text="dark ? 'Modo Día' : 'Modo Noche'"></span>
                </button>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto p-6">
            <div class="max-w-[1600px] mx-auto">
                @yield('content')
            </div>
        </main>
    </div>
</div>

<!-- Tarjeta Flotante Configurable de Ventas (Día / Semana / Mes / Bimestre / Trimestre / Año) -->
<div class="fixed bottom-4 right-4 z-40 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
    <div class="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
        <span class="text-[10px] font-black uppercase tracking-widest text-brand">Resumen Ventas En Vivo</span>
        <button @click="widgetMinimized = !widgetMinimized" class="text-xs text-slate-300 hover:text-white font-bold" x-text="widgetMinimized ? '+' : '—'"></button>
    </div>
    <div x-show="!widgetMinimized" class="p-4 space-y-3">
        <select x-model="widgetPeriod" @change="localStorage.setItem('agro_widget_period', widgetPeriod)"
                class="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <option value="day">Hoy (Día)</option>
            <option value="week">Últimos 7 días (Semana)</option>
            <option value="month">Último Mes (30d)</option>
            <option value="bimonth">Bimestre (60d)</option>
            <option value="quarter">Trimestre (90d)</option>
            <option value="year">Año (365d)</option>
        </select>
        <div class="grid grid-cols-2 gap-2 text-center">
            <div class="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <p class="text-[10px] uppercase font-bold text-slate-400">Ventas</p>
                <p class="text-lg font-black font-mono" x-text="currentMetric().count"></p>
            </div>
            <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                <p class="text-[10px] uppercase font-bold text-emerald-600">Recaudado</p>
                <p class="text-sm font-black font-mono text-emerald-600" x-text="money(currentMetric().revenue)"></p>
            </div>
        </div>
    </div>
</div>

<script>
window.CURRENCY = @json($settings['currency'] ?? 'Bs');
window.money = (val) => `${window.CURRENCY} ${Number(val || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
window.apiFetch = async (url, options = {}) => {
    const token = document.querySelector('meta[name="csrf-token"]').content;
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': token,
            ...(options.headers || {})
        },
        ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Error en la petición');
    return data;
};

function globalLayout() {
    return {
        sidebarOpen: false,
        dark: localStorage.getItem('agro_theme') === 'dark',
        widgetMinimized: false,
        widgetPeriod: localStorage.getItem('agro_widget_period') || 'day',
        periodMetrics: {},
        async init() {
            if (this.dark) document.documentElement.classList.add('dark');
            try {
                const stats = await window.apiFetch('/api/stats');
                this.periodMetrics = stats.periodMetrics || {};
            } catch (e) {}
        },
        toggleTheme() {
            this.dark = !this.dark;
            document.documentElement.classList.toggle('dark', this.dark);
            localStorage.setItem('agro_theme', this.dark ? 'dark' : 'light');
        },
        currentMetric() {
            return this.periodMetrics[this.widgetPeriod] || { count: 0, revenue: 0, avgTicket: 0 };
        }
    };
}
</script>
@stack('scripts')
</body>
</html>
