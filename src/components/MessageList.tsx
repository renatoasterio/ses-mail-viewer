import { Fragment, memo, useEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Button,
  Caption1,
  makeStyles,
  mergeClasses,
  Spinner,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import {
  Attach16Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Delete16Regular,
  MailRead16Regular,
  MailUnread16Regular,
} from '@fluentui/react-icons'
import { displayName, formatListDate, groupLabel } from '../lib/format'
import type { MailMessage } from '../lib/model'
import { EmptyState } from './EmptyState'

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px 8px 20px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  scroller: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    width: '100%',
    padding: '10px 16px 4px 12px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground2,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: 'left',
    ':hover': { color: tokens.colorNeutralForeground1 },
  },
  item: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '32px 1fr',
    columnGap: '12px',
    padding: '10px 12px 10px 16px',
    cursor: 'pointer',
    outline: 'none',
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover },
    ':hover .quick-actions': { display: 'flex' },
    ':hover .item-date': { visibility: 'hidden' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  selected: {
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    backgroundColor: tokens.colorBrandBackground,
  },
  body: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  line: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
  ellipsis: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sender: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  subject: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  unreadSubject: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  preview: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  date: {
    flexShrink: 0,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  unreadDate: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  icon: {
    flexShrink: 0,
    color: tokens.colorNeutralForeground3,
  },
  quickActions: {
    position: 'absolute',
    right: '8px',
    top: '6px',
    display: 'none',
    gap: '2px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
  footer: {
    padding: '6px 16px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground3,
  },
})

interface Props {
  title: string
  messages: MailMessage[]
  readIds: Set<string>
  selectedId?: string
  loading: boolean
  initialLoad: boolean
  searching: boolean
  footer?: string
  onSelect: (id: string) => void
  onToggleRead: (message: MailMessage) => void
  onDelete: (message: MailMessage) => void
}

export function MessageList(props: Props) {
  const { title, messages, readIds, selectedId, loading, initialLoad, searching, footer } = props
  const styles = useStyles()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const scrollerRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => {
    const now = new Date()
    const result: { label: string; items: MailMessage[] }[] = []
    for (const message of messages) {
      const label = groupLabel(message.date, now)
      const last = result[result.length - 1]
      if (last?.label === label) last.items.push(message)
      else result.push({ label, items: [message] })
    }
    return result
  }, [messages])

  // Mantém o item selecionado visível ao navegar pelo teclado.
  useEffect(() => {
    if (!selectedId) return
    scrollerRef.current
      ?.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  const toggleGroup = (label: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold" size={400} className={styles.title}>
          {title}
        </Text>
        {loading && <Spinner size="extra-tiny" aria-label="Atualizando" />}
      </div>

      <div className={styles.scroller} ref={scrollerRef} role="listbox" aria-label="Mensagens">
        {initialLoad ? (
          <EmptyState icon={<Spinner />} title="Carregando mensagens…" />
        ) : messages.length === 0 ? (
          searching ? (
            <EmptyState title="Nenhum resultado" description="Nenhuma mensagem corresponde à busca ou ao filtro atual." />
          ) : (
            <EmptyState
              variant="inbox"
              title="Tudo em dia"
              description="Nenhum e-mail foi enviado ao SES do LocalStack ainda. Assim que sua aplicação enviar, ele aparece aqui."
            />
          )
        ) : (
          groups.map((group) => {
            const isCollapsed = collapsed.has(group.label)
            return (
              <Fragment key={group.label}>
                <button
                  type="button"
                  className={styles.group}
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? <ChevronRight16Regular /> : <ChevronDown16Regular />}
                  {group.label}
                </button>
                {!isCollapsed &&
                  group.items.map((message) => (
                    <MessageListItem
                      key={message.id}
                      message={message}
                      unread={!readIds.has(message.id)}
                      selected={message.id === selectedId}
                      onSelect={props.onSelect}
                      onToggleRead={props.onToggleRead}
                      onDelete={props.onDelete}
                    />
                  ))}
              </Fragment>
            )
          })
        )}
      </div>

      {footer && (
        <Caption1 className={styles.footer} block>
          {footer}
        </Caption1>
      )}
    </div>
  )
}

interface ItemProps {
  message: MailMessage
  unread: boolean
  selected: boolean
  onSelect: (id: string) => void
  onToggleRead: (message: MailMessage) => void
  onDelete: (message: MailMessage) => void
}

const MessageListItem = memo(function MessageListItem({
  message,
  unread,
  selected,
  onSelect,
  onToggleRead,
  onDelete,
}: ItemProps) {
  const styles = useStyles()
  const sender = displayName(message.from)

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-id={message.id}
      className={mergeClasses(styles.item, selected && styles.selected)}
      onClick={() => onSelect(message.id)}
    >
      {unread && <span className={styles.unreadBar} />}
      <Avatar name={sender} color="colorful" idForColor={sender} size={32} />
      <div className={styles.body}>
        <div className={styles.line}>
          <Text className={mergeClasses(styles.sender, styles.ellipsis)} weight={unread ? 'semibold' : 'regular'}>
            {sender}
          </Text>
        </div>
        <div className={styles.line}>
          <span className={mergeClasses(styles.subject, styles.ellipsis, unread && styles.unreadSubject)}>
            {message.subject || '(sem assunto)'}
          </span>
          {message.attachments.length > 0 && <Attach16Regular className={styles.icon} aria-label="Possui anexos" />}
          <span className={mergeClasses('item-date', styles.date, unread && styles.unreadDate)}>
            {formatListDate(message.date)}
          </span>
        </div>
        <span className={mergeClasses(styles.preview, styles.ellipsis)}>{message.preview || 'Sem conteúdo de texto'}</span>
      </div>

      <div className={mergeClasses('quick-actions', styles.quickActions)}>
        <Tooltip content={unread ? 'Marcar como lida' : 'Marcar como não lida'} relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={unread ? <MailRead16Regular /> : <MailUnread16Regular />}
            onClick={(e) => {
              e.stopPropagation()
              onToggleRead(message)
            }}
          />
        </Tooltip>
        <Tooltip content="Excluir" relationship="label">
          <Button
            appearance="subtle"
            size="small"
            icon={<Delete16Regular />}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(message)
            }}
          />
        </Tooltip>
      </div>
    </div>
  )
})
