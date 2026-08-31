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
        $this->createDefaultNodeTypes();
        $this->createSampleHierarchy();
    }

    private function createDefaultNodeTypes(): void
    {
        // Configurable defaults. Admins can add/rename/remove node types.
        $types = [
            ['name' => 'Program', 'slug' => 'program', 'label' => 'Academic Program', 'parent_type_id' => null, 'sort_order' => 1],
            ['name' => 'Level', 'slug' => 'level', 'label' => 'Grade Level', 'parent_type_id' => null, 'sort_order' => 2],
            ['name' => 'Course', 'slug' => 'course', 'label' => 'Course / Subject', 'parent_type_id' => null, 'sort_order' => 3],
            ['name' => 'Book', 'slug' => 'book', 'label' => 'Textbook', 'parent_type_id' => null, 'sort_order' => 4],
            ['name' => 'Chapter', 'slug' => 'chapter', 'label' => 'Chapter', 'parent_type_id' => null, 'sort_order' => 5],
            ['name' => 'Section', 'slug' => 'section', 'label' => 'Section', 'parent_type_id' => null, 'sort_order' => 6],
        ];

        $created = [];
        foreach ($types as $t) {
            $created[$t['slug']] = CatalogNodeType::firstOrCreate(['slug' => $t['slug']], $t);
        }

        // Wire the default parent chain: program -> level -> course -> book -> chapter -> section
        $chain = ['section' => 'chapter', 'chapter' => 'book', 'book' => 'course', 'course' => 'level', 'level' => 'program'];
        foreach ($chain as $slug => $parentSlug) {
            $created[$slug]->update([
                'parent_type_id' => $created[$parentSlug]->id,
                'label' => $created[$slug]->label,
            ]);
        }
    }

    private function createSampleHierarchy(): void
    {
        if (CatalogNode::count() > 0) {
            return;
        }

        $typeOf = fn (string $slug) => CatalogNodeType::where('slug', $slug)->first()->id;

        $program = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('program'),
            'name' => 'General Education',
            'slug' => 'general-education',
            'description' => 'Ethiopian general education program',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $grade1 = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('level'),
            'parent_id' => $program->id,
            'name' => 'Grade 1',
            'slug' => 'grade-1',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $math = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('course'),
            'parent_id' => $grade1->id,
            'name' => 'Mathematics',
            'slug' => 'mathematics',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $book = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('book'),
            'parent_id' => $math->id,
            'name' => 'Mathematics Grade 1 Student Book',
            'slug' => 'maths-grade-1-book',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        $chapter1 = CatalogNode::create([
            'catalog_node_type_id' => $typeOf('chapter'),
            'parent_id' => $book->id,
            'name' => 'Numbers 1 to 10',
            'slug' => 'numbers-1-to-10',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        CatalogNode::create([
            'catalog_node_type_id' => $typeOf('section'),
            'parent_id' => $chapter1->id,
            'name' => 'Understanding 1 to 5',
            'slug' => 'understanding-1-to-5',
            'status' => 'published',
            'sort_order' => 1,
        ]);

        CatalogNode::create([
            'catalog_node_type_id' => $typeOf('section'),
            'parent_id' => $chapter1->id,
            'name' => 'Counting Objects',
            'slug' => 'counting-objects',
            'status' => 'published',
            'sort_order' => 2,
        ]);
    }
}
