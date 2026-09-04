<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\ProgressReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ParentController extends Controller
{
    /**
     * List the children linked to the logged-in parent, each with a progress summary.
     * Admins see every linked child across all parents (monitoring view).
     */
    public function index(Request $request): JsonResponse
    {
        $children = $request->user()->hasRole('admin')
            ? User::role('student')->whereNotNull('parent_user_id')->orderBy('name')->get()
            : $request->user()->children()->orderBy('name')->get();

        return response()->json([
            'children' => $children->map(fn (User $child) => $this->childPayload($child)),
        ]);
    }

    /**
     * Link a child to the parent using the child's email/username and password.
     */
    public function attach(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $parent = $request->user();

        $child = User::where('email', $validated['username'])
            ->orWhere('name', $validated['username'])
            ->first();

        if (! $child || ! Hash::check($validated['password'], $child->password)) {
            return response()->json([
                'message' => 'Invalid child email/username or password.',
            ], 422);
        }

        if (! $child->hasRole('student')) {
            return response()->json([
                'message' => 'This account is not a student.',
            ], 422);
        }

        if ($child->parent_user_id && $child->parent_user_id !== $parent->id) {
            return response()->json([
                'message' => 'This student is already linked to another parent.',
            ], 422);
        }

        $wasLinked = (bool) $child->parent_user_id;
        $child->parent_user_id = $parent->id;
        $child->save();

        AuditLogger::record(
            $wasLinked ? 'child-relinked' : 'child-linked',
            $child,
            null,
            ['parent_user_id' => $parent->id],
            ['user_id' => $child->id],
            $parent->id
        );

        return response()->json([
            'message' => 'Child linked successfully.',
            'child' => $this->childPayload($child),
        ]);
    }

    /**
     * Unlink a child from the parent.
     */
    public function detach(Request $request, User $child): JsonResponse
    {
        $parent = $request->user();

        if ($child->parent_user_id !== $parent->id) {
            return response()->json([
                'message' => 'Not your child.',
            ], 403);
        }

        $child->parent_user_id = null;
        $child->save();

        AuditLogger::record('child-unlinked', $child, ['parent_user_id' => $parent->id], null, ['user_id' => $child->id], $parent->id);

        return response()->json([
            'message' => 'Child unlinked.',
        ]);
    }

    /**
     * Full progress report for one of the parent's children (admins may view any child).
     */
    public function progress(Request $request, User $child): JsonResponse
    {
        $parent = $request->user();

        if (! $parent->hasRole('admin') && $child->parent_user_id !== $parent->id) {
            return response()->json([
                'message' => 'Not your child.',
            ], 403);
        }

        $current = \App\Support\EnrollmentService::activeEnrollment($child);

        return response()->json([
            'child' => [
                'id' => $child->id,
                'name' => $child->name,
                'email' => $child->email,
                'avatar_url' => $child->avatar_url,
                'parent_name' => $child->parentUser?->name,
                'current_grade' => $current?->grade?->name,
                'school' => $current?->school?->name,
                'academic_year' => $current?->academic_year,
                'enrollment_history' => $child->enrollments()
                    ->with(['grade:id,name', 'school:id,name'])
                    ->orderByDesc('academic_year')
                    ->get()
                    ->map(fn ($e) => [
                        'academic_year' => $e->academic_year,
                        'grade' => $e->grade?->name,
                        'school' => $e->school?->name,
                        'status' => $e->status,
                    ]),
            ],
            'progress' => \App\Support\ProgressReport::forUser($child),
        ]);
    }

    private function childPayload(User $child): array
    {
        $report = ProgressReport::forUser($child);

        return [
            'id' => $child->id,
            'name' => $child->name,
            'email' => $child->email,
            'avatar_url' => $child->avatar_url,
            'parent_name' => $child->parentUser?->name,
            'linked_at' => $child->parent_user_id ? $child->updated_at : null,
            'summary' => [
                'overall_read' => $report['overall_read'],
                'overall_understand' => $report['overall_understand'],
                'most_read_chapter' => $report['most_read_chapter'],
                'books_count' => count($report['books']),
            ],
        ];
    }
}