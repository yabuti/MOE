<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser;

class BookImportController extends Controller
{
    /**
     * Parse the uploaded PDF and return the detected chapter/section tree
     * without writing anything to the database.
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
            'book_id' => ['nullable', 'integer', 'exists:catalog_nodes,id'],
        ]);

        $text = $this->extractText($request->file('file'));

        if ($text === null || trim($text) === '') {
            return response()->json([
                'message' => 'Could not extract any text from the PDF.',
            ], 422);
        }

        return response()->json([
            'tree' => $this->detectTree($text),
            'text_preview' => Str::limit(preg_replace('/\s+/', ' ', $text), 1200),
        ]);
    }

    /**
     * Upload a book PDF, parse it, build the Book -> Chapter -> Section
     * node tree and persist it under the chosen parent book node.
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
            'book_id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'book_title' => ['nullable', 'string', 'max:255'],
        ]);

        $text = $this->extractText($request->file('file'));

        if ($text === null || trim($text) === '') {
            return response()->json([
                'message' => 'Could not extract any text from the PDF.',
            ], 422);
        }

        $tree = $this->detectTree($text);

        if (count($tree) === 0) {
            return response()->json([
                'message' => 'No chapter or section headings could be detected in this PDF.',
            ], 422);
        }

        $parent = CatalogNode::findOrFail($validated['book_id']);

        $chapterType = CatalogNodeType::where('slug', 'chapter')->firstOrFail();
        $sectionType = CatalogNodeType::where('slug', 'section')->firstOrFail();

        $created = DB::transaction(function () use ($tree, $parent, $chapterType, $sectionType, $request, $validated) {
            $order = $parent->children()->max('sort_order') ?? 0;
            $chapters = [];

            foreach ($tree as $chapter) {
                $order++;
                $chapterNode = $parent->children()->create([
                    'catalog_node_type_id' => $chapterType->id,
                    'name' => $chapter['title'],
                    'slug' => $this->uniqueSlug(Str::slug($chapter['title'])),
                    'description' => $this->trimmedName($chapter['title']),
                    'meta' => [
                        'source' => 'pdf_import',
                        'detected_heading' => $chapter['heading'],
                        'imported_by' => $request->user()->id,
                        'imported_at' => now()->toISOString(),
                    ],
                    'sort_order' => $order,
                    'status' => 'draft',
                ]);

                $sectionOrder = 0;
                foreach ($chapter['sections'] as $section) {
                    $sectionOrder++;
                    $chapterNode->children()->create([
                        'catalog_node_type_id' => $sectionType->id,
                        'name' => $section,
                        'slug' => $this->uniqueSlug(Str::slug($section)),
                        'meta' => [
                            'source' => 'pdf_import',
                            'imported_by' => $request->user()->id,
                            'imported_at' => now()->toISOString(),
                        ],
                        'sort_order' => $sectionOrder,
                        'status' => 'draft',
                    ]);
                }

                $chapters[] = $chapterNode->load('catalogNodeType');
            }

            return $chapters;
        });

        return response()->json([
            'message' => 'Book imported successfully. ' . count($created) . ' chapter(s) created.',
            'chapters' => $created,
        ], 201);
    }

    /**
     * Extract plain text from the uploaded PDF file.
     */
    private function extractText($file): ?string
    {
        try {
            $parser = new Parser();
            $pdf = $parser->parseFile($file->getRealPath());
            return $pdf->getText();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Detect a Book -> Chapter -> Section structure from the raw PDF text.
     *
     * Supports both Amharic and English heading keywords:
     *  - Chapter level : ምዕራፍ / Chapter / Unit
     *  - Section level : ክፍል / Section / Lesson / ትምህርት
     */
    private function detectTree(string $text): array
    {
        $chapters = [];
        $chapterIndex = -1;
        $pendingSections = [];

        $chapterPattern = '/^(?:ምዕራፍ|chapter|unit)\b/iu';
        $sectionPattern = '/^(?:ክፍል|section|lesson|ትምህርት)\b/iu';

        $lines = preg_split('/\R/u', $text);

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            $normalized = $this->normalizeHeadingLine($line);

            if ($normalized === '') {
                continue;
            }

            if (preg_match($chapterPattern, $normalized)) {
                // Flush pending sections into the new chapter's scope.
                $pendingSections = [];
                $chapters[] = [
                    'heading' => $line,
                    'title' => $this->buildTitle($line, 'Chapter', 'ምዕራፍ'),
                    'sections' => [],
                ];
                $chapterIndex = count($chapters) - 1;
                continue;
            }

            if (preg_match($sectionPattern, $normalized)) {
                $title = $this->buildTitle($line, 'Section', 'ክፍል');

                if ($chapterIndex >= 0) {
                    $chapters[$chapterIndex]['sections'][] = $title;
                } else {
                    // Sections that appear before any chapter heading.
                    $pendingSections[] = $title;
                }
                continue;
            }
        }

        // If we only found section-level headings (no chapter markers),
        // group them under a single default chapter.
        if (count($chapters) === 0 && count($pendingSections) > 0) {
            $chapters[] = [
                'heading' => 'Auto',
                'title' => 'ያልተመደበ ምዕራፍ',
                'sections' => $pendingSections,
            ];
            return $chapters;
        }

        // If we found chapter-level but a leading run of sections appeared
        // before the first chapter, attach them to the first chapter.
        if (count($pendingSections) > 0 && count($chapters) > 0) {
            $chapters[0]['sections'] = array_merge($pendingSections, $chapters[0]['sections']);
        }

        return $chapters;
    }

    /**
     * Returns the heading line with a leading chapter/section keyword and any
     * attached numbering (e.g. "1.", "1", "1.1", "-") removed, trimmed.
     */
    private function normalizeHeadingLine(string $line): string
    {
        $line = preg_replace('/^[0-9]+(?:\.[0-9]+)*[\.\)\-]?\s+/', '', $line);
        return trim($line);
    }

    /**
     * Build a human-readable title for a detected heading. When the heading is
     * just the keyword and a number, produce "{Keyword} {Number}".
     */
    private function buildTitle(string $heading, string $keyword, string $amharicKeyword): string
    {
        $trimmed = preg_replace('/^[0-9]+(?:\.[0-9]+)*[\.\)\-]?\s+/', '', $heading);
        $trimmed = trim($trimmed);

        // Pure numbering body < 6 chars (e.g. "1" or "1.2") -> keyword + number.
        if (preg_match('/^[0-9.]+$/', $trimmed) && strlen($trimmed) <= 6 && $trimmed !== '') {
            return $keyword . ' ' . $trimmed;
        }

        // Just the bare keyword (no number).
        if ($trimmed === '' || preg_match('/^(ምዕራፍ|chapter|unit|ክፍል|section|lesson|ትምህርት)$/i', $trimmed)) {
            return $keyword;
        }

        return $this->trimmedName($trimmed);
    }

    private function trimmedName(string $name): string
    {
        $name = mb_convert_encoding($name, 'UTF-8', 'UTF-8');
        return Str::limit($name, 190);
    }

    private function uniqueSlug(string $slug): string
    {
        $base = $slug ?: Str::random(6);
        $unique = $base;
        $count = 2;

        while (CatalogNode::where('slug', $unique)->exists()) {
            $unique = $base . '-' . $count;
            $count++;
        }

        return $unique;
    }
}
