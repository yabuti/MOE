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

    public function bulkImport(Request $request, Exam $exam): JsonResponse
    {
        $validated = $request->validate([
            'raw_text' => ['required', 'string'],
        ]);

        $text = $validated['raw_text'];
        $questionsCreated = 0;

        // Basic parser for format:
        // 1. Question text here?
        // A) Option 1
        // B) Option 2
        // C) Option 3
        // D) Option 4
        // Answer: A

        // Split by numbered question pattern (e.g. "1. ", "2. ", "1) ", "2) ")
        $blocks = preg_split('/^\s*\d+[\.\)]\s*/m', $text, -1, PREG_SPLIT_NO_EMPTY);

        foreach ($blocks as $block) {
            $block = trim($block);
            if (empty($block)) continue;

            // Extract Answer
            $answerStr = '';
            if (preg_match('/Answer:\s*([A-Za-z])/i', $block, $match)) {
                $answerStr = strtoupper(trim($match[1]));
                $block = preg_replace('/Answer:\s*[A-Za-z].*/i', '', $block);
            } elseif (preg_match('/Correct:\s*([A-Za-z])/i', $block, $match)) {
                $answerStr = strtoupper(trim($match[1]));
                $block = preg_replace('/Correct:\s*[A-Za-z].*/i', '', $block);
            }

            // Extract Options
            $options = [];
            $lines = explode("\n", $block);
            $questionTextLines = [];
            
            $optionRegex = '/^([A-E])[\.\)]\s*(.+)/i';
            
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line)) continue;
                
                if (preg_match($optionRegex, $line, $optMatch)) {
                    $letter = strtoupper($optMatch[1]);
                    $optText = trim($optMatch[2]);
                    $options[$letter] = $optText;
                } else {
                    // If we haven't found options yet, it's part of the question
                    if (empty($options)) {
                        $questionTextLines[] = $line;
                    }
                }
            }
            
            $questionText = trim(implode("\n", $questionTextLines));
            
            if (!empty($questionText) && count($options) >= 2) {
                // Determine correct answer text
                $correctAnswerText = $options[$answerStr] ?? null;
                if (!$correctAnswerText && !empty($options)) {
                    // Default to first option if no valid answer found
                    $correctAnswerText = reset($options);
                }
                
                $exam->questions()->create([
                    'question' => $questionText,
                    'type' => 'multiple_choice',
                    'options' => array_values($options),
                    'correct_answer' => $correctAnswerText,
                    'points' => 1,
                    'position' => $exam->questions()->max('position') + 1,
                ]);
                $questionsCreated++;
            }
        }

        return response()->json([
            'message' => "Successfully imported {$questionsCreated} questions.",
            'count' => $questionsCreated
        ]);
    }
}
