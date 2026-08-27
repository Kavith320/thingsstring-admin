"use client";

import { useState, useEffect } from "react";
import { fetchClient } from "@/lib/api-client";
import { ShieldAlert, Filter, RefreshCw, UserCheck } from "lucide-react";

interface AuditLog {
    _id?: string;
    action?: string;
    adminEmail?: string;
    targetId?: string;
    details?: any;
    timestamp?: string;
    createdAt?: string;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [actionFilter, setActionFilter] = useState<string>("");
    const [adminEmailFilter, setAdminEmailFilter] = useState<string>("");
    const [targetIdFilter, setTargetIdFilter] = useState<string>("");
    const [limit, setLimit] = useState<number>(100);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("limit", String(limit));
            if (actionFilter) params.set("action", actionFilter);
            if (adminEmailFilter) params.set("adminEmail", adminEmailFilter);
            if (targetIdFilter) params.set("targetId", targetIdFilter);

            const res = await fetchClient(`/api/admin/audit-logs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(Array.isArray(data) ? data : data.logs || []);
            } else {
                console.error("Failed to fetch audit logs");
            }
        } catch (err) {
            console.error("Error fetching audit logs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, [limit]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAuditLogs();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Audit Logs</h1>
                    <p className="text-sm text-gray-500">History of administrative operations, setting changes, and system control events</p>
                </div>
            </div>

            {/* Filter Bar */}
            <form onSubmit={handleSearch} className="rounded-lg bg-white p-4 shadow space-y-4">
                <div className="flex items-center gap-2 font-medium text-xs text-gray-700">
                    <Filter className="h-4 w-4 text-blue-600" />
                    Filter Audit Logs
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">Action Type</label>
                        <input
                            type="text"
                            placeholder="e.g. DELETE_USER, LOCKOUT_DEVICE"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Admin Email</label>
                        <input
                            type="text"
                            placeholder="admin@example.com"
                            value={adminEmailFilter}
                            onChange={(e) => setAdminEmailFilter(e.target.value)}
                            className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Target ID</label>
                        <input
                            type="text"
                            placeholder="User / Device / Flow ID"
                            value={targetIdFilter}
                            onChange={(e) => setTargetIdFilter(e.target.value)}
                            className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700">Max Results</label>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                        >
                            <option value={50}>50 records</option>
                            <option value={100}>100 records</option>
                            <option value={250}>250 records</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Apply Filters
                    </button>
                </div>
            </form>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Timestamp</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Action</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Admin Email</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Target ID</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-900">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-xs text-gray-500">
                                    Loading audit logs...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-xs text-gray-500">
                                    No audit log entries matching criteria.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log, index) => (
                                <tr key={log._id || index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {log.timestamp || log.createdAt ? new Date(log.timestamp || log.createdAt!).toLocaleString() : "N/A"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                                            {log.action || "ADMIN_ACTION"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium text-gray-900">{log.adminEmail || "N/A"}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.targetId || "N/A"}</td>
                                    <td className="px-4 py-3 text-xs text-gray-600 max-w-sm truncate">
                                        {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details || "N/A")}
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
