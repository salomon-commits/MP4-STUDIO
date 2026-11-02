# MP4 STUDIO server engine — implementation plan

This directory documents the planned cloud engine. It is intentionally not deployed or connected to the public frontend yet.

## Why it is separate

GitHub Pages serves static files and cannot host the API, Redis queue, database, or FFmpeg workers. The server engine needs a separate container-capable host.

## Recommended first implementation

- API: Node.js 22 LTS + TypeScript + Fastify.
- Queue: Redis + BullMQ.
- Metadata: PostgreSQL.
- Media storage: private S3-compatible bucket.
- Worker: isolated container with a pinned FFmpeg build.
- Deployment: Docker images, managed database/Redis/storage, separate API and worker services.

## Suggested layout

```text
server/
  api/
    src/
      routes/
      services/
      schemas/
      plugins/
    Dockerfile
    package.json
  worker/
    src/
      processor/
      storage/
      queue/
    Dockerfile
    package.json
  shared/
    src/
      job-types.ts
  infra/
    docker-compose.yml
    .env.example
```

## Implementation order

1. Define validated schemas and job state machine.
2. Build API health endpoint and upload-session creation.
3. Add private object storage and signed upload/download URLs.
4. Add queue producer and worker consumer.
5. Add FFmpeg probe/encode with safe allowlisted profiles.
6. Add cancellation, retries, expiry, and cleanup.
7. Add authentication, quotas, monitoring, and deployment.
8. Connect the frontend only after API security and integration tests pass.

## Required environment variables

Use a secret manager in deployment. A local `.env` file must never be committed.

- `DATABASE_URL`
- `REDIS_URL`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `API_PUBLIC_ORIGIN`
- `UPLOAD_MAX_BYTES`
- `JOB_MAX_DURATION_SECONDS`
- `RESULT_RETENTION_HOURS`

## Current implementation status

No server code, storage bucket, database, Redis instance, API endpoint, or worker is provisioned by this documentation commit. These must be created and security-tested before enabling cloud mode in the public app.
