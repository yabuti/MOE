<?php

namespace Database\Seeders;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use App\Models\ContentBlock;
use App\Models\Media;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser;

/**
 * Attaches the original, per-chapter PDF pages (split from the source textbook
 * PDFs) to every chapter as a `pdf` content block. This preserves the exact
 * original layout, images and text (including Amharic) without any re-typing.
 *
 * It also extracts the selectable text from each split PDF and stores it on the
 * block's `data.read_aloud_text` so the reader's "Listen" feature can read the
 * chapter aloud (browser speechSynthesis cannot read a PDF directly).
 *
 * The split PDF files live in the public media disk; this seeder only creates
 * the Media records and the pdf content blocks that reference them.
 */
class BookContentSeeder extends Seeder
{
    public function run(): void
    {
        $manifestPath = storage_path('app/public/media/_split_map.json');

        if (! file_exists($manifestPath)) {
            $this->command?->error('Split manifest not found. Run the pdf-lib split script first.');
            return;
        }

        $manifest = json_decode(file_get_contents($manifestPath), true);
        if (! is_array($manifest)) {
            $this->command?->error('Invalid split manifest.');
            return;
        }

        $typeOf = fn (string $slug) => CatalogNodeType::where('slug', $slug)->first()->id;

        // Admin user owns the media records.
        $adminId = \App\Models\User::role('admin')->value('id') ?? 1;

        $parser = new Parser();

        foreach ($manifest as $gradeName => $books) {
            $grade = CatalogNode::where('slug', Str::slug($gradeName))
                ->where('catalog_node_type_id', $typeOf('grade'))
                ->first();

            if (! $grade) {
                $this->command?->warn("Grade node not found: {$gradeName}");
                continue;
            }

            foreach ($books as $bookName => $chapters) {
                $book = CatalogNode::where('slug', Str::slug($gradeName . ' ' . $bookName))
                    ->where('catalog_node_type_id', $typeOf('book'))
                    ->where('parent_id', $grade->id)
                    ->first();

                if (! $book) {
                    $this->command?->warn("Book node not found: {$gradeName} / {$bookName}");
                    continue;
                }

                $nodes = $book->children()
                    ->where('status', 'published')
                    ->orderBy('sort_order')
                    ->get();

                foreach ($chapters as $order => $entry) {
                    $chapter = $nodes->where('sort_order', (int) $order)->first();
                    if (! $chapter) {
                        $this->command?->warn("  Chapter {$order} not found for {$bookName}");
                        continue;
                    }

                    $fileName = $entry['file_name'] ?? null;
                    if (! $fileName || ! Storage::disk('public')->exists($fileName)) {
                        $this->command?->warn("  Media file missing for {$bookName} ch{$order}: {$fileName}");
                        continue;
                    }

                    // Reuse an existing media record for this file if present.
                    $media = Media::where('disk', 'public')->where('file_name', $fileName)->first();
                    if (! $media) {
                        $media = Media::create([
                            'uploaded_by' => $adminId,
                            'collection' => 'book-chapters',
                            'name' => "{$bookName} — {$chapter->name}",
                            'file_name' => $fileName,
                            'mime_type' => 'application/pdf',
                            'disk' => 'public',
                            'size' => $entry['size'] ?? Storage::disk('public')->size($fileName),
                            'meta' => ['pages' => $entry['pages'] ?? null, 'grade' => $gradeName, 'book' => $bookName, 'chapter' => $chapter->name],
                        ]);
                    }

                    // Replace any existing pdf/text blocks for this chapter with a single pdf block.
                    ContentBlock::where('catalog_node_id', $chapter->id)
                        ->whereIn('type', ['pdf', 'text'])
                        ->delete();

                    // Extract the selectable text from this chapter's split PDF so the
                    // "Listen" feature can read it aloud.
                    $readAloud = $this->extractPdfText($parser, $fileName);

                    ContentBlock::create([
                        'catalog_node_id' => $chapter->id,
                        'type' => 'pdf',
                        'title' => $chapter->name,
                        'data' => [
                            'pages' => $entry['pages'] ?? null,
                            'read_aloud_text' => $readAloud,
                        ],
                        'media_id' => $media->id,
                        'position' => 1,
                        'is_active' => true,
                    ]);

                    $this->command?->info("  {$gradeName} / {$bookName} ch{$order}: pdf attached (" . ($entry['pages'] ?? '?') . " pages)");
                }
            }
        }

        // Remove the manifest from the public media directory.
        Storage::disk('public')->delete('media/_split_map.json');
    }

    /**
     * Extract and normalise the selectable text from a PDF on the public disk.
     */
    private function extractPdfText(Parser $parser, string $filePath): string
    {
        $diskPath = Storage::disk('public')->path($filePath);
        if (! file_exists($diskPath)) {
            return '';
        }

        try {
            $pdf = $parser->parseFile($diskPath);
            $texts = [];
            foreach ($pdf->getPages() as $page) {
                $t = trim($page->getText());
                if ($t !== '') {
                    $texts[] = $t;
                }
            }
            $content = implode("\n\n", $texts);
            $content = preg_replace('/[ \t]+/', ' ', $content);
            $content = preg_replace('/\n{3,}/', "\n\n", $content);
            return trim($content);
        } catch (\Throwable $e) {
            return '';
        } finally {
            unset($pdf);
            gc_collect_cycles();
        }
    }
}
