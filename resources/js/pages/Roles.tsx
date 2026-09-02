import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, ConfirmDialog, EmptyState, Input, Modal, PageHeader } from '../components/ui';
import type { Role, Permission } from '../types';
import { CheckCircleIcon, EyeIcon, PencilSquareIcon, PlusIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline';

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

export default function Roles() {
    const { hasPermission } = useAuth();
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<RoleItem | null>(null);
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [viewTarget, setViewTarget] = useState<RoleItem | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);

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
                toast.success('Role updated');
            } else {
                await api.post('/roles', { name, permissions: selected });
                toast.success('Role created');
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
            toast.success('Role deleted');
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

    const handleToggle = async (role: RoleItem) => {
        setTogglingId(role.id);
        try {
            const { data } = await api.patch<{ role: RoleItem }>(`/roles/${role.id}/toggle`);
            toast.success(data.role.is_active ? 'Role activated' : 'Role deactivated');
            setRoles((prev) => prev.map((r) => (r.id === role.id ? data.role : r)));
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setTogglingId(null);
        }
    };

    const availableGroups = hasPermissionInGroups
        ? permissionGroups
        : permissionGroups.map((g) => ({ ...g, permissions: g.permissions.filter((p) => allPermissions.some((ap) => ap.name === p)) }));

    return (
        <div>
            <PageHeader
                title="Roles"
                description="Manage roles and their permissions"
                actions={
                    canCreate && (
                        <Button onClick={openCreate}>
                            <PlusIcon className="h-5 w-5" /> New Role
                        </Button>
                    )
                }
            />

            {loading ? (
                <div className="py-10 text-center text-sm text-gray-500">Loading roles…</div>
            ) : roles.length === 0 ? (
                <EmptyState title="No roles found" />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            className={`group flex flex-col rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
                                role.is_active === false
                                    ? 'border-gray-200 bg-gray-50 opacity-70'
                                    : 'border-gray-200 bg-white'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                                        role.name === 'admin' ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700'
                                    }`}>
                                        {role.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <Badge variant={role.is_active === false ? 'gray' : 'green'}>
                                    {role.is_active === false ? 'Inactive' : 'Active'}
                                </Badge>
                            </div>

                            <h3 className="mt-3 text-base font-semibold text-gray-900">{role.name}</h3>
                            <p className="mt-0.5 text-sm text-gray-500">
                                {role.permissions?.length ?? 0} permission{(role.permissions?.length ?? 0) === 1 ? '' : 's'}
                            </p>

                            <div className="mt-4 flex items-center gap-1 border-t border-gray-100 pt-3">
                                <Button variant="ghost" className="px-2 py-1" title="View" onClick={() => setViewTarget(role)}>
                                    <EyeIcon className="h-4 w-4" />
                                </Button>
                                {canEdit && (
                                    <Button variant="ghost" className="px-2 py-1" title="Edit" onClick={() => openEdit(role)}>
                                        <PencilSquareIcon className="h-4 w-4" />
                                    </Button>
                                )}
                                {canEdit && role.name !== 'admin' && (
                                    <Button
                                        variant="ghost"
                                        className="px-2 py-1"
                                        title={role.is_active === false ? 'Activate' : 'Deactivate'}
                                        loading={togglingId === role.id}
                                        onClick={() => handleToggle(role)}
                                    >
                                        {role.is_active === false
                                            ? <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                            : <XCircleIcon className="h-4 w-4 text-gray-400" />}
                                    </Button>
                                )}
                                {canDelete && role.name !== 'admin' && (
                                    <Button variant="ghost" className="ml-auto px-2 py-1 text-red-600 hover:bg-red-50" title="Delete" onClick={() => setDeleteTarget(role)}>
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? `Edit Role: ${editing.name}` : 'New Role'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="role-form" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
                    </>
                }
            >
                <form id="role-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Role name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. content_manager" />

                    {availableGroups.length > 0 ? (
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700">Permissions</p>
                            <div className="space-y-3">
                                {availableGroups.map((group) => {
                                    if (group.permissions.length === 0) return null;
                                    const allSelected = group.permissions.every((p) => selected.includes(p));
                                    return (
                                        <div key={group.label} className="rounded-lg border border-gray-200 p-3">
                                            <label className="flex cursor-pointer items-center justify-between">
                                                <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={() => toggleGroup(group.permissions)}
                                                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                />
                                            </label>
                                            <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                                                {group.permissions.map((p) => (
                                                    <label key={p} className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.includes(p)}
                                                            onChange={() => toggle(p)}
                                                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
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
                        <p className="text-sm text-gray-500">No permissions available to assign.</p>
                    )}
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete role"
                message={`Are you sure you want to delete the "${deleteTarget?.name}" role? Users assigned this role will lose its permissions.`}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />

            <Modal
                open={!!viewTarget}
                onClose={() => setViewTarget(null)}
                title={`Role: ${viewTarget?.name ?? ''}`}
                size="lg"
                footer={<Button variant="secondary" onClick={() => setViewTarget(null)}>Close</Button>}
            >
                {viewTarget && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant={viewTarget.is_active === false ? 'gray' : 'green'}>
                                {viewTarget.is_active === false ? 'Inactive' : 'Active'}
                            </Badge>
                            <span className="text-sm text-gray-500">
                                {viewTarget.permissions?.length ?? 0} permission{(viewTarget.permissions?.length ?? 0) === 1 ? '' : 's'}
                            </span>
                        </div>
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700">Permissions</p>
                            {viewTarget.permissions && viewTarget.permissions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {viewTarget.permissions.map((p) => (
                                        <Badge key={p.id} variant="gray">{p.name}</Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">No permissions assigned.</p>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
