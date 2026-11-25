<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'barcode',
        'oem_codes',
        'name',
        'description',
        'category',
        'brand',
        'unit_type',
        'supplier_name',
        'cost_price',
        'price',
        'stock',
        'min_stock',
        'branch_stocks',
        'batch_number',
        'expiry_date',
        'is_combo',
        'combo_items',
        'active',
    ];

    protected $casts = [
        'cost_price' => 'float',
        'price' => 'float',
        'stock' => 'integer',
        'min_stock' => 'integer',
        'branch_stocks' => 'array',
        'combo_items' => 'array',
        'is_combo' => 'boolean',
        'active' => 'boolean',
    ];

    protected $appends = ['stock_status'];

    /**
     * Regla exacta: min_stock = 0 no genera alerta de stock bajo ni error.
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->stock <= 0) {
            return 'sin_stock';
        }
        if ($this->min_stock > 0 && $this->stock <= $this->min_stock) {
            return 'bajo';
        }
        return 'normal';
    }
}
