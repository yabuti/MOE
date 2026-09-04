<?php

namespace App\Support;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use App\Models\ExamAttempt;
use App\Models\StudentProgress;
use App\Models\User;

class ProgressReport
{
    /**
     * Build a full progress report for a student: per-book and per-chapter
     * reading / listening percentages, best exam result per chapter, the
     * overall "read" and "understand" percentages, and the most-read chapter.
     */
    public static function forUser(User $user): array
    {
        $bookType = CatalogNodeType::where('slug', 'book')->first();
        if (! $bookType) {
            return self::emptyReport();
        }

        $readMap = [];
        $listenMap = [];
        StudentProgress::where('user_id', $user->id)
            ->whereIn('progress_type', ['read', 'listen'])
            ->get(['catalog_node_id', 'progress_type', 'progress_percent'])
            ->each(function ($p) use (&$readMap, &$listenMap) {
                if ($p->progress_type === 'read') {
                    $readMap[$p->catalog_node_id] = max($readMap[$p->catalog_node_id] ?? 0, (int) $p->progress_percent);
                } else {
                    $listenMap[$p->catalog_node_id] = max($listenMap[$p->catalog_node_id] ?? 0, (int) $p->progress_percent);
                }
            });

        $examResults = [];
        ExamAttempt::where('user_id', $user->id)
            ->orderByDesc('percentage')
            ->get(['exam_id', 'percentage', 'passed'])
            ->each(function ($a) use (&$examResults) {
                if (! isset($examResults[$a->exam_id])) {
                    $examResults[$a->exam_id] = [
                        'percentage' => (int) $a->percentage,
                        'passed' => (bool) $a->passed,
                    ];
                }
            });

        $books = [];
        $overallReadParts = [];
        $overallUnderstandParts = [];
        $mostRead = null;
        $mostReadPct = 0;

        CatalogNode::where('catalog_node_type_id', $bookType->id)
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->with([
                'children' => fn ($q) => $q->where('status', 'published')->orderBy('sort_order'),
                'children.exams' => fn ($q) => $q->where('status', 'published'),
            ])
            ->get()
            ->each(function ($book) use (
                &$books,
                &$overallReadParts,
                &$overallUnderstandParts,
                &$mostRead,
                &$mostReadPct,
                $readMap,
                $listenMap,
                $examResults
            ) {
                $chapters = $book->children;
                if ($chapters->isEmpty()) {
                    return;
                }

                $chaptersOut = [];
                $readTotal = 0;
                $listenTotal = 0;
                $understandTotal = 0;
                $understandCount = 0;

                foreach ($chapters as $ch) {
                    $readPct = $readMap[$ch->id] ?? 0;
                    $listenPct = $listenMap[$ch->id] ?? 0;
                    $activity = max($readPct, $listenPct);

                    $readTotal += $readPct;
                    $listenTotal += $listenPct;

                    $exam = $ch->exams->first();
                    $examOut = null;
                    if ($exam) {
                        $res = $examResults[$exam->id] ?? null;
                        $examOut = $res !== null
                            ? [
                                'id' => $exam->id,
                                'title' => $exam->title,
                                'percentage' => $res['percentage'],
                                'passed' => $res['passed'],
                                'attempted' => true,
                            ]
                            : [
                                'id' => $exam->id,
                                'title' => $exam->title,
                                'percentage' => 0,
                                'passed' => false,
                                'attempted' => false,
                            ];

                        if ($res !== null) {
                            $understandTotal += $res['percentage'];
                            $understandCount++;
                        }
                    }

                    if ($activity > $mostReadPct) {
                        $mostReadPct = $activity;
                        $mostRead = [
                            'chapter_name' => $ch->name,
                            'book_name' => $book->name,
                            'percent' => $activity,
                        ];
                    }

                    $chaptersOut[] = [
                        'id' => $ch->id,
                        'name' => $ch->name,
                        'read_percent' => $readPct,
                        'listen_percent' => $listenPct,
                        'activity_percent' => $activity,
                        'exam' => $examOut,
                    ];
                }

                $count = count($chapters);
                $bookRead = (int) round($readTotal / $count);
                $bookListen = (int) round($listenTotal / $count);
                $bookUnderstand = $understandCount > 0 ? (int) round($understandTotal / $understandCount) : null;

                $overallReadParts[] = $bookRead;
                if ($bookUnderstand !== null) {
                    $overallUnderstandParts[] = $bookUnderstand;
                }

                $grade = $book->parent;
                $category = $grade?->parent;

                $books[] = [
                    'id' => $book->id,
                    'name' => $book->name,
                    'category' => $category?->name,
                    'grade' => $grade?->name,
                    'read_percent' => $bookRead,
                    'listen_percent' => $bookListen,
                    'exam_percent' => $bookUnderstand,
                    'chapters' => $chaptersOut,
                ];
            });

        return [
            'overall_read' => $overallReadParts !== [] ? (int) round(array_sum($overallReadParts) / count($overallReadParts)) : 0,
            'overall_understand' => $overallUnderstandParts !== [] ? (int) round(array_sum($overallUnderstandParts) / count($overallUnderstandParts)) : 0,
            'most_read_chapter' => $mostReadPct > 0 ? $mostRead : null,
            'books' => $books,
        ];
    }

    /**
     * Per-book overall "% read" (average of the chapter activity percentages),
     * keyed by book id. Used by the library listing.
     */
    public static function bookReadPercent(User $user): array
    {
        $bookType = CatalogNodeType::where('slug', 'book')->first();
        if (! $bookType) {
            return [];
        }

        $readMap = [];
        $listenMap = [];
        StudentProgress::where('user_id', $user->id)
            ->whereIn('progress_type', ['read', 'listen'])
            ->get(['catalog_node_id', 'progress_type', 'progress_percent'])
            ->each(function ($p) use (&$readMap, &$listenMap) {
                if ($p->progress_type === 'read') {
                    $readMap[$p->catalog_node_id] = max($readMap[$p->catalog_node_id] ?? 0, (int) $p->progress_percent);
                } else {
                    $listenMap[$p->catalog_node_id] = max($listenMap[$p->catalog_node_id] ?? 0, (int) $p->progress_percent);
                }
            });

        $out = [];
        CatalogNode::where('catalog_node_type_id', $bookType->id)
            ->where('status', 'published')
            ->with(['children' => fn ($q) => $q->where('status', 'published')])
            ->get()
            ->each(function ($book) use (&$out, $readMap, $listenMap) {
                $chapters = $book->children;
                if ($chapters->isEmpty()) {
                    return;
                }
                $total = 0;
                foreach ($chapters as $ch) {
                    $total += max($readMap[$ch->id] ?? 0, $listenMap[$ch->id] ?? 0);
                }
                $out[$book->id] = (int) round($total / count($chapters));
            });

        return $out;
    }

    private static function emptyReport(): array
    {
        return [
            'overall_read' => 0,
            'overall_understand' => 0,
            'most_read_chapter' => null,
            'books' => [],
        ];
    }
}