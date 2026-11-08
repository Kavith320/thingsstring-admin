"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Download, Eye, Lock, Radio, Trash2, Unlock } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pager, RefreshButton, SearchInput, Segmented, Select, Table, TableSkeleton, Td, Th, usePaged } from "@/components/ui";
import { RowMenu } from "@/components/Menu";
import { UserLink, useDirectory } from "@/components/Directory";
import { useDeviceActions } from "@/components/deviceActions";
import { deviceOwnerId, downloadCsv, matches, sensorNames, timeAgo } from "@/lib/utils";

type StateFilter = "all" | "locked" | "enabled" | "unassigned";

export default function DevicesPage() {
    const dir = useDirectory();
    const router = useRouter();
    const actions = useDeviceActions();
    const [query, setQuery] = useState("");
    const [state, setState] = useState<StateFilter>("all");
    const [model, setModel] = useState("");

    const models = useMemo(() => [...new Set(dir.devices.map((d) => d.device?.model).filter(Boolean) as string[])].sort(), [dir.devices]);

    const rows = useMemo(
        () =>
            dir.devices.filter((d) => {
                const owner = deviceOwnerId(d);
                if (state === "locked" && !d.isDisabled) return false;
                if (state === "enabled" && d.isDisabled) return false;
                if (state === "unassigned" && owner) return false;
                if (model && d.device?.model !== model) return false;
                const u = owner ? dir.userById.get(owner) : undefined;
                return matches(query, d._id, d.device?.device_id, d.device?.model, owner, u?.name, u?.email, u?.userId8, ...sensorNames(d), ...Object.keys(d.actuators || {}));
            }),
        [dir.devices, dir.userById, state, model, query]
    );
    const paged = usePaged(rows, 25);
    const locked = dir.devices.filter((d) => d.isDisabled).length;

    return (
        <div>
            <PageHeader
                title="Devices"
                description={`${dir.devices.length} registered · ${locked} locked out`}
                actions={
                    <>
                        <RefreshButton onClick={dir.refresh} />
                        <Button
                            size="sm"
                            disabled={!rows.length}
                            onClick={() =>
                                downloadCsv(
                                    `devices-${new Date().toISOString().slice(0, 10)}.csv`,
                                    rows.map((d) => {
                                        const owner = deviceOwnerId(d);
                                        const u = owner ? dir.userById.get(owner) : undefined;
                                        return { deviceId: d._id, model: d.device?.model, ownerId: owner, ownerEmail: u?.email, sensors: sensorNames(d).join(" "), actuators: Object.keys(d.actuators || {}).join(" "), locked: !!d.isDisabled, lockReason: d.disabledReason, ownerAssignedAt: d.ownerAssignedAt };
                                    })
                                )
                            }
                        >
                            <Download className="h-4 w-4" /> CSV
                        </Button>
                    </>
                }
            />

            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Search device ID, model, owner, sensor…" className="flex-1" />
                <div className="flex flex-wrap gap-2">
                    <Segmented
                        label="State"
                        value={state}
                        onChange={setState}
                        options={[
                            { value: "all", label: "All" },
                            { value: "enabled", label: "Enabled" },
                            { value: "locked", label: "Locked" },
                            { value: "unassigned", label: "No owner" },
                        ]}
                    />
                    <Select aria-label="Model" value={model} onChange={(e) => setModel(e.target.value)} className="h-10 w-auto">
                        <option value="">All models</option>
                        {models.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
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
                    <EmptyState icon={Radio} title={dir.devices.length ? "No devices match these filters" : "No devices registered yet"} description={dir.devices.length ? undefined : "Devices appear after they publish their first config over MQTT."} />
                ) : (
                    <>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Device</Th>
                                    <Th>Owner</Th>
                                    <Th>Sensors</Th>
                                    <Th>Actuators</Th>
                                    <Th>State</Th>
                                    <Th>Owner since</Th>
                                    <Th className="w-12" />
                                </tr>
                            </thead>
                            <tbody>
                                {paged.slice.map((d) => {
                                    const sensors = sensorNames(d);
                                    const acts = Object.keys(d.actuators || {});
                                    return (
                                        <tr key={d._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60">
                                            <Td>
                                                <Link href={`/devices/${encodeURIComponent(d._id)}`} className="flex min-w-0 items-center gap-3">
                                                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                                        <Radio className="h-4 w-4" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-mono text-[13px] font-medium text-zinc-900 hover:underline dark:text-white">{d._id}</div>
                                                        <div className="truncate text-xs text-zinc-500">{d.device?.model || "Unknown model"}</div>
                                                    </div>
                                                </Link>
                                            </Td>
                                            <Td>
                                                <UserLink id={deviceOwnerId(d)} />
                                            </Td>
                                            <Td className="max-w-[200px]">
                                                <span className="block truncate text-xs" title={sensors.join(", ")}>
                                                    {sensors.length ? sensors.join(", ") : "—"}
                                                </span>
                                            </Td>
                                            <Td>
                                                <div className="flex max-w-[220px] flex-wrap gap-1">
                                                    {acts.slice(0, 3).map((a) => (
                                                        <Badge key={a}>{a}</Badge>
                                                    ))}
                                                    {acts.length > 3 && <span className="text-xs text-zinc-500">+{acts.length - 3}</span>}
                                                    {!acts.length && <span className="text-zinc-400">—</span>}
                                                </div>
                                            </Td>
                                            <Td>
                                                {d.isDisabled ? (
                                                    <span title={d.disabledReason || undefined}>
                                                        <Badge tone="red" icon={Lock}>
                                                            Locked
                                                        </Badge>
                                                    </span>
                                                ) : (
                                                    <Badge tone="green">Enabled</Badge>
                                                )}
                                            </Td>
                                            <Td className="whitespace-nowrap text-xs text-zinc-500">{d.ownerAssignedAt ? timeAgo(new Date(d.ownerAssignedAt).getTime()) : "—"}</Td>
                                            <Td className="text-right">
                                                <RowMenu
                                                    label={`Actions for ${d._id}`}
                                                    items={[
                                                        { label: "Open device", icon: Eye, onClick: () => router.push(`/devices/${encodeURIComponent(d._id)}`) },
                                                        d.isDisabled ? { label: "Unlock", icon: Unlock, onClick: () => actions.unlock(d) } : { label: "Lock out", icon: Lock, onClick: () => actions.lock(d) },
                                                        { label: "Transfer ownership", icon: ArrowRightLeft, onClick: () => actions.transfer(d) },
                                                        { label: "Delete device", icon: Trash2, danger: true, onClick: () => actions.remove(d) },
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
        </div>
    );
}
