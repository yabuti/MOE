<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Dashboard
            'view dashboard',

            // Users
            'view users', 'create users', 'edit users', 'delete users',

            // Roles & permissions
            'view roles', 'create roles', 'edit roles', 'delete roles',
            'view permissions', 'assign permissions',

            // Schools
            'view schools', 'create schools', 'edit schools', 'delete schools',

            // Academic structure / catalog
            'view node types', 'create node types', 'edit node types', 'delete node types',
            'view catalog', 'create catalog', 'edit catalog', 'delete catalog',
            'reorder catalog', 'publish catalog', 'archive catalog',
            'import books',

            // Content blocks
            'view content', 'create content', 'edit content', 'delete content',
            'reorder content', 'upload media',

            // Exams
            'view exams', 'create exams', 'edit exams', 'delete exams',
            'manage questions',

            // Student tracking
            'view student progress', 'view reports',

            // School management (school-admin scoped)
            'manage students', 'view students', 'register students', 'evaluate students',
            'edit school settings',

            // System
            'view audit logs', 'view notifications', 'send notifications',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Roles
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions($permissions);

        $teacher = Role::firstOrCreate(['name' => 'teacher']);
        $teacher->syncPermissions([
            'view dashboard',
            'view catalog', 'create catalog', 'edit catalog', 'reorder catalog', 'publish catalog', 'import books',
            'view content', 'create content', 'edit content', 'reorder content', 'upload media',
            'view exams', 'create exams', 'edit exams', 'manage questions',
            'view student progress', 'view reports',
        ]);

        $parent = Role::firstOrCreate(['name' => 'parent']);
        $parent->syncPermissions([
            'view dashboard',
            'view catalog', 'view content',
            'view student progress', 'view reports',
        ]);

        $student = Role::firstOrCreate(['name' => 'student']);
        $student->syncPermissions([
            'view dashboard',
            'view catalog', 'view content',
        ]);

        $school = Role::firstOrCreate(['name' => 'school']);
        $school->syncPermissions([
            'view dashboard',
            'view catalog', 'view content', 'view exams',
            'view student progress', 'view reports',
            'manage students', 'view students', 'register students', 'evaluate students',
            'edit school settings',
        ]);

        $ministry = Role::firstOrCreate(['name' => 'ministry']);
        $ministry->syncPermissions([
            'view dashboard',
            'view catalog', 'view content', 'view exams',
            'view student progress', 'view reports',
        ]);
    }
}
