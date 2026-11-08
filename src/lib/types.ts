/** Shapes returned by the ThingsString backend's /api/admin routes (src/controllers/admin.controller.js). */

export interface User {
    _id: string;
    userId8: string;
    name: string;
    email: string;
    role: "user" | "admin";
    status?: "active" | "disabled";
    isActive?: boolean;
    authProvider?: "local" | "google";
    emailVerified?: boolean;
    phone?: string | null;
    organization?: string | null;
    country?: string | null;
    avatar?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export type Actuator = Record<string, any> & { state?: string; status?: boolean; auto?: boolean; type?: string; default?: Record<string, any> };

export interface DeviceConfig {
    _id: string;
    device?: { device_id?: string; model?: string; user_id?: string; [k: string]: any };
    user_id?: string;
    sensors?: string[] | Record<string, any>;
    actuators?: Record<string, Actuator>;
    isDisabled?: boolean;
    disabledReason?: string | null;
    disabledAt?: string | null;
    ownerAssignedAt?: string;
    updatedAt?: string;
    [k: string]: any;
}

export interface ControlDoc {
    _id: string;
    actuators?: Record<string, Actuator>;
}

export interface Telemetry {
    _id: string;
    deviceId: string;
    createdAt: string;
    [k: string]: any;
}

export interface ScheduleAction {
    actuator: string;
    set: Record<string, any>;
}

export interface Schedule {
    _id: string;
    deviceId: string;
    user_id: string;
    name: string;
    enabled: boolean;
    timezone: string;
    cron: string;
    actions: ScheduleAction[];
    duration_sec: number | null;
    end_actions: ScheduleAction[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Flow {
    _id: string;
    user_id: string;
    name: string;
    enabled: boolean;
    deviceId: string;
    metricPath: string;
    intervalSec?: number;
    deltaThreshold?: number;
    condition?: { operator: string; value: any } | null;
    action?: { deviceId: string; actuatorKey: string; setValue: any } | null;
    cooldownSec?: number;
    notify?: { email?: boolean };
    owner?: { name: string; email: string };
    createdAt?: string;
    updatedAt?: string;
}

export interface FlowLog {
    _id: string;
    flowId: string;
    deviceId: string;
    actuatorDeviceId?: string;
    ts: string;
    status: "ran" | "skipped" | "error";
    reason?: string;
    currentValue?: any;
    previousValue?: any;
    delta?: number;
    action?: Flow["action"];
    emailed?: boolean;
}

export interface AuditLog {
    _id: string;
    adminId: string;
    adminEmail: string;
    action: string;
    targetId: string | null;
    details: Record<string, any>;
    ip: string | null;
    userAgent: string | null;
    timestamp: string;
}

export interface Health {
    status: "healthy" | "degraded";
    uptimeSeconds: number;
    memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number };
    mongo: { connected: boolean; dataSizeMB?: number; storageSizeMB?: number; collections?: number; objectsCount?: number };
    mqtt: { connected: boolean };
}

export interface Stats {
    users: number;
    devices: number;
    telemetry_records: number;
    schedules: number;
    automation_flows: number;
}

export interface EmailStats {
    window: string;
    limit: number;
    reserved: number;
    sent24h: number;
    queued: number;
    remaining: number;
    alertsAllowed: boolean;
    sendingAllowed: boolean;
    failed24h: number;
    sentByCategory: Record<string, number>;
}

/** Every action the backend writes to admin_audit_logs. */
export const AUDIT_ACTIONS = [
    "USER_DELETE",
    "USER_ROLE_UPDATE",
    "USER_STATUS_UPDATE",
    "USER_PASSWORD_RESET",
    "DEVICE_DELETE",
    "DEVICE_CONTROL",
    "DEVICE_LOCKOUT",
    "DEVICE_UNLOCK",
    "DEVICE_TRANSFER",
    "SCHEDULE_DELETE",
    "AUTOMATION_FLOW_TOGGLE",
    "AUTOMATION_FLOW_DELETE",
    "BROADCAST_CONTROL",
    "MAINTENANCE_BACKUP",
    "MAINTENANCE_TELEMETRY_CLEANUP",
] as const;
