<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogNode;
use App\Models\ContentBlock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContentBlockController extends Controller
{
    public function index(CatalogNode $node): JsonResponse
    {
        $blocks = $node->contentBlocks;

        return response()->json([
            'content_blocks' => $blocks,
            'total' => $blocks->count(),
        ]);
    }

    public function store(Request $request, CatalogNode $node): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:text,image,video,audio,pdf,model3d,simulation,virtual_lab,tts,interactive'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'data' => ['nullable', 'array'],
            'media_id' => ['nullable', 'integer', 'exists:media,id'],
            'position' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $block = $node->contentBlocks()->create($validated);

        return response()->json([
            'message' => 'Content block created successfully.',
            'content_block' => $block->load('media'),
        ], 201);
    }

    public function update(Request $request, ContentBlock $content): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['sometimes', 'string', 'in:text,image,video,audio,pdf,model3d,simulation,virtual_lab,tts,interactive'],
            'title' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'data' => ['nullable', 'array'],
            'media_id' => ['nullable', 'integer', 'exists:media,id'],
            'position' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $content->update($validated);

        return response()->json([
            'message' => 'Content block updated successfully.',
            'content_block' => $content->load('media'),
        ]);
    }

    public function destroy(ContentBlock $content): JsonResponse
    {
        $content->delete();

        return response()->json([
            'message' => 'Content block deleted successfully.',
        ]);
    }

    public function reorder(CatalogNode $node, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:content_blocks,id'],
            'items.*.position' => ['required', 'integer'],
        ]);

        foreach ($validated['items'] as $item) {
            ContentBlock::where('id', $item['id'])
                ->update(['position' => $item['position']]);
        }

        return response()->json([
            'message' => 'Content blocks reordered successfully.',
        ]);
    }
}
