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
     * Parse the uploaded PDF and return the detected chapter tree
     * without writing anything to the database.
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
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
     * Upload a book PDF, parse it, build the Book -> Chapter node tree and
     * persist the chapters under the chosen parent book node. Content is
     * attached directly to each chapter.
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:51200'],
            'category_id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'grade_id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'book_title' => ['required', 'string', 'max:255'],
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
                'message' => 'No chapter headings could be detected in this PDF.',
            ], 422);
        }

        $grade = CatalogNode::findOrFail($validated['grade_id']);
        $bookType = CatalogNodeType::where('slug', 'book')->firstOrFail();
        $chapterType = CatalogNodeType::where('slug', 'chapter')->firstOrFail();

        $created = DB::transaction(function () use ($tree, $grade, $bookType, $chapterType, $request, $validated) {
            $book = $grade->children()->create([
                'catalog_node_type_id' => $bookType->id,
                'name' => $validated['book_title'],
                'slug' => $this->uniqueSlug(Str::slug($validated['book_title'])),
                'meta' => [
                    'source' => 'pdf_import',
                    'imported_by' => $request->user()->id,
                    'imported_at' => now()->toISOString(),
                ],
                'sort_order' => ($grade->children()->max('sort_order') ?? 0) + 1,
                'status' => 'draft',
            ]);

            $order = 0;
            $chapters = [];

            foreach ($tree as $chapter) {
                $order++;
                $chapterNode = $book->children()->create([
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

                // Create content block for chapter text/concepts
                if (! empty(trim($chapter['body'] ?? ''))) {
                    $chapterNode->contentBlocks()->create([
                        'type' => 'text',
                        'title' => $chapter['title'],
                        'content' => trim($chapter['body']),
                        'position' => 0,
                        'is_active' => true,
                    ]);
                }

                $chapters[] = $chapterNode->load('catalogNodeType', 'contentBlocks');
            }

            return ['book' => $book, 'chapters' => $chapters];
        });

        return response()->json([
            'message' => 'Book "' . $created['book']->name . '" imported with ' . count($created['chapters']) . ' chapter(s).',
            'book' => $created['book'],
            'chapters' => $created['chapters'],
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
     * Detect the chapters of a book from the raw PDF text.
     *
     * Supports both Amharic and English heading keywords:
     *  - Chapter level : ምዕራፍ / Chapter / Unit
     *  - Section level : ክፍል / Section / Lesson / ትምህርት (grouped into a chapter
     *    as a fallback so no content is lost, but chapters are the deepest node)
     */
    private function detectTree(string $text): array
    {
        $chapters = [];
        $chapterPattern = '/^(?:ምዕራፍ|chapter|unit)\b/iu';
        $sectionPattern = '/^(?:ክፍል|section|lesson|ትምህርት)\b/iu';

        $lines = preg_split('/\R/u', $text);
        $currentChapterIndex = -1;

        foreach ($lines as $line) {
            $trimmedLine = trim($line);

            if ($trimmedLine === '') {
                continue;
            }

            $normalized = $this->normalizeHeadingLine($trimmedLine);

            if ($normalized !== '' && preg_match($chapterPattern, $normalized)) {
                $chapters[] = [
                    'heading' => $trimmedLine,
                    'title' => $this->buildTitle($trimmedLine, 'Chapter', 'ምዕራፍ'),
                    'content_lines' => [],
                ];
                $currentChapterIndex = count($chapters) - 1;
                continue;
            }

            if ($currentChapterIndex >= 0) {
                $chapters[$currentChapterIndex]['content_lines'][] = $line;
            } else {
                // If text appears before the first formal chapter heading (e.g. Intro/Preface)
                if (count($chapters) === 0) {
                    $chapters[] = [
                        'heading' => 'Introduction',
                        'title' => 'መግቢያ (Introduction)',
                        'content_lines' => [$line],
                    ];
                    $currentChapterIndex = 0;
                } else {
                    $chapters[0]['content_lines'][] = $line;
                }
            }
        }

        // Format body text into clean, flowing paragraphs for each chapter
        foreach ($chapters as &$ch) {
            $ch['body'] = $this->cleanAndFormatPdfText($ch['content_lines']);
            $ch['body_snippet'] = Str::limit(preg_replace('/\s+/', ' ', $ch['body']), 200);
            unset($ch['content_lines']);
        }

        return $chapters;
    }

    /**
     * Reconstruct raw PDF line breaks into clean, flowing paragraphs.
     * Merges broken mid-sentence lines, converts chemical subscripts,
     * strips PDF layout noise, and inserts double newline paragraph breaks (\n\n).
     */
    private function cleanAndFormatPdfText(array $contentLines): string
    {
        $paragraphs = [];
        $currentParagraph = '';

        foreach ($contentLines as $line) {
            $line = trim($line);

            if ($line === '') {
                if ($currentParagraph !== '') {
                    $paragraphs[] = $this->formatChemicalFormulas($currentParagraph);
                    $currentParagraph = '';
                }
                continue;
            }

            // Omit standalone page numbers or header/footer artifacts
            if (preg_match('/^(?:page\s+\d+|p\.\s*\d+|\d+\s*\/\s*\d+|\d+)$/i', $line)) {
                continue;
            }

            // Omit PDF coordinate alignment rows (e.g. "2 2 3 3 6 6 1 1" or standalone "LCM")
            if (preg_match('/^(?:\d+\s+){3,}\d+$|^\s*LCM\s*$/i', $line)) {
                continue;
            }

            if ($currentParagraph === '') {
                $currentParagraph = $line;
            } else {
                $lastChar = mb_substr($currentParagraph, -1);
                // If previous line ended with sentence end marker (. ! ? : :: |), create a paragraph gap
                if (in_array($lastChar, ['.', '!', '?', ':', '።', '፡'], true)) {
                    $paragraphs[] = $this->formatChemicalFormulas($currentParagraph);
                    $currentParagraph = $line;
                } else {
                    // Mid-sentence wrap in PDF: join with a single space
                    $currentParagraph .= ' ' . $line;
                }
            }
        }

        if ($currentParagraph !== '') {
            $paragraphs[] = $this->formatChemicalFormulas($currentParagraph);
        }

        return implode("\n\n", $paragraphs);
    }

    /**
     * Convert numbers following chemical formula characters into Unicode subscripts
     * and clean up reaction arrows.
     * E.g. "Na 2 SO 4 + Al(NO 3 ) 3 -> Al 2 (SO 4 ) 3 + 6 NaNO 3"
     * becomes "Na₂SO₄ + 2Al(NO₃)₃ → Al₂(SO₄)₃ + 6NaNO₃"
     */
    private function formatChemicalFormulas(string $text): string
    {
        $subscripts = ['0'=>'₀','1'=>'₁','2'=>'₂','3'=>'₃','4'=>'₄','5'=>'₅','6'=>'₆','7'=>'₇','8'=>'₈','9'=>'₉'];

        // Replace numbers after chemical symbols/parens with subscript unicode digits
        $text = preg_replace_callback('/([A-Z][a-z]?|\))\s*(\d+)/', function ($m) use ($subscripts) {
            $symbol = $m[1];
            $digits = strtr($m[2], $subscripts);
            return $symbol . $digits;
        }, $text);

        // Clean up spaced chemical formulas (e.g. "Na₂ SO₄" -> "Na₂SO₄")
        $text = preg_replace('/(₂|₃|₄|₅|₆|₇|₈|₉|₀)\s+([A-Z])/', '$1$2', $text);
        $text = preg_replace('/([A-Z][a-z]?)\s+(₂|₃|₄|₅|₆|₇|₈|₉|₀)/', '$1$2', $text);

        // Standardize reaction arrows
        $text = preg_replace('/\s*(-+>|=>|=)\s*/', ' → ', $text);

        return $text;
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
