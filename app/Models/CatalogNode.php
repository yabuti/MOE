<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['catalog_node_type_id', 'parent_id', 'name', 'slug', 'description', 'meta', 'sort_order', 'status', 'is_locked'])]
#[Hidden([])]
class CatalogNode extends Model
{
    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'is_locked' => 'boolean',
        ];
    }

    public function catalogNodeType(): BelongsTo
    {
        return $this->belongsTo(CatalogNodeType::class, 'catalog_node_type_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort_order');
    }

    public function contentBlocks(): HasMany
    {
        return $this->hasMany(ContentBlock::class)->orderBy('position');
    }

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(StudentProgress::class);
    }
}
