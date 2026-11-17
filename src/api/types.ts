/** Formato devolvido pelo endpoint de retrospecção `GET /_aws/ses` do LocalStack. */
export interface LocalStackSesMessage {
  Id: string
  Region: string
  Source: string
  Timestamp: string
  /** SendEmail / SendTemplatedEmail */
  Destination?: {
    ToAddresses?: string[]
    CcAddresses?: string[]
    BccAddresses?: string[]
  }
  /** SendEmail */
  Subject?: string | null
  Body?: { text_part?: string | null; html_part?: string | null }
  /** SendRawEmail */
  RawData?: string
  /** SendTemplatedEmail */
  Template?: string
  TemplateData?: string
}

export interface SesTemplate {
  name: string
  subject: string
  html?: string
  text?: string
}
