<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = Auth::user();
        $isSeller = !$user->isAdmin();

        $salesBase = Sale::where('status', 'COMPLETED')
            ->when($isSeller, fn ($q) => $q->where('user_id', $user->id));

        $revenue = (clone $salesBase)->sum('total');
        $salesCount = (clone $salesBase)->count();
        $productsCount = Product::where('active', true)->count();
        $totalUnits = (int) Product::where('active', true)->sum('stock');

        // Regla min_stock = 0: solo es bajo si min_stock > 0 y stock <= min_stock
        $lowStock = Product::where('active', true)
            ->where(function ($q) {
                $q->where(function ($sub) {
                    $sub->where('min_stock', '>', 0)->whereColumn('stock', '<=', 'min_stock');
                })->orWhere(function ($sub) {
                    $sub->where('min_stock', 0)->where('stock', '<', 0);
                });
            })
            ->count();

        $customersCount = Customer::count();

        $recentSales = (clone $salesBase)
            ->with('user')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'total' => $s->total,
                'created_at' => $s->created_at?->toIso8601String(),
                'seller' => $s->user?->full_name ?? 'Sistema',
            ]);

        $salesByDay = (clone $salesBase)
            ->selectRaw('DATE(created_at) as date, SUM(total) as total')
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date', 'asc')
            ->limit(7)
            ->get();

        $calcPeriod = function (int $days) use ($isSeller, $user) {
            $since = Carbon::now()->subDays($days);
            $q = Sale::where('status', 'COMPLETED')
                ->where('created_at', '>=', $since)
                ->when($isSeller, fn ($sub) => $sub->where('user_id', $user->id));
            $count = (clone $q)->count();
            $rev = (float) (clone $q)->sum('total');
            return [
                'count' => $count,
                'revenue' => round($rev, 2),
                'avgTicket' => $count > 0 ? round($rev / $count, 2) : 0,
            ];
        };

        $brandBreakdown = Product::where('active', true)
            ->selectRaw('brand, COUNT(*) as parts_count, SUM(stock) as total_units')
            ->groupBy('brand')
            ->orderByDesc('parts_count')
            ->get();

        return response()->json([
            'revenue' => round((float) $revenue, 2),
            'salesCount' => $salesCount,
            'productsCount' => $productsCount,
            'totalUnits' => $totalUnits,
            'lowStock' => $lowStock,
            'customersCount' => $customersCount,
            'recentSales' => $recentSales,
            'salesByDay' => $salesByDay,
            'brandBreakdown' => $brandBreakdown,
            'periodMetrics' => [
                'day' => $calcPeriod(1),
                'week' => $calcPeriod(7),
                'month' => $calcPeriod(30),
                'bimonth' => $calcPeriod(60),
                'quarter' => $calcPeriod(90),
                'year' => $calcPeriod(365),
            ],
        ]);
    }
}
