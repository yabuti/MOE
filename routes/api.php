<?php

use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\BookImportController;
use App\Http\Controllers\Api\Admin\CatalogController;
use App\Http\Controllers\Api\Admin\ContentBlockController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\ExamController;
use App\Http\Controllers\Api\Admin\MediaController;
use App\Http\Controllers\Api\Admin\NodeTypeController;
use App\Http\Controllers\Api\Admin\QuestionController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\SchoolController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public auth routes
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Users
        Route::get('/users', [UserController::class, 'index'])->middleware('permission:view users');
        Route::post('/users', [UserController::class, 'store'])->middleware('permission:create users');
        Route::get('/users/{user}', [UserController::class, 'show'])->middleware('permission:view users');
        Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:edit users');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:delete users');

        // Roles & permissions
        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:view roles');
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:create roles');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:edit roles');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:delete roles');
        Route::get('/permissions', [RoleController::class, 'permissions'])->middleware('permission:view roles');

        // Schools
        Route::get('/schools', [SchoolController::class, 'index'])->middleware('permission:view schools');
        Route::post('/schools', [SchoolController::class, 'store'])->middleware('permission:create schools');
        Route::get('/schools/{school}', [SchoolController::class, 'show'])->middleware('permission:view schools');
        Route::put('/schools/{school}', [SchoolController::class, 'update'])->middleware('permission:edit schools');
        Route::delete('/schools/{school}', [SchoolController::class, 'destroy'])->middleware('permission:delete schools');

        // Catalog node types
        Route::get('/node-types', [NodeTypeController::class, 'index'])->middleware('permission:view node types');
        Route::post('/node-types', [NodeTypeController::class, 'store'])->middleware('permission:create node types');
        Route::put('/node-types/{nodeType}', [NodeTypeController::class, 'update'])->middleware('permission:edit node types');
        Route::delete('/node-types/{nodeType}', [NodeTypeController::class, 'destroy'])->middleware('permission:delete node types');

        // Catalog nodes (tree)
        Route::get('/catalog/tree', [CatalogController::class, 'tree'])->middleware('permission:view catalog');
        Route::get('/catalog', [CatalogController::class, 'index'])->middleware('permission:view catalog');
        Route::post('/catalog', [CatalogController::class, 'store'])->middleware('permission:create catalog');
        Route::get('/catalog/{node}', [CatalogController::class, 'show'])->middleware('permission:view catalog');
        Route::put('/catalog/{node}', [CatalogController::class, 'update'])->middleware('permission:edit catalog');
        Route::delete('/catalog/{node}', [CatalogController::class, 'destroy'])->middleware('permission:delete catalog');
        Route::post('/catalog/reorder', [CatalogController::class, 'reorder'])->middleware('permission:reorder catalog');

        // Book PDF import (auto-build Book -> Chapter -> Section tree)
        Route::post('/books/import/preview', [BookImportController::class, 'preview'])->middleware('permission:import books');
        Route::post('/books/import', [BookImportController::class, 'import'])->middleware('permission:import books');

        // Content blocks (attached to a node)
        Route::get('/nodes/{node}/content', [ContentBlockController::class, 'index'])->middleware('permission:view content');
        Route::post('/nodes/{node}/content', [ContentBlockController::class, 'store'])->middleware('permission:create content');
        Route::put('/content/{content}', [ContentBlockController::class, 'update'])->middleware('permission:edit content');
        Route::delete('/content/{content}', [ContentBlockController::class, 'destroy'])->middleware('permission:delete content');
        Route::post('/content/reorder', [ContentBlockController::class, 'reorder'])->middleware('permission:reorder content');

        // Media
        Route::get('/media', [MediaController::class, 'index'])->middleware('permission:upload media');
        Route::post('/media/upload', [MediaController::class, 'upload'])->middleware('permission:upload media');
        Route::delete('/media/{media}', [MediaController::class, 'destroy'])->middleware('permission:upload media');

        // Exams
        Route::get('/exams', [ExamController::class, 'index'])->middleware('permission:view exams');
        Route::post('/exams', [ExamController::class, 'store'])->middleware('permission:create exams');
        Route::get('/exams/{exam}', [ExamController::class, 'show'])->middleware('permission:view exams');
        Route::put('/exams/{exam}', [ExamController::class, 'update'])->middleware('permission:edit exams');
        Route::delete('/exams/{exam}', [ExamController::class, 'destroy'])->middleware('permission:delete exams');

        // Questions
        Route::post('/exams/{exam}/questions', [QuestionController::class, 'store'])->middleware('permission:manage questions');
        Route::put('/questions/{question}', [QuestionController::class, 'update'])->middleware('permission:manage questions');
        Route::delete('/questions/{question}', [QuestionController::class, 'destroy'])->middleware('permission:manage questions');

        // Audit logs
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('permission:view audit logs');
    });
});
