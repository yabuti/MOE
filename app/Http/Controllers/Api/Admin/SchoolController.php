<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SchoolController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = School::query();

        if ($request->filled('q')) {
            $search = $request->string('q')->trim();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('code', 'like', '%' . $search . '%');
            });
        }

        $schools = $query->latest()->paginate(15);

        return response()->json([
            'schools' => $schools->items(),
            'total' => $schools->total(),
            'current_page' => $schools->currentPage(),
            'last_page' => $schools->lastPage(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'in:primary,secondary,high_school,preparatory,college,university'],
            'region' => ['nullable', 'string', 'max:255'],
            'zone' => ['nullable', 'string', 'max:255'],
            'woreda' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'principal_name' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'academic_year_month' => ['nullable', 'integer', 'between:1,12'],
            'academic_year_day' => ['nullable', 'integer', 'between:1,31'],
        ]);

        $school = School::create($validated);

        // Auto-create a school-admin account with generated credentials.
        $schoolCode = $school->code ?: Str::slug($school->name);
        $email = 'schooladmin@' . $schoolCode . '.local';
        $password = Str::upper(Str::random(3)) . '-' . Str::random(3) . '-' . random_int(100, 999);

        // Ensure uniqueness.
        $originalEmail = $email;
        $i = 1;
        while (User::where('email', $email)->exists()) {
            $email = $originalEmail;
            $i++;
        }

        $adminUser = User::create([
            'name' => $school->principal_name ?: $school->name . ' Admin',
            'email' => $email,
            'password' => $password,
            'school_id' => $school->id,
        ]);
        $adminUser->assignRole('school');
        $adminUser->schools()->syncWithoutDetaching([$school->id => ['role' => 'admin']]);

        return response()->json([
            'message' => 'School created successfully.',
            'school' => $school,
            'credentials' => [
                'email' => $email,
                'password' => $password,
            ],
        ], 201);
    }

    public function show(School $school): JsonResponse
    {
        $school->load('users:id,name,email,school_id');

        $schoolAdmin = $school->users()->where('school_id', $school->id)->first();

        return response()->json([
            'school' => $school,
            'admin_email' => $schoolAdmin?->email,
        ]);
    }

    public function update(Request $request, School $school): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', 'string', 'in:primary,secondary,high_school,preparatory,college,university'],
            'region' => ['nullable', 'string', 'max:255'],
            'zone' => ['nullable', 'string', 'max:255'],
            'woreda' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'principal_name' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'academic_year_month' => ['nullable', 'integer', 'between:1,12'],
            'academic_year_day' => ['nullable', 'integer', 'between:1,31'],
        ]);

        $school->update($validated);

        return response()->json([
            'message' => 'School updated successfully.',
            'school' => $school,
        ]);
    }

    public function destroy(School $school): JsonResponse
    {
        $school->delete();

        return response()->json([
            'message' => 'School deleted successfully.',
        ]);
    }
}
