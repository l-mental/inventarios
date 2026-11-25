@extends('layouts.app')
@section('title', 'Auditoría · AgroPartes Tractores')

@section('content')
<div x-data="{ logs: [], async load() { this.logs = await window.apiFetch('/api/audit'); } }" x-init="load()" class="space-y-4">
    <div>
        <h2 class="text-2xl font-black uppercase italic">Registro de Auditoría y Seguridad</h2>
        <p class="text-xs text-slate-500">Trazabilidad de ventas, anulaciones, traspasos de sucursales y cambios de catálogo.</p>
    </div>
    <div class="bg-white dark:bg-slate-900 rounded-2xl border overflow-x-auto">
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                <tr><th class="p-3">Fecha</th><th class="p-3">Usuario</th><th class="p-3">Acción</th><th class="p-3">Entidad</th><th class="p-3">Detalles</th></tr>
            </thead>
            <tbody class="divide-y">
                <template x-for="l in logs" :key="l.id">
                    <tr>
                        <td class="p-3 font-mono text-slate-400" x-text="new Date(l.created_at).toLocaleString()"></td>
                        <td class="p-3 font-bold" x-text="l.user_name"></td>
                        <td class="p-3 font-black text-brand" x-text="l.action"></td>
                        <td class="p-3 font-mono" x-text="l.entity"></td>
                        <td class="p-3" x-text="l.details"></td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
</div>
@endsection
