import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Textarea } from '../components/ui';
import type { ContentBlock, Media } from '../types';
import { ArrowDownIcon, ArrowLeftIcon, ArrowUpIcon, LinkIcon, PencilSquareIcon, PhotoIcon, PlusIcon, TrashIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

interface ContentItem extends ContentBlock {
    media?: Media | null;
}

const blockTypes = ['text', 'image', 'video', 'audio', 'pdf'];

const emptyForm: ContentItem = { id: 0, catalog_node_id: 0, type: 'text', title: '', content: '', media_id: undefined, position: 0, is_active: true, media: null };

interface TreeNode {
    id: number;
    name: string;
    type: string | null;
    children: TreeNode[];
}

function resolveMediaUrl(block: ContentItem, base: string): string | null {
    if (block?.data && typeof block.data === 'object' && 'url' in block.data && (block.data as { url?: string }).url) {
        return (block.data as { url: string }).url;
    }
    if (block?.media?.url) return block.media.url;
    if (block?.media?.file_name && base) return `${base}${block.media.file_name}`;
    return null;
}

export default function Content() {
    const { nodeId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { t } = useLanguage();

    const [nodeName, setNodeName] = useState('');
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [blocks, setBlocks] = useState<ContentItem[]>([]);
    const [media, setMedia] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);

    const [categoryId, setCategoryId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [bookId, setBookId] = useState('');
    const [chapterId, setChapterId] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ContentItem | null>(null);
    const [form, setForm] = useState<ContentItem>(emptyForm);
    const [mediaUrl, setMediaUrl] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const insertIndexRef = useRef<number | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const allNodes = useMemo(() => {
        const out: TreeNode[] = [];
        const walk = (nodes: TreeNode[]) => nodes.forEach((n) => { out.push(n); walk(n.children); });
        walk(tree);
        return out;
    }, [tree]);

    const loadBlocks = useCallback(
        async (id: number) => {
            setLoading(true);
            try {
                const [{ data: blockData }, { data: nodeData }, mediaRes] = await Promise.all([
                    api.get<{ content_blocks: ContentItem[] }>(`/nodes/${id}/content`),
                    api.get<{ node: { name: string } }>(`/catalog/${id}`),
                    api.get<{ media: Media[] }>('/media'),
                ]);
                const sorted = [...(blockData.content_blocks ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                setBlocks(sorted);
                setNodeName(nodeData.node.name);
                setMedia(mediaRes.data.media);
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        if (nodeId) {
            void loadBlocks(Number(nodeId));
        } else {
            setLoading(true);
            api.get<{ tree: TreeNode[] }>('/catalog/tree')
                .then(({ data }) => setTree(data.tree))
                .catch((err) => toast.error(getErrorMessage(err)))
                .finally(() => setLoading(false));
        }
    }, [nodeId, loadBlocks]);

    const renumber = async (id: number, insertId?: number, insertIndex?: number) => {
        const sorted = [...blocks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const orderedIds = sorted.map((b) => b.id);
        if (insertId != null && insertIndex != null) {
            orderedIds.splice(Math.max(0, Math.min(insertIndex, orderedIds.length)), 0, insertId);
        }
        const items = orderedIds.map((blockId, i) => ({ id: blockId, position: i }));
        try {
            await api.post('/content/reorder', { items });
            await loadBlocks(id);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const openCreate = () => {
        setEditing(null);
        insertIndexRef.current = blocks.length;
        setForm({ ...emptyForm, position: blocks.length });
        setMediaUrl('');
        setUploadFile(null);
        setModalOpen(true);
    };

    const openCreateAtPosition = (index: number) => {
        setEditing(null);
        insertIndexRef.current = index;
        setForm({ ...emptyForm, position: index });
        setMediaUrl('');
        setUploadFile(null);
        setModalOpen(true);
    };

    const openEdit = (block: ContentItem) => {
        setEditing(block);
        const dataUrl =
            block?.data && typeof block.data === 'object' && 'url' in block.data
                ? String((block.data as { url?: string }).url ?? '')
                : '';
        setForm({ ...block });
        setMediaUrl(dataUrl);
        setUploadFile(null);
        setModalOpen(true);
    };

    const handleUpload = async (): Promise<number | null> => {
        if (!uploadFile) return null;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('collection', 'content');
            const { data } = await api.post<{ media: Media }>('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return data.media.id;
        } catch (err) {
            toast.error(getErrorMessage(err));
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        if (!nodeId) return;
        e.preventDefault();
        setSaving(true);
        try {
            const position = Number(form.position) || 0;
            let mediaId = form.media_id ? Number(form.media_id) : undefined;
            let data: Record<string, unknown> = {};
            if (form.data && typeof form.data === 'object') data = { ...(form.data as Record<string, unknown>) };

            if (mediaUrl.trim()) {
                data.url = mediaUrl.trim();
                data.media_source = 'url';
            } else {
                delete data.url;
                delete data.media_source;
            }

            if (uploadFile) {
                const newId = await handleUpload();
                if (newId) mediaId = newId;
            }

            const choice = form.media_id ? Number(form.media_id) : 0;
            const selectedId = mediaId && mediaId > 0 ? mediaId : (choice > 0 ? choice : undefined);

            const payload = {
                type: form.type,
                title: form.title || null,
                content: form.type === 'text' ? form.content || null : null,
                data,
                media_id: selectedId ?? null,
                position,
                is_active: Boolean(form.is_active),
            };

            if (editing) {
                await api.put(`/content/${editing.id}`, payload);
                toast.success(t('content.updated'));
                setModalOpen(false);
                await renumber(Number(nodeId));
            } else {
                const { data: created } = await api.post<{ content_block: ContentItem }>(`/nodes/${nodeId}/content`, payload);
                toast.success(t('content.created'));
                setModalOpen(false);
                const insertIndex = insertIndexRef.current;
                insertIndexRef.current = null;
                await renumber(Number(nodeId), created.content_block?.id, insertIndex ?? undefined);
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
            await api.delete(`/content/${deleteTarget.id}`);
            toast.success(t('content.deleted'));
            setDeleteTarget(null);
            if (nodeId) await renumber(Number(nodeId));
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canCreate = hasPermission('create content');
    const canEdit = hasPermission('edit content');
    const canDelete = hasPermission('delete content');

    if (!nodeId) {
        const categories = allNodes.filter((n) => n.type === 'category');
        const selectedCategory = categories.find((c) => c.id === Number(categoryId));
        const grades = selectedCategory?.children ?? [];
        const selectedGrade = grades.find((g) => g.id === Number(gradeId));
        const books = selectedGrade?.children ?? [];
        const selectedBook = books.find((b) => b.id === Number(bookId));
        const chapters = selectedBook?.children ?? [];

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-night-200">
                <PageHeader title={t('content.title')} description={t('content.descriptionNoNode')} />
                {loading ? (
                    <Card><CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('content.loading')}</div></CardBody></Card>
                ) : categories.length === 0 ? (
                    <Card>
                        <CardBody>
                            <EmptyState title={t('content.noCategories')} description={t('content.createCatalogFirst')} />
                        </CardBody>
                    </Card>
                ) : (
                    <Card>
                        <CardBody>
                            <div className="max-w-5xl space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <Select label={t('content.step1Category')} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setGradeId(''); setBookId(''); setChapterId(''); }}>
                                        <option value="">{t('content.selectCategory')}</option>
                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Select>
                                    <Select label={t('content.step2Grade')} value={gradeId} onChange={(e) => { setGradeId(e.target.value); setBookId(''); setChapterId(''); }} disabled={!categoryId}>
                                        <option value="">{t('content.selectGrade')}</option>
                                        {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </Select>
                                    <Select label={t('content.step3Book')} value={bookId} onChange={(e) => { setBookId(e.target.value); setChapterId(''); }} disabled={!gradeId}>
                                        <option value="">{t('content.selectBook')}</option>
                                        {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </Select>
                                    <Select
                                        label={t('content.step4Chapter')}
                                        value={chapterId}
                                        onChange={(e) => { const id = e.target.value; setChapterId(id); if (id) navigate(`/content/${id}`); }}
                                        disabled={!bookId}
                                    >
                                        <option value="">{t('content.selectChapter')}</option>
                                        {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </Select>
                                </div>
                                {!categoryId && <p className="text-sm text-gray-500 dark:text-gray-400">{t('content.hintCategory')}</p>}
                                {categoryId && !gradeId && <p className="text-sm text-gray-500 dark:text-gray-400">{t('content.hintGrade')}</p>}
                                {gradeId && !bookId && <p className="text-sm text-gray-500 dark:text-gray-400">{t('content.hintBook')}</p>}
                                {bookId && !chapterId && <p className="text-sm text-gray-500 dark:text-gray-400">{t('content.hintChapter')}</p>}
                            </div>
                        </CardBody>
                    </Card>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-night-200">
            <PageHeader
                title={nodeName || t('content.title')}
                description={t('content.descriptionWithNode')}
                actions={
                    <>
                        <Button variant="secondary" onClick={() => navigate('/content')}>
                            <ArrowLeftIcon className="h-5 w-5" /> {t('content.backToCatalog')}
                        </Button>
                        {canCreate && (
                            <Button onClick={openCreate}>
                                <PlusIcon className="h-5 w-5" /> {t('content.addBlock')}
                            </Button>
                        )}
                    </>
                }
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('content.loadingContent')}</div></CardBody>
                ) : blocks.length === 0 ? (
                    <CardBody>
                        <EmptyState
                            title={t('content.noContent')}
                            description={t('content.addFirstBlockHint')}
                            action={canCreate ? (
                                <Button onClick={openCreate}>
                                    <PlusIcon className="h-5 w-5" /> {t('content.addFirstBlock')}
                                </Button>
                            ) : undefined}
                        />
                    </CardBody>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-night-300">
                        {blocks.map((block, index) => {
                            const url = resolveMediaUrl(block, '/storage/');
                            const isVideo = block.type === 'video';
                            return (
                                <div key={block.id} className="group px-5 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                            <Badge variant="blue">{block.type}</Badge>
                                            {block.is_active ? <Badge variant="green">{t('content.active')}</Badge> : <Badge variant="gray">{t('content.inactive')}</Badge>}
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{t('content.positionPrefix')} {block.position ?? index}</span>
                                            {block.media_id && <Badge variant="purple">{t('content.media')}</Badge>}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            {canCreate && (
                                                <>
                                                    <Button variant="ghost" className="px-1.5 py-1" title={t('content.insertAbove')} onClick={() => openCreateAtPosition(index)}>
                                                        <ArrowUpIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" className="px-1.5 py-1" title={t('content.insertBelow')} onClick={() => openCreateAtPosition(index + 1)}>
                                                        <ArrowDownIcon className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {canEdit && (
                                                <Button variant="ghost" className="px-1.5 py-1" onClick={() => openEdit(block)}>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="ghost" className="px-1.5 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteTarget(block)}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {block.title && <p className="mt-2 font-medium text-gray-900 dark:text-white">{block.title}</p>}

                                    {block.type === 'text' && block.content && (
                                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{block.content}</p>
                                    )}

                                    {url && (block.type === 'image' || isVideo) && (
                                        <div className="mt-3">
                                            {isVideo ? (
                                                <video src={url} controls className="max-h-80 w-full rounded-lg bg-black" />
                                            ) : (
                                                <img src={url} alt={block.title ?? 'media'} className="max-h-96 rounded-lg border border-gray-200 dark:border-night-300 object-contain" />
                                            )}
                                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                                                <LinkIcon className="h-3 w-3" /> {url}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t('content.editTitle') : t('content.addTitle')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving || uploading}>{t('common.cancel')}</Button>
                        <Button type="submit" form="content-form" loading={saving || uploading}>{editing ? t('common.save') : t('common.add')}</Button>
                    </>
                }
            >
                <form id="content-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Select label={t('content.blockType')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                            {blockTypes.map((bt) => <option key={bt} value={bt}>{bt === 'text' ? t('content.text') : bt === 'image' ? t('content.image') : bt === 'video' ? t('content.video') : bt === 'audio' ? t('content.audio') : t('content.pdfType')}</option>)}
                        </Select>
                        <Input label={t('common.position')} type="number" step="0.5" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
                        <Input label={t('common.title')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>

                    {form.type === 'text' && (
                        <Textarea label={t('common.description')} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} />
                    )}

                    {(form.type === 'image' || form.type === 'video') && (
                        <div className="space-y-4 rounded-lg border border-gray-200 dark:border-night-300 p-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('content.mediaSection')}</p>

                            <div>
                                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">1 · {t('content.pasteUrl')}</p>
                                <div className="flex items-center gap-2">
                                    {form.type === 'video'
                                        ? <VideoCameraIcon className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
                                        : <PhotoIcon className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />}
                                    <Input
                                        value={mediaUrl}
                                        placeholder={form.type === 'video' ? t('content.videoPlaceholder') : t('content.imagePlaceholder')}
                                        onChange={(e) => setMediaUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-night-300 pt-3">
                                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">2 · {t('content.uploadNew')}</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept={form.type === 'video' ? 'video/*' : 'image/*'}
                                        className="hidden"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                                    />
                                    <Button variant="secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                                        {t('content.chooseFile')}
                                    </Button>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{uploadFile ? uploadFile.name : t('content.noFileSelected')}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-night-300 pt-3">
                                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">3 · {t('content.pickFromLibrary')}</p>
                                <Select value={form.media_id ? String(form.media_id) : ''} onChange={(e) => setForm({ ...form, media_id: e.target.value ? Number(e.target.value) : undefined })}>
                                    <option value="">{t('content.none')}</option>
                                    {media.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </Select>
                            </div>

                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {t('content.mediaInfo')}
                            </p>
                        </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 dark:border-night-300 text-brand-600 focus:ring-brand-500" />
                        {t('content.activeLabel')}
                    </label>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={t('content.deleteTitle')}
                message={t('content.deleteMessage')}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
