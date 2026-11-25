<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión · AgroPartes Tractores S.R.L.</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
<div class="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
    <div class="p-8 lg:p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/40 flex flex-col justify-between space-y-8">
        <div>
            <span class="inline-block px-3 py-1 bg-orange-600/20 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                Laravel 11 · Catálogo 91 Repuestos
            </span>
            <h1 class="text-3xl font-black uppercase italic tracking-tight mt-4">AgroPartes Tractores S.R.L.</h1>
            <p class="text-sm text-slate-400 mt-2">Sistema POS, códigos OEM, inventario multi-sucursal, anulación de facturas y traspasos de unidades.</p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-4 rounded-xl bg-red-950/30 border border-red-900/40">
                <p class="font-black text-red-400 uppercase">Massey Ferguson</p>
                <p class="text-slate-400 mt-1">Motores Perkins 1104 &amp; Dirección</p>
            </div>
            <div class="p-4 rounded-xl bg-sky-950/30 border border-sky-900/40">
                <p class="font-black text-sky-400 uppercase">New Holland</p>
                <p class="text-slate-400 mt-1">Motor NEF, Transmisión &amp; Frenos</p>
            </div>
            <div class="p-4 rounded-xl bg-amber-950/30 border border-amber-900/40">
                <p class="font-black text-amber-400 uppercase">Fiat Agrícola</p>
                <p class="text-slate-400 mt-1">Gomas Freno, Camisas &amp; Reductores</p>
            </div>
            <div class="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/40">
                <p class="font-black text-emerald-400 uppercase">Valmet / Valtra</p>
                <p class="text-slate-400 mt-1">Filtros Hidráulicos &amp; Empaques</p>
            </div>
        </div>
    </div>

    <div class="p-8 lg:p-10 flex flex-col justify-center space-y-6 bg-slate-900">
        <div>
            <h2 class="text-2xl font-black uppercase">Acceso al Sistema</h2>
            <p class="text-xs text-slate-400 mt-1">Ingresa con tus credenciales de mostrador o administración.</p>
        </div>

        @if($errors->any())
            <div class="p-3 bg-rose-950/50 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="{{ route('login.post') }}" class="space-y-4">
            @csrf
            <div>
                <label class="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Usuario</label>
                <input type="text" name="username" value="{{ old('username', 'admin') }}" required
                       class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-orange-500 outline-none">
            </div>
            <div>
                <label class="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Contraseña</label>
                <input type="password" name="password" value="admin123" required
                       class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white focus:border-orange-500 outline-none">
            </div>
            <button type="submit" class="w-full py-3.5 bg-orange-600 hover:bg-orange-500 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-600/20">
                Ingresar al Sistema
            </button>
        </form>

        <div class="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-[11px] text-slate-400 space-y-1">
            <p><strong class="text-white">Admin:</strong> usuario <code class="text-orange-400">admin</code> / clave <code class="text-orange-400">admin123</code></p>
            <p><strong class="text-white">Vendedor:</strong> usuario <code class="text-orange-400">vendedor</code> / clave <code class="text-orange-400">vendedor123</code></p>
        </div>
    </div>
</div>
</body>
</html>
