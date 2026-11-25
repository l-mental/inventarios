<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = ['user_id', 'action', 'entity', 'entity_id', 'details'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function record(int $userId, string $action, string $entity, ?int $entityId = null, ?string $details = null): void
    {
        static::create([
            'user_id' => $userId,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'details' => $details,
        ]);
    }
}
