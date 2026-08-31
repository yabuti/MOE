<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogNodeType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NodeTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $nodeTypes = CatalogNodeType::withCount('nodes')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'node_types' => $nodeTypes,
            'total' => $nodeTypes->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:catalog_node_types,slug'],
            'label' => ['nullable', 'string', 'max:255'],
            'parent_type_id' => ['nullable', 'integer', 'exists:catalog_node_types,id'],
            'settings' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $nodeType = CatalogNodeType::create($validated);

        return response()->json([
            'message' => 'Node type created successfully.',
            'node_type' => $nodeType->loadCount('nodes'),
        ], 201);
    }

    public function update(Request $request, CatalogNodeType $nodeType): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:catalog_node_types,slug,' . $nodeType->id],
            'label' => ['nullable', 'string', 'max:255'],
            'parent_type_id' => ['nullable', 'integer', 'exists:catalog_node_types,id'],
            'settings' => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $nodeType->update($validated);

        return response()->json([
            'message' => 'Node type updated successfully.',
            'node_type' => $nodeType->loadCount('nodes'),
        ]);
    }

    public function destroy(CatalogNodeType $nodeType): JsonResponse
    {
        if ($nodeType->nodes()->exists()) {
            return response()->json([
                'message' => 'Cannot delete node type because it has associated nodes.',
            ], 422);
        }

        $nodeType->delete();

        return response()->json([
            'message' => 'Node type deleted successfully.',
        ]);
    }
}
