"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, KeyRound, Lock, Radio, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX, Zap } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, KeyValue, Notice, Skeleton, Table, Td, Th } from "@/components/ui";
import { DeviceLink, useDirectory } from "@/components/Directory";
import { isSuspended, useUserActions } from "@/components/userActions";
import { AuditList } from "@/components/AuditList";
import { useApi } from "@/lib/hooks";
import type { Flow, Schedule } from "@/lib/types";
import { formatDateTime, sensorNames } from "@/lib/utils";

export default function UserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const dir = useDirectory();
    const actions = useUserActions();
    const schedules = useApi<{ schedules: Schedule[] }>("/api/admin/schedules");
    const flows = useApi<{ flows: Flow[] }>("/api/admin/automation/flows");

    const user = dir.userById.get(id);
    if (!dir.loaded) return <Skeleton className="h-64 rounded-2xl" />;
    if (!user) {
        return (
            <Card>
                <EmptyState title="User not found" description="It may have been deleted." action={<Link href="/users" className="text-sm font-semibold underline">Back to users</Link>} />
            </Card>
        );
    }

    const devices = dir.devicesByOwner.get(String(user._id)) || [];
    const userSchedules = (schedules.data?.schedules || []).filter((s) => String(s.user_id) === String(user._id));
    const userFlows = (flows.data?.flows || []).filter((f) => String(f.user_id) === String(user._id));
    const suspended = isSuspended(user);
    const self = actions.isSelf(user);

    return (
        <div className="space-y-5">
            <Link href="/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Users
            </Link>

            <Card className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <Avatar name={user.name} email={user.email} size={56} />
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold text-zinc-900 dark:text-white">{user.name || user.email}</h1>
                            <p className="truncate text-sm text-zinc-500">{user.email}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {user.role === "admin" ? <Badge tone="indigo" icon={ShieldCheck}>Admin</Badge> : <Badge>User</Badge>}
                                {suspended ? <Badge tone="red" dot>Suspended</Badge> : <Badge tone="green" dot>Active</Badge>}
                                {user.emailVerified ? <Badge tone="green">Email verified</Badge> : <Badge tone="amber">Email not verified</Badge>}
                                <Badge tone={user.authProvider === "google" ? "blue" : "neutral"}>{user.authProvider === "google" ? "Google sign-in" : "Email & password"}</Badge>
                                {self && <Badge tone="indigo">You</Badge>}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {user.role === "admin" ? (
                            <Button size="sm" onClick={() => actions.setRole(user, "user")} disabled={self} loading={actions.busy === `role:${user._id}`}>
                                <ShieldOff className="h-4 w-4" /> Remove admin
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => actions.setRole(user, "admin")} loading={actions.busy === `role:${user._id}`}>
                                <ShieldCheck className="h-4 w-4" /> Make admin
                            </Button>
                        )}
                        {suspended ? (
                            <Button size="sm" onClick={() => actions.setStatus(user, "active")} loading={actions.busy === `status:${user._id}`}>
                                <UserCheck className="h-4 w-4" /> Reactivate
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => actions.setStatus(user, "disabled")} disabled={self} loading={actions.busy === `status:${user._id}`}>
                                <UserX className="h-4 w-4" /> Suspend
                            </Button>
                        )}
                        <Button size="sm" onClick={() => actions.resetPassword(user)}>
                            <KeyRound className="h-4 w-4" /> Reset password
                        </Button>
                        <Button size="sm" variant="danger" disabled={self} onClick={async () => (await actions.remove(user)) && router.push("/users")}>
                            <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                    </div>
                </div>

                {suspended && (
                    <Notice tone="error" className="mt-4">
                        This account is suspended. The user can&apos;t sign in or use the API.
                    </Notice>
                )}

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-5 dark:border-zinc-800 sm:grid-cols-3 lg:grid-cols-6">
                    <KeyValue label="User ID (devices)" mono>
                        {user.userId8 || "—"}
                    </KeyValue>
                    <KeyValue label="Account ID" mono>
                        {user._id}
                    </KeyValue>
                    <KeyValue label="Organisation">{user.organization || "—"}</KeyValue>
                    <KeyValue label="Country">{user.country || "—"}</KeyValue>
                    <KeyValue label="Joined">{formatDateTime(user.createdAt)}</KeyValue>
                    <KeyValue label="Last updated">{formatDateTime(user.updatedAt)}</KeyValue>
                </dl>
            </Card>

            <Card className="overflow-hidden">
                <CardHeader title={`Devices (${devices.length})`} icon={Radio} />
                {devices.length === 0 ? (
                    <EmptyState icon={Radio} title="No devices" description="Devices appear after they send a config with this user's ID." />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Device</Th>
                                <Th>Model</Th>
                                <Th>Sensors</Th>
                                <Th>Actuators</Th>
                                <Th>State</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map((d) => (
                                <tr key={d._id}>
                                    <Td>
                                        <DeviceLink id={d._id} />
                                    </Td>
                                    <Td>{d.device?.model || "—"}</Td>
                                    <Td className="max-w-[220px] truncate text-xs">{sensorNames(d).join(", ") || "—"}</Td>
                                    <Td className="text-xs">{Object.keys(d.actuators || {}).join(", ") || "—"}</Td>
                                    <Td>{d.isDisabled ? <Badge tone="red" icon={Lock}>Locked</Badge> : <Badge tone="green">Enabled</Badge>}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card className="overflow-hidden">
                    <CardHeader title={`Schedules (${userSchedules.length})`} icon={CalendarClock} actions={<Link href={`/schedules?owner=${user._id}`} className="text-xs font-semibold text-zinc-600 hover:underline dark:text-zinc-400">Manage</Link>} />
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {schedules.loading && <li className="p-4"><Skeleton className="h-16" /></li>}
                        {!schedules.loading && userSchedules.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">No schedules</li>}
                        {userSchedules.slice(0, 8).map((s) => (
                            <li key={s._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-5">
                                <div className="min-w-0">
                                    <div className="truncate font-medium">{s.name}</div>
                                    <div className="truncate font-mono text-xs text-zinc-500">
                                        {s.cron} · {s.timezone} · {s.deviceId}
                                    </div>
                                </div>
                                <Badge tone={s.enabled ? "green" : "neutral"}>{s.enabled ? "On" : "Off"}</Badge>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card className="overflow-hidden">
                    <CardHeader title={`Automation flows (${userFlows.length})`} icon={Zap} actions={<Link href={`/automations?owner=${user._id}`} className="text-xs font-semibold text-zinc-600 hover:underline dark:text-zinc-400">Manage</Link>} />
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {flows.loading && <li className="p-4"><Skeleton className="h-16" /></li>}
                        {!flows.loading && userFlows.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">No flows</li>}
                        {userFlows.slice(0, 8).map((f) => (
                            <li key={f._id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-5">
                                <div className="min-w-0">
                                    <div className="truncate font-medium">{f.name}</div>
                                    <div className="truncate font-mono text-xs text-zinc-500">
                                        {f.deviceId} · {f.metricPath}
                                    </div>
                                </div>
                                <Badge tone={f.enabled ? "green" : "neutral"}>{f.enabled ? "On" : "Off"}</Badge>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <AuditList targetId={String(user._id)} title="Admin actions on this user" />

            {actions.modals}
        </div>
    );
}
