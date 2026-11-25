<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CreditPayment;
use App\Models\Customer;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function index()
    {
        return response()->json(Customer::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'unique:customers,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $customer = Customer::create($validated);
        AuditLog::record(Auth::id(), 'CREATE', 'CUSTOMER', $customer->id, "Cliente creado: {$customer->name}");

        return response()->json(['id' => $customer->id, 'customer' => $customer], 201);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'unique:customers,email,' . $customer->id],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $customer->update($validated);
        AuditLog::record(Auth::id(), 'UPDATE', 'CUSTOMER', $customer->id, "Cliente actualizado: {$customer->name}");

        return response()->json(['success' => true, 'customer' => $customer]);
    }

    public function credits()
    {
        $credits = Sale::with(['customer', 'user', 'creditPayments.user'])
            ->where('payment_method', 'CREDIT')
            ->where('status', 'COMPLETED')
            ->latest()
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'customer_id' => $s->customer_id,
                'customer_name' => $s->customer?->name ?? 'Cliente',
                'customer_phone' => $s->customer?->phone,
                'seller_name' => $s->user?->full_name ?? 'Vendedor',
                'total' => $s->total,
                'paid_amount' => $s->paid_amount,
                'balance_due' => max(0, round($s->total - $s->paid_amount, 2)),
                'created_at' => $s->created_at?->toIso8601String(),
                'payments' => $s->creditPayments,
            ]);

        return response()->json($credits);
    }

    public function payCredit(Request $request)
    {
        $validated = $request->validate([
            'sale_id' => ['required', 'integer', 'exists:sales,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        try {
            DB::transaction(function () use ($validated) {
                $sale = Sale::lockForUpdate()->findOrFail($validated['sale_id']);
                $pending = max(0, round($sale->total - $sale->paid_amount, 2));
                $payAmt = (float) $validated['amount'];

                if ($payAmt > $pending + 0.01) {
                    throw new \RuntimeException("Monto inválido. El saldo pendiente es {$pending}");
                }

                CreditPayment::create([
                    'sale_id' => $sale->id,
                    'customer_id' => $sale->customer_id,
                    'user_id' => Auth::id(),
                    'amount' => $payAmt,
                    'payment_method' => $validated['payment_method'] ?? 'CASH',
                    'notes' => $validated['notes'] ?? 'Abono registrado',
                ]);

                $newPaid = $sale->paid_amount + $payAmt;
                $sale->update([
                    'paid_amount' => $newPaid,
                    'credit_amount' => max(0, $sale->total - $newPaid),
                ]);

                if ($sale->customer_id) {
                    $customer = Customer::lockForUpdate()->find($sale->customer_id);
                    if ($customer) {
                        $customer->update([
                            'credit_balance' => max(0, $customer->credit_balance - $payAmt),
                        ]);
                    }
                }

                AuditLog::record(Auth::id(), 'PAY_CREDIT', 'SALE', $sale->id, "Abono registrado por: {$payAmt}");
            });

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
