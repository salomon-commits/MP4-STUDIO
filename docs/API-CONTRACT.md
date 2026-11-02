# Initial API contract (proposal)

Prefix: `/api/v1`. All cloud endpoints require TLS. Account endpoints require authentication; anonymous cloud jobs, if enabled, must use a short-lived signed session and stricter quotas.

## Create an upload session

`POST /api/v1/uploads`

Request:
```json
{
  "fileName": "recording.mov",
  "sizeBytes": 52428800,
  "contentType": "video/quicktime"
}
```

Response:
```json
{
  "uploadId": "opaque-id",
  "uploadUrl": "short-lived-signed-url",
  "expiresAt": "2026-11-02T19:30:00Z",
  "maxSizeBytes": 1073741824
}
```

The API validates file size, allowed media types, quotas, and rate limits. The URL must expire quickly and be scoped to one object key and one upload operation.

## Create a conversion job

`POST /api/v1/jobs`

Request:
```json
{
  "uploadId": "opaque-id",
  "output": {
    "container": "mp4",
    "videoCodec": "h264",
    "quality": "balanced",
    "maxHeight": 1080,
    "audio": { "codec": "aac", "bitrateKbps": 128 }
  },
  "idempotencyKey": "client-generated-unique-value"
}
```

Response:
```json
{
  "jobId": "opaque-job-id",
  "status": "queued",
  "createdAt": "2026-11-02T19:00:00Z"
}
```

Only allowlisted settings are accepted. The server maps them to safe FFmpeg arguments. The client never submits shell commands or arbitrary filter expressions.

## Read job status

`GET /api/v1/jobs/{jobId}`

Response:
```json
{
  "jobId": "opaque-job-id",
  "status": "processing",
  "progress": 42,
  "stage": "encoding",
  "createdAt": "2026-11-02T19:00:00Z",
  "expiresAt": null
}
```

Progress may be approximate. Status is authorized against the job owner/session.

## Download result

`POST /api/v1/jobs/{jobId}/download`

Response:
```json
{
  "downloadUrl": "short-lived-signed-url",
  "expiresAt": "2026-11-02T19:15:00Z"
}
```

The download URL is short-lived and private. A completed result expires automatically according to the published retention policy.

## Cancel job

`POST /api/v1/jobs/{jobId}/cancel`

Response:
```json
{ "jobId": "opaque-job-id", "status": "cancelled" }
```

Cancellation is best-effort once encoding has started.

## Standard error envelope

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "The selected file exceeds the current upload limit.",
    "requestId": "opaque-request-id"
  }
}
```

Never return internal paths, stack traces, storage credentials, or raw FFmpeg command lines.

## Initial status values

- `awaiting_upload`
- `queued`
- `processing`
- `completed`
- `failed`
- `cancelled`
- `expired`
