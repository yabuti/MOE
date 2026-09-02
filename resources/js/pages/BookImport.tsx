import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { isAxiosError } from 'axios';
import { api, getErrorMessage } from '../api/client';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Select } from '../components/ui';
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
    body_snippet?: string;
}

interface Option {
    id: number;
    name: string;
}

export default function BookImport() {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [loadingTree, setLoadingTree] = useState(true);

    const [file, setFile] = useState<File | null>(null);
    const [bookTitle, setBookTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [gradeId, setGradeId] = useState('');

    const [analyzing, setAnalyzing] = useState(false);
    const [preview, setPreview] = useState<{ tree: DetectedSection[]; text_preview?: string } | null>(null);

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

    const categories = useMemo<Option[]>(() =>
        tree.filter((n) => n.type === 'category').map((n) => ({ id: n.id, name: n.name })),
        [tree],
    );

    const grades = useMemo<Option[]>(() => {
        const cat = tree.find((n) => n.id === Number(categoryId));
        return (cat?.children ?? [])
            .filter((n) => n.type === 'grade')
            .map((n) => ({ id: n.id, name: n.name }));
    }, [tree, categoryId]);

    const handleFile = (f: File | null) => {
        setFile(f);
        setPreview(null);
        if (!f) return;
        if (f.size > 50 * 1024 * 1024) {
            setFile(null);
            toast.error('PDF is too large (max 50 MB).');
            return;
        }
        const base = f.name.replace(/\.pdf$/i, '').replace(/[_\-]+/g, ' ').trim();
        setBookTitle(base);
    };

    const runAnalysis = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setAnalyzing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post<{ tree: DetectedSection[]; text_preview?: string }>('/books/import/preview', formData, {
                headers: { 'Content-Type': undefined },
                timeout: 120000,
            });
            setPreview(data);
            if (!data.tree || data.tree.length === 0) {
                toast.error('No chapter headings were detected in this PDF.');
            }
        } catch (err) {
            if (isAxiosError(err) && err.code === 'ECONNABORTED') {
                toast.error('Analysis timed out. The PDF is probably too large or a scanned (image-only) book.');
            } else {
                toast.error(getErrorMessage(err));
            }
        } finally {
            setAnalyzing(false);
        }
    };

    const runImport = async () => {
        if (!file || !categoryId || !gradeId || !bookTitle.trim()) return;
        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category_id', categoryId);
            formData.append('grade_id', gradeId);
            formData.append('book_title', bookTitle.trim());
            const { data } = await api.post<{ message: string }>('/books/import', formData, {
                headers: { 'Content-Type': undefined },
            });
            toast.success(data.message);
            setPreview(null);
            setFile(null);
            setBookTitle('');
            setCategoryId('');
            setGradeId('');
            void loadTree();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setImporting(false);
        }
    };

    const chapterCount = preview?.tree?.length ?? 0;
    const canImport = !!file && !!categoryId && !!gradeId && !!bookTitle.trim();

    return (
        <div>
            <PageHeader
                title="Import Book"
                description="Upload a book PDF — pick the category and grade, and the book plus its chapters are created automatically (Amharic & English headings)."
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
                                    <span className="mt-1 text-xs text-gray-500">Digital .pdf · up to 50 MB</span>
                                    <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        className="hidden"
                                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                                    />
                                </label>
                                <Input
                                    label="Book title"
                                    value={bookTitle}
                                    onChange={(e) => setBookTitle(e.target.value)}
                                    placeholder="e.g. Mathematics Grade 1 Student Book"
                                    required
                                />
                                <Button type="submit" className="w-full" loading={analyzing} disabled={!file}>
                                    {analyzing ? 'Analyzing…' : 'Run Analysis'}
                                </Button>
                                {analyzing && (
                                    <p className="text-xs text-gray-500">Reading the PDF… this can take a while for large books. Scanned PDFs (images only) cannot be analyzed.</p>
                                )}
                            </form>
                        </CardBody>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader
                            title="2 · Place & Import"
                            subtitle="Choose where the book belongs, review the detected chapters"
                        />
                        <CardBody>
                            <div className="space-y-4">
                                {categories.length === 0 ? (
                                    <EmptyState
                                        title="No categories available"
                                        description="Create a Category → Grade structure in the Catalog first, then import a book into it."
                                        action={
                                            <Button variant="secondary" loading={loadingTree} onClick={() => void loadTree()}>
                                                <ArrowPathIcon className="h-4 w-4" /> Refresh
                                            </Button>
                                        }
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Select label="Category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setGradeId(''); }}>
                                            <option value="">Select a category…</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </Select>
                                        <Select label="Grade" value={gradeId} onChange={(e) => setGradeId(e.target.value)} disabled={!categoryId}>
                                            <option value="">Select a grade…</option>
                                            {grades.map((g) => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </Select>
                                    </div>
                                )}

                                {!preview ? (
                                    <p className="text-sm text-gray-500">
                                        Upload a PDF on the left, then run the analysis to see the detected chapters before importing.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <Badge variant="blue">{chapterCount} chapter(s) detected</Badge>
                                        </div>

                                        <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                                            {preview.tree.map((ch, i) => (
                                                <div key={i} className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <FolderIcon className="h-4 w-4 shrink-0 text-brand-500" />
                                                        <span className="font-medium text-gray-900">{ch.title}</span>
                                                        <Badge variant="blue">chapter</Badge>
                                                    </div>
                                                    {ch.body_snippet && (
                                                        <p className="mt-1 pl-6 text-xs text-gray-500 line-clamp-2">{ch.body_snippet}</p>
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
                                            <Button variant="secondary" onClick={() => setPreview(null)}>
                                                Back
                                            </Button>
                                            <Button variant="success" loading={importing} disabled={!canImport} onClick={() => void runImport()}>
                                                {importing ? 'Importing…' : 'Import Book'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}