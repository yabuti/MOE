import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { Button, Card, CardBody, Modal } from '../components/ui';
import {
    ArrowLeftIcon,
    Bars3BottomLeftIcon,
    BookOpenIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ListBulletIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

interface MediaItem {
    id: number;
    url: string;
    file_name: string;
    mime_type: string;
}

interface ContentBlockItem {
    id: number;
    type: string;
    title?: string;
    content?: string;
    data?: Record<string, unknown>;
    media?: MediaItem | null;
    position: number;
}

interface QuestionItem {
    id: number;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
    options?: string[];
    points: number;
}

interface ExamData {
    id: number;
    title: string;
    description?: string;
    pass_percentage: number;
    duration_minutes: number;
    max_attempts: number;
    passed: boolean;
    best_attempt?: {
        score: number;
        percentage: number;
        passed: boolean;
    } | null;
    questions: QuestionItem[];
}

interface Chapter {
    id: number;
    name: string;
    slug: string;
    description?: string;
    sort_order: number;
    is_unlocked?: boolean;
    content_blocks: ContentBlockItem[];
    exam?: ExamData | null;
}

interface BookData {
    id: number;
    name: string;
    slug: string;
    description?: string;
    category?: { id: number; name: string } | null;
    grade?: { id: number; name: string } | null;
    chapters: Chapter[];
}

type ReadingMode = 'scroll' | 'page';

function resolveUrl(block: ContentBlockItem): string | null {
    if (block.data && typeof block.data === 'object' && 'url' in block.data && (block.data as { url?: string }).url) {
        return (block.data as { url: string }).url;
    }
    if (block.media?.url) return block.media.url;
    if (block.media?.file_name) return `/storage/${block.media.file_name}`;
    return null;
}

/** Convert numbers following chemical formula characters into Unicode subscripts */
function formatChemicalFormulas(text: string): string {
    const subscripts: Record<string, string> = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
    };

    // Replace numbers after chemical symbols or parens with subscript unicode digits
    let formatted = text.replace(/([A-Z][a-z]?|\))\s*(\d+)/g, (_, symbol, digits) => {
        const sub = digits.split('').map((d: string) => subscripts[d] || d).join('');
        return symbol + sub;
    });

    // Clean up spaced chemical formulas (e.g. "Na₂ SO₄" -> "Na₂SO₄")
    formatted = formatted.replace(/(₂|₃|₄|₅|₆|₇|₈|₉|₀)\s+([A-Z])/g, '$1$2');
    formatted = formatted.replace(/([A-Z][a-z]?)\s+(₂|₃|₄|₅|₆|₇|₈|₉|₀)/g, '$1$2');
    formatted = formatted.replace(/\s*(-+>|=>|=)\s*/g, ' → ');
    return formatted;
}

