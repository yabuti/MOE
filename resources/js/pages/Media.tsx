import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, Input, PageHeader, Pagination, Select, Table } from '../components/ui';
import type { ContentBlock, Media } from '../types';
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

interface MediaItem extends Media {
    uploader?: { id: number; name: string };
}

interface TreeNode {
    id: number;
    name: string;
    type: string | null;
    children: TreeNode[];
}

interface BlockItem extends ContentBlock {}

function formatBytes(bytes: number | undefined): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function blockTypeFromFile(file: File): string {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type === 'application/pdf') return 'pdf';
    return file.type.startsWith('text/') ? 'text' : 'image';
}

export default function Media() {
    const { hasPermission } = useAuth();
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Upload cascade: Grade -> Course -> Chapter
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [gradeId, setGradeId] = useState('');
    const [bookId, setBookId] = useState('');
    const [chapterId, setChapterId] = useState('');
    const [chapterName, setChapterName] = useState('');
    const [chapterBlocks, setChapterBlocks] = useState<BlockItem[]>([]);
    const [blocksLoading, setBlocksLoading] = useState(false);

    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [insertIndex, setInsertIndex] = useState(0);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const allNodes = useMemo(() => {
        const out: TreeNode[] = [];
        const walk = (nodes: TreeNode[]) => nodes.forEach((n) => { out.push(n); walk(n.children); });
        walk(tree);
        return out;
    }, [tree]);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const { data } = await api.get<{ media: MediaItem[]; current_page: number; last_page: number; total: number }>('/media', { params: { page: p } });
            setMedia(data.media);
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
        api.get<{ tree: TreeNode[] }>('/catalog/tree')
            .then(({ data }) => setTree(data.tree))
            .catch((err) => toast.error(getErrorMessage(err)));
    }, []);

    useEffect(() => { void load(1); }, [load]);

    const loadChapterBlocks = useCallback(async (id: number) => {
        setBlocksLoading(true);
        setChapterBlocks([]);
        try {
            const [{ data: blockData }, { data: nodeData }] = await Promise.all([
                api.get<{ content_blocks: BlockItem[] }>(`/nodes/${id}/content`),
                api.get<{ node: { name: string } }>(`/catalog/${id}`),
            ]);
            const sorted = [...(blockData.content_blocks ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            setChapterBlocks(sorted);
            setChapterName(nodeData.node.name);
            setInsertIndex(sorted.length);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setBlocksLoading(false);
        }
    }, []);

    useEffect(() => {
        if (chapterId) void loadChapterBlocks(Number(chapterId));
    }, [chapterId, loadChapterBlocks]);

    const renumber = async (nodeId: number, insertId?: number, insertIndex?: number) => {
        const sorted = [...chapterBlocks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const orderedIds = sorted.map((b) => b.id);
        if (insertId != null && insertIndex != null) {
            orderedIds.splice(Math.max(0, Math.min(insertIndex, orderedIds.length)), 0, insertId);
        }
        const items = orderedIds.map((blockId, i) => ({ id: blockId, position: i }));
        await api.post('/content/reorder', { items });
        await loadChapterBlocks(nodeId);
    };

    const selectGrade = (value: string) => {
        setGradeId(value);
        setBookId('');
        setChapterId('');
    };

    const selectBook = (value: string) => {
        setBookId(value);
        setChapterId('');
    };

    const handleUpload = async () => {
        if (!file || !chapterId) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('collection', 'chapter-content');
            if (name) formData.append('name', name);
            const { data: mediaRes } = await api.post<{ media: Media }>('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { data: blockRes } = await api.post<{ content_block: ContentBlock }>(`/nodes/${chapterId}/content`, {
                type: blockTypeFromFile(file),
                title: name || null,
                content: null,
                data: {},
                media_id: mediaRes.media.id,
                position: insertIndex,
                is_active: true,
            });

            await renumber(Number(chapterId), blockRes.content_block?.id, insertIndex);
            toast.success('Media placed in chapter');
            setFile(null);
            setName('');
            if (fileRef.current) fileRef.current.value = '';
            void load(page);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/media/${deleteTarget.id}`);
            toast.success('Media deleted');
            setDeleteTarget(null);
            void load(media.length === 1 && page > 1 ? page - 1 : page);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canUpload = hasPermission('upload media');

    const grades = allNodes.filter((n) => n.type === 'grade');
    const selectedGrade = grades.find((g) => g.id === Number(gradeId));
    const books = selectedGrade?.children ?? [];
    const selectedBook = books.find((b) => b.id === Number(bookId));
    const chapters = selectedBook?.children ?? [];

    const positionOptions = [
        { value: 0, label: 'At the very beginning' },
        ...chapterBlocks.map((block, i) => ({
            value: i + 1,
            label: `After: ${block.title || block.type} (${i + 1})`,
        })),
    ];

    return (
        <div>
            <PageHeader title="Media Library" description="Upload images and videos into a chapter and place them where you want" />

            <Card className="mb-6">
                <CardHeader title="Upload Media" subtitle="Select the grade, course and chapter first, then upload and choose where it appears." />
                <CardBody>
                    {canUpload ? (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Select label="Grade" value={gradeId} onChange={(e) => selectGrade(e.target.value)}>
                                    <option value="">Select grade…</option>
                                    {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </Select>
                                <Select label="Course" value={bookId} onChange={(e) => selectBook(e.target.value)} disabled={!gradeId}>
                                    <option value="">Select course…</option>
                                    {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </Select>
                                <Select label="Chapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} disabled={!bookId}>
                                    <option value="">Select chapter…</option>
                                    {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </Select>
                            </div>

                            {chapterId && (
                                <div className="mt-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <label className="col-span-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-center hover:border-brand-400 hover:bg-brand-50">
                                            <ArrowUpTrayIcon className="mb-1 h-6 w-6 text-gray-400" />
                                            {file ? (
                                                <span className="text-sm font-medium text-brand-700">{file.name}</span>
                                            ) : (
                                                <span className="text-sm text-gray-500">Choose an image or video</span>
                                            )}
                                            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                                        </label>
                                        <Input label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="My media" />
                                        <div>
                                            <Select label="Place in chapter" value={insertIndex} onChange={(e) => setInsertIndex(Number(e.target.value))} className="mb-2">
                                                {positionOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                            </Select>
                                            <Button className="w-full" onClick={() => void handleUpload()} loading={uploading} disabled={!file}>
                                                <ArrowUpTrayIcon className="h-5 w-5" /> Upload &amp; Place
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            {chapterName} · {chapterBlocks.length} block{chapterBlocks.length === 1 ? '' : 's'}
                                            {blocksLoading && ' · loading…'}
                                        </p>
                                        {chapterBlocks.length === 0 ? (
                                            <p className="text-sm text-gray-500">This chapter has no content blocks yet. Your upload will be inserted here.</p>
                                        ) : (
                                            <ol className="space-y-1">
                                                {chapterBlocks.map((block, i) => (
                                                    <li key={block.id} className="flex items-center gap-2 text-sm">
                                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white text-xs text-gray-400 ring-1 ring-gray-200">{i + 1}</span>
                                                        <span className="truncate text-gray-700">{block.title || block.type}</span>
                                                        <Badge variant="gray">{block.type}</Badge>
                                                        {i === insertIndex - 1 && <Badge variant="yellow">insert after here</Badge>}
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">You do not have permission to upload media.</p>
                    )}
                </CardBody>
            </Card>

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500">Loading media…</div></CardBody>
                ) : media.length === 0 ? (
                    <CardBody><EmptyState title="No media found" /></CardBody>
                ) : (
                    <>
                        <Table headers={['Preview', 'Name', 'Type', 'Collection', 'Size', 'Uploaded by', 'Actions']}>
                            {media.map((m) => (
                                <tr key={m.id}>
                                    <td className="px-5 py-3">
                                        {m.mime_type.startsWith('image') ? (
                                            <img src={m.url} alt={m.name} className="h-10 w-10 rounded object-cover" />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-500">FILE</div>
                                        )}
                                    </td>
                                    <td className="max-w-[240px] px-5 py-3">
                                        <a href={m.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-brand-600 hover:underline">
                                            {m.name}
                                        </a>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{m.mime_type}</td>
                                    <td className="px-5 py-3">{m.collection ? <Badge variant="gray">{m.collection}</Badge> : <span className="text-sm text-gray-400">—</span>}</td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{formatBytes(m.size)}</td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{m.uploader?.name ?? '—'}</td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        {canUpload && (
                                            <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(m)}>
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </Table>
                        <Pagination page={page} lastPage={lastPage} total={total} onPage={(p) => void load(p)} />
                    </>
                )}
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete media"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This permanently removes the file.`}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}