<?php

namespace Database\Seeders;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BookChapterSeeder extends Seeder
{
    public function run(): void
    {
        $typeOf = fn (string $slug) => CatalogNodeType::where('slug', $slug)->first()->id;

        // Ensure Information Technology (IT) book exists under Grade 7
        $grade7 = CatalogNode::where('slug', Str::slug('Grade 7'))
            ->where('catalog_node_type_id', $typeOf('grade'))
            ->first();

        if ($grade7) {
            $itSlug = Str::slug('Grade 7 Information Technology (IT)');
            CatalogNode::firstOrCreate(
                ['slug' => $itSlug, 'catalog_node_type_id' => $typeOf('book'), 'parent_id' => $grade7->id],
                [
                    'name' => 'Information Technology (IT)',
                    'description' => 'Information Technology textbook for Grade 7',
                    'status' => 'published',
                    'sort_order' => 9,
                ]
            );
        }

        $chapters = [
            'Grade 5' => [
                'Amharic (Second Language)' => [
                    'ጓዯኝነት',
                    'ንፅህናና ፅደነት',
                    'ትውፉት',
                    'የመንገዴ ደህንነት',
                    'አካባቢ ጥበቃ',
                    'አዎንዚዥ ዕጾችና ንጥረነገሮች',
                    'ምግብ',
                    'የደር እንስሳት',
                    'ባህሊዊ ጨዋታዎች',
                    'ስነቃሌ',
                ],
                'English' => [
                    'Unit One: Holidays',
                    'Unit Two: Dry Season',
                    'Unit Three: Accidents',
                    'Unit Four: Minerals',
                    'Unit Five: Beekeeping',
                    'Unit Six: Water Pollution',
                    'Unit Seven: Good Citizens',
                    'Unit Eight: Healthcare Facilities',
                    'Unit Nine: Living with Differences',
                    'Unit Ten: Assistive Technology',
                ],
            ],

            'Grade 7' => [
                'Amharic (Second Language)' => [
                    'ተፇጥሮን ማዴነቅ',
                    'የቤተሰብ ምጣኔ',
                    'የበጎ ፇቃዴ አገሌግልት',
                    'የታዋቂ ግሇሰቦች ህይወት ታሪክ',
                    'ውሃና ጠቀሜታው',
                    'የሰዎች ዝውውር',
                    'ማህበራዊ ግንኙነት',
                    'ሱሰኝነት',
                    'አርበኝነት',
                    'ቃሊዊ ግጥም',
                ],
                'English' => [
                    'Unit One: Life in the Countryside',
                    'Unit Two: History of Calendar',
                    'Unit Three: Road Safety',
                    'Unit Four: Endemic Animals in Ethiopia',
                    'Unit Five: Dairy',
                    'Unit Six: Land Conservation',
                    'Unit Seven: Volunteerism',
                    'Unit Eight: Fitness',
                    'Unit Nine: Self-Expressions',
                ],
                'Information Technology (IT)' => [
                    'Unit 1: Introduction to Information and Communication Technology',
                    'Unit 2: Computer Hardware',
                    'Unit 3: Computer Software',
                    'Unit 4: Internet',
                    'Unit 5: Database Management System',
                    'Unit 6: Logic Oriented Graphics Oriented Programming',
                ],
            ],
        ];

        foreach ($chapters as $gradeName => $books) {
            $grade = CatalogNode::where('slug', Str::slug($gradeName))
                ->where('catalog_node_type_id', $typeOf('grade'))
                ->first();

            if (! $grade) {
                $this->command?->warn("Grade not found: {$gradeName}");
                continue;
            }

            foreach ($books as $bookName => $chapterNames) {
                $slug = Str::slug($gradeName . ' ' . $bookName);
                $book = CatalogNode::where('slug', $slug)
                    ->where('catalog_node_type_id', $typeOf('book'))
                    ->where('parent_id', $grade->id)
                    ->first();

                if (! $book) {
                    $this->command?->warn("Book not found: {$bookName} under {$gradeName} (slug: {$slug})");
                    continue;
                }

                CatalogNode::where('catalog_node_type_id', $typeOf('chapter'))
                    ->where('parent_id', $book->id)
                    ->delete();

                $order = 1;
                foreach ($chapterNames as $chapterName) {
                    CatalogNode::create([
                        'catalog_node_type_id' => $typeOf('chapter'),
                        'parent_id' => $book->id,
                        'name' => $chapterName,
                        'slug' => $slug . '-ch-' . $order,
                        'description' => "{$chapterName} — {$bookName}, {$gradeName}",
                        'status' => 'published',
                        'sort_order' => $order++,
                    ]);
                }

                $this->command?->info("  Seeded " . count($chapterNames) . " chapters for {$gradeName} -> {$bookName}");
            }
        }
    }
}
