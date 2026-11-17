import type { MailAddress } from './model'

const LOCALE = 'pt-BR'

const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const weekdayTimeFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
const dayMonthFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: '2-digit', month: '2-digit' })
const fullDateFmt = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' })
const longFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const DAY = 24 * 60 * 60 * 1000

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** O LocalStack grava o horário em UTC sem sufixo de fuso. */
export function parseLocalStackTimestamp(ts: string | undefined): Date {
  if (!ts) return new Date(0)
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(ts)
  const d = new Date(hasZone ? ts : `${ts}Z`)
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

/** Data curta da lista de mensagens, no estilo do Outlook. */
export function formatListDate(date: Date, now = new Date()): string {
  const diffDays = (startOfDay(now) - startOfDay(date)) / DAY
  if (diffDays <= 0) return timeFmt.format(date)
  if (diffDays < 7) return weekdayTimeFmt.format(date)
  if (date.getFullYear() === now.getFullYear()) return dayMonthFmt.format(date)
  return fullDateFmt.format(date)
}

export function formatLongDate(date: Date): string {
  return longFmt.format(date)
}

export function groupLabel(date: Date, now = new Date()): string {
  const diffDays = (startOfDay(now) - startOfDay(date)) / DAY
  if (diffDays <= 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  const weekday = now.getDay() // 0 = domingo
  if (diffDays <= weekday) return 'Esta semana'
  if (diffDays <= weekday + 7) return 'Semana passada'
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) return 'Este mês'
  return 'Mais antigos'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString(LOCALE, { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`
}

export function displayName(addr: MailAddress): string {
  return addr.name || addr.address
}

export function formatAddress(addr: MailAddress): string {
  return addr.name ? `${addr.name} <${addr.address}>` : addr.address
}

export function formatAddressList(list: MailAddress[]): string {
  return list.map(formatAddress).join('; ')
}
