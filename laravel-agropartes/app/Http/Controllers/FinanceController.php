<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FinanceController extends Controller
{
    public function summary()
    {
        $revenue = (float) Sale::where('status', 'COMPLETED')->sum('total');
        $salesCount = Sale::where('status', 'COMPLETED')->count();
        $totalPurchases = (float) Purchase::where('status', 'COMPLETED')->sum('total');
        $totalExpenses = (float) Expense::sum('amount');
        $pendingCredits = (float) Sale::where('payment_method', 'CREDIT')
            ->where('status', 'COMPLETED')
            ->selectRaw('COALESCE(SUM(total - COALESCE(paid_amount, 0)), 0) as due')
            ->value('due');

        $products = Product::where('active', true)->get();
        $productProfitability = [];
        $cogs = 0.0;

        foreach ($products as $p) {
            $sold = (int) $p->hasMany(\App\Models\SaleDetail::class, 'product_id')
                ->whereHas('sale', fn ($q) => $q->where('status', 'COMPLETED'))
                ->sum('quantity');
            $rev = (float) $p->hasMany(\App\Models\SaleDetail::class, 'product_id')
                ->whereHas('sale', fn ($q) => $q->where('status', 'COMPLETED'))
                ->sum('subtotal');
            $unitCost = $p->cost_price > 0 ? $p->cost_price : round($p->price * 0.65, 2);
            $totalCost = round($sold * $unitCost, 2);
            $cogs += $totalCost;

            if ($sold > 0 || $rev > 0) {
                $productProfitability[] = [
                    'id' => $p->id,
                    'name' => $p->name,
                    'category' => $p->category,
                    'price' => $p->price,
                    'cost_price' => $unitCost,
                    'units_sold' => $sold,
                    'revenue' => round($rev, 2),
                    'total_cost' => $totalCost,
                    'profit' => round($rev - $totalCost, 2),
                    'margin_percent' => $p->price > 0 ? round((($p->price - $unitCost) / $p->price) * 100, 1) : 0,
                ];
            }
        }

        usort($productProfitability, fn ($a, $b) => $b['revenue'] <=> $a['revenue']);

        $grossProfit = $revenue - $cogs;
        $netProfit = $grossProfit - $totalExpenses;

        $sellerRanking = User::with('role')->get()->map(function ($u) {
            $sales = Sale::where('user_id', $u->id)->where('status', 'COMPLETED');
            $rev = (float) $sales->sum('total');
            return [
                'id' => $u->id,
                'full_name' => $u->full_name,
                'role' => $u->role_name,
                'sales_count' => $sales->count(),
                'total_revenue' => round($rev, 2),
                'commission' => round($rev * 0.05, 2),
            ];
        })->sortByDesc('total_revenue')->values();

        $expensesByCategory = Expense::selectRaw('category, SUM(amount) as total')
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'revenue' => round($revenue, 2),
            'salesCount' => $salesCount,
            'cogs' => round($cogs, 2),
            'grossProfit' => round($grossProfit, 2),
            'totalExpenses' => round($totalExpenses, 2),
            'totalPurchases' => round($totalPurchases, 2),
            'netProfit' => round($netProfit, 2),
            'pendingCredits' => round($pendingCredits, 2),
            'productProfitability' => $productProfitability,
            'sellerRanking' => $sellerRanking,
            'expensesByCategory' => $expensesByCategory,
        ]);
    }

    public function expenses()
    {
        $expenses = Expense::with('user')->latest('expense_date')->latest('id')->get()->map(fn ($e) => [
            'id' => $e->id,
            'category' => $e->category,
            'description' => $e->description,
            'amount' => $e->amount,
            'expense_date' => $e->expense_date,
            'payment_method' => $e->payment_method,
            'user_name' => $e->user?->full_name ?? 'Usuario',
        ]);
        return response()->json($expenses);
    }

    public function storeExpense(Request $request)
    {
        $validated = $request->validate([
            'category' => ['required', 'string'],
            'description' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['required', 'date'],
            'payment_method' => ['nullable', 'string'],
        ]);

        $expense = Expense::create([
            'user_id' => Auth::id(),
            'category' => $validated['category'],
            'description' => $validated['description'],
            'amount' => (float) $validated['amount'],
            'expense_date' => $validated['expense_date'],
            'payment_method' => $validated['payment_method'] ?? 'CASH',
        ]);

        AuditLog::record(Auth::id(), 'CREATE', 'EXPENSE', $expense->id, "Gasto registrado: {$expense->description}");
        return response()->json(['id' => $expense->id], 201);
    }

    public function destroyExpense(Expense $expense)
    {
        if (!Auth::user()->isAdmin()) {
            return response()->json(['error' => 'Acceso denegado'], 403);
        }
        $expense->delete();
        return response()->json(['success' => true]);
    }
}
