<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = ['name', 'email', 'phone', 'address', 'points', 'credit_balance'];

    protected $casts = [
        'points' => 'integer',
        'credit_balance' => 'float',
    ];
}
