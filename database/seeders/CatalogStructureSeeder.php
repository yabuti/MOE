<?php

namespace Database\Seeders;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CatalogStructureSeeder extends Seeder
{
    use WithoutModelEvents;

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
            ['name' => 'Book', 'slug' => 'book', 'label' => 'Textbook', 'parent_type_id' => null, 'sort_order' => 3],
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

        $mathCat = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('category'),
            'name' => 'Mathematics',
            'slug' => 'mathematics',
            'description' => 'Mathematics books',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $grade1 = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('grade'),
            'parent_id' => $mathCat->id,
            'name' => 'Grade 1',
            'slug' => 'grade-1',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $book = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('book'),
            'parent_id' => $grade1->id,
            'name' => 'Mathematics Grade 1 Student Book',
            'slug' => 'maths-grade-1-book',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        CatalogNode::create([
            'catalog_node_type_id' => $typeOf('chapter'),
            'parent_id' => $book->id,
            'name' => 'Numbers 1 to 10',
            'slug' => 'numbers-1-to-10',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        CatalogNode::create([
            'catalog_node_type_id' => $typeOf('chapter'),
            'parent_id' => $book->id,
            'name' => 'Geometry',
            'slug' => 'geometry',
            'status' => 'published',
            'sort_order' => 2,
        ]);
    }
}
