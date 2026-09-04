import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../api/client';
import { Button, Input } from '../components/ui';

export default function Login() {
    const { login } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const loggedInUser = await login(email, password);
            toast.success(t('auth.loginSuccess'));

            // Redirect based on role
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

            {/* Left half: image */}
            <div
                className="hidden w-1/2 bg-cover bg-center lg:block"
                style={{ backgroundImage: "url('/login.jfif')" }}
            />

            {/* Right half: login form */}
            <div className="flex w-full items-center justify-center bg-gradient-to-br from-brand-50 to-cream-100 px-4 py-10 lg:w-1/2 dark:from-night-100 dark:to-night-100">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <img src="/Logo.png" alt="EduPlatform Logo" className="mx-auto mb-6 h-16 w-auto object-contain drop-shadow-sm" />
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('auth.loginTitle')}</h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('auth.loginSubtitle')}</p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 p-8 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label={t('auth.emailPlaceholder')}
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                            />
                            <Input
                                label={t('auth.passwordPlaceholder')}
                                name="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            <Button type="submit" className="w-full" loading={loading}>
                                {t('auth.signIn')}
                            </Button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                        {t('auth.demo')}
                    </p>
                </div>
            </div>
        </div>
    );
}
