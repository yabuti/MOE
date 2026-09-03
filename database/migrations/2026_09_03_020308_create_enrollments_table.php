<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Enrollments track which grade a student is in within a school for a
     * specific academic year. A student can have several rows over time
     * (history) but only one ACTIVE enrollment drives their current library
     * and exam access.
     */
    public function up(): void
    {
        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            // The grade is a catalog node of type "grade".
            $table->foreignId('catalog_node_id')->constrained('catalog_nodes')->cascadeOnDelete();
            $table->string('academic_year', 20); // e.g. "2026/2027"
            $table->enum('status', ['active', 'passed', 'failed'])->default('active');
            $table->date('started_at')->nullable();
            $table->date('ended_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'academic_year']);
            $table->index(['user_id', 'status']);
            $table->index('catalog_node_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
    }
};
