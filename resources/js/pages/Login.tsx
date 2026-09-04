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

        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-cream-100 px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <img
                        src="/assets/logo.png"
                        alt="MOE Admin Panel"
                        className="mx-auto mb-4 h-14 w-14 rounded-2xl object-contain"
                    />
                    <h1 className="text-2xl font-bold text-gray-900">MOE Admin Panel</h1>
                    <p className="mt-1 text-sm text-gray-500">Sign in to manage the e-content platform</p>
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
    );
}
