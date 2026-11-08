"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Lock } from "lucide-react";
import { Avatar, Button, Field, Input, Modal, Notice, SearchInput, Textarea, useConfirm, useToast } from "@/components/ui";
import { useDirectory } from "@/components/Directory";
import { api, errorMessage } from "@/lib/api";
import type { DeviceConfig } from "@/lib/types";
import { cn, deviceOwnerId, matches } from "@/lib/utils";

/** Lock / unlock / transfer / delete for a device; refreshes the directory and calls `onChanged`. */
export function useDeviceActions(onChanged?: () => void) {
    const toast = useToast();
    const confirm = useConfirm();
    const dir = useDirectory();
    const [lockFor, setLockFor] = useState<DeviceConfig | null>(null);
    const [transferFor, setTransferFor] = useState<DeviceConfig | null>(null);

    const done = async () => {
        await dir.refresh();
        onChanged?.();
    };

    async function unlock(d: DeviceConfig) {
        const ok = await confirm({
            title: `Unlock ${d._id}?`,
            message: <p>Owner controls, schedules and automations can change it again. The owner gets an email.</p>,
            confirmLabel: "Unlock",
        });
        if (!ok) return;
        try {
            const r = await api(`/api/admin/devices/${encodeURIComponent(d._id)}/lockout`, { method: "POST", body: { disabled: false } });
            toast(r.message || "Device unlocked");
            await done();
        } catch (e) {
            toast(errorMessage(e), "error");
        }
    }

    async function remove(d: DeviceConfig, after?: () => void) {
        const ok = await confirm({
            title: `Delete device ${d._id}?`,
            message: (
                <div className="space-y-2">
                    <p>Deletes its config, all telemetry, control state, schedules, automation flows that read from or act on it, sharing and personalisation.</p>
                    <p>If the device is still powered on it will register again on its next config message.</p>
                    <p className="font-medium text-red-600 dark:text-red-400">This can&apos;t be undone.</p>
                </div>
            ),
            confirmLabel: "Delete device",
            danger: true,
            typeToConfirm: d._id,
        });
        if (!ok) return;
        try {
            const r = await api(`/api/admin/devices/${encodeURIComponent(d._id)}`, { method: "DELETE" });
            toast(r.message || "Device deleted");
            await dir.refresh();
            after?.();
        } catch (e) {
            toast(errorMessage(e), "error");
        }
    }

    const modals = (
        <>
            <LockModal device={lockFor} onClose={() => setLockFor(null)} onDone={done} />
            <TransferModal device={transferFor} onClose={() => setTransferFor(null)} onDone={done} />
        </>
    );

    return { lock: setLockFor, unlock, transfer: setTransferFor, remove, modals };
}

const REASONS = ["Suspicious activity", "Unpaid subscription", "Hardware fault under investigation", "Owner request"];

function LockModal({ device, onClose, onDone }: { device: DeviceConfig | null; onClose: () => void; onDone: () => void }) {
    const toast = useToast();
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const close = () => {
        setReason("");
        setError("");
        onClose();
    };

    async function submit() {
        setLoading(true);
        setError("");
        try {
            const r = await api(`/api/admin/devices/${encodeURIComponent(device!._id)}/lockout`, { method: "POST", body: { disabled: true, reason: reason.trim() || undefined } });
            toast(r.message || "Device locked");
            onDone();
            close();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            open={!!device}
            onClose={close}
            title="Lock out device"
            description={device?._id}
            footer={
                <>
                    <Button onClick={close}>Cancel</Button>
                    <Button variant="danger" onClick={submit} loading={loading}>
                        <Lock className="h-4 w-4" /> Lock device
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Notice tone="warning">While locked, the owner and shared users can&apos;t control it, and schedules and automations skip it. Admin control still works. The owner is emailed the reason.</Notice>
                {error && <Notice tone="error">{error}</Notice>}
                <Field label="Reason" hint="Shown to the owner. Up to 300 characters; defaults to “Admin Lockout”.">
                    {(id) => <Textarea id={id} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Why is this device being locked?" />}
                </Field>
                <div className="flex flex-wrap gap-1.5">
                    {REASONS.map((r) => (
                        <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                            {r}
                        </button>
                    ))}
                </div>
            </div>
        </Modal>
    );
}

function TransferModal({ device, onClose, onDone }: { device: DeviceConfig | null; onClose: () => void; onDone: () => void }) {
    const toast = useToast();
    const dir = useDirectory();
    const [query, setQuery] = useState("");
    const [target, setTarget] = useState<string>("");
    const [manual, setManual] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const currentOwner = device ? deviceOwnerId(device) : null;
    const currentOwnerUser = currentOwner ? dir.userById.get(currentOwner) : undefined;

    const candidates = useMemo(
        () => dir.users.filter((u) => String(u._id) !== String(currentOwnerUser?._id) && matches(query, u.name, u.email, u.userId8)).slice(0, 8),
        [dir.users, query, currentOwnerUser]
    );

    const close = () => {
        setQuery("");
        setTarget("");
        setManual("");
        setError("");
        onClose();
    };

    async function submit() {
        const targetUserId = target || manual.trim();
        if (!targetUserId) return setError("Pick the new owner.");
        setLoading(true);
        setError("");
        try {
            const r = await api(`/api/admin/devices/${encodeURIComponent(device!._id)}/transfer`, { method: "PUT", body: { targetUserId } });
            toast(r.message || "Device transferred");
            onDone();
            close();
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            open={!!device}
            onClose={close}
            title="Transfer ownership"
            description={device?._id}
            footer={
                <>
                    <Button onClick={close}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={loading} disabled={!target && !manual.trim()}>
                        <ArrowRightLeft className="h-4 w-4" /> Transfer
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <Notice tone="warning">
                    The current owner&apos;s schedules and automation flows for this device are deleted, and all sharing, names and groups are cleared. Both owners are emailed.
                </Notice>
                <div className="text-sm">
                    <span className="text-zinc-500">Current owner: </span>
                    <span className="font-medium">{currentOwnerUser ? `${currentOwnerUser.name} (${currentOwnerUser.email})` : currentOwner || "Unassigned"}</span>
                </div>
                {error && <Notice tone="error">{error}</Notice>}
                <SearchInput value={query} onChange={setQuery} placeholder="Search users by name, email or user ID" />
                <ul className="max-h-64 space-y-1 overflow-y-auto" role="listbox" aria-label="New owner">
                    {candidates.map((u) => (
                        <li key={u._id}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={target === u._id}
                                onClick={() => {
                                    setTarget(u._id);
                                    setManual("");
                                }}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                                    target === u._id ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900" : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                )}
                            >
                                <Avatar name={u.name} email={u.email} size={30} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">{u.name}</div>
                                    <div className="truncate text-xs text-zinc-500">{u.email}</div>
                                </div>
                                <span className="font-mono text-xs text-zinc-400">{u.userId8}</span>
                            </button>
                        </li>
                    ))}
                    {!candidates.length && <li className="py-4 text-center text-sm text-zinc-500">No users match.</li>}
                </ul>
                <Field label="…or enter a user ID" hint="MongoDB _id or the 8-character user ID">
                    {(id) => (
                        <Input
                            id={id}
                            value={manual}
                            onChange={(e) => {
                                setManual(e.target.value);
                                setTarget("");
                            }}
                            className="font-mono"
                        />
                    )}
                </Field>
            </div>
        </Modal>
    );
}
