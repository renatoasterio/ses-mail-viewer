import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  FluentProvider,
  Link,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Toast,
  ToastBody,
  Toaster,
  ToastTitle,
  ToastTrigger,
  tokens,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Tooltip,
  useId,
  useToastController,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components'
import {
  ArrowClockwise20Regular,
  ArrowDownload20Regular,
  Delete20Regular,
  DeleteDismiss20Regular,
  MailCheckmark20Regular,
  MailRead20Regular,
  MailUnread20Regular,
  Navigation20Regular,
} from '@fluentui/react-icons'
import { fetchRuntimeConfig } from './api/localstack'
import { EmptyState } from './components/EmptyState'
import { MessageList } from './components/MessageList'
import { NavPane, type MailboxEntry } from './components/NavPane'
import { ReadingPane } from './components/ReadingPane'
import { TopBar } from './components/TopBar'
import { useMailbox } from './hooks/useMailbox'
import { useMediaQuery } from './hooks/useMediaQuery'
import { downloadBlob, emlFilename, toEml } from './lib/download'
import { displayName } from './lib/format'
import type { MailMessage } from './lib/model'
import { load, save } from './lib/storage'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
  },
  ribbon: {
    margin: '8px 8px 0',
    padding: '2px 4px',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    overflowX: 'auto',
  },
  toolbar: {
    flexWrap: 'nowrap',
  },
  ribbonButton: {
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  banner: {
    margin: '8px 8px 0',
  },
  main: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    gap: '8px',
    padding: '8px',
  },
  pane: {
    minHeight: 0,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    overflow: 'hidden',
  },
  list: {
    width: '380px',
    flexShrink: 0,
    '@media (max-width: 1100px)': { width: '320px' },
  },
  reading: {
    flex: 1,
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  fullWidth: {
    width: 'auto',
    flex: 1,
  },
})

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  return load<Theme | null>('theme', null) ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

