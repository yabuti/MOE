import { useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button, Card, CardBody, Input } from '../components/ui';
import { NameFields, combineName, splitName, type NameParts } from '../components/NameFields';

export default function Profile() {
    const { user, refreshUser } = useAuth();
    const { t } = useLanguage();
    const [nameParts, setNameParts] = useState<NameParts>(() => splitName(user?.name ?? ''));
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put<{ user: typeof user }>('/profile', { name: combineName(nameParts) });
            await refreshUser();
            toast.success(t('profile.updatedSuccessfully'));
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-md py-10">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
            <Card>
                <CardBody>
                    <div className="mb-5 flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                            {user?.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{user?.roles?.map((r) => r.name).join(', ') || t('common.member')}</p>
                        </div>
                    </div>

                    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                        <NameFields value={nameParts} onChange={setNameParts} />
                        <Input label={t('common.email')} value={user?.email ?? ''} disabled />
                        <Button type="submit" loading={saving}>{t('profile.saveChanges')}</Button>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}
