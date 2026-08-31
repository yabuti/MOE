<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuestionController extends Controller
{
    public function index(Exam $exam): JsonResponse
    {
        $questions = $exam->questions->map(function ($question) {
            return $question->makeVisible(['correct_answer', 'correct_answers']);
        });

        return response()->json([
            'questions' => $questions,
            'total' => $questions->count(),
        ]);
    }

    public function store(Request $request, Exam $exam): JsonResponse
    {
        $validated = $request->validate([
            'question' => ['required', 'string'],
            'type' => ['required', 'string', 'in:multiple_choice,true_false,short_answer,fill_blank'],
            'options' => ['nullable', 'array'],
            'correct_answer' => ['nullable', 'string'],
            'correct_answers' => ['nullable', 'array'],
            'points' => ['nullable', 'numeric', 'min:0'],
            'position' => ['nullable', 'integer'],
        ]);

        $question = $exam->questions()->create($validated);

        return response()->json([
            'message' => 'Question created successfully.',
            'question' => $question->makeVisible(['correct_answer', 'correct_answers']),
        ], 201);
    }

    public function update(Request $request, ExamQuestion $question): JsonResponse
    {
        $validated = $request->validate([
            'question' => ['sometimes', 'string'],
            'type' => ['sometimes', 'string', 'in:multiple_choice,true_false,short_answer,fill_blank'],
            'options' => ['nullable', 'array'],
            'correct_answer' => ['nullable', 'string'],
            'correct_answers' => ['nullable', 'array'],
            'points' => ['nullable', 'numeric', 'min:0'],
            'position' => ['nullable', 'integer'],
        ]);

        $question->update($validated);

        return response()->json([
            'message' => 'Question updated successfully.',
            'question' => $question->makeVisible(['correct_answer', 'correct_answers']),
        ]);
    }

    public function destroy(ExamQuestion $question): JsonResponse
    {
        $question->delete();

        return response()->json([
            'message' => 'Question deleted successfully.',
        ]);
    }
}
