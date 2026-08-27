import { fetchWithAuth } from "@/lib/api";
import { AutomationFlowsTable, AutomationFlow } from "@/components/AutomationFlowsTable";
import { AutomationLogsTable } from "@/components/AutomationLogsTable";
import { Workflow, History } from "lucide-react";

export const dynamic = "force-dynamic";

async function getAutomationFlows(): Promise<AutomationFlow[]> {
    try {
        let res = await fetchWithAuth("/api/admin/automation/flows", { cache: "no-store" });
        if (res.status === 404) {
            // Fallback to standard user automation flows endpoint
            res = await fetchWithAuth("/api/automation/flows", { cache: "no-store" });
        }
        if (!res.ok) {
            console.warn(`Could not fetch automation flows (${res.status})`);
            return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : data.flows || [];
    } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
        console.error("Error fetching automation flows:", err);
        return [];
    }
}

export default async function AutomationsPage() {
    const flows = await getAutomationFlows();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Automation Flow Oversight</h1>
                    <p className="text-sm text-gray-500">Monitor, toggle, and manage automation flows across all system users</p>
                </div>
            </div>

            {/* Automation Flows List */}
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Workflow className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-medium text-gray-900">Active & Configured Automation Rules</h2>
                </div>
                <AutomationFlowsTable flows={flows} />
            </div>

            {/* Execution History Logs */}
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                    <History className="h-5 w-5 text-purple-600" />
                    <h2 className="text-lg font-medium text-gray-900">Global Execution Logs</h2>
                </div>
                <AutomationLogsTable />
            </div>
        </div>
    );
}
