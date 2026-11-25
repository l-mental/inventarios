<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashSession extends Model
{
    protected $fillable = [
        'user_id', 'opening_amount', 'closing_amount', 'expected_amount',
        'extra_income', 'extra_expense', 'notes', 'status', 'opened_at', 'closed_at',
    ];

    protected $casts = [
        'opening_amount' => 'float',
        'closing_amount' => 'float',
        'expected_amount' => 'float',
        'extra_income' => 'float',
        'extra_expense' => 'float',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function movements()
    {
        return $this->hasMany(CashMovement::class, 'session_id');
    }
}
