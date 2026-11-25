<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PosSaleController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\UserAuditSettingsController;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Route;

// Autenticación
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// Rutas protegidas de la aplicación
Route::middleware('auth')->group(function () {
    $viewProps = function () {
        return [
            'settings' => SystemSetting::getMap(),
        ];
    };

    Route::get('/', fn () => redirect()->route('dashboard'));
    Route::get('/dashboard', fn () => view('pages.dashboard', $viewProps()))->name('dashboard');
    Route::get('/pos', fn () => view('pages.pos', $viewProps()))->name('pos');
    Route::get('/products', fn () => view('pages.products', $viewProps()))->name('products');
    Route::get('/inventory', fn () => view('pages.inventory', $viewProps()))->name('inventory');
    Route::get('/sales', fn () => view('pages.sales', $viewProps()))->name('sales');
    Route::get('/purchases', fn () => view('pages.purchases', $viewProps()))->name('purchases');
    Route::get('/customers', fn () => view('pages.customers', $viewProps()))->name('customers');
    Route::get('/finance', fn () => view('pages.finance', $viewProps()))->name('finance');
    Route::get('/users', fn () => view('pages.users', $viewProps()))->name('users');
    Route::get('/audit', fn () => view('pages.audit', $viewProps()))->name('audit');
    Route::get('/settings', fn () => view('pages.settings', $viewProps()))->name('settings');

    // Endpoints JSON internos autenticados por sesión Laravel (sin problemas de CORS ni tokens)
    Route::prefix('api')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::get('/stats', [DashboardController::class, 'stats']);

        Route::get('/products', [ProductController::class, 'index']);
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        Route::get('/branches', [InventoryController::class, 'branches']);
        Route::get('/branches/transfers', [InventoryController::class, 'transfers']);
        Route::post('/branches/transfer', [InventoryController::class, 'transfer']);
        Route::get('/inventory/movements', [InventoryController::class, 'movements']);

        Route::get('/sales', [PosSaleController::class, 'index']);
        Route::post('/sales', [PosSaleController::class, 'store']);
        Route::get('/sales/{sale}', [PosSaleController::class, 'show']);
        Route::post('/sales/{sale}/cancel', [PosSaleController::class, 'cancel']);

        Route::get('/quotations', [PosSaleController::class, 'quotations']);
        Route::post('/quotations', [PosSaleController::class, 'storeQuotation']);
        Route::post('/quotations/{quotation}/convert', [PosSaleController::class, 'convertQuotation']);

        Route::get('/suppliers', [PurchaseController::class, 'suppliers']);
        Route::get('/purchases', [PurchaseController::class, 'index']);
        Route::post('/purchases', [PurchaseController::class, 'store']);

        Route::get('/customers', [CustomerController::class, 'index']);
        Route::post('/customers', [CustomerController::class, 'store']);
        Route::put('/customers/{customer}', [CustomerController::class, 'update']);
        Route::get('/credits', [CustomerController::class, 'credits']);
        Route::post('/credits/pay', [CustomerController::class, 'payCredit']);

        Route::get('/cash/current', [CashRegisterController::class, 'current']);
        Route::get('/cash/history', [CashRegisterController::class, 'history']);
        Route::post('/cash/open', [CashRegisterController::class, 'open']);
        Route::post('/cash/movement', [CashRegisterController::class, 'movement']);
        Route::post('/cash/close', [CashRegisterController::class, 'close']);

        Route::get('/finance/summary', [FinanceController::class, 'summary']);
        Route::get('/expenses', [FinanceController::class, 'expenses']);
        Route::post('/expenses', [FinanceController::class, 'storeExpense']);
        Route::delete('/expenses/{expense}', [FinanceController::class, 'destroyExpense']);

        Route::get('/users', [UserAuditSettingsController::class, 'users']);
        Route::post('/users', [UserAuditSettingsController::class, 'storeUser']);
        Route::put('/users/{user}', [UserAuditSettingsController::class, 'updateUser']);
        Route::delete('/users/{user}', [UserAuditSettingsController::class, 'destroyUser']);
        Route::get('/roles', [UserAuditSettingsController::class, 'roles']);
        Route::get('/audit', [UserAuditSettingsController::class, 'audit']);
        Route::get('/settings', [UserAuditSettingsController::class, 'getSettings']);
        Route::post('/settings', [UserAuditSettingsController::class, 'saveSettings']);
        Route::get('/backup/download', [UserAuditSettingsController::class, 'downloadBackup']);
    });
});
