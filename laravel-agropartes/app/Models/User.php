<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $fillable = ['username', 'password', 'full_name', 'role_id'];
    protected $hidden = ['password', 'remember_token'];
    protected $appends = ['role_name'];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function getRoleNameAttribute(): string
    {
        return $this->role?->name ?? 'Vendedor';
    }

    public function isAdmin(): bool
    {
        return $this->role_name === 'Admin';
    }
}
