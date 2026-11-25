@extends('layouts.app')
@section('title', 'Configuración · AgroPartes Tractores')

@section('content')
<div x-data="settingsPage()" x-init="load()" class="max-w-3xl space-y-6">
    <div>
        <h2 class="text-2xl font-black uppercase italic">Configuración del Sistema</h2>
        <p class="text-xs text-slate-500">Empresa, moneda, impuesto y exportación de respaldo JSON.</p>
    </div>

    <div x-show="saved" x-cloak class="p-3 bg-emerald-50 border border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold">
        Configuración guardada correctamente.
    </div>

    <form @submit.prevent="save()" class="p-6 bg-white dark:bg-slate-900 rounded-2xl border space-y-4 text-xs">
        <div>
            <label class="block font-bold mb-1">Nombre de la Empresa</label>
            <input type="text" x-model="form.company_name" class="w-full px-3 py-2 border rounded-lg">
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block font-bold mb-1">NIT / RUC</label>
                <input type="text" x-model="form.company_nit" class="w-full px-3 py-2 border rounded-lg">
            </div>
            <div>
                <label class="block font-bold mb-1">Moneda (Ej. Bs, $, S/)</label>
                <input type="text" x-model="form.currency" class="w-full px-3 py-2 border rounded-lg">
            </div>
        </div>
        <div class="flex justify-between pt-3 border-t">
            <a href="/api/backup/download" class="px-4 py-2 border rounded-lg font-bold">Descargar Respaldo JSON</a>
            <button type="submit" class="px-5 py-2 bg-brand text-white rounded-lg font-black uppercase">Guardar Cambios</button>
        </div>
    </form>
</div>
@endsection

@push('scripts')
<script>
function settingsPage() {
    return {
        form: { company_name: 'AgroPartes Tractores S.R.L.', company_nit: '', currency: 'Bs' },
        saved: false,
        async load() {
            const s = await window.apiFetch('/api/settings');
            this.form = { ...this.form, ...s };
        },
        async save() {
            await window.apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(this.form) });
            this.saved = true;
            setTimeout(() => this.saved = false, 2500);
        }
    };
}
</script>
@endpush
