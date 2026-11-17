import type { LocalStackSesMessage, SesTemplate } from './types'

/** Todas as chamadas passam pelo proxy (Vite em dev, nginx no Docker). */
const BASE = '/localstack'
const SES_ENDPOINT = `${BASE}/_aws/ses`

export class LocalStackError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LocalStackError'
    this.status = status
  }
}

async function request(input: string, init?: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch {
    throw new LocalStackError('Não foi possível conectar ao servidor do visualizador.')
  }
  if (!res.ok) {
    // O proxy devolve 5xx quando o LocalStack está fora do ar.
    const msg =
      res.status >= 500
        ? 'LocalStack inacessível. Verifique se o container está rodando.'
        : `LocalStack respondeu ${res.status} ${res.statusText}`
    throw new LocalStackError(msg, res.status)
  }
  return res
}

export async function fetchMessages(signal?: AbortSignal): Promise<LocalStackSesMessage[]> {
  const res = await request(SES_ENDPOINT, { signal, cache: 'no-store' })
  // Antes do primeiro uso do SES o LocalStack ainda não registrou a rota e responde 200 vazio.
  const text = await res.text()
  if (!text.trim()) return []
  const body = JSON.parse(text) as { messages?: LocalStackSesMessage[] }
  return body.messages ?? []
}

export async function deleteMessage(id: string): Promise<void> {
  await request(`${SES_ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function deleteAllMessages(): Promise<void> {
  await request(SES_ENDPOINT, { method: 'DELETE' })
}

export interface RuntimeConfig {
  localstackEndpoint: string
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' })
    return res.ok ? ((await res.json()) as RuntimeConfig) : null
  } catch {
    return null
  }
}

/**
 * Busca um template via API do SES (Query API). O LocalStack não valida a
 * assinatura, mas usa o header Authorization para descobrir região e conta.
 */
export async function fetchTemplate(name: string, region: string): Promise<SesTemplate> {
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')
  const res = await request(`${BASE}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'X-Amz-Date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=test/${amzDate.slice(0, 8)}/${region}/ses/aws4_request, SignedHeaders=host;x-amz-date, Signature=0`,
    },
    body: new URLSearchParams({ Action: 'GetTemplate', Version: '2010-12-01', TemplateName: name }),
  }).catch((err: unknown) => {
    if (err instanceof LocalStackError && err.status === 400) {
      throw new LocalStackError(`Template "${name}" não encontrado no LocalStack (${region}).`, 400)
    }
    throw err
  })

  const xml = new DOMParser().parseFromString(await res.text(), 'application/xml')
  const pick = (tag: string) => xml.getElementsByTagName(tag)[0]?.textContent ?? undefined
  return {
    name: pick('TemplateName') ?? name,
    subject: pick('SubjectPart') ?? '',
    html: pick('HtmlPart'),
    text: pick('TextPart'),
  }
}
