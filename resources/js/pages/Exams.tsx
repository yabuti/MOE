import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Table, Textarea, statusVariant } from '../components/ui';
import type { Exam } from '../types';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ExamItem extends Exam {}

interface TreeNode {
    id: number;
    name: string;
    type: string | null;
    children: TreeNode[];
}

interface TreeOption {
    id: number;
    name: string;
    path: string;
    type: string | null;
}

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

    const [tree, setTree] = useState<TreeNode[]>([]);
    const [gradeId, setGradeId] = useState('');
    const [bookId, setBookId] = useState('');
    const [chapterId, setChapterId] = useState('');

    const [importFormat, setImportFormat] = useState<'pdf' | 'csv' | ''>('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

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

    const allNodes = useMemo(() => {
        const out: TreeNode[] = [];
        const walk = (nodesToWalk: TreeNode[]) => nodesToWalk.forEach((n) => { out.push(n); walk(n.children); });
        walk(tree);
        return out;
    }, [tree]);

    const flatOptions = useMemo<TreeOption[]>(() => {
        const options: TreeOption[] = [];

        const flatten = (nodesArray: TreeNode[], ancestors: string[] = []) => {
            nodesArray.forEach((n) => {
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

        flatten(tree);
        return options;
    }, [tree]);

    useEffect(() => {
        void loadExams(1);
        api.get<{ tree: TreeNode[] }>('/catalog/tree')
            .then(({ data }) => setTree(data.tree))
            .catch((err) => toast.error(getErrorMessage(err)));
    }, [loadExams]);

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
            let examId: number;
            if (editing) {
                await api.put(`/exams/${editing.id}`, payload);
                toast.success('Exam updated');
                examId = editing.id;
            } else {
                const { data } = await api.post<{ exam: { id: number } }>('/exams', payload);
                toast.success('Exam created');
                examId = data.exam.id;
            }

            if (importFormat === 'csv' && importFile) {
                const rawText = await importFile.text();
                const { data } = await api.post<{ message: string }>(`/exams/${examId}/bulk-import`, { raw_text: rawText });
                toast.success(data.message);
            } else if (importFormat === 'pdf' && importFile) {
                const formData = new FormData();
                formData.append('file', importFile);
                const { data } = await api.post<{ message: string }>(`/exams/${examId}/import-pdf`, formData, {
                    headers: { 'Content-Type': undefined },
                });
                toast.success(data.message);
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

    const findPath = (nodesToWalk: TreeNode[], targetId: number, trail: TreeNode[] = []): TreeNode[] | null => {
        for (const n of nodesToWalk) {
            const path = [...trail, n];
            if (n.id === targetId) return path;
            if (n.children && n.children.length > 0) {
                const found = findPath(n.children, targetId, path);
                if (found) return found;
            }
        }
        return null;
    };

    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm, catalog_node_id: '' });
        setGradeId('');
        setBookId('');
        setChapterId('');
        setImportFormat('');
        setImportFile(null);
        setModalOpen(true);
    };

    const openEdit = (exam: ExamItem) => {
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
        const path = findPath(tree, exam.catalog_node_id) ?? [];
        setGradeId(path.find((n) => n.type === 'grade') ? String(path.find((n) => n.type === 'grade')!.id) : '');
        setBookId(path.find((n) => n.type === 'book') ? String(path.find((n) => n.type === 'book')!.id) : '');
        setChapterId(path.find((n) => n.type === 'chapter') ? String(path.find((n) => n.type === 'chapter')!.id) : '');
        setImportFormat('');
        setImportFile(null);
        setModalOpen(true);
    };

    const selectGrade = (value: string) => {
        setGradeId(value);
        setBookId('');
        setChapterId('');
        setForm({ ...form, catalog_node_id: '' });
    };

    const selectBook = (value: string) => {
        setBookId(value);
        setChapterId('');
        setForm({ ...form, catalog_node_id: '' });
    };

    const selectChapter = (value: string) => {
        setChapterId(value);
        setForm({ ...form, catalog_node_id: value });
    };

    const grades = allNodes.filter((n) => n.type === 'grade');
    const selectedGrade = grades.find((g) => g.id === Number(gradeId));
    const books = selectedGrade?.children ?? [];
    const selectedBook = books.find((b) => b.id === Number(bookId));
    const chapters = selectedBook?.children ?? [];

    return (
        <div>
            <PageHeader
                title="Exams"
                description="Manage exams and assessments"
                actions={canCreate && (
                    <Button onClick={openNew}>
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
                                                    onClick={() => openEdit(exam)}
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
                    <div>
                        <p className="mb-1 text-sm font-medium text-gray-700">Assign to Chapter</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Select label="Grade" value={gradeId} onChange={(e) => selectGrade(e.target.value)}>
                                <option value="">Select grade…</option>
                                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </Select>
                            <Select label="Course" value={bookId} onChange={(e) => selectBook(e.target.value)} disabled={!gradeId}>
                                <option value="">Select course…</option>
                                {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </Select>
                            <Select label="Chapter" value={chapterId} onChange={(e) => selectChapter(e.target.value)} disabled={!bookId} required>
                                <option value="">Select chapter…</option>
                                {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Input label="Pass %" type="number" min={0} max={100} value={form.pass_percentage} onChange={(e) => setForm({ ...form, pass_percentage: Number(e.target.value) })} />
                        <Input label="Duration (min)" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                        <Input label="Max attempts" type="number" min={1} value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: Number(e.target.value) })} />
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-2 text-sm font-medium text-gray-700">Import questions from a file (optional)</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Select
                                label="Format"
                                value={importFormat}
                                onChange={(e) => {
                                    setImportFormat(e.target.value as 'pdf' | 'csv' | '');
                                    setImportFile(null);
                                    if (fileRef.current) fileRef.current.value = '';
                                }}
                            >
                                <option value="">No import</option>
                                <option value="csv">Text / CSV</option>
                                <option value="pdf">PDF</option>
                            </Select>
                            {importFormat !== '' && (
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-center hover:border-brand-400">
                                    <span className="text-xs font-medium text-gray-600">
                                        {importFile ? importFile.name : importFormat === 'pdf' ? 'Choose a PDF' : 'Choose a .csv / .txt file'}
                                    </span>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept={importFormat === 'pdf' ? '.pdf,application/pdf' : '.csv,.txt,text/*'}
                                        className="hidden"
                                        onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                                    />
                                </label>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            Format: numbered multiple-choice questions, options as <code className="rounded bg-gray-100 px-1">A) ...</code>, ending with <code className="rounded bg-gray-100 px-1">Answer: C</code>. Imported questions become part of the exam and reuse the existing question structure.
                        </p>
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
