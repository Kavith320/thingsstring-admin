"use client";

import { useState } from "react";
import { fetchClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Trash2, ToggleLeft, ToggleRight, Workflow, Activity } from "lucide-react";

export interface AutomationFlow {
    _id: string;
    name?: string;
    deviceId?: string;
    enabled?: boolean;
    intervalSec?: number;
    metricPath?: string;
    condition?: {
        operator?: string;
        value?: number;
    };
    deltaThreshold?: number;
    action?: {
        deviceId?: string;
        actuatorKey?: string;
        setValue?: any;
    };
    owner?: {
        email?: string;
        name?: string;
    };
}

export function AutomationFlowsTable({ flows: initialFlows }: { flows: AutomationFlow[] }) {
    const [flows, setFlows] = useState(initialFlows);
    const router = useRouter();

    const handleToggle = async (flowId: string, currentEnabled?: boolean) => {
        const newStatus = !currentEnabled;
        try {
            let res = await fetchClient(`/api/admin/automation/flows/${flowId}/toggle`, {
                method: "PUT",
                body: JSON.stringify({ enabled: newStatus }),
            });

            if (res.status === 404) {
                // Fallback to standard PUT /api/automation/flows/:id
                const flowToUpdate = flows.find(f => f._id === flowId);
                res = await fetchClient(`/api/automation/flows/${flowId}`, {
                    method: "PUT",
                    body: JSON.stringify({ ...flowToUpdate, enabled: newStatus }),
                });
            }

            if (res.ok) {
                setFlows(flows.map(f => f._id === flowId ? { ...f, enabled: newStatus } : f));
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.message || data.error || "Failed to toggle flow status");
            }
        } catch (err) {
            console.error(err);
            alert("Error toggling flow");
        }
    };

    const handleDelete = async (flowId: string) => {
        if (confirm("Are you sure you want to delete this automation flow?")) {
            try {
                let res = await fetchClient(`/api/admin/automation/flows/${flowId}`, {
                    method: "DELETE",
                });
                if (res.status === 404) {
                    // Fallback to standard DELETE /api/automation/flows/:id
                    res = await fetchClient(`/api/automation/flows/${flowId}`, {
                        method: "DELETE",
                    });
                }
                if (res.ok) {
                    setFlows(flows.filter(f => f._id !== flowId));
                    router.refresh();
                } else {
                    const data = await res.json().catch(() => ({}));
                    alert(data.message || data.error || "Failed to delete flow");
                }
            } catch (err) {
                console.error(err);
                alert("Error deleting flow");
            }
        }
    };

    if (flows.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                <Workflow className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p>No automation flows found in the system.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Flow Name</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Owner</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Sensor Hub</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Target Hub & Pin</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-900">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {flows.map((flow) => (
                        <tr key={flow._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">
                                {flow.name || "Untitled Flow"}
                                <div className="text-xs font-mono text-gray-400">{flow._id}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                                {flow.owner?.email || flow.owner?.name || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                                <span className="font-mono text-xs">{flow.deviceId || "N/A"}</span>
                                {flow.metricPath && (
                                    <div className="text-xs text-gray-500">Metric: {flow.metricPath}</div>
                                )}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                                <span className="font-mono text-xs">{flow.action?.deviceId || "N/A"}</span>
                                {flow.action?.actuatorKey && (
                                    <div className="text-xs text-gray-500">
                                        Pin: <span className="font-semibold">{flow.action.actuatorKey}</span> = {String(flow.action.setValue)}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <button
                                    onClick={() => handleToggle(flow._id, flow.enabled)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                                        flow.enabled
                                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {flow.enabled ? (
                                        <>
                                            <ToggleRight className="h-4 w-4 text-green-600" />
                                            Active
                                        </>
                                    ) : (
                                        <>
                                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                                            Disabled
                                        </>
                                    )}
                                </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button
                                    onClick={() => handleDelete(flow._id)}
                                    className="inline-flex items-center gap-1 rounded border border-red-500 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                                    title="Delete Flow"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
