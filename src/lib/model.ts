import type { LocalStackSesMessage } from '../api/types'

export type MailKind = 'simple' | 'raw' | 'template'

export interface MailAddress {
  name: string
  address: string
}

export interface MailAttachment {
  key: string
  filename: string
  mimeType: string
  size: number
  contentId?: string
  base64: string
}

export interface MailHeader {
  key: string
  value: string
}

export interface MailTemplateInfo {
  name: string
  data: string
  /** Preenchido quando não foi possível renderizar o template. */
  error?: string
}

export interface MailMessage {
  id: string
  kind: MailKind
  region: string
  date: Date
  from: MailAddress
  to: MailAddress[]
  cc: MailAddress[]
  bcc: MailAddress[]
  replyTo: MailAddress[]
  subject: string
  /** HTML pronto para exibição (imagens `cid:` já embutidas). */
  html?: string
  /** HTML exatamente como foi enviado. */
  htmlSource?: string
  text?: string
  preview: string
  /** Anexos visíveis (imagens inline referenciadas no HTML ficam de fora). */
  attachments: MailAttachment[]
  headers: MailHeader[]
  raw?: string
  template?: MailTemplateInfo
  size: number
  original: LocalStackSesMessage
  /** Texto normalizado usado na busca. */
  searchText: string
}
