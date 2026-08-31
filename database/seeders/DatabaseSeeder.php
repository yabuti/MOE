<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            CatalogStructureSeeder::class,
        ]);

        User::factory()->create([
            'name' => 'Platform Admin',
            'email' => 'admin@moe.com',
            'password' => 'password',
        ])->assignRole('admin');

        User::factory()->create([
            'name' => 'Sample Teacher',
            'email' => 'teacher@moe.com',
            'password' => 'password',
        ])->assignRole('teacher');

        User::factory()->create([
            'name' => 'Sample Parent',
            'email' => 'parent@moe.com',
            'password' => 'password',
        ])->assignRole('parent');

        User::factory()->create([
            'name' => 'Sample Student',
            'email' => 'student@moe.com',
            'password' => 'password',
        ])->assignRole('student');
    }
}
