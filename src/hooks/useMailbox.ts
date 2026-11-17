import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteAllMessages, deleteMessage, fetchMessages } from '../api/localstack'
import type { LocalStackSesMessage } from '../api/types'
import type { MailMessage } from '../lib/model'
import { parseMessage } from '../lib/parse'
import { load, save } from '../lib/storage'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

const HIDDEN_POLL_INTERVAL = 30_000

interface Options {
  /** Intervalo do polling em ms; 0 desliga a atualização automática. */
  pollInterval: number
  onNewMessages?: (messages: MailMessage[]) => void
}

/**
 * Mantém a caixa de entrada sincronizada com o LocalStack. Cada mensagem é
 * convertida uma única vez (cache por Id) e o polling pausa com a aba oculta.
 */
export function useMailbox({ pollInterval, onNewMessages }: Options) {
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date>()
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(load<string[]>('read', [])))

  const cache = useRef(new Map<string, Promise<MailMessage>>())
  const knownIds = useRef<Set<string> | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const onNewRef = useRef(onNewMessages)
  onNewRef.current = onNewMessages

  const sync = useCallback(async () => {
    const items: LocalStackSesMessage[] = await fetchMessages()
    const ids = new Set(items.map((m) => m.Id))

    for (const id of cache.current.keys()) if (!ids.has(id)) cache.current.delete(id)
    for (const item of items) {
      if (!cache.current.has(item.Id)) cache.current.set(item.Id, parseMessage(item))
    }

    const parsed = await Promise.all(items.map((m) => cache.current.get(m.Id)!))
    parsed.sort((a, b) => b.date.getTime() - a.date.getTime())

    const previous = knownIds.current
    knownIds.current = ids
    if (previous) {
      const fresh = parsed.filter((m) => !previous.has(m.id))
      if (fresh.length) onNewRef.current?.(fresh)
    }

    setMessages(parsed)
    setReadIds((current) => {
      const pruned = new Set([...current].filter((id) => ids.has(id)))
      return pruned.size === current.size ? current : pruned
    })
    setStatus('online')
    setError(undefined)
    setLastSync(new Date())
  }, [])

  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current
    setLoading(true)
    inFlight.current = sync()
      .catch((err: unknown) => {
        setStatus('offline')
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        inFlight.current = null
        setLoading(false)
      })
    return inFlight.current
  }, [sync])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!pollInterval) return
    // Com a aba em segundo plano o polling desacelera, mas o título continua
    // mostrando as não lidas; ao voltar para a aba sincroniza na hora.
    let last = 0
    const tick = () => {
      const visible = document.visibilityState === 'visible'
      const due = Date.now() - last >= (visible ? pollInterval : Math.max(pollInterval, HIDDEN_POLL_INTERVAL))
      if (due) {
        last = Date.now()
        void refresh()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        last = Date.now()
        void refresh()
      }
    }
    const timer = window.setInterval(tick, pollInterval)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [pollInterval, refresh])

  useEffect(() => save('read', [...readIds]), [readIds])

  const setRead = useCallback((ids: string[], read: boolean) => {
    setReadIds((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (read) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  const remove = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map(deleteMessage))
      setMessages((current) => current.filter((m) => !ids.includes(m.id)))
      for (const id of ids) {
        cache.current.delete(id)
        knownIds.current?.delete(id)
      }
      await refresh()
    },
    [refresh],
  )

  const removeAll = useCallback(async () => {
    await deleteAllMessages()
    cache.current.clear()
    knownIds.current = new Set()
    setMessages([])
    await refresh()
  }, [refresh])

  return { messages, status, error, loading, lastSync, readIds, refresh, setRead, remove, removeAll }
}
