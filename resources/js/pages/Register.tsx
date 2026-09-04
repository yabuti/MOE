import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';
import { Button, Input } from '../components/ui';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { localeNames, locales, type Locale } from '../i18n';

export default function Register() {
    const { locale, setLocale, t } = useLanguage();
    const navigate = useNavigate();
    const [langOpen, setLangOpen] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const avatarRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (password !== passwordConfirm) {
            toast.error(t('auth.passwordsNoMatch'));
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('password_confirmation', passwordConfirm);
            if (avatar) formData.append('avatar', avatar);

            const response = await fetch('/api/v1/parent/register', {
                method: 'POST',
                headers: { Accept: 'application/json' },
                body: formData,
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || t('auth.registrationFailed'));
            }
            toast.success(t('auth.registrationSuccess'));
            navigate('/login', { replace: true });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : t('auth.registrationFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-brand-50 dark:bg-night-900">
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop closeOnClick pauseOnHover={false} draggable />

            {/* Language toggle - top right */}
            <div className="absolute top-4 right-4 z-10">
                <div className="relative">
                    <button
                        onClick={() => setLangOpen((o) => !o)}
                        className="flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 shadow-sm hover:bg-gray-50 dark:border-night-300 dark:bg-night-100 dark:text-gray-300 dark:hover:bg-night-200"
                        title={localeNames[locale]}
                    >
                        {locale.toUpperCase()}
                    </button>
                    {langOpen && (
                        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-night-300 dark:bg-night-100">
                            {locales.map((l: Locale) => (
                                <button
                                    key={l}
                                    onClick={() => { setLocale(l); setLangOpen(false); }}
                                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                                        l === locale
                                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-night-200'
                                    }`}
                                >
                                    {localeNames[l]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Left: image */}
            <div
                className="hidden w-1/3 bg-cover bg-center lg:block"
                style={{ backgroundImage: "url('/login.jfif')" }}
            />

            {/* Right: register form */}
            <div className="flex w-full items-center justify-center bg-gradient-to-br from-brand-50 to-cream-100 px-6 py-12 lg:w-2/3 dark:from-night-100 dark:to-night-100">
                <div className="w-full max-w-lg">
                    <div className="mb-10 text-center">
                        <img src="/Logo.png" alt="EduPlatform Logo" className="mx-auto mb-5 h-20 w-auto object-contain drop-shadow-sm" />
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">{t('auth.registerTitle')}</h1>
                        <p className="mt-3 text-base text-gray-600 dark:text-gray-300">{t('auth.registerSubtitle')}</p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 px-10 py-12 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label={t('auth.firstName')} name="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                                <Input label={t('auth.lastName')} name="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                            </div>
                            <Input label={t('auth.email')} name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholder')} required />
                            <Input label={t('auth.password')} name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')} required />
                            <Input label={t('auth.confirmPassword')} name="password_confirmation" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder={t('auth.passwordPlaceholder')} required />

                            <div>
                                <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.avatar')}</p>
                                <div className="flex items-center gap-3">
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
                                    {avatar && (
                                        <img
                                            src={URL.createObjectURL(avatar)}
                                            alt="avatar"
                                            className="h-11 w-11 rounded-full object-cover border border-gray-200 dark:border-night-300"
                                        />
                                    )}
                                    {!avatar && (
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.noImageSelected')}</span>
                                    )}
                                </div>
                                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{t('common.avatarHint')}</p>
                            </div>

                            <Button type="submit" className="w-full py-3 text-base" loading={loading}>
                                {t('auth.register')}
                            </Button>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('auth.hasAccount')}{' '}
                        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                            {t('auth.signIn')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
