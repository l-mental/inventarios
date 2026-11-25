<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'user_id',
        'customer_id',
        'total',
        'status',
        'payment_method',
        'with_invoice',
        'cash_amount',
        'qr_amount',
        'credit_amount',
        'paid_amount',
        'discount_amount',
        'points_redeemed',
        'cancel_reason',
        'cancelled_at',
        'cancelled_by',
    ];

    protected $casts = [
        'total' => 'float',
        'cash_amount' => 'float',
        'qr_amount' => 'float',
        'credit_amount' => 'float',
        'paid_amount' => 'float',
        'discount_amount' => 'float',
        'with_invoice' => 'boolean',
        'cancelled_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function details()
    {
        return $this->hasMany(SaleDetail::class);
    }

    public function creditPayments()
    {
        return $this->hasMany(CreditPayment::class);
    }
}
