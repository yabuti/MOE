import { Input } from './ui';
import { useLanguage } from '../context/LanguageContext';

export interface NameParts {
    first_name: string;
    middle_name: string;
    last_name: string;
}

/**
 * Build a full name from parts. Joins with single spaces, skipping empty parts.
 */
export function combineName(parts: NameParts): string {
    return [parts.first_name, parts.middle_name, parts.last_name]
        .map((p) => p.trim())
        .filter(Boolean)
        .join(' ');
}

/**
 * Split a full name string into parts (used when editing an existing record).
 * "First Middle Last" -> first_name=First, middle_name=Middle, last_name=Last.
 * Falls back to putting everything in first_name when it can't be split cleanly.
 */
export function splitName(fullName: string): NameParts {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
        first_name: parts[0] ?? '',
        middle_name: parts[1] ?? '',
        last_name: parts.length > 2 ? parts.slice(2).join(' ') : '',
    };
}

export function NameFields({
    value,
    onChange,
    onlyFirstAndLast = false,
}: {
    value: NameParts;
    onChange: (parts: NameParts) => void;
    onlyFirstAndLast?: boolean;
}) {
    const { t } = useLanguage();
    const set = (key: keyof NameParts) => (e: React.ChangeEvent<HTMLInputElement>) =>
        onChange({ ...value, [key]: e.target.value });

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label={t('profile.firstName')} value={value.first_name} onChange={set('first_name')} required />
            {!onlyFirstAndLast && (
                <Input label={t('profile.middleName')} value={value.middle_name} onChange={set('middle_name')} />
            )}
            <Input label={t('profile.lastName')} value={value.last_name} onChange={set('last_name')} required />
        </div>
    );
}
