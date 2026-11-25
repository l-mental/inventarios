<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class TractorSuppliersSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['name' => 'BETTY VALLE GRANDE', 'phone' => '77410200', 'email' => 'ventas@bettyvallegrande.com', 'address' => 'Santa Cruz / Vallegrande'],
            ['name' => 'QTP - QUALITY TRACTOR PARTS', 'phone' => '76520300', 'email' => 'import@qtp-parts.com', 'address' => 'Distribuidor Oficial QTP'],
            ['name' => 'GB - RICAMBI S.P.A', 'phone' => '75430400', 'email' => 'ricambi@gbgroup.it', 'address' => 'Modena / Representante Regional'],
            ['name' => 'TVH DELLAROSA', 'phone' => '74340500', 'email' => 'pedidos@tvhdellarosa.com', 'address' => 'Zona Industrial Maquinaria'],
            ['name' => 'EMMARK BETTY', 'phone' => '73250600', 'email' => 'motor@emmark-parts.com', 'address' => 'División Motores Perkins / Fiat'],
            ['name' => 'MORELL POWER TRAIN', 'phone' => '72160700', 'email' => 'ventas@morellpowertrain.com', 'address' => 'Transmisión y Frenos Agrícolas'],
            ['name' => 'INDISA / TVH BRA', 'phone' => '71070800', 'email' => 'brasil@indisatvh.com', 'address' => 'Importación Línea Eléctrica'],
            ['name' => 'MEC DIESEL OMP', 'phone' => '70980900', 'email' => 'neff@mecdiesel.it', 'address' => 'Componentes Motor NEF / CNH'],
            ['name' => 'CAPRONI ITALIAN', 'phone' => '78891000', 'email' => 'hidraulica@caproni.it', 'address' => 'Bombas y Reparos Hidráulicos'],
            ['name' => 'SMY SAHIM', 'phone' => '77791100', 'email' => 'motor@smysahim.com', 'address' => 'Cojinetes y Repuestos Motor'],
            ['name' => 'TUZZI', 'phone' => '76691200', 'email' => 'implementos@tuzzi.com', 'address' => 'Enganches y Tercer Punto'],
            ['name' => 'YENIPARK - DEVO', 'phone' => '75591300', 'email' => 'export@yeniparkdevo.com', 'address' => 'Camisas y Conjuntos Motor'],
            ['name' => 'CORTECO / QTP', 'phone' => '74491400', 'email' => 'retenes@corteco-qtp.com', 'address' => 'Retenes y Sellos Alemanes'],
            ['name' => 'KOLBENSCHMIDT', 'phone' => '73391500', 'email' => 'empaques@ks-motor.de', 'address' => 'Empaquetaduras y Motor'],
            ['name' => 'CNH-GB', 'phone' => '72291600', 'email' => 'repuestos@cnh-gb.com', 'address' => 'Línea Fiat / New Holland'],
        ];

        foreach ($suppliers as $sup) {
            Supplier::firstOrCreate(['name' => $sup['name']], $sup);
        }
    }
}
