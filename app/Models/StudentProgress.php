<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'catalog_node_id', 'progress_type', 'related_id', 'reading_seconds', 'progress_percent', 'completed', 'completed_at'])]
#[Hidden([])]
class StudentProgress extends Model
{
    protected function casts(): array
    {
        return [
            'reading_seconds' => 'integer',
            'progress_percent' => 'integer',
            'completed' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function catalogNode(): BelongsTo
    {
        return $this->belongsTo(CatalogNode::class);
    }
}
