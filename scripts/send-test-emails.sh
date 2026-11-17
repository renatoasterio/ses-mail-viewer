#!/usr/bin/env bash
#
# Envia e-mails de exemplo ao SES do LocalStack para testar o visualizador:
#   - SendEmail com HTML + texto e Cc
#   - SendEmail só com texto
#   - SendTemplatedEmail (cria o template "pedido-confirmado")
#   - SendRawEmail com imagem inline (cid:) e anexos PDF/CSV
#
# Uso:  npm run seed
#       LOCALSTACK_ENDPOINT=http://localhost:4566 bash scripts/send-test-emails.sh
#
# Requer AWS CLI v2.
set -euo pipefail

ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
REGION="${AWS_REGION:-us-east-1}"
FROM="${SEED_FROM:-no-reply@example.com}"
TO="${SEED_TO:-dev@example.com}"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_PAGER=""

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ses() { aws --endpoint-url "$ENDPOINT" --region "$REGION" --output text ses "$@"; }

echo "LocalStack: $ENDPOINT ($REGION)"
echo "→ Verificando remetente $FROM"
ses verify-email-identity --email-address "$FROM" >/dev/null

# ---------------------------------------------------------------------------
echo "→ SendEmail (HTML + texto)"
cat >"$TMP/simple.json" <<JSON
{
  "Subject": { "Data": "Bem-vindo(a) à plataforma 🎉", "Charset": "UTF-8" },
  "Body": {
    "Text": { "Data": "Olá, Maria!\n\nSua conta foi criada com sucesso.\nAcesse: https://example.com/login\n\nEquipe Exemplo", "Charset": "UTF-8" },
    "Html": { "Data": "<html><body style='margin:0;background:#f3f2f1;font-family:Segoe UI,Arial,sans-serif'><table width='100%' cellpadding='0' cellspacing='0'><tr><td align='center' style='padding:32px 12px'><table width='100%' style='max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden'><tr><td style='background:#0f6cbd;color:#fff;padding:24px 32px;font-size:22px;font-weight:600'>Bem-vindo(a)!</td></tr><tr><td style='padding:28px 32px;color:#242424;font-size:15px;line-height:1.5'><p>Olá, <strong>Maria</strong>!</p><p>Sua conta foi criada com sucesso. Clique no botão abaixo para acessar.</p><p style='text-align:center;margin:28px 0'><a href='https://example.com/login' style='background:#0f6cbd;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;display:inline-block'>Acessar minha conta</a></p><p style='color:#616161;font-size:13px'>Se você não criou esta conta, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>", "Charset": "UTF-8" }
  }
}
JSON
ses send-email \
  --from "Equipe Exemplo <$FROM>" \
  --destination "ToAddresses=Maria Silva <$TO>,CcAddresses=suporte@example.com" \
  --message "file://$TMP/simple.json" >/dev/null

# ---------------------------------------------------------------------------
echo "→ SendEmail (somente texto)"
ses send-email \
  --from "$FROM" \
  --destination "ToAddresses=qa@example.com" \
  --message 'Subject={Data=Código de verificação: 482913,Charset=UTF-8},Body={Text={Data=Seu código de verificação é 482913. Ele expira em 10 minutos.,Charset=UTF-8}}' >/dev/null

# ---------------------------------------------------------------------------
echo "→ SendTemplatedEmail (template pedido-confirmado)"
cat >"$TMP/template.json" <<'JSON'
{
  "TemplateName": "pedido-confirmado",
  "SubjectPart": "Pedido {{pedido}} confirmado",
  "TextPart": "Olá {{nome}}, seu pedido {{pedido}} foi confirmado. Total: {{total}}.",
  "HtmlPart": "<div style='font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:24px auto;color:#242424'><h2 style='color:#0f6cbd'>Pedido {{pedido}} confirmado ✅</h2><p>Olá <strong>{{nome}}</strong>, recebemos o seu pedido.</p><table style='border-collapse:collapse;width:100%'><tr><td style='padding:8px;border-bottom:1px solid #e0e0e0'>Entrega</td><td style='padding:8px;border-bottom:1px solid #e0e0e0;text-align:right'>{{entrega}}</td></tr><tr><td style='padding:8px'><strong>Total</strong></td><td style='padding:8px;text-align:right'><strong>{{total}}</strong></td></tr></table></div>"
}
JSON
ses delete-template --template-name pedido-confirmado >/dev/null 2>&1 || true
ses create-template --template "file://$TMP/template.json" >/dev/null
ses send-templated-email \
  --source "Loja Exemplo <$FROM>" \
  --destination "ToAddresses=$TO" \
  --template pedido-confirmado \
  --template-data '{"nome":"Maria","pedido":"#12345","entrega":"Em até 3 dias úteis","total":"R$ 149,90"}' >/dev/null

