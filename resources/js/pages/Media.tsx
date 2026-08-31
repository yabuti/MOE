import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, PageHeader, Pagination, Table } from '../components/ui';
import type { Media } from '../types';
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

interface MediaItem extends Media {
    uploader?: { id: number; name: string };
}

function formatBytes(bytes: number | undefined): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Media() {
    const { hasPermission } = useAuth();
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [collection, setCollection] = useState('');
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
    const [deleting, setDeleting] = useState(false);

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

    useEffect(() => { void load(1); }, [load]);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (collection) formData.append('collection', collection);
            if (name) formData.append('name', name);
            await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('File uploaded');
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

    return (
        <div>
            <PageHeader title="Media Library" description="Upload and manage media files" />

            <Card className="mb-6">
                <CardBody>
                    {canUpload ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="col-span-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-center hover:border-brand-400 hover:bg-brand-50">
                                <ArrowUpTrayIcon className="mb-1 h-6 w-6 text-gray-400" />
                                {file ? (
                                    <span className="text-sm font-medium text-brand-700">{file.name}</span>
                                ) : (
                                    <span className="text-sm text-gray-500">Choose a file to upload</span>
                                )}
                                <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                            </label>
                            <Input label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="My file" />
                            <div>
                                <Input label="Collection" value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="e.g. textbooks" className="mb-2" />
                                <Button className="w-full" onClick={() => void handleUpload()} loading={uploading} disabled={!file}>
                                    <ArrowUpTrayIcon className="h-5 w-5" /> Upload
                                </Button>
                            </div>
                        </div>
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
