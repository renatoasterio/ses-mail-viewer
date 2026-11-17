import { formatAddress } from './format'
import type { MailAddress, MailMessage } from './model'
import { bytesToBase64 } from './parse'

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Nome de arquivo seguro a partir do assunto. */
export function emlFilename(message: MailMessage): string {
  const base = (message.subject || message.id)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
  return `${base || 'email'}.eml`
}

/**
 * Gera um .eml que abre no Outlook/Thunderbird. Para SendRawEmail devolve o
 * conteúdo original; para SendEmail/Template monta um multipart/alternative.
 */
export function toEml(message: MailMessage): string {
  if (message.raw) return message.raw

  const boundary = `----=_ses_viewer_${message.id.replace(/\W/g, '')}`
  const headers = [
    `From: ${encodeAddress(message.from)}`,
    message.to.length ? `To: ${message.to.map(encodeAddress).join(', ')}` : null,
    message.cc.length ? `Cc: ${message.cc.map(encodeAddress).join(', ')}` : null,
    message.bcc.length ? `Bcc: ${message.bcc.map(encodeAddress).join(', ')}` : null,
    `Subject: ${encodeWord(message.subject)}`,
    `Date: ${message.date.toUTCString()}`,
    `Message-ID: <${message.id}@localstack>`,
    `X-SES-Region: ${message.region}`,
    message.template ? `X-SES-Template: ${message.template.name}` : null,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean)

  const parts: string[] = []
  if (message.text) parts.push(mimePart('text/plain', message.text))
  if (message.htmlSource) parts.push(mimePart('text/html', message.htmlSource))
  if (parts.length === 0) parts.push(mimePart('text/plain', ''))

  return [
    headers.join('\r\n'),
    '',
    ...parts.map((p) => `--${boundary}\r\n${p}`),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

function mimePart(type: string, content: string): string {
  const b64 = utf8Base64(content).replace(/.{76}/g, '$&\r\n')
  return `Content-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64}\r\n`
}

function encodeWord(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${utf8Base64(value)}?=`
}

function encodeAddress(addr: MailAddress): string {
  return addr.name ? `${encodeWord(addr.name)} <${addr.address}>` : formatAddress(addr)
}

function utf8Base64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value))
}
