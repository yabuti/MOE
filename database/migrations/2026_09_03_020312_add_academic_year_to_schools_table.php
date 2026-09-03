<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A school tells the system when its academic year starts (month + day).
     * The platform uses this to know when a year ends so students can be
     * automatically promoted to the next grade (only if they passed).
     */
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->unsignedTinyInteger('academic_year_month')->nullable()
                ->comment('Month (1-12) the academic year starts');
            $table->unsignedTinyInteger('academic_year_day')->nullable()
                ->comment('Day of month (1-31) the academic year starts');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['academic_year_month', 'academic_year_day']);
        });
    }
};
