<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\BranchTransfer;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function branches()
    {
        return response()->json([
            ['id' => 1, 'name' => 'Sucursal Central', 'is_main' => true],
            ['id' => 2, 'name' => 'Sucursal Norte', 'is_main' => false],
            ['id' => 3, 'name' => 'Sucursal Sur', 'is_main' => false],
        ]);
    }

    public function movements()
    {
        $movements = InventoryMovement::with(['product', 'user'])
            ->latest()
            ->limit(200)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'product_id' => $m->product_id,
                'product_name' => $m->product?->name ?? 'Repuesto',
                'product_code' => $m->product?->barcode ?? '',
                'user_id' => $m->user_id,
                'user_name' => $m->user?->full_name ?? 'Sistema',
                'type' => $m->type,
                'quantity' => $m->quantity,
                'reason' => $m->reason,
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return response()->json($movements);
    }

    public function transfers()
    {
        $transfers = BranchTransfer::with(['product', 'user'])
            ->latest()
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'product_id' => $t->product_id,
                'product_name' => $t->product?->name ?? '',
                'product_code' => $t->product?->barcode ?? '',
                'from_branch' => $t->from_branch,
                'to_branch' => $t->to_branch,
                'quantity' => $t->quantity,
                'notes' => $t->notes,
                'user_name' => $t->user?->full_name ?? 'Sistema',
                'created_at' => $t->created_at?->toIso8601String(),
            ]);

        return response()->json($transfers);
    }

    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'from_branch' => ['required', 'string'],
            'to_branch' => ['required', 'string', 'different:from_branch'],
            'quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:255'],
        ], [
            'to_branch.different' => 'La sucursal de origen y destino deben ser diferentes.',
            'quantity.min' => 'La cantidad a transferir debe ser mayor a 0.',
        ]);

        try {
            $result = DB::transaction(function () use ($validated) {
                $product = Product::lockForUpdate()->findOrFail($validated['product_id']);
                $branches = $product->branch_stocks ?? [
                    'Sucursal Central' => $product->stock,
                    'Sucursal Norte' => 0,
                    'Sucursal Sur' => 0,
                ];

                $available = (int) ($branches[$validated['from_branch']] ?? 0);
                $qty = (int) $validated['quantity'];

                if ($available < $qty) {
                    throw new \RuntimeException("Stock insuficiente en {$validated['from_branch']}. Disponible actual: {$available} uds.");
                }

                $branches[$validated['from_branch']] = $available - $qty;
                $branches[$validated['to_branch']] = ((int) ($branches[$validated['to_branch']] ?? 0)) + $qty;

                $product->update(['branch_stocks' => $branches]);

                $transfer = BranchTransfer::create([
                    'product_id' => $product->id,
                    'from_branch' => $validated['from_branch'],
                    'to_branch' => $validated['to_branch'],
                    'quantity' => $qty,
                    'notes' => $validated['notes'] ?? null,
                    'user_id' => Auth::id(),
                ]);

                InventoryMovement::create([
                    'product_id' => $product->id,
                    'user_id' => Auth::id(),
                    'type' => 'ADJUSTMENT',
                    'quantity' => $qty,
                    'reason' => "Traspaso entre sucursales: {$qty} uds de [{$validated['from_branch']}] a [{$validated['to_branch']}]" . (!empty($validated['notes']) ? " ({$validated['notes']})" : ''),
                ]);

                AuditLog::record(
                    Auth::id(),
                    'TRANSFER',
                    'BRANCH_TRANSFER',
                    $transfer->id,
                    "Traspaso de {$qty} uds de {$validated['from_branch']} a {$validated['to_branch']}"
                );

                return ['transferId' => $transfer->id, 'updated_stocks' => $branches];
            });

            return response()->json(['success' => true] + $result);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
