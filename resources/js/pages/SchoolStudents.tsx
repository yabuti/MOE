import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge, Button, Card, CardBody, EmptyState, Input, Modal, PageHeader, Pagination, Select, Table } from '../components/ui';
import { NameFields, combineName, type NameParts } from '../components/NameFields';
import type { ProgressReport, RegisterStudentResult } from '../types';
import { MagnifyingGlassIcon, PlusIcon, EyeIcon, CheckCircleIcon, XCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface StudentItem {
    id: number;
    name: string;
    email: string;
    current_grade?: string | null;
    current_grade_id?: number | null;
    academic_year?: string | null;
    enrollment_status?: string | null;
    overall_read: number;
    overall_understand: number;
    exams_count: number;
}

interface GradeItem {
    id: number;
    name: string;
    slug: string;
}

interface StudentDetail {
    student: {
        id: number;
        name: string;
        email: string;
        generated_password?: string | null;
        current_grade?: string | null;
        academic_year?: string | null;
    };
    progress: ProgressReport;
    enrollment_history: Array<{
        academic_year: string;
        grade?: string | null;
        status: string;
    }>;
}

export default function SchoolStudents() {
    const { user, hasPermission } = useAuth();
    const { t } = useLanguage();
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const [grades, setGrades] = useState<GradeItem[]>([]);

    const isSchoolStaff = Boolean(user?.school_id);
    const [schoolList, setSchoolList] = useState<{ id: number; name: string }[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(user?.school_id ?? null);

    useEffect(() => {
        if (user?.school_id != null) {
            setSelectedSchoolId(user.school_id);
        }
    }, [user?.school_id]);

    const [regOpen, setRegOpen] = useState(false);
    const [regForm, setRegForm] = useState({ name: '', student_id: '', grade_id: '', school_id: '' });
    const [regName, setRegName] = useState<NameParts>({ first_name: '', middle_name: '', last_name: '' });
    const [regAvatar, setRegAvatar] = useState<File | null>(null);
    const regAvatarRef = useRef<HTMLInputElement>(null);
    const [regResult, setRegResult] = useState<RegisterStudentResult | null>(null);
    const [registering, setRegistering] = useState(false);

    const [detailStudent, setDetailStudent] = useState<StudentDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [evalTarget, setEvalTarget] = useState<StudentItem | null>(null);
    const [evaluating, setEvaluating] = useState(false);

    useEffect(() => {
        if (isSchoolStaff) return;
        api.get<{ schools: { id: number; name: string }[] }>('/schools', { params: { page: 1 } })
            .then(({ data }) => {
                setSchoolList(data.schools);
                if (!selectedSchoolId && data.schools.length > 0) {
                    setSelectedSchoolId(data.schools[0].id);
                }
            })
            .catch(() => {});
    }, [isSchoolStaff]);

    const loadStudents = useCallback(async (p: number, q?: string, gradeId?: string) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page: p };
            if (q) params.q = q;
            if (gradeId) params.grade_id = gradeId;
            if (selectedSchoolId) params.school_id = selectedSchoolId;
            const { data } = await api.get<{ students: StudentItem[]; current_page: number; last_page: number; total: number }>('/school/students', { params });
            setStudents(data.students);
            setPage(data.current_page);
            setLastPage(data.last_page);
            setTotal(data.total);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [selectedSchoolId]);

    useEffect(() => {
        const schoolForGrades = regOpen && regForm.school_id ? Number(regForm.school_id) : selectedSchoolId;
        const params: Record<string, string | number> = {};
        if (schoolForGrades) params.school_id = schoolForGrades;
        api.get<{ grades: GradeItem[] }>('/school/grades', { params })
            .then(({ data }) => setGrades(data.grades))
            .catch(() => {});
    }, [selectedSchoolId, regOpen, regForm.school_id]);

    useEffect(() => { void loadStudents(1, search, gradeFilter); }, [loadStudents]);

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setRegistering(true);
        try {
            const params: Record<string, number> = {};
            const schoolForRegister = regForm.school_id ? Number(regForm.school_id) : selectedSchoolId;
            if (schoolForRegister) params.school_id = schoolForRegister;

            const formData = new FormData();
            formData.append('name', combineName(regName));
            if (regForm.student_id) formData.append('student_id', regForm.student_id);
            formData.append('grade_id', String(regForm.grade_id));
            if (regAvatar) formData.append('avatar', regAvatar);

            const { data } = await api.post('/school/students', formData, { params });
            setRegResult(data);
            setRegForm({ name: '', student_id: '', grade_id: '', school_id: '' });
            setRegName({ first_name: '', middle_name: '', last_name: '' });
            setRegAvatar(null);
            if (regAvatarRef.current) regAvatarRef.current.value = '';
            void loadStudents(1, search, gradeFilter);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setRegistering(false);
        }
    };

    const handleViewStudent = async (student: StudentItem) => {
        setDetailLoading(true);
        setDetailStudent(null);
        try {
            const params: Record<string, number> = {};
            if (selectedSchoolId) params.school_id = selectedSchoolId;
            const { data } = await api.get<StudentDetail>(`/school/students/${student.id}`, { params });
            setDetailStudent(data);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDetailLoading(false);
        }
    };

    const handleEvaluate = async (result: 'passed' | 'failed') => {
        if (!evalTarget) return;
        setEvaluating(true);
        try {
            const params: Record<string, number> = {};
            if (selectedSchoolId) params.school_id = selectedSchoolId;
            await api.post(`/school/students/${evalTarget.id}/evaluate`, { result }, { params });
            toast.success(`Student ${result === 'passed' ? 'promoted' : 'retained'} successfully.`);
            setEvalTarget(null);
            void loadStudents(page, search, gradeFilter);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setEvaluating(false);
        }
    };

    const canRegister = hasPermission('register students');
    const canEvaluate = hasPermission('evaluate students');

    return (
        <div>
            <PageHeader
                title={t('schoolStudents.title')}
                description={t('schoolStudents.description')}
                actions={
                    canRegister && (
                        <Button onClick={() => { setRegResult(null); setRegForm({ name: '', student_id: '', grade_id: '', school_id: selectedSchoolId ? String(selectedSchoolId) : '' }); setRegName({ first_name: '', middle_name: '', last_name: '' }); setRegOpen(true); }}>
                            <PlusIcon className="h-5 w-5" /> {t('schoolStudents.newStudent')}
                        </Button>
                    )
                }
            />

            {!isSchoolStaff && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
                    <span className="text-sm font-semibold text-brand-900">{t('schoolStudents.selectSchool')}</span>
                    <Select
                        value={selectedSchoolId ?? ''}
                        onChange={(e) => { setSelectedSchoolId(Number(e.target.value) || null); }}
                        className="min-w-0 max-w-xs"
                    >
                        <option value="">{t('schoolStudents.selectSchool')}</option>
                        {schoolList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                </div>
            )}

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-night-300 px-5 py-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void loadStudents(1, search, gradeFilter); }}
                            placeholder={t('schoolStudents.searchPlaceholder')}
                            className="w-full rounded-lg border border-gray-300 dark:border-night-300 bg-white dark:bg-night-100 py-2 pl-9 pr-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <Select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); void loadStudents(1, search, e.target.value); }}>
                        <option value="">{t('schoolStudents.selectGrade')}</option>
                        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                    <Button variant="secondary" onClick={() => void loadStudents(1, search, gradeFilter)}>{t('schoolStudents.searchPlaceholder')}</Button>
                </div>

                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('schoolStudents.loading')}</div></CardBody>
                ) : students.length === 0 ? (
                    <CardBody><EmptyState title={t('schoolStudents.noStudents')} description={t('schoolStudents.description')} /></CardBody>
                ) : (
                    <>
                        <Table headers={[t('schoolStudents.colName'), t('schoolStudents.colGrade'), t('schoolStudents.colEmail'), t('schoolStudents.colStatus'), t('schoolStudents.colActions')]}>
                            {students.map((s) => (
                                <tr key={s.id}>
                                    <td className="px-5 py-3">
                                        <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-700 dark:text-gray-200">{s.current_grade ?? '—'}</td>
                                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{s.academic_year ?? '—'}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-night-200">
                                                <div className="h-full rounded-full bg-brand-500" style={{ width: `${s.overall_read}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold text-brand-700">{s.overall_read}%</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-night-200">
                                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.overall_understand}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold text-emerald-700">{s.overall_understand}%</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" className="px-2 py-1" title={t('common.actions')} onClick={() => void handleViewStudent(s)}>
                                                <EyeIcon className="h-4 w-4" />
                                            </Button>
                                            {canEvaluate && s.enrollment_status === 'active' && (
                                                <Button variant="ghost" className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-night-200" title={t('common.actions')} onClick={() => setEvalTarget(s)}>
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </Table>
                        <Pagination page={page} lastPage={lastPage} total={total} onPage={(p) => void loadStudents(p, search, gradeFilter)} />
                    </>
                )}
            </Card>

            <Modal
                open={regOpen}
                onClose={() => setRegOpen(false)}
                title={t('schoolStudents.newTitle')}
                size="lg"
                footer={
                    regResult ? (
                        <Button variant="primary" onClick={() => setRegOpen(false)}>{t('common.create')}</Button>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={() => setRegOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" form="reg-student-form" loading={registering}>{t('common.create')}</Button>
                        </>
                    )
                }
            >
                {!regResult ? (
                    <form id="reg-student-form" onSubmit={(e) => void handleRegister(e)} className="space-y-4">
                        {!isSchoolStaff && (
                            <Select
                                label={t('common.name')}
                                value={regForm.school_id || (selectedSchoolId ? String(selectedSchoolId) : '')}
                                onChange={(e) => setRegForm({ ...regForm, school_id: e.target.value })}
                                required
                            >
                                <option value="">{t('schoolStudents.selectSchool')}</option>
                                {schoolList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </Select>
                        )}
                        <NameFields value={regName} onChange={setRegName} />
                        <Input
                            label={t('common.name')}
                            value={regForm.student_id}
                            onChange={(e) => setRegForm({ ...regForm, student_id: e.target.value })}
                            placeholder={t('schoolStudents.searchPlaceholder')}
                        />
                        <Select label={t('schoolStudents.grade')} value={regForm.grade_id} onChange={(e) => setRegForm({ ...regForm, grade_id: e.target.value })} required>
                            <option value="">{t('schoolStudents.selectGrade')}</option>
                            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </Select>
                        <div>
                            <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{t('common.avatar')}</p>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={regAvatarRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setRegAvatar(e.target.files?.[0] ?? null)}
                                />
                                <Button variant="secondary" type="button" onClick={() => regAvatarRef.current?.click()}>
                                    <PhotoIcon className="h-4 w-4" />
                                    {t('common.chooseImage')}
                                </Button>
                                {regAvatar && (
                                    <img
                                        src={URL.createObjectURL(regAvatar)}
                                        alt="avatar"
                                        className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-night-300"
                                    />
                                )}
                                {!regAvatar && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.noImageSelected')}</span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t('schoolStudents.avatarHint')}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('schoolStudents.description')}
                        </p>
                    </form>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                            <p className="text-sm font-semibold text-emerald-900">{t('schoolStudents.created')}</p>
                            <p className="mt-1 text-xs text-emerald-700">{t('schoolStudents.description')}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200 p-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('common.name')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{regResult.student.name}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('common.email')}</span>
                                <code className="rounded bg-white dark:bg-night-100 px-2 py-0.5 text-sm font-semibold text-brand-700 border border-brand-200">{regResult.credentials.username}</code>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('common.password')}</span>
                                <code className="rounded bg-white dark:bg-night-100 px-2 py-0.5 text-sm font-semibold text-amber-700 border border-amber-200">{regResult.credentials.password}</code>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schoolStudents.grade')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{regResult.student.grade}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schoolStudents.colEmail')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{regResult.student.academic_year}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{t('common.password')}</p>
                    </div>
                )}
            </Modal>

            <Modal
                open={!!detailStudent || detailLoading}
                onClose={() => setDetailStudent(null)}
                title={detailStudent ? `${detailStudent.student.name} — Progress` : t('schoolStudents.loading')}
                size="lg"
                footer={<Button variant="secondary" onClick={() => setDetailStudent(null)}>{t('common.cancel')}</Button>}
            >
                {detailLoading && (
                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('schoolStudents.loading')}</div>
                )}
                {detailStudent && (
                    <div className="space-y-5 py-2">
                        <div className="rounded-xl border border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200 p-4 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('common.email')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{detailStudent.student.email}</span>
                            </div>
                            {detailStudent.student.generated_password && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">{t('common.password')}</span>
                                    <code className="rounded bg-white dark:bg-night-100 px-2 py-0.5 text-sm font-semibold text-amber-700 border border-amber-200">{detailStudent.student.generated_password}</code>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schoolStudents.grade')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{detailStudent.student.current_grade ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schoolStudents.colEmail')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{detailStudent.student.academic_year ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schoolStudents.colGrade')}</span>
                                <span className="font-bold text-brand-700">{detailStudent.progress.overall_read}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schoolStudents.colStatus')}</span>
                                <span className="font-bold text-emerald-700">{detailStudent.progress.overall_understand}%</span>
                            </div>
                        </div>

                        {detailStudent.enrollment_history.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t('schoolStudents.colActions')}</h4>
                                <div className="space-y-1.5">
                                    {detailStudent.enrollment_history.map((e, i) => (
                                        <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-night-200 px-3 py-2 text-xs">
                                            <span className="font-medium text-gray-800 dark:text-gray-100">{e.academic_year}</span>
                                            <span className="text-gray-500 dark:text-gray-400">{e.grade ?? '—'}</span>
                                            <Badge variant={e.status === 'active' ? 'green' : e.status === 'passed' ? 'blue' : 'gray'}>{e.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {detailStudent.progress.books.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t('schoolStudents.colActions')}</h4>
                                <div className="space-y-2">
                                    {detailStudent.progress.books.map((book) => (
                                        <div key={book.id} className="rounded-xl border border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 p-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-gray-900 dark:text-white">{book.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{book.grade ?? ''} {book.category ?? ''}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
                                                <span>Read: <strong className="text-brand-700">{book.read_percent}%</strong></span>
                                                <span>Exam: <strong className="text-emerald-700">{book.exam_percent !== null ? `${book.exam_percent}%` : '—'}</strong></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                open={!!evalTarget}
                onClose={() => setEvalTarget(null)}
                title={t('schoolStudents.editTitle')}
                size="sm"
            >
                {evalTarget && (
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {t('schoolStudents.description')}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="success"
                                className="flex-1"
                                loading={evaluating}
                                onClick={() => void handleEvaluate('passed')}
                            >
                                <CheckCircleIcon className="h-5 w-5" /> {t('common.active')}
                            </Button>
                            <Button
                                variant="danger"
                                className="flex-1"
                                loading={evaluating}
                                onClick={() => void handleEvaluate('failed')}
                            >
                                <XCircleIcon className="h-5 w-5" /> {t('common.inactive')}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            {t('schoolStudents.description')}
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
