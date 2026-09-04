<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'code', 'type', 'region', 'zone', 'woreda', 'city', 'address', 'phone', 'email', 'principal_name', 'is_active', 'academic_year_month', 'academic_year_day'])]
#[Hidden([])]
class School extends Model
{
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'academic_year_month' => 'integer',
            'academic_year_day' => 'integer',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('role')->withTimestamps();
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }
}