/** Render paragraphs with specialized Callout Box styling for Exercises, Steps, Checking, and Notes */
function ParagraphRenderer({ text }: { text: string }) {
    const formattedText = formatChemicalFormulas(text);

    // Interactive answer checker state for exercises
    const [userAnswer, setUserAnswer] = useState('');
    const [checked, setChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);

    // Detect structural types
    const isStep = /^(?:step\s*\d+|step\s*[a-z]|step\b)/i.test(formattedText);
    const isChecking = /^(?:checking|check|verification):/i.test(formattedText);
    const isExercise = /^(?:exercise|activity|questions?|tasks?|\b[i|v|x]+\.|\b\d+\.)/i.test(formattedText);
    const isExample = /^(?:example|solution|note|tip):/i.test(formattedText);

    const handleCheckAnswer = () => {
        if (!userAnswer.trim()) return;
        const studentAns = userAnswer.trim().toLowerCase();
        const fullText = formattedText.toLowerCase();

        // Extract key words/concepts (words >= 3 chars or numbers/formulas)
        const keyWords = fullText
            .replace(/[^\w\d₂₃₄₅₆₇₈₉₀\s]/g, '')
            .split(/\s+/)
            .filter((w) => w.length >= 3 || /\d|₂|₃|₄|₅|₆|₇|₈|₉|₀/.test(w));

        // Check if student answer contains key concept words or formulas
        const matchCount = keyWords.filter((kw) => studentAns.includes(kw)).length;
        const passes = matchCount >= Math.min(2, keyWords.length) || studentAns.length > 5;

        setIsCorrect(passes);
        setChecked(true);
    };

    if (isStep) {
        return (
            <div className="my-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5 shadow-xs">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">⚗️</span>
                    Step-by-step Procedure / Reaction Balance
                </div>
                <p className="font-mono text-sm leading-relaxed text-blue-950 sm:text-base whitespace-pre-wrap">
                    {formattedText}
                </p>
            </div>
        );
    }

    if (isChecking) {
        return (
            <div className="my-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 shadow-xs">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">✓</span>
                    Verification & Balance Check
                </div>
                <p className="text-base leading-relaxed text-emerald-950 sm:text-lg whitespace-pre-wrap">
                    {formattedText}
                </p>
            </div>
        );
    }

    if (isExercise) {
        return (
            <div className="my-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-5 sm:p-6 shadow-xs">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs">✏️</span>
                    Exercise / Interactive Question
                </div>
                <p className="text-base font-semibold leading-relaxed text-indigo-950 sm:text-lg whitespace-pre-wrap">
                    {formattedText}
                </p>

                {/* Interactive Answering Area */}
                <div className="mt-4 border-t border-indigo-200/60 pt-4">
                    {!checked ? (
                        <div className="space-y-3">
                            <label className="block text-xs font-medium text-indigo-900">Type your answer below:</label>
                            <textarea
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="Write your chemical equation, numerical calculation, or concept answer here..."
                                rows={2}
                                className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <div className="flex justify-end">
                                <Button
                                    variant="primary"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3.5 py-2"
                                    disabled={!userAnswer.trim()}
                                    onClick={handleCheckAnswer}
                                >
                                    Check Answer
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {isCorrect ? (
                                <div className="rounded-xl border border-emerald-300 bg-emerald-100/80 p-3.5 text-sm text-emerald-950">
                                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                                        <span>✓</span> Correct! Excellent understanding.
                                    </div>
                                    <p className="mt-1 text-xs text-emerald-900">Your answer matches the expected chapter concept.</p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-amber-300 bg-amber-100/80 p-3.5 text-sm text-amber-950">
                                    <div className="flex items-center gap-2 font-bold text-amber-800">
                                        <span>✗</span> Incorrect / Needs Review
                                    </div>
                                    <div className="mt-2 text-xs text-amber-900 border-t border-amber-200/80 pt-2">
                                        <p className="font-semibold text-amber-950 mb-1">Expected Chapter Concept / Solution:</p>
                                        <p className="italic bg-white/60 p-2 rounded-lg border border-amber-200">{formattedText}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    variant="secondary"
                                    className="text-xs px-3 py-1.5"
                                    onClick={() => { setChecked(false); setUserAnswer(''); }}
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isExample) {
        return (
            <div className="my-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 shadow-xs">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">💡</span>
                    Example / Solution Note
                </div>
                <p className="text-base leading-relaxed text-amber-950 sm:text-lg whitespace-pre-wrap">
                    {formattedText}
                </p>
            </div>
        );
    }

    return (
        <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-800 sm:text-lg sm:leading-8">
            {formattedText}
        </p>
    );
}

/** Render a single content block with responsive device layout */
function BlockRenderer({ block }: { block: ContentBlockItem }) {
    const url = resolveUrl(block);

    if (block.type === 'text') {
        const paragraphs = (block.content ?? '')
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);

        return (
            <div className="reader-block my-6">
                {block.title && (
                    <h3 className="mb-4 text-xl font-bold text-gray-900 sm:text-2xl">{block.title}</h3>
                )}
                {paragraphs.length > 0 ? (
                    <div className="space-y-4">
                        {paragraphs.map((para, idx) => (
                            <ParagraphRenderer key={idx} text={para} />
                        ))}
                    </div>
                ) : (
                    block.content && (
                        <ParagraphRenderer text={block.content} />
                    )
                )}
            </div>
        );
    }

    if (block.type === 'pdf' && url) {
        return (
            <div className="reader-block my-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {block.title && (
                    <div className="border-b border-gray-100 px-4 py-3 bg-gray-50/50">
                        <h3 className="text-base font-semibold text-gray-900">{block.title}</h3>
                    </div>
                )}
                <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] bg-gray-100">
                    <iframe
                        src={`${url}#toolbar=0`}
                        className="h-full w-full border-0"
                        title={block.title ?? 'PDF Document'}
                    />
                </div>
                <div className="flex items-center justify-between bg-gray-50/80 px-4 py-2.5 text-xs text-gray-600 border-t border-gray-100">
                    <span className="font-medium">📄 PDF Document</span>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                        View / Download Full PDF ↗
                    </a>
                </div>
            </div>
        );
    }

    if (block.type === 'image' && url) {
        return (
            <figure className="reader-block my-6">
                <img
                    src={url}
                    alt={block.title ?? 'Textbook illustration'}
                    className="mx-auto max-h-[75vh] w-full max-w-full rounded-2xl border border-gray-100 object-contain shadow-sm"
                    loading="lazy"
                />
                {block.title && (
                    <figcaption className="mt-2 text-center text-xs text-gray-500 italic sm:text-sm">
                        {block.title}
                    </figcaption>
                )}
            </figure>
        );
    }

    if (block.type === 'video' && url) {
        return (
            <div className="reader-block my-6">
                {block.title && (
                    <p className="mb-2 text-sm font-semibold text-gray-800 sm:text-base">{block.title}</p>
                )}
                <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
                    <video src={url} controls className="aspect-video w-full max-w-full" />
                </div>
            </div>
        );
    }

    if (block.type === 'audio' && url) {
        return (
            <div className="reader-block my-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                {block.title && (
                    <p className="mb-2 text-sm font-semibold text-gray-800">{block.title}</p>
                )}
                <audio src={url} controls className="w-full" />
            </div>
        );
    }

    // Fallback for unknown or generic content blocks
    if (block.title || block.content) {
        return (
            <div className="reader-block my-6">
                {block.title && <h4 className="mb-2 font-bold text-gray-900">{block.title}</h4>}
                {block.content && <p className="text-base text-gray-700 sm:text-lg">{block.content}</p>}
            </div>
        );
    }

    return null;
}

