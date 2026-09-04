<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;

use App\Models\Role;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->get();

        foreach ($roles as $role) {
            $role->setAttribute('permissions_count', $role->permissions->count());
        }

        return response()->json([
            'roles' => $roles,
            'total' => $roles->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $role->syncPermissions($validated['permissions'] ?? []);

        AuditLogger::record('permission-changed', $role, null, ['permissions' => $role->permissions()->pluck('name')->all()]);

        return response()->json([
            'message' => 'Role created successfully.',
            'role' => $role->load('permissions'),
        ], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255', 'unique:roles,name,' . $role->id],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $role->update($request->only(['name', 'is_active']));

        if ($request->has('permissions')) {
            $role->syncPermissions($validated['permissions'] ?? []);
            AuditLogger::record('permission-changed', $role, null, ['previous' => $role->getOriginal('name'), 'permissions' => $role->permissions()->pluck('name')->all()]);
        }

        return response()->json([
            'message' => 'Role updated successfully.',
            'role' => $role->load('permissions'),
        ]);
    }

    public function toggle(Request $request, Role $role): JsonResponse
    {
        $role->update(['is_active' => !$role->is_active]);

        return response()->json([
            'message' => 'Role ' . ($role->is_active ? 'activated' : 'deactivated') . ' successfully.',
            'role' => $role->load('permissions'),
        ]);
    }

    public function destroy(Role $role): JsonResponse
    {
        $role->delete();

        return response()->json([
            'message' => 'Role deleted successfully.',
        ]);
    }

    public function permissions(): JsonResponse
    {
        $permissions = Permission::orderBy('name')->get();

        return response()->json([
            'permissions' => $permissions,
            'total' => $permissions->count(),
        ]);
    }
}
