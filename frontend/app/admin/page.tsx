'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { listUsers, createUserAdmin, updateUserRole, deleteUserAdmin, getStoredUser, type AuthUser } from '@/lib/api';
import { Users, Plus, Shield, ShieldCheck, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Create user form
    const [showCreate, setShowCreate] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('analyst');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const user = getStoredUser();
        setCurrentUser(user);

        if (!user || user.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        loadUsers();
    }, [router]);

    async function loadUsers() {
        try {
            setLoading(true);
            const data = await listUsers();
            setUsers(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            await createUserAdmin(newEmail, newPassword, newName, newRole);
            setSuccess(`Account created for ${newEmail}`);
            setShowCreate(false);
            setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('analyst');
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create user');
        } finally {
            setCreating(false);
        }
    }

    async function handleRoleToggle(userId: string, currentRole: string) {
        const newRole = currentRole === 'admin' ? 'analyst' : 'admin';
        try {
            await updateUserRole(userId, newRole);
            setSuccess(`Role updated to ${newRole}`);
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update role');
        }
    }

    async function handleDelete(userId: string, email: string) {
        if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
        try {
            await deleteUserAdmin(userId);
            setSuccess(`User ${email} deleted`);
            await loadUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        }
    }

    if (!currentUser || currentUser.role !== 'admin') {
        return null; // Redirecting
    }

    return (
        <div className="flex h-screen bg-[var(--bg)] text-[var(--text-primary)]">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-amber-400" />
                            <h1 className="text-sm font-semibold uppercase tracking-widest">Admin Console</h1>
                        </div>
                        <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                            User management & role administration
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[var(--bg)] rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                    >
                        <Plus size={12} />
                        Create User
                    </button>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-mono mb-4">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {error}
                        <button onClick={() => setError('')} className="ml-auto"><X size={12} /></button>
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono mb-4">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {success}
                    </div>
                )}

                {/* Create User Form */}
                {showCreate && (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 mb-6">
                        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-3">
                            New User Account
                        </h3>
                        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Full Name</label>
                                <input
                                    type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-md text-[11px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Email</label>
                                <input
                                    type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="user@quantora.ai"
                                    className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-md text-[11px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Password</label>
                                <input
                                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-md text-[11px] font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-500"
                                    required minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-1">Role</label>
                                <select
                                    value={newRole} onChange={(e) => setNewRole(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-md text-[11px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-zinc-500"
                                >
                                    <option value="analyst">Analyst</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="col-span-2 flex items-center gap-2 mt-1">
                                <button
                                    type="submit" disabled={creating}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-[var(--bg)] rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider hover:bg-zinc-200 disabled:opacity-40 transition-colors"
                                >
                                    {creating ? 'Creating...' : 'Create Account'}
                                </button>
                                <button
                                    type="button" onClick={() => setShowCreate(false)}
                                    className="px-4 py-1.5 text-[var(--text-muted)] text-[10px] font-mono uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
                        <Users size={13} className="text-[var(--text-muted)]" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                            Registered Users ({users.length})
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-[var(--text-muted)] text-[11px] font-mono">Loading users...</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[var(--border)]">
                                    <th className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">User</th>
                                    <th className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Email</th>
                                    <th className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Role</th>
                                    <th className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Created</th>
                                    <th className="text-right px-4 py-2 text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg)] transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-violet-600'
                                                    }`}>
                                                    {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                                                </div>
                                                <span className="text-[11px] font-mono text-[var(--text-primary)]">
                                                    {u.full_name || 'Unnamed'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-[11px] font-mono text-[var(--text-secondary)]">{u.email}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${u.role === 'admin'
                                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                }`}>
                                                {u.role === 'admin' ? <ShieldCheck size={9} /> : <Shield size={9} />}
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-[10px] font-mono text-[var(--text-muted)]">
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleRoleToggle(u.id, u.role)}
                                                    className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] rounded transition-colors"
                                                    title={u.role === 'admin' ? 'Demote to analyst' : 'Promote to admin'}
                                                >
                                                    {u.role === 'admin' ? 'Demote' : 'Promote'}
                                                </button>
                                                {u.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => handleDelete(u.id, u.email)}
                                                        className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Info Panel */}
                <div className="mt-4 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Access Control</p>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-[var(--text-secondary)]">
                        <div className="flex items-start gap-2">
                            <ShieldCheck size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-amber-400">Admin</strong> — Full platform access, user management, system configuration</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <Shield size={11} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <span><strong className="text-blue-400">Analyst</strong> — Dashboard, transactions, alerts, network graph, bank input</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
