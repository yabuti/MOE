import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import ProgressView from '../components/ProgressView';
import { Badge, Button, Card, CardBody } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { BookOpenIcon, CheckCircleIcon, ClockIcon, LinkIcon, UserPlusIcon, UsersIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Child, ProgressReport } from '../types';

interface ChildProgressData {
    child: {
        id: number;
        name: string;
        email: string;
        current_grade?: string | null;
        school?: string | null;
        academic_year?: string | null;
        enrollment_history?: {
            academic_year: string;
            grade?: string | null;
            school?: string | null;
            status: string;
        }[];
    };
    progress: ProgressReport;
}

const gradients = [
    'from-blue-500 to-blue-700',
    'from-emerald-500 to-emerald-700',
    'from-purple-500 to-purple-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-700',
];

function PercentBar({ value, color = 'bg-brand-600' }: { value: number; color?: string }) {
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-night-200">
            <div
                className={`h-full rounded-full ${color} transition-all`}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}

function ChildCard({
    child,
    selected,
    onSelect,
    onDetach,
    index,
}: {
    child: Child;
    selected: boolean;
    onSelect: () => void;
    onDetach: () => void;
    index: number;
}) {
    const { t } = useLanguage();
    const gradient = gradients[index % gradients.length];
    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
                selected
                    ? 'border-brand-500 bg-brand-50/60 shadow-md ring-2 ring-brand-500/20'
                    : 'border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 hover:-translate-y-0.5 hover:shadow-md'
            }`}
        >
            <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-lg font-bold text-white`}>
                    {child.name.charAt(0).toUpperCase()}
                </div>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDetach(); }}
                    className="rounded-md p-1 text-gray-400 dark:text-gray-500 hover:bg-red-50 hover:text-red-600"
                    title={t('parent.unlinkChild')}
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>

            <h3 className="mt-3 truncate text-base font-semibold text-gray-900 dark:text-white">{child.name}</h3>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{child.email}</p>

            <div className="mt-4 space-y-3">
                <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">{t('parent.reading')}</span>
                        <span className="font-bold text-brand-700">{child.summary.overall_read}%</span>
                    </div>
                    <PercentBar value={child.summary.overall_read} />
                </div>
                <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">{t('parent.understanding')}</span>
                        <span className="font-bold text-emerald-700">{child.summary.overall_understand}%</span>
                    </div>
                    <PercentBar value={child.summary.overall_understand} color="bg-emerald-500" />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-night-300 pt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                    <BookOpenIcon className="h-3.5 w-3.5" />
                    {child.summary.books_count} {child.summary.books_count === 1 ? t('parent.book') : t('parent.books')}
                </span>
                {child.parent_name && (
                    <span className="inline-flex items-center gap-1">
                        <UsersIcon className="h-3.5 w-3.5" />
                        {child.parent_name}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function ParentDashboard() {
    const { t } = useLanguage();
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [report, setReport] = useState<ProgressReport | null>(null);
    const [childData, setChildData] = useState<ChildProgressData['child'] | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [attaching, setAttaching] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);

    const loadChildren = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<{ children: Child[] }>('/parent/children');
            setChildren(data.children);
            setSelected((prev) => (prev != null && data.children.some((c) => c.id === prev) ? prev : (data.children[0]?.id ?? null)));
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadChildren(); }, [loadChildren]);

    const loadReport = useCallback(async (childId: number) => {
        setReportLoading(true);
        try {
            const { data } = await api.get<ChildProgressData>(`/parent/children/${childId}/progress`);
            setReport(data.progress);
            setChildData(data.child);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setReportLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selected != null) {
            void loadReport(selected);
        }
    }, [selected, loadReport]);

    const handleAttach = async (e: FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;
        setAttaching(true);
        try {
            const { data } = await api.post<{ message: string; child: Child }>('/parent/children', {
                username: username.trim(),
                password,
            });
            toast.success(data.message);
            setUsername('');
            setPassword('');
            await loadChildren();
            if (data.child) setSelected(data.child.id);
            setShowLinkForm(false);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setAttaching(false);
        }
    };

    const handleDetach = async (childId: number) => {
        if (!window.confirm(t('parent.unlinkConfirm'))) return;
        try {
            await api.delete(`/parent/children/${childId}`);
            toast.success(t('parent.childUnlinked'));
            await loadChildren();
            if (selected === childId) {
                setSelected(null);
                setReport(null);
            }
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const selectedChild = children.find((c) => c.id === selected) ?? null;

    return (
        <div className="space-y-6">
            {/* Welcome banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 sm:p-8">
                <div className="relative z-10">
                    <p className="text-sm font-medium text-emerald-100">{t('parent.bannerTitle')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{t('parent.bannerSubtitle')}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-emerald-100">
                        {t('parent.bannerDescription')}
                    </p>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
            </div>

            {/* Link a child */}
            {!showLinkForm ? (
                <Button variant="secondary" className="w-full border-dashed py-3 sm:w-auto" onClick={() => setShowLinkForm(true)}>
                    <UserPlusIcon className="h-5 w-5" /> {t('parent.linkChild')}
                </Button>
            ) : (
                <Card>
                    <CardBody>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                                <LinkIcon className="h-5 w-5 text-brand-600" /> {t('parent.linkChild')}
                            </h3>
                            <button onClick={() => setShowLinkForm(false)} className="rounded-md p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-night-200">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAttach} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">{t('parent.childEmailOrUsername')}</label>
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder={t('parent.childEmailPlaceholder')}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">{t('parent.childPassword')}</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('parent.childPasswordPlaceholder')}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>
                            <Button type="submit" loading={attaching} className="sm:ml-2">
                                <UserPlusIcon className="h-5 w-5" /> {t('parent.linkChild')}
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            )}

            {loading ? (
                <Card><CardBody><div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('parent.loadingChildren')}</div></CardBody></Card>
            ) : children.length === 0 ? (
                <Card>
                    <CardBody>
                        <div className="py-16 text-center">
                            <UsersIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-night-300" />
                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t('parent.noChildren')}</p>
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {children.map((child, i) => (
                            <ChildCard
                                key={child.id}
                                child={child}
                                index={i}
                                selected={selected === child.id}
                                onSelect={() => setSelected(child.id)}
                                onDetach={() => void handleDetach(child.id)}
                            />
                        ))}
                    </div>

                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
                                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                                {selectedChild ? t('parent.childProgress', { name: selectedChild.name }) : t('parent.progress')}
                            </h2>
                            {reportLoading && <span className="text-sm text-gray-400 dark:text-gray-500">{t('parent.loadingEllipsis')}</span>}
                        </div>

                        {childData && (
                            <div className="mb-4 rounded-2xl border border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 p-5">
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    {childData.current_grade && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40">
                                            📖 {childData.current_grade}
                                        </span>
                                    )}
                                    {childData.school && (
                                        <span className="text-gray-600 dark:text-gray-300">🏫 {childData.school}</span>
                                    )}
                                    {childData.academic_year && (
                                        <span className="text-gray-500 dark:text-gray-400">📅 {childData.academic_year}</span>
                                    )}
                                </div>

                                {childData.enrollment_history && childData.enrollment_history.length > 1 && (
                                    <div className="mt-4 border-t border-gray-100 dark:border-night-300 pt-3">
                                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            <ClockIcon className="h-3.5 w-3.5" /> {t('parent.enrollmentHistory')}
                                        </h4>
                                        <div className="space-y-1.5">
                                            {childData.enrollment_history.map((entry, i) => (
                                                <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-night-200 px-3 py-2 text-xs">
                                                    <span className="font-medium text-gray-800 dark:text-gray-100">{entry.academic_year}</span>
                                                    <span className="text-gray-500 dark:text-gray-400">{entry.grade ?? '—'}</span>
                                                    <span className="text-gray-400 dark:text-gray-500">{entry.school ?? '—'}</span>
                                                    <Badge variant={entry.status === 'active' ? 'green' : entry.status === 'passed' ? 'blue' : 'gray'}>
                                                        {entry.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {report && !reportLoading && <ProgressView report={report} emptyTitle={t('parent.noBooksYet')} />}
                    </div>
                </>
            )}
        </div>
    );
}
