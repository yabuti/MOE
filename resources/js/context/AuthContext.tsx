import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { api, getToken, removeToken, setToken } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<User | null>;
    hasRole: (...roles: string[]) => boolean;
    hasPermission: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(() => Boolean(getToken()));

    const fetchUser = useCallback(async (): Promise<void> => {
        try {
            const { data } = await api.get('/user');
            const loaded = data.user as User;
            loaded.permissions = loaded.permissions ?? [];
            setUser(loaded);
        } catch {
            setUser(null);
            removeToken();
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (getToken()) {
            void fetchUser();
        }
    }, [fetchUser]);

    const login = useCallback(async (email: string, password: string): Promise<User> => {
        const { data } = await api.post('/login', { email, password });
        setToken(data.token);
        const loaded = data.user as User;
        loaded.permissions = loaded.permissions ?? [];
        setUser(loaded);
        return loaded;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/logout');
        } catch {
            // ignore logout errors
        }
        removeToken();
        setUser(null);
    }, []);

    const refreshUser = useCallback(async (): Promise<User | null> => {
        try {
            const { data } = await api.get('/user');
            const loaded = data.user as User;
            loaded.permissions = loaded.permissions ?? [];
            setUser(loaded);
            return loaded;
        } catch {
            return null;
        }
    }, []);

    const hasRole = useCallback(
        (...roles: string[]) => {
            const userRoles = user?.roles?.map((r) => r.name) ?? [];
            return roles.some((role) => userRoles.includes(role));
        },
        [user],
    );

    const hasPermission = useCallback(
        (...permissions: string[]) => {
            const userPermissions = user?.permissions ?? [];
            return permissions.some((p) => userPermissions.includes(p));
        },
        [user],
    );

    const value = useMemo(
        () => ({ user, loading, login, logout, refreshUser, hasRole, hasPermission }),
        [user, loading, login, logout, refreshUser, hasRole, hasPermission],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
