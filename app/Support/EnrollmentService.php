<?php

namespace App\Support;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\User;
use Carbon\Carbon;

class EnrollmentService
{
    /**
     * The current active (in-progress) enrollment for a student, if any.
     */
    public static function activeEnrollment(User $user): ?Enrollment
    {
        return $user->enrollments()
            ->where('status', 'active')
            ->latest('started_at')
            ->first();
    }

    /**
     * The grade catalog node the student is CURRENTLY enrolled in, or null.
     */
    public static function currentGrade(User $user): ?CatalogNode
    {
        $active = self::activeEnrollment($user);
        return $active?->grade;
    }

    /**
     * Compute the academic year label ("2026/2027") for the school on a given date,
     * based on the day of the year the school's academic year starts.
     */
    public static function academicYearFor(School $school, ?Carbon $date = null): string
    {
        $date ??= Carbon::now();

        $month = $school->academic_year_month ?: 9;   // default start: September
        $day = $school->academic_year_day ?: 11;      // default: 11 (typical Ethiopia)

        // The current academic year started either this year (if today is on/after
        // the start date) or last year (if today is before the start date).
        $thisYearsStart = Carbon::create($date->year, $month, $day);
        $start = $date->gte($thisYearsStart) ? $thisYearsStart : $thisYearsStart->subYear();

        $end = $start->copy()->addYear(); // exclusive end
        $startYear = $start->year;
        $endYear = $end->year;

        return "{$startYear}/{$endYear}";
    }

    /**
     * The end date of the academic year that contains the given date.
     */
    public static function yearEndFor(School $school, ?Carbon $date = null): Carbon
    {
        $date ??= Carbon::now();

        $month = $school->academic_year_month ?: 9;
        $day = $school->academic_year_day ?: 11;

        $thisYearsStart = Carbon::create($date->year, $month, $day);
        $start = $date->gte($thisYearsStart) ? $thisYearsStart : $thisYearsStart->subYear();

        return $start->copy()->addYear();
    }

    /**
     * Has the academic year for the school already ended as of now?
     */
    public static function yearEnded(School $school): bool
    {
        return Carbon::now()->gte(self::yearEndFor($school));
    }

    /**
     * Move a student to the given grade for the NEXT academic year, creating an
     * active enrollment. Used both for promotion (next grade) and repeating
     * (same grade after failing). Returns the new enrollment.
     */
    public static function enrollForNextYear(User $user, CatalogNode $grade, string $status = 'active'): Enrollment
    {
        $school = self::studentSchool($user);
        $nextYear = self::academicYearFor($school, Carbon::now()->addYear());

        return Enrollment::updateOrCreate(
            ['user_id' => $user->id, 'academic_year' => $nextYear],
            [
                'school_id' => $school->id,
                'catalog_node_id' => $grade->id,
                'status' => $status,
                'started_at' => self::yearEndFor($school),
                'ended_at' => null,
            ]
        );
    }

    /**
     * Promote a student to the next grade for the next academic year.
     * Assumes the current year's enrollment was marked as passed.
     */
    public static function promote(User $user): ?Enrollment
    {
        $active = self::activeEnrollment($user);
        if (! $active) {
            return null;
        }

        $nextGrade = self::nextGrade($active->grade);
        if (! $nextGrade) {
            return null; // already at the top grade
        }

        // Mark the current year as finished/passed.
        $active->update([
            'status' => 'passed',
            'ended_at' => Carbon::now()->toDateString(),
        ]);

        return self::enrollForNextYear($user, $nextGrade, 'active');
    }

    /**
     * Hold a student in the SAME grade for the next academic year (failed).
     */
    public static function retain(User $user): ?Enrollment
    {
        $active = self::activeEnrollment($user);
        if (! $active) {
            return null;
        }

        $active->update([
            'status' => 'failed',
            'ended_at' => Carbon::now()->toDateString(),
        ]);

        return self::enrollForNextYear($user, $active->grade, 'active');
    }

    /**
     * The grace period (in months) after a year officially ends during which a
     * student is still considered in that year (e.g. marking results).
     */
    public static function gracePeriodMonths(): int
    {
        return 2;
    }

    /**
     * The grade that comes right after the given grade, by sort order within the
     * same category (school level). Returns null if there is no next grade.
     */
    public static function nextGrade(?CatalogNode $grade): ?CatalogNode
    {
        if (! $grade || ! $grade->parent_id) {
            return null;
        }

        $gradeType = CatalogNodeType::where('slug', 'grade')->first();
        if (! $gradeType) {
            return null;
        }

        return CatalogNode::where('parent_id', $grade->parent_id)
            ->where('catalog_node_type_id', $gradeType->id)
            ->where('status', 'published')
            ->where('sort_order', '>', $grade->sort_order)
            ->orderBy('sort_order')
            ->first();
    }

    /**
     * The school a student is enrolled in (from their most recent enrollment).
     */
    public static function studentSchool(User $user): ?School
    {
        $enrollment = $user->enrollments()->latest('started_at')->first();
        return $enrollment?->school;
    }

    /**
     * Whether a book belongs to the student's CURRENT grade. Books in past
     * grades are visible but read-only (no exam submission).
     */
    public static function bookIsInCurrentGrade(User $user, CatalogNode $book): bool
    {
        $grade = $book->parent;
        $currentGrade = self::currentGrade($user);

        if (! $grade || ! $currentGrade) {
            return false;
        }

        return $grade->id === $currentGrade->id;
    }
}
