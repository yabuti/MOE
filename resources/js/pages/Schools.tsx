import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Table } from '../components/ui';
import type { School } from '../types';
import { MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface SchoolItem extends School {}

const schoolTypes = ['primary', 'secondary', 'high_school', 'preparatory', 'college', 'university'];

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
    is_active: true,
};

export default function Schools() {
    const { hasPermission } = useAuth();
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, type: form.type || null, is_active: Boolean(form.is_active) };
            if (editing) {
                await api.put(`/schools/${editing.id}`, payload);
                toast.success('School updated');
            } else {
                await api.post('/schools', payload);
                toast.success('School created');
            }
            setModalOpen(false);
            void loadSchools(editing ? page : 1);
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
            toast.success('School deleted');
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

    return (
        <div>
            <PageHeader
                title="Schools"
                description="Manage school records"
                actions={
                    canCreate && (
                        <Button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}>
                            <PlusIcon className="h-5 w-5" /> New School
                        </Button>
                    )
                }
            />

            <Card>
                <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void loadSchools(1, search); }}
                            placeholder="Search by name or code…"
                            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                    <Button variant="secondary" onClick={() => void loadSchools(1, search)}>Search</Button>
                </div>

                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500">Loading schools…</div></CardBody>
                ) : schools.length === 0 ? (
                    <CardBody><EmptyState title="No schools found" /></CardBody>
                ) : (
                    <>
                        <Table headers={['Name', 'Code', 'Type', 'Location', 'Status', 'Actions']}>
                            {schools.map((school) => (
                                <tr key={school.id}>
                                    <td className="px-5 py-3">
                                        <span className="font-medium text-gray-900">{school.name}</span>
                                        {school.principal_name && <p className="text-xs text-gray-500">Principal: {school.principal_name}</p>}
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{school.code || '—'}</td>
                                    <td className="px-5 py-3">
                                        <Badge variant="blue">{school.type || 'unspecified'}</Badge>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">
                                        {[school.region, school.city].filter(Boolean).join(', ') || '—'}
                                    </td>
                                    <td className="px-5 py-3">
                                        <Badge variant={school.is_active ? 'green' : 'gray'}>{school.is_active ? 'Active' : 'Inactive'}</Badge>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-1">
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
                                                            is_active: Boolean(school.is_active),
                                                        });
                                                        setModalOpen(true);
                                                    }}
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(school)}>
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
                title={editing ? 'Edit School' : 'New School'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="school-form" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
                    </>
                }
            >
                <form id="school-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        <option value="">Select type…</option>
                        {schoolTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </Select>
                    <Input label="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                    <Input label="Zone" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
                    <Input label="Woreda" value={form.woreda} onChange={(e) => setForm({ ...form, woreda: e.target.value })} />
                    <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <Input label="Principal name" value={form.principal_name} onChange={(e) => setForm({ ...form, principal_name: e.target.value })} />
                    <label className="flex items-center gap-2 text-sm text-gray-700 sm:pt-6">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                        Active
                    </label>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete school"
                message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
