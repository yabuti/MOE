import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { localeNames, locales, type Locale } from '../i18n';
import {
    AcademicCapIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    BookOpenIcon,
    BuildingOfficeIcon,
    ChartBarIcon,
    ChevronUpIcon,
    DocumentArrowUpIcon,
    FolderIcon,
    HomeIcon,
    InboxIcon,
    KeyIcon,
    MoonIcon,
    ShieldCheckIcon,

    TagIcon,
    UserCircleIcon,
    UserGroupIcon,
    UsersIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

const navigation: Array<{
    name: string;
    to: string;
    icon: (typeof HomeIcon);
    permission?: string;
    roles?: string[];
}> = [
    // Admin items (shown for admin role)
    { name: 'Dashboard', to: '/', icon: HomeIcon, permission: 'view dashboard' },
    { name: 'Schools', to: '/schools', icon: BuildingOfficeIcon, permission: 'view schools' },
    { name: 'Users', to: '/users', icon: UsersIcon, permission: 'view users' },
    { name: 'Roles', to: '/roles', icon: ShieldCheckIcon, permission: 'view roles' },
    // { name: 'Node Types', to: '/node-types', icon: TagIcon, permission: 'view node types' },
    { name: 'Catalog', to: '/catalog', icon: FolderIcon, permission: 'view catalog' },
    { name: 'Import Books', to: '/import-books', icon: DocumentArrowUpIcon, permission: 'import books' },
    { name: 'Content', to: '/content', icon: BookOpenIcon, permission: 'view content' },
    { name: 'Exams', to: '/exams', icon: AcademicCapIcon, permission: 'view exams' },
    { name: 'Audit Logs', to: '/audit-logs', icon: InboxIcon, permission: 'view audit logs' },

    // School items
    { name: 'School Dashboard', to: '/school/dashboard', icon: BuildingOfficeIcon, roles: ['school'] },
    { name: 'Students', to: '/school/students', icon: UsersIcon, roles: ['school'] },

    // Student items
    { name: 'My Progress', to: '/my-progress', icon: ChartBarIcon, roles: ['student'] },

    // Parent items
    { name: 'Parent Dashboard', to: '/parent', icon: UserGroupIcon, roles: ['parent'] },

    // Shared items (available to all roles)
    { name: 'Library', to: '/library', icon: BookOpenIcon },
];

function SidebarLink({ item, onNavigate }: { item: (typeof navigation)[number]; onNavigate: () => void }) {
    const { t } = useLanguage();
    const navKey: Record<string, string> = {
        'Dashboard': 'nav.dashboard',
        'My Progress': 'nav.myProgress',
        'Parent Dashboard': 'nav.parentDashboard',
        'School Dashboard': 'nav.schoolDashboard',
        'Students': 'nav.students',
        'Schools': 'nav.schools',
        'Node Types': 'nav.nodeTypes',
        'Catalog': 'nav.catalog',
        'Import Books': 'nav.importBooks',
        'Content': 'nav.content',
        'Exams': 'nav.exams',
        'Library': 'nav.library',
        'Users': 'nav.users',
        'Roles': 'nav.roles',
        'Audit Logs': 'nav.auditLogs',
        'My Profile': 'nav.myProfile',
        'Change Password': 'nav.changePassword',
    };
    return (
        <NavLink
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-600/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-night-200 dark:hover:text-white'
                }`
            }
        >
            <item.icon className="h-5 w-5 shrink-0" />
            {navKey[item.name] ? t(navKey[item.name]) : item.name}
        </NavLink>
    );
}

function Brand() {
    return (

        <div className="flex items-center gap-3 px-2">
            <img src="/assets/logo.png" alt="MOE Admin" className="h-9 w-9 rounded-lg object-contain" />
            <div>
                <p className="text-sm font-bold leading-tight text-gray-900">MOE Admin</p>
                <p className="text-xs text-gray-500">Ministry of Education</p>
            </div>

        </div>
    );
}

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isAdmin = user?.roles?.some((ur) => ur.name === 'admin');

    const visibleNavigation = navigation.filter((item) => {
        if (item.roles && item.roles.length > 0) {
            return isAdmin || item.roles.some((role) => user?.roles?.some((ur) => ur.name === role));
        }
        return !item.permission || user?.permissions?.includes(item.permission);
    });

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-cream-50 dark:bg-night-900">
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop closeOnClick pauseOnHover={false} draggable />

            {/* Mobile header */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden dark:border-night-200 dark:bg-night-100">
                <div className="flex items-center gap-2">
                    <img src="/Logo.png" alt="System Logo" className="h-8 w-auto object-contain" />
                    <span className="font-bold text-gray-900 dark:text-white">EduPlatform</span>
                </div>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-night-200 dark:hover:text-white"
                >
                    <Bars3Icon className="h-6 w-6" />
                </button>
            </div>

            {/* Sidebar / Drawer */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl dark:bg-night-100">
                        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6 dark:border-night-200">
                            <div className="flex items-center gap-2">
                                <img src="/Logo.png" alt="System Logo" className="h-8 w-auto object-contain" />
                                <span className="text-lg font-bold text-gray-900 dark:text-white">EduPlatform</span>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-night-200">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <SidebarContent user={user} visibleNavigation={visibleNavigation} onNavigate={() => setSidebarOpen(false)} onLogout={handleLogout} />
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex dark:border-night-200 dark:bg-night-100">
                <div className="px-4 py-4">
                    <Brand />
                </div>
                <SidebarContent user={user} visibleNavigation={visibleNavigation} onNavigate={() => {}} onLogout={handleLogout} />
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function SidebarContent({
    user,
    visibleNavigation,
    onNavigate,
    onLogout,
}: {
    user: ReturnType<typeof useAuth>['user'];
    visibleNavigation: typeof navigation;
    onNavigate: () => void;
    onLogout: () => void;
}) {
    const [accountOpen, setAccountOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const { darkMode, toggle } = useTheme();
    const { locale, setLocale, t } = useLanguage();
    const handleNavigate = () => onNavigate();

    return (
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
            <div className="space-y-1">
                {visibleNavigation.map((item) => (
                    <SidebarLink key={item.to} item={item} onNavigate={handleNavigate} />
                ))}
            </div>

            <div className="mt-auto border-t border-gray-200 pt-4 dark:border-night-200">
                <div className="mb-2 flex items-center justify-between">
                    <button
                        onClick={toggle}
                        className="flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-night-200 dark:hover:text-white"
                        title={darkMode ? t('nav.lightMode') : t('nav.darkMode')}
                    >
                        {darkMode ? <SunIcon className="h-5 w-5 text-amber-400" /> : <MoonIcon className="h-5 w-5 text-gray-500" />}
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => { setLangOpen((o) => !o); setAccountOpen(false); }}
                            className="flex items-center justify-center rounded-lg px-2.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-night-200 dark:hover:text-white"
                            title={localeNames[locale]}
                        >
                            {locale.toUpperCase()}
                        </button>
                        {langOpen && (
                            <div className="absolute bottom-full left-0 mb-1 w-36 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-night-200 dark:bg-night-200">
                                {locales.map((l: Locale) => (
                                    <button
                                        key={l}
                                        onClick={() => { setLocale(l); setLangOpen(false); handleNavigate(); }}
                                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                            locale === l
                                                ? 'bg-brand-600/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-night-200 dark:hover:text-white'
                                        }`}
                                    >
                                        {localeNames[l]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setAccountOpen((o) => !o)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-night-200"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                            {user?.name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.roles?.map((r) => r.name).join(', ') || t('common.member')}</p>
                        </div>
                        <ChevronUpIcon className={`h-4 w-4 text-gray-400 transition-transform dark:text-gray-500 ${accountOpen ? '' : 'rotate-180'}`} />
                    </button>

                    {accountOpen && (
                        <div className="absolute bottom-full left-0 mb-1 w-full rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg dark:border-night-200 dark:bg-night-200">
                            <SidebarLink item={{ name: 'My Profile', to: '/profile', icon: UserCircleIcon }} onNavigate={() => { setAccountOpen(false); handleNavigate(); }} />
                            <SidebarLink item={{ name: 'Change Password', to: '/change-password', icon: KeyIcon }} onNavigate={() => { setAccountOpen(false); handleNavigate(); }} />
                            <button
                                onClick={() => { setAccountOpen(false); onLogout(); }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
