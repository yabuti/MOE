<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CatalogNode;
use App\Models\ContentBlock;
use App\Models\Exam;
use App\Models\Media;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $counts = [
            'users' => User::count(),
            'students' => User::role('student')->count(),
            'schools' => School::count(),
            'nodes' => CatalogNode::count(),
            'published_nodes' => CatalogNode::where('status', 'published')->count(),
            'exams' => Exam::count(),
            'content_blocks' => ContentBlock::count(),
            'media' => Media::count(),
        ];

        $recentAuditLogs = AuditLog::with('user:id,name')
            ->latest()
            ->take(4)
            ->get();

        $recentUsers = User::latest()
            ->take(5)
            ->get();

        return response()->json([
            'counts' => $counts,
            'recent_audit_logs' => $recentAuditLogs,
            'recent_users' => $recentUsers,
        ]);
    }
}
