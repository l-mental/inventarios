<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CreditPayment;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationDetail;
use App\Models\Sale;
use App\Models\SaleDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PosSaleController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $sales = Sale::with(['user', 'customer'])
            ->when(!$user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'user_id' => $s->user_id,
                'seller_name' => $s->user?->full_name ?? 'Vendedor',
                'customer_id' => $s->customer_id,
                'customer_name' => $s->customer?->name ?? 'Consumidor Final',
                'customer_phone' => $s->customer?->phone,
                'total' => $s->total,
                'status' => $s->status,
                'payment_method' => $s->payment_method,
                'with_invoice' => $s->with_invoice,
                'cash_amount' => $s->cash_amount,
                'qr_amount' => $s->qr_amount,
                'credit_amount' => $s->credit_amount,
                'paid_amount' => $s->paid_amount,
                'cancel_reason' => $s->cancel_reason,
                'cancelled_at' => $s->cancelled_at?->toIso8601String(),
                'cancelled_by' => $s->cancelled_by,
                'created_at' => $s->created_at?->toIso8601String(),
            ]);

        return response()->json($sales);
    }

    public function show(Sale $sale)
    {
        $user = Auth::user();
        if (!$user->isAdmin() && $sale->user_id !== $user->id) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }

        $sale->load(['user', 'customer', 'details.product']);

        return response()->json([
            'id' => $sale->id,
            'user_id' => $sale->user_id,
            'seller_name' => $sale->user?->full_name ?? 'Vendedor',
            'customer_id' => $sale->customer_id,
            'customer_name' => $sale->customer?->name ?? 'Consumidor Final',
            'customer_phone' => $sale->customer?->phone,
            'total' => $sale->total,
            'status' => $sale->status,
            'payment_method' => $sale->payment_method,
            'cancel_reason' => $sale->cancel_reason,
            'cancelled_at' => $sale->cancelled_at?->toIso8601String(),
            'cancelled_by' => $sale->cancelled_by,
            'created_at' => $sale->created_at?->toIso8601String(),
            'details' => $sale->details->map(fn ($d) => [
                'id' => $d->id,
                'product_id' => $d->product_id,
                'product_name' => $d->product?->name ?? 'Repuesto',
                'product_code' => $d->product?->barcode ?? '',
                'quantity' => $d->quantity,
                'unit_price' => $d->unit_price,
                'subtotal' => $d->subtotal,
                'measurement_summary' => $d->measurement_summary,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'payment_method' => ['nullable', 'string'],
            'with_invoice' => ['nullable', 'boolean'],
            'cash_amount' => ['nullable', 'numeric', 'min:0'],
            'qr_amount' => ['nullable', 'numeric', 'min:0'],
            'credit_amount' => ['nullable', 'numeric', 'min:0'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'points_redeemed' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            $saleId = DB::transaction(function () use ($validated) {
                $total = (float) $validated['total'];
                $method = $validated['payment_method'] ?? 'CASH';
                $customerId = $validated['customer_id'] ?? null;

                if ($method === 'CREDIT' && !$customerId) {
                    throw new \RuntimeException('Para ventas al crédito debe seleccionar un cliente registrado.');
                }

                $paidAmt = $method === 'CREDIT' ? (float) ($validated['paid_amount'] ?? 0) : $total;
                $cashAmt = $method === 'CASH' ? $total : ($method === 'MIXED' ? (float) ($validated['cash_amount'] ?? 0) : ($method === 'CREDIT' ? $paidAmt : 0));
                $qrAmt = $method === 'QR' ? $total : ($method === 'MIXED' ? (float) ($validated['qr_amount'] ?? 0) : 0);
                $credAmt = $method === 'CREDIT' ? (float) ($validated['credit_amount'] ?? max(0, $total - $paidAmt)) : 0;

                $sale = Sale::create([
                    'user_id' => Auth::id(),
                    'customer_id' => $customerId,
                    'total' => $total,
                    'status' => 'COMPLETED',
                    'payment_method' => $method,
                    'with_invoice' => (bool) ($validated['with_invoice'] ?? true),
                    'cash_amount' => $cashAmt,
                    'qr_amount' => $qrAmt,
                    'credit_amount' => $credAmt,
                    'paid_amount' => $paidAmt,
                    'discount_amount' => (float) ($validated['discount_amount'] ?? 0),
                    'points_redeemed' => (int) ($validated['points_redeemed'] ?? 0),
                ]);

                foreach ($validated['items'] as $item) {
                    $product = Product::lockForUpdate()->findOrFail($item['id']);
                    $qty = (int) $item['quantity'];

                    if ($product->stock < $qty) {
                        throw new \RuntimeException("Stock insuficiente para: {$product->name}");
                    }

                    $newStock = max(0, $product->stock - $qty);
                    $branches = $product->branch_stocks ?? ['Sucursal Central' => $product->stock, 'Sucursal Norte' => 0, 'Sucursal Sur' => 0];
                    $branches['Sucursal Central'] = max(0, ((int) ($branches['Sucursal Central'] ?? $product->stock)) - $qty);

                    $product->update([
                        'stock' => $newStock,
                        'branch_stocks' => $branches,
                    ]);

                    InventoryMovement::create([
                        'product_id' => $product->id,
                        'user_id' => Auth::id(),
                        'type' => 'SALE',
                        'quantity' => $qty,
                        'reason' => "Venta #{$sale->id}",
                    ]);

                    SaleDetail::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $qty,
                        'unit_price' => (float) $item['price'],
                        'subtotal' => round($qty * (float) $item['price'], 2),
                        'measurement_summary' => $item['measurement_summary'] ?? null,
                    ]);
                }

                if ($customerId) {
                    $customer = Customer::lockForUpdate()->find($customerId);
                    if ($customer) {
                        $earned = (int) floor($total / 10);
                        $redeemed = (int) ($validated['points_redeemed'] ?? 0);
                        $customer->update([
                            'points' => max(0, $customer->points - $redeemed + $earned),
                            'credit_balance' => $customer->credit_balance + $credAmt,
                        ]);

                        if ($method === 'CREDIT' && $paidAmt > 0) {
                            CreditPayment::create([
                                'sale_id' => $sale->id,
                                'customer_id' => $customerId,
                                'user_id' => Auth::id(),
                                'amount' => $paidAmt,
                                'payment_method' => 'CASH',
                                'notes' => 'Pago inicial en venta al crédito',
                            ]);
                        }
                    }
                }

                AuditLog::record(Auth::id(), 'CREATE', 'SALE', $sale->id, "Venta #{$sale->id} procesada por {$total}");
                return $sale->id;
            });

            return response()->json(['id' => $saleId, 'success' => true], 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function cancel(Request $request, Sale $sale)
    {
        $user = Auth::user();
        if (!$user->isAdmin() && $sale->user_id !== $user->id) {
            return response()->json(['error' => 'No autorizado para anular esta factura.'], 403);
        }

        if ($sale->status === 'CANCELLED') {
            return response()->json(['error' => 'Esta factura ya se encuentra anulada.'], 400);
        }

        $reason = trim((string) $request->input('reason', 'Anulación solicitada por usuario'));

        try {
            DB::transaction(function () use ($sale, $reason, $user) {
                $sale->load('details');

                foreach ($sale->details as $detail) {
                    $product = Product::lockForUpdate()->find($detail->product_id);
                    if ($product) {
                        $branches = $product->branch_stocks ?? ['Sucursal Central' => $product->stock, 'Sucursal Norte' => 0, 'Sucursal Sur' => 0];
                        $branches['Sucursal Central'] = ((int) ($branches['Sucursal Central'] ?? 0)) + $detail->quantity;

                        $product->update([
                            'stock' => $product->stock + $detail->quantity,
                            'branch_stocks' => $branches,
                        ]);

                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'user_id' => $user->id,
                            'type' => 'IN',
                            'quantity' => $detail->quantity,
                            'reason' => "Devolución por anulación Venta #{$sale->id}",
                        ]);
                    }
                }

                if ($sale->customer_id && $sale->credit_amount > 0) {
                    $customer = Customer::lockForUpdate()->find($sale->customer_id);
                    if ($customer) {
                        $customer->update([
                            'credit_balance' => max(0, $customer->credit_balance - $sale->credit_amount),
                        ]);
                    }
                }

                $sale->update([
                    'status' => 'CANCELLED',
                    'cancel_reason' => $reason,
                    'cancelled_at' => now(),
                    'cancelled_by' => $user->full_name,
                ]);

                AuditLog::record($user->id, 'CANCEL', 'SALE', $sale->id, "Venta anulada ID: {$sale->id}. Motivo: {$reason}");
            });

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function quotations()
    {
        $list = Quotation::with(['user', 'customer', 'details.product'])
            ->latest()
            ->get()
            ->map(fn ($q) => [
                'id' => $q->id,
                'seller_name' => $q->user?->full_name ?? 'Vendedor',
                'customer_id' => $q->customer_id,
                'customer_name' => $q->customer?->name ?? 'Consumidor Final',
                'total' => $q->total,
                'valid_until' => $q->valid_until,
                'notes' => $q->notes,
                'status' => $q->status,
                'created_at' => $q->created_at?->toIso8601String(),
                'details' => $q->details->map(fn ($d) => [
                    'product_id' => $d->product_id,
                    'product_name' => $d->product?->name ?? '',
                    'quantity' => $d->quantity,
                    'unit_price' => $d->unit_price,
                    'subtotal' => $d->subtotal,
                ]),
            ]);

        return response()->json($list);
    }

    public function storeQuotation(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'items' => ['required', 'array', 'min:1'],
            'total' => ['required', 'numeric', 'min:0'],
            'valid_until' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $quotation = DB::transaction(function () use ($validated) {
            $q = Quotation::create([
                'user_id' => Auth::id(),
                'customer_id' => $validated['customer_id'] ?? null,
                'total' => (float) $validated['total'],
                'valid_until' => $validated['valid_until'] ?? now()->addDays(7)->toDateString(),
                'notes' => $validated['notes'] ?? 'Proforma válida por 7 días',
                'status' => 'PENDING',
            ]);

            foreach ($validated['items'] as $item) {
                $qty = (int) $item['quantity'];
                $price = (float) $item['price'];
                QuotationDetail::create([
                    'quotation_id' => $q->id,
                    'product_id' => $item['id'],
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'subtotal' => round($qty * $price, 2),
                ]);
            }

            AuditLog::record(Auth::id(), 'CREATE', 'QUOTATION', $q->id, "Proforma #{$q->id} por {$q->total}");
            return $q;
        });

        return response()->json(['id' => $quotation->id, 'success' => true], 201);
    }

    public function convertQuotation(Quotation $quotation)
    {
        $quotation->update(['status' => 'CONVERTED']);
        return response()->json(['success' => true]);
    }
}
