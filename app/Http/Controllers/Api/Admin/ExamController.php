<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $exams = Exam::with('catalogNode:id,name')
            ->withCount('questions')
            ->latest()
            ->paginate(15);

        return response()->json([
            'exams' => $exams->items(),
            'total' => $exams->total(),
            'current_page' => $exams->currentPage(),
            'last_page' => $exams->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'catalog_node_id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'pass_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'max_attempts' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:draft,published,archived'],
        ]);

        $exam = Exam::create($validated);

        return response()->json([
            'message' => 'Exam created successfully.',
            'exam' => $exam->load('catalogNode', 'questions'),
        ], 201);
    }

    public function show(Exam $exam): JsonResponse
    {
        $exam->load('catalogNode', 'questions');

        return response()->json([
            'exam' => $exam,
        ]);
    }

    public function update(Request $request, Exam $exam): JsonResponse
    {
        $validated = $request->validate([
            'catalog_node_id' => ['sometimes', 'integer', 'exists:catalog_nodes,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'pass_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'max_attempts' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:draft,published,archived'],
        ]);

        $exam->update($validated);

        return response()->json([
            'message' => 'Exam updated successfully.',
            'exam' => $exam->load('catalogNode', 'questions'),
        ]);
    }

    public function destroy(Exam $exam): JsonResponse
    {
        $exam->delete();

        return response()->json([
            'message' => 'Exam deleted successfully.',
        ]);
    }
}
