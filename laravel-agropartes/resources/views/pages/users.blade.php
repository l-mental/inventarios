@extends('layouts.app')
@section('title', 'Equipo / Staff · AgroPartes Tractores')

@section('content')
<div x-data="usersPage()" x-init="load()" class="space-y-6">
    <div class="flex justify-between items-center">
        <div>
            <h2 class="text-2xl font-black uppercase italic">Gestión de Usuarios y Roles</h2>
            <p class="text-xs text-slate-500">Administra accesos de Administradores y Vendedores de mostrador.</p>
        </div>
        <button @click="modal = true" class="px-4 py-2.5 bg-brand text-white rounded-xl text-xs font-black uppercase">+ Nuevo Usuario</button>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-2xl border overflow-x-auto">
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-[10px] font-black uppercase text-slate-400">
                <tr><th class="p-4">Usuario</th><th class="p-4">Nombre Completo</th><th class="p-4">Rol</th><th class="p-4 text-right">Acción</th></tr>
            </thead>
            <tbody class="divide-y">
                <template x-for="u in users" :key="u.id">
                    <tr>
                        <td class="p-4 font-mono font-bold" x-text="u.username"></td>
                        <td class="p-4 font-bold" x-text="u.full_name"></td>
                        <td class="p-4"><span class="px-2 py-0.5 rounded bg-brand/10 text-brand font-black uppercase text-[10px]" x-text="u.role"></span></td>
                        <td class="p-4 text-right">
                            <button @click="remove(u)" class="text-rose-600 font-bold">Eliminar</button>
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <div x-show="modal" x-cloak class="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
        <form @submit.prevent="create()" class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 space-y-3 text-xs">
            <h3 class="font-black uppercase text-sm">Crear Usuario</h3>
            <input type="text" x-model="form.username" required placeholder="Usuario" class="w-full px-3 py-2 border rounded-lg">
            <input type="text" x-model="form.full_name" required placeholder="Nombre Completo" class="w-full px-3 py-2 border rounded-lg">
            <input type="password" x-model="form.password" required placeholder="Contraseña" class="w-full px-3 py-2 border rounded-lg">
            <select x-model.number="form.role_id" class="w-full px-3 py-2 border rounded-lg">
                <template x-for="r in roles" :key="r.id"><option :value="r.id" x-text="r.name"></option></template>
            </select>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" @click="modal = false" class="px-4 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-brand text-white rounded-lg font-black uppercase">Guardar</button>
            </div>
        </form>
    </div>
</div>
@endsection

@push('scripts')
<script>
function usersPage() {
    return {
        users: [],
        roles: [],
        modal: false,
        form: { username: '', full_name: '', password: '', role_id: 2 },
        async load() {
            const [u, r] = await Promise.all([window.apiFetch('/api/users'), window.apiFetch('/api/roles')]);
            this.users = u;
            this.roles = r;
            if (r.length) this.form.role_id = r[r.length - 1].id;
        },
        async create() {
            await window.apiFetch('/api/users', { method: 'POST', body: JSON.stringify(this.form) });
            this.modal = false;
            await this.load();
        },
        async remove(u) {
            if (!confirm(`¿Eliminar a ${u.username}?`)) return;
            await window.apiFetch(`/api/users/${u.id}`, { method: 'DELETE' });
            await this.load();
        }
    };
}
</script>
@endpush
