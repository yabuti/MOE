<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamQuestion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Smalot\PdfParser\Parser;

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

        $questionsCreated = $this->createQuestions($exam, $this->parseText($validated['raw_text']));

        return response()->json([
            'message' => "Successfully imported {$questionsCreated} questions.",
            'count' => $questionsCreated,
        ]);
    }

    /**
     * Import questions from an uploaded PDF (numbered multiple-choice blocks:
     * question text, A)…D) options and "Answer: X").
     */
    public function importPdf(Request $request, Exam $exam): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
        ]);

        $text = $this->extractText($request->file('file'));

        if ($text === null || trim($text) === '') {
            return response()->json([
                'message' => 'Could not extract any questions text from the PDF. Scanned (image-only) PDFs are not supported — please use a digital PDF with selectable text.',
            ], 422);
        }

        $questionsCreated = $this->createQuestions($exam, $this->parseText($text));

        return response()->json([
            'message' => "Successfully imported {$questionsCreated} questions.",
            'count' => $questionsCreated,
        ], $questionsCreated > 0 ? 201 : 200);
    }

    /**
     * Parse CSV/text and PDF content into multiple-choice questions. Format:
     *
     *  1. Question text here?
     *  A) Option 1
     *  B) Option 2
     *  C) Option 3
     *  D) Option 4
     *  Answer: A
     */
    private function parseText(string $text): array
    {
        $blocks = preg_split('/^\s*\d+[\.\)]\s*/m', $text, -1, PREG_SPLIT_NO_EMPTY);

        $out = [];

        foreach ($blocks as $block) {
            $block = trim($block);
            if ($block === '') {
                continue;
            }

            $answerStr = '';
            if (preg_match('/Answer:\s*([A-Za-z])/i', $block, $match)) {
                $answerStr = strtoupper(trim($match[1]));
                $block = preg_replace('/Answer:\s*[A-Za-z].*/i', '', $block);
            } elseif (preg_match('/Correct:\s*([A-Za-z])/i', $block, $match)) {
                $answerStr = strtoupper(trim($match[1]));
                $block = preg_replace('/Correct:\s*[A-Za-z].*/i', '', $block);
            }

            $options = [];
            $questionTextLines = [];
            $optionRegex = '/^([A-E])[\.\)]\s*(.+)/i';

            foreach (explode("\n", $block) as $line) {
                $line = trim($line);
                if ($line === '') {
                    continue;
                }

                if (preg_match($optionRegex, $line, $optMatch)) {
                    $options[strtoupper($optMatch[1])] = trim($optMatch[2]);
                } elseif (empty($options)) {
                    $questionTextLines[] = $line;
                }
            }

            if (count($options) < 2) {
                continue;
            }

            $correctAnswerText = $options[$answerStr] ?? reset($options);

            $out[] = [
                'question' => trim(implode("\n", $questionTextLines)) ?: 'Question',
                'options' => array_values($options),
                'correct_answer' => $correctAnswerText,
            ];
        }

        return $out;
    }

    private function createQuestions(Exam $exam, array $questions): int
    {
        $created = 0;

        foreach ($questions as $q) {
            $exam->questions()->create([
                'question' => $q['question'],
                'type' => 'multiple_choice',
                'options' => $q['options'],
                'correct_answer' => $q['correct_answer'],
                'points' => 1,
                'position' => ($exam->questions()->max('position') ?? 0) + 1,
            ]);
            $created++;
        }

        return $created;
    }

    private function extractText($file): ?string
    {
        try {
            set_time_limit(45);

            register_shutdown_function(function () {
                $error = error_get_last();

                if (is_array($error) && str_contains((string) $error['message'], 'Maximum execution time')) {
                    http_response_code(422);
                    header('Content-Type: application/json', true);
                    echo json_encode([
                        'message' => 'This PDF took too long to analyze and was cancelled. Please use a smaller digital PDF.',
                    ]);
                }
            });

            $parser = new Parser();
            $pdf = $parser->parseFile($file->getRealPath());

            return $pdf->getText();
        } catch (\Throwable $e) {
            return null;
        }
    }
}
