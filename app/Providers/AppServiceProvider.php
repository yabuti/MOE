<?php

namespace App\Providers;

use App\Models\CatalogNode;
use App\Models\CatalogNodeType;
use App\Models\ContentBlock;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\ExamQuestion;
use App\Models\Media;
use App\Models\School;
use App\Models\StudentProgress;
use App\Models\User;
use App\Observers\AuditObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $audited = [
            User::class,
            CatalogNode::class,
            CatalogNodeType::class,
            ContentBlock::class,
            Media::class,
            Exam::class,
            ExamQuestion::class,
            ExamAttempt::class,
            School::class,
            StudentProgress::class,
        ];

        foreach ($audited as $model) {
            $model::observe(AuditObserver::class);
        }
    }
}
