<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Support\AuditLogger;
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
            'file' => ['required', 'file', 'max:512000'],
            'collection' => ['nullable', 'string', 'max:100'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');

        if (! $file->isValid()) {
            $code = $file->getError();
            $message = match ($code) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The file exceeds the upload size limit (max 1 GB).',
                UPLOAD_ERR_PARTIAL => 'The file was only partially uploaded. Please try again.',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
                UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload.',
                default => 'The file failed to upload. Please try again.',
            };

            return response()->json(['message' => $message], 422);
        }

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

        AuditLogger::record('uploaded', $media, null, ['name' => $media->name, 'mime_type' => $media->mime_type, 'size' => $media->size]);

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
