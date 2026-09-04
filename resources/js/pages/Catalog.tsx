import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
    const { t } = useLanguage();
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
            // Start fully collapsed: only categories (and everything else) are
            // hidden until the user clicks to expand them.
            setExpanded(new Set());
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
                toast.success(t('catalog.updated'));
            } else {
                await api.post('/catalog', payload);
                toast.success(t('catalog.created'));
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
            toast.success(t('catalog.deleted'));
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

    const typeName = (id: number) => nodeTypes.find((ty) => ty.id === id)?.name ?? id;

    const flatten = (nodes: TreeItem[], depth = 0): { node: TreeItem; depth: number }[] =>
        nodes.flatMap((n) => [{ node: n, depth }, ...flatten(n.children, depth + 1)]);
    const flatNodes = flatten(tree);

    const renderNode = (node: TreeItem, depth: number) => {
        const isExpanded = expanded.has(node.id);
        const hasChildren = node.children.length > 0;
        return (
            <div key={node.id}>
                <div
                    className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-night-200"
                    style={{ paddingLeft: `${depth * 24 + 12}px` }}
                >
                    {hasChildren ? (
                        <button onClick={() => toggle(node.id)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                            {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                        </button>
                    ) : (
                        <span className="w-4" />
                    )}
                    <FolderIcon className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="font-medium text-gray-900 dark:text-white">{node.name}</span>
                    {node.type && <Badge variant="blue">{typeName(node.catalog_node_type_id)}</Badge>}
                    <Badge variant={statusVariant(node.status)}>{node.status}</Badge>
                    {node.is_locked && <Badge variant="yellow">{t('catalog.locked')}</Badge>}
                    {hasChildren && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            ({node.children.length} {node.type === 'category' ? t('catalog.grades') : node.type === 'grade' ? t('catalog.books') : t('catalog.chapters')})
                        </span>
                    )}
                    <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {canCreate && (
                            <Button variant="ghost" className="px-2 py-1" title={t('catalog.addChild')} onClick={() => openCreate(node.id)}>
                                <PlusIcon className="h-4 w-4" />
                            </Button>
                        )}
                        {hasPermission('view content') && (
                            <Link to={`/content/${node.id}`} className="rounded-md p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-night-200 hover:text-gray-600 dark:hover:text-gray-300" title={t('catalog.manageContent')}>
                                <DocumentTextIcon className="h-4 w-4" />
                            </Link>
                        )}
                        {canEdit && (
                            <Button variant="ghost" className="px-2 py-1" onClick={() => openEdit(node)}>
                                <PencilSquareIcon className="h-4 w-4" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteTarget(node)}>
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
                title={t('catalog.title')}
                description={t('catalog.description')}
                actions={canCreate && (
                    <Button onClick={() => openCreate(null)}>
                        <PlusIcon className="h-5 w-5" /> {t('catalog.newRootNode')}
                    </Button>
                )}
            />

            <Card>
                <CardBody>
                    {loading ? (
                        <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('catalog.loading')}</div>
                    ) : tree.length === 0 ? (
                        <EmptyState title={t('catalog.noNodes')} description={t('catalog.createRootHint')} />
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-night-300">{tree.map((node) => renderNode(node, 0))}</div>
                    )}
                </CardBody>
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t('catalog.editNode') : t('catalog.newNode')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit" form="catalog-form" loading={saving}>{editing ? t('common.save') : t('common.create')}</Button>
                    </>
                }
            >
                <form id="catalog-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label={t('common.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <Input label={t('nodeTypes.slug')} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={t('catalog.leaveBlank')} />
                    <Select label={t('catalog.nodeType')} value={form.catalog_node_type_id} onChange={(e) => setForm({ ...form, catalog_node_type_id: e.target.value })} required>
                        <option value="">{t('catalog.selectType')}</option>
                        {nodeTypes.map((ty) => <option key={ty.id} value={ty.id}>{ty.name}</option>)}
                    </Select>
                    <Select label={t('catalog.parentNode')} value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                        <option value="">{t('catalog.noParentRoot')}</option>
                        {flatNodes.filter((f) => f.node.id !== editing?.id).map((f) => (
                            <option key={f.node.id} value={f.node.id}>
                                {'\u00A0'.repeat(f.depth * 2)}{f.node.name}
                            </option>
                        ))}
                    </Select>
                    <Select label={t('common.status')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="draft">{t('common.draft')}</option>
                        <option value="published">{t('common.published')}</option>
                        <option value="archived">{t('common.archived')}</option>
                    </Select>
                    <Input label={t('common.order')} type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                    <div className="sm:col-span-2">
                        <Textarea label={t('common.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 sm:pt-6">
                        <input type="checkbox" checked={form.is_locked} onChange={(e) => setForm({ ...form, is_locked: e.target.checked })} className="h-4 w-4 rounded border-gray-300 dark:border-night-300 text-brand-600 focus:ring-brand-500" />
                        {t('catalog.lockedLabel')}
                    </label>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={t('catalog.deleteTitle')}
                message={t('catalog.deleteMessage', { name: deleteTarget?.name ?? '' })}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
