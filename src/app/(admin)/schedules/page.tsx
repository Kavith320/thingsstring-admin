"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Download } from "lucide-react";
import { Button, Card, ErrorState, PageHeader, RefreshButton, SearchInput, Segmented, Select, TableSkeleton } from "@/components/ui";
import { useDirectory } from "@/components/Directory";
import { SchedulesTable, cronText } from "@/components/automation";
import { useApi, useQueryParam } from "@/lib/hooks";
import type { Schedule } from "@/lib/types";
import { downloadCsv, matches } from "@/lib/utils";

export default function SchedulesPage() {
    const q = useApi<{ schedules: Schedule[] }>("/api/admin/schedules");
    const dir = useDirectory();
    const [query, setQuery] = useState("");
    const [state, setState] = useState<"all" | "on" | "off">("all");
    const urlOwner = useQueryParam("owner");
    const [ownerSel, setOwner] = useState<string | null>(null);
    const owner = ownerSel ?? urlOwner;

    const all = useMemo(() => q.data?.schedules || [], [q.data]);
    const owners = useMemo(() => [...new Set(all.map((s) => String(s.user_id)))], [all]);
    const rows = useMemo(
        () =>
            all
                .filter((s) => (state === "on" ? s.enabled : state === "off" ? !s.enabled : true))
                .filter((s) => !owner || String(s.user_id) === owner)
                .filter((s) => {
                    const u = dir.userById.get(String(s.user_id));
                    return matches(query, s.name, s.deviceId, s.cron, s.timezone, cronText(s.cron), u?.name, u?.email, ...s.actions.map((a) => a.actuator));
                })
                .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
        [all, state, owner, query, dir.userById]
    );
    const enabled = all.filter((s) => s.enabled).length;

    return (
        <div>
            <PageHeader
                title="Schedules"
                description={`${all.length} schedules across all users · ${enabled} enabled`}
                actions={
                    <>
                        <RefreshButton onClick={() => q.reload()} loading={q.loading} updatedAt={q.updatedAt} />
                        <Button size="sm" disabled={!rows.length} onClick={() => downloadCsv("schedules.csv", rows.map((s) => ({ id: s._id, name: s.name, deviceId: s.deviceId, ownerId: s.user_id, ownerEmail: dir.userById.get(String(s.user_id))?.email, cron: s.cron, timezone: s.timezone, enabled: s.enabled, actions: s.actions, duration_sec: s.duration_sec, end_actions: s.end_actions, createdAt: s.createdAt })))}>
                            <Download className="h-4 w-4" /> CSV
                        </Button>
                    </>
                }
            />
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Search name, device, owner, actuator, cron…" className="flex-1" />
                <div className="flex flex-wrap gap-2">
                    <Segmented label="State" value={state} onChange={setState} options={[{ value: "all", label: "All" }, { value: "on", label: "Enabled" }, { value: "off", label: "Paused" }]} />
                    <Select aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="h-10 w-auto max-w-[220px]">
                        <option value="">All owners</option>
                        {owners.map((o) => (
                            <option key={o} value={o}>
                                {dir.userById.get(o)?.email || o}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>
            {q.error && (
                <div className="mb-4">
                    <ErrorState message={q.error} onRetry={() => q.reload()} />
                </div>
            )}
            <Card className="overflow-hidden">{q.loading && !q.data ? <TableSkeleton /> : rows.length || !all.length ? <SchedulesTable schedules={rows} onChanged={() => q.reload(true)} /> : <div className="flex flex-col items-center py-12 text-sm text-zinc-500"><CalendarClock className="mb-2 h-8 w-8 text-zinc-300" />No schedules match these filters</div>}</Card>
        </div>
    );
}
