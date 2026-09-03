import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader } from '../components/ui';
import type { Role, Permission } from '../types';
import { EyeIcon, ShieldCheckIcon, PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface RoleItem extends Role {}

const permissionGroups: { label: string; permissions: string[] }[] = [
    { label: 'Dashboard', permissions: ['view dashboard'] },
    {
        label: 'Users',
        permissions: ['view users', 'create users', 'edit users', 'delete users'],
    },
    {
        label: 'Roles & Permissions',
        permissions: ['view roles', 'create roles', 'edit roles', 'delete roles', 'view permissions', 'assign permissions'],
    },
    {
        label: 'Schools',
        permissions: ['view schools', 'create schools', 'edit schools', 'delete schools'],
    },
    {
        label: 'Node Types',
        permissions: ['view node types', 'create node types', 'edit node types', 'delete node types'],
    },
    {
        label: 'Catalog',
        permissions: ['view catalog', 'create catalog', 'edit catalog', 'delete catalog', 'reorder catalog', 'publish catalog', 'archive catalog'],
    },
    {
        label: 'Content',
        permissions: ['view content', 'create content', 'edit content', 'delete content', 'reorder content', 'upload media'],
    },
    {
        label: 'Exams',
        permissions: ['view exams', 'create exams', 'edit exams', 'delete exams', 'manage questions'],
    },
    {
        label: 'Student Tracking',
        permissions: ['view student progress', 'view reports'],
    },
    {
        label: 'System',
        permissions: ['view audit logs', 'view notifications', 'send notifications'],
    },
];

const permissionGroupLabelKeys: Record<string, string> = {
    'Dashboard': 'roles.groupDashboard',
    'Users': 'roles.groupUsers',
    'Roles & Permissions': 'roles.groupRolesPermissions',
    'Schools': 'roles.groupSchools',
    'Node Types': 'roles.groupNodeTypes',
    'Catalog': 'roles.groupCatalog',
    'Content': 'roles.groupContent',
    'Exams': 'roles.groupExams',
    'Student Tracking': 'roles.groupStudentTracking',
    'System': 'roles.groupSystem',
};

export default function Roles() {
    const { hasPermission } = useAuth();
    const { t } = useLanguage();
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<RoleItem | null>(null);
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const [viewing, setViewing] = useState<RoleItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadRoles = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get<{ roles: RoleItem[] }>('/roles');
            setRoles(data.roles);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPermissions = useCallback(async () => {
        try {
            const { data } = await api.get<{ permissions: Permission[] }>('/permissions');
            setAllPermissions(data.permissions);
        } catch {
            setAllPermissions([]);
        }
    }, []);

    useEffect(() => {
        void loadRoles();
        void loadPermissions();
    }, [loadRoles, loadPermissions]);

    const openCreate = () => {
        setEditing(null);
        setName('');
        setSelected([]);
        setModalOpen(true);
    };

    const openEdit = (role: RoleItem) => {
        setEditing(role);
        setName(role.name);
        setSelected(role.permissions?.map((p) => p.name) ?? []);
        setModalOpen(true);
    };

    const hasPermissionInGroups = allPermissions.length === 0;

    const toggle = (perm: string) => {
        setSelected((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    };

    const toggleGroup = (perms: string[]) => {
        setSelected((prev) => {
            const allSelected = perms.every((p) => prev.includes(p));
            if (allSelected) return prev.filter((p) => !perms.includes(p));
            return [...new Set([...prev, ...perms])];
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/roles/${editing.id}`, { name, permissions: selected });
                toast.success(t('roles.updated'));
            } else {
                await api.post('/roles', { name, permissions: selected });
                toast.success(t('roles.created'));
            }
            setModalOpen(false);
            void loadRoles();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/roles/${deleteTarget.id}`);
            toast.success(t('roles.deleted'));
            setDeleteTarget(null);
            void loadRoles();
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canCreate = hasPermission('create roles');
    const canEdit = hasPermission('edit roles');
    const canDelete = hasPermission('delete roles');

    const availableGroups = hasPermissionInGroups
        ? permissionGroups
        : permissionGroups.map((g) => ({ ...g, permissions: g.permissions.filter((p) => allPermissions.some((ap) => ap.name === p)) }));

    return (
        <div>
            <PageHeader
                title={t('roles.title')}
                description={t('roles.description')}
                actions={
                    canCreate && (
                        <Button onClick={openCreate}>
                            <PlusIcon className="h-5 w-5" /> {t('roles.newRole')}
                        </Button>
                    )
                }
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('roles.loading')}</div></CardBody>
                ) : roles.length === 0 ? (
                    <CardBody><EmptyState title={t('roles.noRoles')} /></CardBody>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {roles.map((role) => {
                            return (
                                <div key={role.id} className="flex min-h-40 flex-col rounded-xl border border-gray-200 dark:border-night-300 bg-white dark:bg-night-100 p-5 shadow-sm transition-shadow hover:shadow-md">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                                        <ShieldCheckIcon className="h-5 w-5" />
                                    </div>

                                    <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">{role.name}</h3>

                                    <div className="mt-auto flex items-center gap-1 border-t border-gray-100 dark:border-night-300 pt-3">
                                        <Button variant="ghost" className="px-2 py-1" title={t('roles.viewPermissions')} onClick={() => setViewing(role)}>
                                            <EyeIcon className="h-4 w-4" />
                                        </Button>
                                        {canEdit && (
                                            <Button variant="ghost" className="px-2 py-1" title={t('common.edit')} onClick={() => openEdit(role)}>
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete && role.name !== 'admin' && (
                                            <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title={t('common.delete')} onClick={() => setDeleteTarget(role)}>
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <Modal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing ? t('roles.permissionsTitle', { name: viewing.name }) : t('roles.permissionsFallback')}
                size="lg"
                panelClassName="mt-24"
                footer={
                    <Button variant="secondary" onClick={() => setViewing(null)}>{t('common.close')}</Button>
                }
            >
                {viewing && (
                    <div className="space-y-4">
                        {(viewing.permissions ?? []).length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('roles.noPermissionsAssigned')}</p>
                        ) : (
                            permissionGroups.map((group) => {
                                const perms = group.permissions.filter((p) =>
                                    (viewing.permissions ?? []).some((vp) => vp.name === p)
                                );
                                if (perms.length === 0) return null;
                                return (
                                    <div key={group.label} className="rounded-lg border border-gray-200 dark:border-night-300 p-3">
                                        <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">{t(permissionGroupLabelKeys[group.label] ?? group.label)}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {perms.map((p) => <Badge key={p} variant="gray">{p}</Badge>)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t('roles.editTitle', { name: editing.name }) : t('roles.newTitle')}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit" form="role-form" loading={saving}>{editing ? t('common.save') : t('common.create')}</Button>
                    </>
                }
            >
                <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input label={t('roles.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} required placeholder={t('roles.namePlaceholder')} />

                    {availableGroups.length > 0 ? (
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">{t('roles.permissionsLabel')}</p>
                            <div className="space-y-3">
                                {availableGroups.map((group) => {
                                    if (group.permissions.length === 0) return null;
                                    const allSelected = group.permissions.every((p) => selected.includes(p));
                                    return (
                                        <div key={group.label} className="rounded-lg border border-gray-200 dark:border-night-300 p-3">
                                            <label className="flex cursor-pointer items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t(permissionGroupLabelKeys[group.label] ?? group.label)}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={() => toggleGroup(group.permissions)}
                                                    className="h-4 w-4 rounded border-gray-300 dark:border-night-300 text-brand-600 focus:ring-brand-500"
                                                />
                                            </label>
                                            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                                                {group.permissions.map((p) => (
                                                    <label key={p} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.includes(p)}
                                                            onChange={() => toggle(p)}
                                                            className="h-4 w-4 rounded border-gray-300 dark:border-night-300 text-brand-600 focus:ring-brand-500"
                                                        />
                                                        {p}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('roles.noPermissionsAvailable')}</p>
                    )}
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={t('roles.deleteTitle')}
                message={t('roles.deleteMessage', { name: deleteTarget?.name ?? '' })}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
