import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Table } from '../components/ui';
import { NameFields, combineName, type NameParts } from '../components/NameFields';
import type { RegisterStudentResult, School } from '../types';
import { MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TrashIcon, UserPlusIcon, EyeIcon } from '@heroicons/react/24/outline';

interface SchoolItem extends School {}

interface CatalogTreeItem {
    id: number;
    name: string;
    type: 'category' | 'grade' | 'book' | 'chapter';
    children?: CatalogTreeItem[];
}

const schoolTypes = ['primary', 'secondary', 'high_school', 'preparatory', 'college', 'university'];

const schoolTypeLabels: Record<string, string> = {
    primary: 'schools.typePrimary',
    secondary: 'schools.typeSecondary',
    high_school: 'schools.typeHighSchool',
    preparatory: 'schools.typePreparatory',
    college: 'schools.typeCollege',
    university: 'schools.typeUniversity',
};

const monthKeys = [
    'schools.monthJanuary', 'schools.monthFebruary', 'schools.monthMarch',
    'schools.monthApril', 'schools.monthMay', 'schools.monthJune',
    'schools.monthJuly', 'schools.monthAugust', 'schools.monthSeptember',
    'schools.monthOctober', 'schools.monthNovember', 'schools.monthDecember',
];

const emptyForm = {
    name: '',
    code: '',
    type: '',
    region: '',
    zone: '',
    woreda: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    principal_name: '',
    academic_year_month: 9,
    academic_year_day: 11,
    is_active: true,
};

