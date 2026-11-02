# Security and privacy requirements

## User-facing promises

- Local mode processes files on the device; it does not upload source videos.
- Cloud mode is always a separate, explicit user choice.
- Before cloud upload, explain what is uploaded, why, the destination, the retention period, and how to cancel/delete.
- Never describe cloud processing as end-to-end encrypted unless the architecture and key management actually provide that property.
- Publish the actual retention policy before launch.

## Upload security

- TLS for every API and storage transfer.
- Private buckets only; no public object ACLs.
- Short-lived, single-purpose signed URLs.
- Enforce size limits at API and storage layers.
- Verify actual file signatures and probe media in an isolated worker; do not trust filename or browser MIME type.
- Generate storage keys server-side; never use user filenames as object paths.
- Rate-limit upload session creation and job submission.
- Apply quotas by account, IP/session, and plan.

## Worker isolation

- Run FFmpeg as a non-root user in a disposable container.
- Apply CPU, memory, disk, process-count, and wall-clock limits.
- Use a read-only base filesystem and dedicated temporary working directory.
- Disable unnecessary network egress.
- Never interpolate user strings into shell commands.
- Pass a validated argument array to FFmpeg without shell execution.
- Keep FFmpeg and container images patched.
- Remove temporary files on every exit path.

## Data lifecycle

- Define expiration for abandoned uploads, completed outputs, failed jobs, and metadata.
- Add automated lifecycle deletion plus a periodic reconciliation job.
- Provide a user-triggered delete path for cloud jobs.
- Keep logs free of media content, signed URLs, secrets, and unnecessary personal data.
- Define backup retention separately from live object retention.

## Accounts and billing (later phase)

- Use a reputable identity provider or audited authentication implementation.
- Protect sessions with secure, HttpOnly, SameSite cookies where applicable.
- Store password hashes only if password authentication is implemented.
- Never store payment card details; use a compliant payment provider.
- Support account deletion and data export.
- Do not launch subscriptions until quota, refund, cancellation, tax, and support policies are ready.

## Release gates

- Dependency and container vulnerability scan.
- Authorization tests for cross-user job access.
- Upload limit and malformed-file tests.
- Worker timeout and crash cleanup tests.
- Signed URL expiry tests.
- Data deletion and lifecycle verification.
- Privacy copy reviewed against actual data flows.
