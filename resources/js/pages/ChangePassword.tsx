import { useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardBody, Button, Input } from '../components/ui';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export default function ChangePassword() {
    const { t } = useLanguage();
    const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/change-password', form);
            toast.success(t('password.success'));
            setForm({ current_password: '', new_password: '', new_password_confirmation: '' });
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-md py-10">
            <div className="mb-6 flex items-center gap-3">
                <LockClosedIcon className="h-8 w-8 text-brand-600 dark:text-brand-300" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('password.title')}</h1>
            </div>
            <Card>
                <CardBody>
                    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                        <Input
                            label={t('password.currentPassword')}
                            type="password"
                            value={form.current_password}
                            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                            required
                        />
                        <Input
                            label={t('password.newPassword')}
                            type="password"
                            value={form.new_password}
                            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                            required
                            minLength={6}
                        />
                        <Input
                            label={t('password.confirmNewPassword')}
                            type="password"
                            value={form.new_password_confirmation}
                            onChange={(e) => setForm({ ...form, new_password_confirmation: e.target.value })}
                            required
                        />
                        <Button type="submit" loading={saving}>{t('password.update')}</Button>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}
