import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, CardBody, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Pagination, Select, Table, Badge } from '../components/ui';
import type { User } from '../types';
import { PencilSquareIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface UserItem extends User {}

export default function Users() {
    const { user: currentUser, hasPermission } = useAuth();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<UserItem | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadRoles = useCallback(async () => {
        try {
            const { data } = await api.get<{ roles: { name: string }[] }>('/roles');
            setRoles(data.roles.map((r) => r.name));
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
        setForm({ name: '', email: '', password: '', role: roles[0] ?? '' });
        setModalOpen(true);
    };

    const openEdit = (user: UserItem) => {
        setEditing(user);
        setForm({ name: user.name, email: user.email, password: '', role: user.roles?.[0]?.name ?? '' });
        setModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role };
            if (editing) {
                if (form.password) payload.password = form.password;
                await api.put(`/users/${editing.id}`, payload);
                toast.success('User updated');
            } else {
                payload.password = form.password;
                await api.post('/users', payload);
                toast.success('User created');
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
            toast.success('User deleted');
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

    return (
        <div>
            <PageHeader
                title="Users"
                description="Manage user accounts and roles"
                actions={
                    canCreate && (
                        <Button onClick={openCreate}>
                            <PlusIcon className="h-5 w-5" /> New User
                        </Button>
                    )
                }
            />

            <Card>
                {loading ? (
                    <CardBody><div className="py-10 text-center text-sm text-gray-500">Loading users…</div></CardBody>
                ) : users.length === 0 ? (
                    <CardBody><EmptyState title="No users found" /></CardBody>
                ) : (
                    <>
                        <Table headers={['Name', 'Email', 'Roles', 'Actions']}>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-gray-900">{user.name}</span>
                                            {currentUser?.id === user.id && <Badge variant="blue">You</Badge>}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles?.map((role) => (
                                                <Badge key={role.id} variant="purple">{role.name}</Badge>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-3">
                                        <div className="flex items-center gap-1">
                                            {canEdit && (
                                                <Button variant="ghost" className="px-2 py-1" onClick={() => openEdit(user)}>
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button variant="ghost" className="px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(user)}>
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
                title={editing ? 'Edit User' : 'New User'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button type="submit" form="user-form" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
                    </>
                }
            >
                <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    <Input label={editing ? 'Password (leave blank to keep)' : 'Password'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
                    <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                        {roles.length === 0 && <option value="">No roles available</option>}
                        {roles.map((role) => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </Select>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete user"
                message={`Are you sure you want to delete ${deleteTarget?.name}? This cannot be undone.`}
                loading={deleting}
                onConfirm={() => void handleDelete()}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
