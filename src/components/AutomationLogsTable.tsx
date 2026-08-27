"use client";

import { useState, useEffect } from "react";
import { fetchClient } from "@/lib/api-client";
import { History, Filter, RefreshCw } from "lucide-react";

export interface AutomationLog {
    _id?: string;
    flowId?: string;
    deviceId?: string;
    status?: string;
    reason?: string;
    executedAt?: string;
    timestamp?: string;
    actionTaken?: any;
}

export function AutomationLogsTable() {
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [limit, setLimit] = useState<number>(50);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let url = `/api/admin/automation/logs?limit=${limit}`;
            if (statusFilter !== "ALL") {
                url += `&status=${statusFilter}`;
            }

            const res = await fetchClient(url);
            if (res.ok) {
                const data = await res.json();
                setLogs(Array.isArray(data) ? data : data.logs || []);
            } else {
                setLogs([]);
            }
        } catch (err) {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [statusFilter, limit]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <Filter className="h-3.5 w-3.5" />
                        Status Filter:
                    </span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="RAN">RAN</option>
                        <option value="SKIPPED">SKIPPED</option>
                    </select>

                    <span className="text-xs font-semibold text-gray-700 ml-2">Limit:</span>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none"
                    >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-900">Timestamp</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-900">Flow ID</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-900">Device ID</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-900">Status</th>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-900">Details / Reason</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-xs text-gray-500">
                                    Loading execution logs...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-xs text-gray-500">
                                    No automation execution logs found.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log, index) => (
                                <tr key={log._id || index} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-xs text-gray-600">
                                        {log.executedAt || log.timestamp ? new Date(log.executedAt || log.timestamp!).toLocaleString() : "N/A"}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs text-gray-800">{log.flowId || "N/A"}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-gray-800">{log.deviceId || "N/A"}</td>
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                                            log.status === "RAN" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"
                                        }`}>
                                            {log.status || "UNKNOWN"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">
                                        {log.reason || (log.actionTaken ? JSON.stringify(log.actionTaken) : "N/A")}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
