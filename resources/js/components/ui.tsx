import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

const baseButton =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-xs';

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-night-200 dark:text-gray-200 dark:border-night-300 dark:hover:bg-night-300 dark:hover:border-night-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-night-200',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    loading?: boolean;
}

export function Button({ variant = 'primary', loading, className = '', children, disabled, ...props }: ButtonProps) {
    return (
        <button className={`${baseButton} ${buttonVariants[variant]} ${className}`} disabled={disabled || loading} {...props}>
            {loading && <Spinner className="h-4 w-4" />}
            {children}
        </button>
    );
}

const inputBase =
    'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:bg-white focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs dark:border-night-300 dark:bg-night-200 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-night-200 dark:disabled:bg-night-100';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
    const inputId = id ?? props.name;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <input id={inputId} className={`${inputBase} ${error ? 'border-red-500' : ''}`} {...props} />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
    const textareaId = id ?? props.name;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={textareaId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <textarea id={textareaId} className={`${inputBase} ${error ? 'border-red-500' : ''}`} {...props} />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    children: ReactNode;
}

export function Select({ label, error, className = '', id, children, ...props }: SelectProps) {
    const selectId = id ?? props.name;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <select id={selectId} className={`${inputBase} ${error ? 'border-red-500' : ''}`} {...props}>
                {children}
            </select>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
    return <div className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-night-300 dark:bg-night-100 ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-night-300">
            <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                {subtitle && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}

export function CardBody({ className = '', children }: { className?: string; children: ReactNode }) {
    return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

type BadgeVariant = 'gray' | 'green' | 'red' | 'yellow' | 'blue' | 'purple';

const badgeVariants: Record<BadgeVariant, string> = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-night-300 dark:text-gray-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
};

export function Badge({ variant = 'gray', children, className = '' }: { variant?: BadgeVariant; children: ReactNode; className?: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeVariants[variant]} ${className}`}>
            {children}
        </span>
    );
}

export function statusVariant(status: string): BadgeVariant {
    switch (status) {
        case 'published':
        case 'active':
            return 'green';
        case 'draft':
        case 'pending':
            return 'yellow';
        case 'archived':
        case 'inactive':
            return 'gray';
        case 'deleted':
            return 'red';
        default:
            return 'gray';
    }
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className} text-current`} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export function PageLoader() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-8 w-8 text-brand-600" />
        </div>
    );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-night-300 dark:bg-night-200/40">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    panelClassName?: string;
}

const modalSizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md', panelClassName = '' }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
            <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
            <div className={`relative z-10 my-8 w-full ${modalSizes[size]} rounded-xl bg-white shadow-xl dark:bg-night-100 dark:border dark:border-night-300 ${panelClassName}`}>
                <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-night-300">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-night-200">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-night-300">{footer}</div>}
            </div>
        </div>
    );
}

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', loading, onConfirm, onClose }: ConfirmDialogProps) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        </Modal>
    );
}

interface PaginationProps {
    page: number;
    lastPage: number;
    total: number;
    onPage: (page: number) => void;
}

export function Pagination({ page, lastPage, total, onPage }: PaginationProps) {
    if (lastPage <= 1) return null;
    return (
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-night-300">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {lastPage} · {total} total
            </p>
            <div className="flex items-center gap-1">
                <Button variant="secondary" className="px-3 py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                    Prev
                </Button>
                <Button variant="secondary" className="px-3 py-1.5" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
                    Next
                </Button>
            </div>
        </div>
    );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-night-300">
                <thead className="bg-gray-50 dark:bg-night-200">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-night-300 dark:bg-night-100">{children}</tbody>
            </table>
        </div>
    );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}
