import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { Badge, Card, CardBody, EmptyState, PageHeader, Pagination, Table } from '../components/ui';
import type { AuditLog } from '../types';

interface LogItem extends AuditLog {}

export default function AuditLogs() {
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState('');

    const eventOptions = [
        'created', 'updated', 'deleted', 'restored', 'login', 'logout', 'permission-changed', 'uploaded', 'published', 'archived',
    ];

    const load = useCallback(async (p: number, evt?: string) => {
        setLoading(true);
        try {
            const { data } = await api.get<{ audit_logs: LogItem[]; current_page: number; last_page: number; total: number }>('/audit-logs', {
                params: { page: p, event: evt || undefined },
            });
            setLogs(data.audit_logs);
            setPage(data.current_page);
            setLastPage(data.last_page);
            setTotal(data.total);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(1); }, [load]);

    return (
        <div>
            <PageHeader title="Audit Logs" description="Track changes across the platform" />

            <Card>
                <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
                    <select
                        value={event}
                        onChange={(e) => {
                            setEvent(e.target.value);
                            void load(1, e.target.value);
                        }}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">All events</option>
                        {eventOptions.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>

                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500">Loading logs…</div></CardBody>
                ) : logs.length === 0 ? (
                    <CardBody><EmptyState title="No audit logs found" /></CardBody>
                ) : (
                    <>
                        <Table headers={['Event', 'User', 'Resource', 'IP', 'When']}>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-5 py-3">
                                        <Badge variant={eventBadgeVariant(log.event)}>{log.event}</Badge>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-800">{log.user?.name ?? 'System'}</td>
                                    <td className="px-5 py-3 text-sm text-gray-600">
                                        <span className="block truncate">{log.auditable_type ? log.auditable_type.split('\\').pop() : '—'}</span>
                                        {log.auditable_id && <span className="text-xs text-gray-400">#{log.auditable_id}</span>}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{log.ip_address ?? '—'}</td>
                                    <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-500">
                                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </Table>
                        <Pagination page={page} lastPage={lastPage} total={total} onPage={(p) => void load(p, event)} />
                    </>
                )}
            </Card>
        </div>
    );
}

function eventBadgeVariant(event: string): 'green' | 'red' | 'yellow' | 'blue' | 'gray' {
    switch (event) {
        case 'created':
        case 'published':
            return 'green';
        case 'deleted':
            return 'red';
        case 'updated':
        case 'restored':
            return 'blue';
        case 'login':
        case 'permission-changed':
            return 'yellow';
        default:
            return 'gray';
    }
}
