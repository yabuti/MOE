import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader, Select } from '../components/ui';
import { ArrowPathIcon, DocumentArrowUpIcon, FolderIcon } from '@heroicons/react/24/outline';

interface TreeNode {
    id: number;
    catalog_node_type_id: number;
    parent_id: number | null;
    name: string;
    type: string | null;
    children: TreeNode[];
}

interface DetectedSection {
    heading: string;
    title: string;
    sections: string[];
}

export default function BookImport() {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [loadingTree, setLoadingTree] = useState(true);

    const [file, setFile] = useState<File | null>(null);
    const [bookId, setBookId] = useState('');
    const [titlePrefill, setTitlePrefill] = useState('');

    const [analyzing, setAnalyzing] = useState(false);
    const [preview, setPreview] = useState<{ tree: DetectedSection[]; text_preview?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [importing, setImporting] = useState(false);

    const loadTree = useCallback(async () => {
        setLoadingTree(true);
        try {
            const { data } = await api.get<{ tree: TreeNode[] }>('/catalog/tree');
            setTree(data.tree);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoadingTree(false);
        }
    }, []);

    useEffect(() => { void loadTree(); }, [loadTree]);

    const bookNodes = useMemo(() => {
        const out: TreeNode[] = [];
        const walk = (nodes: TreeNode[], parentBookId: number | null) => {
            nodes.forEach((n) => {
                const isBook = n.type === 'book';
                if (parentBookId !== null && isBook) {
                    out.push(n);
                }
                walk(n.children, isBook ? n.id : parentBookId);
            });
        };
        walk(tree, null);
        return out;
    }, [tree]);

    const handleFile = (f: File | null) => {
        setFile(f);
        setPreview(null);
        setError(null);
        if (f) {
            const base = f.name.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ').trim();
            setTitlePrefill(base);
        }
    };

    const runAnalysis = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setAnalyzing(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post<{ tree: DetectedSection[]; text_preview?: string }>('/books/import/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPreview(data);
            if (!data.tree || data.tree.length === 0) {
                setError('No chapter or section headings were detected in this PDF.');
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setAnalyzing(false);
        }
    };

    const runImport = async () => {
        if (!file || !bookId) return;
        setImporting(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('book_id', bookId);
            if (titlePrefill) formData.append('book_title', titlePrefill);
            const { data } = await api.post<{ message: string }>('/books/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(data.message);
            setPreview(null);
            setFile(null);
            setTitlePrefill('');
            setBookId('');
            void loadTree();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setImporting(false);
        }
    };

    const chapterCount = preview?.tree?.length ?? 0;

    return (
        <div>
            <PageHeader
                title="Import Book"
                description="Upload a book PDF — chapters and sections are detected automatically (Amharic & English) and built into the catalog tree."
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader title="1 · Upload PDF" subtitle="Select a book PDF to analyze" />
                        <CardBody>
                            <form onSubmit={runAnalysis} className="space-y-4">
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center hover:border-brand-400 hover:bg-brand-50">
                                    <DocumentArrowUpIcon className="h-10 w-10 text-gray-400" />
                                    <span className="mt-3 text-sm font-medium text-gray-700">
                                        {file ? file.name : 'Click to choose a PDF'}
                                    </span>
                                    <span className="mt-1 text-xs text-gray-500">.pdf · up to 50 MB</span>
                                    <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        className="hidden"
                                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                                    />
                                </label>
                                <Button type="submit" className="w-full" loading={analyzing} disabled={!file}>
                                    {analyzing ? 'Analyzing…' : 'Run Analysis'}
                                </Button>
                            </form>
                        </CardBody>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader
                            title="2 · Review & Import"
                            subtitle="Review what was detected, then pick the parent book node"
                            actions={
                                !preview && bookNodes.length > 0 ? (
                                    <Button variant="ghost" onClick={() => void loadTree()}>
                                        <ArrowPathIcon className="h-4 w-4" /> Refresh
                                    </Button>
                                ) : undefined
                            }
                        />
                        <CardBody>
                            {error && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {!preview ? (
                                bookNodes.length === 0 ? (
                                    <EmptyState
                                        title="No books available"
                                        description="Create a Book node under a course in the Catalog first, then import a PDF into it."
                                        action={
                                            <Button variant="secondary" loading={loadingTree} onClick={() => void loadTree()}>
                                                <ArrowPathIcon className="h-4 w-4" /> Refresh
                                            </Button>
                                        }
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-500">
                                            Run the analysis above to see the detected structure. Then choose the book this content belongs to.
                                        </p>
                                        <Select label="Target book" value={bookId} onChange={(e) => setBookId(e.target.value)}>
                                            <option value="">Select a book…</option>
                                            {bookNodes.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </Select>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Badge variant="blue">{chapterCount} chapter(s) detected</Badge>
                                        {bookNodes.length === 0 && <Badge variant="yellow">No book nodes</Badge>}
                                    </div>

                                    {chapterCount > 0 && bookNodes.length > 0 && (
                                        <Select label="Target book" value={bookId} onChange={(e) => setBookId(e.target.value)}>
                                            <option value="">Select a book…</option>
                                            {bookNodes.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </Select>
                                    )}

                                    <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
                                        {preview.tree.map((ch, i) => (
                                            <div key={i} className="border-b border-gray-100 px-4 py-3 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <FolderIcon className="h-4 w-4 shrink-0 text-brand-500" />
                                                    <span className="font-medium text-gray-900">{ch.title}</span>
                                                    <Badge variant="blue">chapter</Badge>
                                                </div>
                                                {ch.sections.length > 0 && (
                                                    <ul className="mt-2 space-y-1 pl-6">
                                                        {ch.sections.map((s, j) => (
                                                            <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                                                {s}
                                                                <Badge variant="gray">section</Badge>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {preview.text_preview && (
                                        <div>
                                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Extracted text preview</p>
                                            <p className="rounded-lg bg-gray-50 px-4 py-3 font-mono text-xs text-gray-600">{preview.text_preview}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
                                        <Button variant="secondary" onClick={() => { setPreview(null); setError(null); }}>
                                            Back
                                        </Button>
                                        <Button variant="success" loading={importing} disabled={!bookId || !file} onClick={() => void runImport()}>
                                            {importing ? 'Importing…' : 'Import Book'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}
