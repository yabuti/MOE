import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { Button, Input } from '../components/ui';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(getErrorMessage(err));
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

                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                        )}
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                        <Button type="submit" className="w-full" loading={loading}>
                            Sign in
                        </Button>
                    </form>
                </div>

                <p className="mt-6 text-center text-xs text-gray-500">
                    Demo: admin@moe.com / password
                </p>
            </div>
        </div>
    );
}
