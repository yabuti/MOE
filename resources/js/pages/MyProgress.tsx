import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import ProgressView from '../components/ProgressView';
import { Card, CardBody, PageHeader } from '../components/ui';
import type { ProgressReport } from '../types';

export default function MyProgress() {
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
                <PageHeader title="My Progress" description="Your reading and exam performance" />
                <Card><CardBody><div className="py-16 text-center text-sm text-gray-500">Loading progress…</div></CardBody></Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader title="My Progress" description="Your reading and exam performance" />
            <ProgressView report={report} emptyTitle="You haven't started reading any books yet." />
        </div>
    );
}