# ---------------------------------------------------------------------------
echo "→ SendRawEmail (imagem inline + anexos PDF e CSV)"
cat >"$TMP/raw.eml" <<EML
From: Financeiro Exemplo <$FROM>
To: Maria Silva <$TO>
Cc: contabilidade@example.com
Reply-To: atendimento@example.com
Subject: =?UTF-8?B?$(printf 'Nota fiscal do pedido #12345 – anexos' | base64)?=
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="mixed-boundary"

--mixed-boundary
Content-Type: multipart/related; boundary="related-boundary"

--related-boundary
Content-Type: multipart/alternative; boundary="alt-boundary"

--alt-boundary
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

Olá Maria,

Segue em anexo a nota fiscal do pedido #12345 e o detalhamento dos itens.

Financeiro Exemplo

--alt-boundary
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: 8bit

<html><body style="font-family:Segoe UI,Arial,sans-serif;color:#242424">
<p><img src="cid:logo@exemplo" width="48" height="48" alt="Logo"></p>
<p>Olá <strong>Maria</strong>,</p>
<p>Segue em anexo a nota fiscal do pedido <strong>#12345</strong> e o detalhamento dos itens.</p>
<p>Financeiro Exemplo</p>
</body></html>

--alt-boundary--

--related-boundary
Content-Type: image/png
Content-Transfer-Encoding: base64
Content-ID: <logo@exemplo>
Content-Disposition: inline; filename="logo.png"

iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAqUlEQVR42u3Y2Q2DQAwFwO2ARmmR
2kIBSGEP2yJkEL/YHj+kRbRtP376bgAAAAAAAAAAAAAAAAAAdYBP2lWXwEOmHwNceySNPoRpE1uP
Ndy2iAdERdFfPx6wHkV/5UTAXBQTZRMBo1FMFKwA9Ox1pVoF4PuCF1+zOsBt7/BDrSWdvuGPA4xM
kFehLoGyDzsAAAAAAIB/AfgzBwAAAAAAAAAAAAAAAPAqwAlPaK0F8Ay+vwAAAABJRU5ErkJggg==

--related-boundary--

--mixed-boundary
Content-Type: application/pdf; name="nota-fiscal-12345.pdf"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="nota-fiscal-12345.pdf"

JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2Jq
CjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2Jq
CjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUg
ODQyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4g
Pj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA2NiA+PgpzdHJlYW0KQlQgL0YxIDI0IFRm
IDcyIDc2MCBUZCAoUGVkaWRvIDEyMzQ1IC0gTm90YSBmaXNjYWwgZGUgdGVzdGUpIFRqIEVUCmVu
ZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jh
c2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAK
MDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAg
biAKMDAwMDAwMDI0MSAwMDAwMCBuIAowMDAwMDAwMzU3IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1Np
emUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNDI3CiUlRU9GCg==

--mixed-boundary
Content-Type: text/csv; charset=UTF-8; name="itens.csv"
Content-Disposition: attachment; filename="itens.csv"

item,quantidade,valor
Camiseta,2,99.80
Caneca,1,50.10

--mixed-boundary--
EML
ses send-raw-email --raw-message "Data=$(base64 <"$TMP/raw.eml" | tr -d '\n')" >/dev/null

echo "✓ 4 e-mails enviados. Abra o visualizador para conferir."
