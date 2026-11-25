<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\CreditPayment;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CashRegisterController extends Controller
{
    public function current()
    {
        $session = CashSession::with(['user', 'movements.user'])
            ->where('status', 'OPEN')
            ->latest('opened_at')
            ->first();

        if (!$session) {
            return response()->json(['session' => null]);
        }

        $cashSales = (float) Sale::where('status', 'COMPLETED')
            ->where('created_at', '>=', $session->opened_at)
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total WHEN payment_method = 'MIXED' THEN cash_amount WHEN payment_method = 'CREDIT' THEN paid_amount ELSE 0 END), 0) as amt")
            ->value('amt');

        $qrSales = (float) Sale::where('status', 'COMPLETED')
            ->where('created_at', '>=', $session->opened_at)
            ->selectRaw("COALESCE(SUM(CASE WHEN payment_method = 'QR' THEN total WHEN payment_method = 'MIXED' THEN qr_amount ELSE 0 END), 0) as amt")
            ->value('amt');

        $creditCollections = (float) CreditPayment::where('payment_method', 'CASH')
            ->where('created_at', '>=', $session->opened_at)
            ->where('notes', '!=', 'Pago inicial en venta al crédito')
            ->sum('amount');

        $expected = $session->opening_amount + $cashSales + $creditCollections + $session->extra_income - $session->extra_expense;

        return response()->json([
            'session' => [
                'id' => $session->id,
                'user_name' => $session->user?->full_name ?? 'Cajero',
                'opening_amount' => $session->opening_amount,
                'extra_income' => $session->extra_income,
                'extra_expense' => $session->extra_expense,
                'cash_sales' => round($cashSales, 2),
                'qr_sales' => round($qrSales, 2),
                'credit_collections' => round($creditCollections, 2),
                'expected_amount' => round($expected, 2),
                'notes' => $session->notes,
                'status' => $session->status,
                'opened_at' => $session->opened_at?->toIso8601String(),
                'movements' => $session->movements,
            ],
        ]);
    }

    public function history()
    {
        $sessions = CashSession::with('user')->latest('opened_at')->limit(30)->get()->map(fn ($s) => [
            'id' => $s->id,
            'user_name' => $s->user?->full_name ?? 'Cajero',
            'opening_amount' => $s->opening_amount,
            'expected_amount' => $s->expected_amount,
            'closing_amount' => $s->closing_amount,
            'status' => $s->status,
            'opened_at' => $s->opened_at?->toIso8601String(),
            'closed_at' => $s->closed_at?->toIso8601String(),
        ]);

        return response()->json($sessions);
    }

    public function open(Request $request)
    {
        if (CashSession::where('status', 'OPEN')->exists()) {
            return response()->json(['error' => 'Ya existe una caja abierta en curso.'], 400);
        }

        $validated = $request->validate([
            'opening_amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $session = CashSession::create([
            'user_id' => Auth::id(),
            'opening_amount' => (float) $validated['opening_amount'],
            'notes' => $validated['notes'] ?? 'Apertura de turno',
            'status' => 'OPEN',
            'opened_at' => now(),
        ]);

        AuditLog::record(Auth::id(), 'OPEN_CASH', 'CASH_SESSION', $session->id, "Caja abierta con {$session->opening_amount}");

        return response()->json(['id' => $session->id]);
    }

    public function movement(Request $request)
    {
        $session = CashSession::where('status', 'OPEN')->latest('opened_at')->first();
        if (!$session) {
            return response()->json(['error' => 'No hay una caja abierta actualmente.'], 400);
        }

        $validated = $request->validate([
            'type' => ['required', 'in:INCOME,EXPENSE'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string'],
        ]);

        CashMovement::create([
            'session_id' => $session->id,
            'user_id' => Auth::id(),
            'type' => $validated['type'],
            'amount' => (float) $validated['amount'],
            'reason' => $validated['reason'],
        ]);

        if ($validated['type'] === 'INCOME') {
            $session->increment('extra_income', (float) $validated['amount']);
        } else {
            $session->increment('extra_expense', (float) $validated['amount']);
        }

        AuditLog::record(Auth::id(), 'CASH_MOVEMENT', 'CASH_SESSION', $session->id, "{$validated['type']}: {$validated['amount']}");

        return response()->json(['success' => true]);
    }

    public function close(Request $request)
    {
        $session = CashSession::where('status', 'OPEN')->latest('opened_at')->first();
        if (!$session) {
            return response()->json(['error' => 'No hay una caja abierta para cerrar.'], 400);
        }

        $validated = $request->validate([
            'closing_amount' => ['required', 'numeric', 'min:0'],
            'expected_amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $session->update([
            'closing_amount' => (float) $validated['closing_amount'],
            'expected_amount' => (float) $validated['expected_amount'],
            'notes' => $validated['notes'] ?? $session->notes,
            'status' => 'CLOSED',
            'closed_at' => now(),
        ]);

        AuditLog::record(Auth::id(), 'CLOSE_CASH', 'CASH_SESSION', $session->id, "Cierre de caja. Real: {$validated['closing_amount']}");

        return response()->json(['success' => true]);
    }
}
