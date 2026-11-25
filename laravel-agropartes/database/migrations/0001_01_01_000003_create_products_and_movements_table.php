<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('barcode')->nullable()->index(); // Código interno
            $table->text('oem_codes')->nullable(); // OEM / Equivalencias
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->default('MOTOR');
            $table->string('brand')->default('GENERAL');
            $table->string('unit_type')->default('UNIDAD');
            $table->string('supplier_name')->default('GENERAL');
            $table->decimal('cost_price', 12, 2)->default(0);
            $table->decimal('price', 12, 2)->default(0);
            $table->integer('stock')->default(0);
            $table->integer('min_stock')->default(0); // Soporta 0 sin alertas falsas
            $table->json('branch_stocks')->nullable();
            $table->string('batch_number')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('is_combo')->default(false);
            $table->json('combo_items')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products');
            $table->foreignId('user_id')->constrained('users');
            $table->string('type'); // IN, OUT, SALE, ADJUSTMENT
            $table->integer('quantity');
            $table->string('reason')->nullable();
            $table->timestamps();
        });

        Schema::create('branch_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products');
            $table->string('from_branch');
            $table->string('to_branch');
            $table->integer('quantity');
            $table->string('notes')->nullable();
            $table->foreignId('user_id')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_transfers');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('products');
    }
};
