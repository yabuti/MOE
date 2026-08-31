<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'event', 'auditable_type', 'auditable_id', 'ip_address', 'user_agent', 'old_values', 'new_values', 'meta'])]
#[Hidden([])]
class AuditLog extends Model
{
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'meta' => 'array',
        ];
    }

    public function auditable()
    {
        return $this->morphTo();
    }
}
