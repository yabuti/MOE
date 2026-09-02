import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import ProgressView from '../components/ProgressView';
import { Button, Card, CardBody, CardHeader, Input, PageHeader } from '../components/ui';
import { UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Child, ProgressReport } from '../types';

export default function ParentDashboard() {
    const [children, setChildren] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<number | null>(null);
    const [report, setReport] = useState<ProgressReport | null>(null);
    const [reportLoading, setReportLoading] = useState(false);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [attaching, setAttaching] = useState(false);

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
            const { data } = await api.get<{ progress: ProgressReport }>(`/parent/children/${childId}/progress`);
            setReport(data.progress);
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
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setAttaching(false);
        }
    };

    const handleDetach = async (childId: number) => {
        if (!window.confirm('Unlink this child? You can re-link them later.')) return;
        try {
            await api.delete(`/parent/children/${childId}`);
            toast.success('Child unlinked.');
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
            <PageHeader
                title="Parent Dashboard"
                description="Link your children and follow their reading progress"
            />

            <Card>
                <CardHeader title="Link a child" subtitle="Use the child's email or username and their password." />
                <CardBody>
                    <form onSubmit={handleAttach} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <Input
                            label="Child email or username"
                            placeholder="student@moe.com"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <Input
                            label="Child password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" loading={attaching} className="sm:ml-2">
                            <UserPlusIcon className="h-5 w-5" /> Link child
                        </Button>
                    </form>
                </CardBody>
            </Card>

            {loading ? (
                <Card><CardBody><div className="py-16 text-center text-sm text-gray-500">Loading children…</div></CardBody></Card>
            ) : children.length === 0 ? (
                <Card><CardBody><div className="py-16 text-center text-sm text-gray-500">
                    No linked children yet. Add your child's account details above.
                </div></CardBody></Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {children.map((child) => (
                            <div
                                key={child.id}
                                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                                    selected === child.id
                                        ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                                        : 'border-gray-200 bg-white hover:shadow-sm'
                                }`}
                                onClick={() => setSelected(child.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-gray-900">{child.name}</p>
                                        <p className="truncate text-xs text-gray-500">{child.email}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); void handleDetach(child.id); }}
                                        className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                        title="Unlink child"
                                    >
                                        <XMarkIcon className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-2 flex gap-3 text-sm">
                                    <span className="font-medium text-gray-700">Read {child.summary.overall_read}%</span>
                                    <span className="font-medium text-gray-700">Understand {child.summary.overall_understand}%</span>
                                </div>
                                <p className="mt-1 truncate text-xs text-gray-500">
                                    {child.parent_name ? `Linked to ${child.parent_name}` : ''}{child.summary.books_count} {child.summary.books_count === 1 ? 'book' : 'books'}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">
                                {selectedChild ? `${selectedChild.name}'s progress` : 'Progress'}
                            </h2>
                            {reportLoading && <span className="text-sm text-gray-400">Loading…</span>}
                        </div>
                        {report && !reportLoading && <ProgressView report={report} emptyTitle="This child hasn't read any books yet." />}
                    </div>
                </>
            )}
        </div>
    );
}