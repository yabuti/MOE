import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';
import type { Exam, ExamQuestion } from '../types';
import { ArrowLeftIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface QuestionItem extends ExamQuestion {}

const questionTypes = ['multiple_choice', 'true_false', 'short_answer', 'fill_blank'];

const emptyOptions = ['', '', '', ''];

export default function Questions() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { t } = useLanguage();

    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<QuestionItem | null>(null);
    const [form, setForm] = useState({ question: '', type: 'multiple_choice' as string, points: 1, position: 0, options: [] as string[], correctAnswer: '' });
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<QuestionItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        if (!examId) return;
        setLoading(true);
        try {
            const { data } = await api.get<{ exam: Exam }>(`/exams/${examId}`);
            setExam(data.exam);
            setQuestions(data.exam.questions ?? []);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [examId]);

    useEffect(() => { void load(); }, [load]);

    const openCreate = () => {
        setEditing(null);
        setForm({ question: '', type: 'multiple_choice', points: 1, position: questions.length, options: [...emptyOptions], correctAnswer: '' });
        setModalOpen(true);
    };

    const openEdit = (q: QuestionItem) => {
        setEditing(q);
        setForm({
            question: q.question,
            type: q.type,
            points: q.points ?? 1,
            position: q.position ?? 0,
            options: q.options ? [...q.options, ...emptyOptions].slice(0, 4) : [...emptyOptions],
            correctAnswer: q.correct_answer ?? '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        if (!examId) return;
        e.preventDefault();
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                question: form.question,
                type: form.type,
                points: Number(form.points) || 0,
                position: Number(form.position) || 0,
            };
            if (form.type === 'multiple_choice') {
                payload.options = form.options.filter((o) => o.trim() !== '');
            }
            if (form.correctAnswer.trim() !== '') {
                payload.correct_answer = form.correctAnswer.trim();
            }
            if (editing) {
                await api.put(`/questions/${editing.id}`, payload);
                toast.success(t('questions.updated'));
            } else {
                await api.post(`/exams/${examId}/questions`, payload);
                toast.success(t('questions.created'));
            }
            setModalOpen(false);
            void load();
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
            await api.delete(`/questions/${deleteTarget.id}`);
            toast.success(t('questions.deleted'));
            setDeleteTarget(null);
            void load();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [importing, setImporting] = useState(false);

    const handleBulkImport = async () => {
        if (!examId || !importText.trim()) return;
        setImporting(true);
        try {
            const { data } = await api.post<{ message: string; count: number }>(`/exams/${examId}/bulk-import`, {
                raw_text: importText,
            });
            toast.success(data.message);
            setImportModalOpen(false);
            setImportText('');
            void load();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setImporting(false);
        }
    };

    const canManage = hasPermission('manage questions');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-night-200">
            <PageHeader
                title={exam?.title ?? t('questions.title')}
                description={t('questions.description')}
                actions={
                    <>
                        <Button variant="secondary" onClick={() => navigate('/exams')}>
                            <ArrowLeftIcon className="h-5 w-5" /> {t('questions.backToExams')}
                        </Button>
                        {canManage && (
                            <>
                                <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
                                    {t('questions.importTextPdf')}
                                </Button>
                                <Button onClick={openCreate}>
                                    <PlusIcon className="h-5 w-5" /> {t('questions.newQuestion')}
                                </Button>
                            </>
                        )}
                    </>
                }
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('questions.loading')}</div></CardBody>
                ) : questions.length === 0 ? (
                    <CardBody><EmptyState title={t('questions.noQuestions')} description={t('questions.addHint')} /></CardBody>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-night-300">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="group flex items-start justify-between gap-4 px-5 py-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="gray">Q{idx + 1}</Badge>
                                        <Badge variant="blue">{q.type.replace('_', ' ')}</Badge>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{q.points ?? 1} {t('questions.points')}</span>
                                    </div>
                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{q.question}</p>
                                    {q.options && q.options.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {q.options.map((opt, i) => (
                                                <span key={i} className="rounded bg-gray-100 dark:bg-night-200 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">{opt}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    {canManage && (
                                        <>
                                            <Button variant="ghost" className="px-2 py-1" onClick={() => openEdit(q)}>
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteTarget(q)}>
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t('questions.editTitle') : t('questions.newTitle')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit" form="question-form" loading={saving}>{editing ? t('common.save') : t('common.create')}</Button>
                    </>
                }
            >
                <form id="question-form" onSubmit={handleSubmit} className="space-y-4">
                    <Textarea label={t('questions.questionLabel')} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={3} required />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Select label={t('questions.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                            {questionTypes.map((qt) => <option key={qt} value={qt}>{qt === 'multiple_choice' ? t('questions.multipleChoice') : qt === 'true_false' ? t('questions.trueFalse') : qt === 'short_answer' ? t('questions.shortAnswer') : t('questions.fillBlank')}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label={t('questions.pointsLabel')} type="number" min={0} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
                            <Input label={t('questions.positionLabel')} type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
                        </div>
                    </div>

                    {form.type === 'multiple_choice' && (
                        <div>
                            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">{t('questions.options')}</p>
                            <div className="space-y-2">
                                {form.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correct-option"
                                            checked={form.correctAnswer.trim() !== '' && form.correctAnswer.trim() === opt.trim()}
                                            onChange={() => setForm({ ...form, correctAnswer: opt })}
                                            title={t('questions.markCorrect')}
                                            className="h-4 w-4 shrink-0 cursor-pointer text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <Input
                                            value={opt}
                                            onChange={(e) => {
                                                const next = [...form.options];
                                                next[i] = e.target.value;
                                                setForm({ ...form, options: next });
                                            }}
                                            placeholder={`${t('questions.optionPrefix')} ${i + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('questions.selectRadioHint')}</p>
                        </div>
                    )}

                    {form.type === 'true_false' && (
                        <Select label={t('questions.correctAnswer')} value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}>
                            <option value="">{t('questions.selectOption')}</option>
                            <option value="true">{t('questions.true')}</option>
                            <option value="false">{t('questions.false')}</option>
                        </Select>
                    )}

                    {(form.type === 'short_answer' || form.type === 'fill_blank') && (
                        <Input label={t('questions.correctAnswer')} value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} />
                    )}
                </form>
            </Modal>

            {/* Bulk Import Modal */}
            <Modal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title={t('questions.bulkImport')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setImportModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button variant="primary" loading={importing} onClick={handleBulkImport}>{t('common.create')}</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                        <p className="font-bold mb-2">{t('questions.instructions')}</p>
                        <p>{t('questions.importHint')}</p>
                        <pre className="mt-2 bg-white/60 dark:bg-night-100/60 p-2 rounded text-xs border border-blue-100 dark:border-blue-800">
1. What is the capital of Ethiopia?
A) Gondar
B) Addis Ababa
C) Bahir Dar
D) Hawassa
Answer: B
                        </pre>
                    </div>
                    <Textarea
                        label={t('questions.pasteExamText')}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        rows={12}
                        placeholder={t('questions.pastePlaceholder')}
                    />
                </div>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={t('questions.deleteTitle')}
                message={t('questions.deleteMessage')}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
