<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\EnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EnrollmentController extends Controller
{
    /**
     * Register a student inside a school. The system generates the student's
     * username (email) and password, assigns the student role, links the
     * school, and creates an enrollment for the given grade + academic year.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'school_id' => ['required', 'integer', 'exists:schools,id'],
            'name' => ['required', 'string', 'max:255'],
            'student_id' => ['nullable', 'string', 'max:100'],
            'grade_id' => ['required', 'integer', 'exists:catalog_nodes,id'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:4096'],
        ]);

        $school = School::findOrFail($validated['school_id']);
        $grade = CatalogNode::findOrFail($validated['grade_id']);

        // The grade node must actually be a "grade".
        $gradeType = CatalogNodeType::where('slug', 'grade')->first();
        if (! $gradeType || $grade->catalog_node_type_id !== $gradeType->id) {
            return response()->json(['message' => 'The selected node is not a grade.'], 422);
        }

        // Generate unique credentials.
        $email = $this->generateUsername($validated['name'] ?? 'student');
        $password = $this->generatePassword();

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

        // Link to the school (role = student).
        $user->schools()->syncWithoutDetaching([$school->id => ['role' => 'student']]);

        // Enroll in the grade for the current academic year.
        $year = EnrollmentService::academicYearFor($school);
        $enrollment = Enrollment::create([
            'user_id' => $user->id,
            'school_id' => $school->id,
            'catalog_node_id' => $grade->id,
            'academic_year' => $year,
            'status' => 'active',
            'started_at' => now()->toDateString(),
        ]);

        AuditLogger::record('student-registered', $user, null, [
            'school_id' => $school->id,
            'grade' => $grade->name,
            'academic_year' => $year,
        ]);

        return response()->json([
            'message' => 'Student registered. Share these credentials with the student.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $email,
                'grade' => $grade->name,
                'academic_year' => $year,
                'school' => $school->name,
            ],
            'credentials' => [
                'username' => $email,
                'password' => $password,
            ],
        ], 201);
    }

    /**
     * List a school's (or all) enrollments with student details.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Enrollment::with(['user:id,name,email', 'school:id,name', 'grade:id,name'])
            ->latest();

        if ($request->filled('school_id')) {
            $query->where('school_id', $request->integer('school_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->string('academic_year'));
        }

        $enrollments = $query->paginate(15);

        return response()->json([
            'enrollments' => $enrollments->items(),
            'total' => $enrollments->total(),
            'current_page' => $enrollments->currentPage(),
            'last_page' => $enrollments->lastPage(),
        ]);
    }

    /**
     * Mark the student's current year results and automatically create the next
     * academic year's enrollment. If passed, student advances to the next grade;
     * if failed, the student repeats the same grade (does not see the next class).
     */
    public function evaluate(Request $request, Enrollment $enrollment): JsonResponse
    {
        $validated = $request->validate([
            'result' => ['required', 'string', 'in:passed,failed'],
        ]);

        $user = $enrollment->user;

        if ($validated['result'] === 'passed') {
            $new = EnrollmentService::promote($user);
        } else {
            $new = EnrollmentService::retain($user);
        }

        if (! $new) {
            return response()->json(['message' => 'Could not advance the student (already at the top grade or no active enrollment).'], 422);
        }

        AuditLogger::record('student-' . $validated['result'], $user, null, [
            'from_year' => $enrollment->academic_year,
            'to_grade' => $new->grade?->name,
            'to_year' => $new->academic_year,
        ]);

        return response()->json([
            'message' => $validated['result'] === 'passed'
                ? 'Student promoted to ' . $new->grade?->name . ' for ' . $new->academic_year . '.'
                : 'Student retained in ' . $new->grade?->name . ' for ' . $new->academic_year . '.',
            'enrollment' => $new->load('user:id,name,email', 'school:id,name', 'grade:id,name'),
        ]);
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

    private function generatePassword(): string
    {
        return Str::upper(Str::random(3)) . '-' . Str::random(3) . '-' . random_int(100, 999);
    }
}
