<?php

namespace App\Http\Controllers\Api\School;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);

        if (! $school) {
            return response()->json(['message' => 'No school linked to this account. Please select a school.'], 404);
        }

        $enrollments = Enrollment::where('school_id', $school->id);
        $totalStudents = User::where('school_id', $school->id)->role('student')->count();
        $activeEnrollments = $enrollments->where('status', 'active')->count();
        $totalEnrollments = $enrollments->count();
        $passed = $enrollments->where('status', 'passed')->count();
        $failed = $enrollments->where('status', 'failed')->count();

        // Grade breakdown for active enrollments
        $gradeBreakdown = Enrollment::where('school_id', $school->id)
            ->where('status', 'active')
            ->with('grade:id,name')
            ->get()
            ->groupBy(fn ($e) => $e->grade?->name ?? 'Unknown')
            ->map(fn ($group) => $group->count())
            ->toArray();

        $recentEnrollments = Enrollment::where('school_id', $school->id)
            ->with('user:id,name,email', 'grade:id,name')
            ->latest('started_at')
            ->take(5)
            ->get();

        return response()->json([
            'school' => [
                'id' => $school->id,
                'name' => $school->name,
                'code' => $school->code,
                'academic_year_month' => $school->academic_year_month,
                'academic_year_day' => $school->academic_year_day,
            ],
            'counts' => [
                'total_students' => $totalStudents,
                'active_enrollments' => $activeEnrollments,
                'total_enrollments' => $totalEnrollments,
                'passed' => $passed,
                'failed' => $failed,
            ],
            'grade_breakdown' => $gradeBreakdown,
            'recent_enrollments' => $recentEnrollments,
        ]);
    }

    /**
     * Resolve the school this request is scoped to. School staff use their own
     * linked school; an admin (or other role) must pass a school_id query param.
     */
    protected function resolveSchool(Request $request): ?\App\Models\School
    {
        $user = $request->user();

        if ($user->school_id) {
            return \App\Models\School::find($user->school_id);
        }

        if ($request->has('school_id')) {
            return \App\Models\School::find($request->integer('school_id'));
        }

        return null;
    }
}
