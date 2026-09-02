import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { Button, Input } from '../components/ui';

export default function Login() {
    const { login } = useAuth();
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
            await login(email, password);
            toast.success('Signed in successfully');
            navigate(from, { replace: true });
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-brand-50">
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop closeOnClick pauseOnHover={false} draggable />

            {/* Left half: image */}
            <div
                className="hidden w-1/2 bg-cover bg-center lg:block"
                style={{ backgroundImage: "url('/image.webp')" }}
            />

            {/* Right half: login form */}
            <div className="flex w-full items-center justify-center bg-gradient-to-br from-brand-50 to-cream-100 px-4 py-10 lg:w-1/2">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <img src="/Logo.png" alt="EduPlatform Logo" className="mx-auto mb-6 h-16 w-auto object-contain drop-shadow-sm" />
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sign in to EduPlatform</h1>
                        <p className="mt-2 text-sm text-gray-600">Please enter your credentials to continue</p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-4">
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
        </div>
    );
}
