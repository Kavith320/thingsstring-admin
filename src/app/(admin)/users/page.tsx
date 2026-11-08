"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, KeyRound, ShieldCheck, ShieldOff, Trash2, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pager, RefreshButton, SearchInput, Segmented, Select, Table, TableSkeleton, Td, Th, usePaged } from "@/components/ui";
import { RowMenu } from "@/components/Menu";
import { useDirectory } from "@/components/Directory";
import { CreateUserModal, isSuspended, useUserActions } from "@/components/userActions";
import { downloadCsv, matches, timeAgo } from "@/lib/utils";

type RoleFilter = "all" | "admin" | "user";
type StatusFilter = "all" | "active" | "suspended" | "unverified";

export default function UsersPage() {
    const dir = useDirectory();
    const actions = useUserActions();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [role, setRole] = useState<RoleFilter>("all");
    const [status, setStatus] = useState<StatusFilter>("all");
    const [sort, setSort] = useState<"newest" | "oldest" | "name" | "devices">("newest");
    const [creating, setCreating] = useState(false);

    const rows = useMemo(() => {
        const list = dir.users.filter((u) => {
            if (role !== "all" && u.role !== role) return false;
            if (status === "active" && isSuspended(u)) return false;
            if (status === "suspended" && !isSuspended(u)) return false;
            if (status === "unverified" && u.emailVerified) return false;
            return matches(query, u.name, u.email, u.userId8, u._id, u.organization, u.country);
        });
        const devCount = (id: string) => dir.devicesByOwner.get(String(id))?.length || 0;
        const t = (u: { createdAt?: string }) => (u.createdAt ? new Date(u.createdAt).getTime() : 0);
        return list.sort((a, b) =>
            sort === "name" ? (a.name || a.email).localeCompare(b.name || b.email) : sort === "devices" ? devCount(b._id) - devCount(a._id) : sort === "oldest" ? t(a) - t(b) : t(b) - t(a)
        );
    }, [dir.users, dir.devicesByOwner, role, status, query, sort]);
    const paged = usePaged(rows, 25);

    const counts = {
        admin: dir.users.filter((u) => u.role === "admin").length,
        suspended: dir.users.filter(isSuspended).length,
    };

    return (
        <div>
            <PageHeader
                title="Users"
                description={`${dir.users.length} accounts · ${counts.admin} admins · ${counts.suspended} suspended`}
                actions={
                    <>
                        <RefreshButton onClick={dir.refresh} />
                        <Button
                            size="sm"
                            onClick={() =>
                                downloadCsv(
                                    `users-${new Date().toISOString().slice(0, 10)}.csv`,
                                    rows.map((u) => ({ id: u._id, userId8: u.userId8, name: u.name, email: u.email, role: u.role, status: isSuspended(u) ? "suspended" : "active", provider: u.authProvider, emailVerified: !!u.emailVerified, devices: dir.devicesByOwner.get(String(u._id))?.length || 0, createdAt: u.createdAt }))
                                )
                            }
                            disabled={!rows.length}
                        >
                            <Download className="h-4 w-4" /> CSV
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                            <UserPlus className="h-4 w-4" /> Create user
                        </Button>
                    </>
                }
            />

            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, user ID, organisation…" className="flex-1" />
                <div className="flex flex-wrap gap-2">
                    <Segmented label="Role" value={role} onChange={setRole} options={[{ value: "all", label: "All roles" }, { value: "admin", label: "Admins" }, { value: "user", label: "Users" }]} />
                    <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="h-10 w-auto">
                        <option value="all">Any status</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="unverified">Email not verified</option>
                    </Select>
                    <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 w-auto">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="name">Name A–Z</option>
                        <option value="devices">Most devices</option>
                    </Select>
                </div>
            </div>

            {dir.error && (
                <div className="mb-4">
                    <ErrorState message={dir.error} onRetry={dir.refresh} />
                </div>
            )}

            <Card className="overflow-hidden">
                {!dir.loaded ? (
                    <TableSkeleton />
                ) : rows.length === 0 ? (
                    <EmptyState icon={Users} title={query || role !== "all" || status !== "all" ? "No users match these filters" : "No users yet"} />
                ) : (
                    <>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>User</Th>
                                    <Th>User ID</Th>
                                    <Th>Role</Th>
                                    <Th>Status</Th>
                                    <Th className="text-right">Devices</Th>
                                    <Th>Joined</Th>
                                    <Th className="w-12" />
                                </tr>
                            </thead>
                            <tbody>
                                {paged.slice.map((u) => {
                                    const suspended = isSuspended(u);
                                    const self = actions.isSelf(u);
                                    const devices = dir.devicesByOwner.get(String(u._id))?.length || 0;
                                    return (
                                        <tr key={u._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60">
                                            <Td>
                                                <Link href={`/users/${u._id}`} className="flex min-w-0 items-center gap-3">
                                                    <Avatar name={u.name} email={u.email} size={34} />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 truncate font-medium text-zinc-900 hover:underline dark:text-white">
                                                            {u.name || "—"}
                                                            {self && <Badge tone="indigo">You</Badge>}
                                                        </div>
                                                        <div className="truncate text-xs text-zinc-500">{u.email}</div>
                                                    </div>
                                                </Link>
                                            </Td>
                                            <Td className="font-mono text-xs">{u.userId8 || "—"}</Td>
                                            <Td>{u.role === "admin" ? <Badge tone="indigo" icon={ShieldCheck}>Admin</Badge> : <Badge>User</Badge>}</Td>
                                            <Td>
                                                <div className="flex flex-wrap gap-1">
                                                    {suspended ? <Badge tone="red" dot>Suspended</Badge> : <Badge tone="green" dot>Active</Badge>}
                                                    {!u.emailVerified && <Badge tone="amber">Unverified</Badge>}
                                                    {u.authProvider === "google" && <Badge tone="blue">Google</Badge>}
                                                </div>
                                            </Td>
                                            <Td className="text-right tabular-nums">{devices}</Td>
                                            <Td className="whitespace-nowrap text-xs text-zinc-500" title={u.createdAt}>
                                                {u.createdAt ? timeAgo(new Date(u.createdAt).getTime()) : "—"}
                                            </Td>
                                            <Td className="text-right">
                                                <RowMenu
                                                    label={`Actions for ${u.email}`}
                                                    items={[
                                                        { label: "View details", icon: Eye, onClick: () => router.push(`/users/${u._id}`) },
                                                        u.role === "admin"
                                                            ? { label: "Remove admin", icon: ShieldOff, onClick: () => actions.setRole(u, "user"), disabled: self, title: self ? "You can't remove your own admin role" : undefined }
                                                            : { label: "Make admin", icon: ShieldCheck, onClick: () => actions.setRole(u, "admin") },
                                                        suspended
                                                            ? { label: "Reactivate", icon: UserCheck, onClick: () => actions.setStatus(u, "active") }
                                                            : { label: "Suspend", icon: UserX, onClick: () => actions.setStatus(u, "disabled"), disabled: self },
                                                        { label: "Reset password", icon: KeyRound, onClick: () => actions.resetPassword(u) },
                                                        { label: "Delete user", icon: Trash2, danger: true, onClick: () => actions.remove(u), disabled: self },
                                                    ]}
                                                />
                                            </Td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                        <Pager {...paged} />
                    </>
                )}
            </Card>

            {actions.modals}
            <CreateUserModal open={creating} onClose={() => setCreating(false)} />
        </div>
    );
}
