<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('parent_user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });

        DB::statement("ALTER TABLE student_progress MODIFY progress_type ENUM('content', 'exam', 'read', 'listen') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_user_id');
        });

        DB::statement("ALTER TABLE student_progress MODIFY progress_type ENUM('content', 'exam') NOT NULL");
    }
};