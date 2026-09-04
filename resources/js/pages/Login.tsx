import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../api/client';
import { Button, Input } from '../components/ui';
import { localeNames, locales, type Locale } from '../i18n';

export default function Login() {
    const { login } = useAuth();
    const { locale, setLocale, t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('edup_remember_email') ?? '';
        return '';
    });
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const loggedInUser = await login(email, password);
            if (rememberMe) {
                localStorage.setItem('edup_remember_email', email);
            } else {
                localStorage.removeItem('edup_remember_email');
            }
            toast.success(t('auth.loginSuccess'));

            const roles = loggedInUser.roles?.map((r) => r.name) ?? [];
            if (roles.includes('school')) {
                navigate('/school/dashboard', { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            toast.error(getErrorMessage(err));
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

            {/* Right: login form */}
            <div className="flex w-full items-center justify-center bg-gradient-to-br from-brand-50 to-cream-100 px-6 py-12 lg:w-2/3 dark:from-night-100 dark:to-night-100">
                <div className="w-full max-w-lg">
                    <div className="mb-10 text-center">
                        <img src="/Logo.png" alt="EduPlatform Logo" className="mx-auto mb-5 h-20 w-auto object-contain drop-shadow-sm" />
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">{t('auth.welcome')}</h1>
                        <p className="mt-3 text-base text-gray-600 dark:text-gray-300">{t('auth.loginSubtitle')}</p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 px-10 py-12 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                label={t('auth.email')}
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('auth.emailPlaceholder')}
                                autoComplete="email"
                                required
                            />
                            <Input
                                label={t('auth.password')}
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('auth.passwordPlaceholder')}
                                autoComplete="current-password"
                                required
                            />
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('auth.rememberMe')}</span>
                                </label>
                            </div>
                            <Button type="submit" className="w-full py-3 text-base" loading={loading}>
                                {t('auth.signIn')}
                            </Button>
                        </form>
                    </div>

                    <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('auth.noAccount')}{' '}
                        <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
                            {t('auth.register')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
