<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReaderController extends Controller
{
    /**
     * Return the published catalog tree for the student library view.
     * Structure: categories → grades → books (no chapters exposed here).
     */
    public function library(Request $request): JsonResponse
    {
        $categoryType = CatalogNodeType::where('slug', 'category')->first();
        $gradeType = CatalogNodeType::where('slug', 'grade')->first();
        $bookType = CatalogNodeType::where('slug', 'book')->first();

        if (! $categoryType || ! $gradeType || ! $bookType) {
            return response()->json(['categories' => []]);
        }

        // A student only sees their CURRENT grade's books (and its parent category
        // / school level). Admins, teachers and parents see every published grade.
        $user = $request->user();
        $currentGrade = \App\Support\EnrollmentService::currentGrade($user);
        $studentOnlyCurrentGrade = $user->hasRole('student');

        $bookReadPercent = \App\Support\ProgressReport::bookReadPercent($user);

        $categories = CatalogNode::where('catalog_node_type_id', $categoryType->id)
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->get()
            ->map(function ($category) use ($gradeType, $bookType, $bookReadPercent, $currentGrade, $studentOnlyCurrentGrade) {
                $gradeQuery = CatalogNode::where('parent_id', $category->id)
                    ->where('catalog_node_type_id', $gradeType->id)
                    ->where('status', 'published')
                    ->orderBy('sort_order');

                // For a student, show only their current grade within this category.
                if ($studentOnlyCurrentGrade && $currentGrade) {
                    $gradeQuery->where('id', $currentGrade->id);
                }

                $grades = $gradeQuery->get()
                    ->map(function ($grade) use ($bookType, $bookReadPercent) {
                        $books = CatalogNode::where('parent_id', $grade->id)
                            ->where('catalog_node_type_id', $bookType->id)
                            ->where('status', 'published')
                            ->orderBy('sort_order')
                            ->withCount('children')
                            ->get()
                            ->map(fn ($book) => [
                                'id' => $book->id,
                                'name' => $book->name,
                                'slug' => $book->slug,
                                'description' => $book->description,
                                'chapters_count' => $book->children_count,
                                'read_percent' => $bookReadPercent[$book->id] ?? 0,
                            ]);

                        return [
                            'id' => $grade->id,
                            'name' => $grade->name,
                            'slug' => $grade->slug,
                            'books' => $books,
                        ];
                    })
                    ->filter(fn ($g) => $g['books']->isNotEmpty())
                    ->values();

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => $category->description,
                    'grades' => $grades,
                ];
            })
            ->filter(fn ($c) => $c['grades']->isNotEmpty())
            ->values();

        return response()->json(['categories' => $categories]);
    }

    /**
     * Return a single book with all its published chapters and their
     * active content blocks, ready for the reader UI.
     */
    /**
     * Return a single book with all its published chapters, content blocks,
     * end-of-chapter exams, and student progression lock status.
     */
    public function show(CatalogNode $book, Request $request): JsonResponse
    {
        $user = $request->user();
        $bookType = CatalogNodeType::where('slug', 'book')->first();

        if (! $bookType || $book->catalog_node_type_id !== $bookType->id) {
            return response()->json(['message' => 'Not a book node.'], 404);
        }

        if ($book->status !== 'published') {
            return response()->json(['message' => 'This book is not published.'], 404);
        }

        // A book outside the student's current grade is a PAST-YEAR book: the
        // student may read the story and see the exam + answers, but cannot take it.
        $isCurrentGrade = \App\Support\EnrollmentService::bookIsInCurrentGrade($user, $book);
        $readOnly = $user->hasRole('student') && ! $isCurrentGrade;

        // Fetch passed exams for this user
        $passedExamIds = \App\Models\ExamAttempt::where('user_id', $user->id)
            ->where('passed', true)
            ->pluck('exam_id')
            ->toArray();

        $chaptersRaw = $book->children()
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->with([
                'contentBlocks' => fn ($q) => $q->where('is_active', true)->orderBy('position'),
                'contentBlocks.media',
                'exams' => fn ($q) => $q->where('status', 'published')->with('questions'),
            ])
            ->get();

        $previousChapterPassed = true; // Chapter 1 is always unlocked

        $chapters = $chaptersRaw->map(function ($chapter, $index) use (&$previousChapterPassed, $passedExamIds, $user) {
            $exam = $chapter->exams->first();
            $examPassed = $exam ? in_array($exam->id, $passedExamIds) : true;
            $hasExam = (bool) $exam;

            // Determine if chapter is unlocked (unlocked if previous chapter was passed or had no exam)
            $isUnlocked = ($index === 0) || $previousChapterPassed;

            // Update gating condition for the NEXT chapter in sequence
            $previousChapterPassed = $isUnlocked && $examPassed;

            $bestAttempt = $exam ? \App\Models\ExamAttempt::where('user_id', $user->id)
                ->where('exam_id', $exam->id)
                ->orderByDesc('score')
                ->first() : null;

            return [
                'id' => $chapter->id,
                'name' => $chapter->name,
                'slug' => $chapter->slug,
                'description' => $chapter->description,
                'sort_order' => $chapter->sort_order,
                'is_unlocked' => $isUnlocked,
                'content_blocks' => $chapter->contentBlocks->map(fn ($block) => [
                    'id' => $block->id,
                    'type' => $block->type,
                    'title' => $block->title,
                    'content' => $block->content,
                    'data' => $block->data,
                    'media' => $block->media ? [
                        'id' => $block->media->id,
                        'url' => $block->media->url,
                        'file_name' => $block->media->file_name,
                        'mime_type' => $block->media->mime_type,
                    ] : null,
                    'position' => $block->position,
                ]),
                'exam' => $exam ? [
                    'id' => $exam->id,
                    'title' => $exam->title,
                    'description' => $exam->description,
                    'pass_percentage' => $exam->pass_percentage ?? 50,
                    'duration_minutes' => $exam->duration_minutes ?? 30,
                    'max_attempts' => $exam->max_attempts ?? 3,
                    'passed' => $examPassed,
                    'read_only' => $readOnly,
                    'best_attempt' => $bestAttempt ? [
                        'score' => $bestAttempt->score,
                        'percentage' => $bestAttempt->percentage,
                        'passed' => $bestAttempt->passed,
                    ] : null,
                    'questions' => $exam->questions->map(fn ($q) => [
                        'id' => $q->id,
                        'question' => $q->question,
                        'type' => $q->type,
                        'options' => $q->options,
                        'points' => $q->points ?? 1,
                        'position' => $q->position,
                        // For read-only (past year) exams, expose the correct
                        // answer so the student can review it.
                        'correct_answer' => $readOnly ? $q->correct_answer : null,
                        'correct_answers' => $readOnly ? $q->correct_answers : null,
                    ]),
                ] : null,
            ];
        });

        // Load parent chain for breadcrumb
        $grade = $book->parent;
        $category = $grade?->parent;

        return response()->json([
            'book' => [
                'id' => $book->id,
                'name' => $book->name,
                'slug' => $book->slug,
                'description' => $book->description,
                'category' => $category ? ['id' => $category->id, 'name' => $category->name] : null,
                'grade' => $grade ? ['id' => $grade->id, 'name' => $grade->name] : null,
                'chapters' => $chapters,
            ],
        ]);
    }

    /**
     * Submit an exam attempt, calculate student score, record attempt,
     * and update chapter completion progress.
     */
    public function submitExam(Request $request, \App\Models\Exam $exam): JsonResponse
    {
        $user = $request->user();

        // Prevent submitting exams for books outside the student's current grade
        // (past-year books are read-only: view story + answers only).
        if ($user->hasRole('student')) {
            $chapter = $exam->catalog_node_id ? CatalogNode::find($exam->catalog_node_id) : null;
            $book = $chapter?->parent;
            if ($book && ! \App\Support\EnrollmentService::bookIsInCurrentGrade($user, $book)) {
                return response()->json([
                    'message' => 'This exam was from a previous grade and cannot be taken again. You can review the answers only.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'answers' => ['sometimes', 'array'],
        ]);

        $exam->load('questions');
        $questions = $exam->questions;

        $totalPoints = 0;
        $earnedPoints = 0;
        $breakdown = [];

        foreach ($questions as $question) {
            $pts = $question->points ?? 1;
            $totalPoints += $pts;
            $userAns = trim((string) ($validated['answers'][$question->id] ?? ''));
            $correctAns = trim((string) ($question->correct_answer ?? ''));

            $isCorrect = false;
            if ($userAns === '') {
                // Skipped/unanswered questions never count as correct.
                $isCorrect = false;
            } elseif ($question->type === 'multiple_choice' || $question->type === 'true_false') {
                $isCorrect = strtolower($userAns) === strtolower($correctAns);
            } else {
                // Short answer / fill blank: exact match only (strict, so random
                // input is never graded as correct).
                $isCorrect = $correctAns !== '' && strtolower($userAns) === strtolower($correctAns);
            }

            if ($isCorrect) {
                $earnedPoints += $pts;
            }

            $breakdown[] = [
                'question_id' => $question->id,
                'question' => $question->question,
                'user_answer' => $userAns,
                'correct_answer' => $correctAns,
                'is_correct' => $isCorrect,
                'points' => $pts,
            ];
        }

        $percentage = $totalPoints > 0 ? (int) round(($earnedPoints / $totalPoints) * 100) : 0;
        $passPercentage = $exam->pass_percentage ?? 50;
        $passed = $percentage >= $passPercentage;

        $attempt = \App\Models\ExamAttempt::create([
            'exam_id' => $exam->id,
            'user_id' => $user->id,
            'score' => $earnedPoints,
            'total_points' => $totalPoints,
            'percentage' => $percentage,
            'passed' => $passed,
            'answers' => $validated['answers'],
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Update student progress on chapter node if passed
        if ($passed && $exam->catalog_node_id) {
            \App\Models\StudentProgress::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'catalog_node_id' => $exam->catalog_node_id,
                    'progress_type' => 'exam',
                ],
                [
                    'progress_percent' => 100,
                    'completed' => true,
                    'completed_at' => now(),
                ]
            );
        }

        return response()->json([
            'message' => $passed ? 'Congratulations! You passed the chapter exam!' : 'Exam submitted. You need ' . $passPercentage . '% to pass.',
            'passed' => $passed,
            'score' => $earnedPoints,
            'total_points' => $totalPoints,
            'percentage' => $percentage,
            'pass_percentage' => $passPercentage,
            'breakdown' => $breakdown,
        ]);
    }
}
