<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'label', 'parent_type_id', 'settings', 'sort_order', 'is_active'])]
#[Hidden([])]
class CatalogNodeType extends Model
{
    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function parentType(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_type_id');
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(CatalogNode::class, 'catalog_node_type_id');
    }
}
