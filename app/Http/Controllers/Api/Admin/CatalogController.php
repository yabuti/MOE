<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogNode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CatalogController extends Controller
{
    public function tree(): JsonResponse
    {
        $nodes = CatalogNode::with('catalogNodeType')->get();

        $tree = $this->buildTree($nodes, null);

        return response()->json([
            'tree' => $tree,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = CatalogNode::with(['catalogNodeType', 'parent']);

        if ($request->filled('type')) {
            $query->whereHas('catalogNodeType', function ($q) use ($request) {
                $q->where('slug', $request->string('type'));
            });
        }

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->integer('parent_id'));
        }

        if ($request->filled('q')) {
            $search = $request->string('q')->trim();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('slug', 'like', '%' . $search . '%');
            });
        }

        $nodes = $query->orderBy('sort_order')->paginate(15);

        return response()->json([
            'nodes' => $nodes->items(),
            'total' => $nodes->total(),
            'current_page' => $nodes->currentPage(),
            'last_page' => $nodes->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'catalog_node_type_id' => ['required', 'integer', 'exists:catalog_node_types,id'],
            'parent_id' => ['nullable', 'integer', 'exists:catalog_nodes,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'meta' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', 'in:draft,published,archived'],
            'is_locked' => ['nullable', 'boolean'],
        ]);

        $slug = $validated['slug'] ?? Str::slug($validated['name']);

        $data = $validated;
        $data['slug'] = $this->uniqueSlug($slug);

        $node = CatalogNode::create($data);

        return response()->json([
            'message' => 'Catalog node created successfully.',
            'node' => $node->load('catalogNodeType', 'parent'),
        ], 201);
    }

    public function show(CatalogNode $node): JsonResponse
    {
        $node->load([
            'catalogNodeType',
            'parent',
            'children',
            'contentBlocks',
            'exams',
        ]);

        $node->setAttribute('content_blocks_count', $node->contentBlocks->count());
        $node->setAttribute('children_count', $node->children->count());
        $node->setAttribute('exams_count', $node->exams->count());

        return response()->json([
            'node' => $node,
        ]);
    }

    public function update(Request $request, CatalogNode $node): JsonResponse
    {
        $validated = $request->validate([
            'catalog_node_type_id' => ['sometimes', 'integer', 'exists:catalog_node_types,id'],
            'parent_id' => ['nullable', 'integer', 'exists:catalog_nodes,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'meta' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', 'in:draft,published,archived'],
            'is_locked' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['slug'])) {
            $validated['slug'] = $this->uniqueSlug($validated['slug'], $node->id);
        }

        $node->update($validated);

        return response()->json([
            'message' => 'Catalog node updated successfully.',
            'node' => $node->load('catalogNodeType', 'parent'),
        ]);
    }

    public function destroy(CatalogNode $node): JsonResponse
    {
        DB::transaction(function () use ($node) {
            $this->deleteNodeWithDescendants($node);
        });

        return response()->json([
            'message' => 'Catalog node deleted successfully.',
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'items.*.sort_order' => ['required', 'integer'],
        ]);

        foreach ($validated['items'] as $item) {
            CatalogNode::where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json([
            'message' => 'Nodes reordered successfully.',
        ]);
    }

    private function buildTree($nodes, $parentId)
    {
        return $nodes->filter(function ($node) use ($parentId) {
            return $node->parent_id === $parentId;
        })->values()->map(function ($node) use ($nodes) {
            $item = $node->only([
                'id', 'catalog_node_type_id', 'parent_id', 'name', 'slug',
                'description', 'meta', 'sort_order', 'status', 'is_locked',
            ]);
            $item['type'] = $node->catalogNodeType ? $node->catalogNodeType->slug : null;
            $item['children'] = $this->buildTree($nodes, $node->id);
            return $item;
        });
    }

    private function deleteNodeWithDescendants(CatalogNode $node): void
    {
        $node->children()->get()->each(function ($child) {
            $this->deleteNodeWithDescendants($child);
        });

        $node->delete();
    }

    private function uniqueSlug(string $slug, ?int $ignoreId = null): string
    {
        $base = $slug;
        $unique = $slug;
        $count = 2;

        while (CatalogNode::where('slug', $unique)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()
        ) {
            $unique = $base . '-' . $count;
            $count++;
        }

        return $unique;
    }
}
