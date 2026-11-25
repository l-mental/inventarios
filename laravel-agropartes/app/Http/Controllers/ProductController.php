<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::where('active', true);

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('oem_codes', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }
        if ($brand = $request->query('brand')) {
            $query->where('brand', $brand);
        }
        if ($supplier = $request->query('supplier_name')) {
            $query->where('supplier_name', $supplier);
        }

        $products = $query->orderBy('id', 'asc')->get();

        if ($stockStatus = $request->query('stock_status')) {
            $products = $products->filter(fn ($p) => $p->stock_status === $stockStatus)->values();
        }

        return response()->json($products);
    }

    public function store(Request $request)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:100'],
            'oem_codes' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:120'],
            'brand' => ['nullable', 'string', 'max:120'],
            'unit_type' => ['nullable', 'string', 'max:50'],
            'supplier_name' => ['nullable', 'string', 'max:150'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'], // Permite 0 sin error
            'branch_stocks' => ['nullable', 'array'],
        ]);

        $stock = (int) ($validated['stock'] ?? 0);
        $minStock = isset($validated['min_stock']) ? max(0, (int) $validated['min_stock']) : 0;
        $costPrice = isset($validated['cost_price']) ? (float) $validated['cost_price'] : round($validated['price'] * 0.65, 2);
        $branchStocks = $validated['branch_stocks'] ?? [
            'Sucursal Central' => $stock,
            'Sucursal Norte' => 0,
            'Sucursal Sur' => 0,
        ];

        $product = Product::create([
            'name' => $validated['name'],
            'barcode' => $validated['barcode'] ?: ('REP-' . rand(1000, 9999)),
            'oem_codes' => $validated['oem_codes'] ?? '',
            'description' => $validated['description'] ?? null,
            'category' => $validated['category'] ?? 'MOTOR',
            'brand' => $validated['brand'] ?? 'GENERAL',
            'unit_type' => $validated['unit_type'] ?? 'UNIDAD',
            'supplier_name' => $validated['supplier_name'] ?? 'GENERAL',
            'batch_number' => $validated['supplier_name'] ?? 'GENERAL',
            'expiry_date' => '2030-12-31',
            'cost_price' => $costPrice,
            'price' => (float) $validated['price'],
            'stock' => $stock,
            'min_stock' => $minStock,
            'branch_stocks' => $branchStocks,
            'active' => true,
        ]);

        InventoryMovement::create([
            'product_id' => $product->id,
            'user_id' => Auth::id(),
            'type' => 'IN',
            'quantity' => $stock,
            'reason' => 'Stock inicial repuesto',
        ]);

        AuditLog::record(Auth::id(), 'CREATE', 'PRODUCT', $product->id, "Repuesto creado: {$product->name}");

        return response()->json(['id' => $product->id, 'product' => $product], 201);
    }

    public function update(Request $request, Product $product)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:100'],
            'oem_codes' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:120'],
            'brand' => ['nullable', 'string', 'max:120'],
            'unit_type' => ['nullable', 'string', 'max:50'],
            'supplier_name' => ['nullable', 'string', 'max:150'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'], // Permite 0 sin error
            'branch_stocks' => ['nullable', 'array'],
        ]);

        $oldStock = $product->stock;
        $newStock = (int) $validated['stock'];
        $minStock = array_key_exists('min_stock', $validated) && $validated['min_stock'] !== null
            ? max(0, (int) $validated['min_stock'])
            : $product->min_stock;

        $product->update([
            'name' => $validated['name'],
            'barcode' => $validated['barcode'] ?? $product->barcode,
            'oem_codes' => $validated['oem_codes'] ?? $product->oem_codes,
            'description' => $validated['description'] ?? $product->description,
            'category' => $validated['category'] ?? $product->category,
            'brand' => $validated['brand'] ?? $product->brand,
            'unit_type' => $validated['unit_type'] ?? $product->unit_type,
            'supplier_name' => $validated['supplier_name'] ?? $product->supplier_name,
            'batch_number' => $validated['supplier_name'] ?? $product->supplier_name,
            'cost_price' => $validated['cost_price'] ?? $product->cost_price,
            'price' => (float) $validated['price'],
            'stock' => $newStock,
            'min_stock' => $minStock,
            'branch_stocks' => $validated['branch_stocks'] ?? $product->branch_stocks,
        ]);

        if ($oldStock !== $newStock) {
            $diff = $newStock - $oldStock;
            InventoryMovement::create([
                'product_id' => $product->id,
                'user_id' => Auth::id(),
                'type' => $diff > 0 ? 'IN' : 'OUT',
                'quantity' => abs($diff),
                'reason' => 'Ajuste manual de stock',
            ]);
        }

        AuditLog::record(Auth::id(), 'UPDATE', 'PRODUCT', $product->id, "Repuesto actualizado: {$product->name}");

        return response()->json(['success' => true, 'product' => $product->fresh()]);
    }

    public function destroy(Product $product)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $product->update(['active' => false]);
        AuditLog::record(Auth::id(), 'DELETE', 'PRODUCT', $product->id, "Repuesto desactivado ID: {$product->id}");

        return response()->json(['success' => true]);
    }
}
