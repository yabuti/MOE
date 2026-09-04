import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { Card, CardBody, PageHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface Book {
    id: number;
    name: string;
    slug: string;
    description?: string;
    chapters_count: number;
    read_percent?: number;
}

interface Grade {
    id: number;
    name: string;
    slug: string;
    books: Book[];
}

interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    grades: Grade[];
}

function stringToColor(str: string): string {
    const colors = [
        'from-blue-500 to-blue-700',
        'from-emerald-500 to-emerald-700',
        'from-purple-500 to-purple-700',
        'from-amber-500 to-amber-700',
        'from-rose-500 to-rose-700',
        'from-cyan-500 to-cyan-700',
        'from-indigo-500 to-indigo-700',
        'from-teal-500 to-teal-700',
        'from-orange-500 to-orange-700',
        'from-pink-500 to-pink-700',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function Library() {
    const { t } = useLanguage();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<{ categories: Category[] }>('/reader/library');
            setCategories(data.categories);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    if (loading) {
        return (
            <div>
                <PageHeader title={t('library.title')} description={t('library.descriptionEmpty')} />
                <Card><CardBody><div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{t('library.loading')}</div></CardBody></Card>
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div>
                <PageHeader title={t('library.title')} description={t('library.descriptionEmpty')} />
                <Card>
                    <CardBody>
                        <div className="py-16 text-center">
                            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{t('library.noBooks')}</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('library.noBooksHint')}</p>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={t('library.title')} description={t('library.descriptionData')} />

            <div className="space-y-10">
                {categories.map((category) => (
                    <section key={category.id}>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
                            {category.description && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{category.description}</p>
                            )}
                        </div>

                        {category.grades.map((grade) => (
                            <div key={grade.id} className="mb-8">
                                <h3 className="mb-4 text-lg font-semibold text-gray-700 dark:text-gray-200">{grade.name}</h3>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {grade.books.map((book) => {
                                        const gradient = stringToColor(book.name);
                                        return (
                                            <Link
                                                key={book.id}
                                                to={`/read/${book.id}`}
                                                className="group overflow-hidden rounded-xl border border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
                                            >
                                                <div className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${gradient}`}>
                                                    <BookOpenIcon className="h-16 w-16 text-white/30" />
                                                    <div className="absolute inset-0 flex items-center justify-center p-4">
                                                        <h4 className="text-center text-lg font-bold leading-tight text-white drop-shadow-md">
                                                            {book.name}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <div className="p-4">
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                                        {book.description || book.name}
                                                    </p>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                                                            {book.chapters_count} {book.chapters_count === 1 ? t('library.chapter') : t('library.chapters')}
                                                        </span>
                                                        {typeof book.read_percent === 'number' && book.read_percent > 0 ? (
                                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                                {book.read_percent}% {t('library.readProgress')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-medium text-brand-600 group-hover:text-brand-700 dark:text-brand-300 dark:group-hover:text-brand-200">
                                                                {t('library.readMore')} →
                                                            </span>
                                                        )}
                                                    </div>
                                                    {typeof book.read_percent === 'number' && book.read_percent > 0 && (
                                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-night-200">
                                                            <div
                                                                className="h-full rounded-full bg-emerald-500 transition-all"
                                                                style={{ width: `${Math.min(100, book.read_percent)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </div>
    );
}
