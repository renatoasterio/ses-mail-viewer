import PostalMime, { addressParser, decodeWords, type Address, type Attachment } from 'postal-mime'
import Handlebars from 'handlebars'
import { fetchTemplate } from '../api/localstack'
import type { LocalStackSesMessage } from '../api/types'
import { parseLocalStackTimestamp } from './format'
import type { MailAddress, MailAttachment, MailMessage } from './model'

const PREVIEW_LENGTH = 220
const SEARCH_TEXT_LIMIT = 8000

/** Converte um item do endpoint `/_aws/ses` para o modelo usado pela interface. */
export async function parseMessage(msg: LocalStackSesMessage): Promise<MailMessage> {
  try {
    if (msg.RawData != null) return await parseRaw(msg)
    if (msg.Template != null) return await parseTemplated(msg)
    return parseSimple(msg)
  } catch (err) {
    // Uma mensagem malformada não pode derrubar a caixa inteira.
    const reason = err instanceof Error ? err.message : String(err)
    return finalize(msg, {
      kind: msg.RawData != null ? 'raw' : msg.Template != null ? 'template' : 'simple',
      ...fromDestination(msg),
      subject: msg.Subject ?? '(falha ao interpretar a mensagem)',
      text: `Não foi possível interpretar esta mensagem: ${reason}`,
      raw: msg.RawData,
      size: msg.RawData?.length ?? 0,
    })
  }
}

async function parseRaw(msg: LocalStackSesMessage): Promise<MailMessage> {
  const raw = msg.RawData ?? ''
  const email = await PostalMime.parse(raw, { attachmentEncoding: 'base64' })

  const from = flatten(email.from ? [email.from] : [])[0] ?? parseAddresses(msg.Source)[0] ?? emptyAddress()
  const htmlSource = email.html
  const { html, inlineKeys } = embedInlineImages(htmlSource, email.attachments)
  const attachments = email.attachments
    .map((a, i) => toAttachment(a, i))
    .filter((a) => !inlineKeys.has(a.key))

  return finalize(msg, {
    kind: 'raw',
    from,
    to: flatten(email.to),
    cc: flatten(email.cc),
    bcc: flatten(email.bcc),
    replyTo: flatten(email.replyTo),
    subject: email.subject ?? '',
    html,
    htmlSource,
    text: email.text,
    attachments,
    headers: email.headers.map((h) => ({ key: h.originalKey || h.key, value: decodeHeader(h.value) })),
    raw,
    size: raw.length,
  })
}

function parseSimple(msg: LocalStackSesMessage): MailMessage {
  const html = msg.Body?.html_part ?? undefined
  const text = msg.Body?.text_part ?? undefined
  return finalize(msg, {
    kind: 'simple',
    ...fromDestination(msg),
    subject: msg.Subject ?? '',
    html,
    htmlSource: html,
    text,
    size: (html?.length ?? 0) + (text?.length ?? 0),
  })
}

