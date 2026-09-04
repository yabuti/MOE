import type { BookProgress, ProgressReport } from '../types';
import { Badge, Card, CardBody, CardHeader } from './ui';

function PercentBar({ value, color = 'bg-brand-600' }: { value: number; color?: string }) {
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-night-300">
            <div
                className={`h-full rounded-full ${color} transition-all`}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix: string }) {
    return (
        <Card className="p-5">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {value}
                <span className="ml-0.5 text-base font-semibold text-gray-400 dark:text-gray-500">{suffix}</span>
            </p>
        </Card>
    );
}

function BookProgressCard({ book }: { book: BookProgress }) {
    const attemptedChapters = book.chapters.filter((c) => c.exam?.attempted);
    return (
        <Card>
            <CardHeader
                title={book.name}
                subtitle={[book.grade, book.category].filter(Boolean).join(' · ') || undefined}
            />
            <CardBody className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Read</p>
                        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{book.read_percent}%</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Listened</p>
                        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{book.listen_percent}%</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Exam</p>
                        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                            {book.exam_percent != null ? `${book.exam_percent}%` : '—'}
                        </p>
                    </div>
                </div>

                <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Overall reading</span>
                        <span className="font-bold text-brand-700 dark:text-brand-300">{book.read_percent}%</span>
                    </div>
                    <PercentBar value={book.read_percent} />
                </div>

                <div className="border-t border-gray-100 pt-3 dark:border-night-300">
                    <div className="space-y-2.5">
                        {book.chapters.map((ch) => (
                            <div key={ch.id} className="flex flex-wrap items-center gap-2">
                                <span className="w-2/5 truncate text-sm text-gray-700 dark:text-gray-200">{ch.name}</span>
                                <div className="min-w-[70px] flex-1">
                                    <PercentBar value={ch.activity_percent} />
                                </div>
                                <span className="w-9 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">{ch.activity_percent}%</span>
                                {ch.exam ? (
                                    ch.exam.attempted ? (
                                        <Badge variant={ch.exam.passed ? 'green' : 'red'}>
                                            Exam {ch.exam.percentage}%{ch.exam.passed ? ' ✓' : ''}
                                        </Badge>
                                    ) : (
                                        <Badge variant="yellow">Exam available</Badge>
                                    )
                                ) : (
                                    <Badge variant="gray">No exam</Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {attemptedChapters.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">No exams attempted for this book yet.</p>
                )}
            </CardBody>
        </Card>
    );
}

export default function ProgressView({ report, emptyTitle }: { report: ProgressReport | null; emptyTitle: string }) {
    if (!report) {
        return <Card><CardBody><div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">No progress data yet.</div></CardBody></Card>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Overall read" value={report.overall_read} suffix="%" />
                <StatCard label="Overall understand" value={report.overall_understand} suffix="%" />
                <Card className="p-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Most read chapter</p>
                    {report.most_read_chapter ? (
                        <div className="mt-1">
                            <p className="truncate text-base font-bold text-gray-900 dark:text-white">{report.most_read_chapter.chapter_name}</p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {report.most_read_chapter.book_name} · {report.most_read_chapter.percent}%
                            </p>
                        </div>
                    ) : (
                        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">No chapters read yet.</p>
                    )}
                </Card>
            </div>

            {report.books.length === 0 ? (
                <Card><CardBody><div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">{emptyTitle}</div></CardBody></Card>
            ) : (
                report.books.map((book) => <BookProgressCard key={book.id} book={book} />)
            )}
        </div>
    );
}