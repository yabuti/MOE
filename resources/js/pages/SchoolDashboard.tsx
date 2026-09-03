import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge, Button, Card, CardBody, Select } from '../components/ui';
import { AcademicCapIcon, BuildingOfficeIcon, CheckCircleIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SchoolSelectItem {
    id: number;
    name: string;
    code?: string | null;
}

interface SchoolData {
    id: number;
    name: string;
    code: string;
    academic_year_month?: number | null;
    academic_year_day?: number | null;
}

interface DashboardData {
    school: SchoolData;
    counts: {
        total_students: number;
        active_enrollments: number;
        total_enrollments: number;
        passed: number;
        failed: number;
    };
    grade_breakdown: Record<string, number>;
    recent_enrollments: Array<{
        id: number;
        user: { id: number; name: string; email: string };
        grade: { id: number; name: string };
        academic_year: string;
        status: string;
    }>;
}

const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SchoolDashboard() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [month, setMonth] = useState(9);
    const [day, setDay] = useState(11);
    const [saving, setSaving] = useState(false);

    const isSchoolStaff = Boolean(user?.school_id);
    const [schoolList, setSchoolList] = useState<SchoolSelectItem[]>([]);
    const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(user?.school_id ?? null);

    useEffect(() => {
        if (user?.school_id != null) {
            setSelectedSchoolId(user.school_id);
        }
    }, [user?.school_id]);

    useEffect(() => {
        if (isSchoolStaff) return;
        api.get<{ schools: SchoolSelectItem[] }>('/schools', { params: { page: 1 } })
            .then(({ data }) => {
                setSchoolList(data.schools);
                if (!selectedSchoolId && data.schools[0]) {
                    setSelectedSchoolId(data.schools[0].id);
                }
            })
            .catch(() => {});
    }, [isSchoolStaff]);

    const loadDashboard = useCallback(async () => {
        if (!selectedSchoolId) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const params: Record<string, string | number> = {};
            if (selectedSchoolId) params.school_id = selectedSchoolId;
            const { data: resp } = await api.get<DashboardData>('/school/dashboard', { params });
            setData(resp);
            setMonth(resp.school.academic_year_month ?? 9);
            setDay(resp.school.academic_year_day ?? 11);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [selectedSchoolId]);

    useEffect(() => { void loadDashboard(); }, [loadDashboard]);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const params: Record<string, string | number> = {};
            if (selectedSchoolId) params.school_id = selectedSchoolId;
            await api.put('/school/settings', {
                academic_year_month: month,
                academic_year_day: day,
            }, { params });
            toast.success('School settings updated');
            setSettingsOpen(false);
            void loadDashboard();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('schoolDashboard.loading')}</div>;
    }

    if (!data) {
        return (
            <div className="space-y-6">
                {!isSchoolStaff && (
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
                        <span className="text-sm font-semibold text-brand-900">{t('schoolDashboard.selectSchool')}</span>
                        <Select
                            value={selectedSchoolId ?? ''}
                            onChange={(e) => { setSelectedSchoolId(Number(e.target.value) || null); }}
                            className="min-w-0 max-w-xs"
                        >
                            <option value="">{t('schoolDashboard.selectSchool')}</option>
                            {schoolList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>
                )}
                <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('schoolDashboard.noSchool')}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!isSchoolStaff && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
                    <span className="text-sm font-semibold text-brand-900">{t('schoolDashboard.selectSchool')}</span>
                    <Select
                        value={selectedSchoolId ?? ''}
                        onChange={(e) => { setSelectedSchoolId(Number(e.target.value) || null); }}
                        className="min-w-0 max-w-xs"
                    >
                        <option value="">{t('schoolDashboard.selectSchool')}</option>
                        {schoolList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                </div>
            )}

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8">
                <div className="relative z-10">
                    <p className="text-sm font-medium text-blue-100">{t('schoolDashboard.title')}</p>
                    <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{data.school.name}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-blue-100">
                        {t('schoolDashboard.description')}
                    </p>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={<UserGroupIcon className="h-6 w-6 text-blue-600" />}
                    label={t('schoolDashboard.totalStudents')}
                    value={data.counts.total_students}
                    color="blue"
                />
                <StatCard
                    icon={<AcademicCapIcon className="h-6 w-6 text-emerald-600" />}
                    label={t('schoolDashboard.activeStudents')}
                    value={data.counts.active_enrollments}
                    color="emerald"
                />
                <StatCard
                    icon={<CheckCircleIcon className="h-6 w-6 text-purple-600" />}
                    label={t('schoolDashboard.totalBooks')}
                    value={data.counts.passed}
                    color="purple"
                />
                <StatCard
                    icon={<BuildingOfficeIcon className="h-6 w-6 text-amber-600" />}
                    label={t('schoolDashboard.grades')}
                    value={data.counts.failed}
                    color="amber"
                />
            </div>

            <Card>
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-night-300 px-5 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('schoolDashboard.recentActivity')}</h3>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                            {monthNames[data.school.academic_year_month ?? 9]} {data.school.academic_year_day ?? 11}
                        </p>
                    </div>
                    <Button variant="secondary" onClick={() => setSettingsOpen(!settingsOpen)}>
                        {settingsOpen ? <><XMarkIcon className="h-4 w-4" /> {t('common.dash')}</> : t('schoolDashboard.recentActivity')}
                    </Button>
                </div>
                {settingsOpen && (
                    <CardBody>
                        <div className="flex items-end gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">{t('schoolDashboard.grades')}</label>
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value))}
                                    className="rounded-xl border border-gray-300 dark:border-night-300 bg-white dark:bg-night-100 px-4 py-2.5 text-sm dark:text-white focus:border-brand-600 focus:ring-4 focus:ring-brand-500/15"
                                >
                                    {monthNames.slice(1).map((m, i) => (
                                        <option key={i + 1} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">{t('schoolDashboard.grades')}</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={day}
                                    onChange={(e) => setDay(Number(e.target.value))}
                                    className="w-20 rounded-xl border border-gray-300 dark:border-night-300 bg-white dark:bg-night-100 px-4 py-2.5 text-sm dark:text-white focus:border-brand-600 focus:ring-4 focus:ring-brand-500/15"
                                />
                            </div>
                            <Button onClick={handleSaveSettings} loading={saving}>{t('common.save')}</Button>
                        </div>
                        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                            {t('schoolDashboard.noActivity')}
                        </p>
                    </CardBody>
                )}
            </Card>

            {Object.keys(data.grade_breakdown).length > 0 && (
                <Card>
                    <div className="border-b border-gray-200 dark:border-night-300 px-5 py-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('schoolDashboard.grades')}</h3>
                    </div>
                    <CardBody>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {Object.entries(data.grade_breakdown).map(([grade, count]) => (
                                <div key={grade} className="rounded-xl border border-gray-200 dark:border-night-300 bg-gray-50 dark:bg-night-200 p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{grade}</p>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            )}

            {data.recent_enrollments.length > 0 && (
                <Card>
                    <div className="border-b border-gray-200 dark:border-night-300 px-5 py-4">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('schoolDashboard.recentActivity')}</h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-night-300">
                        {data.recent_enrollments.map((enrollment) => (
                            <div key={enrollment.id} className="flex items-center justify-between px-5 py-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{enrollment.user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{enrollment.user.email}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{enrollment.grade.name}</p>
                                    <Badge variant={enrollment.status === 'active' ? 'green' : enrollment.status === 'passed' ? 'blue' : 'gray'}>
                                        {enrollment.status} · {enrollment.academic_year}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 border-blue-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        purple: 'bg-purple-50 border-purple-200',
        amber: 'bg-amber-50 border-amber-200',
    };
    return (
        <div className={`rounded-xl border p-5 ${colorMap[color] || 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
                <div className="rounded-xl bg-white dark:bg-night-100 p-3 shadow-sm">{icon}</div>
            </div>
        </div>
    );
}
