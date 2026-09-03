import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Table, Badge } from '../components/ui';
import { NameFields, combineName, splitName, type NameParts } from '../components/NameFields';
import type { Role, User } from '../types';
import { PencilSquareIcon, TrashIcon, PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface UserItem extends User {
    permissions_count?: number;
}

interface RoleItem extends Role {
    permissions_count?: number;
}

export default function Users() {
    const { user: currentUser, hasPermission } = useAuth();
    const { t } = useLanguage();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<UserItem | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
    const [nameParts, setNameParts] = useState<NameParts>({ first_name: '', middle_name: '', last_name: '' });
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadRoles = useCallback(async () => {
        try {
            const { data } = await api.get<{ roles: RoleItem[] }>('/roles');
            setRoles(data.roles);
        } catch {
            setRoles([]);
        }
    }, []);

    const loadUsers = useCallback(
        async (p: number) => {
            setLoading(true);
            try {
                const { data } = await api.get<{ users: UserItem[]; current_page: number; last_page: number; total: number }>('/users', { params: { page: p } });
                setUsers(data.users);
                setPage(data.current_page);
                setLastPage(data.last_page);
                setTotal(data.total);
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        void loadUsers(1);
        void loadRoles();
    }, [loadUsers, loadRoles]);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', email: '', password: '', role: roles[0]?.name ?? '' });
        setNameParts({ first_name: '', middle_name: '', last_name: '' });
        setModalOpen(true);
    };

    const openEdit = (user: UserItem) => {
        setEditing(user);
        setForm({ name: user.name, email: user.email, password: '', role: user.roles?.[0]?.name ?? '' });
        setNameParts(splitName(user.name));
        setModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: Record<string, unknown> = { name: combineName(nameParts), email: form.email, role: form.role };
            if (editing) {
                if (form.password) payload.password = form.password;
                await api.put(`/users/${editing.id}`, payload);
                toast.success(t('users.updated'));
            } else {
                payload.password = form.password;
                await api.post('/users', payload);
                toast.success(t('users.created'));
            }
            setModalOpen(false);
            void loadUsers(editing ? page : 1);
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
            await api.delete(`/users/${deleteTarget.id}`);
            toast.success(t('users.deleted'));
            setDeleteTarget(null);
            void loadUsers(users.length === 1 && page > 1 ? page - 1 : page);
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    const canCreate = hasPermission('create users');
    const canEdit = hasPermission('edit users');
    const canDelete = hasPermission('delete users');

    const selectedRole = roles.find((r) => r.name === form.role);

    return (
        <div>
            <PageHeader
                title={t('users.title')}
                description={t('users.description')}
                actions={
                    canCreate && (
                        <Button onClick={openCreate}>
                            <PlusIcon className="h-5 w-5" /> {t('users.newUser')}
                        </Button>
                    )
                }
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t('users.loading')}</div></CardBody>
                ) : users.length === 0 ? (
                    <CardBody><EmptyState title={t('users.noUsers')} /></CardBody>
                ) : (
                    <>
                        <Table headers={[t('users.colName'), t('users.colEmail'), t('users.colRoles'), t('users.colPermissions'), t('users.colActions')]}>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                                            {currentUser?.id === user.id && <Badge variant="blue">{t('common.you')}</Badge>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-300">{user.email}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.map((role) => (
                                                <Badge key={role.id} variant="purple">{role.name}</Badge>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-night-200 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                                            {user.permissions_count ?? 0} {t('common.permits')}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            {canEdit && (
                                                <Button variant="ghost" className="px-2 py-1" onClick={() => openEdit(user)}>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setDeleteTarget(user)}>
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </Table>
                        <Pagination page={page} lastPage={lastPage} total={total} onPage={(p) => void loadUsers(p)} />
                    </>
                )}
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t('users.editTitle') : t('users.newTitle')}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit" form="user-form" loading={saving}>{editing ? t('common.save') : t('common.create')}</Button>
                    </>
                }
            >
                <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                    <NameFields value={nameParts} onChange={setNameParts} />
                    <Input label={t('common.email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    <Input label={editing ? t('users.passwordKeep') : t('common.password')} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">{t('users.role')}</label>
                        <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            {roles.length === 0 && <option value="">{t('users.noRoles')}</option>}
                            {roles.map((role) => (
                                <option key={role.name} value={role.name}>
                                    {role.name} ({role.permissions_count ?? 0} {t('common.permits')})
                                </option>
                            ))}
                        </Select>
                        {selectedRole && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-600" />
                                {t('users.grantsPermissions', { count: selectedRole.permissions_count ?? 0 })}
                            </p>
                        )}
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title={t('users.deleteTitle')}
                message={t('users.deleteMessage', { name: deleteTarget?.name ?? '' })}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
