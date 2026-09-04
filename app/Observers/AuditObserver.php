<?php

namespace App\Observers;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class AuditObserver
{
    public function created(Model $model): void
    {
        AuditLogger::record('created', $model, null, $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        AuditLogger::record('updated', $model, $model->getOriginal(), $model->getAttributes());
    }

    public function deleted(Model $model): void
    {
        AuditLogger::record('deleted', $model, $model->getAttributes());
    }
}