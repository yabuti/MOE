import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button, Card, CardBody, Input } from '../components/ui';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { NameFields, combineName, splitName, type NameParts } from '../components/NameFields';

export default function Profile() {
    const { user, refreshUser } = useAuth();
    const { t } = useLanguage();
    const [nameParts, setNameParts] = useState<NameParts>(() => splitName(user?.name ?? ''));
    const [avatar, setAvatar] = useState<File | null>(null);
    const avatarRef = useRef<HTMLInputElement>(null);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', combineName(nameParts));
            formData.append('_method', 'PUT');
            if (avatar) formData.append('avatar', avatar);
            await api.post<{ user: typeof user }>('/profile', formData);
            setAvatar(null);
            if (avatarRef.current) avatarRef.current.value = '';
            await refreshUser();
            toast.success(t('profile.updatedSuccessfully'));
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const avatarSrc = avatar ? URL.createObjectURL(avatar) : user?.avatar_url;

    return (
        <div className="mx-auto max-w-md py-10">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">{t('profile.title')}</h1>
            <Card>
                <CardBody>
                    <div className="mb-5 flex items-center gap-4">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={user?.name} className="h-14 w-14 rounded-full object-cover border border-gray-200 dark:border-night-300" />
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                                {user?.name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                        )}
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{user?.roles?.map((r) => r.name).join(', ') || t('common.member')}</p>
                        </div>
                    </div>
                    <div className="mb-4 flex items-center gap-3">
                        <input
                            ref={avatarRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
                        />
                        <Button variant="secondary" type="button" onClick={() => avatarRef.current?.click()}>
                            <PhotoIcon className="h-4 w-4" />
                            {t('common.chooseImage')}
                        </Button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{avatar ? avatar.name : t('common.noImageSelected')}</span>
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
