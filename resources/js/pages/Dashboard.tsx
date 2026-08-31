import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client';
import { PageLoader, Card, CardBody, Badge, EmptyState } from '../components/ui';
import { PageHeader } from '../components/ui';
import {
    AcademicCapIcon,
    BookOpenIcon,
    BuildingOfficeIcon,
    FolderIcon,
    PhotoIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import type { AuditLog } from '../types';

interface DashboardData {
    counts: {
        users: number;
        schools: number;
        nodes: number;
        published_nodes: number;
        exams: number;
        content_blocks: number;
        media: number;
    };
    recent_audit_logs: AuditLog[];
    recent_users: { id: number; name: string; email: string }[];
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get<DashboardData>('/dashboard')
            .then(({ data }) => setData(data))
            .catch((err) => setError(getErrorMessage(err)));
    }, []);

    if (error) {
        return (
            <div>
                <PageHeader title="Dashboard" />
                <EmptyState title="Failed to load dashboard" description={error} />
            </div>
        );
    }

    if (!data) return <PageLoader />;

    const stats = [
        { label: 'Users', value: data.counts.users, icon: UsersIcon },
        { label: 'Schools', value: data.counts.schools, icon: BuildingOfficeIcon },
        { label: 'Catalog Nodes', value: data.counts.nodes, icon: FolderIcon },
        { label: 'Published', value: data.counts.published_nodes, icon: FolderIcon },
        { label: 'Exams', value: data.counts.exams, icon: AcademicCapIcon },
        { label: 'Content Blocks', value: data.counts.content_blocks, icon: BookOpenIcon },
        { label: 'Media', value: data.counts.media, icon: PhotoIcon },
    ];

    return (
        <div>
            <PageHeader title="Dashboard" description="Overview of the platform" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {stats.map((s) => (
                    <Card key={s.label}>
                        <CardBody>
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                                    <s.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                    <p className="text-sm text-gray-500">{s.label}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <div className="border-b border-gray-200 px-5 py-4">
                        <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
                    </div>
                    <CardBody>
                        {data.recent_audit_logs.length === 0 ? (
                            <EmptyState title="No recent activity" />
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {data.recent_audit_logs.map((log) => (
                                    <li key={log.id} className="flex items-start justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-800">
                                                <span className="font-medium">{log.user?.name ?? 'System'}</span>{' '}
                                                <span className="text-gray-500">{log.event}</span>
                                            </p>
                                            <p className="truncate text-xs text-gray-400">{log.auditable_type}</p>
                                        </div>
                                        <span className="shrink-0 text-xs text-gray-400">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <div className="border-b border-gray-200 px-5 py-4">
                        <h3 className="text-base font-semibold text-gray-900">Newest Users</h3>
                    </div>
                    <CardBody>
                        {data.recent_users.length === 0 ? (
                            <EmptyState title="No users yet" />
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {data.recent_users.map((user) => (
                                    <li key={user.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                        <Badge variant="gray">Member</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
