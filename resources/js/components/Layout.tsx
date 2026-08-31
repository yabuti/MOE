import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import {
    AcademicCapIcon,
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    BookOpenIcon,
    BuildingOfficeIcon,
    DocumentArrowUpIcon,
    FolderIcon,
    HomeIcon,
    InboxIcon,
    PhotoIcon,
    ShieldCheckIcon,
    Squares2X2Icon,
    TagIcon,
    UsersIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

const navigation = [
    { name: 'Dashboard', to: '/', icon: HomeIcon, permission: 'view dashboard' },
    { name: 'Users', to: '/users', icon: UsersIcon, permission: 'view users' },
    { name: 'Roles', to: '/roles', icon: ShieldCheckIcon, permission: 'view roles' },
    { name: 'Schools', to: '/schools', icon: BuildingOfficeIcon, permission: 'view schools' },
    { name: 'Node Types', to: '/node-types', icon: TagIcon, permission: 'view node types' },
    { name: 'Catalog', to: '/catalog', icon: FolderIcon, permission: 'view catalog' },
    { name: 'Import Books', to: '/import-books', icon: DocumentArrowUpIcon, permission: 'import books' },
    { name: 'Content', to: '/content', icon: BookOpenIcon, permission: 'view content' },
    { name: 'Media', to: '/media', icon: PhotoIcon, permission: 'upload media' },
    { name: 'Exams', to: '/exams', icon: AcademicCapIcon, permission: 'view exams' },
    { name: 'Audit Logs', to: '/audit-logs', icon: InboxIcon, permission: 'view audit logs' },
];

function SidebarLink({ item, onNavigate }: { item: (typeof navigation)[number]; onNavigate: () => void }) {
    return (
        <NavLink
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-600/10 text-brand-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
            }
        >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.name}
        </NavLink>
    );
}

function Brand() {
    return (
        <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Squares2X2Icon className="h-5 w-5" />
            </div>
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

    const visibleNavigation = navigation.filter((item) => !item.permission || user?.permissions?.includes(item.permission));

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-cream-50">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* Mobile header */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
                <Brand />
                <button onClick={() => setSidebarOpen(true)} className="rounded-md p-2 text-gray-600 hover:bg-gray-100">
                    <Bars3Icon className="h-6 w-6" />
                </button>
            </div>

            {/* Mobile sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                            <Brand />
                            <button onClick={() => setSidebarOpen(false)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <SidebarContent user={user} visibleNavigation={visibleNavigation} onNavigate={() => setSidebarOpen(false)} onLogout={handleLogout} />
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
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
    return (
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
            <div className="space-y-1">
                {visibleNavigation.map((item) => (
                    <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
                ))}
            </div>

            <div className="mt-auto border-t border-gray-200 pt-4">
                <div className="mb-3 flex items-center gap-3 px-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                        {user?.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="truncate text-xs text-gray-500">{user?.roles?.map((r) => r.name).join(', ') || 'Member'}</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    Sign out
                </button>
            </div>
        </nav>
    );
}
