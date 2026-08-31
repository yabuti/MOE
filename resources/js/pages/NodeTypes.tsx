import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Table } from '../components/ui';
import type { NodeType } from '../types';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface NodeTypeItem extends NodeType {}

const emptyForm = { name: '', slug: '', label: '', parent_type_id: '', sort_order: 0, is_active: true };

export default function NodeTypes() {
    const { hasPermission } = useAuth();
    const [nodeTypes, setNodeTypes] = useState<NodeTypeItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<NodeTypeItem | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<NodeTypeItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<{ node_types: NodeTypeItem[] }>('/node-types');
            setNodeTypes(data.node_types);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                slug: form.slug,
                label: form.label || null,
                parent_type_id: form.parent_type_id ? Number(form.parent_type_id) : null,
                sort_order: Number(form.sort_order) || 0,
                is_active: Boolean(form.is_active),
            };
            if (editing) {
                await api.put(`/node-types/${editing.id}`, payload);
                toast.success('Node type updated');
            } else {
                await api.post('/node-types', payload);
                toast.success('Node type created');
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
            await api.delete(`/node-types/${deleteTarget.id}`);
            toast.success('Node type deleted');
            setDeleteTarget(null);
            void load();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canCreate = hasPermission('create node types');
    const canEdit = hasPermission('edit node types');
    const canDelete = hasPermission('delete node types');

    return (
        <div>
            <PageHeader
                title="Node Types"
                description="Configure the academic structure node types"
                actions={
                    canCreate && (
                        <Button onClick={() => { setEditing(null); setForm(emptyForm); setModalOpen(true); }}>
                            <PlusIcon className="h-5 w-5" /> New Node Type
                        </Button>
                    )
                }
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500">Loading node types…</div></CardBody>
                ) : nodeTypes.length === 0 ? (
                    <CardBody><EmptyState title="No node types found" /></CardBody>
                ) : (
                    <Table headers={['Name', 'Slug', 'Label', 'Parent', 'Order', 'Nodes', 'Status', 'Actions']}>
                        {nodeTypes.map((nt) => (
                            <tr key={nt.id}>
                                <td className="px-5 py-3 font-medium text-gray-900">{nt.name}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{nt.slug}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{nt.label || '—'}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">
                                    {nodeTypes.find((p) => p.id === nt.parent_type_id)?.name ?? '—'}
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-600">{nt.sort_order ?? 0}</td>
                                <td className="px-5 py-3 text-sm text-gray-600">{nt.nodes_count ?? 0}</td>
                                <td className="px-5 py-3">
                                    <Badge variant={nt.is_active ? 'green' : 'gray'}>{nt.is_active ? 'Active' : 'Inactive'}</Badge>
                                </td>
                                <td className="whitespace-nowrap px-5 py-3">
                                    <div className="flex items-center gap-1">
                                        {canEdit && (
                                            <Button
                                                variant="ghost" className="px-2 py-1"
                                                onClick={() => {
                                                    setEditing(nt);
                                                    setForm({
                                                        name: nt.name, slug: nt.slug, label: nt.label ?? '',
                                                        parent_type_id: nt.parent_type_id ? String(nt.parent_type_id) : '',
                                                        sort_order: nt.sort_order ?? 0, is_active: Boolean(nt.is_active),
                                                    });
                                                    setModalOpen(true);
                                                }}
                                            >
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete && (nt.nodes_count ?? 0) === 0 && (
                                            <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(nt)}>
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Node Type' : 'New Node Type'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="nt-form" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
                    </>
                }
            >
                <form id="nt-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
                    <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                    <Select label="Parent type" value={form.parent_type_id} onChange={(e) => setForm({ ...form, parent_type_id: e.target.value })}>
                        <option value="">No parent</option>
                        {nodeTypes.filter((n) => n.id !== editing?.id).map((n) => (
                            <option key={n.id} value={n.id}>{n.name}</option>
                        ))}
                    </Select>
                    <Input label="Sort order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                    <label className="flex items-center gap-2 text-sm text-gray-700 sm:pt-6">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                        Active
                    </label>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete node type"
                message={`Are you sure you want to delete the "${deleteTarget?.name}" node type?`}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
