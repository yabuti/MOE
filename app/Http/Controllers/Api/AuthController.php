<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role' => ['sometimes', 'string', 'in:student'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:4096'],
        ]);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ];

        if ($request->hasFile('avatar')) {
            $data['avatar'] = (new User)->storeAvatar($request->file('avatar'));
        }

        $user = User::create($data);

        $user->assignRole($validated['role'] ?? 'student');

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully.',
            'user' => $this->userPayload($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        AuditLogger::record('login', null, null, ['email' => $user->email], ['user_id' => $user->id], $user->id);

        return response()->json([
            'message' => 'Logged in successfully.',
            'user' => $this->userPayload($user),
            'token' => $token,
        ]);
    }

    public function parentRegister(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:4096'],
        ]);

        $data = [
            'name' => $validated['first_name'] . ' ' . $validated['last_name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ];

        if ($request->hasFile('avatar')) {
            $data['avatar'] = (new User)->storeAvatar($request->file('avatar'));
        }

        $user = User::create($data);

        $user->assignRole('parent');

        return response()->json([
            'message' => 'Parent registered successfully.',
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditLogger::record('logout', $request->user());

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    /**
     * Update the authenticated user's profile (name).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:4096'],
        ]);

        $data = ['name' => $validated['name']];

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $user->storeAvatar($request->file('avatar'));
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->userPayload($user),
        ]);
    }

    /**
     * Change the authenticated user's password (any role).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();

        if (! $user || ! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => $validated['new_password']]);

        AuditLogger::record('password-changed', $user);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * Build a serializable user payload.
     *
     * Note: "permissions" cannot be set as a model attribute because Spatie's
     * HasPermissions trait exposes a "permissions" relationship on the model,
     * which takes precedence during serialization. We therefore inject the
     * resolved permission names as a plain array after converting to an array.
     */
    private function userPayload(User $user): array
    {
        $user->load('roles', 'school:id,name,code');

        $payload = $user->toArray();
        $payload['avatar_url'] = $user->avatar_url;
        $payload['permissions'] = $user->getAllPermissions()->pluck('name')->values()->all();

        return $payload;
    }
}