export default function Schools() {
    const { hasPermission } = useAuth();
    const { t } = useLanguage();
    const [schools, setSchools] = useState<SchoolItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<SchoolItem | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<SchoolItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Register student modal state
    const [registerSchool, setRegisterSchool] = useState<SchoolItem | null>(null);
    const [grades, setGrades] = useState<CatalogTreeItem[]>([]);
    const [regForm, setRegForm] = useState({ name: '', student_id: '', grade_id: '' });
    const [regName, setRegName] = useState<NameParts>({ first_name: '', middle_name: '', last_name: '' });
    const [regResult, setRegResult] = useState<RegisterStudentResult | null>(null);
    const [registering, setRegistering] = useState(false);

    // Created school credentials display
    const [createdSchoolCredentials, setCreatedSchoolCredentials] = useState<{
        schoolName: string;
        email: string;
        password: string;
    } | null>(null);

    // View school detail
    const [viewingSchool, setViewingSchool] = useState<(SchoolItem & { admin_email?: string | null }) | null>(null);
    const [viewLoading, setViewLoading] = useState(false);

    const loadSchools = useCallback(async (p: number, q?: string) => {
        setLoading(true);
        try {
            const { data } = await api.get<{ schools: SchoolItem[]; current_page: number; last_page: number; total: number }>('/schools', {
                params: { page: p, q },
            });
            setSchools(data.schools);
            setPage(data.current_page);
            setLastPage(data.last_page);
            setTotal(data.total);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSchools(1);
    }, [loadSchools]);

    // Load grade nodes for the register-student dropdown
    useEffect(() => {
        if (registerSchool) {
            api.get<{ tree: CatalogTreeItem[] }>('/catalog/tree')
                .then(({ data }) => {
                    const allGrades: CatalogTreeItem[] = [];
                    for (const cat of data.tree ?? []) {
                        for (const g of cat.children ?? []) {
                            if (g.type === 'grade') allGrades.push(g);
                        }
                    }
                    setGrades(allGrades);
                })
                .catch(() => {});
        }
    }, [registerSchool]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                type: form.type || null,
                is_active: Boolean(form.is_active),
                academic_year_month: Number(form.academic_year_month) || 9,
                academic_year_day: Number(form.academic_year_day) || 11,
            };
            if (editing) {
                await api.put(`/schools/${editing.id}`, payload);
                toast.success(t('schools.updated'));
                setModalOpen(false);
                void loadSchools(page);
            } else {
                const { data } = await api.post<{ message: string; school: SchoolItem; credentials: { email: string; password: string } }>('/schools', payload);
                toast.success(t('schools.created'));
                setModalOpen(false);
                setCreatedSchoolCredentials({
                    schoolName: data.school.name,
                    email: data.credentials.email,
                    password: data.credentials.password,
                });
                void loadSchools(1);
            }
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
            await api.delete(`/schools/${deleteTarget.id}`);
            toast.success(t('schools.deleted'));
            setDeleteTarget(null);
            void loadSchools(schools.length === 1 && page > 1 ? page - 1 : page, search);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canCreate = hasPermission('create schools');
    const canEdit = hasPermission('edit schools');
    const canDelete = hasPermission('delete schools');
    const canRegisterStudent = hasPermission('create users');

    const handleViewSchool = async (school: SchoolItem) => {
        setViewLoading(true);
        try {
            const { data } = await api.get<{ school: SchoolItem & { admin_email?: string | null }; admin_email?: string | null }>(`/schools/${school.id}`);
            setViewingSchool({ ...data.school, admin_email: data.admin_email ?? data.school.admin_email ?? null });
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setViewLoading(false);
        }
    };

    const handleRegisterStudent = async (e: FormEvent) => {
        e.preventDefault();
        if (!registerSchool) return;
        setRegistering(true);
        try {
            const { data } = await api.post('/enrollments/register', {
                school_id: registerSchool.id,
                name: combineName(regName),
                student_id: regForm.student_id || undefined,
                grade_id: Number(regForm.grade_id),
            });
            setRegResult(data);
            setRegForm({ name: '', student_id: '', grade_id: '' });
            setRegName({ first_name: '', middle_name: '', last_name: '' });
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div>
            <PageHeader
                title={t('schools.title')}
                description={t('schools.description')}
                actions={
                    canCreate && (
                        <Button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}>
                            <PlusIcon className="h-5 w-5" /> {t('schools.newSchool')}
                        </Button>
                    )
                }
            />

            <Card>
                <div className="flex items-center gap-2 border-b border-gray-200 dark:border-night-300 px-5 py-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void loadSchools(1, search); }}
                            placeholder={t('schools.searchPlaceholder')}
                            className="w-full rounded-lg border border-gray-300 dark:border-night-300 bg-white dark:bg-night-100 py-2 pl-9 pr-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <Button variant="secondary" onClick={() => void loadSchools(1, search)}>Search</Button>
                </div>

                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('schools.loading')}</div></CardBody>
                ) : schools.length === 0 ? (
                    <CardBody><EmptyState title={t('schools.noSchools')} /></CardBody>
                ) : (
                    <>
                        <Table headers={[t('schools.colName'), t('schools.colCode'), t('schools.colType'), t('schools.colLocation'), t('schools.colStatus'), t('schools.colActions')]}>
                            {schools.map((school) => (
                                <tr key={school.id}>
                                    <td className="px-5 py-3">
                                        <span className="font-medium text-gray-900 dark:text-white">{school.name}</span>
                                        {school.principal_name && <p className="text-xs text-gray-500 dark:text-gray-400">{t('schools.principalPrefix')}: {school.principal_name}</p>}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{school.code || t('common.dash')}</td>
                                    <td className="px-5 py-3">
                                        <Badge variant="blue">{school.type ? t(schoolTypeLabels[school.type] ?? school.type) : t('common.unspecified')}</Badge>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">
                                        {[school.region, school.city].filter(Boolean).join(', ') || t('common.dash')}
                                    </td>
                                    <td className="px-5 py-3">
                                        <Badge variant={school.is_active ? 'green' : 'gray'}>{school.is_active ? t('common.active') : t('common.inactive')}</Badge>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost" className="px-2 py-1"
                                                title={t('schools.loadingDetails')}
                                                onClick={() => void handleViewSchool(school)}
                                            >
                                                <EyeIcon className="h-4 w-4" />
                                            </Button>
                                            {canRegisterStudent && (
                                                <Button
                                                    variant="ghost" className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                    title={t('schools.registerStudent', { name: school.name })}
                                                    onClick={() => { setRegisterSchool(school); setRegResult(null); setRegForm({ name: '', student_id: '', grade_id: '' }); setRegName({ first_name: '', middle_name: '', last_name: '' }); }}
                                                >
                                                    <UserPlusIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canEdit && (
                                                <Button
                                                    variant="ghost" className="px-2 py-1"
                                                    onClick={() => {
                                                        setEditing(school);
                                                        setForm({
                                                            name: school.name, code: school.code ?? '', type: school.type ?? '',
                                                            region: school.region ?? '', zone: school.zone ?? '', woreda: school.woreda ?? '',
                                                            city: school.city ?? '', address: school.address ?? '', phone: school.phone ?? '',
                                                            email: school.email ?? '', principal_name: school.principal_name ?? '',
                                                            academic_year_month: school.academic_year_month ?? 9,
                                                            academic_year_day: school.academic_year_day ?? 11,
                                                            is_active: Boolean(school.is_active),
                                                        });
                                                        setModalOpen(true);
                                                    }}
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteTarget(school)}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </Table>
                        <Pagination page={page} lastPage={lastPage} total={total} onPage={(p) => void loadSchools(p, search)} />
                    </>
                )}
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t('schools.editTitle') : t('schools.newTitle')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit" form="school-form" loading={saving}>{editing ? t('common.save') : t('common.create')}</Button>
                    </>
                }
            >
                <form id="school-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label={t('common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <Input label={t('common.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    <Select label={t('common.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        <option value="">{t('schools.selectType')}</option>
                        {schoolTypes.map((typeVal) => <option key={typeVal} value={typeVal}>{t(schoolTypeLabels[typeVal] ?? typeVal)}</option>)}
                    </Select>
                    <Input label={t('schools.region')} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                    <Input label={t('schools.zone')} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
                    <Input label={t('schools.woreda')} value={form.woreda} onChange={(e) => setForm({ ...form, woreda: e.target.value })} />
                    <Input label={t('schools.city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    <Input label={t('schools.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    <Input label={t('schools.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <Input label={t('schools.principalName')} value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} />
                    <div className="sm:col-span-2">
                        <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('schools.academicYearStart')}</p>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                {t('schools.month')}:
                                <input type="number" min={1} max={12} value={form.academic_year_month}
                                    onChange={(e) => setForm({ ...form, academic_year_month: Number(e.target.value) })}
                                    className="w-16 rounded-lg border border-gray-300 dark:border-night-300 bg-white dark:bg-night-100 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500" />
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                {t('schools.day')}:
                                <input type="number" min={1} max={31} value={form.academic_year_day}
                                    onChange={(e) => setForm({ ...form, academic_year_day: Number(e.target.value) })}
                                    className="w-16 rounded-lg border border-gray-300 dark:border-night-300 bg-white dark:bg-night-100 px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-500" />
                            </label>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 sm:pt-6">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 dark:border-night-300 text-brand-600 focus:ring-brand-500" />
                        {t('common.active')}
                    </label>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={t('schools.deleteTitle')}
                message={t('schools.deleteMessage', { name: deleteTarget?.name ?? '' })}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />

            {/* Register Student Modal */}
            <Modal
                open={!!registerSchool}
                onClose={() => { setRegisterSchool(null); setRegResult(null); }}
                title={t('schools.registerStudent', { name: registerSchool?.name ?? '' })}
                size="lg"
                footer={
                    regResult ? (
                        <Button variant="primary" onClick={() => { setRegisterSchool(null); setRegResult(null); }}>Done</Button>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={() => { setRegisterSchool(null); setRegResult(null); }}>{t('common.cancel')}</Button>
                            <Button type="submit" form="register-student-form" loading={registering}>Register</Button>
                        </>
                    )
                }
            >
                {!regResult ? (
                    <form id="register-student-form" onSubmit={(e) => void handleRegisterStudent(e)} className="space-y-4">
                        <NameFields value={regName} onChange={setRegName} />
                        <Input
                            label={t('schools.studentId')}
                            value={regForm.student_id}
                            onChange={(e) => setRegForm({ ...regForm, student_id: e.target.value })}
                            placeholder={t('schools.studentIdPlaceholder')}
                        />
                        <Select label={t('schools.grade')} value={regForm.grade_id} onChange={(e) => setRegForm({ ...regForm, grade_id: e.target.value })} required>
                            <option value="">{t('schools.selectGrade')}</option>
                            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </Select>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('schools.registerInfo')}
                        </p>
                    </form>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                            <p className="text-sm font-semibold text-emerald-900">{t('schools.registerSuccess')}</p>
                            <p className="mt-1 text-xs text-emerald-700">{t('schools.shareCredentials')}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200 p-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('common.name')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{regResult.user.name}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schools.usernameEmail')}</span>
                                <code className="rounded bg-white dark:bg-night-100 px-2 py-0.5 text-sm font-semibold text-brand-700 border border-brand-200">{regResult.credentials.username}</code>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('common.password')}</span>
                                <code className="rounded bg-white dark:bg-night-100 px-2 py-0.5 text-sm font-semibold text-amber-700 border border-amber-200">{regResult.credentials.password}</code>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schools.grade')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{regResult.user.grade}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schools.academicYear')}</span>
                                <span className="font-medium text-gray-900 dark:text-white">{regResult.user.academic_year}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{t('schools.passwordWarning')}</p>
                    </div>
                )}
            </Modal>

            {/* Created School Admin Credentials Modal */}
            <Modal
                open={!!createdSchoolCredentials}
                onClose={() => setCreatedSchoolCredentials(null)}
                title={t('schools.adminCredentialsTitle')}
                size="md"
                footer={<Button variant="primary" onClick={() => setCreatedSchoolCredentials(null)}>Done</Button>}
            >
                {createdSchoolCredentials && (
                    <div className="space-y-4 py-2">
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                            <p className="text-sm font-semibold text-emerald-900">{t('schools.createdSuffix', { name: createdSchoolCredentials.schoolName })}</p>
                            <p className="mt-1 text-xs text-emerald-700">{t('schools.adminAutoCreated')}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200 p-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('schools.adminEmail')}</span>
                                <code className="rounded bg-white dark:bg-night-100 px-2 py-0.5 text-sm font-semibold text-brand-700 border border-brand-200">{createdSchoolCredentials.email}</code>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-400">{t('common.password')}</span>
                                <code className="rounded bg-white dark:bg-night-100 px-2 py-0.5 text-sm font-semibold text-amber-700 border border-amber-200">{createdSchoolCredentials.password}</code>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{t('schools.passwordWarningClose')}</p>
                    </div>
                )}
            </Modal>

            {/* View School Detail Modal */}
            <Modal
                open={!!viewingSchool || viewLoading}
                onClose={() => setViewingSchool(null)}
                title={viewingSchool ? viewingSchool.name : 'Loading…'}
                size="lg"
                footer={<Button variant="secondary" onClick={() => setViewingSchool(null)}>Close</Button>}
            >
                {viewLoading && (
                    <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('schools.loadingDetails')}</div>
                )}
                {viewingSchool && (
                    <div className="space-y-5 py-2">
                        {/* Status banner */}
                        <div className={`rounded-xl border p-4 ${viewingSchool.is_active ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200'}`}>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${viewingSchool.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                <span className={`text-sm font-semibold ${viewingSchool.is_active ? 'text-emerald-800' : 'text-gray-600 dark:text-gray-300'}`}>
                                    {viewingSchool.is_active ? t('schools.activeSchool') : t('common.inactive')}
                                </span>
                            </div>
                        </div>

                        {/* School details */}
                        <div className="rounded-xl border border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200 p-4 space-y-2.5">
                            <DetailRow label={t('common.name')} value={viewingSchool.name} />
                            <DetailRow label={t('common.code')} value={viewingSchool.code || t('common.dash')} />
                            <DetailRow label={t('common.type')} value={viewingSchool.type ? t(schoolTypeLabels[viewingSchool.type] ?? viewingSchool.type) : t('common.unspecified')} />
                            <DetailRow label={t('schools.principal')} value={viewingSchool.principal_name || t('common.dash')} />
                            <DetailRow label={t('schools.region')} value={viewingSchool.region || t('common.dash')} />
                            <DetailRow label={t('schools.zone')} value={viewingSchool.zone || t('common.dash')} />
                            <DetailRow label={t('schools.woreda')} value={viewingSchool.woreda || t('common.dash')} />
                            <DetailRow label={t('schools.city')} value={viewingSchool.city || t('common.dash')} />
                            <DetailRow label={t('schools.address')} value={viewingSchool.address || t('common.dash')} />
                            <DetailRow label={t('schools.phone')} value={viewingSchool.phone || t('common.dash')} />
                            <DetailRow label={t('common.email')} value={viewingSchool.email || t('common.dash')} />
                        </div>

                        {/* Academic year */}
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">{t('schools.academicYearStart')}</p>
                            <p className="text-sm font-medium text-blue-900">
                                {t(monthKeys[(viewingSchool.academic_year_month ?? 9) - 1])} {viewingSchool.academic_year_day ?? 11}
                            </p>
                        </div>

                        {/* School admin account */}
                        {viewingSchool.admin_email && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">{t('schools.adminAccount')}</p>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-amber-800">{t('schools.username')}</span>
                                    <code className="rounded bg-white px-2 py-0.5 text-sm font-semibold text-amber-900 border border-amber-200">{viewingSchool.admin_email}</code>
                                </div>
                                <p className="mt-2 text-xs text-amber-600">{t('schools.passwordResetNote')}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{value}</span>
        </div>
    );
}
