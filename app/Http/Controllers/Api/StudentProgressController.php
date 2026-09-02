<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProgress;
use App\Support\ProgressReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentProgressController extends Controller
{
    /**
     * Record reading / listening progress for a chapter node. Keeps the
     * highest percentage reported for the (user, node, type) combination.
     */
    public function record(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'node_id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'type' => ['required', 'string', 'in:read,listen'],
            'percent' => ['required', 'integer', 'min:0', 'max:100'],
            'seconds' => ['nullable', 'integer', 'min:0'],
        ]);

        $user = $request->user();
        $percent = $validated['percent'];
        $seconds = (int) ($validated['seconds'] ?? 0);

        $row = StudentProgress::where('user_id', $user->id)
            ->where('catalog_node_id', $validated['node_id'])
            ->where('progress_type', $validated['type'])
            ->first();

        if (! $row) {
            StudentProgress::create([
                'user_id' => $user->id,
                'catalog_node_id' => $validated['node_id'],
                'progress_type' => $validated['type'],
                'reading_seconds' => $seconds,
                'progress_percent' => $percent,
                'completed' => $percent >= 100,
                'completed_at' => $percent >= 100 ? now() : null,
            ]);
        } elseif ($percent > $row->progress_percent || $seconds > 0) {
            $data = ['progress_percent' => max($row->progress_percent, $percent)];

            if ($seconds > 0) {
                $data['reading_seconds'] = $row->reading_seconds + $seconds;
            }

            if ($percent >= 100) {
                $data['completed'] = true;
                $data['completed_at'] = now();
            }

            $row->update($data);
        }

        return response()->json([
            'message' => 'Progress saved.',
        ]);
    }

    /**
     * The student's own progress report.
     */
    public function overview(Request $request): JsonResponse
    {
        return response()->json([
            'progress' => ProgressReport::forUser($request->user()),
        ]);
    }
}