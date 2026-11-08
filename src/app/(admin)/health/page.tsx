"use client";

import { useEffect, useState } from "react";
import { Clock, Cpu, Database, HardDrive, HeartPulse, Pause, Play, Radio, Server } from "lucide-react";
import { Badge, Button, Card, CardHeader, ErrorState, KeyValue, PageHeader, Skeleton, StatTile } from "@/components/ui";
import { LiveArea, Meter } from "@/components/charts";
import { api, errorMessage } from "@/lib/api";
import { useChartTheme } from "@/lib/theme";
import type { Health } from "@/lib/types";
import { formatDuration, formatNumber } from "@/lib/utils";

const POLL_MS = 5000;
const KEEP = 120; // 10 minutes of samples

interface Sample {
    t: number;
    heap: number;
    rss: number;
    latency: number;
}

export default function HealthPage() {
    const t = useChartTheme();
    const [health, setHealth] = useState<Health | null>(null);
    const [error, setError] = useState("");
    const [samples, setSamples] = useState<Sample[]>([]);
    const [live, setLive] = useState(true);

    useEffect(() => {
        let stop = false;
        const tick = async () => {
            const start = performance.now();
            try {
                const r = await api<{ health: Health }>("/api/admin/health");
                if (stop) return;
                const latency = Math.round(performance.now() - start);
                setHealth(r.health);
                setError("");
                setSamples((s) => [...s, { t: Date.now(), heap: r.health.memory.heapUsedMB, rss: r.health.memory.rssMB, latency }].slice(-KEEP));
            } catch (e) {
                if (!stop) setError(errorMessage(e));
            }
        };
        tick();
        if (!live) return () => void (stop = true);
        const id = setInterval(() => document.visibilityState === "visible" && tick(), POLL_MS);
        return () => {
            stop = true;
            clearInterval(id);
        };
    }, [live]);

    const h = health;
    const last = samples[samples.length - 1];

    return (
        <div className="space-y-5">
            <PageHeader
                title="System health"
                description={`Backend process, database and MQTT broker. ${live ? `Live, every ${POLL_MS / 1000}s.` : "Paused."}`}
                actions={
                    <Button size="sm" onClick={() => setLive((l) => !l)}>
                        {live ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {live ? "Pause" : "Resume"}
                    </Button>
                }
            />

            {error && <ErrorState message={error} />}

            {!h ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[76px] rounded-2xl" />
                    ))}
                </div>
            ) : (
                <>
                    <Card className={h.status === "healthy" ? "border-emerald-500/30" : "border-amber-500/40"}>
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                            <div className="flex items-center gap-3">
                                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${h.status === "healthy" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                                    <HeartPulse className="h-6 w-6" />
                                </span>
                                <div>
                                    <div className="text-lg font-bold">{h.status === "healthy" ? "All systems operational" : "Degraded"}</div>
                                    <div className="text-sm text-zinc-500">{h.status === "healthy" ? "MongoDB and the MQTT broker are connected." : "One or more dependencies are disconnected. Telemetry ingest or device control may be affected."}</div>
                                </div>
                            </div>
                            <Badge tone={h.status === "healthy" ? "green" : "amber"} dot>
                                {h.status}
                            </Badge>
                        </div>
                    </Card>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <StatTile label="Uptime" value={formatDuration(h.uptimeSeconds)} icon={Clock} tone="indigo" />
                        <StatTile label="MongoDB" value={h.mongo.connected ? "Connected" : "Down"} icon={Database} tone={h.mongo.connected ? "green" : "red"} />
                        <StatTile label="MQTT broker" value={h.mqtt.connected ? "Connected" : "Down"} icon={Radio} tone={h.mqtt.connected ? "green" : "red"} />
                        <StatTile label="API round trip" value={last ? `${last.latency} ms` : "—"} icon={Server} tone={last && last.latency > 1000 ? "amber" : "neutral"} hint="From this browser" />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader title="Heap memory" subtitle={`${h.memory.heapUsedMB} MB used of ${h.memory.heapTotalMB} MB allocated`} icon={Cpu} />
                            <div className="space-y-4 p-4 sm:p-5">
                                <Meter value={h.memory.heapUsedMB} max={h.memory.heapTotalMB} label="Heap used" />
                                <LiveArea data={samples} dataKey="heap" color={t.series[0]} unit=" MB" />
                            </div>
                        </Card>
                        <Card>
                            <CardHeader title="Resident memory (RSS)" subtitle={`${h.memory.rssMB} MB`} icon={Cpu} />
                            <div className="p-4 sm:p-5">
                                <LiveArea data={samples} dataKey="rss" color={t.series[1]} unit=" MB" height={150} />
                            </div>
                        </Card>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader title="Database" icon={HardDrive} />
                            <dl className="grid grid-cols-2 gap-4 p-4 sm:p-5">
                                <KeyValue label="Data size">{h.mongo.dataSizeMB !== undefined ? `${h.mongo.dataSizeMB.toFixed(1)} MB` : "—"}</KeyValue>
                                <KeyValue label="Storage size">{h.mongo.storageSizeMB !== undefined ? `${h.mongo.storageSizeMB.toFixed(1)} MB` : "—"}</KeyValue>
                                <KeyValue label="Collections">{formatNumber(h.mongo.collections)}</KeyValue>
                                <KeyValue label="Documents">{formatNumber(h.mongo.objectsCount)}</KeyValue>
                            </dl>
                        </Card>
                        <Card>
                            <CardHeader title="API latency" subtitle="Round trip from this browser to /api/admin/health" icon={Server} />
                            <div className="p-4 sm:p-5">
                                <LiveArea data={samples} dataKey="latency" color={t.series[2]} unit=" ms" height={150} domain={[0, "auto"]} />
                            </div>
                        </Card>
                    </div>
                    <p className="text-center text-xs text-zinc-400">Charts hold the last {Math.round((KEEP * POLL_MS) / 60000)} minutes while this page is open.</p>
                </>
            )}
        </div>
    );
}
