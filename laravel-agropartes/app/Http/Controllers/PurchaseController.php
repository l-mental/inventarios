<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseDetail;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseController extends Controller
{
    public function suppliers()
    {
        return response()->json(Supplier::orderBy('name')->get());
    }

    public function index()
    {
        $list = Purchase::with('supplier')
            ->latest()
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'number' => $p->number,
                'supplier_id' => $p->supplier_id,
                'supplier_name' => $p->supplier?->name ?? 'Proveedor',
                'warehouse' => $p->warehouse,
                'total' => $p->total,
                'status' => $p->status,
                'purchase_date' => $p->purchase_date,
                'observations' => $p->observations,
                'created_at' => $p->created_at?->toIso8601String(),
            ]);

        return response()->json($list);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'warehouse' => ['required', 'string'],
            'purchase_date' => ['required', 'date'],
            'number' => ['required', 'string'],
            'total' => ['required', 'numeric', 'min:0'],
            'observations' => ['nullable', 'string'],
            'details' => ['required', 'array', 'min:1'],
            'details.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'details.*.quantity' => ['required', 'integer', 'min:1'],
            'details.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $purchaseId = DB::transaction(function () use ($validated) {
            $purchase = Purchase::create([
                'number' => $validated['number'],
                'supplier_id' => $validated['supplier_id'],
                'warehouse' => $validated['warehouse'],
                'total' => (float) $validated['total'],
                'purchase_date' => $validated['purchase_date'],
                'observations' => $validated['observations'] ?? null,
                'status' => 'COMPLETED',
            ]);

            foreach ($validated['details'] as $item) {
                $qty = (int) $item['quantity'];
                $unitPrice = (float) $item['unit_price'];
                PurchaseDetail::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'subtotal' => round($qty * $unitPrice, 2),
                ]);

                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                $branches = $product->branch_stocks ?? ['Sucursal Central' => $product->stock, 'Sucursal Norte' => 0, 'Sucursal Sur' => 0];
                $warehouseKey = $validated['warehouse'];
                $branches[$warehouseKey] = ((int) ($branches[$warehouseKey] ?? 0)) + $qty;

                $product->update([
                    'stock' => $product->stock + $qty,
                    'cost_price' => $unitPrice > 0 ? $unitPrice : $product->cost_price,
                    'branch_stocks' => $branches,
                ]);

                InventoryMovement::create([
                    'product_id' => $product->id,
                    'user_id' => Auth::id(),
                    'type' => 'IN',
                    'quantity' => $qty,
                    'reason' => "Compra {$purchase->number} ({$warehouseKey})",
                ]);
            }

            AuditLog::record(Auth::id(), 'CREATE', 'PURCHASE', $purchase->id, "Compra {$purchase->number} por {$purchase->total}");
            return $purchase->id;
        });

        return response()->json(['id' => $purchaseId, 'success' => true], 201);
    }
}
