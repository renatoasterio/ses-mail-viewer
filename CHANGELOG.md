# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-11-17

### Added

- Outlook‑style three‑pane inbox built with Fluent UI v9, with light and dark themes.
- Support for `SendEmail`, `SendTemplatedEmail` (rendered with Handlebars via `GetTemplate`) and `SendRawEmail` (parsed with postal‑mime).
- Folders for unread and with attachments, plus filters by recipient and sender.
- Full‑text search across subject, addresses, body, attachment names and message ID.
- Auto‑refresh with configurable interval, new‑mail notification and unread count in the tab title.
- Sandboxed HTML rendering with desktop and mobile (375 px) preview.
- Inspection tabs: text, HTML source, decoded headers, raw MIME and SES JSON.
- Attachment download and preview, inline `cid:` images, `.eml` export.
- Delete one message or empty the inbox in LocalStack.
- Keyboard shortcuts.
- Docker image (nginx) with runtime `LOCALSTACK_ENDPOINT` and lazy DNS resolution.
- `npm run seed` script that sends sample emails of every kind.

[Unreleased]: https://github.com/renatoasterio/ses-mail-viewer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/renatoasterio/ses-mail-viewer/releases/tag/v1.0.0
