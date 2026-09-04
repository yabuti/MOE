<?php

namespace App\Http\Controllers\Api\School;

use App\Http\Controllers\Controller;
use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\User;
use App\Support\EnrollmentService;
use App\Support\ProgressReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StudentController extends Controller
{
    /**
     * List students enrolled in the school.
     */
    public function index(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);
        $isAdmin = $request->user()->hasRole('admin');

        if (! $school && ! $isAdmin) {
            return response()->json(['message' => 'No school linked to this account. Please select a school.'], 404);
        }

        $query = User::role('student')
            ->with(['enrollments' => function ($q) {
                $q->with('grade:id,name')->latest('started_at');
            }]);

        if ($school) {
            $query->where('school_id', $school->id);
        }

        if ($request->filled('q')) {
            $search = $request->string('q')->trim();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('grade_id')) {
            $query->whereHas('enrollments', function ($q) use ($request) {
                $q->where('catalog_node_id', $request->integer('grade_id'))
                    ->where('status', 'active');
            });
        }

        $students = $query->latest()->paginate(15);

        $students->getCollection()->transform(function ($student) use ($school) {
            $active = $student->enrollments->firstWhere('status', 'active');
            $report = ProgressReport::forUser($student);

            return [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'current_grade' => $active?->grade?->name,
                'current_grade_id' => $active?->catalog_node_id,
                'academic_year' => $active?->academic_year,
                'enrollment_status' => $active?->status,
                'overall_read' => $report['overall_read'],
                'overall_understand' => $report['overall_understand'],
                'exams_count' => count($report['books']),
            ];
        });

        return response()->json([
            'students' => $students->items(),
            'total' => $students->total(),
            'current_page' => $students->currentPage(),
            'last_page' => $students->lastPage(),
        ]);
    }

    /**
     * Register a new student inside the school.
     */
    public function store(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);

        if (! $school) {
            return response()->json(['message' => 'No school linked to this account. Please select a school.'], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'student_id' => ['nullable', 'string', 'max:100'],
            'grade_id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:4096'],
        ]);

        $grade = CatalogNode::findOrFail($validated['grade_id']);
        $gradeType = CatalogNodeType::where('slug', 'grade')->first();
        if (! $gradeType || $grade->catalog_node_type_id !== $gradeType->id) {
            return response()->json(['message' => 'The selected node is not a grade.'], 422);
        }

        $email = $this->generateUsername($validated['name']);
        $password = Str::upper(Str::random(3)) . '-' . Str::random(3) . '-' . random_int(100, 999);

        $data = [
            'name' => $validated['name'],
            'email' => $email,
            'password' => $password,
            'generated_password' => $password,
            'school_id' => $school->id,
        ];

        if ($request->hasFile('avatar')) {
            $data['avatar'] = (new User)->storeAvatar($request->file('avatar'));
        }

        $user = User::create($data);
        $user->assignRole('student');
        $user->schools()->syncWithoutDetaching([$school->id => ['role' => 'student']]);

        $year = EnrollmentService::academicYearFor($school);
        $enrollment = Enrollment::create([
            'user_id' => $user->id,
            'school_id' => $school->id,
            'catalog_node_id' => $grade->id,
            'academic_year' => $year,
            'status' => 'active',
            'started_at' => now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Student registered. Share these credentials with the student.',
            'student' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $email,
                'grade' => $grade->name,
                'academic_year' => $year,
            ],
            'credentials' => [
                'username' => $email,
                'password' => $password,
            ],
        ], 201);
    }

    /**
     * View a single student's progress and exam results.
     */
    public function show(Request $request, User $student): JsonResponse
    {
        $school = $this->resolveSchool($request);
        $isAdmin = $request->user()->hasRole('admin');

        if (! $isAdmin && (! $school || $student->school_id !== $school->id)) {
            return response()->json(['message' => 'Student not found in this school.'], 404);
        }

        $active = EnrollmentService::activeEnrollment($student);
        $report = ProgressReport::forUser($student);

        $enrollments = $student->enrollments()
            ->with('grade:id,name', 'school:id,name')
            ->orderByDesc('academic_year')
            ->get()
            ->map(fn ($e) => [
                'academic_year' => $e->academic_year,
                'grade' => $e->grade?->name,
                'status' => $e->status,
            ]);

        return response()->json([
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'generated_password' => $student->generated_password,
                'current_grade' => $active?->grade?->name,
                'current_grade_id' => $active?->catalog_node_id,
                'academic_year' => $active?->academic_year,
            ],
            'progress' => $report,
            'enrollment_history' => $enrollments,
        ]);
    }

    /**
     * Evaluate a student's year-end result (promote or retain).
     */
    public function evaluate(Request $request, User $student): JsonResponse
    {
        $school = $this->resolveSchool($request);
        $isAdmin = $request->user()->hasRole('admin');

        if (! $isAdmin && (! $school || $student->school_id !== $school->id)) {
            return response()->json(['message' => 'Student not found in this school.'], 404);
        }

        $validated = $request->validate([
            'result' => ['required', 'string', 'in:passed,failed'],
        ]);

        if ($validated['result'] === 'passed') {
            $new = EnrollmentService::promote($student);
        } else {
            $new = EnrollmentService::retain($student);
        }

        if (! $new) {
            return response()->json(['message' => 'Could not advance the student (no active enrollment or already at the top grade).'], 422);
        }

        return response()->json([
            'message' => $validated['result'] === 'passed'
                ? 'Student promoted to ' . $new->grade?->name . ' for ' . $new->academic_year . '.'
                : 'Student retained in ' . $new->grade?->name . ' for ' . $new->academic_year . '.',
            'enrollment' => $new->load('user:id,name,email', 'school:id,name', 'grade:id,name'),
        ]);
    }

    /**
     * Update the school's academic year settings.
     */
    public function updateSchool(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);

        if (! $school) {
            return response()->json(['message' => 'No school linked to this account. Please select a school.'], 404);
        }

        $validated = $request->validate([
            'academic_year_month' => ['sometimes', 'integer', 'between:1,12'],
            'academic_year_day' => ['sometimes', 'integer', 'between:1,31'],
        ]);

        $school->update($validated);

        return response()->json([
            'message' => 'School settings updated.',
            'school' => $school,
        ]);
    }

    /**
     * Get available grade nodes for registration dropdown.
     */
    public function grades(Request $request): JsonResponse
    {
        $gradeType = CatalogNodeType::where('slug', 'grade')->first();

        if (! $gradeType) {
            return response()->json(['grades' => []]);
        }

        $query = CatalogNode::where('catalog_node_type_id', $gradeType->id)
            ->where('status', 'published')
            ->orderBy('sort_order');

        // If a school_id is provided, filter grades to that school's level.
        $schoolId = $request->integer('school_id') ?: $request->user()->school_id;
        if ($schoolId) {
            $school = School::find($schoolId);
            if ($school && $school->type) {
                $categorySlug = match (true) {
                    str_contains($school->type, 'primary') => 'primary-school',
                    str_contains($school->type, 'preparatory') => 'middle-school',
                    str_contains($school->type, 'secondary') || str_contains($school->type, 'high_school') => 'secondary-school',
                    default => null,
                };

                if ($categorySlug) {
                    $category = CatalogNode::where('slug', $categorySlug)
                        ->where('catalog_node_type_id', CatalogNodeType::where('slug', 'category')->first()?->id)
                        ->first();

                    if ($category) {
                        $query->where('parent_id', $category->id);
                    }
                }
            }
        }

        $grades = $query->get(['id', 'name', 'slug']);

        return response()->json(['grades' => $grades]);
    }

    private function generateUsername(string $name): string
    {
        $seed = Str::lower(Str::slug($name));
        $username = "{$seed}@gmail.com";
        $i = 1;
        while (User::where('email', $username)->exists()) {
            $username = "{$seed}{$i}@gmail.com";
            $i++;
        }
        return $username;
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

        if ($request->filled('school_id')) {
            return \App\Models\School::find($request->integer('school_id'));
        }

        return null;
    }
}
