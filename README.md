# ThingsString Admin

Administration console for the ThingsString IoT platform. Same look as the ThingsString user app (zinc palette, light / dark / system theme, shared logo), talking to the backend's `/api/admin/*` routes.

## Setup

```bash
npm install
# .env
NEXT_PUBLIC_API_URL=http://localhost:4000   # the ThingsString backend
npm run dev
```

Sign in with an account whose role is `admin` (create one with the backend's `scripts/create-admin.js`). Other accounts are refused at login, and any session that loses admin rights is sent back to the login page.

## Pages

| Page | Backend routes |
|---|---|
| Dashboard | `GET stats`, `health`, `email/stats`, `automation/logs`, `audit-logs` |
| Users (list + detail) | `GET users`, `PUT users/:id/role`, `PUT users/:id/status`, `POST users/:id/reset-password`, `DELETE users/:id`; create via `POST /api/auth/register` |
| Devices (list + detail) | `GET devices`, `GET devices/:id`, `GET devices/:id/telemetry`, `POST devices/:id/control`, `POST devices/:id/lockout`, `PUT devices/:id/transfer`, `DELETE devices/:id` |
| Schedules | `GET schedules`, `DELETE schedules/:id` |
| Automations (flows + run log) | `GET automation/flows`, `PUT automation/flows/:id/toggle`, `DELETE automation/flows/:id`, `GET automation/logs` |
| Broadcast control | `POST broadcast/control` |
| Maintenance | `POST maintenance/backup`, `POST maintenance/clean-telemetry`, `GET email/stats` |
| System health | `GET health` (polled live) |
| Audit logs | `GET audit-logs` |

## Notes

- The admin session token is kept in `localStorage` under `ts_admin_token` (separate from the user app's `ts_token`).
- **Telemetry cleanup** backs up the whole database first and also sets the ongoing telemetry retention (TTL) to the chosen number of days.
- Backend CORS: if `CORS_ORIGINS` is set on the backend, add this console's origin to it.
