import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
    const { t } = useLanguage();
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
                toast.success(t('exams.updated'));
                examId = editing.id;
            } else {
                const { data } = await api.post<{ exam: { id: number } }>('/exams', payload);
                toast.success(t('exams.created'));
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
            toast.success(t('exams.deleted'));
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
                title={t('exams.title')}
                description={t('exams.description')}
                actions={canCreate && (
                    <Button onClick={openNew}>
                        <PlusIcon className="h-5 w-5" /> {t('exams.newExam')}
                    </Button>
                )}
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('exams.loading')}</div></CardBody>
                ) : exams.length === 0 ? (
                    <CardBody><EmptyState title={t('exams.noExams')} /></CardBody>
                ) : (
                    <>
                        <Table headers={[t('exams.colTitle'), t('exams.colCatalogNode'), t('common.status'), t('exams.colPassPercent'), t('exams.colDuration'), t('exams.colQuestions'), t('common.actions')]}>
                            {exams.map((exam) => (
                                <tr key={exam.id}>
                                    <td className="px-5 py-3">
                                        <button onClick={() => navigate(`/exams/${exam.id}/questions`)} className="font-medium text-brand-600 hover:underline">
                                            {exam.title}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="font-medium text-gray-900 dark:text-white">{exam.catalogNode?.name ?? exam.catalog_node_id}</div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500">
                                            {flatOptions.find((o) => o.id === exam.catalog_node_id)?.path ?? t('exams.chapterNode')}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3"><Badge variant={statusVariant(exam.status)}>{exam.status}</Badge></td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{exam.pass_percentage ?? '—'}%</td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{exam.duration_minutes ? `${exam.duration_minutes} ${t('exams.min')}` : '—'}</td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{exam.questions_count ?? 0}</td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" className="px-2 py-1 text-brand-600 hover:bg-brand-50" onClick={() => navigate(`/exams/${exam.id}/questions`)}>
                                                {t('exams.colQuestions')}
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
                                                <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteTarget(exam)}>
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
                title={editing ? t('exams.editTitle') : t('exams.newTitle')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit" form="exam-form" loading={saving}>{editing ? t('common.save') : t('common.create')}</Button>
                    </>
                }
            >
                <form id="exam-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input label={t('exams.colTitle')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    <div>
                        <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">{t('exams.assignToChapter')}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Select label={t('exams.grade')} value={gradeId} onChange={(e) => selectGrade(e.target.value)}>
                                <option value="">{t('exams.selectGrade')}</option>
                                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </Select>
                            <Select label={t('exams.course')} value={bookId} onChange={(e) => selectBook(e.target.value)} disabled={!gradeId}>
                                <option value="">{t('exams.selectCourse')}</option>
                                {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </Select>
                            <Select label={t('exams.chapter')} value={chapterId} onChange={(e) => selectChapter(e.target.value)} disabled={!bookId} required>
                                <option value="">{t('exams.selectChapter')}</option>
                                {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Input label={t('exams.passPercent')} type="number" min={0} max={100} value={form.pass_percentage} onChange={(e) => setForm({ ...form, pass_percentage: Number(e.target.value) })} />
                        <Input label={t('exams.durationMin')} type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                        <Input label={t('exams.maxAttempts')} type="number" min={1} value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: Number(e.target.value) })} />
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200 p-3">
                        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{t('exams.importQuestions')}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Select
                                label={t('exams.format')}
                                value={importFormat}
                                onChange={(e) => {
                                    setImportFormat(e.target.value as 'pdf' | 'csv' | '');
                                    setImportFile(null);
                                    if (fileRef.current) fileRef.current.value = '';
                                }}
                            >
                                <option value="">{t('exams.noImport')}</option>
                                <option value="csv">{t('exams.textCsv')}</option>
                                <option value="pdf">{t('exams.pdf')}</option>
                            </Select>
                            {importFormat !== '' && (
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-night-300 bg-white dark:bg-night-100 px-3 py-2 text-center hover:border-brand-400">
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {importFile ? importFile.name : importFormat === 'pdf' ? t('exams.choosePdf') : t('exams.chooseCsv')}
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
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {t('exams.formatHint')}
                        </p>
                    </div>
                    <Select label={t('common.status')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="draft">{t('common.draft')}</option>
                        <option value="published">{t('common.published')}</option>
                        <option value="archived">{t('common.archived')}</option>
                    </Select>
                    <Textarea label={t('common.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={t('exams.deleteTitle')}
                message={t('exams.deleteMessage', { name: deleteTarget?.title ?? '' })}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
