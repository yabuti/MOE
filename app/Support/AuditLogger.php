<?php

namespace App\Support;

use App\Models\AuditLog;

class AuditLogger
{
    public static function record(string $event, mixed $auditable = null, ?array $oldValues = null, ?array $newValues = null, array $meta = [], ?int $userId = null): AuditLog
    {
        return AuditLog::create([
            'user_id' => $userId ?? request()->user()?->id,
            'event' => $event,
            'auditable_type' => $auditable !== null ? get_class($auditable) : null,
            'auditable_id' => $auditable?->getKey(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'old_values' => $oldValues !== null ? self::normalize($oldValues) : null,
            'new_values' => $newValues !== null ? self::normalize($newValues) : null,
            'meta' => $meta !== [] ? $meta : null,
        ]);
    }

    private static function normalize(array $values): array
    {
        return collect($values)
            ->except(['created_at', 'updated_at'])
            ->map(fn (mixed $value): mixed => is_array($value) ? json_encode($value) : $value)
            ->all();
    }
}