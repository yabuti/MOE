<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['exam_id', 'question', 'type', 'options', 'correct_answer', 'correct_answers', 'points', 'position'])]
#[Hidden(['correct_answer', 'correct_answers'])]
class ExamQuestion extends Model
{
    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answers' => 'array',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
