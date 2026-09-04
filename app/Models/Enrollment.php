<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'school_id', 'catalog_node_id', 'academic_year', 'status', 'started_at', 'ended_at'])]
#[Hidden([])]
class Enrollment extends Model
{
    protected function casts(): array
    {
        return [
            'status' => 'string',
            'started_at' => 'date',
            'ended_at' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /** The grade this enrollment places the student in (a "grade" catalog node). */
    public function grade(): BelongsTo
    {
        return $this->belongsTo(CatalogNode::class, 'catalog_node_id');
    }
}
