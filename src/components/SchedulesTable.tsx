"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { fetchClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface Schedule {
    _id: string;
    name: string;
    device_id: string;
    schedule: string; // Cron or time
    active: boolean;
}

export function SchedulesTable({ schedules: initialSchedules }: { schedules: Schedule[] }) {
    const [schedules, setSchedules] = useState(initialSchedules);
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this schedule?")) {
            try {
                const res = await fetchClient(`/api/admin/schedules/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setSchedules(schedules.filter((s) => s._id !== id));
                    router.refresh();
                } else {
                    alert("Failed to delete schedule");
                }
            } catch (err) {
                console.error(err);
                alert("Error deleting schedule");
            }
        }
    };

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Device ID</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Expression</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-900">Status</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-900">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {schedules.map((schedule) => (
                        <tr key={schedule._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-900">{schedule.name}</td>
                            <td className="px-4 py-2 text-gray-700">{schedule.device_id}</td>
                            <td className="px-4 py-2 font-mono text-gray-600">{schedule.schedule}</td>
                            <td className="px-4 py-2 text-gray-700">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${schedule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {schedule.active ? "Active" : "Inactive"}
                                </span>
                            </td>
                            <td className="px-4 py-2 text-right">
                                <button
                                    onClick={() => handleDelete(schedule._id)}
                                    className="inline-flex items-center gap-1 rounded border border-red-500 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                                >
                                    <Trash2 className="h-3 w-3" />
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