/** Botão da faixa de comandos: só ícone (com tooltip) em telas menores. */
function RibbonButton({
  icon,
  label,
  compact,
  disabled,
  onClick,
}: {
  icon: ReactElement
  label: string
  compact: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const styles = useStyles()
  if (!compact) {
    return (
      <ToolbarButton icon={icon} disabled={disabled} onClick={onClick} className={styles.ribbonButton}>
        {label}
      </ToolbarButton>
    )
  }
  return (
    <Tooltip content={label} relationship="label">
      <ToolbarButton icon={icon} disabled={disabled} onClick={onClick} />
    </Tooltip>
  )
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

function folderTitle(folder: string): string {
  if (folder === 'unread') return 'Não lidas'
  if (folder === 'attachments') return 'Com anexos'
  if (folder.startsWith('to:')) return `Para ${folder.slice(3)}`
  if (folder.startsWith('from:')) return `De ${folder.slice(5)}`
  return 'Caixa de Entrada'
}

function recipientsOf(m: MailMessage): string[] {
  return [...m.to, ...m.cc, ...m.bcc].map((a) => a.address.toLowerCase()).filter(Boolean)
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  useEffect(() => save('theme', theme), [theme])

  return (
    <FluentProvider theme={theme === 'dark' ? webDarkTheme : webLightTheme}>
      <Mailbox dark={theme === 'dark'} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
    </FluentProvider>
  )
}

function Mailbox({ dark, onToggleTheme }: { dark: boolean; onToggleTheme: () => void }) {
  const styles = useStyles()
  const toasterId = useId('toaster')
  const { dispatchToast } = useToastController(toasterId)

  const compact = useMediaQuery('(max-width: 1100px)')
  const narrow = useMediaQuery('(max-width: 760px)')

  const [pollInterval, setPollInterval] = useState(() => load('pollInterval', 5000))
  const [navOpen, setNavOpen] = useState(() => !compact && load('navOpen', true))
  const [folder, setFolder] = useState('inbox')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [endpoint, setEndpoint] = useState<string>()
  const searchRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<(id: string) => void>(() => {})

  useEffect(() => save('pollInterval', pollInterval), [pollInterval])
  // Em telas menores o painel de pastas vira gaveta sobreposta e começa fechado.
  useEffect(() => setNavOpen(!compact && load('navOpen', true)), [compact])
  useEffect(() => {
    void fetchRuntimeConfig().then((c) => setEndpoint(c?.localstackEndpoint))
  }, [])

  const notify = useCallback(
    (text: string, intent: 'success' | 'error' | 'info' = 'info') =>
      dispatchToast(
        <Toast>
          <ToastTitle>{text}</ToastTitle>
        </Toast>,
        { intent, timeout: 3000 },
      ),
    [dispatchToast],
  )

  const onNewMessages = useCallback(
    (fresh: MailMessage[]) => {
      const first = fresh[0]
      dispatchToast(
        <Toast>
          <ToastTitle
            action={
              <ToastTrigger>
                <Link onClick={() => selectRef.current(first.id)}>Abrir</Link>
              </ToastTrigger>
            }
          >
            {fresh.length === 1 ? 'Novo e-mail' : `${fresh.length} novos e-mails`}
          </ToastTitle>
          <ToastBody subtitle={first.subject || '(sem assunto)'}>{displayName(first.from)}</ToastBody>
        </Toast>,
        { intent: 'info', timeout: 5000 },
      )
    },
    [dispatchToast],
  )

  const mailbox = useMailbox({ pollInterval, onNewMessages })
  const { messages, readIds, setRead } = mailbox

  // ----- dados derivados -------------------------------------------------

  const counts = useMemo(
    () => ({
      total: messages.length,
      unread: messages.filter((m) => !readIds.has(m.id)).length,
      attachments: messages.filter((m) => m.attachments.length > 0).length,
    }),
    [messages, readIds],
  )

  const { recipients, senders } = useMemo(() => {
    const tally = (keyOf: (m: MailMessage) => string[]) => {
      const map = new Map<string, MailboxEntry>()
      for (const m of messages) {
        for (const address of new Set(keyOf(m))) {
          const entry = map.get(address) ?? { address, total: 0, unread: 0 }
          entry.total++
          if (!readIds.has(m.id)) entry.unread++
          map.set(address, entry)
        }
      }
      return [...map.values()].sort((a, b) => a.address.localeCompare(b.address))
    }
    return {
      recipients: tally(recipientsOf),
      senders: tally((m) => (m.from.address ? [m.from.address.toLowerCase()] : [])),
    }
  }, [messages, readIds])

  const visible = useMemo(() => {
    const terms = search.toLocaleLowerCase('pt-BR').split(/\s+/).filter(Boolean)
    return messages.filter((m) => {
      // Em "Não lidas" a mensagem aberta continua na lista mesmo depois de lida.
      if (folder === 'unread' && readIds.has(m.id) && m.id !== selectedId) return false
      if (folder === 'attachments' && m.attachments.length === 0) return false
      if (folder.startsWith('to:') && !recipientsOf(m).includes(folder.slice(3))) return false
      if (folder.startsWith('from:') && m.from.address.toLowerCase() !== folder.slice(5)) return false
      return terms.every((t) => m.searchText.includes(t))
    })
  }, [messages, readIds, folder, search, selectedId])

  const selected = messages.find((m) => m.id === selectedId)

  // Se a mensagem aberta sumir (excluída em outro lugar), fecha o painel.
  useEffect(() => {
    if (selectedId && !mailbox.loading && !messages.some((m) => m.id === selectedId)) setSelectedId(undefined)
  }, [messages, selectedId, mailbox.loading])

  useEffect(() => {
    document.title = counts.unread ? `(${counts.unread}) Caixa de Entrada · SES Mail` : 'Caixa de Entrada · SES Mail'
  }, [counts.unread])

  // ----- ações -----------------------------------------------------------

  const select = useCallback(
    (id: string | undefined) => {
      setSelectedId(id)
      if (id) setRead([id], true)
    },
    [setRead],
  )
  selectRef.current = select

  const toggleRead = useCallback((m: MailMessage) => setRead([m.id], !readIds.has(m.id)), [readIds, setRead])

  const remove = useCallback(
    async (m: MailMessage) => {
      // Como no Outlook, ao excluir a mensagem aberta seleciona a próxima.
      if (m.id === selectedId) {
        const index = visible.findIndex((v) => v.id === m.id)
        const next = visible[index + 1] ?? visible[index - 1]
        select(narrow ? undefined : next?.id)
      }
      try {
        await mailbox.remove([m.id])
        notify('Mensagem excluída', 'success')
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Falha ao excluir', 'error')
      }
    },
    [mailbox, notify, select, selectedId, visible, narrow],
  )

  const removeAll = async () => {
    setConfirmEmpty(false)
    try {
      await mailbox.removeAll()
      setSelectedId(undefined)
      notify('Caixa esvaziada', 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Falha ao esvaziar', 'error')
    }
  }

  // Só a preferência do layout largo é lembrada; no compacto a gaveta sempre começa fechada.
  const toggleNav = () => {
    const next = !navOpen
    setNavOpen(next)
    if (!compact) save('navOpen', next)
  }

  const selectFolder = (value: string) => {
    setFolder(value)
    if (compact) setNavOpen(false)
  }

  // ----- atalhos de teclado ----------------------------------------------

  const keyState = useRef({ visible, selected, select, remove, toggleRead, refresh: mailbox.refresh })
  keyState.current = { visible, selected, select, remove, toggleRead, refresh: mailbox.refresh }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const s = keyState.current
      const index = s.selected ? s.visible.findIndex((m) => m.id === s.selected!.id) : -1
      const move = (delta: number) => {
        const target = s.visible[Math.min(Math.max(index + delta, 0), s.visible.length - 1)]
        if (target) s.select(target.id)
      }
      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          move(1)
          break
        case 'ArrowUp':
        case 'k':
          move(index === -1 ? 1 : -1)
          break
        case 'Delete':
        case 'Backspace':
          if (s.selected) void s.remove(s.selected)
          break
        case 'u':
          if (s.selected) s.toggleRead(s.selected)
          break
        case 'r':
          void s.refresh()
          break
        case '/':
          searchRef.current?.focus()
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ----- layout ----------------------------------------------------------

  const showList = !narrow || !selected
  const showReading = !narrow || !!selected
  const searching = search.trim() !== '' || folder !== 'inbox'
  const unreadInView = visible.filter((m) => !readIds.has(m.id)).map((m) => m.id)
  const footer =
    messages.length > 0
      ? `${visible.length} de ${messages.length} ${messages.length === 1 ? 'mensagem' : 'mensagens'}`
      : undefined

  return (
    <div className={styles.root}>
      <TopBar
        search={search}
        onSearchChange={setSearch}
        searchRef={searchRef}
        dark={dark}
        onToggleTheme={onToggleTheme}
        pollInterval={pollInterval}
        onPollIntervalChange={setPollInterval}
        endpoint={endpoint}
      />

      <div className={styles.ribbon}>
        <Toolbar size="small" className={styles.toolbar} aria-label="Ações">
          <Tooltip content="Mostrar/ocultar painel de pastas" relationship="label">
            <ToolbarButton icon={<Navigation20Regular />} onClick={toggleNav} />
          </Tooltip>
          <ToolbarDivider />
          <RibbonButton icon={<ArrowClockwise20Regular />} label="Atualizar" compact={compact} onClick={() => void mailbox.refresh()} />
          <ToolbarDivider />
          <RibbonButton
            icon={<Delete20Regular />}
            label="Excluir"
            compact={compact}
            disabled={!selected}
            onClick={() => selected && void remove(selected)}
          />
          <RibbonButton
            icon={selected && !readIds.has(selected.id) ? <MailRead20Regular /> : <MailUnread20Regular />}
            label={selected && !readIds.has(selected.id) ? 'Marcar como lida' : 'Marcar como não lida'}
            compact={compact}
            disabled={!selected}
            onClick={() => selected && toggleRead(selected)}
          />
          <RibbonButton
            icon={<ArrowDownload20Regular />}
            label="Baixar .eml"
            compact={compact}
            disabled={!selected}
            onClick={() =>
              selected &&
              downloadBlob(new Blob([toEml(selected)], { type: 'message/rfc822' }), emlFilename(selected))
            }
          />
          <ToolbarDivider />
          <RibbonButton
            icon={<MailCheckmark20Regular />}
            label="Marcar todas como lidas"
            compact={compact}
            disabled={unreadInView.length === 0}
            onClick={() => setRead(unreadInView, true)}
          />
          <RibbonButton
            icon={<DeleteDismiss20Regular />}
            label="Esvaziar caixa"
            compact={compact}
            disabled={messages.length === 0}
            onClick={() => setConfirmEmpty(true)}
          />
        </Toolbar>
      </div>

      {mailbox.status === 'offline' && (
        <MessageBar intent="error" className={styles.banner}>
          <MessageBarBody>
            <MessageBarTitle>Sem conexão com o LocalStack</MessageBarTitle>
            {mailbox.error} {endpoint && `(${endpoint})`}
          </MessageBarBody>
          <MessageBarActions>
            <Button size="small" onClick={() => void mailbox.refresh()}>
              Tentar novamente
            </Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className={styles.main}>
        <NavPane
          open={navOpen}
          overlay={compact}
          onOpenChange={setNavOpen}
          folder={folder}
          onSelect={selectFolder}
          counts={counts}
          recipients={recipients}
          senders={senders}
          status={mailbox.status}
          endpoint={endpoint}
          lastSync={mailbox.lastSync}
        />

        {showList && (
          <section className={mergeClasses(styles.pane, styles.list, narrow && styles.fullWidth)}>
            <MessageList
              title={folderTitle(folder)}
              messages={visible}
              readIds={readIds}
              selectedId={selectedId}
              loading={mailbox.loading}
              initialLoad={mailbox.status === 'connecting'}
              searching={searching && messages.length > 0}
              footer={footer}
              onSelect={select}
              onToggleRead={toggleRead}
              onDelete={remove}
            />
          </section>
        )}

        {showReading && (
          <section className={mergeClasses(styles.pane, styles.reading)}>
            {selected ? (
              <ReadingPane
                message={selected}
                unread={!readIds.has(selected.id)}
                showBack={narrow}
                onBack={() => setSelectedId(undefined)}
                onDelete={remove}
                onToggleRead={toggleRead}
                notify={notify}
              />
            ) : (
              <EmptyState variant="reading" title="Selecione um item para ler" description="Nada está selecionado" />
            )}
          </section>
        )}
      </div>

      <Dialog open={confirmEmpty} onOpenChange={(_, data) => setConfirmEmpty(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Esvaziar caixa?</DialogTitle>
            <DialogContent>
              Todas as {messages.length} mensagens serão removidas do LocalStack. Essa ação não pode ser desfeita.
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmEmpty(false)}>
                Cancelar
              </Button>
              <Button appearance="primary" onClick={() => void removeAll()}>
                Excluir tudo
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Toaster toasterId={toasterId} position="bottom-end" />
    </div>
  )
}
