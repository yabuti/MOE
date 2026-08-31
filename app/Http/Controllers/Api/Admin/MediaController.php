<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Media::query()->with('uploader:id,name');

        if ($request->filled('collection')) {
            $query->where('collection', $request->string('collection'));
        }

        $media = $query->latest()->paginate(15);

        return response()->json([
            'media' => $media->items(),
            'total' => $media->total(),
            'current_page' => $media->currentPage(),
            'last_page' => $media->lastPage(),
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file'],
            'collection' => ['nullable', 'string', 'max:100'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');

        $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('media', $fileName, 'public');

        $media = Media::create([
            'uploaded_by' => $request->user()->id,
            'collection' => $validated['collection'] ?? null,
            'name' => $validated['name'] ?? $file->getClientOriginalName(),
            'file_name' => $path,
            'mime_type' => $file->getMimeType(),
            'disk' => 'public',
            'size' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Media uploaded successfully.',
            'media' => $media,
        ], 201);
    }

    public function destroy(Media $media): JsonResponse
    {
        Storage::disk($media->disk)->delete($media->file_name);

        $media->delete();

        return response()->json([
            'message' => 'Media deleted successfully.',
        ]);
    }
}
