<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RolesAndUsersSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::firstOrCreate(['name' => 'Admin']);
        $sellerRole = Role::firstOrCreate(['name' => 'Vendedor']);

        User::firstOrCreate(
            ['username' => 'admin'],
            [
                'password' => Hash::make('admin123'),
                'full_name' => 'Administrador Sistema',
                'role_id' => $adminRole->id,
            ]
        );

        User::firstOrCreate(
            ['username' => 'vendedor'],
            [
                'password' => Hash::make('vendedor123'),
                'full_name' => 'Carlos Vendedor',
                'role_id' => $sellerRole->id,
            ]
        );
    }
}
