# Target architecture

## High-level flow

```text
Browser UI
  |-- Local mode (default) --> FFmpeg WebAssembly --> local download
  |
  |-- Cloud mode (explicit consent)
        --> API: create upload session
        --> Object storage: temporary source upload
        --> API: submit job
        --> Redis queue
        --> isolated FFmpeg worker
        --> Object storage: temporary result
        --> API: job status + short-lived download URL
        --> browser download
```

## Components

### Frontend

- Keep GitHub Pages as the static frontend host for the current stage.
- Split the single HTML file into maintainable modules when the local toolset is stabilized.
- A processing adapter chooses local or cloud mode; it must not silently switch to cloud after a local failure.
- The UI displays engine, upload destination, file retention, and estimated constraints before cloud processing.
- Store only preferences and local history in browser storage. Never store cloud credentials or permanent storage secrets in frontend code.

### Local processing

- FFmpeg WebAssembly runs in a Web Worker.
- Worker and wrapper assets must be served in a browser-compatible way from the application origin or via a verified supported deployment configuration.
- Load core/WASM assets from pinned, integrity-checked releases; avoid floating versions.
- Check browser memory and input size before starting.
- Revoke object URLs and delete virtual filesystem entries after each task.
- Do not promise hardware acceleration unless detected and tested.

### API

Suggested initial stack: Node.js + TypeScript + Fastify (or NestJS if the team chooses a more structured framework), Redis + BullMQ, PostgreSQL for durable job/account metadata, and S3-compatible object storage.

Responsibilities:
- Authentication for account features (not required for local mode).
- Rate limits and abuse controls.
- Create upload sessions with strict size/type limits.
- Validate job settings against an allowlist.
- Create and track jobs.
- Issue short-lived signed upload/download URLs.
- Enforce cancellation, expiry, quotas, and ownership.
- Never accept arbitrary FFmpeg command-line arguments from the client.

### Worker

- Separate process/container from the API.
- Pinned FFmpeg build and known codec inventory.
- One job per isolated working directory/container.
- CPU, memory, disk, process, and wall-clock limits.
- No outbound network access during media processing unless explicitly required.
- Parse media metadata safely and validate streams.
- Delete working files on success, failure, timeout, and shutdown.
- Upload outputs to private object storage; never expose public bucket URLs.

### Storage and queue

- Redis/BullMQ is the job queue, not the durable source of truth.
- PostgreSQL stores job state, ownership, timestamps, settings, and object keys.
- Object storage is private and temporary.
- Lifecycle rules expire abandoned uploads and completed results.
- Use idempotency keys to avoid duplicate jobs after retries.

## Job lifecycle

```text
created -> awaiting_upload -> queued -> processing -> completed
                                      |-> failed
                                      |-> cancelled
created/awaiting_upload -> expired
```

Transitions must be validated server-side. A terminal job cannot return to processing.

## Hosting boundaries

GitHub Pages can host the frontend only. It does not run Node.js APIs, Redis, PostgreSQL, or FFmpeg workers. Backend deployment must be provisioned separately. Do not add production secrets to this repository or frontend build.

## Initial deployment topology

- Static frontend: GitHub Pages.
- API: container platform or managed application host.
- Queue: managed Redis.
- Metadata: managed PostgreSQL.
- Media: private S3-compatible bucket.
- Worker: separate container image with FFmpeg installed.
- Monitoring: request/job metrics, structured logs, error tracking, and alerts.

Start with one region and conservative worker concurrency. Scale from measured workload, not assumptions.
