<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class UserAuditSettingsController extends Controller
{
    public function users()
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $users = User::with('role')->get()->map(fn ($u) => [
            'id' => $u->id,
            'username' => $u->username,
            'full_name' => $u->full_name,
            'role_id' => $u->role_id,
            'role' => $u->role_name,
        ]);

        return response()->json($users);
    }

    public function storeUser(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $validated = $request->validate([
            'username' => ['required', 'string', 'unique:users,username'],
            'password' => ['required', 'string', 'min:4'],
            'full_name' => ['required', 'string'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'full_name' => $validated['full_name'],
            'role_id' => $validated['role_id'],
        ]);

        AuditLog::record(Auth::id(), 'CREATE', 'USER', $user->id, "Usuario creado: {$user->username}");
        return response()->json(['id' => $user->id], 201);
    }

    public function updateUser(Request $request, User $user)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $validated = $request->validate([
            'username' => ['required', 'string', 'unique:users,username,' . $user->id],
            'full_name' => ['required', 'string'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'password' => ['nullable', 'string', 'min:4'],
        ]);

        $data = [
            'username' => $validated['username'],
            'full_name' => $validated['full_name'],
            'role_id' => $validated['role_id'],
        ];
        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);
        AuditLog::record(Auth::id(), 'UPDATE', 'USER', $user->id, "Usuario actualizado: {$user->username}");

        return response()->json(['success' => true]);
    }

    public function destroyUser(User $user)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }
        if ($user->id === Auth::id()) {
            return response()->json(['error' => 'No puedes eliminar tu propio usuario'], 400);
        }

        $user->delete();
        AuditLog::record(Auth::id(), 'DELETE', 'USER', $user->id, "Usuario eliminado ID: {$user->id}");
        return response()->json(['success' => true]);
    }

    public function roles()
    {
        return response()->json(Role::all());
    }

    public function audit()
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $logs = AuditLog::with('user')->latest()->limit(150)->get()->map(fn ($l) => [
            'id' => $l->id,
            'user_name' => $l->user?->full_name ?? 'Sistema',
            'action' => $l->action,
            'entity' => $l->entity,
            'entity_id' => $l->entity_id,
            'details' => $l->details,
            'created_at' => $l->created_at?->toIso8601String(),
        ]);

        return response()->json($logs);
    }

    public function getSettings()
    {
        return response()->json(SystemSetting::getMap());
    }

    public function saveSettings(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        if ($request->has('key')) {
            SystemSetting::updateOrCreate(
                ['key' => (string) $request->input('key')],
                ['value' => $request->input('value')]
            );
            AuditLog::record(Auth::id(), 'UPDATE', 'SETTINGS', null, "Configuración actualizada: {$request->input('key')}");
        } elseif (is_array($request->all())) {
            foreach ($request->except(['_token']) as $k => $v) {
                SystemSetting::updateOrCreate(['key' => (string) $k], ['value' => is_scalar($v) ? (string) $v : json_encode($v)]);
            }
            AuditLog::record(Auth::id(), 'UPDATE', 'SETTINGS', null, 'Configuración general actualizada');
        }

        return response()->json(['success' => true]);
    }

    public function downloadBackup()
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $payload = [
            'exported_at' => now()->toIso8601String(),
            'system' => 'AgroPartes Tractores S.R.L. (Laravel 11)',
            'products' => Product::all(),
            'customers' => Customer::all(),
            'sales' => Sale::with('details')->get(),
            'settings' => SystemSetting::getMap(),
        ];

        $filename = 'agropartes_backup_' . now()->format('Y-m-d') . '.json';
        return response()->json($payload)
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");
    }
}