async function parseTemplated(msg: LocalStackSesMessage): Promise<MailMessage> {
  const name = msg.Template ?? ''
  const data = msg.TemplateData ?? '{}'
  const base = { kind: 'template' as const, ...fromDestination(msg) }

  try {
    const template = await fetchTemplate(name, msg.Region)
    const context = JSON.parse(data) as unknown
    const render = (source?: string) => (source ? Handlebars.compile(source)(context) : undefined)
    const html = render(template.html)
    const text = render(template.text)
    return finalize(msg, {
      ...base,
      subject: render(template.subject) ?? '',
      html,
      htmlSource: html,
      text,
      template: { name, data },
      size: (html?.length ?? 0) + (text?.length ?? 0),
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    return finalize(msg, {
      ...base,
      subject: `[Template ${name}]`,
      text: `Não foi possível renderizar o template "${name}".\n${reason}\n\nTemplateData:\n${prettyJson(data)}`,
      template: { name, data, error: reason },
      size: data.length,
    })
  }
}

type Draft = Omit<
  MailMessage,
  'id' | 'region' | 'date' | 'preview' | 'searchText' | 'original' | 'attachments' | 'headers' | 'cc' | 'bcc' | 'replyTo'
> &
  Partial<Pick<MailMessage, 'attachments' | 'headers' | 'cc' | 'bcc' | 'replyTo'>>

function finalize(msg: LocalStackSesMessage, draft: Draft): MailMessage {
  const bodyText = draft.text?.trim() ? draft.text : htmlToText(draft.htmlSource)
  const preview = collapse(bodyText).slice(0, PREVIEW_LENGTH)
  const message: MailMessage = {
    attachments: [],
    headers: [],
    cc: [],
    bcc: [],
    replyTo: [],
    ...draft,
    id: msg.Id,
    region: msg.Region,
    date: parseLocalStackTimestamp(msg.Timestamp),
    preview,
    original: msg,
    searchText: '',
  }
  message.searchText = [
    message.subject,
    message.id,
    message.template?.name,
    ...[message.from, ...message.to, ...message.cc, ...message.bcc].flatMap((a) => [a.name, a.address]),
    ...message.attachments.map((a) => a.filename),
    collapse(bodyText).slice(0, SEARCH_TEXT_LIMIT),
  ]
    .filter(Boolean)
    .join('\n')
    .toLocaleLowerCase('pt-BR')
  return message
}

function fromDestination(msg: LocalStackSesMessage) {
  return {
    from: parseAddresses(msg.Source)[0] ?? emptyAddress(),
    to: (msg.Destination?.ToAddresses ?? []).flatMap(parseAddresses),
    cc: (msg.Destination?.CcAddresses ?? []).flatMap(parseAddresses),
    bcc: (msg.Destination?.BccAddresses ?? []).flatMap(parseAddresses),
  }
}

function parseAddresses(value: string | undefined): MailAddress[] {
  if (!value) return []
  return flatten(addressParser(value))
}

function flatten(list: Address[] | undefined): MailAddress[] {
  if (!list) return []
  return list.flatMap((a) => (a.group ? a.group : [a])).map((a) => ({ name: a.name ?? '', address: a.address ?? '' }))
}

function emptyAddress(): MailAddress {
  return { name: '(sem remetente)', address: '' }
}

function toAttachment(a: Attachment, index: number): MailAttachment {
  const base64 = typeof a.content === 'string' ? a.content : bytesToBase64(new Uint8Array(a.content as ArrayBuffer))
  const contentId = a.contentId?.replace(/^<|>$/g, '')
  return {
    key: `${index}`,
    filename: a.filename || defaultFilename(a.mimeType, index),
    mimeType: a.mimeType || 'application/octet-stream',
    size: base64Size(base64),
    contentId,
    base64,
  }
}

/** Troca referências `cid:` por data URLs para que as imagens inline apareçam no iframe. */
function embedInlineImages(html: string | undefined, parts: Attachment[]) {
  const inlineKeys = new Set<string>()
  if (!html) return { html, inlineKeys }

  const byCid = new Map<string, MailAttachment>()
  parts.forEach((part, i) => {
    const att = toAttachment(part, i)
    if (att.contentId) byCid.set(att.contentId.toLowerCase(), att)
  })
  if (byCid.size === 0) return { html, inlineKeys }

  const replaced = html.replace(/cid:([^"'\s)>]+)/gi, (match, cid: string) => {
    const att = byCid.get(safeDecode(cid).toLowerCase())
    if (!att) return match
    inlineKeys.add(att.key)
    return `data:${att.mimeType};base64,${att.base64}`
  })
  return { html: replaced, inlineKeys }
}

export function htmlToText(html: string | undefined): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('style, script, head, title').forEach((el) => el.remove())
  return doc.body?.textContent ?? ''
}

function decodeHeader(value: string): string {
  try {
    return decodeWords(value)
  } catch {
    return value
  }
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function prettyJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function defaultFilename(mimeType: string, index: number): string {
  const ext = mimeType?.split('/')[1]?.split(/[+;]/)[0]
  return `anexo-${index + 1}${ext ? `.${ext}` : ''}`
}

function base64Size(b64: string): number {
  const clean = b64.replace(/\s/g, '')
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding)
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToBlob(b64: string, mimeType: string): Blob {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}
