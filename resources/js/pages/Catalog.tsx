import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Textarea, statusVariant } from '../components/ui';
import type { CatalogNode, NodeType } from '../types';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface TreeItem {
    id: number;
    catalog_node_type_id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    description?: string;
    sort_order?: number;
    status: string;
    is_locked?: boolean;
    type: string | null;
    children: TreeItem[];
}

const emptyForm = {
    name: '',
    slug: '',
    catalog_node_type_id: '',
    parent_id: '',
    description: '',
    sort_order: 0,
    status: 'draft',
    is_locked: false,
};

export default function Catalog() {
    const { hasPermission } = useAuth();
    const [tree, setTree] = useState<TreeItem[]>([]);
    const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<CatalogNode | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<TreeItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: treeData }, { data: typesData }] = await Promise.all([
                api.get<{ tree: TreeItem[] }>('/catalog/tree'),
                api.get<{ node_types: NodeType[] }>('/node-types'),
            ]);
            setTree(treeData.tree);
            setNodeTypes(typesData.node_types);
            const ids = new Set<number>();
            const collect = (nodes: TreeItem[]) => {
                nodes.forEach((n) => {
                    if (n.children.length > 0) ids.add(n.id);
                    collect(n.children);
                });
            };
            collect(treeData.tree);
            setExpanded(ids);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const toggle = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const openCreate = (parentId: number | null) => {
        setEditing(null);
        setForm({ ...emptyForm, parent_id: parentId ? String(parentId) : '' });
        setModalOpen(true);
    };

    const openEdit = (node: TreeItem) => {
        setEditing(node as unknown as CatalogNode);
        setForm({
            name: node.name,
            slug: node.slug,
            catalog_node_type_id: String(node.catalog_node_type_id),
            parent_id: node.parent_id ? String(node.parent_id) : '',
            description: node.description ?? '',
            sort_order: node.sort_order ?? 0,
            status: node.status ?? 'draft',
            is_locked: Boolean(node.is_locked),
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                slug: form.slug || null,
                catalog_node_type_id: Number(form.catalog_node_type_id),
                parent_id: form.parent_id ? Number(form.parent_id) : null,
                description: form.description || null,
                sort_order: Number(form.sort_order) || 0,
                status: form.status,
                is_locked: Boolean(form.is_locked),
            };
            if (editing) {
                await api.put(`/catalog/${editing.id}`, payload);
                toast.success('Node updated');
            } else {
                await api.post('/catalog', payload);
                toast.success('Node created');
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
            await api.delete(`/catalog/${deleteTarget.id}`);
            toast.success('Node deleted');
            setDeleteTarget(null);
            void load();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canCreate = hasPermission('create catalog');
    const canEdit = hasPermission('edit catalog');
    const canDelete = hasPermission('delete catalog');

    const typeName = (id: number) => nodeTypes.find((t) => t.id === id)?.name ?? id;

    const flatten = (nodes: TreeItem[], depth = 0): { node: TreeItem; depth: number }[] =>
        nodes.flatMap((n) => [{ node: n, depth }, ...flatten(n.children, depth + 1)]);
    const flatNodes = flatten(tree);

    const renderNode = (node: TreeItem, depth: number) => {
        const isExpanded = expanded.has(node.id);
        const hasChildren = node.children.length > 0;
        return (
            <div key={node.id}>
                <div
                    className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                    style={{ paddingLeft: `${depth * 24 + 12}px` }}
                >
                    {hasChildren ? (
                        <button onClick={() => toggle(node.id)} className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                        </button>
                    ) : (
                        <span className="w-4" />
                    )}
                    <FolderIcon className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="font-medium text-gray-900">{node.name}</span>
                    {node.type && <Badge variant="blue">{typeName(node.catalog_node_type_id)}</Badge>}
                    <Badge variant={statusVariant(node.status)}>{node.status}</Badge>
                    {node.is_locked && <Badge variant="yellow">locked</Badge>}
                    <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {canCreate && (
                            <Button variant="ghost" className="px-2 py-1" title="Add child" onClick={() => openCreate(node.id)}>
                                <PlusIcon className="h-4 w-4" />
                            </Button>
                        )}
                        {hasPermission('view content') && (
                            <Link to={`/content/${node.id}`} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Manage content">
                                <DocumentTextIcon className="h-4 w-4" />
                            </Link>
                        )}
                        {canEdit && (
                            <Button variant="ghost" className="px-2 py-1" onClick={() => openEdit(node)}>
                                <PencilSquareIcon className="h-4 w-4" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(node)}>
                                <TrashIcon className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                {hasChildren && isExpanded && <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>}
            </div>
        );
    };

    return (
        <div>
            <PageHeader
                title="Catalog Structure"
                description="Manage the academic content tree"
                actions={canCreate && (
                    <Button onClick={() => openCreate(null)}>
                        <PlusIcon className="h-5 w-5" /> New Root Node
                    </Button>
                )}
            />

            <Card>
                <CardBody>
                    {loading ? (
                        <div className="py-10 text-center text-sm text-gray-500">Loading catalog…</div>
                    ) : tree.length === 0 ? (
                        <EmptyState title="No catalog nodes yet" description="Create a root node to begin building your structure." />
                    ) : (
                        <div className="divide-y divide-gray-50">{tree.map((node) => renderNode(node, 0))}</div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Node' : 'New Node'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="catalog-form" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
                    </>
                }
            >
                <form id="catalog-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Leave blank to auto-generate" />
                    <Select label="Node type" value={form.catalog_node_type_id} onChange={(e) => setForm({ ...form, catalog_node_type_id: e.target.value })} required>
                        <option value="">Select type…</option>
                        {nodeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                    <Select label="Parent node" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                        <option value="">No parent (root)</option>
                        {flatNodes.filter((f) => f.node.id !== editing?.id).map((f) => (
                            <option key={f.node.id} value={f.node.id}>
                                {'\u00A0'.repeat(f.depth * 2)}{f.node.name}
                            </option>
                        ))}
                    </Select>
                    <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </Select>
                    <Input label="Sort order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                    <div className="sm:col-span-2">
                        <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 sm:pt-6">
                        <input type="checkbox" checked={form.is_locked} onChange={(e) => setForm({ ...form, is_locked: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                        Locked
                    </label>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete node"
                message={`Deleting "${deleteTarget?.name}" will also delete all its children and associated content. Continue?`}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
