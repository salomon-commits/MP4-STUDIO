# MP4 STUDIO

MP4 STUDIO is a browser-first video conversion platform. The product keeps its current identity and follows a hybrid strategy:

- **Local engine first:** process files on the user's device with FFmpeg WebAssembly.
- **Server engine by choice:** offer a secure server-side path for large files, long jobs, or devices that cannot handle local processing.
- **Explicit privacy:** never upload a video silently. The interface must explain where processing happens and obtain consent before server upload.

## Current status

The published application is a static HTML prototype hosted on GitHub Pages. It currently implements local conversion only. The server engine, accounts, cloud history, and subscriptions are **planned, not implemented**.

## Product principles

1. A useful free local workflow without mandatory account creation.
2. Clear quality, resolution, and audio controls.
3. Batch processing with visible progress and actionable errors.
4. Privacy-first defaults and transparent retention.
5. Accessible, responsive interface in French first, ready for internationalization.
6. No promise of universal codec support: compatibility depends on the FFmpeg build and source codec.

## Documentation

- [Product roadmap](docs/ROADMAP.md)
- [Target architecture](docs/ARCHITECTURE.md)
- [API contract](docs/API-CONTRACT.md)
- [Security and privacy](docs/SECURITY.md)
- [Server implementation plan](server/README.md)

## Development status

See the roadmap before implementing new modules. GitHub Pages can host the frontend, but it cannot run the API, Redis queue, or FFmpeg workers. The hybrid backend will require a separate server/container hosting environment and object storage.
