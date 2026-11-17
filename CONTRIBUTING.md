# Contributing to SES Mail Viewer

Thanks for taking the time to contribute! 🎉 Bug reports, docs fixes, translations and features are all welcome. Issues and pull requests can be written in **English or Portuguese**.

## Ways to help

- 🐛 **Report a bug.** Open an [issue](../../issues/new/choose) with steps to reproduce. A sample email or the SES JSON (from the *JSON do SES* tab, with private data removed) helps a lot.
- 💡 **Suggest a feature.** Describe the problem you're trying to solve, not only the solution.
- 🌍 **Translate the UI.** The interface is currently Brazilian Portuguese only. An i18n layer with English is a great first big contribution.
- 📝 **Improve the docs.** Typos, clearer wording and new troubleshooting entries are always useful.

## Development setup

You need **Node.js 20.19+**, a running **LocalStack** with SES, and optionally the **AWS CLI v2** for sample data.

```bash
git clone https://github.com/renatoasterio/ses-mail-viewer.git
cd ses-mail-viewer
npm install
cp .env.example .env      # adjust LOCALSTACK_ENDPOINT / PORT if needed
npm run dev               # http://localhost:8025
npm run seed              # in another terminal: send sample emails
```

Don't have LocalStack running yet? `docker compose -f docker-compose.example.yml up localstack` starts one.

## Before opening a pull request

1. **Open an issue first** for anything bigger than a small fix, so we can agree on the approach.
2. Create a branch from `main`: `feat/short-description`, `fix/...` or `docs/...`.
3. Keep the change focused. One concern per PR is easier to review.
4. Make sure it builds:
   ```bash
   npm run typecheck
   npm run build
   ```
5. **Test it manually** with `npm run seed`, which covers all three send APIs. If you touched parsing, also try a message of your own.
6. For UI changes, add before/after screenshots in **both light and dark themes**.
7. If you changed the Docker image or nginx config, check `docker build .` and that the `/localstack` proxy still works.

## Code guidelines

- **TypeScript strict.** Avoid `any`; model LocalStack payloads in `src/api/types.ts`.
- **Fluent UI first.** Use components and `tokens` from `@fluentui/react-components` instead of hard‑coded colors, so both themes keep working.
- **One message model.** New SES payload shapes are normalized in `src/lib/parse.ts` into `MailMessage`; components should never read raw SES JSON.
- **Keep the proxy contract.** Anything the browser calls goes through `/localstack/*`, and must work in both `vite.config.ts` (dev) and `docker/default.conf.template` (Docker).
- **Security of rendered email.** Email HTML is untrusted. Never relax the iframe sandbox or CSP in `EmailFrame.tsx` without discussion.
- **No new runtime dependencies** without a good reason; this is a lightweight dev tool.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: show reply-to in message header
fix(parse): decode RFC 2047 attachment names
docs: add troubleshooting entry for 403 errors
```

## Code of conduct

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
