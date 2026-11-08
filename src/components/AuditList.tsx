"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, ErrorState, TableSkeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { AuditLog } from "@/lib/types";
import { cn, formatDateTime, humanizeAction, timeAgo } from "@/lib/utils";

export function actionTone(action: string): "red" | "amber" | "green" | "indigo" | "neutral" | "blue" {
    if (/DELETE|LOCKOUT/.test(action)) return "red";
    if (/RESET|TRANSFER|STATUS|ROLE|CLEANUP/.test(action)) return "amber";
    if (/UNLOCK|BACKUP/.test(action)) return "green";
    if (/BROADCAST|CONTROL/.test(action)) return "indigo";
    if (/TOGGLE/.test(action)) return "blue";
    return "neutral";
}

/** Where an audit target lives in this console, when it is a user or device. */
function targetHref(l: AuditLog): string | null {
    if (!l.targetId) return null;
    if (l.action.startsWith("USER_")) return `/users/${l.targetId}`;
    if (l.action.startsWith("DEVICE_")) return `/devices/${encodeURIComponent(l.targetId)}`;
    return null;
}

export function AuditRows({ logs }: { logs: AuditLog[] }) {
    const [open, setOpen] = useState<string | null>(null);
    return (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {logs.map((l) => {
                const expanded = open === l._id;
                const href = targetHref(l);
                return (
                    <li key={l._id}>
                        <button type="button" onClick={() => setOpen(expanded ? null : l._id)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 sm:px-5">
                            <ChevronRight className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", expanded && "rotate-90")} />
                            <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                                <div className="min-w-0">
                                    <Badge tone={actionTone(l.action)}>{humanizeAction(l.action)}</Badge>
                                </div>
                                <div className="truncate text-sm text-zinc-700 dark:text-zinc-300">{l.adminEmail}</div>
                                <div className="truncate font-mono text-xs text-zinc-500">{l.targetId || "—"}</div>
                                <div className="text-xs text-zinc-500" title={formatDateTime(l.timestamp)}>
                                    {timeAgo(new Date(l.timestamp).getTime())}
                                </div>
                            </div>
                        </button>
                        {expanded && (
                            <div className="space-y-3 bg-zinc-50/60 px-4 pb-4 pt-1 text-sm dark:bg-zinc-900/40 sm:px-5 sm:pl-12">
                                <dl className="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <dt className="text-xs text-zinc-500">When</dt>
                                        <dd>{formatDateTime(l.timestamp)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-zinc-500">IP address</dt>
                                        <dd className="font-mono text-xs">{l.ip || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-zinc-500">Target</dt>
                                        <dd className="font-mono text-xs">
                                            {href ? (
                                                <Link href={href} className="underline-offset-2 hover:underline">
                                                    {l.targetId}
                                                </Link>
                                            ) : (
                                                l.targetId || "—"
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                                {l.userAgent && <p className="truncate text-xs text-zinc-500" title={l.userAgent}>{l.userAgent}</p>}
                                {l.details && Object.keys(l.details).length > 0 && (
                                    <pre className="max-h-72 overflow-auto rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">{JSON.stringify(l.details, null, 2)}</pre>
                                )}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/** Admin actions on one target (user, device, flow…), newest first. */
export function AuditList({ targetId, title = "Admin actions", limit = 25 }: { targetId: string; title?: string; limit?: number }) {
    const q = useApi<{ logs: AuditLog[] }>(`/api/admin/audit-logs?targetId=${encodeURIComponent(targetId)}&limit=${limit}`);
    return (
        <Card className="overflow-hidden">
            <CardHeader title={title} icon={ShieldCheck} actions={<Link href={`/audit-logs?targetId=${encodeURIComponent(targetId)}`} className="text-xs font-semibold text-zinc-600 hover:underline dark:text-zinc-400">Open in audit log</Link>} />
            {q.loading ? <TableSkeleton rows={3} /> : q.error ? <div className="p-4"><ErrorState message={q.error} onRetry={() => q.reload()} /></div> : !q.data?.logs.length ? <EmptyState icon={ShieldCheck} title="No admin actions yet" /> : <AuditRows logs={q.data.logs} />}
        </Card>
    );
}
