"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Wand2 } from "lucide-react";
import { Button, Field, Input, Modal, Notice, Select, useConfirm, useToast } from "@/components/ui";
import { useDirectory } from "@/components/Directory";
import { api, errorMessage } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import type { User } from "@/lib/types";

const MIN_PW = 8;

function randomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    const buf = new Uint32Array(16);
    crypto.getRandomValues(buf);
    return Array.from(buf, (n) => chars[n % chars.length]).join("");
}

export function isSuspended(u: User) {
    return u.status === "disabled" || u.isActive === false;
}

/** Role / status / password / delete actions with confirmations; refreshes the directory afterwards. */
export function useUserActions() {
    const confirm = useConfirm();
    const toast = useToast();
    const dir = useDirectory();
    const [busy, setBusy] = useState<string | null>(null);
    const [resetFor, setResetFor] = useState<User | null>(null);
    const me = getStoredUser();

    async function run(key: string, fn: () => Promise<any>, ok: string) {
        setBusy(key);
        try {
            const r = await fn();
            toast(r?.message || ok);
            await dir.refresh();
            return true;
        } catch (e) {
            toast(errorMessage(e), "error");
            return false;
        } finally {
            setBusy(null);
        }
    }

    async function setRole(u: User, role: "user" | "admin") {
        const ok = await confirm({
            title: role === "admin" ? `Make ${u.name || u.email} an admin?` : `Remove admin access from ${u.name || u.email}?`,
            message:
                role === "admin" ? (
                    <p>They get full access to this console: every user, device and maintenance action. Their current sessions are signed out so the new role takes effect.</p>
                ) : (
                    <p>They lose access to this console. Their current sessions are signed out.</p>
                ),
            confirmLabel: role === "admin" ? "Make admin" : "Remove admin",
            danger: role !== "admin",
        });
        if (!ok) return false;
        return run(`role:${u._id}`, () => api(`/api/admin/users/${u._id}/role`, { method: "PUT", body: { role } }), "Role updated");
    }

    async function setStatus(u: User, status: "active" | "disabled") {
        const ok = await confirm({
            title: status === "disabled" ? `Suspend ${u.name || u.email}?` : `Reactivate ${u.name || u.email}?`,
            message:
                status === "disabled" ? (
                    <p>They can&apos;t sign in or use the API until reactivated. Their devices keep running and their automations stay as they are. They get an email about it.</p>
                ) : (
                    <p>They can sign in again and get an email saying so.</p>
                ),
            confirmLabel: status === "disabled" ? "Suspend" : "Reactivate",
            danger: status === "disabled",
        });
        if (!ok) return false;
        return run(`status:${u._id}`, () => api(`/api/admin/users/${u._id}/status`, { method: "PUT", body: { status } }), "Status updated");
    }

    async function remove(u: User) {
        const devices = dir.devicesByOwner.get(String(u._id))?.length || 0;
        const ok = await confirm({
            title: `Delete ${u.name || u.email}?`,
            message: (
                <div className="space-y-2">
                    <p>This permanently deletes the account and everything it owns:</p>
                    <ul className="list-disc space-y-0.5 pl-5">
                        <li>
                            {devices} device{devices === 1 ? "" : "s"} with all their telemetry and control state
                        </li>
                        <li>Their schedules and automation flows (and flows touching their devices)</li>
                        <li>Sharing, groups, dashboard layout and uploaded images</li>
                    </ul>
                    <p className="font-medium text-red-600 dark:text-red-400">This can&apos;t be undone.</p>
                </div>
            ),
            confirmLabel: "Delete user",
            danger: true,
            typeToConfirm: u.email,
        });
        if (!ok) return false;
        return run(`delete:${u._id}`, () => api(`/api/admin/users/${u._id}`, { method: "DELETE" }), "User deleted");
    }

    const isSelf = (u: User) => !!me && String(me.id) === String(u._id);

    const modals = <ResetPasswordModal user={resetFor} onClose={() => setResetFor(null)} />;
    return { busy, setRole, setStatus, remove, resetPassword: setResetFor, isSelf, modals };
}

function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
    const toast = useToast();
    const [pw, setPw] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const close = () => {
        setPw("");
        setError("");
        setShow(false);
        onClose();
    };

    async function submit() {
        if (pw.length < MIN_PW || pw.length > 128) {
            setError(`Password must be ${MIN_PW}–128 characters.`);
            return;
        }
        setLoading(true);
        setError("");
        try {
            await api(`/api/admin/users/${user!._id}/reset-password`, { method: "POST", body: { newPassword: pw } });
            toast(`Password reset for ${user!.email}. All their sessions were signed out.`);
            close();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            open={!!user}
            onClose={close}
            title="Reset password"
            description={user?.email}
            footer={
                <>
                    <Button onClick={close}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={loading}>
                        <KeyRound className="h-4 w-4" /> Set password
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {user?.authProvider === "google" && <Notice tone="info">This account signs in with Google. Setting a password also lets them sign in with email and password.</Notice>}
                <Field label="New password" hint="Share it with the user over a secure channel. They are emailed that an admin reset it." error={error}>
                    {(id) => (
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input id={id} type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className="pr-11 font-mono" onKeyDown={(e) => e.key === "Enter" && submit()} />
                                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button
                                onClick={() => {
                                    setPw(randomPassword());
                                    setShow(true);
                                }}
                                title="Generate a strong password"
                            >
                                <Wand2 className="h-4 w-4" /> <span className="hidden sm:inline">Generate</span>
                            </Button>
                        </div>
                    )}
                </Field>
            </div>
        </Modal>
    );
}

/**
 * The backend has no admin "create user" route, so this uses public registration
 * (the user gets a verification email) and then sets the role if needed.
 */
export function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const toast = useToast();
    const dir = useDirectory();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [role, setRole] = useState<"user" | "admin">("user");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const close = () => {
        setName("");
        setEmail("");
        setPw("");
        setRole("user");
        setError("");
        onClose();
    };

    async function submit() {
        if (!name.trim() || !email.trim()) return setError("Name and email are required.");
        if (pw.length < MIN_PW || pw.length > 128) return setError(`Password must be ${MIN_PW}–128 characters.`);
        setLoading(true);
        setError("");
        try {
            const r = await api<{ user: { id: string } }>("/api/auth/register", { method: "POST", body: { name: name.trim(), email: email.trim(), password: pw }, anonymous: true });
            if (role === "admin" && r.user?.id) {
                await api(`/api/admin/users/${r.user.id}/role`, { method: "PUT", body: { role: "admin" } });
            }
            toast(`Created ${email.trim()}${role === "admin" ? " as an admin" : ""}. A verification email was sent.`);
            await dir.refresh();
            close();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={close}
            title="Create user"
            description="Creates a local account with email and password."
            footer={
                <>
                    <Button onClick={close}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={loading}>
                        Create user
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {error && <Notice tone="error">{error}</Notice>}
                <Field label="Full name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}</Field>
                <Field label="Email">{(id) => <Input id={id} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />}</Field>
                <Field label="Password" hint={`${MIN_PW}–128 characters`}>
                    {(id) => (
                        <div className="flex gap-2">
                            <Input id={id} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className="font-mono" />
                            <Button onClick={() => setPw(randomPassword())} title="Generate a strong password">
                                <Wand2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </Field>
                <Field label="Role">
                    {(id) => (
                        <Select id={id} value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </Select>
                    )}
                </Field>
            </div>
        </Modal>
    );
}
