<?php

namespace Database\Seeders;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogStructureSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * School levels (categories) → grade → subject books.
     * Category = the school level, Grade sits under it, books (subjects) sit
     * under each grade, and chapters sit directly under a book (deepest).
     */
    private array $categories = [
        'Primary School' => [
            'description' => 'Grades 1 to 4',
            'grades' => ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'],
        ],
        'Middle School' => [
            'description' => 'Grades 5 to 8',
            'grades' => ['Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'],
        ],
        'Secondary School' => [
            'description' => 'Grades 9 to 12',
            'grades' => ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        ],
    ];

    // Grade => list of subject books (using the real Ethiopian curriculum)
    private array $subjects = [
        'Grade 5' => [
            'Mother Tongue Language',
            'Amharic (Second Language)',
            'English',
            'Mathematics',
            'Environmental Science',
            'Social Studies (ህብረተሰብ)',
            'Performing & Visual Arts (PVA)',
        ],
        'Grade 6' => [
            'Mother Tongue Language',
            'Amharic (Second Language)',
            'English',
            'Mathematics',
            'Environmental Science',
            'Social Studies (ህብረተሰብ)',
            'Performing & Visual Arts (PVA)',
        ],
        'Grade 7' => [
            'Mother Tongue Language',
            'Amharic (Second Language)',
            'English',
            'Mathematics',
            'General Science',
            'Social Studies (ህብረተሰብ)',
            'Citizenship Education',
            'Career and Technical Education (CTE)',
        ],
        'Grade 8' => [
            'Mother Tongue Language',
            'Amharic (Second Language)',
            'English',
            'Mathematics',
            'General Science',
            'Social Studies (ህብረተሰብ)',
            'Citizenship Education',
            'Information Technology (IT)',
        ],
    ];

    public function run(): void
    {
        // Reset any existing structure so the tree reflects the new design.
        CatalogNode::query()->delete();
        CatalogNodeType::query()->delete();

        $this->createDefaultNodeTypes();
        $this->createSampleHierarchy();
    }

    private function createDefaultNodeTypes(): void
    {
        // Category is the top level. Grade sits under a category, books sit
        // under a grade, and chapters sit directly under a book (deepest).
        $types = [
            ['name' => 'Category', 'slug' => 'category', 'label' => 'Category', 'parent_type_id' => null, 'sort_order' => 1],
            ['name' => 'Grade', 'slug' => 'grade', 'label' => 'Grade', 'parent_type_id' => null, 'sort_order' => 2],
            ['name' => 'Book', 'slug' => 'book', 'label' => 'Subject', 'parent_type_id' => null, 'sort_order' => 3],
            ['name' => 'Chapter', 'slug' => 'chapter', 'label' => 'Chapter', 'parent_type_id' => null, 'sort_order' => 4],
        ];

        $created = [];
        foreach ($types as $t) {
            $created[$t['slug']] = CatalogNodeType::create($t);
        }

        // Wire the default parent chain: category -> grade -> book -> chapter
        $created['grade']->update(['parent_type_id' => $created['category']->id]);
        $created['book']->update(['parent_type_id' => $created['grade']->id]);
        $created['chapter']->update(['parent_type_id' => $created['book']->id]);
    }

    private function createSampleHierarchy(): void
    {
        $typeOf = fn (string $slug) => CatalogNodeType::where('slug', $slug)->first()->id;

        $categoryOrder = 1;
        foreach ($this->categories as $categoryName => $categoryData) {
            $category = CatalogNode::create([
                'catalog_node_type_id' => $typeOf('category'),
                'name' => $categoryName,
                'slug' => Str::slug($categoryName),
                'description' => $categoryData['description'],
                'status' => 'published',
                'sort_order' => $categoryOrder++,
            ]);

            $gradeOrder = 1;
            foreach ($categoryData['grades'] as $gradeName) {
                $grade = CatalogNode::create([
                    'catalog_node_type_id' => $typeOf('grade'),
                    'parent_id' => $category->id,
                    'name' => $gradeName,
                    'slug' => Str::slug($gradeName),
                    'description' => "Textbooks for {$gradeName}",
                    'status' => 'published',
                    'sort_order' => $gradeOrder++,
                ]);

                // Only middle-school grades have subject books defined for now.
                $bookNames = $this->subjects[$gradeName] ?? [];
                $bookOrder = 1;
                foreach ($bookNames as $bookName) {
                    $book = CatalogNode::create([
                        'catalog_node_type_id' => $typeOf('book'),
                        'parent_id' => $grade->id,
                        'name' => $bookName,
                        'slug' => Str::slug($gradeName . ' ' . $bookName),
                        'description' => "{$bookName} textbook for {$gradeName}",
                        'status' => 'published',
                        'sort_order' => $bookOrder++,
                    ]);

                    // Give each subject book a starting chapter so the tree is readable.
                    CatalogNode::create([
                        'catalog_node_type_id' => $typeOf('chapter'),
                        'parent_id' => $book->id,
                        'name' => 'Chapter 1',
                        'slug' => Str::slug($gradeName . ' ' . $bookName . ' chapter 1'),
                        'description' => 'First chapter (import the rest of the chapters here)',
                        'status' => 'published',
                        'sort_order' => 1,
                    ]);
                }
            }
        }
    }
}
