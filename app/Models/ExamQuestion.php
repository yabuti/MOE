<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Cast;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['exam_id', 'question', 'type', 'options', 'correct_answer', 'correct_answers', 'points', 'position'])]
#[Hidden(['correct_answer', 'correct_answers'])]
#[Cast('options', 'array')]
#[Cast('correct_answers', 'array')]
class ExamQuestion extends Model
{
    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }
}