/** End of Chapter Exam Card & Modal */
function ChapterExamCard({
    exam,
    chapterName,
    onSuccess,
}: {
    exam: ExamData;
    chapterName: string;
    onSuccess: () => void;
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{
        passed: boolean;
        score: number;
        total_points: number;
        percentage: number;
        pass_percentage: number;
        breakdown: Array<{
            question_id: number;
            question: string;
            user_answer: string;
            correct_answer: string;
            is_correct: boolean;
        }>;
    } | null>(null);

    const handleSubmitExam = async () => {
        setSubmitting(true);
        try {
            const { data } = await api.post(`/reader/exams/${exam.id}/submit`, { answers });
            setResult(data);
            if (data.passed) {
                toast.success('Congratulations! You passed the chapter exam and unlocked the next chapter!');
                onSuccess();
            } else {
                toast.warning(`Exam submitted: ${data.percentage}%. You need ${data.pass_percentage}% to pass.`);
            }
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="my-10 rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50/60 to-purple-50/40 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
                        🎓 End-of-Chapter Assessment
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-gray-900">{exam.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                        {exam.description || `Complete this exam to verify your concepts for ${chapterName}. Pass mark: ${exam.pass_percentage}%.`}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500">
                        <span>📝 {exam.questions.length} Questions</span>
                        <span>⏱️ {exam.duration_minutes} min</span>
                        <span>🎯 Pass: {exam.pass_percentage}%</span>
                        {exam.passed && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                                ✓ PASSED ({exam.best_attempt?.percentage ?? 100}%)
                            </span>
                        )}
                    </div>
                </div>

                <div>
                    <Button
                        variant={exam.passed ? 'success' : 'primary'}
                        onClick={() => { setResult(null); setAnswers({}); setModalOpen(true); }}
                    >
                        {exam.passed ? 'Retake Exam' : 'Take Chapter Exam →'}
                    </Button>
                </div>
            </div>

            {/* Exam Modal */}
            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={`End-of-Chapter Exam: ${exam.title}`}
                size="lg"
            >
                {!result ? (
                    <div className="space-y-6 py-2">
                        <div className="rounded-xl bg-brand-50 p-4 text-xs text-brand-900 border border-brand-200">
                            Answer all questions below carefully. You must score <strong>{exam.pass_percentage}%</strong> or higher to pass and unlock the next chapter.
                        </div>

                        {exam.questions.map((q, qIdx) => (
                            <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                                <p className="font-semibold text-sm text-gray-900">
                                    {qIdx + 1}. {q.question} ({q.points} pt)
                                </p>

                                {q.type === 'multiple_choice' && q.options && (
                                    <div className="space-y-2">
                                        {q.options.map((opt, oIdx) => (
                                            <label key={oIdx} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50 cursor-pointer text-sm">
                                                <input
                                                    type="radio"
                                                    name={`q_${q.id}`}
                                                    value={opt}
                                                    checked={answers[q.id] === opt}
                                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                    className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'true_false' && (
                                    <div className="flex items-center gap-4">
                                        {['True', 'False'].map((opt) => (
                                            <label key={opt} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm font-medium">
                                                <input
                                                    type="radio"
                                                    name={`q_${q.id}`}
                                                    value={opt}
                                                    checked={answers[q.id] === opt}
                                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                    className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {(q.type === 'short_answer' || q.type === 'fill_blank') && (
                                    <input
                                        type="text"
                                        value={answers[q.id] ?? ''}
                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                        placeholder="Type your answer..."
                                        className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                )}
                            </div>
                        ))}

                        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button variant="primary" loading={submitting} onClick={handleSubmitExam}>Submit Exam</Button>
                        </div>
                    </div>
                ) : (
                    /* Exam Result Screen */
                    <div className="space-y-6 py-2">
                        <div className={`rounded-2xl p-6 text-center border ${result.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                            <div className="text-4xl mb-2">{result.passed ? '🎉' : '⚠️'}</div>
                            <h3 className="text-2xl font-bold">{result.passed ? 'Exam Passed!' : 'Needs Improvement'}</h3>
                            <p className="mt-1 text-sm">
                                You scored <strong>{result.percentage}%</strong> ({result.score}/{result.total_points} points). Pass requirement: {result.pass_percentage}%.
                            </p>
                            {result.passed && (
                                <p className="mt-2 text-xs font-semibold text-emerald-800">
                                    ✓ Next chapter is now UNLOCKED!
                                </p>
                            )}
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-3">
                            <h4 className="font-bold text-sm text-gray-900">Question Breakdown:</h4>
                            {result.breakdown.map((item, idx) => (
                                <div key={idx} className={`rounded-xl border p-3.5 text-xs ${item.is_correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'}`}>
                                    <p className="font-semibold text-gray-900 mb-1">{idx + 1}. {item.question}</p>
                                    <p className="text-gray-700">Your answer: <strong>{item.user_answer || 'None'}</strong></p>
                                    {!item.is_correct && (
                                        <p className="text-emerald-800 font-semibold mt-1">Correct solution: {item.correct_answer}</p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
                            <Button variant="secondary" onClick={() => setModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

function buildChapterText(chapter: Chapter): string {
    const parts: string[] = [chapter.name];
    for (const block of chapter.content_blocks) {
        if (block.type === 'text' && block.content) {
            parts.push(block.content);
        }
    }
    return parts.join('. ');
}

function ChapterAudioPlayer({
    chapters,
    currentChapter,
    onListen,
}: {
    chapters: Chapter[];
    currentChapter: number;
    onListen: (chapterId: number) => void;
}) {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const [chapterId, setChapterId] = useState<number>(chapters[currentChapter]?.id ?? chapters[0]?.id ?? 0);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [voiceUri, setVoiceUri] = useState('');

    useEffect(() => {
        if (!supported) return;
        const fill = () => setVoices(window.speechSynthesis.getVoices());
        fill();
        window.speechSynthesis.addEventListener('voiceschanged', fill);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', fill);
    }, [supported]);

    useEffect(() => {
        const ch = chapters[currentChapter];
        if (ch) setChapterId(ch.id);
    }, [chapters, currentChapter]);

    useEffect(() => {
        return () => {
            if (supported) window.speechSynthesis.cancel();
        };
    }, [supported]);

    const stop = () => {
        if (!supported) return;
        window.speechSynthesis.cancel();
        setPlayingId(null);
    };

    const play = () => {
        if (!supported) {
            toast.error('Audio is not supported in this browser.');
            return;
        }
        stop();
        const chapter = chapters.find((c) => c.id === chapterId);
        if (!chapter) return;
        const text = buildChapterText(chapter);
        if (!text.trim()) {
            toast.warning('This chapter has no readable text.');
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = /[\u1200-\u137F]/.test(text) ? 'am-ET' : 'en-US';
        if (voiceUri) {
            const voice = voices.find((v) => v.voiceURI === voiceUri);
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            }
        }
        utterance.onend = () => setPlayingId(null);
        utterance.onerror = () => setPlayingId(null);
        utterance.onstart = () => onListen(chapter.id);
        setPlayingId(chapter.id);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3">
            <span className="text-sm font-bold text-brand-900">🎧 Listen</span>
            <select
                value={chapterId}
                onChange={(e) => setChapterId(Number(e.target.value))}
                className="min-w-0 max-w-[260px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:ring-brand-500"
            >
                {chapters.map((c, i) => (
                    <option key={c.id} value={c.id}>
                        Chapter {i + 1}: {c.name}
                    </option>
                ))}
            </select>
            {voices.length > 0 && (
                <select
                    value={voiceUri}
                    onChange={(e) => setVoiceUri(e.target.value)}
                    className="min-w-0 max-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:ring-brand-500"
                >
                    <option value="">Auto voice</option>
                    {voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name}
                        </option>
                    ))}
                </select>
            )}
            <div className="ml-auto flex items-center gap-2">
                <button
                    onClick={play}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                    {playingId != null ? '⏳ Playing…' : '▶ Play'}
                </button>
                <button
                    onClick={stop}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                    ⏹ Stop
                </button>
            </div>
        </div>
    );
}

export default function BookReader() {
    const { bookId } = useParams();
    const navigate = useNavigate();

    const [book, setBook] = useState<BookData | null>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<ReadingMode>('scroll');
    const [currentChapter, setCurrentChapter] = useState(0);
    const [tocOpen, setTocOpen] = useState(false);

    // Refs for scroll-mode chapter tracking
    const chapterRefs = useRef<Map<number, HTMLElement>>(new Map());
    const [visibleChapter, setVisibleChapter] = useState(0);

    const chapters = useMemo(() => book?.chapters ?? [], [book]);
    const firstLockedIndex = chapters.findIndex((ch) => ch.is_unlocked === false);
    const visibleChapters = useMemo(() => {
        const firstLockedIndex = chapters.findIndex((ch) => ch.is_unlocked === false);
        return firstLockedIndex === -1 ? chapters : chapters.slice(0, firstLockedIndex + 1);
    }, [chapters]);

    const load = useCallback(async () => {
        if (!bookId) return;
        setLoading(true);
        try {
            const { data } = await api.get<{ book: BookData }>(`/reader/books/${bookId}`);
            setBook(data.book);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [bookId]);

    useEffect(() => { void load(); }, [load]);

    // Progress tracking: report a chapter as read/listened once per session.
    // The server keeps the max percent, so repeat visits only ever raise it.
    const reportedChapters = useRef<Set<number>>(new Set());

    const reportProgress = useCallback((chapterId: number, type: 'read' | 'listen') => {
        if (!chapterId || reportedChapters.current.has(chapterId)) return;
        reportedChapters.current.add(chapterId);
        api.post('/student/progress', { node_id: chapterId, type, percent: 100 }).catch(() => {});
    }, []);

    const reportRead = useCallback((chapterId: number) => reportProgress(chapterId, 'read'), [reportProgress]);
    const reportListen = useCallback((chapterId: number) => reportProgress(chapterId, 'listen'), [reportProgress]);

    // Intersection observer for scroll mode chapter tracking
    useEffect(() => {
        if (mode !== 'scroll' || !book) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const idx = Number(entry.target.getAttribute('data-chapter-index'));
                        if (!isNaN(idx)) setVisibleChapter(idx);
                    }
                }
            },
            { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
        );

        // Small delay to let DOM render
        const timeout = setTimeout(() => {
            chapterRefs.current.forEach((el) => observer.observe(el));
        }, 100);

        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, [mode, book]);

    // Keyboard navigation for page mode
    useEffect(() => {
        if (mode !== 'page' || !book) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setCurrentChapter((prev) => Math.min(prev + 1, visibleChapters.length - 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setCurrentChapter((prev) => Math.max(prev - 1, 0));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [mode, book, visibleChapters]);

    // Scroll to top on page-mode chapter change
    useEffect(() => {
        if (mode === 'page') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentChapter, mode]);

    const scrollToChapter = useCallback((index: number) => {
        const el = chapterRefs.current.get(index);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTocOpen(false);
    }, []);

    const activeChapter = mode === 'scroll' ? visibleChapter : currentChapter;
    const progress = visibleChapters.length > 0 ? ((activeChapter + 1) / visibleChapters.length) * 100 : 0;

    // Report the currently active chapter as read (both scroll & page modes).
    useEffect(() => {
        const ch = visibleChapters[activeChapter];
        if (ch && ch.is_unlocked !== false) {
            reportRead(ch.id);
        }
    }, [activeChapter, visibleChapters, reportRead]);

    // --- Loading / error states ---
    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <BookOpenIcon className="mx-auto h-12 w-12 animate-pulse text-brand-400" />
                    <p className="mt-3 text-sm text-gray-500">Loading book…</p>
                </div>
            </div>
        );
    }

    if (!book) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Book not found</h3>
                    <Button variant="secondary" className="mt-4" onClick={() => navigate('/library')}>
                        <ArrowLeftIcon className="h-4 w-4" /> Back to Library
                    </Button>
                </div>
            </div>
        );
    }

    if (chapters.length === 0) {
        return (
            <div>
                <ReaderToolbar
                    book={book}
                    mode={mode}
                    onModeChange={setMode}
                    activeChapter={0}
                    totalChapters={0}
                    progress={0}
                    onBack={() => navigate('/library')}
                    onTocToggle={() => setTocOpen(!tocOpen)}
                />
                <Card className="mt-4">
                    <CardBody>
                        <div className="py-16 text-center">
                            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No content yet</h3>
                            <p className="mt-1 text-sm text-gray-500">This book doesn't have any chapters with content.</p>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Top toolbar */}
            <ReaderToolbar
                book={book}
                mode={mode}
                onModeChange={setMode}
                activeChapter={activeChapter}
                totalChapters={visibleChapters.length}
                progress={progress}
                onBack={() => navigate('/library')}
                onTocToggle={() => setTocOpen(!tocOpen)}
            />

            {/* Chapter audio player */}
            {chapters.length > 0 && (
                <div className="mx-auto mt-4 max-w-3xl px-4">
                    <ChapterAudioPlayer chapters={chapters} currentChapter={activeChapter} onListen={reportListen} />
                </div>
            )}

            {/* Table of contents sidebar */}
            {tocOpen && (
                <div className="fixed inset-0 z-40">
                    <div className="fixed inset-0 bg-gray-900/30" onClick={() => setTocOpen(false)} />
                    <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                            <h3 className="text-sm font-bold text-gray-900">Table of Contents</h3>
                            <button onClick={() => setTocOpen(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <nav className="p-3">
                            {visibleChapters.map((ch, idx) => (
                                <button
                                    key={ch.id}
                                    onClick={() => {
                                        if (mode === 'scroll') scrollToChapter(idx);
                                        else { setCurrentChapter(idx); setTocOpen(false); }
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                        idx === activeChapter
                                            ? 'bg-brand-50 font-semibold text-brand-700'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                                        {ch.is_unlocked === false ? '🔒' : idx + 1}
                                    </span>
                                    <span className="truncate">{ch.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Reading content */}
            <div className="mx-auto mt-6 max-w-3xl px-4">
                {mode === 'scroll' ? (
                    /* ── SCROLL MODE ── */
                    <div className="space-y-0">
                        {visibleChapters.map((ch, idx) => {
                            const isLocked = ch.is_unlocked === false;
                            return (
                                <section
                                    key={ch.id}
                                    ref={(el) => { if (el) chapterRefs.current.set(idx, el); }}
                                    data-chapter-index={idx}
                                    className="scroll-mt-24"
                                >
                                    {/* Chapter divider */}
                                    <div className={`${idx > 0 ? 'mt-14 border-t border-gray-200 pt-10' : ''} mb-8`}>
                                        <div className="flex items-center justify-between">
                                            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-brand-500">
                                                Chapter {idx + 1}
                                            </span>
                                            {isLocked && (
                                                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                                    🔒 Locked
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 lg:text-3xl">{ch.name}</h2>
                                        {ch.description && (
                                            <p className="mt-2 text-gray-500">{ch.description}</p>
                                        )}
                                    </div>

                                    {isLocked ? (
                                        /* Chapter Lock Screen */
                                        <div className="my-8 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-8 text-center">
                                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white text-2xl shadow-md">
                                                🔒
                                            </div>
                                            <h3 className="mt-4 text-xl font-bold text-amber-950">Chapter {idx + 1} is Locked</h3>
                                            <p className="mt-2 max-w-md mx-auto text-sm text-amber-800">
                                                To unlock this chapter, you must attempt and pass <strong>Chapter {idx}'s End-of-Chapter Exam</strong>.
                                            </p>
                                            <Button
                                                variant="primary"
                                                className="mt-5 bg-amber-600 hover:bg-amber-700 text-white"
                                                onClick={() => scrollToChapter(idx - 1)}
                                            >
                                                Go to Chapter {idx} Exam →
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Content blocks */}
                                            <div className="space-y-6">
                                                {ch.content_blocks.map((block) => (
                                                    <BlockRenderer key={block.id} block={block} />
                                                ))}
                                            </div>

                                            {ch.content_blocks.length === 0 && (
                                                <p className="py-6 text-center text-sm italic text-gray-400">
                                                    No content in this chapter yet.
                                                </p>
                                            )}

                                            {/* End of Chapter Exam */}
                                            {ch.exam && (
                                                <ChapterExamCard
                                                    exam={ch.exam}
                                                    chapterName={ch.name}
                                                    onSuccess={() => void load()}
                                                />
                                            )}
                                        </>
                                    )}
                                </section>
                            );
                        })}

                        {/* End of book */}
                        {firstLockedIndex === -1 && (
                            <div className="mt-16 border-t border-gray-200 py-12 text-center">
                                <BookOpenIcon className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-3 text-sm font-medium text-gray-500">End of Book</p>
                                <Button variant="secondary" className="mt-4" onClick={() => navigate('/library')}>
                                    <ArrowLeftIcon className="h-4 w-4" /> Back to Library
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── PAGE MODE ── */
                    <div>
                        {/* Current chapter content */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between">
                                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-brand-500">
                                    Chapter {currentChapter + 1} of {visibleChapters.length}
                                </span>
                                {visibleChapters[currentChapter].is_unlocked === false && (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                        🔒 Locked
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 lg:text-3xl">
                                {visibleChapters[currentChapter].name}
                            </h2>
                            {visibleChapters[currentChapter].description && (
                                <p className="mt-2 text-gray-500">{visibleChapters[currentChapter].description}</p>
                            )}
                        </div>

                        {visibleChapters[currentChapter].is_unlocked === false ? (
                            /* Chapter Lock Screen */
                            <div className="my-8 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-8 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white text-2xl shadow-md">
                                    🔒
                                </div>
                                <h3 className="mt-4 text-xl font-bold text-amber-950">Chapter {currentChapter + 1} is Locked</h3>
                                <p className="mt-2 max-w-md mx-auto text-sm text-amber-800">
                                    To unlock this chapter, you must attempt and pass <strong>Chapter {currentChapter}'s End-of-Chapter Exam</strong>.
                                </p>
                                <Button
                                    variant="primary"
                                    className="mt-5 bg-amber-600 hover:bg-amber-700 text-white"
                                    onClick={() => setCurrentChapter(currentChapter - 1)}
                                >
                                    Go to Chapter {currentChapter} Exam →
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-6">
                                    {visibleChapters[currentChapter].content_blocks.map((block) => (
                                        <BlockRenderer key={block.id} block={block} />
                                    ))}
                                </div>

                                {visibleChapters[currentChapter].content_blocks.length === 0 && (
                                    <Card className="mt-4">
                                        <CardBody>
                                            <p className="py-8 text-center text-sm italic text-gray-400">
                                                No content in this chapter yet.
                                            </p>
                                        </CardBody>
                                    </Card>
                                )}

                                {/* End of Chapter Exam */}
                                {visibleChapters[currentChapter].exam && (
                                    <ChapterExamCard
                                        exam={visibleChapters[currentChapter].exam!}
                                        chapterName={visibleChapters[currentChapter].name}
                                        onSuccess={() => void load()}
                                    />
                                )}
                            </>
                        )}

                        {/* Previous / Next navigation */}
                        <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-6">
                            <div>
                                {currentChapter > 0 ? (
                                    <button
                                        onClick={() => setCurrentChapter(currentChapter - 1)}
                                        className="group flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                                    >
                                        <ChevronLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                                        <div className="text-left">
                                            <span className="block text-xs text-gray-400">Previous</span>
                                            <span className="block max-w-[140px] truncate sm:max-w-[200px]">{visibleChapters[currentChapter - 1].name}</span>
                                        </div>
                                    </button>
                                ) : (
                                    <div />
                                )}
                            </div>

                            <div>
                                {currentChapter < visibleChapters.length - 1 ? (
                                    <button
                                        onClick={() => setCurrentChapter(currentChapter + 1)}
                                        disabled={visibleChapters[currentChapter + 1]?.is_unlocked === false}
                                        className={`group flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                                            visibleChapters[currentChapter + 1]?.is_unlocked === false
                                                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                                        }`}
                                    >
                                        <div className="text-right">
                                            <span className="block text-xs text-gray-400">Next</span>
                                            <span className="block max-w-[140px] truncate sm:max-w-[200px]">
                                                {visibleChapters[currentChapter + 1]?.is_unlocked === false ? '🔒 Locked' : visibleChapters[currentChapter + 1].name}
                                            </span>
                                        </div>
                                        <ChevronRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                ) : (
                                    <Button variant="secondary" onClick={() => navigate('/library')}>
                                        <ArrowLeftIcon className="h-4 w-4" /> Back to Library
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Sticky toolbar at the top of the reader */
function ReaderToolbar({
    book,
    mode,
    onModeChange,
    activeChapter,
    totalChapters,
    progress,
    onBack,
    onTocToggle,
}: {
    book: BookData;
    mode: ReadingMode;
    onModeChange: (m: ReadingMode) => void;
    activeChapter: number;
    totalChapters: number;
    progress: number;
    onBack: () => void;
    onTocToggle: () => void;
}) {
    const breadcrumb = [book.category?.name, book.grade?.name].filter(Boolean).join(' · ');

    return (
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
                {/* Back */}
                <button
                    onClick={onBack}
                    className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Back to library"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                {/* Title + breadcrumb */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{book.name}</p>
                    {breadcrumb && (
                        <p className="truncate text-xs text-gray-400">{breadcrumb}</p>
                    )}
                </div>

                {/* Chapter indicator */}
                {totalChapters > 0 && (
                    <span className="hidden text-xs text-gray-400 sm:block">
                        Ch. {activeChapter + 1}/{totalChapters}
                    </span>
                )}

                {/* TOC toggle */}
                <button
                    onClick={onTocToggle}
                    className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Table of contents"
                >
                    <ListBulletIcon className="h-5 w-5" />
                </button>

                {/* Mode toggle */}
                <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-gray-200">
                    <button
                        onClick={() => onModeChange('scroll')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            mode === 'scroll'
                                ? 'bg-brand-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                        title="Scroll mode — continuous reading"
                    >
                        <Bars3BottomLeftIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Scroll</span>
                    </button>
                    <button
                        onClick={() => onModeChange('page')}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            mode === 'page'
                                ? 'bg-brand-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                        title="Page mode — one chapter at a time"
                    >
                        <BookOpenIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Page</span>
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full bg-gray-100">
                <div
                    className="h-full bg-brand-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
