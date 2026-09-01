import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
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
                toast.success('Question updated');
            } else {
                await api.post(`/exams/${examId}/questions`, payload);
                toast.success('Question created');
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
            toast.success('Question deleted');
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
        <div>
            <PageHeader
                title={exam?.title ?? 'Exam Questions'}
                description={`Managing questions for this exam`}
                actions={
                    <>
                        <Button variant="secondary" onClick={() => navigate('/exams')}>
                            <ArrowLeftIcon className="h-5 w-5" /> Exams
                        </Button>
                        {canManage && (
                            <>
                                <Button variant="secondary" onClick={() => setImportModalOpen(true)}>
                                    Import Text/PDF
                                </Button>
                                <Button onClick={openCreate}>
                                    <PlusIcon className="h-5 w-5" /> New Question
                                </Button>
                            </>
                        )}
                    </>
                }
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500">Loading questions…</div></CardBody>
                ) : questions.length === 0 ? (
                    <CardBody><EmptyState title="No questions yet" description="Add a question to this exam." /></CardBody>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="group flex items-start justify-between gap-4 px-5 py-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="gray">Q{idx + 1}</Badge>
                                        <Badge variant="blue">{q.type.replace('_', ' ')}</Badge>
                                        <span className="text-xs text-gray-400">{q.points ?? 1} pts</span>
                                    </div>
                                    <p className="mt-1 font-medium text-gray-900">{q.question}</p>
                                    {q.options && q.options.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {q.options.map((opt, i) => (
                                                <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{opt}</span>
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
                                            <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(q)}>
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
                title={editing ? 'Edit Question' : 'New Question'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="question-form" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
                    </>
                }
            >
                <form id="question-form" onSubmit={handleSubmit} className="space-y-4">
                    <Textarea label="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={3} required />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                            {questionTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </Select>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Points" type="number" min={0} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
                            <Input label="Position" type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
                        </div>
                    </div>

                    {form.type === 'multiple_choice' && (
                        <div>
                            <p className="mb-1 text-sm font-medium text-gray-700">Options</p>
                            <div className="space-y-2">
                                {form.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correct-option"
                                            checked={form.correctAnswer.trim() !== '' && form.correctAnswer.trim() === opt.trim()}
                                            onChange={() => setForm({ ...form, correctAnswer: opt })}
                                            title="Mark as correct answer"
                                            className="h-4 w-4 shrink-0 cursor-pointer text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <Input
                                            value={opt}
                                            onChange={(e) => {
                                                const next = [...form.options];
                                                next[i] = e.target.value;
                                                setForm({ ...form, options: next });
                                            }}
                                            placeholder={`Option ${i + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-gray-400">Select the radio button next to the correct option.</p>
                        </div>
                    )}

                    {form.type === 'true_false' && (
                        <Select label="Correct answer" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}>
                            <option value="">Select…</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                        </Select>
                    )}

                    {(form.type === 'short_answer' || form.type === 'fill_blank') && (
                        <Input label="Correct answer" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} />
                    )}
                </form>
            </Modal>

            {/* Bulk Import Modal */}
            <Modal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Bulk Import Questions (PDF/Word)"
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setImportModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" loading={importing} onClick={handleBulkImport}>Import</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 border border-blue-200">
                        <p className="font-bold mb-2">Instructions:</p>
                        <p>Copy and paste your exam questions from Word or PDF directly here. Use the format:</p>
                        <pre className="mt-2 bg-white/60 p-2 rounded text-xs border border-blue-100">
1. What is the capital of Ethiopia?
A) Gondar
B) Addis Ababa
C) Bahir Dar
D) Hawassa
Answer: B
                        </pre>
                    </div>
                    <Textarea
                        label="Paste Exam Text"
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        rows={12}
                        placeholder="Paste your numbered questions here..."
                    />
                </div>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete question"
                message="Are you sure you want to delete this question?"
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
