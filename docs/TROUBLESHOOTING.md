# Troubleshooting

### The UI says "LocalStack indisponível" (LocalStack unavailable)

The proxy can't reach LocalStack.

1. Check LocalStack is up: `curl http://localhost:4566/_localstack/health`.
2. Remember that `LOCALSTACK_ENDPOINT` is resolved **by the server/proxy, not by your browser**:

   | Viewer runs in… | LocalStack runs in… | Use |
   | --- | --- | --- |
   | `npm run dev` | Docker with port 4566 published | `http://localhost:4566` |
   | Docker | your host / published port | `http://host.docker.internal:4566` |
   | Docker Compose | same Compose project | `http://<service-name>:4566` |

3. On Linux, `host.docker.internal` needs `--add-host=host.docker.internal:host-gateway`.

The viewer retries automatically, so there's no need to restart it once LocalStack is reachable.

### The inbox is empty, but my app sent emails

- Make sure your app points to LocalStack (`endpoint_url` / `AWS_ENDPOINT_URL`) and not to real AWS.
- Check the raw endpoint: `curl http://localhost:4566/_aws/ses`. If it's empty there, the email never reached LocalStack.
- SES requires a **verified sender** even on LocalStack:
  `aws --endpoint-url http://localhost:4566 ses verify-email-identity --email-address no-reply@example.com`.
- LocalStack stores messages in memory by default, so restarting it clears them unless persistence is enabled.

### `403 Forbidden` from LocalStack

You're probably calling LocalStack directly from the browser. Always go through the viewer's `/localstack/*` proxy, which strips the `Origin` header. If you put another reverse proxy in front of the viewer, make sure it doesn't re‑add `Origin` on the way to LocalStack.

### Templated email shows "Template … não encontrado" (template not found)

LocalStack only stores the template **name** and **data** with each message, and the viewer fetches the template at display time. If the template was deleted, or created in a different region than the email was sent from, it can't be rendered. The raw `TemplateData` is still available in its own tab.

### The templated email looks different from what was sent

Same cause: the **current** version of the template is used. If you edited it after sending, resend the email.

### Bcc recipients are missing on a raw email

`SendRawEmail` destinations aren't stored by LocalStack. Only addresses in the MIME `To`/`Cc` headers are known.

### The viewer gets slow with many messages

`/_aws/ses` has no pagination, so every poll downloads everything, attachments included. Increase the refresh interval in settings or use **Esvaziar caixa** (Empty inbox).

### Port 8025 is already in use

```bash
PORT=8026 npm run dev
# or
docker run -p 8026:8026 -e PORT=8026 ...
```

### `npm run seed` fails

- Requires **AWS CLI v2** (`aws --version`).
- Uses dummy credentials (`test` / `test`) unless you have `AWS_ACCESS_KEY_ID` set. Real credentials are never needed.
- Override the target with `LOCALSTACK_ENDPOINT=... npm run seed`.

---

Still stuck? [Open an issue](https://github.com/renatoasterio/ses-mail-viewer/issues/new/choose) with your setup and the output of `curl http://localhost:4566/_aws/ses`, with personal data removed.
