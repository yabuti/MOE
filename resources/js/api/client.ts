import axios, { AxiosError } from 'axios';

export const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

const TOKEN_KEY = 'eisd_token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            removeToken();
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            const obj = data as { message?: string; errors?: Record<string, string[]> };
            if (obj.errors && typeof obj.errors === 'object') {
                const firstKey = Object.keys(obj.errors)[0];
                if (firstKey) {
                    const first = obj.errors[firstKey];
                    if (Array.isArray(first) && first.length > 0) {
                        return first[0];
                    }
                }
            }
            if (typeof obj.message === 'string' && obj.message) {
                return obj.message;
            }
        }
        if (error.response?.status === 413) {
            return 'The file exceeds the upload size limit.';
        }
        if (error.code === 'ECONNABORTED') {
            return 'The request timed out.';
        }
        return error.message;
    }
    return 'Something went wrong.';
}
