import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { PageLoader, Card, CardBody, Badge, EmptyState, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    AcademicCapIcon,
    BookOpenIcon,
    BuildingOfficeIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import type { AuditLog } from '../types';

interface DashboardData {
    counts: {
        users: number;
        students: number;
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

const statCards = [
    { name: 'Users', key: 'users' as const, icon: UsersIcon, bg: 'bg-blue-50', text: 'text-blue-600', darkBg: 'dark:bg-blue-500/20', darkText: 'dark:text-blue-300' },
    { name: 'Schools', key: 'schools' as const, icon: BuildingOfficeIcon, bg: 'bg-emerald-50', text: 'text-emerald-600', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-300' },
    { name: 'Books', key: 'nodes' as const, icon: BookOpenIcon, bg: 'bg-brand-50', text: 'text-brand-600', darkBg: 'dark:bg-brand-500/20', darkText: 'dark:text-brand-300' },
    { name: 'Students', key: 'students' as const, icon: AcademicCapIcon, bg: 'bg-purple-50', text: 'text-purple-600', darkBg: 'dark:bg-purple-500/20', darkText: 'dark:text-purple-300' },
];

const statNameMap: Record<string, string> = {
    'Users': 'dashboard.users',
    'Schools': 'dashboard.schools',
    'Books': 'dashboard.books',
    'Students': 'dashboard.students',
};

export default function Dashboard() {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user || !user.permissions?.includes('view dashboard')) return;
        api.get<DashboardData>('/dashboard')
            .then(({ data }) => setData(data))
            .catch((err) => setError(getErrorMessage(err)));
    }, [user]);

    if (loading || !user) return <PageLoader />;

    const roles = user?.roles?.map((r) => r.name) ?? [];
    if (roles.includes('parent')) return <Navigate to="/parent" replace />;
    if (roles.includes('student')) return <Navigate to="/my-progress" replace />;

    if (error) {
        return (
            <div>
                <PageHeader title={t('dashboard.title')} />
                <EmptyState title={t('dashboard.failedToLoad')} description={error} />
            </div>
        );
    }

    if (!data) return <PageLoader />;

    const firstName = user.name?.split(' ')[0] ?? 'there';
    const hour = new Date().getHours();
    const greetingKey = hour < 12 ? 'dashboard.greetingMorning' : hour < 17 ? 'dashboard.greetingAfternoon' : 'dashboard.greetingEvening';
    const roleLabel = roles[0] ? roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : t('common.member');

    return (
        <div className="space-y-6">
            {/* Welcome banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 sm:p-8">
                <div className="relative z-10">
                    <p className="text-sm font-medium text-brand-100">{t(greetingKey)}</p>
                    <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{t('dashboard.welcomeBack', { name: firstName })}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-brand-100">
                        {t('dashboard.signedInAs', { role: roleLabel })}
                    </p>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((s) => (
                    <Card key={s.name}>
                        <CardBody>
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg} ${s.text} ${s.darkBg} ${s.darkText}`}>
                                    <s.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.counts[s.key]}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t(statNameMap[s.name] ?? s.name)}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Recent activity + users */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-night-300 px-5 py-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('dashboard.recentActivity')}</h3>
                        <Badge variant="blue">{t('dashboard.events', { count: data.recent_audit_logs.length })}</Badge>
                    </div>
                    <CardBody>
                        {data.recent_audit_logs.length === 0 ? (
                            <EmptyState title={t('dashboard.noRecentActivity')} />
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-night-300">
                                {data.recent_audit_logs.map((log) => (
                                    <li key={log.id} className="flex items-start justify-between gap-3 py-3">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                                                {(log.user?.name ?? 'S').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-800 dark:text-gray-100">
                                                    <span className="font-medium">{log.user?.name ?? t('dashboard.system')}</span>{' '}
                                                    <span className="text-gray-500 dark:text-gray-400">{log.event}</span>
                                                </p>
                                                <p className="truncate text-xs text-gray-400 dark:text-gray-500">{log.auditable_type}</p>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-night-300 px-5 py-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('dashboard.newestUsers')}</h3>
                        <Badge variant="green">{t('dashboard.joined', { count: data.recent_users.length })}</Badge>
                    </div>
                    <CardBody>
                        {data.recent_users.length === 0 ? (
                            <EmptyState title={t('dashboard.noUsersYet')} />
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-night-300">
                                {data.recent_users.map((u) => (
                                    <li key={u.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{u.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                        <Badge variant="gray">{t('common.member')}</Badge>
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
