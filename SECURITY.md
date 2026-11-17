# Security Policy

## Scope

SES Mail Viewer is a **local development tool**. It is meant to run on a developer machine or inside a private Docker network next to LocalStack.

> ⚠️ **Do not expose it to the public internet.** It has no authentication, and anyone who can reach it can read and delete every email stored in your LocalStack, and send requests to LocalStack through its proxy.

## Supported versions

Only the latest release on `main` receives fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's [private vulnerability reporting](../../security/advisories/new) instead. Include:

- a description of the issue and its impact;
- steps to reproduce (a sample email that triggers it is ideal);
- the version or commit you tested.

You can expect an initial response within a few days. Once a fix is ready, we'll publish an advisory and credit you if you wish.

## Hardening notes

- Email HTML is rendered in a sandboxed `iframe` **without** `allow-scripts` and with a CSP that blocks scripts, objects and nested frames. Reports of sandbox escapes are especially welcome.
- The proxy only forwards to the single `LOCALSTACK_ENDPOINT` you configure.
