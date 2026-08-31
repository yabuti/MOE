<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['catalog_node_id', 'title', 'description', 'pass_percentage', 'duration_minutes', 'max_attempts', 'status'])]
#[Hidden([])]
class Exam extends Model
{
    public function catalogNode(): BelongsTo
    {
        return $this->belongsTo(CatalogNode::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ExamQuestion::class)->orderBy('position');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }
}
