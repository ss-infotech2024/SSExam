# SSExam - Node.js backend with load balancing

## What changed

- Added Node.js `cluster` based load balancing in `backend/server.js`.
- Incoming connections are distributed using round-robin scheduling.
- The app starts up to 2 worker processes by default.
- Set `CLUSTER_WORKERS` in `.env` to change the number of workers.
- Added graceful shutdown and replacement of unexpectedly exited workers.
- Added `GET /api/load-balancer-health` to show the worker ID and process ID for testing.
- Added `npm start`.
- Added `.env.example`.

## Run locally

From `backend/`:

```powershell
npm install
npm start
```

For development, you can continue using:

```powershell
npx nodemon server.js
```

Make sure your existing `.env` is present in `backend/`. A template is provided as `.env.example`.

## Test the load balancing

Open:

```text
http://localhost:5000/api/load-balancer-health
```

Call it multiple times using new HTTP connections and observe `workerId` / `pid`.

Example PowerShell loop:

```powershell
1..10 | ForEach-Object { curl.exe -s http://localhost:5000/api/load-balancer-health }
```

Note: Node's cluster module balances **connections** among worker processes. A persistent keep-alive connection can continue to use the same worker; this is normal.

## Important for deployment

This is process-level load balancing on one machine. If you deploy multiple separate servers/containers, put a reverse proxy or cloud load balancer in front of them as well.
