# MP4 STUDIO — Product roadmap

## Product vision

Build a dependable, browser-first video toolbox that combines the privacy and low-friction experience of local conversion with optional server capacity for demanding jobs.

**Positioning:** "Your videos. Your choice. Local or cloud."

The competitive objective is to compete on clarity, privacy, reliability, useful controls, and predictable performance—not to claim that every codec or file size is supported.

## Product principles

- Local processing is the default.
- Cloud processing is opt-in and clearly labeled.
- No account is required for basic local conversion.
- Never claim a format is supported until it has passed an automated fixture test.
- Preserve the original file; create a separate output.
- Show useful errors, not raw technical stack traces.
- Make limits and retention visible before upload.

## Phases and acceptance criteria

### Phase 0 — Stabilize the current release

- Fix and verify the FFmpeg WebAssembly worker loading path.
- Add explicit engine state: idle, loading, ready, converting, failed.
- Prevent duplicate conversion clicks and clean up temporary virtual files.
- Handle duplicate names, unsupported inputs, empty files, and browser memory limits.
- Add a small test corpus and document browser/device limitations.
- Verify the deployed GitHub Pages build.

**Exit criteria:** the same supported fixtures convert repeatedly in current Chrome, Edge, and Firefox desktop; failures show a readable explanation; no upload occurs.

### Phase 1 — Professional local toolbox

- Refresh responsive UI while retaining MP4 STUDIO identity.
- Batch queue: reorder, remove, retry, clear completed.
- Output profiles: social, web, archive, mobile, high quality, compact.
- Controls: resolution, frame rate, video quality/bitrate, audio codec/bitrate, mute.
- Utilities: extract audio, trim, rotate, inspect metadata.
- Show source/output sizes and compression ratio.
- Persist preferences locally; history remains local unless user opts into sync.
- Add localization framework (French and English initially).

**Exit criteria:** each tool has validation, progress, cancellation where technically safe, and automated tests.

### Phase 2 — Hybrid backend foundation

- Deploy an API separately from GitHub Pages.
- Add short-lived upload authorization and object storage.
- Add Redis-backed queue and isolated FFmpeg workers.
- Implement job status, cancellation, expiry, and signed downloads.
- Enforce upload size, duration, concurrency, CPU, memory, and execution-time limits.
- Delete temporary input/output objects automatically.
- Add observability without logging file contents or sensitive filenames.

**Exit criteria:** a user explicitly chooses cloud processing, receives a job ID, can track it, and can download the output before automatic expiry.

### Phase 3 — Accounts and professional workflows

- Optional accounts; local conversion remains available without sign-up.
- Saved presets and cloud job history.
- Usage quotas and transparent pricing.
- Team/workspace features only after demand is validated.
- Billing integration only after legal, tax, and payment-provider review.
- Support and abuse-reporting process.

**Exit criteria:** account deletion, data export, billing lifecycle, quota enforcement, and retention controls are tested.

### Phase 4 — Scale and ecosystem

- Public API with keys, quotas, documentation, and versioning.
- Webhooks for completed/failed jobs.
- Queue autoscaling and regional deployment based on real usage.
- Accessibility audit, performance budgets, security review, and disaster recovery.
- Partnerships and integrations only where user demand supports them.

## Proposed feature priorities

| Priority | Capability | Reason |
|---|---|---|
| P0 | Reliable conversion and diagnostics | Trust comes first |
| P0 | Batch queue and cleanup | Core workflow |
| P1 | Compression and output presets | High-value daily use |
| P1 | Trim, rotate, audio extraction | Makes the tool useful beyond conversion |
| P1 | Server job pipeline | Enables demanding files |
| P2 | Accounts and synced history | Retention and professional workflows |
| P2 | Subscription and public API | Monetization after product validation |

## Metrics to measure

- Conversion success rate by input container/codec and browser.
- Median and 95th-percentile processing time.
- Browser memory failures and server worker failures.
- Upload abandonment rate and cloud consent rate.
- Output size reduction and user retry rate.
- Time to first successful conversion.
- Cost per completed server job.
- Deletion/expiry compliance.

Do not optimize for vanity metrics before successful conversions and repeat usage.
