import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import ProgressView from '../components/ProgressView';
import { Card, CardBody, PageHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import type { ProgressReport } from '../types';

export default function MyProgress() {
    const { t } = useLanguage();
    const [report, setReport] = useState<ProgressReport | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<{ progress: ProgressReport }>('/student/progress');
            setReport(data.progress);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    if (loading) {
        return (
            <div>
                <PageHeader title={t('progress.title')} description={t('progress.description')} />
                <Card><CardBody><div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('progress.loading')}</div></CardBody></Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={t('progress.title')} description={t('progress.description')} />
            <ProgressView report={report} emptyTitle={t('progress.empty')} />
        </div>
    );
}
