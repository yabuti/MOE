import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Table, Textarea, statusVariant } from '../components/ui';
import type { CatalogNode, Exam } from '../types';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ExamItem extends Exam {}

const emptyForm = {
    catalog_node_id: '',
    title: '',
    description: '',
    pass_percentage: 50,
    duration_minutes: 30,
    max_attempts: 1,
    status: 'draft',
};

export default function Exams() {
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [nodes, setNodes] = useState<CatalogNode[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ExamItem | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<ExamItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadExams = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const { data } = await api.get<{ exams: ExamItem[]; current_page: number; last_page: number; total: number }>('/exams', { params: { page: p } });
            setExams(data.exams);
            setPage(data.current_page);
            setLastPage(data.last_page);
            setTotal(data.total);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    interface TreeOption {
        id: number;
        name: string;
        path: string;
        type: string | null;
    }

    const [flatOptions, setFlatOptions] = useState<TreeOption[]>([]);

    const loadNodes = useCallback(async () => {
        try {
            const { data } = await api.get<{ tree: any[] }>('/catalog/tree');
            const options: TreeOption[] = [];

            const flatten = (nodes: any[], ancestors: string[] = []) => {
                nodes.forEach((n) => {
                    const currentPath = [...ancestors, n.name];
                    options.push({
                        id: n.id,
                        name: n.name,
                        path: currentPath.join(' › '),
                        type: n.type,
                    });
                    if (n.children && n.children.length > 0) {
                        flatten(n.children, currentPath);
                    }
                });
            };

            flatten(data.tree ?? []);
            setFlatOptions(options);
        } catch {
            setFlatOptions([]);
        }
    }, []);

    useEffect(() => {
        void loadExams(1);
        void loadNodes();
    }, [loadExams, loadNodes]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                catalog_node_id: Number(form.catalog_node_id),
                title: form.title,
                description: form.description || null,
                pass_percentage: form.pass_percentage ? Number(form.pass_percentage) : null,
                duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
                max_attempts: form.max_attempts ? Number(form.max_attempts) : null,
                status: form.status,
            };
            if (editing) {
                await api.put(`/exams/${editing.id}`, payload);
                toast.success('Exam updated');
            } else {
                await api.post('/exams', payload);
                toast.success('Exam created');
            }
            setModalOpen(false);
            void loadExams(editing ? page : 1);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/exams/${deleteTarget.id}`);
            toast.success('Exam deleted');
            setDeleteTarget(null);
            void loadExams(exams.length === 1 && page > 1 ? page - 1 : page);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canCreate = hasPermission('create exams');
    const canEdit = hasPermission('edit exams');
    const canDelete = hasPermission('delete exams');

    return (
        <div>
            <PageHeader
                title="Exams"
                description="Manage exams and assessments"
                actions={canCreate && (
                    <Button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}>
                        <PlusIcon className="h-5 w-5" /> New Exam
                    </Button>
                )}
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500">Loading exams…</div></CardBody>
                ) : exams.length === 0 ? (
                    <CardBody><EmptyState title="No exams found" /></CardBody>
                ) : (
                    <>
                        <Table headers={['Title', 'Catalog Node', 'Status', 'Pass %', 'Duration', 'Questions', 'Actions']}>
                            {exams.map((exam) => (
                                <tr key={exam.id}>
                                    <td className="px-5 py-3">
                                        <button onClick={() => navigate(`/exams/${exam.id}/questions`)} className="font-medium text-brand-600 hover:underline">
                                            {exam.title}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">
                                        <div className="font-medium text-gray-900">{exam.catalogNode?.name ?? exam.catalog_node_id}</div>
                                        <div className="text-xs text-gray-400">
                                            {flatOptions.find((o) => o.id === exam.catalog_node_id)?.path ?? 'Chapter Node'}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3"><Badge variant={statusVariant(exam.status)}>{exam.status}</Badge></td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{exam.pass_percentage ?? '—'}%</td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{exam.duration_minutes ? `${exam.duration_minutes} min` : '—'}</td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{exam.questions_count ?? 0}</td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" className="px-2 py-1 text-brand-600 hover:bg-brand-50" onClick={() => navigate(`/exams/${exam.id}/questions`)}>
                                                Questions
                                            </Button>
                                            {canEdit && (
                                                <Button
                                                    variant="ghost" className="px-2 py-1"
                                                    onClick={() => {
                                                        setEditing(exam);
                                                        setForm({
                                                            catalog_node_id: String(exam.catalog_node_id),
                                                            title: exam.title,
                                                            description: exam.description ?? '',
                                                            pass_percentage: exam.pass_percentage ?? 50,
                                                            duration_minutes: exam.duration_minutes ?? 30,
                                                            max_attempts: exam.max_attempts ?? 1,
                                                            status: exam.status,
                                                        });
                                                        setModalOpen(true);
                                                    }}
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(exam)}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </Table>
                        <Pagination page={page} lastPage={lastPage} total={total} onPage={(p) => void loadExams(p)} />
                    </>
                )}
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Exam' : 'New Exam'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="exam-form" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
                    </>
                }
            >
                <form id="exam-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    <Select label="Assign to Chapter / Node" value={form.catalog_node_id} onChange={(e) => setForm({ ...form, catalog_node_id: e.target.value })} required>
                        <option value="">Select a chapter or node…</option>
                        <optgroup label="Chapters (Recommended)">
                            {flatOptions.filter((o) => o.type === 'chapter').map((o) => (
                                <option key={o.id} value={o.id}>
                                    📖 {o.path}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Other Nodes (Books / Grades / Categories)">
                            {flatOptions.filter((o) => o.type !== 'chapter').map((o) => (
                                <option key={o.id} value={o.id}>
                                    📁 {o.path}
                                </option>
                            ))}
                        </optgroup>
                    </Select>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Input label="Pass %" type="number" min={0} max={100} value={form.pass_percentage} onChange={(e) => setForm({ ...form, pass_percentage: Number(e.target.value) })} />
                        <Input label="Duration (min)" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                        <Input label="Max attempts" type="number" min={1} value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: Number(e.target.value) })} />
                    </div>
                    <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </Select>
                    <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete exam"
                message={`Are you sure you want to delete "${deleteTarget?.title}" and all its questions?`}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
