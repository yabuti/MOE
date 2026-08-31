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
        const data = error.response?.data as
            | { message?: string }
            | { errors?: Record<string, string[]> }
            | undefined;
        if (data && 'errors' in data && data.errors) {
            const firstKey = Object.keys(data.errors)[0];
            if (firstKey) {
                return data.errors[firstKey][0];
            }
        }
        if (data && 'message' in data && data.message) {
            return data.message;
        }
        return error.message;
    }
    return 'Something went wrong.';
}
