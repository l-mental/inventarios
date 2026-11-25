<?php

namespace Database\Seeders;

use App\Models\CashMovement;
use App\Models\CashSession;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationDetail;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoOperationsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('username', 'admin')->first();
        if (!$admin) {
            return;
        }

        // Settings
        $settings = [
            'company_name' => 'AgroPartes Tractores S.R.L.',
            'company_nit' => '1028495021',
            'currency' => 'Bs',
            'phone' => '77889900',
            'address' => 'Av. Agrícola Km 4, Zona Talleres Maquinaria Pesada',
            'tax_percentage' => '13',
        ];
        foreach ($settings as $key => $value) {
            SystemSetting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        // Customers
        $customers = [
            ['name' => 'Estancia Agrícola El Porvenir', 'email' => 'compras@elporvenir.bo', 'phone' => '78945612', 'address' => 'Carretera al Norte Km 32', 'points' => 240],
            ['name' => 'Taller Mecánico Diesel & Agro', 'email' => 'taller.dieselagro@gmail.com', 'phone' => '71239845', 'address' => 'Av. Cristo Redentor Km 8', 'points' => 165],
            ['name' => 'Cooperativa Cañeros Unidos', 'email' => 'logistica@canerosunidos.org', 'phone' => '68521479', 'address' => 'Zona Montero Parque Industrial', 'points' => 320],
            ['name' => 'Ing. Roberto Chávez Mendoza', 'email' => 'rchavez@agroservicios.bo', 'phone' => '74125896', 'address' => 'Av. Banzer 4to Anillo #402', 'points' => 90],
            ['name' => 'Hacienda San Ignacio S.R.L.', 'email' => 'repuestos@sanignacio.com', 'phone' => '77445566', 'address' => 'Ruta San Ignacio Km 14', 'points' => 410],
        ];
        foreach ($customers as $cust) {
            Customer::firstOrCreate(['email' => $cust['email']], $cust);
        }

        // Initial Sale
        if (Sale::count() === 0) {
            $workshop = Customer::skip(1)->first();
            $piston = Product::where('barcode', 'EM9532')->first();
            $cojinete = Product::where('barcode', '4949')->first();

            if ($piston && $cojinete) {
                $total = round($piston->price * 2 + $cojinete->price, 2);
                $sale = Sale::create([
                    'user_id' => $admin->id,
                    'customer_id' => $workshop?->id,
                    'total' => $total,
                    'payment_method' => 'CASH',
                    'cash_amount' => $total,
                    'paid_amount' => $total,
                    'with_invoice' => true,
                    'status' => 'COMPLETED',
                ]);
                SaleDetail::create([
                    'sale_id' => $sale->id,
                    'product_id' => $piston->id,
                    'quantity' => 2,
                    'unit_price' => $piston->price,
                    'subtotal' => round($piston->price * 2, 2),
                ]);
                SaleDetail::create([
                    'sale_id' => $sale->id,
                    'product_id' => $cojinete->id,
                    'quantity' => 1,
                    'unit_price' => $cojinete->price,
                    'subtotal' => $cojinete->price,
                ]);
            }
        }

        // Demo Quotation
        if (Quotation::count() === 0) {
            $firstCust = Customer::first();
            $camisa = Product::where('barcode', '51-09415-000')->first();
            $anilla = Product::where('barcode', '4948')->first();
            if ($camisa && $anilla) {
                $totalQ = round($camisa->price * 4 + $anilla->price * 4, 2);
                $q = Quotation::create([
                    'user_id' => $admin->id,
                    'customer_id' => $firstCust?->id,
                    'total' => $totalQ,
                    'valid_until' => now()->addDays(7)->toDateString(),
                    'notes' => 'Proforma overhaul motor tractor Fiat / Perkins 1104',
                    'status' => 'PENDING',
                ]);
                QuotationDetail::create([
                    'quotation_id' => $q->id,
                    'product_id' => $camisa->id,
                    'quantity' => 4,
                    'unit_price' => $camisa->price,
                    'subtotal' => round($camisa->price * 4, 2),
                ]);
                QuotationDetail::create([
                    'quotation_id' => $q->id,
                    'product_id' => $anilla->id,
                    'quantity' => 4,
                    'unit_price' => $anilla->price,
                    'subtotal' => round($anilla->price * 4, 2),
                ]);
            }
        }

        // Expenses
        if (Expense::count() === 0) {
            $today = now()->toDateString();
            Expense::create(['user_id' => $admin->id, 'category' => 'Alquiler', 'description' => 'Alquiler tienda y almacén central de repuestos agrícolas', 'amount' => 2400.00, 'expense_date' => $today, 'payment_method' => 'QR']);
            Expense::create(['user_id' => $admin->id, 'category' => 'Servicios Básicos', 'description' => 'Energía eléctrica e internet tienda principal', 'amount' => 380.00, 'expense_date' => $today, 'payment_method' => 'CASH']);
            Expense::create(['user_id' => $admin->id, 'category' => 'Logística y Transporte', 'description' => 'Despacho y flete importación QTP / GB Ricambi', 'amount' => 420.00, 'expense_date' => $today, 'payment_method' => 'QR']);
        }

        // Open Cash Session
        if (CashSession::count() === 0) {
            $session = CashSession::create([
                'user_id' => $admin->id,
                'opening_amount' => 500.00,
                'extra_income' => 150.00,
                'extra_expense' => 0.00,
                'notes' => 'Apertura de turno Sucursal Central',
                'status' => 'OPEN',
                'opened_at' => now(),
            ]);
            CashMovement::create([
                'session_id' => $session->id,
                'user_id' => $admin->id,
                'type' => 'INCOME',
                'amount' => 150.00,
                'reason' => 'Fondo sencillo para caja mostrador',
            ]);
        }
    }
}
